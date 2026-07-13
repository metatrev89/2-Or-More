import { createServer } from 'node:http';

/**
 * Minimal Node adapter for a fetch-style handler (avoids extra deps).
 * On Cloudflare Workers, `app.fetch` is exported directly instead.
 */
export function serve(fetchHandler: (req: Request) => Promise<Response> | Response, port: number): void {
  createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks);
    const url = `http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`;

    const request = new Request(url, {
      method: req.method,
      headers: Object.entries(req.headers).flatMap(([k, v]) =>
        v == null ? [] : Array.isArray(v) ? v.map(x => [k, x] as [string, string]) : [[k, v] as [string, string]],
      ),
      body: body.length && req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
    });

    const response = await fetchHandler(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(Buffer.from(await response.arrayBuffer()));
  }).listen(port);
}
