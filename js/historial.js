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
  const totalRuta = myOrders.reduce((s, o) => s + (+o.total || 0), 0);
  const entregadosCount = myOrders.filter(o => !o.status || o.status === "Entregado").length;
  const totalFacturadoEl = document.getElementById("hist-total-facturado");
  const entregadosEl     = document.getElementById("hist-entregados-count");
  if (totalFacturadoEl) totalFacturadoEl.textContent = `$${totalRuta.toFixed(2)}`;
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
    el.innerHTML = `<div class="empty-state"><p>Sin pedidos${historialFilterStatus ? " con ese estatus" : " hoy"}.</p></div>`;
    return;
  }

  el.innerHTML = filtered.map(o => {
    const dt = o.createdAt?.toDate ? o.createdAt.toDate() : null;
    const dateStr = dt
      ? `${dt.toLocaleDateString("es-MX")} ${dt.toLocaleTimeString("es-MX", {hour:"2-digit",minute:"2-digit"})}`
      : "—";
    const status     = o.status || "Entregado";
    const statusCls  = status === "Cancelado" ? "cancelado" : "entregado";
    const numLines   = (o.lines || []).length;
    const lines = (o.lines || []).map(l => {
      const descStr = l.descuentoPct > 0 ? ` <span style="color:var(--green);font-size:.7rem;">−${l.descuentoPct}%</span>` : "";
      return `${l.emoji||""} ${esc(l.name)} ×${l.qty}${descStr} — $${(+l.subtotal||0).toFixed(2)}`;
    }).join("<br/>");

    return `<div class="hist-order-card">
      <div class="hist-order-top" onclick="toggleHistCard(this.closest('.hist-order-card'))">
        <span class="hist-dot ${statusCls}"></span>
        <div class="hist-order-main">
          <div class="hist-order-folio-row">
            <span class="hist-order-folio">#${(o.id||"").slice(-6).toUpperCase()}</span>
            <span class="hist-status-pill ${statusCls}">${status}</span>
          </div>
          <div class="hist-order-meta">${esc(o.customerName)} · ${dateStr} · ${numLines} producto${numLines!==1?"s":""}</div>
        </div>
        <div class="hist-order-right">
          <div class="hist-order-amt">$${(+o.total).toFixed(2)}</div>
          <svg class="hist-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      <div class="hist-order-detail">
        <div class="historial-lines">${lines}</div>
        ${o.totalDescuento > 0 ? `<div style="font-size:.75rem;color:var(--green);margin-top:.25rem;">Descuento aplicado: −$${(+o.totalDescuento).toFixed(2)}</div>` : ""}
      </div>
    </div>`;
  }).join("");
}
