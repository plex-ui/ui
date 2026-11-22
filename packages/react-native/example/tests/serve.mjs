// A static server for the web export of the example (dist/), for the Playwright tests: `node tests/serve.mjs [port]`.
import { createReadStream, existsSync, statSync } from "node:fs"
import { createServer } from "node:http"
import { extname, join, normalize } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("../dist/", import.meta.url))
const port = Number(process.argv[2] ?? 8092)
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".ttf": "font/ttf",
  ".png": "image/png",
  ".ico": "image/x-icon",
}

createServer((request, response) => {
  let path
  try {
    path = normalize(decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname)).replace(/^(\.\.[/\\])+/, "")
  } catch {
    // A malformed escape (%E0%A4%A) is the client's error, not a reason to stop serving
    response.writeHead(400, { "content-type": "text/plain; charset=utf-8" }).end("Bad request")
    return
  }
  let file = join(root, path)
  if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) file = join(root, "index.html")
  response.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" })
  createReadStream(file).pipe(response)
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}`))
