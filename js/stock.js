// ════════════════════════════════════════════════════════════════
// ADMIN — STOCK LIST
// ════════════════════════════════════════════════════════════════
function renderInventarioKPIs() {
  const el = document.getElementById("inventario-kpis");
  if (!el) return;

  const total = products.length;
  const conStock = products.filter(p => (p.stock ?? 0) > 0).length;
  const pctDisponible = total > 0 ? (conStock / total * 100) : 0;

  const critico = products.filter(p => (p.stock ?? 0) < 15).length;
  const pendientes = products.filter(p => p.pesado).length;

  const valorInventario = products.reduce((s,p) => s + ((p.stock||0) * (+p.precioCosto||0)), 0);

  const valorFmt = valorInventario.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  el.innerHTML = `
    <div class="dash-kpi-card">
      <div class="dash-kpi-top">
        <span class="dash-kpi-label">Productos Activos</span>
        <div class="dash-kpi-icon-box green"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
      </div>
      <div class="dash-kpi-value">${total}</div>
      <div class="dash-kpi-badge up">${pctDisponible.toFixed(1)}% disponibilidad</div>
    </div>
    <div class="dash-kpi-card">
      <div class="dash-kpi-top">
        <span class="dash-kpi-label">Stock Crítico / Cero</span>
        <div class="dash-kpi-icon-box red"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.98 1.61h9.72a2 2 0 001.98-1.61L23 6H6"/></svg></div>
      </div>
      <div class="dash-kpi-value">${critico}</div>
      <div class="dash-kpi-badge" style="background:#FEE2E2;color:#B91C1C;">${critico ? "Requiere reorden" : "Todo en orden"}</div>
    </div>
    <div class="dash-kpi-card">
      <div class="dash-kpi-top">
        <span class="dash-kpi-label">Pendientes de Verificación</span>
        <div class="dash-kpi-icon-box amber"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
      </div>
      <div class="dash-kpi-value">${pendientes}</div>
      <div class="dash-kpi-badge" style="background:#FEF3C7;color:#92400E;">Producto pesado</div>
    </div>
    <div class="dash-kpi-card">
      <div class="dash-kpi-top">
        <span class="dash-kpi-label">Valor del Inventario</span>
        <div class="dash-kpi-icon-box purple"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1.1-3 2.5 1.3 2.5 3 2.5 3 1.1 3 2.5-1.3 2.5-3 2.5-3-1.1-3-2.5"/></svg></div>
      </div>
      <div class="dash-kpi-value">$${valorFmt}</div>
      <div class="dash-kpi-badge gray">a costo de compra</div>
    </div>`;
}

const DEFAULT_BOX_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2L3 6.5V17.5L12 22L21 17.5V6.5L12 2Z" fill="#E5B887" stroke="#475569" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M3 6.5L12 11L21 6.5" stroke="#475569" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M12 11V22" stroke="#475569" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M7.5 4.25L16.5 8.75V12.2L14 13.4V9.9L5 5.45L7.5 4.25Z" fill="#DC2626" opacity="0.85"/>
</svg>`;

function stepStockEdit(productId, delta) {
  const inp = document.getElementById(`stock-edit-${productId}`);
  if (!inp) return;
  const cur = parseInt(inp.value, 10) || 0;
  inp.value = Math.max(0, cur + delta);
}

function renderStockList() {
  renderInventarioKPIs();
  const el = document.getElementById("stock-list");
  renderStockToolbar();
  const view = getStockView();
  if (!view.length) {
    el.innerHTML = `<div class="empty-state">
      <p>${products.length ? `Sin resultados${stockQuery ? ` para «${esc(stockQuery)}»` : ""}.` : "Sin productos aún."}</p>
      ${products.length ? `<button class="btn btn-secondary btn-sm" style="margin-top:.6rem;" onclick="resetStockFilters()">Limpiar filtros</button>` : ""}
    </div>`;
    renderStockAlert();
    return;
  }
  const shown = view.slice(0, stockLimit);
  const restantes = view.length - shown.length;
  const moreBtn = restantes > 0
    ? `<button class="btn btn-secondary inv-more" onclick="showMoreStock()">Mostrar ${Math.min(restantes, STOCK_PAGE)} más · ${restantes} restantes</button>`
    : "";

  el.innerHTML = shown.map(p => {
    const stockVal = p.stock ?? 0;
    const isLow = stockVal > 0 && stockVal < 15;
    const isOut = stockVal === 0;
    const stateCls = isOut ? "out" : isLow ? "low" : "ok";
    const cardCls  = isOut ? "is-out" : isLow ? "is-low" : "";

    const unitStr  = p.unit ? esc(p.unit) : "";
    const cajasStr = parseInt(p.piezas) > 0 ? `${p.piezas} pzas/caja` : "";
    const presStr  = [unitStr, cajasStr].filter(Boolean).join(" · ");
    const catStr   = p.category ? esc(p.category) : "";
    const metaParts = [presStr, catStr].filter(Boolean).join(" • ");

    const statusTxt = isOut ? "Sin Stock" : isLow ? "Stock Bajo" : "En Stock";
    const barColor  = isOut ? "#EF4444" : isLow ? "#F59E0B" : "#10B981";
    const maxRef    = Math.max(60, stockVal > 60 ? Math.ceil(stockVal / 50) * 50 : 60);
    const barPct    = isOut ? 4 : Math.max(8, Math.min(100, (stockVal / maxRef) * 100));

    const capTitle = isOut
      ? "Sin existencias"
      : isLow
      ? "Requiere pedido"
      : stockVal >= 50
      ? "Capacidad óptima"
      : "Nivel Normal";
    const capSub = isLow || isOut
      ? "Mínimo sugerido: 15"
      : `Mín: 15 | Máx: ${maxRef}`;

    const costoNum = +p.precioCosto || 0;
    const ventaNum = +p.price || 0;
    const ganNum   = ventaNum - costoNum;
    const ganPct   = ventaNum > 0 && costoNum > 0 ? ((ganNum / ventaNum) * 100).toFixed(1) : null;

    return `
    <div class="stock-card-pro ${cardCls}">
      <div class="sc-header">
        <div class="sc-icon-box">${p.emoji ? esc(p.emoji) : DEFAULT_BOX_SVG}</div>
        <div class="sc-title-wrap">
          <div class="sc-title-row">
            <span class="sc-prod-name">${hlText(p.name)}</span>
            <span class="sc-status-pill ${stateCls}">${statusTxt}</span>
            ${p.pesado ? `<span class="stock-low-badge" style="background:#FEF3C7;color:#92400E;border-color:#F59E0B;">Pesado</span>` : ""}
          </div>
          ${metaParts ? `<div class="sc-meta-row">${metaParts}</div>` : ""}
        </div>
      </div>

      <div class="sc-body-grid">
        <div class="sc-stock-col">
          <div class="sc-stock-head">
            <div>
              <div class="sc-stock-label ${stateCls}">STOCK ACTUAL${isLow ? " (CRÍTICO)" : isOut ? " (AGOTADO)" : ""}</div>
              <div class="sc-stock-value-row">
                <span class="sc-stock-num" style="${isLow || isOut ? "color:" + barColor : ""}">${stockVal}</span>
                <span class="sc-stock-unit">piezas</span>
              </div>
            </div>
            <div class="sc-stock-cap">
              <span class="sc-stock-cap-status ${stateCls}">${capTitle}</span>
              <span class="sc-stock-cap-min">${capSub}</span>
            </div>
          </div>
          <div class="sc-progress-track">
            <div class="sc-progress-fill" style="width:${barPct}%;background:${barColor};"></div>
          </div>
        </div>

        <div class="sc-price-box">
          <div class="sc-price-box-title">PRECIOS &amp; MARGEN DE GANANCIA</div>
          <div class="sc-price-cols">
            <div>
              <div class="sc-price-col-label">Costo unitario</div>
              <div class="sc-price-col-val">${costoNum > 0 ? `$${costoNum.toFixed(2)}` : "—"}</div>
            </div>
            <div>
              <div class="sc-price-col-label">Precio de venta</div>
              <div class="sc-price-col-val">$${ventaNum.toFixed(2)}</div>
            </div>
            <div>
              <div class="sc-price-col-label green">Margen neto</div>
              <div class="sc-price-col-val ${ganNum >= 0 ? "green" : ""}">
                ${costoNum > 0 ? `${ganNum >= 0 ? "+" : ""}$${ganNum.toFixed(2)}` : "—"}
                ${ganPct !== null ? `<span class="sc-margin-pill ${ganNum < 0 ? "neg" : ""}">(${ganPct}%)</span>` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="sc-footer">
        <div class="sc-actions-left">
          <span class="sc-quick-label">Ajuste rápido:</span>
          <div class="sc-stepper">
            <button type="button" class="sc-step-btn" onclick="stepStockEdit('${p.id}', -1)" title="Restar 1">−</button>
            <input type="number" id="stock-edit-${p.id}" value="${stockVal}" min="0"
                   onkeydown="if(event.key==='Enter')saveStock('${p.id}')" />
            <button type="button" class="sc-step-btn" onclick="stepStockEdit('${p.id}', 1)" title="Sumar 1">+</button>
          </div>
          <button type="button" class="sc-save-btn" onclick="saveStock('${p.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="14" height="14"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Guardar
          </button>
        </div>

        <div class="sc-actions-right">
          <div class="sc-switch-wrap" onclick="togglePesado('${p.id}')" title="Marcar/Desmarcar como producto pesado (pendiente verificación)">
            <span class="sc-switch-label">Carga pesada</span>
            <button type="button" class="sc-switch ${p.pesado ? "on" : ""}" aria-label="Carga pesada"></button>
          </div>
          <div class="sc-divider-v"></div>
          <button type="button" class="sc-del-btn" onclick="deleteProduct('${p.id}')" title="Eliminar producto">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </div>
    </div>`;
  }).join("") + moreBtn;
  renderStockAlert();
}

// ── Marcar/desmarcar producto como "pendiente" (pesado) ───────
async function togglePesado(productId) {
  const p = products.find(pr => pr.id === productId);
  if (!p) return;
  p.pesado = !p.pesado;
  renderStockList();

  try {
    if (window._db && window._firebaseReady) {
      const { doc, updateDoc } = window._fsLib;
      await updateDoc(doc(window._db, "products", productId), { pesado: p.pesado });
    }
  } catch(e) { console.warn("togglePesado Firebase error:", e); }
  toast(p.pesado ? "Marcado como pendiente" : "Quitado de pendientes");
}

// ── Guardar cambio de stock / precio desde admin ──────────────
async function saveStock(productId) {
  const val = parseInt(document.getElementById(`stock-edit-${productId}`).value, 10);
  if (isNaN(val) || val < 0) { toast("Valor inválido"); return; }

  // Actualizar array local siempre
  const p = products.find(pr => pr.id === productId);
  if (p) p.stock = val;
  renderStockList();
  renderProducts(document.getElementById("product-search")?.value || "");
  renderStockAlert();

  // Persistir en Firebase si está conectado
  try {
    if (window._db && window._firebaseReady) {
      const { doc, updateDoc } = window._fsLib;
      await updateDoc(doc(window._db, "products", productId), { stock: val });
    }
  } catch(e) { console.warn("saveStock Firebase error:", e); }
  toast("Stock actualizado");
}

// ════════════════════════════════════════════════════════════════
// SUB-VISTA: AGREGAR NUEVO PRODUCTO + VISTA PREVIA EN VIVO
// ════════════════════════════════════════════════════════════════
function openAddProductView() {
  const mainPanel = document.getElementById("inv-main-panel");
  const addPanel  = document.getElementById("inv-add-panel");
  if (mainPanel) mainPanel.style.display = "none";
  if (addPanel)  addPanel.style.display  = "block";
  updateGananciaPreview();
  updateLiveProductPreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => document.getElementById("new-prod-name")?.focus(), 120);
}

function closeAddProductView() {
  const mainPanel = document.getElementById("inv-main-panel");
  const addPanel  = document.getElementById("inv-add-panel");
  if (addPanel)  addPanel.style.display  = "none";
  if (mainPanel) mainPanel.style.display = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function pickNewProdEmoji(btn, emoji) {
  const inp = document.getElementById("new-prod-emoji");
  if (inp) inp.value = emoji;
  document.querySelectorAll("#np-emoji-picks .np-emoji-pick").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  updateLiveProductPreview();
}

function onNewProdEmojiInput() {
  const val = (document.getElementById("new-prod-emoji")?.value || "").trim();
  document.querySelectorAll("#np-emoji-picks .np-emoji-pick").forEach(b => {
    b.classList.toggle("active", (b.dataset.emoji || "") === val);
  });
  updateLiveProductPreview();
}

function updateGananciaPreview() {
  const price = parseFloat(document.getElementById("new-prod-price")?.value) || 0;
  const costo = parseFloat(document.getElementById("new-prod-costo")?.value) || 0;
  const card  = document.getElementById("new-prod-ganancia-preview");
  const badge = document.getElementById("np-margin-badge");
  const netEl = document.getElementById("np-margin-net");
  const pctEl = document.getElementById("np-margin-pct");

  if (card && badge && netEl && pctEl) {
    card.classList.remove("warn", "neg");
    if (!price && !costo) {
      badge.textContent = "Sin datos";
      netEl.textContent = "$0.00";
      pctEl.textContent = "0.0%";
    } else {
      const gan = price - costo;
      const pct = price > 0 ? (gan / price) * 100 : 0;
      netEl.textContent = `${gan >= 0 ? "+" : ""}$${gan.toFixed(2)}`;
      pctEl.textContent = `${pct.toFixed(1)}%`;
      if (gan < 0) {
        card.classList.add("neg");
        badge.textContent = "Pérdida";
      } else if (pct < 15) {
        card.classList.add("warn");
        badge.textContent = "Margen bajo";
      } else if (pct >= 25) {
        badge.textContent = "Óptimo";
      } else {
        badge.textContent = "Saludable";
      }
    }
  }
  updateLiveProductPreview();
}

function updateLiveProductPreview() {
  const previewEl = document.getElementById("np-live-preview-card");
  const symEl     = document.getElementById("np-symbol-preview");
  const emoji     = (document.getElementById("new-prod-emoji")?.value || "").trim();

  if (symEl) {
    symEl.innerHTML = emoji ? esc(emoji) : DEFAULT_BOX_SVG;
  }
  if (!previewEl) return;

  const nameRaw  = (document.getElementById("new-prod-name")?.value || "").trim() || "Nombre del producto";
  const catRaw   = (document.getElementById("new-prod-cat")?.value || "").trim();
  const unitRaw  = (document.getElementById("new-prod-unit")?.value || "").trim() || "1 unidad";
  const piezas   = parseInt(document.getElementById("new-prod-piezas")?.value, 10) || 0;
  const stockVal = Math.max(0, parseInt(document.getElementById("new-prod-stock")?.value, 10) || 0);
  const costoNum = parseFloat(document.getElementById("new-prod-costo")?.value) || 0;
  const ventaNum = parseFloat(document.getElementById("new-prod-price")?.value) || 0;
  const pesado   = !!document.getElementById("new-prod-pesado")?.checked;

  const isLow = stockVal > 0 && stockVal < 15;
  const isOut = stockVal === 0;
  const stateCls = isOut ? "out" : isLow ? "low" : "ok";
  const cardCls  = isOut ? "is-out" : isLow ? "is-low" : "";
  const statusTxt = isOut ? "Sin Stock" : isLow ? "Stock Bajo" : "En Stock";
  const barColor  = isOut ? "#EF4444" : isLow ? "#F59E0B" : "#10B981";
  const maxRef    = Math.max(60, stockVal > 60 ? Math.ceil(stockVal / 50) * 50 : 60);
  const barPct    = isOut ? 4 : Math.max(8, Math.min(100, (stockVal / maxRef) * 100));

  const capTitle = isOut
    ? "Sin existencias"
    : isLow
    ? "Requiere pedido"
    : stockVal >= 50
    ? "Capacidad óptima"
    : "Nivel Normal";
  const capSub = isLow || isOut ? "Mínimo sugerido: 15" : `Mín: 15 | Máx: ${maxRef}`;

  const cajasStr  = piezas > 0 ? `${piezas} pzas/caja` : "";
  const presStr   = [esc(unitRaw), cajasStr].filter(Boolean).join(" · ");
  const metaParts = [presStr, catRaw ? esc(catRaw) : ""].filter(Boolean).join(" • ");

  const ganNum = ventaNum - costoNum;
  const ganPct = ventaNum > 0 && costoNum > 0 ? ((ganNum / ventaNum) * 100).toFixed(1) : null;

  previewEl.innerHTML = `
    <div class="stock-card-pro ${cardCls}" style="margin-bottom:0;">
      <div class="sc-header">
        <div class="sc-icon-box">${emoji ? esc(emoji) : DEFAULT_BOX_SVG}</div>
        <div class="sc-title-wrap">
          <div class="sc-title-row">
            <span class="sc-prod-name">${esc(nameRaw)}</span>
            <span class="sc-status-pill ${stateCls}">${statusTxt}</span>
            ${pesado ? `<span class="stock-low-badge" style="background:#FEF3C7;color:#92400E;border-color:#F59E0B;">Pesado</span>` : ""}
          </div>
          ${metaParts ? `<div class="sc-meta-row">${metaParts}</div>` : ""}
        </div>
      </div>

      <div class="sc-body-grid" style="grid-template-columns:1fr;gap:.85rem;">
        <div class="sc-stock-col">
          <div class="sc-stock-head">
            <div>
              <div class="sc-stock-label ${stateCls}">STOCK ACTUAL${isLow ? " (CRÍTICO)" : isOut ? " (AGOTADO)" : ""}</div>
              <div class="sc-stock-value-row">
                <span class="sc-stock-num" style="${isLow || isOut ? "color:" + barColor : ""}">${stockVal}</span>
                <span class="sc-stock-unit">piezas</span>
              </div>
            </div>
            <div class="sc-stock-cap">
              <span class="sc-stock-cap-status ${stateCls}">${capTitle}</span>
              <span class="sc-stock-cap-min">${capSub}</span>
            </div>
          </div>
          <div class="sc-progress-track">
            <div class="sc-progress-fill" style="width:${barPct}%;background:${barColor};"></div>
          </div>
        </div>

        <div class="sc-price-box">
          <div class="sc-price-box-title">PRECIOS &amp; MARGEN DE GANANCIA</div>
          <div class="sc-price-cols">
            <div>
              <div class="sc-price-col-label">Costo unitario</div>
              <div class="sc-price-col-val">${costoNum > 0 ? `$${costoNum.toFixed(2)}` : "$0.00"}</div>
            </div>
            <div>
              <div class="sc-price-col-label">Precio de venta</div>
              <div class="sc-price-col-val">$${ventaNum.toFixed(2)}</div>
            </div>
            <div>
              <div class="sc-price-col-label green">Margen neto</div>
              <div class="sc-price-col-val ${ganNum >= 0 ? "green" : ""}">
                ${costoNum > 0 || ventaNum > 0 ? `${ganNum >= 0 ? "+" : ""}$${ganNum.toFixed(2)}` : "+$0.00"}
                ${ganPct !== null ? `<span class="sc-margin-pill ${ganNum < 0 ? "neg" : ""}">(${ganPct}%)</span>` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="sc-footer">
        <div class="sc-actions-left">
          <span class="sc-quick-label">Ajuste rápido:</span>
          <div class="sc-stepper" style="pointer-events:none;opacity:.85;">
            <button type="button" class="sc-step-btn">−</button>
            <input type="number" value="${stockVal}" readonly />
            <button type="button" class="sc-step-btn">+</button>
          </div>
        </div>
        <div class="sc-actions-right">
          <div class="sc-switch-wrap" style="pointer-events:none;">
            <span class="sc-switch-label">Carga pesada</span>
            <button type="button" class="sc-switch ${pesado ? "on" : ""}"></button>
          </div>
        </div>
      </div>
    </div>`;
}

function resetNewProductForm() {
  ["new-prod-name", "new-prod-price", "new-prod-costo", "new-prod-emoji",
   "new-prod-cat", "new-prod-stock", "new-prod-unit", "new-prod-piezas"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  const chk = document.getElementById("new-prod-pesado");
  if (chk) chk.checked = false;
  document.querySelectorAll("#np-emoji-picks .np-emoji-pick").forEach((b, i) => {
    b.classList.toggle("active", i === 0);
  });
  updateGananciaPreview();
}

// ── Agregar nuevo producto ────────────────────────────────────
async function addProduct() {
  const name   = document.getElementById("new-prod-name").value.trim();
  const price  = parseFloat(document.getElementById("new-prod-price").value);
  const costo  = parseFloat(document.getElementById("new-prod-costo").value) || 0;
  const emoji  = document.getElementById("new-prod-emoji").value.trim() || "";
  const cat    = document.getElementById("new-prod-cat").value.trim();
  const stock  = parseInt(document.getElementById("new-prod-stock").value, 10) || 0;
  const unit   = document.getElementById("new-prod-unit").value.trim();
  const piezas = parseInt(document.getElementById("new-prod-piezas").value, 10) || 0;
  const pesado = document.getElementById("new-prod-pesado").checked;

  if (!name || isNaN(price) || price < 0) {
    toast("Nombre y precio de venta son requeridos");
    return;
  }

  let saved = false;
  if (window._db && window._firebaseReady) {
    try {
      const { collection, addDoc, serverTimestamp } = window._fsLib;
      await addDoc(collection(window._db, "products"), {
        name, price, precioCosto: costo, emoji, category: cat, stock, unit, piezas, pesado, createdAt: serverTimestamp()
      });
      saved = true;
    } catch(e) {
      console.warn("addProduct Firebase error:", e);
      if (e.code === "permission-denied") showFirebaseErrorBanner("Sin permiso. Revisa las Reglas de Firestore.");
    }
  }

  if (!saved) {
    const localProdId = "p-" + Date.now();
    products.push({ id: localProdId, name, price, precioCosto: costo, emoji, category: cat, stock, unit, piezas, pesado });
    products.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    renderStockList();
  }

  resetNewProductForm();
  closeAddProductView();
  toast(saved ? "Producto guardado en Firebase" : "Producto guardado localmente");
}

// ── Eliminar producto ─────────────────────────────────────────
async function deleteProduct(productId) {
  const p = products.find(pr => pr.id === productId);
  if (!p) return;
  confirmModal({
    title: `¿Eliminar "${p.name}"?`,
    msg: "Se borrará permanentemente del inventario. No se puede deshacer.",
    confirmLabel: "Sí, eliminar",
    onConfirm: async () => {
      products = products.filter(pr => pr.id !== productId);
      renderStockList();
      renderProducts(document.getElementById("product-search")?.value || "");
      try {
        if (window._db && window._firebaseReady) {
          const { doc, deleteDoc } = window._fsLib;
          await deleteDoc(doc(window._db, "products", productId));
        }
      } catch(e) { console.warn("deleteProduct Firebase error:", e); }
      toast("Producto eliminado");
    }
  });
}
// ════════════════════════════════════════════════════════════════
// ALERTA STOCK BAJO (< 15 unidades)
// ════════════════════════════════════════════════════════════════
function renderStockAlert() {
  const banner = document.getElementById("stock-alert-banner");
  const list   = document.getElementById("stock-alert-list");
  if (!banner || !list) return;

  const lowStock = products.filter(p => (p.stock ?? 0) < 15);
  if (!lowStock.length) {
    banner.classList.remove("visible");
    return;
  }
  banner.classList.add("visible");
  list.innerHTML = lowStock.map(p =>
    `• ${p.emoji || ""} <strong>${esc(p.name)}</strong> — quedan <strong style="color:var(--amber)">${p.stock ?? 0}</strong> unidades`
  ).join("<br/>");
}


// ═══════════════════════════════════════════════════════════════
// BUSCADOR DEL CONTROL DE INVENTARIO
// Búsqueda por nombre / categoría / unidad (sin acentos ni mayúsculas,
// varias palabras = todas deben aparecer) + filtro por categoría y por
// estado del semáforo. Se pinta por páginas para soportar cientos de SKUs.
// ═══════════════════════════════════════════════════════════════
const STOCK_PAGE = 24;
let stockQuery  = "";
let stockCat    = "";
let stockStatus = "all";          // all | ok | low | out
let stockLimit  = STOCK_PAGE;
let _stockTimer = null;

// minúsculas y sin acentos, conservando la longitud (para poder resaltar)
const stockNorm = s => Array.from(String(s ?? "")).map(c => {
  const b = c.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return b.length === 1 ? b : c;
}).join("").toLowerCase();

function stockStatusOf(p) {
  const s = p.stock ?? 0;
  return s === 0 ? "out" : s < 15 ? "low" : "ok";
}

function stockMatches(p, tokens, withStatus) {
  if (stockCat && (p.category || "") !== stockCat) return false;
  if (withStatus && stockStatus !== "all" && stockStatusOf(p) !== stockStatus) return false;
  if (!tokens.length) return true;
  const hay = stockNorm([p.name, p.category, p.unit].filter(Boolean).join(" "));
  return tokens.every(t => hay.includes(t));
}

function stockTokens() {
  return stockNorm(stockQuery).split(/\s+/).filter(Boolean);
}

function getStockView() {
  const tokens = stockTokens();
  return products.filter(p => stockMatches(p, tokens, true));
}

// Resalta lo buscado dentro del nombre
function hlText(text) {
  const raw = String(text ?? "");
  const tokens = stockTokens();
  if (!tokens.length) return esc(raw);
  const norm = stockNorm(raw);
  const mark = new Array(raw.length).fill(false);
  tokens.forEach(t => {
    let i = norm.indexOf(t);
    while (i !== -1) {
      for (let k = i; k < i + t.length; k++) mark[k] = true;
      i = norm.indexOf(t, i + t.length);
    }
  });
  let out = "", buf = "", on = false;
  const flush = () => { out += on ? `<mark class="inv-hl">${esc(buf)}</mark>` : esc(buf); buf = ""; };
  for (let i = 0; i < raw.length; i++) {
    if (mark[i] !== on) { flush(); on = mark[i]; }
    buf += raw[i];
  }
  flush();
  return out;
}

// Categoría, chips con contadores y leyenda de resultados
function renderStockToolbar() {
  const sel = document.getElementById("stock-cat-filter");
  if (sel) {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
    if (stockCat && !cats.includes(stockCat)) stockCat = "";
    sel.innerHTML = `<option value="">Todas las categorías</option>` +
      cats.map(c => `<option value="${esc(c)}"${c === stockCat ? " selected" : ""}>${esc(c)}</option>`).join("");
  }

  const tokens = stockTokens();
  const base = products.filter(p => stockMatches(p, tokens, false));
  const cnt = { all: base.length, ok: 0, low: 0, out: 0 };
  base.forEach(p => cnt[stockStatusOf(p)]++);

  const chips = document.getElementById("stock-status-chips");
  if (chips) {
    chips.innerHTML = [["all", "Todos"], ["ok", "En stock"], ["low", "Stock bajo"], ["out", "Sin stock"]]
      .map(([k, label]) => `<button class="cat-chip inv-chip ${k}${stockStatus === k ? " active" : ""}" onclick="setStockStatus('${k}')">${label} <span class="inv-chip-n">${cnt[k]}</span></button>`)
      .join("");
  }

  const clr = document.getElementById("stock-search-clear");
  if (clr) clr.style.display = stockQuery ? "flex" : "none";

  const info = document.getElementById("stock-count");
  if (info) {
    const n = getStockView().length;
    const filtrado = stockQuery || stockCat || stockStatus !== "all";
    info.innerHTML = filtrado
      ? `Mostrando <b>${Math.min(n, stockLimit)}</b> de <b>${n}</b> resultados · ${products.length} productos en total`
      : `<b>${products.length}</b> productos en inventario`;
  }
}

function onStockSearch() {
  clearTimeout(_stockTimer);
  _stockTimer = setTimeout(() => {
    stockQuery = document.getElementById("stock-search").value.trim();
    stockLimit = STOCK_PAGE;
    renderStockList();
  }, 120);
}
function onStockFilter() {
  stockCat = document.getElementById("stock-cat-filter").value;
  stockLimit = STOCK_PAGE;
  renderStockList();
}
function setStockStatus(k) {
  stockStatus = k;
  stockLimit = STOCK_PAGE;
  renderStockList();
}
function clearStockSearch() {
  const i = document.getElementById("stock-search");
  i.value = "";
  stockQuery = "";
  stockLimit = STOCK_PAGE;
  renderStockList();
  i.focus();
}
function resetStockFilters() {
  stockQuery = ""; stockCat = ""; stockStatus = "all"; stockLimit = STOCK_PAGE;
  const i = document.getElementById("stock-search");
  if (i) i.value = "";
  renderStockList();
}
function showMoreStock() {
  stockLimit += STOCK_PAGE;
  renderStockList();
}
