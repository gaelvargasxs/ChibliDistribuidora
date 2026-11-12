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

  // ── Gastos por categoría ─────────────────────────────────────
  const porCat = {};
  gastosInRange.forEach(g => {
    porCat[g.categoria] = (porCat[g.categoria] || 0) + (+g.monto || 0);
  });

  // ── Fila única de 4 Tarjetas Financieras (idénticas a las de Inventario) ──
  const margenBruto = ventasEntregadas > 0 ? (gananciaBruta / ventasEntregadas * 100) : 0;
  const utilOk = utilidadNeta >= 0;
  const fmtMoney = n => Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const kpiEl = document.getElementById("caja-kpis");
  kpiEl.innerHTML = `
    <div class="dash-kpi-card">
      <div class="dash-kpi-top">
        <span class="dash-kpi-label">Ventas Cobradas</span>
        <div class="dash-kpi-icon-box green">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="1" y="3" width="15" height="13" rx="2"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
            <circle cx="5.5" cy="18.5" r="2.5"/>
            <circle cx="18.5" cy="18.5" r="2.5"/>
          </svg>
        </div>
      </div>
      <div class="dash-kpi-value">$${fmtMoney(ventasEntregadas)}</div>
      <div class="dash-kpi-badge up">↑ ${numEntregados} pedido${numEntregados!==1?"s":""} entregado${numEntregados!==1?"s":""}</div>
    </div>

    <div class="dash-kpi-card">
      <div class="dash-kpi-top">
        <span class="dash-kpi-label">Ganancia Bruta</span>
        <div class="dash-kpi-icon-box amber">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </div>
      </div>
      <div class="dash-kpi-value">$${fmtMoney(gananciaBruta)}</div>
      <div class="dash-kpi-badge" style="background:#FEF3C7;color:#92400E;">Margen ${margenBruto.toFixed(0)}%</div>
    </div>

    <div class="dash-kpi-card">
      <div class="dash-kpi-top">
        <span class="dash-kpi-label">Gastos Operativos</span>
        <div class="dash-kpi-icon-box red">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 2h16v20l-3-2-3 2-3-2-3 2-3-2-1 1z"/>
            <line x1="8" y1="7" x2="16" y2="7"/>
            <line x1="8" y1="11" x2="16" y2="11"/>
            <line x1="8" y1="15" x2="12" y2="15"/>
          </svg>
        </div>
      </div>
      <div class="dash-kpi-value">$${fmtMoney(totalGastos)}</div>
      <div class="dash-kpi-badge" style="background:#FEE2E2;color:#B91C1C;">${gastosInRange.length} gasto${gastosInRange.length!==1?"s":""} registrado${gastosInRange.length!==1?"s":""}</div>
    </div>

    <div class="dash-kpi-card">
      <div class="dash-kpi-top">
        <span class="dash-kpi-label">Utilidad Neta</span>
        <div class="dash-kpi-icon-box purple">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v12M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1.1-3 2.5 1.3 2.5 3 2.5 3 1.1 3 2.5-1.3 2.5-3 2.5-3-1.1-3-2.5"/>
          </svg>
        </div>
      </div>
      <div class="dash-kpi-value">$${fmtMoney(Math.abs(utilidadNeta))}</div>
      <div class="dash-kpi-badge ${utilOk ? "up" : ""}" style="${utilOk ? "" : "background:#FEE2E2;color:#B91C1C;"}">${utilOk ? "Óptimo · libre en caja" : "En rojo"}</div>
    </div>`;

  const catKeys = Object.keys(porCat);
  const catBadgeEl = document.getElementById("caja-cat-badge");
  if (catBadgeEl) catBadgeEl.textContent = `${catKeys.length} categoría${catKeys.length !== 1 ? "s" : ""}`;

  const listBadgeEl = document.getElementById("caja-list-badge");
  if (listBadgeEl) listBadgeEl.textContent = `${gastosInRange.length} registro${gastosInRange.length !== 1 ? "s" : ""}`;

  // ── Gastos por categoría: tarjetas compactas con barra ────────
  const chartEl = document.getElementById("caja-gastos-chart");
  if (!catKeys.length) {
    chartEl.innerHTML = `<div class="caja-empty-box">
      <div class="caja-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg></div>
      <div class="caja-empty-title">Sin egresos por categoría</div>
      <div class="caja-empty-sub">Registra un gasto para ver su distribución porcentual.</div>
    </div>`;
  } else {
    chartEl.innerHTML = `<div class="caja-cat-list">` + Object.entries(porCat)
      .sort((a,b) => b[1]-a[1])
      .map(([cat, amt]) => {
        const pct = totalGastos > 0 ? (amt/totalGastos*100) : 0;
        const color = GASTO_COLORS[cat] || "#6B7280";
        return `<div class="caja-cat-row">
          <div class="caja-cat-row-top">
            <div class="caja-cat-name-wrap">
              <span class="caja-cat-dot" style="background:${color};"></span>
              <span class="caja-cat-name">${esc(cat)}</span>
              <span class="caja-cat-pct-pill" style="background:${color}18;color:${color};">${pct.toFixed(0)}%</span>
            </div>
            <span class="caja-cat-amt">$${fmtMoney(amt)}</span>
          </div>
          <div class="caja-cat-bar-track">
            <div class="caja-cat-bar-fill" style="width:${pct.toFixed(1)}%;background:${color};"></div>
          </div>
        </div>`;
      }).join("") + `</div>`;
  }

  // ── Lista de gastos: diseño tipo estado de cuenta SaaS ────────
  const listEl = document.getElementById("gastos-list");
  if (!gastosInRange.length) {
    listEl.innerHTML = `<div class="caja-empty-box">
      <div class="caja-empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="22" height="22"><path d="M4 2h16v20l-3-2-3 2-3-2-3 2-3-2-1 1z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/></svg></div>
      <div class="caja-empty-title">Sin gastos registrados</div>
      <div class="caja-empty-sub">No hay salidas de efectivo en el período seleccionado.</div>
    </div>`;
    return;
  }
  listEl.innerHTML = `<div class="caja-tx-list">` + gastosInRange.map(g => {
    const color = GASTO_COLORS[g.categoria] || "#6B7280";
    const titulo = g.descripcion ? esc(g.descripcion) : esc(g.categoria);
    return `<div class="caja-tx-row">
      <div class="caja-tx-icon" style="background:${color}16;color:${color};">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <path d="M4 2h16v20l-3-2-3 2-3-2-3 2-3-2-1 1z"/>
          <line x1="8" y1="9" x2="16" y2="9"/>
          <line x1="8" y1="13" x2="13" y2="13"/>
        </svg>
      </div>
      <div class="caja-tx-info">
        <div class="caja-tx-title">${titulo}</div>
        <div class="caja-tx-meta">
          <span class="caja-tx-cat-badge" style="background:${color}16;color:${color};">${esc(g.categoria)}</span>
          <span>${esc(g.fecha || "")}</span>
          ${g.responsable ? `<span>· Resp: <strong>${esc(g.responsable)}</strong></span>` : ""}
        </div>
      </div>
      <div class="caja-tx-right">
        <span class="caja-tx-amount">$${fmtMoney(+g.monto)}</span>
        <button class="caja-tx-del-btn" onclick="deleteGasto('${g.id}')" title="Eliminar gasto" aria-label="Eliminar gasto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
        </button>
      </div>
    </div>`;
  }).join("") + `</div>`;
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
  if (typeof renderAdminDashboard === "function") renderAdminDashboard();
  toggleGastoForm(false);
  toast("Gasto registrado");
}

function toggleGastoForm(targetSlot) {
  const card = document.getElementById("gasto-collapsible-card");
  if (!card) return;

  if (targetSlot === false) {
    card.style.display = "none";
    return;
  }

  const slotId = targetSlot === "dashboard" ? "gasto-slot-dashboard" : "gasto-slot-caja";
  const slot = document.getElementById(slotId);
  if (!slot) return;

  const isSameSlot = card.parentElement === slot;
  const isOpen = card.style.display !== "none";

  if (isSameSlot && isOpen) {
    card.style.display = "none";
    return;
  }

  slot.appendChild(card);
  const fechaEl = document.getElementById("gasto-fecha");
  if (fechaEl && !fechaEl.value && typeof getHoyStr === "function") {
    fechaEl.value = getHoyStr();
  }
  card.style.display = "block";
  setTimeout(() => {
    document.getElementById("gasto-monto")?.focus();
  }, 80);
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
