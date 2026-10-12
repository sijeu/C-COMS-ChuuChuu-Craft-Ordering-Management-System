(() => {
  "use strict";
  const read = (k, d) => { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : d; } catch (e) { return d; } };
  const home = role => (role === "admin" ? "admin.html" : "customer.html");
  const save = data => {
    try { localStorage.setItem("tt_token", data.token); localStorage.setItem("tt_session", JSON.stringify(data.user)); } catch (e) { /* storage unavailable */ }
    return data.user;
  };
  const clear = () => { try { localStorage.removeItem("tt_token"); localStorage.removeItem("tt_session"); localStorage.removeItem("tt_cart"); } catch (e) { /* storage unavailable */ } };
  const wrap = async fn => { try { return await fn(); } catch (e) { return { ok: false, error: e.message }; } };

  window.Auth = {
    home,
    current: () => { try { return localStorage.getItem("tt_token") ? read("tt_session", null) : null; } catch (e) { return null; } },

    login: (email, password) => wrap(async () => ({ ok: true, user: save(await Api.post("/auth/login", { email, password })) })),

    // Step 1 of sign-up: the server emails a 6-digit code (no account yet)
    register: (name, email, password) => wrap(async () => {
      const r = await Api.post("/auth/register", { name, email, password });
      return { ok: true, pending: true, email: r.email || email };
    }),
    // Step 2: enter the code to create the account and log in
    verify: (email, otp) => wrap(async () => ({ ok: true, user: save(await Api.post("/auth/verify", { email, otp })) })),
    resend: email => wrap(async () => { await Api.post("/auth/resend", { email }); return { ok: true }; }),

    logout() { clear(); location.href = "login.html"; },

    // UI-only redirect; the server enforces access on every API call
    guard(role) {
      const s = Auth.current();
      if (!s) { location.replace("login.html"); return null; }
      if (s.role !== role) { location.replace(home(s.role)); return null; }
      return s;
    },
    // call from pages when the API says the token is no longer valid
    handle(err) { if (err && err.status === 401) Auth.logout(); return err; }
  };
})();
