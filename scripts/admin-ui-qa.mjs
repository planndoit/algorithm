import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile, rm, access } from "node:fs/promises";
import { unlinkSync } from "node:fs";
const route = "src/app/qa-admin-local/page.tsx";
try {
  await access(route);
  throw Error("Local QA route already exists. Stop the other QA run first.");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await mkdir("src/app/qa-admin-local", { recursive: true });
await writeFile(
  route,
  await readFile("tests/fixtures/admin-preview.template", "utf8"),
);
const cleanup = () => {
  try {
    unlinkSync(route);
  } catch {}
};
process.on("exit", cleanup);
const port = process.env.ADMIN_QA_PORT || "3013";
const url = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  NODE_ENV: "development",
  ADMIN_UI_QA: "true",
  DATABASE_URL: "",
  NEON_AUTH_BASE_URL: "",
  NEON_AUTH_COOKIE_SECRET: "",
  DEMO_MODE: "true",
};
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    port,
  ],
  { env, stdio: "inherit" },
);
process.on("SIGINT", () => {
  server.kill("SIGTERM");
  cleanup();
  process.exit(130);
});
process.on("SIGTERM", () => {
  server.kill("SIGTERM");
  cleanup();
  process.exit(143);
});
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    try {
      const response = await fetch(url + "/qa-admin-local", {
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ready) throw Error("Admin QA server did not become ready");
  const tests = spawn(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test", "e2e/admin-ui.spec.ts"],
    { env: { ...env, E2E_BASE_URL: url }, stdio: "inherit" },
  );
  process.exitCode = await new Promise((resolve) =>
    tests.on("exit", (code) => resolve(code ?? 1)),
  );
} finally {
  if (server.exitCode === null) {
    const stopped = new Promise((resolve) => server.once("exit", resolve));
    server.kill("SIGTERM");
    await stopped;
  }
  await rm(route, { force: true });
  await rm("src/app/qa-admin-local", { recursive: true, force: true });
  // Remove generated validators for the ephemeral route before normal type checks.
  await rm(".next/dev/types", { recursive: true, force: true });
}
