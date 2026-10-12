(() => {
  "use strict";
  // Backend URL. Change this when the backend is deployed (or set window.API_BASE before this script).
  const BASE = window.API_BASE || "http://localhost:3000/api";
  const token = () => { try { return localStorage.getItem("tt_token"); } catch (e) { return null; } };

  async function req(method, path, body) {
    let res;
    try {
      res = await fetch(BASE + path, {
        method,
        headers: Object.assign({ "Content-Type": "application/json" }, token() ? { Authorization: "Bearer " + token() } : {}),
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (e) { throw Object.assign(new Error("Can't reach the server. Is it running?"), { status: 0 }); }
    let data = null;
    try { data = await res.json(); } catch (e) { /* empty body */ }
    if (!res.ok) throw Object.assign(new Error((data && data.error) || "Request failed."), { status: res.status });
    return data;
  }

  window.Api = {
    get: p => req("GET", p),
    post: (p, b) => req("POST", p, b),
    patch: (p, b) => req("PATCH", p, b),
    put: (p, b) => req("PUT", p, b)
  };
})();
