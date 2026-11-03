// ════════════════════════════════════════════════════════════════
// DASHBOARD ADMIN (Panel Central)
// Usa las mismas fórmulas que el módulo de Caja (ventas, ganancia
// bruta, utilidad neta) pero acotadas al día de hoy.
// ════════════════════════════════════════════════════════════════
function renderAdminDashboard() {
  const hoyStr = getHoyStr();

  const ordersHoy = orders.filter(o => {
    let d = "";
    if (o.createdAt?.toDate) {
      const dt = o.createdAt.toDate();
      d = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
    } else {
      d = o.fechaStr || "";
    }
    return d === hoyStr;
  });

  // Todo pedido registrado ya está entregado y cobrado, no hay etapas.
  const entregados = ordersHoy;

  const ventasCobradas = entregados.reduce((s,o) => s + (+o.total || 0), 0);

  let totalCostoVendido = 0;
  entregados.forEach(o => {
    (o.lines || []).forEach(l => {
      const prod = products.find(p => p.id === l.productId);
      const costo = prod?.precioCosto ? (+prod.precioCosto) : 0;
      totalCostoVendido += costo * (l.qty || 0);
    });
  });
  const gananciaBruta = ventasCobradas - totalCostoVendido;
  const margen = ventasCobradas > 0 ? (gananciaBruta / ventasCobradas * 100) : 0;

  const gastosHoy = gastos.filter(g => g.fecha === hoyStr);
  const totalGastosHoy = gastosHoy.reduce((s,g) => s + (+g.monto || 0), 0);
  const utilidadNeta = gananciaBruta - totalGastosHoy;

  // ── Fecha ─────────────────────────────────────────────────────
  const fechaEl = document.getElementById("dash-fecha-label");
  if (fechaEl) {
    const hoyDate = new Date();
    fechaEl.textContent = `Hoy, ${hoyDate.toLocaleDateString("es-MX",{day:"numeric",month:"long"})}`;
  }

  // ── KPIs ─────────────────────────────────────────────────────
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  // Formato compacto de moneda
  const fmt = n => n >= 1000 ? `$${(n/1000).toFixed(1)}K` : `$${n.toFixed(0)}`;

  set("dash-kpi-ventas",   fmt(ventasCobradas));
  const ventasBadge = document.getElementById("dash-kpi-ventas-badge");
  if (ventasBadge) ventasBadge.textContent = `↑ ${entregados.length} pedido${entregados.length!==1?"s":""} entregado${entregados.length!==1?"s":""}`;

  set("dash-kpi-ganancia", fmt(gananciaBruta));
  const margenBadge = document.getElementById("dash-kpi-margen-badge");
  if (margenBadge) margenBadge.textContent = `Margen ${margen.toFixed(0)}%`;

  set("dash-kpi-utilidad", `$${utilidadNeta.toLocaleString("es-MX",{minimumFractionDigits:2,maximumFractionDigits:2})}`);

  // Badge estado utilidad
  const uBadge = document.getElementById("dash-utilidad-badge");
  if (uBadge) {
    if (utilidadNeta > 0) { uBadge.textContent = "Óptimo"; uBadge.style.background="#DCFCE7"; uBadge.style.color="#15803D"; }
    else { uBadge.textContent = "En rojo"; uBadge.style.background="#FEE2E2"; uBadge.style.color="#B91C1C"; }
  }
  // Fletes / gastos label
  const fletesEl = document.getElementById("dash-fletes-label");
  if (fletesEl && totalGastosHoy > 0) fletesEl.textContent = `−$${totalGastosHoy.toFixed(0)} gastos`;
  else if (fletesEl) fletesEl.textContent = "";

  // Barra de utilidad (% del margen)
  const barEl = document.getElementById("dash-utilidad-bar");
  if (barEl) barEl.style.width = Math.min(100, Math.max(0, margen)) + "%";

  // Pedidos
  set("dash-kpi-pedidos",       ordersHoy.length);

  // ── Inventario crítico ──────────────────────────────────────
  const critList  = document.getElementById("dash-critical-list");
  const critCount = document.getElementById("dash-critical-count");
  const lowStock  = products.filter(p => (p.stock ?? 0) < 15).sort((a,b) => (a.stock??0) - (b.stock??0));

  if (critCount) critCount.textContent = `${lowStock.length} Urgente${lowStock.length!==1?"s":""}`;
  if (critList) {
    if (!lowStock.length) {
      critList.innerHTML = `<div class="empty-state" style="padding:1rem 0;"><p>Sin productos en nivel crítico. </p></div>`;
    } else {
      critList.innerHTML = lowStock.map(p => {
        const isCrit   = (p.stock ?? 0) < 5;
        const minSug   = 15;
        const stockCls = isCrit ? "crit" : "low";
        return `<div class="dash-critical-item">
          <div class="dash-critical-emoji">${p.emoji||""}</div>
          <div class="dash-critical-info">
            <div class="dash-critical-name">${esc(p.name)}</div>
            <div class="dash-critical-min">Mínimo requerido: ${minSug} ${esc(p.unit||"pzas")}</div>
            <div class="dash-critical-stock ${stockCls}">
              <span class="dash-critical-stock-dot"></span>
              Solo ${p.stock??0} ${esc(p.unit||"pzas")}
            </div>
          </div>
          <button class="dash-pedir-btn" onclick="toast('Orden de compra — próximamente')">Pedir OC</button>
        </div>`;
      }).join("");
    }
  }

  // ── Tabla de pedidos de hoy ───────────────────────────────
  const tbody = document.getElementById("dash-orders-tbody");
  if (tbody) {
    if (!ordersHoy.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--gray-400);padding:1.2rem 0;">Sin pedidos hoy.</td></tr>`;
    } else {
      const sorted = [...ordersHoy].sort((a,b) => {
        const da = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const db_ = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return db_ - da;
      });
      tbody.innerHTML = sorted.map(o => {
        const hora = o.createdAt?.toDate
          ? o.createdAt.toDate().toLocaleTimeString("es-MX", {hour:"2-digit", minute:"2-digit"})
          : "—";
        return `<tr>
          <td>
            <div class="order-folio">#${(o.id||"").slice(-6).toUpperCase()}</div>
            <div class="order-hora">${hora}</div>
          </td>
          <td>${esc(o.customerName||"—")}</td>
          <td>${esc(o.vendedorFolio||"—")}</td>
          <td class="order-amt">$${(+o.total||0).toFixed(2)}</td>
          <td><span class="badge badge-done">${o.status||"Entregado"}</span></td>
          <td><button class="dash-order-print-btn" onclick="printOneTicket('${o.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> Ticket</button></td>
        </tr>`;
      }).join("");
    }
  }
}
