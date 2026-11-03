// ════════════════════════════════════════════════════════════════
// CONTABILIDAD — CAJA
// ════════════════════════════════════════════════════════════════
let gastos = [];
let cajaPeriod = "hoy";

const GASTO_COLORS = {
  "Gasolina":            "#EF4444",
  "Compra de mercancía": "#3B82F6",
  "Salarios":            "#8B5CF6",
  "Renta":               "#F59E0B",
  "Mantenimiento":       "#10B981",
  "Servicios":           "#06B6D4",
  "Fletes":              "#F97316",
  "Empaques":            "#84CC16",
  "Otro":                "#6B7280",
};

// Escucha en tiempo real gastos desde Firebase
function initGastos() {
  if (!window._firebaseReady || !window._db) return;
  const { collection, onSnapshot } = window._fsLib;
  onSnapshot(collection(window._db, "gastos"), snap => {
    gastos = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                      .sort((a,b) => (b.fecha||"").localeCompare(a.fecha||""));
    renderCaja();
    if (currentSession?.role === "admin") renderAdminDashboard();
  });
}

function setCajaPeriod(p, btn) {
  cajaPeriod = p;
  document.querySelectorAll(".caja-tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("caja-rango-wrap").style.display = p === "rango" ? "" : "none";
  renderCaja();
}

function getCajaDateRange() {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  if (cajaPeriod === "hoy") {
    return { from: todayStr, to: todayStr };
  }
  if (cajaPeriod === "semana") {
    const dow = now.getDay(); // 0=dom
    const monday = new Date(now); monday.setDate(now.getDate() - ((dow+6)%7));
    return { from: monday.toISOString().slice(0,10), to: todayStr };
  }
  if (cajaPeriod === "mes") {
    return { from: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`, to: todayStr };
  }
  // rango
  const from = document.getElementById("caja-fecha-inicio").value;
  const to   = document.getElementById("caja-fecha-fin").value;
  return { from: from || todayStr, to: to || todayStr };
}

function inRange(dateStr, from, to) {
  if (!dateStr) return false;
  return dateStr >= from && dateStr <= to;
}

function renderCaja() {
  const { from, to } = getCajaDateRange();

  // ── Filtrar pedidos del período ──────────────────────────────
  const ordersInRange = orders.filter(o => {
    let d = "";
    if (o.createdAt?.toDate) {
      const dt = o.createdAt.toDate();
      d = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
    } else {
      d = o.fechaStr || "";
    }
    return inRange(d, from, to);
  });

  // Todo pedido registrado ya está entregado y cobrado, no hay "pendiente por cobrar".
  const ventasEntregadas = ordersInRange
    .reduce((s, o) => s + (+o.total || 0), 0);

  const numPedidos = ordersInRange.length;
  const numEntregados = numPedidos;

  // ── Filtrar gastos del período ───────────────────────────────
  const gastosInRange = gastos.filter(g => inRange(g.fecha, from, to));
  const totalGastos = gastosInRange.reduce((s, g) => s + (+g.monto || 0), 0);
  const utilidad = ventasEntregadas - totalGastos;

  // ── Ganancia bruta: ventas − costo de los productos ──────────
  let totalCostoVendido = 0;
  ordersInRange.forEach(o => {
    (o.lines || []).forEach(l => {
      const prod = products.find(p => p.id === l.productId);
      const costo = prod?.precioCosto ? (+prod.precioCosto) : 0;
      totalCostoVendido += costo * (l.qty || 0);
    });
  });
  const gananciaBruta = ventasEntregadas - totalCostoVendido;
  const utilidadNeta  = gananciaBruta - totalGastos;

  // ── KPIs ─────────────────────────────────────────────────────
  const margenBruto = ventasEntregadas > 0 ? (gananciaBruta / ventasEntregadas * 100) : 0;
  const kpiEl = document.getElementById("caja-kpis");
  kpiEl.innerHTML = `
    <div class="dash-kpi-card">
      <div class="dash-kpi-top">
        <span class="dash-kpi-label">Ventas<br>Cobradas</span>
        <div class="dash-kpi-icon-box green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
      </div>
      <div class="dash-kpi-value">$${ventasEntregadas.toFixed(2)}</div>
      <div class="dash-kpi-badge up">↑ ${numEntregados} pedido${numEntregados!==1?"s":""} entregado${numEntregados!==1?"s":""}</div>
    </div>
    <div class="dash-kpi-card">
      <div class="dash-kpi-top">
        <span class="dash-kpi-label">Total<br>Gastos</span>
        <div class="dash-kpi-icon-box red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 2h16v20l-3-2-3 2-3-2-3 2-3-2-1 1z"/><line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="8" y1="15" x2="12" y2="15"/></svg></div>
      </div>
      <div class="dash-kpi-value">$${totalGastos.toFixed(2)}</div>
      <div class="dash-kpi-badge gray">${gastosInRange.length} egreso${gastosInRange.length!==1?"s":""}</div>
    </div>
    <div class="dash-kpi-card">
      <div class="dash-kpi-top">
        <span class="dash-kpi-label">Ganancia<br>Bruta</span>
        <div class="dash-kpi-icon-box purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>
      </div>
      <div class="dash-kpi-value">$${gananciaBruta.toFixed(2)}</div>
      <div class="dash-kpi-badge gray">Margen ${margenBruto.toFixed(0)}%</div>
    </div>
    <div class="dash-kpi-card">
      <div class="dash-kpi-top">
        <span class="dash-kpi-label">Utilidad<br>Neta</span>
        <div class="dash-kpi-icon-box ${utilidadNeta >= 0 ? "blue" : "red"}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="21" x2="21" y2="21"/><line x1="5" y1="21" x2="5" y2="10"/><line x1="19" y1="21" x2="19" y2="10"/><polygon points="12 3 3 8 21 8"/><line x1="9" y1="21" x2="9" y2="10"/><line x1="15" y1="21" x2="15" y2="10"/></svg></div>
      </div>
      <div class="dash-kpi-value">
        ${utilidadNeta >= 0 ? "" : "−"}$${Math.abs(utilidadNeta).toFixed(2)}
      </div>
      <div class="dash-kpi-badge ${utilidadNeta >= 0 ? "up" : ""}" style="${utilidadNeta < 0 ? "background:#FEE2E2;color:#B91C1C;" : ""}">${utilidadNeta >= 0 ? "Óptimo" : "En rojo"}</div>
    </div>`;

  // ── Resumen detallado ─────────────────────────────────────────
  // Gastos por categoría
  const porCat = {};
  gastosInRange.forEach(g => {
    porCat[g.categoria] = (porCat[g.categoria] || 0) + (+g.monto || 0);
  });

  const resumenEl = document.getElementById("caja-resumen");

  // ── Tarjetas narrativas (estilo Stitch) ─────────────────────
  const topCat = Object.entries(porCat).sort((a,b) => b[1]-a[1])[0];
  const utilOk = utilidadNeta >= 0;
  resumenEl.innerHTML = `
    <div class="resumen-highlight-grid">
      <div class="resumen-highlight-card">
        <div class="resumen-highlight-label">Ventas &amp; Pedidos</div>
        <div class="resumen-highlight-headline">${numEntregados} pedido${numEntregados!==1?"s":""} entregado${numEntregados!==1?"s":""}</div>
        <div class="resumen-highlight-desc">Generación de $${ventasEntregadas.toFixed(2)} en cobro directo de mercancía a tiendas.</div>
      </div>
      <div class="resumen-highlight-card">
        <div class="resumen-highlight-label">Gastos Operativos</div>
        <div class="resumen-highlight-headline">${gastosInRange.length} gasto${gastosInRange.length!==1?"s":""} registrado${gastosInRange.length!==1?"s":""}</div>
        <div class="resumen-highlight-desc">Deducción de $${totalGastos.toFixed(2)}${topCat ? ` en gastos del período, principalmente en ${esc(topCat[0])}` : " en gastos del período"}.</div>
      </div>
      <div class="resumen-highlight-card">
        <div class="resumen-highlight-label">Rendimiento Operativo</div>
        <div class="resumen-highlight-headline">${utilOk ? "" : "−"}$${Math.abs(utilidadNeta).toFixed(2)} MXN
          <span class="dash-kpi-badge ${utilOk ? "up" : ""}" style="${utilOk ? "" : "background:#FEE2E2;color:#B91C1C;"}margin-left:.4rem;">${utilOk ? "Óptimo" : "En rojo"}</span>
        </div>
        <div class="resumen-highlight-desc">Utilidad final tras descontar $${totalCostoVendido.toFixed(2)} en costo de mercancía y $${totalGastos.toFixed(2)} en gastos operativos.</div>
      </div>
    </div>`;

  // ── Gastos por categoría: tarjetas con barra de progreso ─────
  const chartEl = document.getElementById("caja-gastos-chart");
  if (!Object.keys(porCat).length) {
    chartEl.innerHTML = `<div class="empty-state" style="padding:.5rem 0"><p>Sin gastos en este período.</p></div>`;
  } else {
    chartEl.innerHTML = `<div class="gastocat-grid">` + Object.entries(porCat)
      .sort((a,b) => b[1]-a[1])
      .map(([cat, amt]) => {
        const pct = totalGastos > 0 ? (amt/totalGastos*100) : 0;
        const color = GASTO_COLORS[cat] || "#6B7280";
        return `<div class="gastocat-card">
          <div class="gastocat-top">
            <span class="gastocat-name">${esc(cat)}</span>
            <span class="gastocat-amt">$${amt.toFixed(2)}</span>
          </div>
          <div class="gastocat-track">
            <div class="gastocat-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div>
          </div>
          <div class="gastocat-pct">${pct.toFixed(1)}% del total</div>
        </div>`;
      }).join("") + `</div>`;
  }

  // ── Lista de gastos ───────────────────────────────────────────
  const listEl = document.getElementById("gastos-list");
  if (!gastosInRange.length) {
    listEl.innerHTML = `<div class="empty-state"><p>Sin gastos en este período.</p></div>`;
    return;
  }
  listEl.innerHTML = gastosInRange.map(g => {
    const color = GASTO_COLORS[g.categoria] || "#6B7280";
    return `<div class="gasto-item">
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap;">
          <span class="gasto-cat-pill" style="background:${color}1A;color:${color};">${esc(g.categoria)}</span>
          <span class="gasto-meta">${g.fecha}${g.responsable ? " · "+esc(g.responsable) : ""}</span>
        </div>
        <div class="gasto-desc">${esc(g.descripcion || g.categoria)}</div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div class="gasto-amount">−$${(+g.monto).toFixed(2)}</div>
        <button class="gasto-del-btn" style="margin-top:.3rem;" onclick="deleteGasto('${g.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button>
      </div>
    </div>`;
  }).join("");
}

async function addGasto() {
  const cat    = document.getElementById("gasto-cat").value;
  const monto  = parseFloat(document.getElementById("gasto-monto").value);
  const desc   = document.getElementById("gasto-desc").value.trim();
  const hoy    = new Date();
  const localDate = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;
  const fecha  = document.getElementById("gasto-fecha").value || localDate;
  const resp   = document.getElementById("gasto-resp").value.trim();

  if (!cat || isNaN(monto) || monto <= 0) { toast("Categoría y monto son requeridos"); return; }

  const gasto = { categoria: cat, monto, descripcion: desc, fecha, responsable: resp };

  // Agregar al array local siempre para respuesta inmediata
  const localId = "g-" + Date.now();
  gastos.unshift({ id: localId, ...gasto });
  renderCaja();

  // Persistir en Firebase si está conectado
  try {
    if (window._db && window._firebaseReady) {
      const { collection, addDoc, serverTimestamp } = window._fsLib;
      const ref = await addDoc(collection(window._db, "gastos"), { ...gasto, createdAt: serverTimestamp() });
      // Reemplazar id local por el de Firebase
      const idx = gastos.findIndex(g => g.id === localId);
      if (idx >= 0) gastos[idx].id = ref.id;
    }
  } catch(e) { console.warn("addGasto Firebase error:", e); }

  // Limpiar form
  document.getElementById("gasto-monto").value = "";
  document.getElementById("gasto-desc").value  = "";
  document.getElementById("gasto-resp").value  = "";
  toast("Gasto registrado");
}

async function deleteGasto(id) {
  confirmModal({
    title: "¿Eliminar gasto?",
    msg: "Esta acción no se puede deshacer.",
    confirmLabel: "Sí, eliminar",
    onConfirm: async () => {
      gastos = gastos.filter(g => g.id !== id);
      renderCaja();
      try {
        if (window._db && window._firebaseReady) {
          const { doc, deleteDoc } = window._fsLib;
          await deleteDoc(doc(window._db, "gastos", id));
        }
      } catch(e) { console.warn("deleteGasto Firebase error:", e); }
      toast("Gasto eliminado");
    }
  });
}
