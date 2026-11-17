// Portable LibreTranslate helper for local development on this machine.
// In production, run LibreTranslate as its own service and point
// TRANSLATION_BASE_URL at it.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, closeSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const exe = process.env.LT_BIN || "C:\\tools\\libretranslate-venv\\Scripts\\libretranslate.exe";
const port = Number(process.env.LT_PORT || 5000);
const host = "127.0.0.1";
const langs = process.env.LT_LOAD_ONLY || "en,tl";
const action = process.argv[2] || "start";
const pidFile = path.join(root, ".libretranslate.pid");
const logFile = path.join(root, "libretranslate.log");

async function isReady() {
  try {
    const res = await fetch(`http://${host}:${port}/languages`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

function readPid() {
  try {
    return Number(readFileSync(pidFile, "utf8").trim()) || null;
  } catch {
    return null;
  }
}

async function start() {
  if (await isReady()) {
    console.log(`LibreTranslate is already listening on http://${host}:${port}.`);
    return 0;
  }
  if (!existsSync(exe)) {
    console.error(`libretranslate.exe not found at ${exe}. Set LT_BIN to the venv Scripts directory.`);
    return 1;
  }
  const log = openSync(logFile, "a");
  const child = spawn(
    exe,
    [
      "--host", host,
      "--port", String(port),
      "--load-only", langs,
      "--disable-web-ui",
      "--disable-files-translation",
    ],
    {
      detached: true,
      stdio: ["ignore", log, log],
      env: { ...process.env, PYTHONUTF8: "1", PYTHONIOENCODING: "utf-8" },
    },
  );
  child.unref();
  closeSync(log);
  writeFileSync(pidFile, String(child.pid));

  console.log(`Starting LibreTranslate with models: ${langs}. First run downloads them.`);
  for (let i = 0; i < 150; i += 1) {
    if (await isReady()) {
      console.log(`LibreTranslate started on http://${host}:${port} (pid ${child.pid}).`);
      return 0;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  console.error(`LibreTranslate did not become ready. Check ${logFile}.`);
  return 1;
}

function stop() {
  const pid = readPid();
  if (!pid) {
    console.log("No LibreTranslate pid file found.");
    return 0;
  }
  const args = process.platform === "win32" ? ["/PID", String(pid), "/F"] : ["-9", String(pid)];
  const kill = spawnSync(process.platform === "win32" ? "taskkill" : "kill", args, { stdio: "inherit" });
  try {
    rmSync(pidFile);
  } catch {
    /* already gone */
  }
  return kill.status ?? 0;
}

async function status() {
  const ready = await isReady();
  const pid = readPid();
  console.log(
    ready
      ? `LibreTranslate is ready on http://${host}:${port}${pid ? ` (pid ${pid})` : ""}.`
      : "LibreTranslate is not running.",
  );
  return ready ? 0 : 1;
}

const code = action === "start" ? await start() : action === "stop" ? stop() : await status();
process.exit(code);
