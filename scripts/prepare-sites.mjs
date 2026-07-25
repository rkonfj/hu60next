import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const source = resolve(".open-next");
const destination = resolve("dist");

await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true, dereference: true });
await mkdir(resolve(destination, "server"), { recursive: true });
await cp(source, resolve(destination, "server"), {
  recursive: true,
  dereference: true
});
await cp(
  resolve("scripts/sites-entry.js"),
  resolve(destination, "server/index.js")
);
await mkdir(resolve(destination, ".openai"), { recursive: true });
await cp(
  resolve(".openai/hosting.json"),
  resolve(destination, ".openai/hosting.json")
);
