const appUrl = process.env.INTERNAL_APP_URL || "http://app:3000";
const token = process.env.WORKER_TOKEN || "worker-secret";
const intervalMs = Number(process.env.WORKER_INTERVAL_MS || 30000);

async function tick() {
  try {
    const res = await fetch(`${appUrl}/api/internal/run-checks`, {
      method: "POST",
      headers: {
        "x-worker-token": token,
        "content-type": "application/json"
      }
    });
    const txt = await res.text();
    console.log(new Date().toISOString(), "run-checks", res.status, txt.slice(0, 300));
  } catch (error) {
    console.error(new Date().toISOString(), "worker error", error?.message || error);
  }
}

await tick();
setInterval(() => {
  void tick();
}, intervalMs);

