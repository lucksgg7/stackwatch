import { z } from "zod";

const httpUrlRegex = /^https?:\/\//i;
const tcpTargetRegex = /^(?:[a-zA-Z0-9.-]+):(\d{1,5})$/;

export const monitorCreateSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(["http", "tcp"]),
  target: z.string().min(3).max(500),
  expectedStatus: z.number().int().min(100).max(599).optional(),
  timeoutMs: z.number().int().min(500).max(30000).default(5000),
  intervalSec: z.number().int().min(30).max(3600).default(60),
  enabled: z.boolean().default(true)
}).superRefine((value, ctx) => {
  if (value.type === "http" && !httpUrlRegex.test(value.target)) {
    ctx.addIssue({ code: "custom", message: "HTTP monitor target must be a valid http(s) URL", path: ["target"] });
  }
  if (value.type === "tcp") {
    const m = value.target.match(tcpTargetRegex);
    if (!m) {
      ctx.addIssue({ code: "custom", message: "TCP monitor target must be host:port", path: ["target"] });
      return;
    }
    const port = Number(m[1]);
    if (port < 1 || port > 65535) {
      ctx.addIssue({ code: "custom", message: "TCP port must be between 1 and 65535", path: ["target"] });
    }
  }
});

export const settingsSchema = z.object({
  webhookUrl: z.string().url().optional().or(z.literal("")),
  alertEmail: z.string().email().optional().or(z.literal(""))
});

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

