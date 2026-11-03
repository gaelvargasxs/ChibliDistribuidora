// ════════════════════════════════════════════════════════════════
// PRODUCTOS / CATÁLOGO (DISEÑO EXACTO B2B CHIBLI)
// ════════════════════════════════════════════════════════════════
const CATEGORIAS = [
  { id:"Aceites",     emoji:"🫙" },
  { id:"Agua",        emoji:"💧" },
  { id:"Básicos",     emoji:"📦" },
  { id:"Bebidas",     emoji:"🥤" },
  { id:"Botanas",     emoji:"🍪" },
  { id:"Dulces",      emoji:"🍬" },
  { id:"Enlatados",   emoji:"🥫" },
  { id:"Granos",      emoji:"🫘" },
  { id:"Lácteos",     emoji:"🥛" },
  { id:"Limpieza",    emoji:"🧼" },
  { id:"Pan",         emoji:"🍞" },
  { id:"Refrescos",   emoji:"🧃" },
  { id:"Sazonadores", emoji:"🧂" },
  { id:"Otro",        emoji:"📦" },
];

function renderCatChips() {
  const el = document.getElementById("cat-chips");
  if (!el) return;
  const usadas = new Set(products.map(p => p.category).filter(Boolean));
  const chips = CATEGORIAS.filter(c => usadas.has(c.id));
  if (!chips.length) { el.innerHTML = ""; return; }
  el.innerHTML = `
    <button class="cat-chip ${activeCategory === "" ? "active" : ""}" onclick="selectCat('')">Todos</button>
    ${chips.map(c => `
      <button class="cat-chip ${activeCategory === c.id ? "active" : ""}" onclick="selectCat('${c.id}')">
        ${c.emoji} ${c.id}
      </button>`).join("")}`;
}

function selectCat(cat) {
  activeCategory = cat;
  renderCatChips();
  renderProducts(document.getElementById("product-search")?.value || "");
}

function renderProducts(filter = "") {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  const f = filter.toLowerCase();

  const filtered = products.filter(p => {
    const matchText = (p.name || "").toLowerCase().includes(f) || (p.category || "").toLowerCase().includes(f);
    const matchCat  = !activeCategory || p.category === activeCategory;
    return matchText && matchCat;
  }).sort((a,b) => {
    if (a.prioritario && !b.prioritario) return -1;
    if (!a.prioritario && b.prioritario) return 1;
    return (a.category||"").localeCompare(b.category||"") || (a.name||"").localeCompare(b.name||"");
  });

  renderCatChips();

  // Contador
  const countEl   = document.getElementById("catalogo-count-label");
  const selCountEl = document.getElementById("catalogo-sel-count");
  const cartItems = Object.values(cart).filter(v => v > 0).length;
  if (countEl) countEl.textContent = `CATÁLOGO MAYORISTA (${filtered.length} PRODUCTOS)`;
  if (selCountEl) selCountEl.textContent = cartItems > 0 ? `${cartItems} SELECCIONADOS` : "";

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/></svg>
      <p>${filter || activeCategory ? "Sin resultados." : "No hay productos registrados en inventario."}</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const cajaPiezas = parseInt(p.piezas) || 12;
    const cajaQty    = cart[p.id + "_caja"] || 0;
    const piezaQty   = cart[p.id] || 0;
    const anyInCart  = cajaQty > 0 || piezaQty > 0;

    // Precios: caja completa vs pieza suelta
    const precioPieza = +p.price || 0;
    const precioCaja  = +(p.precioCaja || (precioPieza * cajaPiezas * 0.95));
    const precioUnitEnCaja = precioCaja / cajaPiezas;

    // Stock como siempre
    const stockTotal = Number(p.stock) || 0;
    const stockBadgeClass = stockTotal > 5 ? "stock-badge-ok" : stockTotal > 0 ? "stock-badge-low" : "stock-badge-out";
    const stockTxt = stockTotal > 0 ? `${stockTotal} disp.` : "Agotado";

    // SKU formateado como el diseño
    const rawSku = p.codigo || (p.id.length > 7 ? p.id.slice(0,7).toUpperCase() : p.id.toUpperCase());
    const skuCode = rawSku.includes("-") ? rawSku : `SKU:  ${rawSku}`;

    // Imagen / thumbnail
    const isHttpImg = p.image && (p.image.startsWith("http://") || p.image.startsWith("https://") || p.image.startsWith("data:"));
    const boxIconHtml = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:3rem;">📦</div>`;
    const imgMarkup = isHttpImg
      ? `<img src="${p.image}" alt="${esc(p.name)}" class="b2b-card-img" onerror="this.outerHTML='${boxIconHtml}'" />`
      : boxIconHtml;

    return `
    <div class="b2b-product-card ${anyInCart ? "in-cart" : ""}" id="pcard-${p.id}">
      <!-- Fila Superior -->
      <div class="b2b-card-top">
        <div class="b2b-card-img-wrap">
                    ${imgMarkup}
        </div>
        <div class="b2b-card-header-info">
          <div class="b2b-top-meta-row" style="justify-content:flex-end;">
            <span class="b2b-stock-badge ${stockBadgeClass}">
              <span class="b2b-stock-dot"></span>
              ${stockTxt}
            </span>
          </div>
          <h3 class="b2b-card-title">${esc(p.name)}</h3>
          <div class="b2b-card-sub">Caja ${cajaPiezas} × ${esc(p.unit || "1L")}</div>
          <div class="b2b-tags-row">
            <span class="b2b-tag-cat">${esc((p.category || "BÁSICOS").toUpperCase())}</span>
          </div>
        </div>
      </div>

      <!-- Contenedor Doble Precio -->
      <div class="b2b-pricing-box">
        <div class="b2b-price-col">
          <div class="b2b-price-label">Por Caja (${cajaPiezas} pzas)</div>
          <div class="b2b-price-main">
            $${precioCaja.toFixed(2)}
            <span class="b2b-price-unit">($${precioUnitEnCaja.toFixed(2)} c/u)</span>
          </div>
        </div>
        <div class="b2b-price-divider"></div>
        <div class="b2b-price-col right">
          <div class="b2b-price-label">Pieza Suelta</div>
          <div class="b2b-price-main">
            $${precioPieza.toFixed(2)} <span class="b2b-currency">MXN</span>
          </div>
        </div>
      </div>

      <!-- Doble Stepper (Cajas & Piezas) -->
      <div class="b2b-stepper-row">
        <!-- Stepper Cajas -->
        <div class="b2b-stepper-box caja-stepper ${cajaQty > 0 ? "active" : ""}">
          <span class="b2b-stepper-lbl">Cajas</span>
          <div class="b2b-stepper-controls">
            <button class="b2b-btn-minus" onclick="changeQty('${p.id}_caja', -1)" aria-label="Menos cajas">−</button>
            <span class="b2b-qty-val" id="qty-${p.id}_caja">${cajaQty}</span>
            <button class="b2b-btn-plus plus-caja" onclick="changeQty('${p.id}_caja', 1)" aria-label="Más cajas">+</button>
          </div>
        </div>

        <!-- Stepper Piezas -->
        <div class="b2b-stepper-box pieza-stepper ${piezaQty > 0 ? "active" : ""}">
          <span class="b2b-stepper-lbl">Piezas</span>
          <div class="b2b-stepper-controls">
            <button class="b2b-btn-minus" onclick="changeQty('${p.id}', -1)" aria-label="Menos piezas">−</button>
            <span class="b2b-qty-val" id="qty-${p.id}">${piezaQty}</span>
            <button class="b2b-btn-plus plus-pieza" onclick="changeQty('${p.id}', 1)" aria-label="Más piezas">+</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join("");
}

function filterProducts() {
  renderProducts(document.getElementById("product-search")?.value || "");
}
