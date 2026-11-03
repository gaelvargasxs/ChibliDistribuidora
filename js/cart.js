// Estado global asegurado
if (typeof window.cart === "undefined") window.cart = {};
if (typeof window.descuentos === "undefined") window.descuentos = {};
if (typeof window.orders === "undefined") window.orders = [];

function changeQty(productKey, delta) {
  const isCaja   = productKey.endsWith("_caja");
  const productId = isCaja ? productKey.replace("_caja", "") : productKey;
  const product  = products.find(p => p.id === productId);
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
  const prodCount  = Object.keys(cart).filter(k => cart[k] > 0).length;

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
      if (prodsLabel) prodsLabel.textContent = `${prodCount} producto${prodCount!==1?"s":""} • ${totalItems} unidad${totalItems!==1?"es":""}`;
      if (totalLabel) totalLabel.textContent = `$${totalAmt.toLocaleString("es-MX", {minimumFractionDigits: 2, maximumFractionDigits: 2})} MXN`;
    } else {
      fab.style.setProperty("display", "none", "important");
      fab.classList.remove("visible");
    }
  }

  // Header badge
  const hTotal = document.getElementById("header-cart-total");
  if (hTotal) hTotal.textContent = `Carrito: $${totalAmt.toFixed(2)}`;

  // Actualizar count en catálogo
  const selCountEl = document.getElementById("catalogo-sel-count");
  if (selCountEl) selCountEl.textContent = prodCount > 0 ? `${prodCount} SELECCIONADOS` : "";

  renderCart();
}

window.updateCartPillBar = updateCartUI;

function calcTotal() {
  const _desc = typeof descuentos !== "undefined" ? descuentos : (window.descuentos || {});
  const _cart = typeof cart !== "undefined" ? cart : (window.cart || {});
  return Object.entries(_cart).reduce((sum, [key, qty]) => {
    const isCaja    = key.endsWith("_caja");
    const productId = isCaja ? key.replace("_caja", "") : key;
    const p = products.find(pr => pr.id === productId);
    if (!p) return sum;
    const cajaPiezas = parseInt(p.piezas) || 12;
    const unitQty = qty * (isCaja ? cajaPiezas : 1);
    const descPct = _desc[productId] || 0;
    const precioFinal = p.price * (1 - descPct / 100);
    return sum + precioFinal * unitQty;
  }, 0);
}

function setDescuento(productId, val) {
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

  linesEl.innerHTML = Object.entries(cart).map(([key, qty]) => {
    const isCaja    = key.endsWith("_caja");
    const productId = isCaja ? key.replace("_caja", "") : key;
    const p = products.find(pr => pr.id === productId);
    if (!p) return "";
    const cajaPiezas = parseInt(p.piezas) || 1;
    const unitQty    = isCaja ? cajaPiezas * qty : qty;
    const descPct    = descuentos[productId] || 0;
    const precioFinal = p.price * (1 - descPct / 100);
    const subtotal   = precioFinal * unitQty;
    subtotalBruto += p.price * unitQty;

    const cantidadLabel = isCaja ? `${qty} caja${qty>1?"s":""}` : `${qty} pieza${qty>1?"s":""}`;
    const precioUnitStr = isCaja && qty > 0 ? ` ($${p.price.toFixed(2)} c/u)` : "";
    const descuentoStr = descPct > 0 ? `<span class="order-line-desc">−${descPct}% desc. aplicado</span>` : "";

    return `<div class="cart-item-card">
      <div class="cart-item-top">
        <span class="cart-item-emoji">${p.emoji||""}</span>
        <div class="cart-item-info">
          <div class="cart-item-name">${esc(p.name)}</div>
          <div class="cart-item-meta">${cajaPiezas>1?`${cajaPiezas} pzas/caja · `:""}${p.unit?esc(p.unit)+" · ":""}$${p.price.toFixed(2)}${precioUnitStr}</div>
          <div class="cart-item-price">$${subtotal.toFixed(2)} ${descuentoStr}</div>
        </div>
        <button class="cart-item-del" onclick="changeQtyInCart('${key}', -${qty})" title="Quitar del pedido"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button>
      </div>
      <div class="cart-item-bottom">
        <span class="cart-item-qty-label">Cantidad: ${cantidadLabel}</span>
        <div class="qty-stepper">
          <button onclick="changeQtyInCart('${key}', -1)">−</button>
          <span>${qty}</span>
          <button onclick="changeQtyInCart('${key}', 1)">+</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:.35rem;margin-top:.6rem;">
        <label style="font-size:.7rem;margin:0;color:var(--gray-400);">Desc. individual %</label>
        <input type="number" class="descuento-input" value="${descPct}" min="0" max="100" step="1"
               onchange="setDescuento('${productId}', this.value)" title="% de descuento" />
      </div>
    </div>`;
  }).join("");

  const total = calcTotal();
  const totalDescuento = subtotalBruto - total;

  document.getElementById("cart-subtotal-bruto").textContent = `$${subtotalBruto.toFixed(2)}`;
  const descRow = document.getElementById("cart-descuento-row");
  if (totalDescuento > 0.005) {
    descRow.style.display = "flex";
    document.getElementById("cart-descuento-total").textContent = `−$${totalDescuento.toFixed(2)}`;
  } else {
    descRow.style.display = "none";
  }
  totalEl.textContent = `$${total.toFixed(2)}`;

  renderCheckoutStorePicker();
}

// ── Cambiar cantidad directo desde la tarjeta del carrito ────────
function changeQtyInCart(productKey, delta) {
  changeQty(productKey, delta);
  renderCart();
}

// ── Aplicar el mismo % de descuento a todas las líneas del carrito ──
function applyGlobalDiscount() {
  const val = document.getElementById("global-discount-input").value;
  const pct = Math.max(0, Math.min(100, parseFloat(val) || 0));
  Object.keys(cart).forEach(key => {
    const productId = key.endsWith("_caja") ? key.replace("_caja", "") : key;
    setDescuento(productId, pct);
  });
  toast(pct > 0 ? `${pct}% aplicado a todo el pedido` : "Descuento quitado de todo el pedido");
}

// ── PASO 2: Asignar tienda de entrega dentro del carrito ─────────
function renderCheckoutStorePicker(filter = "") {
  const listEl = document.getElementById("checkout-store-list");
  if (!listEl) return;

  const prodCount = Object.keys(cart).filter(k => cart[k] > 0).length;
  const total = calcTotal();
  const labelEl  = document.getElementById("checkout-total-label");
  const amountEl = document.getElementById("checkout-total-amount");
  if (labelEl)  labelEl.textContent  = `Total (${prodCount} prod${prodCount!==1?"s":""})`;
  if (amountEl) amountEl.textContent = `$${total.toFixed(2)}`;

  const f = filter.toLowerCase();
  const filtered = customers.filter(c =>
    c.storeName.toLowerCase().includes(f) ||
    (c.ownerName||"").toLowerCase().includes(f) ||
    (c.zone||"").toLowerCase().includes(f)
  );

  if (!filtered.length) {
    listEl.innerHTML = `<div class="empty-state" style="padding:1.2rem 0;">
      <p>No hay tiendas registradas. Usa "+ Nuevo" para agregar una.</p></div>`;
    return;
  }

  listEl.innerHTML = filtered.map(c => `
    <div class="store-card-v2 ${c.id === activeCustomerId ? "selected" : ""}"
         onclick="selectCheckoutCustomer('${c.id}')">
      <div class="store-card-v2-top">
        <div class="customer-avatar">${c.storeName.charAt(0).toUpperCase()}</div>
        <div style="flex:1;min-width:0;">
          <div class="store-card-v2-name">${esc(c.storeName)}</div>
          <div class="store-card-v2-meta">${esc(c.ownerName||"")}${c.zone ? " · Zona: " + esc(c.zone) : ""}${c.address ? " · " + esc(c.address) : ""}</div>
        </div>
        <div class="customer-check">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
      </div>
    </div>`).join("");
}

function selectCheckoutCustomer(id) {
  activeCustomerId   = id;
  activeCustomerData = customers.find(c => c.id === id);
  if (!activeCustomerData) return;
  const nameEl = document.getElementById("active-client-name");
  if (nameEl) nameEl.textContent = activeCustomerData.storeName;
  renderCheckoutStorePicker();
  toast(`Pedido asignado a ${activeCustomerData.storeName}`);
}

function openQuickAddStore() {
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
  cart = {};
  descuentos = {};
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
async function confirmOrder() {
  if (!activeCustomerId) { toast("Asigna una tienda de entrega (Paso 2)"); return; }
  if (!Object.keys(cart).length) { toast("El carrito está vacío"); return; }

  const lines = Object.entries(cart).map(([key, qty]) => {
    const isCaja    = key.endsWith("_caja");
    const productId = isCaja ? key.replace("_caja", "") : key;
    const p = products.find(pr => pr.id === productId);
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

  // Agregar al array local inmediatamente
  const localId = "local-" + Date.now();
  orders.unshift({ id:localId, ...orderData });

  // Descontar stock local
  lines.forEach(l => {
    const p = products.find(pr => pr.id === l.productId);
    if (p) p.stock = Math.max(0, (p.stock||0) - l.qty);
  });

  // Intentar guardar en Firebase (silencioso si falla/demo)
  try {
    const { collection, doc, addDoc, updateDoc, serverTimestamp } = window._fsLib;
    const db = window._db;
    if (db) {
      const ref = await addDoc(collection(db,"orders"), {
        ...orderData, createdAt: serverTimestamp()
      });
      // Reemplazar id local por el de Firebase
      const idx = orders.findIndex(o => o.id === localId);
      if (idx >= 0) orders[idx].id = ref.id;
      // Actualizar stock en Firebase
      lines.forEach(l => {
        const p = products.find(pr => pr.id === l.productId);
        if (p) updateDoc(doc(db,"products",l.productId), { stock: p.stock }).catch(()=>{});
      });
    }
  } catch(e) {}

  const waText = buildWhatsAppText(lines, total);
  const confirmedPhone = activeCustomerData.phone;
  cart = {};
  descuentos = {};
  activeCustomerId   = null;
  activeCustomerData = null;
  const nameEl = document.getElementById("active-client-name");
  if (nameEl) nameEl.textContent = "Ninguno seleccionado";
  renderProducts(document.getElementById("product-search").value);
  renderStockList();
  renderOrdersAdmin();
  renderHistorial();
  updateCartUI();
  toast("Pedido guardado — continúa con la siguiente tienda");
  showOrderConfirmedModal(waText, confirmedPhone);
}

function buildWhatsAppText(lines, total) {
  const now = new Date().toLocaleString("es-MX");
  let txt = `*DISTRIBUIDORA CHIBLI — PEDIDO CONFIRMADO*\n`;
  txt    += `${now}\n`;
  txt    += `${activeCustomerData.storeName} (${activeCustomerData.ownerName})\n`;
  txt    += `${activeCustomerData.address || "Sin dirección"}\n\n`;
  txt    += `*Detalle del pedido:*\n`;
  lines.forEach(l => {
    txt += `${l.emoji} ${l.name} × ${l.qty} = $${l.subtotal.toFixed(2)}\n`;
  });
  txt += `\n*TOTAL: $${total.toFixed(2)}*\n`;
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
