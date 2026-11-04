// Deploys a built app. With VERCEL_TOKEN set, it goes to Vercel; otherwise the
// studio itself hosts the app at /apps/<id>/.
import { spawn } from "node:child_process";

const publicBase = () =>
  (process.env.STUDIO_PUBLIC_URL || `http://localhost:${process.env.PORT || 4321}`).replace(/\/$/, "");

function run(cmd, args, opts) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...opts, stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(out) : reject(new Error(`${cmd} exited ${code}: ${err.slice(-500)}`))
    );
  });
}

export async function deploy(id, dir, log) {
  const localUrl = `${publicBase()}/apps/${id}/`;
  if (!process.env.VERCEL_TOKEN) {
    log("No VERCEL_TOKEN set, so the studio is hosting the app itself.");
    return { target: "studio", url: localUrl };
  }
  if (/localhost|127\.0\.0\.1/.test(publicBase())) {
    log("Warning: STUDIO_PUBLIC_URL is localhost, so analytics from the Vercel copy can't reach this studio.");
  }
  log("Deploying to Vercel...");
  const out = await run(
    "npx",
    ["--yes", "vercel@latest", "deploy", dir, "--prod", "--yes", "--token", process.env.VERCEL_TOKEN,
      "--name", `vs-${id}`],
    { env: process.env }
  );
  const url = out.trim().split(/\s+/).reverse().find((s) => s.startsWith("https://"));
  if (!url) throw new Error("Vercel didn't return a URL");
  return { target: "vercel", url, previewUrl: localUrl };
}
