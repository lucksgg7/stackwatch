export type MonitorTemplateCategory = "infra" | "database" | "gaming" | "devops" | "platform";
export type MonitorTemplateType = "http" | "tcp";
export type MonitorTemplateIcon =
  | "server"
  | "globe"
  | "database"
  | "shield"
  | "bar-chart"
  | "git-branch"
  | "wrench"
  | "gamepad"
  | "rocket"
  | "cloud";

export type MonitorTemplate = {
  id: string;
  name: string;
  description: string;
  category: MonitorTemplateCategory;
  icon: MonitorTemplateIcon;
  type: MonitorTemplateType;
  targetPattern: string;
  targetHint: string;
  expectedStatus?: number;
  timeoutMs: number;
  intervalSec: number;
};

export const MONITOR_TEMPLATES: MonitorTemplate[] = [
  {
    id: "ssh",
    name: "SSH",
    description: "Checks if SSH is reachable on port 22.",
    category: "infra",
    icon: "shield",
    type: "tcp",
    targetPattern: "{{host}}:22",
    targetHint: "vps.example.com",
    timeoutMs: 3500,
    intervalSec: 60
  },
  {
    id: "website-https",
    name: "Website HTTPS",
    description: "Basic HTTPS homepage availability.",
    category: "infra",
    icon: "globe",
    type: "http",
    targetPattern: "https://{{host}}/",
    targetHint: "status.example.com",
    expectedStatus: 200,
    timeoutMs: 5000,
    intervalSec: 60
  },
  {
    id: "api-health",
    name: "API Health",
    description: "Health endpoint check for APIs.",
    category: "infra",
    icon: "server",
    type: "http",
    targetPattern: "https://{{host}}/health",
    targetHint: "api.example.com",
    expectedStatus: 200,
    timeoutMs: 5000,
    intervalSec: 45
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    description: "TCP connect to PostgreSQL default port.",
    category: "database",
    icon: "database",
    type: "tcp",
    targetPattern: "{{host}}:5432",
    targetHint: "db.example.internal",
    timeoutMs: 3000,
    intervalSec: 60
  },
  {
    id: "mysql",
    name: "MySQL",
    description: "TCP connect to MySQL/MariaDB.",
    category: "database",
    icon: "database",
    type: "tcp",
    targetPattern: "{{host}}:3306",
    targetHint: "mysql.example.internal",
    timeoutMs: 3000,
    intervalSec: 60
  },
  {
    id: "redis",
    name: "Redis",
    description: "TCP connect to Redis default port.",
    category: "database",
    icon: "database",
    type: "tcp",
    targetPattern: "{{host}}:6379",
    targetHint: "redis.example.internal",
    timeoutMs: 2500,
    intervalSec: 60
  },
  {
    id: "grafana",
    name: "Grafana",
    description: "Grafana health endpoint.",
    category: "devops",
    icon: "bar-chart",
    type: "http",
    targetPattern: "https://{{host}}/api/health",
    targetHint: "grafana.example.com",
    expectedStatus: 200,
    timeoutMs: 5000,
    intervalSec: 60
  },
  {
    id: "prometheus",
    name: "Prometheus",
    description: "Prometheus healthy endpoint.",
    category: "devops",
    icon: "bar-chart",
    type: "http",
    targetPattern: "https://{{host}}/-/healthy",
    targetHint: "prometheus.example.com",
    expectedStatus: 200,
    timeoutMs: 4500,
    intervalSec: 60
  },
  {
    id: "gitea",
    name: "Gitea",
    description: "Gitea health check endpoint.",
    category: "platform",
    icon: "git-branch",
    type: "http",
    targetPattern: "https://{{host}}/api/healthz",
    targetHint: "git.example.com",
    expectedStatus: 200,
    timeoutMs: 5000,
    intervalSec: 60
  },
  {
    id: "gitlab",
    name: "GitLab",
    description: "GitLab basic health endpoint.",
    category: "platform",
    icon: "git-branch",
    type: "http",
    targetPattern: "https://{{host}}/-/health",
    targetHint: "gitlab.example.com",
    expectedStatus: 200,
    timeoutMs: 5000,
    intervalSec: 60
  },
  {
    id: "jenkins",
    name: "Jenkins",
    description: "Jenkins login page check.",
    category: "platform",
    icon: "wrench",
    type: "http",
    targetPattern: "https://{{host}}/login",
    targetHint: "ci.example.com",
    expectedStatus: 200,
    timeoutMs: 5000,
    intervalSec: 60
  },
  {
    id: "minecraft",
    name: "Minecraft Java",
    description: "Java server port availability.",
    category: "gaming",
    icon: "gamepad",
    type: "tcp",
    targetPattern: "{{host}}:25565",
    targetHint: "mc.example.com",
    timeoutMs: 4000,
    intervalSec: 45
  },
  {
    id: "rust",
    name: "Rust Server",
    description: "Rust game server TCP reachability.",
    category: "gaming",
    icon: "gamepad",
    type: "tcp",
    targetPattern: "{{host}}:28015",
    targetHint: "rust.example.com",
    timeoutMs: 4000,
    intervalSec: 45
  },
  {
    id: "fivem",
    name: "FiveM",
    description: "FiveM endpoint via default port.",
    category: "gaming",
    icon: "gamepad",
    type: "tcp",
    targetPattern: "{{host}}:30120",
    targetHint: "fivem.example.com",
    timeoutMs: 4000,
    intervalSec: 45
  },
  {
    id: "valheim",
    name: "Valheim",
    description: "Valheim default game port reachability.",
    category: "gaming",
    icon: "gamepad",
    type: "tcp",
    targetPattern: "{{host}}:2456",
    targetHint: "valheim.example.com",
    timeoutMs: 4000,
    intervalSec: 45
  },
  {
    id: "node-exporter",
    name: "Node Exporter",
    description: "Node exporter metrics endpoint.",
    category: "devops",
    icon: "rocket",
    type: "http",
    targetPattern: "http://{{host}}:9100/metrics",
    targetHint: "vps.example.internal",
    expectedStatus: 200,
    timeoutMs: 5000,
    intervalSec: 60
  },
  {
    id: "open-webui",
    name: "Open WebUI",
    description: "Open WebUI basic availability.",
    category: "platform",
    icon: "cloud",
    type: "http",
    targetPattern: "https://{{host}}/",
    targetHint: "ai.example.com",
    expectedStatus: 200,
    timeoutMs: 5000,
    intervalSec: 60
  }
];

export function resolveTemplateTarget(pattern: string, host: string) {
  return pattern.replace("{{host}}", host.trim());
}

