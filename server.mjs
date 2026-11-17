import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const server = createServer((req, res) => {
  handle(req, res, parse(req.url || "/", true));
});

// Next's dev HMR socket needs its own upgrade handler when using a custom server.
const upgradeHandler = typeof app.getUpgradeHandler === "function" ? app.getUpgradeHandler() : null;
if (upgradeHandler) {
  server.on("upgrade", (req, socket, head) => {
    if (req.url?.startsWith("/socket.io")) return;
    upgradeHandler(req, socket, head);
  });
}

const { attachRealtime } = await import("./server/realtime.mjs");
const io = await attachRealtime(server);
globalThis.__everlinkIO = io;

let turnServer = null;
if (process.env.TURN_EMBEDDED === "true") {
  const { startTurnServer } = await import("./scripts/turn.mjs");
  turnServer = startTurnServer();
  console.log(`  > embedded TURN relay on udp ${process.env.TURN_PORT || 3478}`);
}

server.listen(port, hostname, () => {
  console.log(`\n  EVERLINK ${dev ? "development" : "production"} server`);
  console.log(`  > http://${hostname}:${port}`);
  console.log(`  > realtime socket.io ready on /socket.io\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log(`\n[server] ${signal} received, shutting down...`);
    io.close();
    if (turnServer) turnServer.stop();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  });
}
