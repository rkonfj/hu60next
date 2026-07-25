import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const source = resolve(".open-next");
const destination = resolve("dist");
const server = resolve(destination, "server");
const run = promisify(execFile);
const wranglerConfig = await mkdtemp(
  join(tmpdir(), "hulvlin-wrangler-config-")
);

await rm(destination, { recursive: true, force: true });
await mkdir(server, { recursive: true });
await cp(resolve(source, "assets"), resolve(destination, "assets"), {
  recursive: true,
  dereference: true
});

try {
  await run(
    process.execPath,
    [
      resolve("node_modules/wrangler/bin/wrangler.js"),
      "deploy",
      "--dry-run",
      "--outdir",
      server
    ],
    {
      env: {
        ...process.env,
        XDG_CONFIG_HOME: wranglerConfig,
        WRANGLER_LOG_PATH: resolve(wranglerConfig, "wrangler.log")
      }
    }
  );
} finally {
  await rm(wranglerConfig, { recursive: true, force: true });
}

await rename(resolve(server, "worker.js"), resolve(server, "index.js"));
await mkdir(resolve(destination, ".openai"), { recursive: true });
await cp(
  resolve(".openai/hosting.json"),
  resolve(destination, ".openai/hosting.json")
);
