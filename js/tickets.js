// ════════════════════════════════════════════════════════════════
// TICKETS
// ════════════════════════════════════════════════════════════════
function isOrderToday(o) {
  if (!o.createdAt?.toDate) return true;
  const d = o.createdAt.toDate();
  const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  return ds === getHoyStr();
}

function getPrintedTicketsToday() {
  try { return new Set(JSON.parse(localStorage.getItem("chibli_printed_" + getHoyStr()) || "[]")); }
  catch(e) { return new Set(); }
}
function markTicketPrinted(orderId) {
  try {
    const set = getPrintedTicketsToday();
    set.add(orderId);
    localStorage.setItem("chibli_printed_" + getHoyStr(), JSON.stringify([...set]));
  } catch(e) { /* localStorage no disponible, se ignora */ }
}

function renderTickets() {
  const statusFilter = (document.getElementById("ticket-filter-status")||{}).value || "";
  const storeSelect  = document.getElementById("ticket-filter-store");
  const vendSelect   = document.getElementById("ticket-filter-vendedor");
  if (!storeSelect || !vendSelect) return;

  const prevStore = storeSelect.value;
  const storeNames = [...new Set(orders.map(o => o.customerName).filter(Boolean))].sort();
  storeSelect.innerHTML = `<option value="">Todas las tiendas</option>` +
    storeNames.map(n => `<option value="${esc(n)}"${n===prevStore?" selected":""}>${esc(n)}</option>`).join("");

  const prevVend = vendSelect.value;
  vendSelect.innerHTML = `<option value="">Todos los vendedores</option>` +
    vendedores.map(v => `<option value="${v.id}"${v.id===prevVend?" selected":""}>${esc(v.folio)} — ${esc(v.nombre)}</option>`).join("");

  const storeFilter = storeSelect.value;
  const vendFilter  = vendSelect.value;
  const filtered = orders.filter(o => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (storeFilter  && o.customerName !== storeFilter) return false;
    if (vendFilter   && o.vendedorId !== vendFilter) return false;
    return true;
  });

  // ── KPIs (siempre sobre lo de hoy, respetando los filtros de tienda/vendedor) ──
  const todayFiltered = filtered.filter(isOrderToday);
  const totalHoy = todayFiltered.reduce((s,o) => s + (+o.total||0), 0);
  const printedToday = getPrintedTicketsToday();
  const impresosCount = todayFiltered.filter(o => printedToday.has(o.id)).length;
  const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  set("tix-kpi-hoy", todayFiltered.length);
  set("tix-kpi-hoy-sub", `$${totalHoy.toFixed(2)}`);
  set("tix-kpi-impresos", impresosCount);
  set("tix-kpi-impresos-sub", `de ${todayFiltered.length} tickets`);

  renderPendientesSummary(todayFiltered);

  const el = document.getElementById("tickets-list");
  if (!el) return;
  if (!filtered.length) {
    el.innerHTML = `<div class="empty-state"><p>Sin pedidos para este filtro.</p></div>`;
    return;
  }
  const sorted = [...filtered].sort((a,b) => {
    const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
    const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
    return db_ - da;
  });
  el.innerHTML = sorted.map(o => buildTicketCard(o, printedToday.has(o.id))).join("");
}

// ── Resumen de productos "pesados" (para cargar/entregar) ──────
// Suma las cantidades de los productos marcados como `pesado`
// a través de los pedidos visibles, para que el vendedor sepa
// de un vistazo cuánto tiene que cargar de esos productos hoy.
function getPendientesSummary(filteredOrders) {
  const pesadoIds = new Set(products.filter(p => p.pesado).map(p => p.id));
  if (!pesadoIds.size) return [];

  const totals = {}; // productId -> { name, emoji, unit, piezas, qty }
  filteredOrders.forEach(o => {
    (o.lines||[]).forEach(l => {
      if (!pesadoIds.has(l.productId)) return;
      if (!totals[l.productId]) {
        const p = products.find(pr => pr.id === l.productId);
        totals[l.productId] = { name: (p?.name || l.name), emoji: (p?.emoji || l.emoji || ""), unit: p?.unit || "", piezas: parseInt(p?.piezas) || 0, qty: 0 };
      }
      totals[l.productId].qty += (l.qty || 0);
    });
  });

  return Object.values(totals).filter(t => t.qty > 0).sort((a,b) => b.qty - a.qty);
}

// ── Convierte unidades totales a "X caja(s) + Y suelto(s)" ─────
// usando el número de piezas por caja del producto. Si el
// producto no tiene "piezas por caja" definido, devuelve solo
// el número total (no se puede desglosar).
function formatCajasSueltos(qty, piezasPorCaja) {
  if (!piezasPorCaja || piezasPorCaja <= 1) return `${qty}`;
  const cajas   = Math.floor(qty / piezasPorCaja);
  const sueltos = qty % piezasPorCaja;
  const parts = [];
  if (cajas > 0)   parts.push(`${cajas} ${cajas === 1 ? "caja" : "cajas"}`);
  if (sueltos > 0) parts.push(`${sueltos} ${sueltos === 1 ? "suelto" : "sueltos"}`);
  if (!parts.length) return "0";
  return parts.join(" + ") + ` (${qty})`;
}

function renderPendientesSummary(filteredOrders) {
  const card = document.getElementById("pendientes-summary-card");
  const list = document.getElementById("pendientes-summary-list");
  if (!card || !list) return;

  const summary = getPendientesSummary(filteredOrders);
  if (!summary.length) { card.style.display = "none"; return; }

  card.style.display = "";
  list.innerHTML = summary.map(t => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid #fde68a;">
      <span style="font-weight:600;color:#92400e;">${t.emoji} ${esc(t.name)}${t.unit ? ` <span style="font-weight:400;font-size:.78rem;color:#b45309;">(${esc(t.unit)})</span>` : ""}</span>
      <span style="font-weight:800;font-size:1.05rem;color:#92400e;">${formatCajasSueltos(t.qty, t.piezas)}</span>
    </div>`).join("");
}

function printPendientesSummary() {
  const statusFilter = (document.getElementById("ticket-filter-status")||{}).value || "";
  const storeFilter  = (document.getElementById("ticket-filter-store")||{}).value  || "";
  const vendFilter   = (document.getElementById("ticket-filter-vendedor")||{}).value || "";
  const filtered = orders.filter(o => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (storeFilter  && o.customerName !== storeFilter) return false;
    if (vendFilter   && o.vendedorId !== vendFilter) return false;
    return true;
  }).filter(isOrderToday);
  const summary = getPendientesSummary(filtered);
  if (!summary.length) { toast("No hay productos pendientes para este filtro"); return; }
  doPrint(buildPendientesPrint(summary));
}

function buildTicketCard(o, wasPrinted) {
  const dateStr = o.createdAt?.toDate
    ? o.createdAt.toDate().toLocaleTimeString("es-MX", {hour:"2-digit",minute:"2-digit"})
    : "—";
  const dateFull = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleDateString("es-MX") : "—";
  const numLines = (o.lines||[]).length;
  const numUnid  = (o.lines||[]).reduce((s,l) => s + (l.qty||0), 0);
  const rows = (o.lines||[]).map(l =>
    `<tr><td>${l.emoji||""} ${esc(l.name)}</td>
         <td style="text-align:center;padding:0 .5rem;">${l.qty}</td>
         <td>$${(+(l.subtotal||0)).toFixed(2)}</td></tr>`).join("");
  return `
  <div class="tix-order-card">
    <div class="tix-order-top" onclick="this.closest('.tix-order-card').classList.toggle('open')">
      <div class="tix-order-main">
        <div class="tix-order-folio-row">
          <span class="tix-order-folio">#${(o.id||"").slice(-6).toUpperCase()}</span>
          ${o.vendedorFolio ? `<span class="tix-order-vend">${esc(o.vendedorFolio)}</span>` : ""}
          ${wasPrinted ? `<span class="hist-status-pill entregado">✓ Impreso</span>` : ""}
        </div>
        <div class="tix-order-meta">${esc(o.customerName)} · ${dateFull} ${dateStr} · ${numLines} producto${numLines!==1?"s":""} (${numUnid} uds.)</div>
      </div>
      <div class="tix-order-right">
        <div class="tix-order-amt">$${(+o.total).toFixed(2)}</div>
        <svg class="tix-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </div>
    <div class="tix-order-detail">
      <div class="ticket-body">
        <table class="ticket-lines-table">
          <thead><tr><th>Producto</th><th style="text-align:center">Cant.</th><th style="text-align:right">Subtotal</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="ticket-total-bar">
          <span>TOTAL</span><span class="amount">$${(+o.total).toFixed(2)}</span>
        </div>
        <button class="ticket-print-btn" style="margin-top:.6rem;" onclick="event.stopPropagation();printOneTicket('${o.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Imprimir Ticket
        </button>
      </div>
    </div>
  </div>`;
}

function buildTicketPrint(o) {
  const size = getThermalSize();
  const isThermal = size === "58" || size === "80";
  const showCost = (document.getElementById("show-cost-on-ticket") || {}).checked;
  const dateStr = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString("es-MX") : "—";

  if (isThermal) {
    // ── Versión TÉRMICA ────────────────────────────────────────
    let gananciaTotal = 0;
    const rows = (o.lines || []).map(l => {
      const prod = products.find(p => p.id === l.productId);
      const costo = prod?.precioCosto ? (+prod.precioCosto) : 0;
      const linGan = (l.price - costo) * (l.qty || 0);
      gananciaTotal += linGan;
      const nombreCorto = (l.name || "").length > 16 ? l.name.slice(0,15)+"…" : l.name;
      return `<div class="th-row">
        <span class="name">${l.emoji||""}${esc(nombreCorto)}</span>
        <span class="qty">${l.qty}</span>
        <span class="sub">$${(+(l.subtotal||0)).toFixed(2)}</span>
      </div>`;
    }).join("");
    return `
    <div class="thermal-ticket">
      <div class="th-header">
        <div class="th-title">DIST. CHIBLI</div>
        <div class="th-sub">${dateStr}</div>
      </div>
      <div class="th-store">${esc(o.customerName)}</div>
      ${o.ownerName ? `<div class="th-meta">${esc(o.ownerName)}</div>` : ""}
      ${o.address   ? `<div class="th-meta">${esc(o.address)}</div>` : ""}
      ${o.phone     ? `<div class="th-meta">Tel: ${esc(o.phone)}</div>` : ""}
      <hr class="th-divider"/>
      <div class="th-row" style="font-weight:bold;border-bottom:1px solid #000;padding-bottom:2pt;margin-bottom:2pt;">
        <span class="name">Producto</span><span class="qty">Cant</span><span class="sub">Total</span>
      </div>
      ${rows}
      <div class="th-total-row">
        <span>TOTAL</span><span>$${(+o.total).toFixed(2)}</span>
      </div>
      ${showCost && gananciaTotal > 0 ? `<div class="th-ganancia"><span>Ganancia bruta:</span><span>$${gananciaTotal.toFixed(2)}</span></div>` : ""}
      <div class="th-footer">
        Folio: #${(o.id||"").slice(-6).toUpperCase()}<br/>
        ${o.vendedorFolio ? `Vendedor: ${esc(o.vendedorFolio)}<br/>` : ""}
        Estado: ${o.status||"Entregado"}<br/>
        ¡Gracias por su compra!
      </div>
      <div class="th-cut">- - - - - - - - - -</div>
    </div>`;
  }

  // ── Versión A4 (original mejorada) ──────────────────────────
  let gananciaTotal = 0;
  const rows = (o.lines||[]).map(l => {
    const prod = products.find(p => p.id === l.productId);
    const costo = prod?.precioCosto ? (+prod.precioCosto) : 0;
    gananciaTotal += (l.price - costo) * (l.qty || 0);
    return `<tr><td>${l.emoji||""} ${esc(l.name)}</td>
         <td style="text-align:center;padding:0 .5rem">${l.qty}</td>
         <td style="text-align:right">$${(+(l.subtotal||0)).toFixed(2)}</td></tr>`;
  }).join("");
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto 2.5rem;border:2px solid #222;border-radius:8px;overflow:hidden;page-break-inside:avoid;">
    <div style="background:#C0141A;color:#fff;padding:.7rem 1rem;">
      <div style="font-size:1.1rem;font-weight:800;">Distribuidora Chibli — Ticket de Pedido</div>
      <div style="font-size:.75rem;opacity:.85;margin-top:2px;">${dateStr}</div>
    </div>
    <div style="padding:.8rem 1rem;border-bottom:1px solid #ddd;">
      <div style="font-weight:800;font-size:1rem;">${esc(o.customerName)}</div>
      ${o.ownerName?`<div style="font-size:.8rem;color:#555">Dueño: ${esc(o.ownerName)}</div>`:""}
      ${o.address  ?`<div style="font-size:.8rem;color:#555">${esc(o.address)}</div>`:""}
      ${o.phone    ?`<div style="font-size:.8rem;color:#555">${esc(o.phone)}</div>`:""}
    </div>
    <div style="padding:.8rem 1rem;">
      <table style="width:100%;border-collapse:collapse;font-size:.82rem;">
        <thead><tr style="border-bottom:2px solid #222;">
          <th style="text-align:left;padding:.2rem 0">Producto</th>
          <th style="text-align:center;padding:.2rem .5rem">Cant.</th>
          <th style="text-align:right;padding:.2rem 0">Subtotal</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div style="display:flex;justify-content:space-between;border-top:2px solid #222;margin-top:.6rem;padding-top:.5rem;font-weight:800;font-size:1rem;">
        <span>TOTAL</span><span style="color:#C0141A">$${(+o.total).toFixed(2)}</span>
      </div>
      ${showCost && gananciaTotal > 0 ? `<div style="display:flex;justify-content:space-between;font-size:.75rem;color:#555;margin-top:.3rem;"><span>Ganancia bruta:</span><span style="color:#1B8C52;font-weight:700;">$${gananciaTotal.toFixed(2)}</span></div>` : ""}
    </div>
    <div style="background:#f9f9f9;padding:.45rem 1rem;font-size:.72rem;color:#888;display:flex;justify-content:space-between;">
      <span>#${(o.id||"").slice(-6).toUpperCase()}</span><span>Estado: ${o.status||"Entregado"}</span>
    </div>
  </div>`;
}

function buildPendientesPrint(summary) {
  const rows = summary.map(t => `
    <tr>
      <td style="padding:.4rem 0;font-size:1rem;">${t.emoji} ${esc(t.name)}${t.unit ? ` <span style="font-size:.78rem;color:#888;">(${esc(t.unit)})</span>` : ""}</td>
      <td style="padding:.4rem 0;text-align:right;font-weight:800;font-size:1.2rem;">${formatCajasSueltos(t.qty, t.piezas)}</td>
    </tr>`).join("");
  return `
  <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto 2.5rem;border:2px solid #222;border-radius:8px;overflow:hidden;page-break-inside:avoid;">
    <div style="background:#f59e0b;color:#fff;padding:.7rem 1rem;">
      <div style="font-size:1.1rem;font-weight:800;">Resumen de Productos Pesados</div>
      <div style="font-size:.75rem;opacity:.9;margin-top:2px;">Productos pesados a cargar hoy</div>
    </div>
    <div style="padding:.8rem 1rem;">
      <table style="width:100%;border-collapse:collapse;font-size:.9rem;">
        <thead><tr style="border-bottom:2px solid #222;">
          <th style="text-align:left;padding:.2rem 0;">Producto</th>
          <th style="text-align:right;padding:.2rem 0;">Cantidad</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

function printOneTicket(orderId) {
  const o = orders.find(x => x.id === orderId);
  if (!o) return;
  doPrint(buildTicketPrint(o));
  markTicketPrinted(orderId);
  renderTickets();
}

function printAllTickets() {
  const statusFilter = (document.getElementById("ticket-filter-status")||{}).value || "";
  const storeFilter  = (document.getElementById("ticket-filter-store")||{}).value  || "";
  const vendFilter   = (document.getElementById("ticket-filter-vendedor")||{}).value || "";
  const filtered = orders.filter(o => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (storeFilter  && o.customerName !== storeFilter) return false;
    if (vendFilter   && o.vendedorId !== vendFilter) return false;
    return true;
  });
  if (!filtered.length) { toast("Sin tickets para imprimir"); return; }
  const todayFiltered = filtered.filter(isOrderToday);
  const summary = getPendientesSummary(todayFiltered);
  const summaryHtml = summary.length ? buildPendientesPrint(summary) : "";
  doPrint(summaryHtml + filtered.map(o => buildTicketPrint(o)).join(""));
  filtered.forEach(o => markTicketPrinted(o.id));
  renderTickets();
}

function getThermalSize() {
  return (document.getElementById("thermal-size") || {}).value || "58";
}

function doPrint(inner) {
  const size = getThermalSize();
  const isThermal = size === "58" || size === "80";
  let pageStyle = "";
  if (isThermal) {
    const mm = size === "58" ? "58mm" : "80mm";
    pageStyle = `@page{size:${mm} auto;margin:0mm}
    body{font-family:'Courier New',Courier,monospace;background:#fff;width:${mm};}`;
  } else {
    pageStyle = `@page{size:A4;margin:1.5cm}
    body{font-family:Arial,sans-serif;background:#fff;}`;
  }

  // Reusar o crear iframe oculto
  let frame = document.getElementById("print-iframe");
  if (!frame) {
    frame = document.createElement("iframe");
    frame.id = "print-iframe";
    frame.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;";
    document.body.appendChild(frame);
  }

  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html>
    <html><head><meta charset="UTF-8">
    ${pageStyle}
    </head><body>${inner}</body></html>`);
  doc.close();

  setTimeout(() => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
  }, 350);
}

async function setOrderStatus(orderId, status) {
  // Actualizar array local siempre
  const o = orders.find(x => x.id === orderId);
  if (o) o.status = status;
  renderOrdersAdmin();
  renderHistorial();
  renderCaja();
  renderTickets();

  // Persistir en Firebase si está conectado
  try {
    if (window._db && window._firebaseReady) {
      const { doc, updateDoc } = window._fsLib;
      await updateDoc(doc(window._db, "orders", orderId), { status });
    }
  } catch(e) { console.warn("setOrderStatus Firebase error:", e); }
  toast(`Pedido marcado como "${status}"`);
}
