// ════════════════════════════════════════════════════════════════
// HISTORIAL DE PEDIDOS (vista tienda)
// ════════════════════════════════════════════════════════════════
let historialFilterStatus = "";

function setHistorialFilter(status) {
  historialFilterStatus = status;
  document.querySelectorAll("#hist-filter-chips .cat-chip").forEach(b => {
    b.classList.toggle("active", (b.dataset.filter || "") === status);
  });
  renderHistorial();
}

function toggleHistCard(el) {
  el.classList.toggle("open");
}

function renderHistorial() {
  const el = document.getElementById("historial-list");
  if (!el) return;

  const isVendedor = currentSession?.role === "vendedor";
  const vendId = currentSession?.vendedorId;

  let myOrders;
  if (isVendedor) {
    // El vendedor ve sus pedidos del día (por vendedorId)
    const hoy = getHoyStr();
    myOrders = orders.filter(o => {
      const matchVend = o.vendedorId === vendId;
      if (!matchVend) return false;
      if (!o.createdAt?.toDate) return true;
      const d = o.createdAt.toDate();
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      return ds === hoy;
    });
  } else {
    el.innerHTML = `<div class="empty-state"><p>Historial solo disponible para vendedores.</p></div>`;
    return;
  }

  // ── Stats (siempre sobre el total del día, sin filtro) ─────────
  const money = v => (Number(v) || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalRuta = myOrders.reduce((s, o) => s + (+o.total || 0), 0);
  const entregadosCount = myOrders.filter(o => !o.status || o.status === "Entregado").length;
  const totalFacturadoEl = document.getElementById("hist-total-facturado");
  const entregadosEl     = document.getElementById("hist-entregados-count");
  if (totalFacturadoEl) totalFacturadoEl.textContent = `$${money(totalRuta)}`;
  if (entregadosEl) entregadosEl.innerHTML = `${entregadosCount} <span class="hist-stat-of">de ${myOrders.length}</span>`;

  const badge = document.getElementById("hist-nav-badge");
  if (badge) {
    if (myOrders.length > 0) { badge.style.display = "flex"; badge.textContent = myOrders.length; }
    else badge.style.display = "none";
  }

  // ── Filtro por estatus ───────────────────────────────────────
  const filtered = historialFilterStatus
    ? myOrders.filter(o => (o.status || "Entregado") === historialFilterStatus)
    : myOrders;

  if (!filtered.length) {
    el.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="10"/></svg>
      <p>Sin pedidos${historialFilterStatus ? " con ese estatus" : " registrados hoy"}.</p>
    </div>`;
    return;
  }

  el.innerHTML = filtered.map(o => {
    const dt = o.createdAt?.toDate ? o.createdAt.toDate() : null;
    const dateStr = dt
      ? `${dt.toLocaleDateString("es-MX")} · ${dt.toLocaleTimeString("es-MX", {hour:"2-digit",minute:"2-digit"})}`
      : "—";
    const status     = o.status || "Entregado";
    const statusCls  = status === "Cancelado" ? "cancelado" : "entregado";
    const numLines   = (o.lines || []).length;
    const lines = (o.lines || []).map(l => {
      const descStr = l.descuentoPct > 0 ? `<span class="hist-line-disc">−${l.descuentoPct}%</span>` : "";
      return `<div class="hist-line-row">
        <span class="hist-line-name">${esc(l.name)} <small class="hist-line-qty">×${l.qty}</small>${descStr}</span>
        <strong class="hist-line-sub">$${money(l.subtotal)}</strong>
      </div>`;
    }).join("");

    return `<div class="hist-order-card">
      <div class="hist-order-top" onclick="toggleHistCard(this.closest('.hist-order-card'))">
        <span class="hist-dot ${statusCls}"></span>
        <div class="hist-order-main">
          <div class="hist-order-folio-row">
            <span class="hist-order-folio">#${esc((o.id||"").slice(-6).toUpperCase())}</span>
            <span class="hist-status-pill ${statusCls}">${esc(status)}</span>
          </div>
          <div class="hist-order-meta">${esc(o.customerName)} · ${dateStr} · ${numLines} producto${numLines!==1?"s":""}</div>
        </div>
        <div class="hist-order-right">
          <div class="hist-order-amt">$${money(o.total)}</div>
          <svg class="hist-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      <div class="hist-order-detail">
        <div class="historial-lines">${lines}</div>
        ${o.totalDescuento > 0 ? `<div class="hist-discount-row"><span>Descuento aplicado</span><strong>−$${money(o.totalDescuento)}</strong></div>` : ""}
        <div class="hist-detail-actions">
          <button type="button" class="hist-wa-btn" data-wa-order="${esc(o.id)}">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            Enviar resumen por WhatsApp
          </button>
        </div>
      </div>
    </div>`;
  }).join("");

  el.onclick = event => {
    const waBtn = event.target.closest?.("button[data-wa-order]");
    if (!waBtn || !el.contains(waBtn)) return;
    const orderObj = orders.find(item => item.id === waBtn.dataset.waOrder);
    if (!orderObj) return;
    const text = typeof formatOrderWhatsAppText === "function" ? formatOrderWhatsAppText(orderObj) : "";
    if (text && typeof sendWhatsApp === "function") sendWhatsApp(text);
  };
}

window.setHistorialFilter = setHistorialFilter;
window.toggleHistCard = toggleHistCard;
window.renderHistorial = renderHistorial;
