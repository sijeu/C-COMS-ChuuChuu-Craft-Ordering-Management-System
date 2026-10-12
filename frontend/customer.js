(() => {
  "use strict";
  const me = Auth.guard("customer");
  if (!me) return;

  const PRODUCTS = window.CATALOG;
  const STATUSES = ["Queued", "In the Workshop", "Packed", "Shipped", "Delivered", "Completed"];
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const money = n => window.peso(n);
  const byId = id => PRODUCTS.find(p => p.id === id);
  const pieces = o => o.items.reduce((s, i) => s + i.qty, 0);
  const ago = iso => { const d = Math.floor((Date.now() - new Date(iso)) / 86400000); return d <= 0 ? "Today" : d === 1 ? "Yesterday" : d + " days ago"; };

  let ORDERS = [], REQUESTS = [];

  async function load() {
    try {
      [ORDERS, REQUESTS] = await Promise.all([Api.get("/orders/mine"), Api.get("/requests/mine")]);
    } catch (e) { Auth.handle(e); $("orderMeta").textContent = e.message; return; }
    render(); renderRequests();
  }

  function render() {
    const list = ORDERS;
    const active = list.filter(o => !["Shipped", "Delivered", "Completed"].includes(o.status));
    $("kOrders").textContent = list.length;
    $("kOrdersSub").textContent = list.length ? "since you joined" : "none yet";
    $("kActive").textContent = active.length;
    $("kPieces").textContent = list.reduce((s, o) => s + pieces(o), 0);
    $("kSpent").textContent = money(list.reduce((s, o) => s + o.total, 0));
    $("orderMeta").textContent = list.length ? list.length + (list.length === 1 ? " order" : " orders") : "";
    $("orderEmpty").hidden = list.length > 0;
    $("orderList").innerHTML = list.map(o => {
      const idx = STATUSES.indexOf(o.status);
      return `<article class="order-card">
        <div class="oc-head"><span class="oid">${esc(o.id)}</span><span class="muted">${new Date(o.placedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span><span class="oc-total">${money(o.total)}</span>${o.isPaid ? `<button type="button" class="btn btn-outline btn-small receipt-btn" data-receipt="${esc(o.id)}">Email receipt</button>` : '<span class="payment-pending">Payment pending</span>'}</div>
        <div class="oc-items">${o.items.map(i => { const p = byId(i.id); return `<div class="oc-item">${p ? window.imgHTML(p, true) : ""}${esc(i.name)} <span>× ${i.qty}</span></div>`; }).join("")}</div>
        ${o.phone || o.deliveryAddress ? `<div class="oc-contact">${o.phone ? `<div><strong>Phone:</strong> ${esc(o.phone)}</div>` : ""}${o.deliveryAddress ? `<div><strong>Delivery address:</strong> ${esc(o.deliveryAddress)}</div>` : ""}</div>` : ""}
        ${o.paymentMethod ? `<div class="oc-contact"><div><strong>Payment:</strong> ${o.paymentMethod === "gcash" ? "GCash" : "PayMaya"}${o.paymentName ? ` · ${esc(o.paymentName)}` : ""}${o.paymentNumber ? ` · ${esc(o.paymentNumber)}` : ""}</div></div>` : ""}
        <div class="oc-contact"><div><strong>Payment status:</strong> ${o.isPaid ? "Paid" : "Not paid yet"}</div></div>
        ${o.note ? `<p class="oc-note">Note: ${esc(o.note)}</p>` : ""}
        <div class="steps">${STATUSES.map((s, n) => `<div class="step ${n < idx ? "done" : n === idx ? "now" : ""}">${s}</div>`).join("")}</div>
      </article>`;
    }).join("");
  }

  $("orderList").addEventListener("click", async e => {
    const btn = e.target.closest("[data-receipt]"); if (!btn) return;
    const label = btn.textContent; btn.disabled = true; btn.textContent = "Sending…";
    try {
      const r = await Api.post(`/orders/${encodeURIComponent(btn.dataset.receipt)}/receipt`, {});
      btn.textContent = "Sent to " + r.email;
    } catch (err) { Auth.handle(err); btn.textContent = err.message; setTimeout(() => { btn.textContent = label; btn.disabled = false; }, 3000); }
  });

  function renderRequests() {
    $("reqMeta").textContent = REQUESTS.length ? REQUESTS.length + " sent" : "";
    $("reqList").innerHTML = REQUESTS.length ? REQUESTS.map(r => `
      <div class="req">
        <div class="req-top">${ago(r.createdAt)}<span>${r.state === "open" ? "Waiting for a quote" : r.state === "quoted" ? "Quote sent" : "Declined"}</span></div>
        <p>${esc(r.text)}${r.needBy ? ` (needed by ${esc(r.needBy)})` : ""}</p>
      </div>`).join("") : '<p class="muted">Nothing sent yet.</p>';
  }

  $("reqForm").addEventListener("submit", async e => {
    e.preventDefault();
    const text = $("reqText").value.trim(); if (!text) return;
    const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true;
    try {
      const r = await Api.post("/requests", { text, needBy: $("reqDate").value });
      REQUESTS.unshift(r); e.target.reset(); $("reqOk").hidden = false; renderRequests();
    } catch (err) { Auth.handle(err); $("reqOk").hidden = false; $("reqOk").textContent = err.message; }
    finally { btn.disabled = false; }
  });

  $("hello").textContent = "Hi, " + me.name.split(" ")[0];
  $("todayLabel").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  $("logoutBtn").addEventListener("click", Auth.logout);
  $("menuBtn").addEventListener("click", () => { $("side").classList.toggle("open"); $("scrim").classList.toggle("open"); });
  $("scrim").addEventListener("click", () => { $("side").classList.remove("open"); $("scrim").classList.remove("open"); });
  document.querySelectorAll(".side-nav a").forEach(a => a.addEventListener("click", () => {
    document.querySelectorAll(".side-nav a").forEach(x => x.classList.toggle("active", x === a));
    $("side").classList.remove("open"); $("scrim").classList.remove("open");
  }));

  load();
  setInterval(load, 60000);
})();
