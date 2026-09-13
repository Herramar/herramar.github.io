import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "_site");
const port = Number(process.env.PORT || 8080);
const base = (process.env.SITE_BASE_PATH ?? "").replace(/\/$/, "");
const types = {".css":"text/css; charset=utf-8", ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".json":"application/json", ".png":"image/png", ".svg":"image/svg+xml", ".txt":"text/plain; charset=utf-8", ".xml":"application/xml; charset=utf-8"};

createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (base && pathname.startsWith(base)) pathname = pathname.slice(base.length) || "/";
  if (base && requestUrl.pathname === "/") {
    response.writeHead(302, {Location: `${base}/`});
    response.end();
    return;
  }
  let file = path.resolve(root, `.${pathname}`);
  if (!file.startsWith(root)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = path.join(file, "index.html");
    await stat(file);
    response.writeHead(200, {"Content-Type": types[path.extname(file)] || "application/octet-stream"});
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, {"Content-Type":"text/html; charset=utf-8"});
    createReadStream(path.join(root, "404.html")).pipe(response);
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`Preview: http://localhost:${port}${base}/`);
});
