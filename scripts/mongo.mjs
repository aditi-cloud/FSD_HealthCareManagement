import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const path = fileURLToPath(new URL("../data/mongodb", import.meta.url));
await mkdir(path, { recursive: true });
const child = spawn(
  "mongod",
  ["--dbpath", path, "--bind_ip", "127.0.0.1", "--port", "27017"],
  { stdio: "inherit" },
);
child.on("error", () => {
  console.error(
    "Install MongoDB Community Server, or use the automatic local JSON demo store.",
  );
  process.exitCode = 1;
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  process.exitCode = code || 0;
});
