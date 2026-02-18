import fs from "fs/promises";
import os from "os";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

type CpuTimes = { idle: number; total: number };

async function readCpuTimes(): Promise<CpuTimes> {
  const stat = await fs.readFile("/proc/stat", "utf8");
  const line = stat.split("\n").find((l) => l.startsWith("cpu "));
  if (!line) return { idle: 0, total: 0 };
  const values = line
    .trim()
    .split(/\s+/)
    .slice(1)
    .map((v) => Number(v));
  const idle = (values[3] || 0) + (values[4] || 0);
  const total = values.reduce((sum, n) => sum + n, 0);
  return { idle, total };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getCpuPercent() {
  try {
    const a = await readCpuTimes();
    await sleep(150);
    const b = await readCpuTimes();
    const idle = b.idle - a.idle;
    const total = b.total - a.total;
    if (total <= 0) return 0;
    return Number(((1 - idle / total) * 100).toFixed(2));
  } catch {
    return 0;
  }
}

async function getDiskUsedPercent() {
  try {
    const { stdout } = await execFileAsync("df", ["-Pk", "/"]);
    const lines = stdout.trim().split("\n");
    const data = lines[lines.length - 1].split(/\s+/);
    const usedPctRaw = data[4] || "0%";
    return Number(String(usedPctRaw).replace("%", "")) || 0;
  } catch {
    return 0;
  }
}

async function getNetworkBytes() {
  try {
    const raw = await fs.readFile("/proc/net/dev", "utf8");
    const lines = raw.split("\n").slice(2);
    let rx = 0;
    let tx = 0;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const [ifaceRaw, payload] = trimmed.split(":");
      const iface = ifaceRaw.trim();
      if (iface === "lo") continue;
      const cols = payload.trim().split(/\s+/).map((v) => Number(v) || 0);
      rx += cols[0] || 0;
      tx += cols[8] || 0;
    }
    return { rx, tx };
  } catch {
    return { rx: 0, tx: 0 };
  }
}

export async function getVpsSnapshot() {
  const [cpuPercent, diskUsedPercent, net] = await Promise.all([getCpuPercent(), getDiskUsedPercent(), getNetworkBytes()]);
  const totalMemMb = Math.round(os.totalmem() / 1024 / 1024);
  const freeMemMb = Math.round(os.freemem() / 1024 / 1024);
  const usedMemMb = Math.max(0, totalMemMb - freeMemMb);
  const load = os.loadavg();

  return {
    cpuPercent,
    memUsedMb: usedMemMb,
    memAvailMb: freeMemMb,
    diskUsedPercent,
    load1: Number(load[0].toFixed(2)),
    load5: Number(load[1].toFixed(2)),
    load15: Number(load[2].toFixed(2)),
    netRxBytes: net.rx,
    netTxBytes: net.tx,
    uptimeSec: Math.floor(os.uptime())
  };
}

