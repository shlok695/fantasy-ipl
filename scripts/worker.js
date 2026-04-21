const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.resolve(__dirname, "../.env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^"(.*)"$/, "$1");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

loadEnv();

const SECRET = process.env.CRON_SECRET;
const BASE_URL = process.env.INTERNAL_APP_URL || "http://app:3000";
const BASE_PATH = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);
const INTERVAL_MS = Number(
  process.env.AUTO_SYNC_WORKER_INTERVAL_MS || 30 * 60 * 1000
);
const RETRY_MS = Number(
  process.env.AUTO_SYNC_WORKER_RETRY_MS || 60 * 1000
);

if (!SECRET) {
  console.error("[Worker] CRON_SECRET is required");
  process.exit(1);
}

function normalizeBasePath(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "/") {
    return "";
  }

  return raw.startsWith("/") ? raw.replace(/\/+$/, "") : `/${raw.replace(/\/+$/, "")}`;
}

function buildCandidateUrls() {
  const paths = [`/api/sync-worker`, `${BASE_PATH}/api/sync-worker`].filter(
    (value, index, items) => value && items.indexOf(value) === index
  );

  return paths.map((pathname) => {
    const url = new URL(pathname, BASE_URL);
    url.searchParams.set("secret", SECRET);
    return url.toString();
  });
}

async function runSync() {
  const candidateUrls = buildCandidateUrls();
  const startedAt = new Date().toISOString();

  for (const url of candidateUrls) {
    try {
      console.log({
        event: "sync_worker_request_started",
        source: "worker",
        url,
        actualTime: startedAt,
      });

      const response = await fetch(url, { method: "GET" });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        console.error({
          event: "sync_worker_request_failed",
          source: "worker",
          url,
          status: response.status,
          body: data,
          actualTime: new Date().toISOString(),
        });
        continue;
      }

      const status = data?.status || "unknown";
      const shouldRetrySoon =
        status === "in-progress" ||
        status === "error";

      console.log({
        event: "sync_worker_request_completed",
        source: "worker",
        url,
        status,
        nextMode: shouldRetrySoon ? "retry" : "interval",
        actualTime: new Date().toISOString(),
      });
      return shouldRetrySoon ? "retry" : "interval";
    } catch (error) {
      console.error({
        event: "sync_worker_request_error",
        source: "worker",
        url,
        error: error instanceof Error ? error.message : String(error),
        actualTime: new Date().toISOString(),
      });
    }
  }

  console.error({
    event: "sync_worker_all_targets_failed",
    source: "worker",
    baseUrl: BASE_URL,
    basePath: BASE_PATH || null,
    actualTime: new Date().toISOString(),
  });

  return "retry";
}

async function startWorkerLoop() {
  let delayMs = 0;

  while (true) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const nextMode = await runSync();
    delayMs = nextMode === "interval" ? INTERVAL_MS : RETRY_MS;

    console.log({
      event:
        nextMode === "interval"
          ? "sync_worker_next_run_scheduled"
          : "sync_worker_catchup_retry_scheduled",
      source: "worker",
      nextDelayMs: delayMs,
      actualTime: new Date().toISOString(),
    });
  }
}

console.log({
  event: "sync_worker_started",
  source: "worker",
  baseUrl: BASE_URL,
  basePath: BASE_PATH || null,
  intervalMinutes: INTERVAL_MS / 60000,
  retrySeconds: RETRY_MS / 1000,
  actualTime: new Date().toISOString(),
});

void startWorkerLoop();
