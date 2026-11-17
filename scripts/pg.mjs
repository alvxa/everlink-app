// Portable PostgreSQL helper for local development on this machine.
// In production, point DATABASE_URL at a managed PostgreSQL instance instead.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, ".pgdata");
const logFile = path.join(root, "pg.log");
const port = process.env.PG_PORT || "5433";
const pgBin = process.env.PG_BIN || "C:\\tools\\pgsql\\bin";
const action = process.argv[2] || "start";

function run(bin, args, opts = {}) {
  const full = path.join(pgBin, bin + ".exe");
  const res = spawnSync(full, args, { stdio: "inherit", ...opts });
  return res.status ?? 1;
}

function isReady() {
  const res = spawnSync(path.join(pgBin, "pg_isready.exe"), ["-h", "localhost", "-p", port], {
    stdio: "ignore",
  });
  return res.status === 0;
}

function ensureInit() {
  if (existsSync(path.join(dataDir, "PG_VERSION"))) return true;
  console.log("Initializing PostgreSQL data directory at .pgdata ...");
  mkdirSync(dataDir, { recursive: true });
  const code = run("initdb", ["-D", dataDir, "-U", "postgres", "-A", "trust", "-E", "UTF8", "--locale=C"]);
  if (code !== 0) {
    console.error("initdb failed. Check PG_BIN and the log above.");
    return false;
  }
  return true;
}

function ensureDatabase() {
  const res = spawnSync(
    path.join(pgBin, "psql.exe"),
    ["-h", "localhost", "-p", port, "-U", "postgres", "-tAc", "SELECT 1 FROM pg_database WHERE datname='everlink'"],
    { encoding: "utf8" }
  );
  if (res.stdout && res.stdout.trim() === "1") return true;
  console.log("Creating database everlink ...");
  return run("createdb", ["-h", "localhost", "-p", port, "-U", "postgres", "everlink"]) === 0;
}

if (action === "start") {
  if (isReady()) {
    console.log(`PostgreSQL is already running on port ${port}.`);
    process.exit(0);
  }
  if (!ensureInit()) process.exit(1);
  console.log(`Starting PostgreSQL on port ${port} ...`);
  const res = spawnSync(
    path.join(pgBin, "pg_ctl.exe"),
    ["-D", dataDir, "-l", logFile, "-o", `-p ${port} -c listen_addresses=localhost`, "start"],
    { stdio: "ignore" }
  );
  if (res.status !== 0) {
    console.error("Failed to start PostgreSQL. See pg.log.");
    process.exit(1);
  }
  if (!ensureDatabase()) process.exit(1);
  console.log(`PostgreSQL ready: postgresql://postgres@localhost:${port}/everlink`);
} else if (action === "stop") {
  if (!isReady()) {
    console.log("PostgreSQL is not running.");
    process.exit(0);
  }
  run("pg_ctl", ["-D", dataDir, "stop", "-m", "fast"]);
} else if (action === "status") {
  console.log(isReady() ? `PostgreSQL is running on port ${port}.` : "PostgreSQL is not running.");
} else {
  console.error("Usage: node scripts/pg.mjs [start|stop|status]");
  process.exit(1);
}
