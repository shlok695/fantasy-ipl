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
const WORKER_TIME_ZONE =
  (process.env.AUTO_SYNC_WORKER_TIME_ZONE || process.env.IPL_SCHEDULE_TIME_ZONE || "").trim() ||
  "America/New_York";
const DAILY_REQUEST_LIMIT = parsePositiveInteger(
  process.env.AUTO_SYNC_WORKER_MAX_REQUESTS_PER_DAY,
  80
);
const STATE_PATH =
  (process.env.AUTO_SYNC_WORKER_STATE_PATH || "").trim() ||
  path.join("/tmp", "fantasy-ipl-sync-worker-state.json");
const WEEKDAY_TRIGGER_TIMES = parseTriggerTimes(
  process.env.AUTO_SYNC_WORKER_WEEKDAY_TRIGGER_TIMES || "12:30,14:30,16:00"
);
const WEEKEND_TRIGGER_TIMES = parseTriggerTimes(
  process.env.AUTO_SYNC_WORKER_WEEKEND_TRIGGER_TIMES || "08:30,09:55,12:30,14:30,16:00"
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

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseTriggerTimes(value) {
  const parsed = String(value || "")
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^(\d{1,2}):(\d{2})$/);
      if (!match) {
        return null;
      }

      const hour = Number.parseInt(match[1], 10);
      const minute = Number.parseInt(match[2], 10);
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return null;
      }

      return {
        hour,
        minute,
        label: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      };
    })
    .filter(Boolean);

  const deduped = [];
  const seen = new Set();
  for (const trigger of parsed) {
    if (seen.has(trigger.label)) {
      continue;
    }
    seen.add(trigger.label);
    deduped.push(trigger);
  }

  deduped.sort((left, right) => left.hour * 60 + left.minute - (right.hour * 60 + right.minute));

  return deduped.length > 0
    ? deduped
    : [
        { hour: 8, minute: 30, label: "08:30" },
        { hour: 9, minute: 30, label: "09:30" },
        { hour: 12, minute: 0, label: "12:00" },
        { hour: 14, minute: 30, label: "14:30" },
      ];
}

function getTimeZoneParts(value, timeZone) {
  const date = value instanceof Date ? value : new Date(value);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value || "0000";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";
  const hour = Number.parseInt(
    parts.find((part) => part.type === "hour")?.value || "0",
    10
  );
  const minute = Number.parseInt(
    parts.find((part) => part.type === "minute")?.value || "0",
    10
  );

  return {
    dayKey: `${year}-${month}-${day}`,
    year: Number.parseInt(year, 10),
    month: Number.parseInt(month, 10),
    day: Number.parseInt(day, 10),
    hour,
    minute,
  };
}

function getTimeZoneWeekday(value, timeZone) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  })
    .format(date)
    .toLowerCase();
}

function getTimeZoneOffsetMs(date, timeZone) {
  const parts = getTimeZoneParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    0,
    0
  );
  return asUtc - date.getTime();
}

function buildTimeZoneDate(dayKey, hour, minute, timeZone) {
  const [year, month, day] = dayKey
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const firstPass = new Date(utcGuess);
  const firstOffset = getTimeZoneOffsetMs(firstPass, timeZone);
  const corrected = new Date(utcGuess - firstOffset);
  const correctedOffset = getTimeZoneOffsetMs(corrected, timeZone);

  if (correctedOffset !== firstOffset) {
    return new Date(utcGuess - correctedOffset);
  }

  return corrected;
}

function getNextDayKey(dayKey) {
  const [year, month, day] = dayKey
    .split("-")
    .map((value) => Number.parseInt(value, 10));
  return new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0))
    .toISOString()
    .slice(0, 10);
}

function getTriggerTimesForDayKey(dayKey) {
  const midday = buildTimeZoneDate(dayKey, 12, 0, WORKER_TIME_ZONE);
  const weekday = getTimeZoneWeekday(midday, WORKER_TIME_ZONE);
  const isWeekend = weekday === "sat" || weekday === "sun";
  return isWeekend ? WEEKEND_TRIGGER_TIMES : WEEKDAY_TRIGGER_TIMES;
}

function getFirstTriggerForDay(dayKey) {
  const triggerTimes = getTriggerTimesForDayKey(dayKey);
  const firstTrigger = triggerTimes[0];
  return {
    dayKey,
    trigger: firstTrigger,
    at: buildTimeZoneDate(dayKey, firstTrigger.hour, firstTrigger.minute, WORKER_TIME_ZONE),
  };
}

function getNextScheduledRun(now = new Date()) {
  const nowMs = now.getTime();
  const todayKey = getTimeZoneParts(now, WORKER_TIME_ZONE).dayKey;
  const triggerTimes = getTriggerTimesForDayKey(todayKey);

  for (const trigger of triggerTimes) {
    const triggerAt = buildTimeZoneDate(todayKey, trigger.hour, trigger.minute, WORKER_TIME_ZONE);
    if (triggerAt.getTime() > nowMs + 1_000) {
      return {
        dayKey: todayKey,
        trigger,
        at: triggerAt,
      };
    }
  }

  return getFirstTriggerForDay(getNextDayKey(todayKey));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function readWorkerState() {
  try {
    if (!fs.existsSync(STATE_PATH)) {
      return { dayKey: "", used: 0, lastRequestAt: null };
    }

    const raw = fs.readFileSync(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      dayKey: String(parsed?.dayKey || "").trim(),
      used: Number.isFinite(Number(parsed?.used)) ? Number(parsed.used) : 0,
      lastRequestAt: parsed?.lastRequestAt || null,
    };
  } catch (error) {
    console.error({
      event: "sync_worker_state_read_failed",
      source: "worker",
      statePath: STATE_PATH,
      error: error instanceof Error ? error.message : String(error),
      actualTime: new Date().toISOString(),
    });
    return { dayKey: "", used: 0, lastRequestAt: null };
  }
}

function writeWorkerState(state) {
  try {
    fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
    fs.writeFileSync(`${STATE_PATH}`, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  } catch (error) {
    console.error({
      event: "sync_worker_state_write_failed",
      source: "worker",
      statePath: STATE_PATH,
      error: error instanceof Error ? error.message : String(error),
      actualTime: new Date().toISOString(),
    });
  }
}

function normalizeWorkerStateForDay(state, dayKey) {
  if (state.dayKey === dayKey) {
    return state;
  }

  return {
    dayKey,
    used: 0,
    lastRequestAt: null,
  };
}

function reserveDailyRequestSlot(now = new Date()) {
  const dayKey = getTimeZoneParts(now, WORKER_TIME_ZONE).dayKey;
  const state = normalizeWorkerStateForDay(readWorkerState(), dayKey);

  if (state.used >= DAILY_REQUEST_LIMIT) {
    return {
      allowed: false,
      state,
    };
  }

  const nextState = {
    dayKey,
    used: state.used + 1,
    lastRequestAt: now.toISOString(),
  };
  writeWorkerState(nextState);

  return {
    allowed: true,
    state: nextState,
  };
}

function buildCandidateUrls() {
  const paths = [BASE_PATH ? `${BASE_PATH}/api/sync-worker` : `/api/sync-worker`];

  return paths.map((pathname) => {
    const url = new URL(pathname, BASE_URL);
    url.searchParams.set("secret", SECRET);
    return url.toString();
  });
}

async function runSync(runContext) {
  const candidateUrls = buildCandidateUrls();
  const startedAt = new Date().toISOString();

  for (const url of candidateUrls) {
    try {
      console.log({
        event: "sync_worker_request_started",
        source: "worker",
        url,
        triggerTimeZone: WORKER_TIME_ZONE,
        triggerLabel: runContext.triggerLabel,
        triggerAt: runContext.triggerAt,
        quotaDayKey: runContext.quotaDayKey,
        quotaUsed: runContext.quotaUsed,
        quotaLimit: DAILY_REQUEST_LIMIT,
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
          triggerTimeZone: WORKER_TIME_ZONE,
          triggerLabel: runContext.triggerLabel,
          quotaDayKey: runContext.quotaDayKey,
          quotaUsed: runContext.quotaUsed,
          quotaLimit: DAILY_REQUEST_LIMIT,
          actualTime: new Date().toISOString(),
        });
        continue;
      }

      const status = data?.status || "unknown";
      console.log({
        event: "sync_worker_request_completed",
        source: "worker",
        url,
        status,
        triggerTimeZone: WORKER_TIME_ZONE,
        triggerLabel: runContext.triggerLabel,
        quotaDayKey: runContext.quotaDayKey,
        quotaUsed: runContext.quotaUsed,
        quotaLimit: DAILY_REQUEST_LIMIT,
        actualTime: new Date().toISOString(),
      });
      return true;
    } catch (error) {
      console.error({
        event: "sync_worker_request_error",
        source: "worker",
        url,
        error: error instanceof Error ? error.message : String(error),
        triggerTimeZone: WORKER_TIME_ZONE,
        triggerLabel: runContext.triggerLabel,
        quotaDayKey: runContext.quotaDayKey,
        quotaUsed: runContext.quotaUsed,
        quotaLimit: DAILY_REQUEST_LIMIT,
        actualTime: new Date().toISOString(),
      });
    }
  }

  console.error({
    event: "sync_worker_all_targets_failed",
    source: "worker",
    baseUrl: BASE_URL,
    basePath: BASE_PATH || null,
    triggerTimeZone: WORKER_TIME_ZONE,
    triggerLabel: runContext.triggerLabel,
    quotaDayKey: runContext.quotaDayKey,
    quotaUsed: runContext.quotaUsed,
    quotaLimit: DAILY_REQUEST_LIMIT,
    actualTime: new Date().toISOString(),
  });

  return false;
}

async function startWorkerLoop() {
  while (true) {
    const nextRun = getNextScheduledRun(new Date());
    const delayMs = Math.max(0, nextRun.at.getTime() - Date.now());

    console.log({
      event: "sync_worker_next_run_scheduled",
      source: "worker",
      nextRunAt: nextRun.at.toISOString(),
      nextRunDayKey: nextRun.dayKey,
      nextRunLabel: nextRun.trigger.label,
      timeZone: WORKER_TIME_ZONE,
      nextDelayMs: delayMs,
      actualTime: new Date().toISOString(),
    });

    await sleep(delayMs);

    const quotaReservation = reserveDailyRequestSlot(new Date());
    if (!quotaReservation.allowed) {
      const resetRun = getFirstTriggerForDay(
        getNextDayKey(getTimeZoneParts(new Date(), WORKER_TIME_ZONE).dayKey)
      );
      const resetDelayMs = Math.max(0, resetRun.at.getTime() - Date.now());

      console.log({
        event: "sync_worker_daily_limit_reached",
        source: "worker",
        quotaDayKey: quotaReservation.state.dayKey,
        quotaUsed: quotaReservation.state.used,
        quotaLimit: DAILY_REQUEST_LIMIT,
        timeZone: WORKER_TIME_ZONE,
        resumeAt: resetRun.at.toISOString(),
        actualTime: new Date().toISOString(),
      });

      await sleep(resetDelayMs);
      continue;
    }

    await runSync({
      triggerLabel: nextRun.trigger.label,
      triggerAt: nextRun.at.toISOString(),
      quotaDayKey: quotaReservation.state.dayKey,
      quotaUsed: quotaReservation.state.used,
    });
  }
}

console.log({
  event: "sync_worker_started",
  source: "worker",
  baseUrl: BASE_URL,
  basePath: BASE_PATH || null,
  timeZone: WORKER_TIME_ZONE,
  weekdayTriggerTimes: WEEKDAY_TRIGGER_TIMES.map((entry) => entry.label),
  weekendTriggerTimes: WEEKEND_TRIGGER_TIMES.map((entry) => entry.label),
  dailyRequestLimit: DAILY_REQUEST_LIMIT,
  statePath: STATE_PATH,
  actualTime: new Date().toISOString(),
});

void startWorkerLoop();
