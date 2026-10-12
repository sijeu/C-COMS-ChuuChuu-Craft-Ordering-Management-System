(() => {
    "use strict";
  
    /* ---------- Data (see catalog.js) ---------- */
    const ICONS = {
      all: '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"/>',
      claycrafts: '<circle cx="12" cy="9" r="4"/><circle cx="8" cy="16" r="3.2"/><circle cx="16" cy="16" r="3.2"/>',
      crochet: '<circle cx="12" cy="13" r="6"/><path d="M12 7c-2 0-2 3 0 3s2 3 0 3M6 6l2 2M18 6l-2 2"/>',
      felt: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 11h18M9 7V5a3 3 0 0 1 6 0v2"/>',
      keychain: '<circle cx="12" cy="6" r="3"/><path d="M12 9v11M9 15h6"/>'
    };
    const CATEGORIES = [{ id: "all", label: "All Pieces", icon: ICONS.all }]
      .concat(window.CATEGORIES.map(c => ({ id: c.id, label: c.name, icon: ICONS[c.id] })));
    const PRODUCTS = window.CATALOG;
    const peso = window.peso;
    const imgHTML = window.imgHTML;
    const PH = window.IMG_PLACEHOLDER;

    /* ---------- State ---------- */
    let activeCategory = "all";
    let searchTerm = "";
    let cart = [];
  
    /* ---------- Persistence ---------- */
    // Only logged-in customers can have a cart
    function loadCart() {
      if (!Auth.current()) return [];
      try {
        const raw = localStorage.getItem("tt_cart");
        return raw ? JSON.parse(raw).filter(i => PRODUCTS.some(p => p.id === i.id && p.price != null)) : [];
      } catch (e) {
        return [];
      }
    }
    function saveCart() {
      try { localStorage.setItem("tt_cart", JSON.stringify(cart)); } catch (e) { /* storage unavailable */ }
    }

    /* ---------- Login gate ---------- */
    const loginScrim = document.getElementById("loginScrim");
    const isCustomer = () => { const u = Auth.current(); return !!u && u.role === "customer"; };
    function requireLogin(msg) {
      const u = Auth.current();
      if (u && u.role === "customer") return true;
      document.getElementById("loginPromptTitle").textContent = u ? "Use a customer account" : "Log in to start your order";
      document.getElementById("loginPromptMsg").textContent = msg || (u
        ? "Admin accounts can't place orders. Log in with a customer account."
        : "Create an account or log in to add pieces to your order.");
      loginScrim.classList.add("open");
      return false;
    }
    document.getElementById("loginPromptClose").addEventListener("click", () => loginScrim.classList.remove("open"));
    loginScrim.addEventListener("click", e => { if (e.target === loginScrim) loginScrim.classList.remove("open"); });
    cart = loadCart();

    /* ---------- Render: Categories ---------- */
    const categoryRow = document.getElementById("categoryRow");
    CATEGORIES.forEach(cat => {
      const btn = document.createElement("button");
      btn.className = "cat-chip" + (cat.id === activeCategory ? " active" : "");
      btn.dataset.cat = cat.id;
      btn.innerHTML = `<svg viewBox="0 0 24 24">${cat.icon}</svg><span>${cat.label}</span>`;
      btn.addEventListener("click", () => {
        activeCategory = cat.id;
        document.querySelectorAll(".cat-chip").forEach(c => c.classList.toggle("active", c.dataset.cat === cat.id));
        renderCatalog();
      });
      categoryRow.appendChild(btn);
    });
  
    /* ---------- Render: Catalog ---------- */
    const catalogGrid = document.getElementById("catalogGrid");
    const emptyState = document.getElementById("emptyState");
  
    function cardHTML(p, catName) {
      const priced = p.price != null;
      return `
        <div class="product-card">
          <div class="product-art">${imgHTML(p)}</div>
          <div class="product-name">${p.name}</div>
          <div class="product-cat">${catName}${p.sub ? " · " + p.sub : ""}</div>
          <div class="product-footer">
            <span class="product-price${priced ? "" : " price-na"}">${peso(p.price)}</span>
            <button class="add-btn" data-id="${p.id}" aria-label="Add ${p.name} to order"${priced ? "" : " disabled"}>
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>
        </div>`;
    }

    function renderCatalog() {
      const term = searchTerm.toLowerCase();
      const html = [];
      window.CATEGORIES.forEach(cat => {
        if (activeCategory !== "all" && activeCategory !== cat.id) return;
        const inCat = PRODUCTS.filter(p => p.cat === cat.id && (p.name + " " + (p.sub || "")).toLowerCase().includes(term));
        if (!inCat.length) return;
        html.push(`<h3 class="group-head">${cat.name}</h3>`);
        inCat.filter(p => !p.sub).forEach(p => html.push(cardHTML(p, cat.name)));
        cat.variations.forEach(v => {
          const items = inCat.filter(p => p.sub === v);
          if (!items.length) return;
          html.push(`<h4 class="sub-head">${v}</h4>`);
          items.forEach(p => html.push(cardHTML(p, cat.name)));
        });
      });

      catalogGrid.innerHTML = html.join("");
      emptyState.hidden = html.length !== 0;
      catalogGrid.querySelectorAll(".add-btn").forEach(btn => {
        btn.addEventListener("click", () => addToCart(btn.dataset.id));
      });
    }
    renderCatalog();
  
    document.getElementById("clearFilters").addEventListener("click", () => {
      activeCategory = "all";
      searchTerm = "";
      document.getElementById("searchInput").value = "";
      document.querySelectorAll(".cat-chip").forEach(c => c.classList.toggle("active", c.dataset.cat === "all"));
      renderCatalog();
    });
  
    /* ---------- Search ---------- */
    const searchToggle = document.getElementById("searchToggle");
    const searchBar = document.getElementById("searchBar");
    const searchInput = document.getElementById("searchInput");
  
    searchToggle.addEventListener("click", () => {
      searchBar.classList.toggle("open");
      if (searchBar.classList.contains("open")) searchInput.focus();
    });
    searchInput.addEventListener("input", e => {
      searchTerm = e.target.value;
      renderCatalog();
    });
  
    /* ---------- Cart ---------- */
    const cartToggle = document.getElementById("cartToggle");
    const cartClose = document.getElementById("cartClose");
    const cartDrawer = document.getElementById("cartDrawer");
    const drawerScrim = document.getElementById("drawerScrim");
    const cartCount = document.getElementById("cartCount");
    const cartItemsEl = document.getElementById("cartItems");
    const cartEmptyMsg = document.getElementById("cartEmptyMsg");
    const cartSubtotal = document.getElementById("cartSubtotal");
  
    function openCart() {
      if (!requireLogin("Log in or create an account to view and manage your order.")) return;
      cartDrawer.classList.add("open");
      drawerScrim.classList.add("open");
      cartDrawer.setAttribute("aria-hidden", "false");
    }
    function closeCart() {
      cartDrawer.classList.remove("open");
      drawerScrim.classList.remove("open");
      cartDrawer.setAttribute("aria-hidden", "true");
    }
    cartToggle.addEventListener("click", openCart);
    cartClose.addEventListener("click", closeCart);
    drawerScrim.addEventListener("click", closeCart);
    document.getElementById("startOrderNav").addEventListener("click", () => document.getElementById("shop").scrollIntoView({ behavior: "smooth" }));
  
    function addToCart(id) {
      if (!requireLogin()) return;
      const existing = cart.find(item => item.id === id);
      if (existing) existing.qty += 1;
      else cart.push({ id, qty: 1 });
      saveCart();
      renderCart();
      openCart();
    }
  
    function changeQty(id, delta) {
      const item = cart.find(i => i.id === id);
      if (!item) return;
      item.qty += delta;
      if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
      saveCart();
      renderCart();
    }
  
    function removeItem(id) {
      cart = cart.filter(i => i.id !== id);
      saveCart();
      renderCart();
    }
  
    function renderCart() {
      const totalQty = cart.reduce((sum, i) => sum + i.qty, 0);
      cartCount.textContent = totalQty;
      cartEmptyMsg.style.display = cart.length === 0 ? "block" : "none";
      document.getElementById("placeOrderBtn").disabled = cart.length === 0;
      cartItemsEl.innerHTML = "";
  
      let subtotal = 0;
      cart.forEach(item => {
        const product = PRODUCTS.find(p => p.id === item.id);
        if (!product || product.price == null) return;
        subtotal += product.price * item.qty;
  
        const row = document.createElement("div");
        row.className = "cart-row";
        row.innerHTML = `
          <div class="cart-row-art">${imgHTML(product, true)}</div>
          <div class="cart-row-body">
            <strong>${product.name}</strong>
            <span>${peso(product.price)}</span>
            <div class="cart-row-meta">
              <div class="qty-control">
                <button data-action="dec" data-id="${item.id}" aria-label="Decrease quantity">–</button>
                <span>${item.qty}</span>
                <button data-action="inc" data-id="${item.id}" aria-label="Increase quantity">+</button>
              </div>
              <button class="remove-btn" data-action="remove" data-id="${item.id}">Remove</button>
            </div>
          </div>`;
        cartItemsEl.appendChild(row);
      });
  
      cartSubtotal.textContent = peso(subtotal);
  
      cartItemsEl.querySelectorAll("[data-action]").forEach(btn => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.id;
          if (btn.dataset.action === "inc") changeQty(id, 1);
          else if (btn.dataset.action === "dec") changeQty(id, -1);
          else removeItem(id);
        });
      });
    }
    renderCart();
  
    /* ---------- Place Order ---------- */
    const confirmScrim = document.getElementById("confirmScrim");
    const orderIdDisplay = document.getElementById("orderIdDisplay");
    const checkoutPayment = document.getElementById("checkoutPayment");
    const paymentPreview = document.getElementById("paymentPreview");
    let PAYMENT_METHODS = {};

    function renderPaymentPreview() {
      const method = PAYMENT_METHODS[checkoutPayment.value];
      paymentPreview.hidden = !method;
      paymentPreview.replaceChildren();
      if (!method) return;
      const image = document.createElement("img");
      image.src = method.qrData;
      image.alt = `${checkoutPayment.value === "gcash" ? "GCash" : "PayMaya"} payment QR code`;
      const details = document.createElement("div");
      const label = document.createElement("strong");
      label.textContent = checkoutPayment.value === "gcash" ? "GCash" : "PayMaya";
      details.append(label, document.createElement("br"), document.createTextNode(method.name),
        document.createElement("br"), document.createTextNode(method.number),
        document.createElement("br"), document.createTextNode("Scan the QR code or use these account details to pay."));
      paymentPreview.append(image, details);
    }
    checkoutPayment.addEventListener("change", renderPaymentPreview);
    Api.get("/payment-methods").then(methods => {
      PAYMENT_METHODS = methods;
      checkoutPayment.innerHTML = '<option value="">Choose a payment method</option>' +
        [["gcash", "GCash"], ["paymaya", "PayMaya"]]
          .filter(([key]) => methods[key]?.enabled)
          .map(([key, label]) => `<option value="${key}">${label}</option>`).join("");
      if (!checkoutPayment.options.length || checkoutPayment.options.length === 1) {
        checkoutPayment.disabled = true;
        checkoutPayment.innerHTML = '<option value="">No payment methods are available yet</option>';
      }
      renderPaymentPreview();
    }).catch(err => {
      checkoutPayment.disabled = true;
      checkoutPayment.innerHTML = '<option value="">Payment methods could not be loaded</option>';
      alert(err.message);
    });

    document.getElementById("checkoutForm").addEventListener("submit", async e => {
      e.preventDefault();
      if (cart.length === 0) return;
      if (!requireLogin()) return;
      const btn = document.getElementById("placeOrderBtn");
      btn.disabled = true;
      try {
        const note = document.getElementById("cartNote").value.trim();
        const phone = document.getElementById("checkoutPhone").value.trim();
        const deliveryAddress = document.getElementById("checkoutAddress").value.trim();
        const paymentMethod = checkoutPayment.value;
        const order = await Api.post("/orders", { items: cart.map(i => ({ id: i.id, qty: i.qty })), note, phone, deliveryAddress, paymentMethod });
        cart = [];
        saveCart();
        renderCart();
        e.target.reset();
        closeCart();
        orderIdDisplay.textContent = order.id;
        document.getElementById("confirmSub").textContent = `Order received. Please send your payment using the selected ${paymentMethod === "gcash" ? "GCash" : "PayMaya"} details. Your receipt will be emailed after the admin confirms your payment.`;
        confirmScrim.classList.add("open");
      } catch (err) {
        if (err.status === 401) { Auth.logout(); return; }
        alert(err.message);
      } finally {
        btn.disabled = false;
      }
    });

    document.getElementById("confirmClose").addEventListener("click", () => {
      confirmScrim.classList.remove("open");
    });
  
    /* ---------- Track Order ---------- */
    document.getElementById("trackForm").addEventListener("submit", async e => {
      e.preventDefault();
      const input = document.getElementById("trackInput").value.trim().toUpperCase();
      const result = document.getElementById("trackResult");
      result.hidden = false;
      result.textContent = "Checking…";
      try {
        const o = await Api.get("/orders/track/" + encodeURIComponent(input));
        result.textContent = `${o.id} — ${o.status} · ${o.count} item${o.count > 1 ? "s" : ""}`;
      } catch (err) {
        result.textContent = err.status === 404
          ? `No order found with number "${input}". Double-check the code from your confirmation.`
          : err.message;
      }
    });

    /* ---------- Custom Order Form ---------- */
    document.getElementById("customForm").addEventListener("submit", async e => {
      e.preventDefault();
      const form = e.target;
      const note = document.getElementById("customNote");
      note.hidden = false;
      if (!Auth.current()) { note.textContent = "Please log in or create an account first so we can send you the quote."; return; }
      try {
        const details = form.details.value.trim();
        await Api.post("/requests", { text: details, needBy: form.needBy.value });
        note.textContent = "Request received — we'll reply by email with a quote and queue date.";
        form.reset();
      } catch (err) { note.textContent = err.message; }
    });

    /* ---------- Newsletter ---------- */
    document.getElementById("newsletterForm").addEventListener("submit", e => {
      e.preventDefault();
      const input = e.target.querySelector("input");
      input.value = "";
      input.placeholder = "You're on the list!";
    });
  
    /* ---------- Account link ---------- */
    const me = Auth.current();
    if (me) {
      const a = document.getElementById("accountLink");
      a.href = Auth.home(me.role); a.textContent = "My Account";
      const nameInput = document.querySelector("#customForm [name=name]");
      if (nameInput && !nameInput.value) nameInput.value = me.name;
    }

    /* ---------- Scroll buttons ---------- */
    document.querySelectorAll("[data-scroll]").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelector(btn.dataset.scroll).scrollIntoView({ behavior: "smooth" });
      });
    });
  })();