(() => {
  "use strict";
  if (!Auth.guard("admin")) return;

  const CATS = Object.fromEntries(window.CATEGORIES.map(c => [c.id, c.name]));
  const CAT_COLOR = { claycrafts: "#6BA0C4", crochet: "#EE9887", felt: "#dbbc66", keychain: "#5A6B80" };
  const PRODUCTS = window.CATALOG;
  const STATUSES = ["Queued", "In the Workshop", "Packed", "Shipped", "Delivered", "Completed"];
  const sKey = s => "s-" + s.replace(/\s/g, "");
  const money = n => window.peso(n);
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const byId = id => PRODUCTS.find(p => p.id === id);
  const art = p => window.imgHTML(p, true);

  let ORDERS = [], REQUESTS = [], filter = "All", query = "", showArchived = false;
  let PAYMENT_SETTINGS = { gcash: {}, paymaya: {} }, paymentSettingsLoaded = false;

  const orderTotal = o => o.total;
  const orderPieces = o => o.items.reduce((s, i) => s + i.qty, 0);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const fmtDate = iso => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const ago = iso => {
    const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
    return d <= 0 ? "Today" : d === 1 ? "Yesterday" : d + " days ago";
  };
  function notify(msg) { $("demoNote").hidden = !msg; $("demoNote").textContent = msg || ""; }
  const fail = e => { Auth.handle(e); notify(e.message); };

  /* ---------- Load ---------- */
  async function load() {
    try {
      const [orders, requests, paymentSettings] = await Promise.all([
        Api.get("/orders?archived=" + showArchived),
        Api.get("/requests"),
        paymentSettingsLoaded ? Promise.resolve(PAYMENT_SETTINGS) : Api.get("/payment-methods")
      ]);
      ORDERS = orders; REQUESTS = requests;
      PAYMENT_SETTINGS = paymentSettings;
      notify("");
    } catch (e) { return fail(e); }
    renderAll(); renderRequests();
    if (!paymentSettingsLoaded) { renderPaymentSettings(); paymentSettingsLoaded = true; }
    loadReport();
  }

  /* ---------- Render ---------- */
  function renderKpis(list) {
    const now = new Date(); const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 6); weekAgo.setHours(0, 0, 0, 0);
    const week = list.filter(o => new Date(o.placedAt) >= weekAgo);
    const open = list.filter(o => !["Shipped", "Delivered", "Completed"].includes(o.status));
    $("kRevenue").textContent = money(week.reduce((s, o) => s + orderTotal(o), 0));
    $("kRevenueSub").textContent = `${week.length} order${week.length === 1 ? "" : "s"} placed`;
    $("kOpen").textContent = open.length;
    $("kOpenSub").textContent = `${open.filter(o => o.status === "Queued").length} waiting to start`;
    $("kPieces").textContent = open.reduce((s, o) => s + orderPieces(o), 0);
    $("kAvg").textContent = money(list.length ? list.reduce((s, o) => s + orderTotal(o), 0) / list.length : 0);
  }

  function renderChart(list) {
    const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
    const totals = days.map(d => list.filter(o => sameDay(new Date(o.placedAt), d)).reduce((s, o) => s + orderTotal(o), 0));
    const max = Math.max(...totals, 1);
    $("chartTotal").textContent = money(totals.reduce((a, b) => a + b, 0)) + " total";
    $("chart").innerHTML = days.map((d, i) => `
      <div class="bar-col">
        <span class="bar-val">${totals[i] ? money(totals[i]) : ""}</span>
        <div class="bar${i === 6 ? " today" : ""}" style="height:${Math.max(3, (totals[i] / max) * 150)}px"></div>
        <span class="bar-day">${d.toLocaleDateString(undefined, { weekday: "short" })}</span>
      </div>`).join("");
  }

  function renderMix(list) {
    const counts = Object.fromEntries(Object.keys(CATS).map(c => [c, 0]));
    list.filter(o => !["Shipped", "Delivered", "Completed"].includes(o.status)).forEach(o => o.items.forEach(i => { const p = byId(i.id); if (p) counts[p.cat] += i.qty; }));
    const max = Math.max(...Object.values(counts), 1);
    $("mix").innerHTML = Object.keys(counts).map(c => `
      <div class="mix-row">
        <div class="mix-top"><span>${CATS[c]}</span><span>${counts[c]} piece${counts[c] === 1 ? "" : "s"}</span></div>
        <div class="track"><i style="width:${(counts[c] / max) * 100}%;background:${CAT_COLOR[c]}"></i></div>
      </div>`).join("");
  }

  function renderFilters(list) {
    $("statusFilters").innerHTML = ["All", ...STATUSES].map(s => {
      const n = s === "All" ? list.length : list.filter(o => o.status === s).length;
      return `<button class="chip${!showArchived && filter === s ? " active" : ""}" data-f="${s}">${s} (${n})</button>`;
    }).join("") + `<button class="chip${showArchived ? " active" : ""}" data-archived="true">Archived</button>`;
    $("statusFilters").querySelectorAll(".chip").forEach(b => b.addEventListener("click", () => {
      const nextArchived = b.dataset.archived === "true";
      if (nextArchived !== showArchived) {
        showArchived = nextArchived;
        filter = nextArchived ? "All" : b.dataset.f;
        load();
      } else {
        filter = showArchived ? "All" : b.dataset.f;
        renderAll();
      }
    }));
  }

  function renderOrders(list) {
    const q = query.trim().toLowerCase();
    const rows = list.filter(o => (filter === "All" || o.status === filter) &&
      (!q || o.id.toLowerCase().includes(q) || (o.customer || "guest").toLowerCase().includes(q) ||
        (o.email || "").toLowerCase().includes(q) || (o.phone || "").toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
    $("ordersEmpty").hidden = rows.length > 0;
    $("orderRows").innerHTML = rows.map(o => `
      <tr data-id="${esc(o.id)}">
        <td class="oid">${esc(o.id)}</td>
        <td>${esc(o.customer || "Guest")}</td>
        <td class="muted">${orderPieces(o)}</td>
        <td><strong>${money(orderTotal(o))}</strong></td>
        <td class="muted">${fmtDate(o.placedAt)}</td>
        <td><select class="status ${sKey(o.status)}" data-id="${esc(o.id)}" aria-label="Status for ${esc(o.id)}">
          ${STATUSES.map(s => `<option${s === o.status ? " selected" : ""}>${s}</option>`).join("")}</select></td>
      </tr>`).join("");
    $("orderRows").querySelectorAll("tr").forEach(tr => tr.addEventListener("click", e => { if (e.target.closest("select")) return; openDetail(tr.dataset.id); }));
    $("orderRows").querySelectorAll("select").forEach(sel => sel.addEventListener("change", () => setStatus(sel.dataset.id, sel.value)));
  }

  function renderRequests() {
    const open = REQUESTS.filter(r => r.state === "open").length;
    $("reqCount").textContent = open ? `${open} waiting` : "all caught up";
    $("reqList").innerHTML = REQUESTS.length ? REQUESTS.map(r => `
      <div class="req">
        <div class="req-top">${esc(r.name)}<span>${ago(r.createdAt)}</span></div>
        <p>${esc(r.text)}${r.needBy ? ` (needed by ${esc(r.needBy)})` : ""}</p>
        <div class="req-actions">${r.state === "open"
          ? `<button class="pill-btn yes" data-r="${r.id}" data-s="quoted">Send quote</button><button class="pill-btn no" data-r="${r.id}" data-s="declined">Decline</button>`
          : `<span class="req-done">${r.state === "quoted" ? "Quote sent" : "Declined"}</span>`}</div>
      </div>`).join("") : '<p class="muted">No requests yet.</p>';
    $("reqList").querySelectorAll("button").forEach(b => b.addEventListener("click", async () => {
      try {
        const upd = await Api.patch(`/requests/${b.dataset.r}`, { state: b.dataset.s });
        REQUESTS = REQUESTS.map(r => (r.id === upd.id ? upd : r)); renderRequests();
      } catch (e) { fail(e); }
    }));
  }

  /* ---------- Sales report ---------- */
  let REPORT = null, range = 30;
  const RANGES = [[7, "Last 7 days"], [30, "Last 30 days"], [90, "Last 90 days"], [365, "Last 12 months"]];
  const catName = c => CATS[c] || "Other";
  const bucketLabel = (key, group) => group === "month"
    ? new Date(key + "-01T00:00:00").toLocaleDateString(undefined, { month: "short", year: "2-digit" })
    : new Date(key + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });

  function renderRanges() {
    $("rangeFilters").innerHTML = RANGES.map(([d, l]) => `<button class="chip${range === d ? " active" : ""}" data-d="${d}">${l}</button>`).join("");
    $("rangeFilters").querySelectorAll(".chip").forEach(b => b.addEventListener("click", () => { range = Number(b.dataset.d); renderRanges(); loadReport(); }));
  }

  async function loadReport() {
    try { REPORT = await Api.get("/orders/report?days=" + range); } catch (e) { return fail(e); }
    renderReport();
  }

  function renderReport() {
    const r = REPORT; if (!r) return;
    const t = r.totals;
    $("reportKpis").innerHTML = [["Revenue", money(t.revenue)], ["Orders", t.orders], ["Pieces sold", t.pieces], ["Average order", money(t.avg)]]
      .map(([l, v]) => `<div class="rk"><span>${l}</span><strong>${v}</strong></div>`).join("");

    const max = Math.max(...r.series.map(s => s.revenue), 1), n = r.series.length, step = Math.ceil(n / 10);
    $("reportChart").innerHTML = r.series.map((s, i) => `
      <div class="bar-col" title="${bucketLabel(s.key, r.group)}: ${money(s.revenue)} · ${s.orders} order${s.orders === 1 ? "" : "s"}">
        <span class="bar-val">${n <= 8 && s.revenue ? money(s.revenue) : ""}</span>
        <div class="bar${i === n - 1 ? " today" : ""}" style="height:${Math.max(3, (s.revenue / max) * 140)}px"></div>
        <span class="bar-day">${i % step === 0 ? bucketLabel(s.key, r.group) : ""}</span>
      </div>`).join("");

    $("topRows").innerHTML = r.topItems.length ? r.topItems.map((i, k) => {
      const p = byId(i.id);
      return `<tr><td><strong>${k + 1}.</strong> ${esc(i.name)}${p ? `<br><small class="muted">${esc(catName(p.cat))}${p.sub ? " · " + esc(p.sub) : ""}</small>` : ""}</td><td class="muted">${i.qty}</td><td><strong>${money(i.revenue)}</strong></td></tr>`;
    }).join("") : '<tr><td colspan="3" class="muted">No sales in this period.</td></tr>';

    const maxC = Math.max(...r.byCategory.map(c => c.revenue), 1);
    $("catMix").innerHTML = r.byCategory.length ? r.byCategory.map(c => `
      <div class="mix-row">
        <div class="mix-top"><span>${esc(catName(c.cat))}</span><span>${money(c.revenue)} · ${c.pieces} piece${c.pieces === 1 ? "" : "s"}</span></div>
        <div class="track"><i style="width:${(c.revenue / maxC) * 100}%;background:${CAT_COLOR[c.cat] || "#9AB2C6"}"></i></div>
      </div>`).join("") : '<p class="muted">No sales in this period.</p>';
  }

  function downloadCsv(rows, name) {
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = name; a.click(); URL.revokeObjectURL(a.href);
  }

  function exportReport() {
    const r = REPORT; if (!r) return;
    const num = n => Number(n).toFixed(2);
    downloadCsv([
      ["Chuu Chuu Craft sales report", RANGES.find(x => x[0] === range)[1], "Generated " + new Date().toLocaleString()], [],
      ["Revenue", num(r.totals.revenue)], ["Orders", r.totals.orders], ["Pieces sold", r.totals.pieces], ["Average order", num(r.totals.avg)], [],
      [r.group === "month" ? "Month" : "Date", "Orders", "Revenue"], ...r.series.map(s => [s.key, s.orders, num(s.revenue)]), [],
      ["Best sellers", "Pieces sold", "Revenue"], ...r.topItems.map(i => [i.name, i.qty, num(i.revenue)]), [],
      ["Category", "Pieces sold", "Revenue"], ...r.byCategory.map(c => [catName(c.cat), c.pieces, num(c.revenue)])
    ], `chuu-chuu-craft-sales-${range}d.csv`);
  }

  /* ---------- Actions ---------- */
  async function setStatus(id, status) {
    try {
      const upd = await Api.patch(`/orders/${encodeURIComponent(id)}/status`, { status });
      ORDERS = ORDERS.map(o => (o.id === upd.id ? upd : o));
    } catch (e) { fail(e); }
    renderAll(); if ($("detail").classList.contains("open")) openDetail(id);
  }

  function openDetail(id) {
    const o = ORDERS.find(x => x.id === id); if (!o) return;
    const idx = STATUSES.indexOf(o.status);
    $("dTitle").textContent = o.id;
    $("dBody").innerHTML = `
      <dl class="d-meta">
        <dt>Customer</dt><dd>${esc(o.customer || "Guest")}</dd>
        <dt>Email</dt><dd>${esc(o.email || "—")}</dd>
        <dt>Phone</dt><dd>${esc(o.phone || "—")}</dd>
        <dt>Delivery address</dt><dd>${esc(o.deliveryAddress || "—")}</dd>
        <dt>Payment</dt><dd>${o.paymentMethod ? `${esc(o.paymentMethod === "gcash" ? "GCash" : "PayMaya")} · ${esc(o.paymentName || "")} ${esc(o.paymentNumber || "")}` : "—"}</dd>
        <dt>Payment status</dt><dd>${o.isPaid ? `Paid${o.paidAt ? ` · ${new Date(o.paidAt).toLocaleString()}` : ""}` : "Not paid"}</dd>
        <dt>Placed</dt><dd>${new Date(o.placedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</dd>
        <dt>Total</dt><dd>${money(o.total)}</dd>
      </dl>
      <div class="d-items">${o.items.map(i => { const p = byId(i.id); return `<div class="d-item">${p ? art(p) : ""}<b>${esc(i.name)}</b><span class="muted">× ${i.qty}</span><span>${money(i.price * i.qty)}</span></div>`; }).join("")}</div>
      ${o.note ? `<div class="d-note"><strong>Order note</strong>${esc(o.note)}</div>` : ""}
      <div class="steps">${STATUSES.map((s, i) => `<button class="step ${i < idx ? "done" : i === idx ? "now" : ""}" data-s="${s}">${s}</button>`).join("")}</div>`;
    $("dBody").querySelectorAll(".step").forEach(b => b.addEventListener("click", () => setStatus(o.id, b.dataset.s)));
    $("dBody").insertAdjacentHTML("beforeend", `<div class="edit-actions">${o.isPaid
      ? `<button class="btn btn-outline btn-small" id="sendReceiptBtn">${o.receiptSent ? "Resend receipt" : "Send receipt"}</button>`
      : `<button class="btn btn-primary btn-small" id="markPaidBtn">Mark as paid</button>`}
      <button class="btn btn-outline btn-small" id="editOrderBtn">Edit order</button><button class="btn btn-outline btn-small" id="archiveOrderBtn">${o.isArchived ? "Restore order" : "Archive order"}</button></div>`);
    $("editOrderBtn").addEventListener("click", () => openEditor(o));
    $("archiveOrderBtn").addEventListener("click", () => archiveOrder(o));
    if (o.isPaid) $("sendReceiptBtn").addEventListener("click", () => sendAdminReceipt(o));
    else $("markPaidBtn").addEventListener("click", () => markOrderPaid(o));
    $("detail").classList.add("open"); $("scrim").classList.add("open"); $("detail").setAttribute("aria-hidden", "false");
  }

  async function markOrderPaid(order) {
    const button = $("markPaidBtn");
    button.disabled = true;
    try {
      const updated = await Api.patch(`/orders/${encodeURIComponent(order.id)}/payment`, { isPaid: true });
      ORDERS = ORDERS.map(o => o.id === updated.id ? updated : o);
      renderAll();
      if (!updated.emailed) notify("Payment marked as paid, but the receipt email failed. Retry sending it from the order details.");
      openDetail(updated.id);
    } catch (e) { fail(e); }
    finally { if ($("markPaidBtn")) $("markPaidBtn").disabled = false; }
  }

  async function sendAdminReceipt(order) {
    const button = $("sendReceiptBtn");
    button.disabled = true;
    button.textContent = "Sending…";
    try {
      await Api.post(`/orders/admin/${encodeURIComponent(order.id)}/receipt`, {});
      const updated = ORDERS.find(o => o.id === order.id);
      if (updated) updated.receiptSent = true;
      renderAll();
      openDetail(order.id);
      notify("");
    } catch (e) { fail(e); }
    finally {
      const current = $("sendReceiptBtn");
      if (current) current.disabled = false;
    }
  }

  function productOptions(selected) {
    return PRODUCTS.map(p => `<option value="${esc(p.id)}"${p.id === selected ? " selected" : ""}>${esc(p.name)} · ${money(p.price || 0)}</option>`).join("");
  }

  function addEditItemRow(item = {}) {
    const row = document.createElement("div");
    row.className = "edit-item";
    row.innerHTML = `<label>Product<select data-product>${productOptions(item.id || PRODUCTS[0]?.id || "")}</select></label>
      <label>Qty<input data-qty type="number" min="1" max="99" value="${Number(item.qty) || 1}" required></label>
      <button type="button" aria-label="Remove item">×</button>`;
    row.querySelector("button").addEventListener("click", () => row.remove());
    $("editItems").appendChild(row);
  }

  function openEditor(order = null) {
    const isNew = !order;
    $("dTitle").textContent = isNew ? "Create order" : `Edit ${order.id}`;
    const methods = [["gcash", "GCash"], ["paymaya", "PayMaya"]]
      .filter(([key]) => PAYMENT_SETTINGS[key]?.enabled)
      .map(([key, label]) => `<option value="${key}"${order?.paymentMethod === key ? " selected" : ""}>${label}</option>`)
      .join("");
    const selectedMethod = order?.paymentMethod || "";
    $("dBody").innerHTML = `
      <form class="detail-form" id="orderEditForm">
        <label>Customer name<input name="customer" maxlength="80" required value="${esc(order?.customer || "")}"></label>
        <label>Email<input name="email" type="email" maxlength="254" required value="${esc(order?.email || "")}"></label>
        <label>Phone<input name="phone" type="tel" maxlength="25" pattern="(?=(?:\\D*\\d){7})[+()0-9 .-]{7,25}" required value="${esc(order?.phone || "")}"></label>
        <label>Delivery address<textarea name="deliveryAddress" minlength="5" maxlength="300" rows="3" required>${esc(order?.deliveryAddress || "")}</textarea></label>
        <label>Payment method<select name="paymentMethod"${isNew ? " required" : ""}>
          ${!isNew ? `<option value=""${selectedMethod ? "" : " selected"}>Not recorded</option>` : '<option value="">Choose payment method</option>'}${methods}
        </select></label>
        <label>Status<select name="status">${STATUSES.map(s => `<option${s === (order?.status || "Queued") ? " selected" : ""}>${s}</option>`).join("")}</select></label>
        <div><strong>Items</strong><div id="editItems"></div><button class="btn btn-outline btn-small" id="addEditItem" type="button">Add item</button></div>
        <label>Order note<textarea name="note" maxlength="300" rows="2">${esc(order?.note || "")}</textarea></label>
        <div class="edit-actions"><button class="btn btn-primary btn-small" type="submit">${isNew ? "Create order" : "Save changes"}</button><button class="btn btn-outline btn-small" id="cancelEdit" type="button">Cancel</button></div>
      </form>`;
    (order?.items || [{}]).forEach(addEditItemRow);
    $("addEditItem").addEventListener("click", () => addEditItemRow());
    $("cancelEdit").addEventListener("click", () => order ? openDetail(order.id) : closeDetail());
    $("orderEditForm").addEventListener("submit", async e => {
      e.preventDefault();
      const form = e.currentTarget;
      const payload = {
        customer: form.customer.value.trim(), email: form.email.value.trim(),
        phone: form.phone.value.trim(), deliveryAddress: form.deliveryAddress.value.trim(),
        paymentMethod: form.paymentMethod.value, status: form.status.value,
        note: form.note.value.trim(),
        items: [...$("editItems").querySelectorAll(".edit-item")].map(row => ({
          id: row.querySelector("[data-product]").value,
          qty: Number(row.querySelector("[data-qty]").value)
        }))
      };
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      try {
        const updated = isNew
          ? await Api.post("/orders/admin", payload)
          : await Api.patch(`/orders/${encodeURIComponent(order.id)}`, payload);
        if (isNew) {
          if (showArchived) { showArchived = false; filter = "All"; }
          closeDetail();
          await load();
        } else {
          ORDERS = ORDERS.map(o => o.id === updated.id ? updated : o);
          renderAll();
          openDetail(updated.id);
        }
      } catch (err) { fail(err); }
      finally { submit.disabled = false; }
    });
    $("detail").classList.add("open"); $("scrim").classList.add("open"); $("detail").setAttribute("aria-hidden", "false");
  }

  async function archiveOrder(order) {
    try {
      await Api.patch(`/orders/${encodeURIComponent(order.id)}/archive`, { archived: !order.isArchived });
      closeDetail();
      await load();
    } catch (e) { fail(e); }
  }

  function renderPaymentSettings() {
    $("paymentSettingsFields").innerHTML = [["gcash", "GCash"], ["paymaya", "PayMaya"]].map(([key, label]) => {
      const method = PAYMENT_SETTINGS[key] || {};
      return `<article class="payment-method-card" data-method="${key}">
        <h3>${label}</h3>
        <label>Account name<input data-name maxlength="80" value="${esc(method.name || "")}" autocomplete="off"></label>
        <label>Account number<input data-number maxlength="40" value="${esc(method.number || "")}" autocomplete="off"></label>
        <label>QR code image<input data-qr type="file" accept="image/png,image/jpeg,image/webp"></label>
        <label class="clear-qr"><input data-clear-qr type="checkbox"> Clear saved QR image</label>
        <img class="qr-preview"${method.qrData ? ` src="${method.qrData}"` : ""} alt="${label} QR code preview"${method.qrData ? "" : " hidden"}>
        <small class="muted">Use a PNG, JPEG, or WebP image (up to 1.25 MB). Leave all fields blank to disable.</small>
      </article>`;
    }).join("");
    $("paymentSettingsFields").querySelectorAll("[data-qr]").forEach(input => input.addEventListener("change", () => {
      const file = input.files[0];
      const preview = input.closest(".payment-method-card").querySelector(".qr-preview");
      if (!file) return;
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1.25 * 1024 * 1024) {
        notify("Choose a PNG, JPEG, or WebP QR image no larger than 1.25 MB.");
        input.value = "";
        return;
      }
      input.closest(".payment-method-card").querySelector("[data-clear-qr]").checked = false;
      preview.src = URL.createObjectURL(file);
      preview.hidden = false;
    }));
    $("paymentSettingsFields").querySelectorAll("[data-clear-qr]").forEach(input => input.addEventListener("change", () => {
      const card = input.closest(".payment-method-card");
      const preview = card.querySelector(".qr-preview");
      if (input.checked) preview.hidden = true;
      else if (!card.querySelector("[data-qr]").files[0] && PAYMENT_SETTINGS[card.dataset.method]?.qrData) {
        preview.src = PAYMENT_SETTINGS[card.dataset.method].qrData;
        preview.hidden = false;
      }
    }));
  }

  $("paymentSettingsForm").addEventListener("submit", async e => {
    e.preventDefault();
    const message = $("paymentSettingsMessage");
    const button = $("savePaymentSettings");
    const readFile = file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Could not read the selected QR image."));
      reader.readAsDataURL(file);
    });
    button.disabled = true;
    message.hidden = true;
    try {
      const methods = {};
      for (const key of ["gcash", "paymaya"]) {
        const card = $("paymentSettingsFields").querySelector(`[data-method="${key}"]`);
        const file = card.querySelector("[data-qr]").files[0];
        methods[key] = {
          name: card.querySelector("[data-name]").value.trim(),
          number: card.querySelector("[data-number]").value.trim(),
          qrData: file ? await readFile(file) : card.querySelector("[data-clear-qr]").checked ? "" : (PAYMENT_SETTINGS[key]?.qrData || "")
        };
      }
      PAYMENT_SETTINGS = await Api.put("/payment-methods", { methods });
      renderPaymentSettings();
      paymentSettingsLoaded = true;
      message.textContent = "Payment settings saved.";
      message.hidden = false;
      notify("");
    } catch (err) {
      message.textContent = err.message;
      message.hidden = false;
    } finally { button.disabled = false; }
  });
  function closeDetail() { $("detail").classList.remove("open"); $("scrim").classList.remove("open"); $("detail").setAttribute("aria-hidden", "true"); $("side").classList.remove("open"); }

  function exportCsv() {
    const rows = [["Order", "Customer", "Email", "Phone", "Delivery address", "Payment", "Payment account name", "Payment account number", "Payment status", "Paid at", "Pieces", "Total", "Placed", "Status", "Archived", "Note"]]
      .concat(ORDERS.map(o => [o.id, o.customer || "Guest", o.email || "", o.phone || "", o.deliveryAddress || "", o.paymentMethod || "", o.paymentName || "", o.paymentNumber || "", o.isPaid ? "Paid" : "Not paid", o.paidAt || "", orderPieces(o), o.total.toFixed(2), o.placedAt, o.status, o.isArchived ? "Yes" : "No", o.note || ""]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "chuu-chuu-craft-orders.csv"; a.click(); URL.revokeObjectURL(a.href);
  }

  function renderAll() { renderKpis(ORDERS); renderChart(ORDERS); renderMix(ORDERS); renderFilters(ORDERS); renderOrders(ORDERS); }

  /* ---------- Wiring ---------- */
  $("todayLabel").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  $("globalSearch").addEventListener("input", e => { query = e.target.value; renderOrders(ORDERS); });
  $("exportBtn").addEventListener("click", exportCsv);
  $("reportExport").addEventListener("click", exportReport);
  $("newOrderBtn").addEventListener("click", () => openEditor());
  renderRanges();
  $("logoutBtn").addEventListener("click", Auth.logout);
  $("dClose").addEventListener("click", closeDetail);
  $("scrim").addEventListener("click", closeDetail);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeDetail(); });
  $("menuBtn").addEventListener("click", () => { $("side").classList.toggle("open"); $("scrim").classList.toggle("open"); });
  document.querySelectorAll(".side-nav a").forEach(a => a.addEventListener("click", () => {
    document.querySelectorAll(".side-nav a").forEach(x => x.classList.toggle("active", x === a)); closeDetail();
  }));

  load();
  setInterval(load, 60000);
})();
