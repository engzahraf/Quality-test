
const BACKEND = "http://87.106.100.187:7813";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      const target = new URL(
        url.pathname + url.search,
        BACKEND
      );

      const headers = new Headers(request.headers);
      headers.delete("host");

      const init = {
        method: request.method,
        headers,
        redirect: "manual"
      };

      if (request.method !== "GET" && request.method !== "HEAD") {
        init.body = request.body;
      }

      return fetch(new Request(target.toString(), init));
    }

    return env.ASSETS.fetch(request);
  }
};
