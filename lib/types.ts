export type MonitorType = "http" | "tcp" | "udp";

export interface Monitor {
  id: number;
  slug: string;
  name: string;
  type: MonitorType;
  target: string;
  featured: boolean;
  sort_order: number;
  expected_status: number | null;
  timeout_ms: number;
  interval_sec: number;
  enabled: boolean;
  created_at: string;
}

export interface CheckResult {
  id: number;
  monitor_id: number;
  ok: boolean;
  status_code: number | null;
  latency_ms: number | null;
  error: string | null;
  checked_at: string;
}

export interface Incident {
  id: number;
  monitor_id: number;
  started_at: string;
  ended_at: string | null;
  summary: string;
}

