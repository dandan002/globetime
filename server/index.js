import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { getNistTime } from "./nistTime.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 5173);
const isProduction = process.env.NODE_ENV === "production";

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function handleApi(request, response) {
  if (request.url !== "/api/nist-time") return false;

  try {
    const nist = await getNistTime();
    sendJson(response, 200, {
      ok: true,
      ...nist,
    });
  } catch (error) {
    sendJson(response, 503, {
      ok: false,
      error: error instanceof Error ? error.message : "NIST time unavailable",
      source: "time.nist.gov",
      protocol: "NTP",
    });
  }

  return true;
}

function serveStatic(request, response) {
  const dist = path.join(root, "dist");
  const urlPath = request.url === "/" ? "/index.html" : request.url;
  const resolved = path.normalize(path.join(dist, urlPath.split("?")[0]));

  if (!resolved.startsWith(dist)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  const filePath = fs.existsSync(resolved) ? resolved : path.join(dist, "index.html");
  fs.createReadStream(filePath)
    .on("error", () => {
      response.writeHead(404);
      response.end("Not found");
    })
    .pipe(response);
}

async function main() {
  const vite = isProduction
    ? null
    : await createViteServer({
        root,
        server: { middlewareMode: true },
        appType: "spa",
      });

  const server = http.createServer(async (request, response) => {
    if (await handleApi(request, response)) return;

    if (vite) {
      vite.middlewares(request, response);
      return;
    }

    serveStatic(request, response);
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`GLOBETIME listening at http://127.0.0.1:${port}/`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
