
let rendPeriod = "semana";

function setRendPeriod(p, btn) {
  rendPeriod = p;
  document.querySelectorAll("#rend-period-tabs .caja-tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("rend-rango-wrap").style.display = p === "rango" ? "" : "none";
  renderRendimiento();
}

function getRendDateRange() {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  if (rendPeriod === "hoy") return { from: todayStr, to: todayStr };
  if (rendPeriod === "semana") {
    const dow = now.getDay(); // 0=domingo
    const monday = new Date(now); monday.setDate(now.getDate() - ((dow+6)%7));
    return { from: monday.toISOString().slice(0,10), to: todayStr };
  }
  if (rendPeriod === "mes") {
    return { from: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`, to: todayStr };
  }
  if (rendPeriod === "todo") {
    return { from: "2000-01-01", to: todayStr };
  }
  // rango
  const from = document.getElementById("rend-fecha-inicio").value;
  const to   = document.getElementById("rend-fecha-fin").value;
  return { from: from || todayStr, to: to || todayStr };
}

const RENDIMIENTO_PERIODO_LABELS = { hoy: "Hoy", semana: "Esta semana", mes: "Este mes", todo: "Todo el historial" };

function renderRendimiento() {
  const { from, to } = getRendDateRange();

  // Fecha label
  const fechaEl = document.getElementById("rend-fecha-label");
  if (fechaEl) {
    fechaEl.textContent = RENDIMIENTO_PERIODO_LABELS[rendPeriod] || `${from} → ${to}`;
  }

  // Pedidos del período seleccionado (antes era solo "hoy")
  const pedidosPeriodo = orders.filter(o => {
    let d = "";
    if (o.createdAt?.toDate) {
      const dt = o.createdAt.toDate();
      d = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
    } else {
      d = o.fechaStr || "";
    }
    return inRange(d, from, to);
  });

  // Agrupar por vendedor
  const byVend = {};
  pedidosPeriodo.forEach(o => {
    const key   = o.vendedorId || "__sin__";
    const label = o.vendedorFolio ? `${o.vendedorFolio}` : "Sin folio";
    const nombre = o.vendedorNombre || "Sin asignar";
    if (!byVend[key]) byVend[key] = { id: key, folio: label, nombre, total: 0, pedidos: [], tiendas: new Set(), productos: {} };
    byVend[key].total += +o.total || 0;
    byVend[key].pedidos.push(o);
    byVend[key].tiendas.add(o.customerName);
    (o.lines||[]).forEach(l => {
      byVend[key].productos[l.name] = (byVend[key].productos[l.name]||0) + (l.qty||0);
    });
  });

  const vendList = Object.values(byVend).sort((a,b) => b.total - a.total);
  const maxTotal = vendList[0]?.total || 1;
  const totalEquipo  = pedidosPeriodo.reduce((s,o) => s + (+o.total||0), 0);
  const totalTiendas = new Set(pedidosPeriodo.map(o => o.customerName)).size;

  // KPIs globales
  const fmt = n => n >= 1000 ? `$${(n/1000).toFixed(1)}K` : `$${n.toFixed(0)}`;
  const s = (id,v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  s("rend-total-hoy",     fmt(totalEquipo));
  s("rend-total-pedidos", pedidosPeriodo.length);
  s("rend-total-tiendas", totalTiendas);

  // ── Ranking global de productos más vendidos hoy ────────────
  const prodTotales = {}; // name -> { qty, monto, emoji }
  pedidosPeriodo.forEach(o => {
    (o.lines||[]).forEach(l => {
      if (!prodTotales[l.name]) prodTotales[l.name] = { qty: 0, monto: 0, emoji: l.emoji || "📦" };
      prodTotales[l.name].qty   += (+l.qty || 0);
      prodTotales[l.name].monto += (+l.subtotal || 0);
    });
  });
  const topProductos = Object.entries(prodTotales).sort((a,b) => b[1].qty - a[1].qty).slice(0, 15);
  const prodEl = document.getElementById("rend-top-productos");
  if (prodEl) {
    prodEl.innerHTML = !topProductos.length
      ? `<div class="empty-state" style="padding:.5rem 0;"><p>Sin ventas en este período.</p></div>`
      : topProductos.map(([name, d], i) => `
        <div class="rank-row">
          <div class="rank-badge ${i===0?"top1":""}">${i+1}</div>
          <div style="flex:1;min-width:0;">
            <div class="rank-row-name">${d.emoji} ${esc(name)}</div>
            <div class="rank-row-meta">${d.qty} unidades vendidas</div>
          </div>
          <div class="rank-row-amt">$${d.monto.toFixed(2)}</div>
        </div>`).join("");
  }

  // ── Ranking global de tiendas que más compran hoy ───────────
  const tiendaTotales = {}; // customerName -> { monto, pedidos }
  pedidosPeriodo.forEach(o => {
    const key = o.customerName || "Sin nombre";
    if (!tiendaTotales[key]) tiendaTotales[key] = { monto: 0, pedidos: 0 };
    tiendaTotales[key].monto   += (+o.total || 0);
    tiendaTotales[key].pedidos += 1;
  });
  const todasTiendas = Object.entries(tiendaTotales).sort((a,b) => b[1].monto - a[1].monto);
  const top5Tiendas  = todasTiendas.slice(0, 5);
  const tiendaEl = document.getElementById("rend-top-tiendas");
  if (tiendaEl) {
    tiendaEl.innerHTML = !todasTiendas.length
      ? `<div class="empty-state" style="padding:.5rem 0;"><p>Sin ventas en este período.</p></div>`
      : todasTiendas.map(([name, d]) => {
        const ticketProm = d.monto / d.pedidos;
        return `<div class="rank-row">
          <div class="customer-avatar" style="width:26px;height:26px;font-size:.7rem;">${name.charAt(0).toUpperCase()}</div>
          <div style="flex:1;min-width:0;">
            <div class="rank-row-name">${esc(name)}</div>
            <div class="rank-row-meta">${d.pedidos} pedido${d.pedidos!==1?"s":""} en el período</div>
          </div>
          <div>
            <div class="rank-row-amt">$${d.monto.toFixed(2)}</div>
            <div class="rank-row-sub">Ticket: $${ticketProm.toFixed(2)}</div>
          </div>
        </div>`;
      }).join("");
  }

  const concEl = document.getElementById("rend-concentracion-row");
  if (concEl) {
    if (top5Tiendas.length && totalEquipo > 0) {
      const top5Monto = top5Tiendas.reduce((s,[,d]) => s + d.monto, 0);
      const pctConc = (top5Monto / totalEquipo * 100).toFixed(1);
      concEl.style.display = "flex";
      concEl.innerHTML = `<span class="resumen-label">Concentración cartera Top 5</span><span class="resumen-val">${pctConc}% de la venta del período</span>`;
    } else {
      concEl.style.display = "none";
    }
  }

  // Cards
  const el = document.getElementById("rend-vendedores-list");
  if (!el) return;

  if (!vendList.length) {
    el.innerHTML = `<div class="rend-sin-pedidos">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28" height="28" style="color:var(--gray-300);margin-bottom:.5rem;"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <div>Sin pedidos registrados en este período.</div>
    </div>`;
    return;
  }

  const medals = ["gold","silver","bronze"];

  el.innerHTML = vendList.map((v, i) => {
    const pct      = Math.round((v.total / maxTotal) * 100);
    const avgTicket = v.pedidos.length ? v.total / v.pedidos.length : 0;
    const topProd  = Object.entries(v.productos).sort((a,b)=>b[1]-a[1])[0];
    const avatarCls = medals[i] || "";
    const initial  = (v.nombre || "V").charAt(0).toUpperCase();
    const cardId   = `rend-card-${v.id.replace(/[^a-z0-9]/gi,"")}`;
    const listId   = `rend-list-${v.id.replace(/[^a-z0-9]/gi,"")}`;

    const pedidosRows = v.pedidos.map(o => {
      const dt = o.createdAt?.toDate ? o.createdAt.toDate() : null;
      const hora = dt ? dt.toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}) : "—";
      return `<div class="rend-pedido-row">
        <span class="rend-pedido-tienda">${esc(o.customerName)}</span>
        <span class="rend-pedido-hora">${hora}</span>
        <span class="rend-pedido-amt">$${(+o.total).toFixed(2)}</span>
      </div>`;
    }).join("");

    return `<div class="rend-vend-card" id="${cardId}">
      <div class="rend-vend-head">
        <div class="rend-vend-avatar ${avatarCls}">${initial}</div>
        <div style="min-width:0;">
          <div class="rend-vend-name">${esc(v.nombre)}</div>
          <div class="rend-vend-folio">${esc(v.folio)}</div>
        </div>
        <div class="rend-vend-total">
          <div class="rend-vend-total-amt">${fmt(v.total)}</div>
          <div class="rend-vend-total-sub">${pct}% del equipo</div>
        </div>
      </div>
      <div class="rend-vend-stats">
        <div class="rend-vend-stat">
          <div class="rend-vend-stat-val">${v.pedidos.length}</div>
          <div class="rend-vend-stat-label">Pedidos</div>
        </div>
        <div class="rend-vend-stat">
          <div class="rend-vend-stat-val">${v.tiendas.size}</div>
          <div class="rend-vend-stat-label">Tiendas</div>
        </div>
        <div class="rend-vend-stat">
          <div class="rend-vend-stat-val">${fmt(avgTicket)}</div>
          <div class="rend-vend-stat-label">Ticket prom.</div>
        </div>
      </div>
      <div class="rend-vend-bar-wrap">
        <div class="rend-vend-bar" style="width:${pct}%;"></div>
      </div>
      <div class="rend-vend-footer">
        <span class="rend-vend-top-prod">
          ${topProd ? `${esc(topProd[0])} ×${topProd[1]}` : "Sin productos registrados"}
        </span>
        <button class="rend-vend-toggle" onclick="toggleRendPedidos('${listId}', this)">
          Ver pedidos ▾
        </button>
      </div>
      <div class="rend-pedidos-list" id="${listId}">
        ${pedidosRows || `<div style="color:var(--gray-400);font-size:.75rem;padding:.3rem 0;">Sin pedidos.</div>`}
      </div>
    </div>`;
  }).join("");
}

function toggleRendPedidos(listId, btn) {
  const el = document.getElementById(listId);
  if (!el) return;
  const isOpen = el.classList.toggle("open");
  btn.textContent = isOpen ? "Ocultar ▴" : "Ver pedidos ▾";
}
