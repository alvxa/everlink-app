// Local TURN relay for development and single-node deployments.
// Production should point TURN_URLS at coturn or a hosted TURN service instead.
import nextEnv from "@next/env";
import Turn from "node-turn";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

function splitList(value) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function turnConfigFromEnv() {
  const credential = process.env.TURN_CREDENTIAL || "";
  const username = process.env.TURN_USERNAME || "";
  if (!credential || !username) {
    throw new Error("TURN_USERNAME and TURN_CREDENTIAL must be set before starting the relay.");
  }

  const listen = splitList(process.env.TURN_LISTEN_IPS);
  const relay = splitList(process.env.TURN_RELAY_IPS);
  const external = (process.env.TURN_EXTERNAL_IP || "").trim();
  const config = {
    listeningPort: Number(process.env.TURN_PORT || 3478),
    minPort: Number(process.env.TURN_MIN_PORT || 49160),
    maxPort: Number(process.env.TURN_MAX_PORT || 49200),
    authMech: "long-term",
    realm: process.env.TURN_REALM || "everlink.local",
    credentials: { [username]: credential },
    debugLevel: process.env.TURN_DEBUG || "INFO",
  };
  if (listen.length) config.listeningIps = listen;
  if (relay.length) config.relayIps = relay;
  if (external) config.externalIps = external;
  return config;
}

export function startTurnServer(config = turnConfigFromEnv()) {
  const server = new Turn(config);
  server.start();
  return server;
}

const invokedDirectly = process.argv[1] && process.argv[1].endsWith("turn.mjs");
if (invokedDirectly) {
  let server;
  try {
    const config = turnConfigFromEnv();
    server = startTurnServer(config);
    console.log("\n  EVERLINK TURN relay");
    console.log(`  > udp ${config.listeningPort}`);
    console.log(`  > relay ports ${config.minPort}-${config.maxPort}`);
    console.log(`  > realm ${config.realm}`);
    console.log(`  > user ${Object.keys(config.credentials)[0]}`);
    console.log("  > point TURN_URLS at this host, then restart the app\n");
  } catch (error) {
    console.error(`[turn] ${error.message}`);
    process.exit(1);
  }

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      console.log(`\n[turn] ${signal} received, shutting down...`);
      server.stop();
      process.exit(0);
    });
  }
}
