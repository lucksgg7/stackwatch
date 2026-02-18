export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  appUrl: process.env.APP_URL || "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL || "",
  adminPassword: process.env.ADMIN_PASSWORD || "admin123",
  authSecret: process.env.AUTH_SECRET || "change-this-secret",
  workerToken: process.env.WORKER_TOKEN || "worker-secret",
  checkFailThreshold: Number(process.env.CHECK_FAIL_THRESHOLD || 2),
  checkRecoveryThreshold: Number(process.env.CHECK_RECOVERY_THRESHOLD || 2),
  publicRateLimitPerMin: Number(process.env.PUBLIC_RATE_LIMIT_PER_MIN || 120),
  adminRateLimitPerMin: Number(process.env.ADMIN_RATE_LIMIT_PER_MIN || 60),
  publicExposeTargets: process.env.PUBLIC_EXPOSE_TARGETS === "true"
};

