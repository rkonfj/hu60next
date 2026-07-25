import http from "node:http";

const listenPort = 3000;
const upstreamPort = 3001;

function normalizeRequestTarget(value = "/") {
  if (!/^https?:\/\//i.test(value)) return value;

  try {
    const url = new URL(value);
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}

function redactRequestTarget(value = "/") {
  try {
    const url = new URL(value, "http://local");
    for (const key of ["name", "pass", "password"]) {
      if (url.searchParams.has(key)) {
        url.searchParams.set(key, "[redacted]");
      }
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "/";
  }
}

const server = http.createServer((request, response) => {
  const requestTarget = normalizeRequestTarget(request.url);
  const headers = {
    ...request.headers,
    "x-forwarded-host": request.headers.host ?? "192.168.3.99:3000",
    "x-forwarded-proto": "http"
  };
  delete headers["proxy-connection"];

  const upstream = http.request(
    {
      hostname: "127.0.0.1",
      port: upstreamPort,
      method: request.method,
      path: requestTarget,
      headers
    },
    (upstreamResponse) => {
      const location = upstreamResponse.headers.location ?? "-";
      process.stdout.write(
        `${request.method} ${redactRequestTarget(request.url)} as ${redactRequestTarget(requestTarget)} -> ${upstreamResponse.statusCode} location=${location}\n`
      );
      response.writeHead(
        upstreamResponse.statusCode ?? 502,
        upstreamResponse.headers
      );
      upstreamResponse.pipe(response);
    }
  );

  upstream.on("error", (error) => {
    process.stderr.write(`upstream error: ${error.message}\n`);
    if (!response.headersSent) {
      response.writeHead(502, { "content-type": "text/plain;charset=utf-8" });
    }
    response.end("Local preview upstream unavailable");
  });

  request.pipe(upstream);
});

server.listen(listenPort, "0.0.0.0", () => {
  process.stdout.write(
    `Local diagnostic proxy listening on 0.0.0.0:${listenPort}\n`
  );
});
