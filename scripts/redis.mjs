// Portable Redis helper for local development on this machine.
// In production, point REDIS_URL at a managed Redis instance instead.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, closeSync, openSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

const root = process.cwd();
const binDir = process.env.REDIS_BIN || "C:\\tools\\redis";
const port = Number(process.env.REDIS_PORT || 6379);
const action = process.argv[2] || "start";
const pidFile = path.join(root, ".redis.pid");
const logFile = path.join(root, "redis.log");
const dataDir = path.join(root, ".redisdata");

function isReady() {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(500, () => done(false));
    socket.on("connect", () => done(true));
    socket.on("error", () => done(false));
  });
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
    console.log(`Redis is already listening on 127.0.0.1:${port}.`);
    return 0;
  }
  const exe = path.join(binDir, "redis-server.exe");
  if (!existsSync(exe)) {
    console.error(`redis-server.exe not found at ${exe}. Set REDIS_BIN to the Redis directory.`);
    return 1;
  }
  mkdirSync(dataDir, { recursive: true });
  const log = openSync(logFile, "a");
  const child = spawn(
    exe,
    ["--bind", "127.0.0.1", "--port", String(port), "--dir", dataDir, "--save", "", "--appendonly", "no"],
    { detached: true, stdio: ["ignore", log, log] },
  );
  child.unref();
  closeSync(log);
  writeFileSync(pidFile, String(child.pid));

  for (let i = 0; i < 20; i += 1) {
    if (await isReady()) {
      console.log(`Redis started on 127.0.0.1:${port} (pid ${child.pid}).`);
      return 0;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  console.error(`Redis did not become ready. Check ${logFile}.`);
  return 1;
}

function stop() {
  const pid = readPid();
  if (!pid) {
    console.log("No Redis pid file found.");
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
  console.log(ready ? `Redis is ready on 127.0.0.1:${port}${pid ? ` (pid ${pid})` : ""}.` : "Redis is not running.");
  return ready ? 0 : 1;
}

const code = action === "start" ? await start() : action === "stop" ? stop() : await status();
process.exit(code);
