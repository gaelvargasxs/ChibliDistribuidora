let orderSaveInProgress = false;
// Estado global asegurado
if (typeof window.cart === "undefined") window.cart = {};
if (typeof window.descuentos === "undefined") window.descuentos = {};
if (typeof window.orders === "undefined") window.orders = [];

function changeQty(productKey, delta) {
  if (orderSaveInProgress) return;
  const isCaja   = productKey.endsWith("_caja");
  const productId = isCaja ? productKey.replace("_caja", "") : productKey;
  const prodsList = (window.products && window.products.length) ? window.products : (typeof products !== "undefined" ? products : []);
  const product  = prodsList.find(p => p.id === productId);
  if (!product) return;

  const cajaPiezas = parseInt(product.piezas) || 0;
  const unitsPerStep = isCaja ? cajaPiezas : 1;

  // Calcular unidades totales ya en carrito
  const piezasEnCarrito = (cart[productId] || 0);
  const cajasEnCarrito  = (cart[productId + "_caja"] || 0);
  const totalUnidades   = piezasEnCarrito + (cajasEnCarrito * cajaPiezas);

  const current = isCaja ? cajasEnCarrito : piezasEnCarrito;
  const next    = Math.max(0, current + delta);

  // Verificar stock
  const newTotal = totalUnidades + (delta * unitsPerStep);
  if (delta > 0 && newTotal > (Number(product.stock) || 0)) { toast("Sin stock suficiente"); return; }

  if (next === 0) delete cart[productKey]; else cart[productKey] = next;

  // Actualizar display numérico y clases activas
  const qtyEl  = document.getElementById(`qty-${productKey}`);
  const cardEl = document.getElementById(`pcard-${productId}`);
  if (qtyEl) qtyEl.textContent = next;
  if (cardEl) {
    const anyLeft = (cart[productId] || 0) > 0 || (cart[productId + "_caja"] || 0) > 0;
    cardEl.classList.toggle("in-cart", anyLeft);
    const cajaBox = cardEl.querySelector(".caja-stepper");
    const piezaBox = cardEl.querySelector(".pieza-stepper");
    if (cajaBox) cajaBox.classList.toggle("active", (cart[productId + "_caja"] || 0) > 0);
    if (piezaBox) piezaBox.classList.toggle("active", (cart[productId] || 0) > 0);
  }
  updateCartUI();
}

function updateCartUI() {
  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0);
  const totalAmt   = calcTotal();
  const selectedKeys = Object.keys(cart).filter(k => cart[k] > 0);
  const prodCount = new Set(selectedKeys.map(k => k.endsWith("_caja") ? k.slice(0, -5) : k)).size;
  const boxes = selectedKeys.filter(k => k.endsWith("_caja")).reduce((n, k) => n + cart[k], 0);
  const pieces = selectedKeys.filter(k => !k.endsWith("_caja")).reduce((n, k) => n + cart[k], 0);

  // Barra flotante estilo Stitch
  const fab = document.getElementById("cart-fab");
  const inPedido = document.getElementById("view-pedido")?.classList.contains("active");
  if (fab) {
    if (totalItems > 0 && !inPedido) {
      fab.style.setProperty("display", "flex", "important");
      fab.classList.add("visible");
      const countEl = document.getElementById("cart-fab-count");
      if (countEl) countEl.textContent = prodCount;
      const prodsLabel = document.getElementById("cart-fab-prods-label");
      const totalLabel = document.getElementById("cart-fab-total-label");
      if (prodsLabel) prodsLabel.textContent = [boxes ? `${boxes} caja${boxes === 1 ? "" : "s"}` : "", pieces ? `${pieces} pieza${pieces === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · ");
      if (totalLabel) totalLabel.textContent = `$${totalAmt.toLocaleString("es-MX", {minimumFractionDigits: 2, maximumFractionDigits: 2})} MXN`;
    } else {
      fab.style.setProperty("display", "none", "important");
      fab.classList.remove("visible");
    }
  }

  // Header badge & button
  const hTotal = document.getElementById("header-cart-total");
  if (hTotal) hTotal.textContent = `Carrito: $${totalAmt.toLocaleString("es-MX", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  const hCounter = document.getElementById("header-cart-counter");
  if (hCounter) hCounter.textContent = totalItems;
  const hBtn = document.getElementById("header-cart-btn");
  if (hBtn) {
    hBtn.style.display = document.body.classList.contains("role-vendedor") ? "inline-flex" : "none";
    if (totalItems > 0) {
      hBtn.classList.add("has-items");
    } else {
      hBtn.classList.remove("has-items");
    }
  }

  // Actualizar count en catálogo
  const selCountEl = document.getElementById("catalogo-sel-count");
  if (selCountEl) selCountEl.textContent = prodCount > 0 ? `${prodCount} SELECCIONADOS` : "";

  renderCart();
  if (typeof syncCatalogControls === "function") syncCatalogControls();
}

window.updateCartPillBar = updateCartUI;

function calcTotal() {
  const _desc = typeof descuentos !== "undefined" ? descuentos : (window.descuentos || {});
  const _cart = typeof cart !== "undefined" ? cart : (window.cart || {});
  return Object.entries(_cart).reduce((sum, [key, qty]) => {
    const isCaja    = key.endsWith("_caja");
    const productId = isCaja ? key.replace("_caja", "") : key;
    const prodsList = (window.products && window.products.length) ? window.products : (typeof products !== "undefined" ? products : []);
    const p = prodsList.find(pr => pr.id === productId);
    if (!p) return sum;
    const cajaPiezas = parseInt(p.piezas) || 12;
    const unitQty = qty * (isCaja ? cajaPiezas : 1);
    const descPct = _desc[productId] || 0;
    const precioFinal = p.price * (1 - descPct / 100);
    return sum + precioFinal * unitQty;
  }, 0);
}

function setDescuento(productId, val) {
  if (orderSaveInProgress) return;
  const pct = Math.max(0, Math.min(100, parseFloat(val) || 0));
  if (pct === 0) {
    delete descuentos[productId];
  } else {
    descuentos[productId] = pct;
  }
  renderCart();
  updateCartUI();
}

function renderCart() {
  const linesEl    = document.getElementById("cart-lines");
  const totalEl    = document.getElementById("cart-grand-total");
  const emptyEl    = document.getElementById("cart-empty");
  const summaryCard= document.getElementById("cart-summary-card");
  const confirmBtn = document.getElementById("confirm-order-btn");
  const assignCard = document.getElementById("checkout-assign-card");
  const newBtnRow  = document.querySelector(".checkout-confirm-row");

  const entries = Object.entries(cart);

  if (!entries.length) {
    summaryCard.style.display = "none";
    if (assignCard) assignCard.style.display = "none";
    if (newBtnRow) newBtnRow.style.display = "none";
    confirmBtn.style.display  = "none";
    document.getElementById("btn-clear-cart") && (document.getElementById("btn-clear-cart").style.display = "none");
    emptyEl.style.display = "block";
    return;
  }

  summaryCard.style.display = "";
  if (assignCard) assignCard.style.display = "";
  if (newBtnRow) newBtnRow.style.display = "flex";
  confirmBtn.style.display  = "";
  emptyEl.style.display     = "none";

  const vendNameEl = document.getElementById("pedido-vendor-name");
  if (vendNameEl) vendNameEl.textContent = currentSession?.vendedorNombre || (currentSession?.role === "admin" ? "Administrador" : "—");

  let subtotalBruto = 0;

  const expandedDiscounts = new Set(Array.from(linesEl.querySelectorAll("details[open]")).map(el => el.dataset.productId));
  const prodsList = (window.products && window.products.length) ? window.products : products;
  const ids = [...new Set(entries.filter(([, qty]) => qty > 0).map(([key]) => key.endsWith("_caja") ? key.slice(0, -5) : key))];
  const money = value => Number(value).toLocaleString("es-MX", {minimumFractionDigits:2, maximumFractionDigits:2});
  linesEl.innerHTML = ids.map(id => {
    const p = prodsList.find(product => product.id === id);
    if (!p) return "";
    const pack = parseInt(p.piezas) || 1;
    const boxes = cart[id + "_caja"] || 0;
    const pieces = cart[id] || 0;
    const units = boxes * pack + pieces;
    const price = Number(p.price) || 0;
    const pct = descuentos[id] || 0;
    subtotalBruto += price * units;
    const amount = price * units * (1 - pct / 100);
    const image = typeof p.image === "string" && /^(https?:\/\/|data:image\/)/i.test(p.image) ? p.image : "";
    const control = (key, label, qty, step) => `<div class="order-quantity"><span>${label}</span><div class="order-stepper">
      <button type="button" data-order-key="${esc(key)}" data-delta="-1" aria-label="Quitar ${label.toLowerCase()} de ${esc(p.name)}" ${qty <= 0 ? "disabled" : ""}>−</button>
      <span>${qty}</span>
      <button type="button" data-order-key="${esc(key)}" data-delta="1" aria-label="Agregar ${label.toLowerCase()} de ${esc(p.name)}" ${units + step > (Number(p.stock) || 0) ? "disabled" : ""}>+</button>
    </div></div>`;
    return `<article class="order-product">
      <div class="order-product-top">
        <div class="order-photo"><span aria-hidden="true">${esc(p.emoji || "📦")}</span>${image ? `<img src="${esc(image)}" alt="${esc(p.name)}" loading="lazy">` : ""}</div>
        <div class="order-product-info"><h3>${esc(p.name)}</h3>
          <p>${[p.unit ? esc(p.unit) : "", parseInt(p.piezas) > 0 ? `${pack} piezas/caja` : ""].filter(Boolean).join(" · ")}</p>
          <span class="order-unit-price">$${money(price)} por pieza</span>
        </div>
        <button type="button" class="order-remove" data-remove-product="${esc(id)}" aria-label="Quitar ${esc(p.name)} del pedido"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button>
      </div>
      <div class="order-quantities">${parseInt(p.piezas) > 0 || boxes > 0 ? control(id + "_caja", "Cajas", boxes, pack) : ""}${control(id, "Piezas", pieces, 1)}</div>
      <div class="order-line-total"><span>Importe${pct > 0 ? ` <small>−${pct}%</small>` : ""}</span><strong>$${money(amount)}</strong></div>
      <details class="order-discount" data-product-id="${esc(id)}" ${expandedDiscounts.has(id) ? "open" : ""}>
        <summary>Descuento del producto${pct > 0 ? ` · ${pct}%` : ""}</summary>
        <label>Porcentaje <input type="number" data-discount-product="${esc(id)}" value="${pct}" min="0" max="100" step="1" inputmode="decimal" aria-label="Descuento porcentual de ${esc(p.name)}"><span>%</span></label>
      </details>
    </article>`;
  }).join("");
  linesEl.onclick = event => {
    const button = event.target.closest?.("button");
    if (!button || button.disabled || !linesEl.contains(button)) return;
    if (button.dataset.orderKey) changeQtyInCart(button.dataset.orderKey, Number(button.dataset.delta));
    else if (button.dataset.removeProduct) {
      const id = button.dataset.removeProduct;
      delete cart[id]; delete cart[id + "_caja"];
      updateCartUI();
      if (typeof renderProducts === "function") renderProducts();
    }
  };
  linesEl.onchange = event => {
    const input = event.target.closest?.("input[data-discount-product]");
    if (input && linesEl.contains(input)) setDescuento(input.dataset.discountProduct, input.value);
  };
  linesEl.querySelectorAll(".order-photo img").forEach(img => img.addEventListener("error", () => img.remove(), {once:true}));
  const countLabel = document.getElementById("order-product-count");
  if (countLabel) countLabel.textContent = `${ids.length} producto${ids.length === 1 ? "" : "s"}`;
  const clearButton = document.getElementById("btn-clear-cart");
  if (clearButton) clearButton.style.display = "";

  const total = calcTotal();
  const totalDescuento = subtotalBruto - total;

  document.getElementById("cart-subtotal-bruto").textContent = `$${subtotalBruto.toLocaleString("es-MX", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  const descRow = document.getElementById("cart-descuento-row");
  if (totalDescuento > 0.005) {
    descRow.style.display = "flex";
    document.getElementById("cart-descuento-total").textContent = `−$${totalDescuento.toLocaleString("es-MX", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  } else {
    descRow.style.display = "none";
  }
  totalEl.textContent = `$${total.toLocaleString("es-MX", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

  renderCheckoutStorePicker();
}

// ── Cambiar cantidad directo desde la tarjeta del carrito ────────
function changeQtyInCart(productKey, delta) {
  changeQty(productKey, delta);
  renderCart();
}

// ── Aplicar el mismo % de descuento a todas las líneas del carrito ──
function applyGlobalDiscount() {
  if (orderSaveInProgress) return;
  const val = document.getElementById("global-discount-input").value;
  const pct = Math.max(0, Math.min(100, parseFloat(val) || 0));
  Object.keys(cart).forEach(key => {
    const productId = key.endsWith("_caja") ? key.replace("_caja", "") : key;
    setDescuento(productId, pct);
  });
  toast(pct > 0 ? `${pct}% aplicado a todo el pedido` : "Descuento quitado de todo el pedido");
}

// ── PASO 2: Asignar tienda de entrega dentro del carrito ─────────
function renderCheckoutStorePicker(filter = document.getElementById("checkout-store-search")?.value || "") {
  const listEl = document.getElementById("checkout-store-list");
  if (!listEl) return;

  const prodCount = Object.keys(cart).filter(k => cart[k] > 0).length;
  const total = calcTotal();
  const labelEl  = document.getElementById("checkout-total-label");
  const amountEl = document.getElementById("checkout-total-amount");
  if (labelEl)  labelEl.textContent  = `Total (${prodCount} prod${prodCount!==1?"s":""})`;
  if (amountEl) amountEl.textContent = `$${total.toLocaleString("es-MX", {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

  const f = filter.toLowerCase();
  const filtered = customers.filter(c =>
    (c.storeName || "").toLowerCase().includes(f) ||
    (c.ownerName||"").toLowerCase().includes(f) ||
    (c.zone||"").toLowerCase().includes(f)
  );

  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty-state" style="padding:1.2rem 0;">
      <p>${f ? "No se encontraron tiendas con esa búsqueda." : "No hay tiendas registradas. Usa Registrar tienda para agregar una."}</p></div>`;
    return;
  }

  listEl.innerHTML = filtered.map(c => `
    <button type="button" class="store-card-v2 ${c.id === activeCustomerId ? "selected" : ""}" data-checkout-store="${esc(c.id)}" aria-pressed="${c.id === activeCustomerId}">
      <div class="store-card-v2-top">
        <div class="customer-avatar">${esc((c.storeName || "T").charAt(0).toUpperCase())}</div>
        <div style="flex:1;min-width:0;">
          <div class="store-card-v2-name">${esc(c.storeName)}</div>
          <div class="store-card-v2-meta">${esc(c.ownerName||"")}${c.zone ? " · Zona: " + esc(c.zone) : ""}${c.address ? " · " + esc(c.address) : ""}</div>
        </div>
        <div class="customer-check">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      </div>
    </button>`).join("");
  listEl.onclick = event => {
    const button = event.target.closest?.("button[data-checkout-store]");
    if (button && listEl.contains(button)) selectCheckoutCustomer(button.dataset.checkoutStore);
  };
}

function selectCheckoutCustomer(id) {
  if (orderSaveInProgress) return;
  activeCustomerId   = id;
  activeCustomerData = customers.find(c => c.id === id);
  if (!activeCustomerData) return;
  const nameEl = document.getElementById("active-client-name");
  if (nameEl) nameEl.textContent = activeCustomerData.storeName;
  renderCheckoutStorePicker();
  toast(`Pedido asignado a ${activeCustomerData.storeName}`);
}

function openQuickAddStore() {
  if (orderSaveInProgress) return;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay open";
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-title">Nueva tienda</div>
      <div class="form-grid">
        <div>
          <label>Nombre de la tienda *</label>
          <input type="text" id="qas-store-name" placeholder="Ej. Abarrotes La Fe" />
        </div>
        <div>
          <label>Nombre del dueño *</label>
          <input type="text" id="qas-owner-name" placeholder="Ej. Don Memo" />
        </div>
        <div class="form-row-2">
          <div>
            <label>Teléfono</label>
            <input type="tel" id="qas-phone" placeholder="618..." />
          </div>
          <div>
            <label>Colonia / Zona</label>
            <input type="text" id="qas-zone" placeholder="Centro" />
          </div>
        </div>
        <div>
          <label>Dirección</label>
          <input type="text" id="qas-address" placeholder="Calle, número, colonia" />
        </div>
      </div>
      <button class="btn btn-primary" style="margin-top:1rem;" onclick="submitQuickAddStore(this)">
        Registrar y asignar pedido
      </button>
      <button class="btn btn-secondary" style="margin-top:.5rem;" onclick="this.closest('.modal-overlay').remove()">
        Cancelar
      </button>
    </div>`;
  document.body.appendChild(overlay);
}

async function submitQuickAddStore(btn) {
  const storeName = document.getElementById("qas-store-name").value.trim();
  const ownerName = document.getElementById("qas-owner-name").value.trim();
  const phone     = document.getElementById("qas-phone").value.trim();
  const zone      = (document.getElementById("qas-zone")?.value || "").trim();
  const address   = document.getElementById("qas-address").value.trim();

  if (!storeName || !ownerName) { toast("Nombre de tienda y dueño son requeridos"); return; }

  const localCustId = "c-" + Date.now();
  const newCust = { id: localCustId, storeName, ownerName, phone, zone, address };
  customers.push(newCust);

  try {
    if (window._db && window._firebaseReady) {
      const { collection, addDoc, serverTimestamp } = window._fsLib;
      const dataToSave = { storeName, ownerName, phone, zone, address, createdAt: serverTimestamp() };
      const ref = await addDoc(collection(window._db, "customers"), dataToSave);
      const idx = customers.findIndex(c => c.id === localCustId);
      if (idx >= 0) customers[idx].id = ref.id;
    }
  } catch(e) { console.warn("submitQuickAddStore Firebase error:", e); }

  // Asignar automáticamente la tienda recién creada al pedido actual
  selectCheckoutCustomer(customers.find(c => c.storeName === storeName)?.id || localCustId);
  btn.closest(".modal-overlay").remove();
  toast("Tienda registrada y asignada al pedido");
}

function clearCart() {
  if (orderSaveInProgress) return;
  cart = {}; window.cart = cart;
  descuentos = {}; window.descuentos = descuentos;
  renderProducts(document.getElementById("product-search").value);
  updateCartUI();
  toast("Carrito limpiado");
}

function getHoyStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

// ════════════════════════════════════════════════════════════════
// CONFIRMAR PEDIDO
// ── Aquí se registra el pedido Y se descuenta el stock.
// ════════════════════════════════════════════════════════════════
function showOrderSaveError(message) {
  const el = document.getElementById("order-save-error");
  if (el) { el.textContent = message; el.hidden = !message; }
  if (message) toast(message, 7000);
}

async function confirmOrder() {
  if (orderSaveInProgress) return;
  if (!activeCustomerId || !activeCustomerData) { showOrderSaveError("Selecciona una tienda para el pedido."); return; }
  if (!Object.keys(cart).length) { updateCartUI(); showOrderSaveError("El carrito está vacío."); return; }
  if (!window._firebaseReady || !window._db || !window._fsLib) {
    showOrderSaveError("No hay conexión con Firebase. Conservamos tu pedido; revisa la conexión e intenta de nuevo."); return;
  }
  const button = document.getElementById("confirm-order-btn");
  const previousLabel = button?.innerHTML;
  orderSaveInProgress = true;
  showOrderSaveError("");
  if (button) { button.disabled = true; button.textContent = "Guardando pedido…"; }
  try {
  const lines = Object.entries(cart).map(([key, qty]) => {
    const isCaja    = key.endsWith("_caja");
    const productId = isCaja ? key.replace("_caja", "") : key;
    const prodsList = (window.products && window.products.length) ? window.products : (typeof products !== "undefined" ? products : []);
    const p = prodsList.find(pr => pr.id === productId);
    if (!p) throw new Error("Uno de los productos ya no está disponible. Revisa el catálogo.");
    if (!Number.isInteger(qty) || qty <= 0) throw new Error("Revisa las cantidades del pedido.");
    const cajaPiezas = parseInt(p.piezas) || 1;
    const unitQty    = isCaja ? cajaPiezas * qty : qty;
    const descPct    = descuentos[productId] || 0;
    const precioFinal = p.price * (1 - descPct / 100);
    return {
      productId,
      name:     p.name + (isCaja ? ` (${qty} caja${qty>1?"s":""})` : ""),
      emoji:    p.emoji || "",
      qty:      unitQty,
      cajas:    isCaja ? qty : 0,
      price:    precioFinal,
      priceLista: p.price,
      descuentoPct: descPct,
      subtotal: precioFinal * unitQty
    };
  });
  const total = lines.reduce((s,l) => s+l.subtotal, 0);
  const totalDescuento = lines.reduce((s,l) => s + ((l.priceLista - l.price) * l.qty), 0);

  const orderData = {
    customerId:   activeCustomerId,
    customerName: activeCustomerData.storeName,
    ownerName:    activeCustomerData.ownerName,
    phone:        activeCustomerData.phone || "",
    address:      activeCustomerData.address || "",
    lines, total,
    totalDescuento: totalDescuento > 0 ? totalDescuento : 0,
    // El pedido se registra ya entregado y cobrado: el vendedor lleva
    // el producto y cobra en el momento, no hay ruta ni confirmación
    // posterior de entrega.
    status:"Entregado",
    // Datos del vendedor
    vendedorId:    currentSession?.vendedorId    || null,
    vendedorFolio: currentSession?.vendedorFolio || null,
    vendedorNombre:currentSession?.vendedorNombre|| null,
    createdAt: { toDate: () => new Date() }
  };


    const db = window._db;
    const orderRef = db.collection("orders").doc();
    const quantities = new Map();
    lines.forEach(line => quantities.set(line.productId, (quantities.get(line.productId) || 0) + line.qty));
    const productRefs = [...quantities.keys()].map(id => db.collection("products").doc(id));
    // Todas las lecturas preceden a las escrituras. Pedido y stock se guardan juntos.
    await db.runTransaction(async transaction => {
      const snapshots = await Promise.all(productRefs.map(ref => transaction.get(ref)));
      snapshots.forEach((snapshot, index) => {
        const id = productRefs[index].id;
        if (!snapshot.exists) throw new Error("Un producto ya no existe. Actualiza el catálogo.");
        const data = snapshot.data();
        const stock = Number(data.stock);
        const line = lines.find(item => item.productId === id);
        if (!Number.isFinite(stock) || stock < quantities.get(id)) throw new Error(`Stock insuficiente para ${line.name}. Revisa las cantidades.`);
        if (Number(data.price) !== Number(line.priceLista)) throw new Error(`Cambió el precio de ${line.name}. Actualiza el catálogo antes de confirmar.`);
      });
      snapshots.forEach((snapshot, index) => transaction.update(productRefs[index], {
        stock: Number(snapshot.data().stock) - quantities.get(productRefs[index].id)
      }));
      transaction.set(orderRef, {...orderData, createdAt: window._fsLib.serverTimestamp()});
    });
    // La interfaz se limpia únicamente después de confirmar la escritura.
    const waText = buildWhatsAppText(lines, total);
    const confirmedPhone = activeCustomerData.phone;
    if (!orders.some(order => order.id === orderRef.id)) orders.unshift({id:orderRef.id, ...orderData});
    window.orders = orders;
    cart = {}; window.cart = cart;
    descuentos = {}; window.descuentos = descuentos;
    activeCustomerId = null; activeCustomerData = null;
    const nameEl = document.getElementById("active-client-name");
    if (nameEl) nameEl.textContent = "Ninguno seleccionado";
    // Las entregas parciales pueden no cargar todos los módulos de administración.
    for (const name of ["renderProducts", "renderStockList", "renderOrdersAdmin", "renderHistorial", "updateCartUI"]) {
      try { if (typeof window[name] === "function") window[name](); }
      catch (uiError) { console.error("Pedido guardado; error al actualizar " + name, uiError); }
    }
    toast("Pedido guardado en Firebase");
    try { showOrderConfirmedModal(waText, confirmedPhone); }
    catch (uiError) { console.error("Pedido guardado; error al mostrar comprobante", uiError); }
  } catch (error) {
    console.error("No se pudo confirmar el pedido:", error);
    const code = String(error.code || "").replace("firestore/", "");
    const message = code === "permission-denied"
      ? "Firebase rechazó el guardado por permisos. Tu pedido sigue aquí. Hay que revisar las reglas y el acceso del vendedor."
      : code === "unauthenticated"
      ? "Firebase requiere una sesión válida. Tu pedido se conserva; revisa el acceso del vendedor."
      : ["unavailable", "deadline-exceeded"].includes(code)
      ? "No se pudo completar el guardado. Revisa tu conexión; tu pedido se conserva."
      : (error.message || "No se pudo guardar. Tu pedido se conserva.");
    showOrderSaveError(message);
  } finally {
    orderSaveInProgress = false;
    if (button) { button.disabled = false; button.innerHTML = previousLabel; }
  }
}

function buildWhatsAppText(lines, total) {
  const now = new Date().toLocaleString("es-MX");
  let txt = `*DISTRIBUIDORA CHIBLI — PEDIDO CONFIRMADO*\n`;
  txt    += `${now}\n`;
  txt    += `${activeCustomerData.storeName} (${activeCustomerData.ownerName})\n`;
  txt    += `${activeCustomerData.address || "Sin dirección"}\n\n`;
  txt    += `*Detalle del pedido:*\n`;
  lines.forEach(l => {
    txt += `${l.emoji} ${l.name} × ${l.qty} = $${l.subtotal.toLocaleString("es-MX", {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`;
  });
  txt += `\n*TOTAL: $${total.toLocaleString("es-MX", {minimumFractionDigits: 2, maximumFractionDigits: 2})}*\n`;
  return txt;
}

// ── Guarda el texto del último pedido para el botón del modal ──
let _lastWaText = "";

function showOrderConfirmedModal(waText, phone) {
  _lastWaText = waText;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay open";
  overlay.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-handle"></div>
      <div class="modal-title">Pedido Confirmado</div>
      <p style="font-size:.85rem;color:var(--gray-600);margin-bottom:1rem;">
        El pedido fue registrado correctamente en el sistema.<br/>
        Toca el botón para enviarme el resumen por WhatsApp.
      </p>
      <pre style="background:var(--gray-50);border-radius:8px;padding:.75rem;font-size:.72rem;
                  white-space:pre-wrap;word-break:break-word;margin-bottom:1rem;
                  border:1px solid var(--gray-200);max-height:200px;overflow-y:auto;">${esc(waText)}</pre>
      <button class="btn btn-success" onclick="sendWhatsApp()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.132.558 4.13 1.535 5.865L.057 23.53a.5.5 0 00.611.611l5.666-1.478A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.815 9.815 0 01-5.003-1.367l-.359-.213-3.722.97.99-3.617-.234-.371A9.818 9.818 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>
        Enviar por WhatsApp
      </button>
      <button class="btn btn-secondary" style="margin-top:.5rem;" onclick="this.closest('.modal-overlay').remove()">
        Cerrar
      </button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
}

function sendWhatsApp() {
  // ─────────────────────────────────────────────────────────────
  // PON AQUÍ TU NÚMERO DE WHATSAPP (52 + 10 dígitos)
  const MI_NUMERO = "526181234567";
  // ─────────────────────────────────────────────────────────────
  const url = `https://wa.me/${MI_NUMERO}?text=${encodeURIComponent(_lastWaText)}`;
  window.open(url, "_blank");
}

function updateCartPillBar() { updateCartUI(); }

// Exponer funciones globales en window
window.changeQty = changeQty;
window.updateCartUI = updateCartUI;
window.updateCartPillBar = updateCartUI;
window.calcTotal = calcTotal;
window.setDescuento = setDescuento;
window.applyGlobalDiscount = applyGlobalDiscount;
window.renderCart = renderCart;
window.changeQtyInCart = changeQtyInCart;
window.renderCheckoutStorePicker = renderCheckoutStorePicker;
window.selectCheckoutCustomer = selectCheckoutCustomer;
window.openQuickAddStore = openQuickAddStore;
window.submitQuickAddStore = submitQuickAddStore;
window.clearCart = clearCart;
window.confirmOrder = confirmOrder;
window.sendWhatsApp = sendWhatsApp;
