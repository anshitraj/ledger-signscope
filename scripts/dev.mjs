import { spawn } from "node:child_process";

const processes = [
  {
    name: "api",
    command: "pnpm",
    args: ["--filter", "@workspace/api-server", "run", "build"],
    env: { PORT: "3001", SIMULATION_MODE: "true" },
  },
  {
    name: "web",
    command: "pnpm",
    args: ["--filter", "@workspace/signscope", "run", "dev"],
    env: { PORT: "5173", BASE_PATH: "/", VITE_API_BASE_URL: "http://localhost:3001/api" },
  },
];

let apiStarted = false;
const children = [];

function start(proc) {
  const child = spawn(proc.command, proc.args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, ...proc.env },
  });
  children.push(child);
  child.on("exit", (code) => {
    if (code && code !== 0) process.exitCode = code;
  });
  return child;
}

const apiBuild = start(processes[0]);
apiBuild.on("exit", (code) => {
  if (code === 0 && !apiStarted) {
    apiStarted = true;
    const apiServer = spawn("node", ["artifacts/api-server/dist/index.mjs"], {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, PORT: "3001", SIMULATION_MODE: "true" },
    });
    children.push(apiServer);
    start(processes[1]);
  }
});

process.on("SIGINT", () => {
  for (const child of children) child.kill();
  process.exit(0);
});
