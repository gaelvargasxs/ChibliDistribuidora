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
        ${c.id}
      </button>`).join("")}`;
}

function selectCat(cat) {
  activeCategory = cat;
  renderCatChips();
  renderProducts(document.getElementById("product-search")?.value || "");
}

function renderProducts(filter = document.getElementById("product-search")?.value || "") {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  // Delegación: funciona también cuando se vuelven a crear las tarjetas al filtrar.
  grid.onclick = event => {
    const button = event.target.closest?.("button[data-product-key]");
    if (!button || button.disabled || !grid.contains(button)) return;
    changeQty(button.dataset.productKey, Number(button.dataset.delta));
  };
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
  const cartItems = new Set(Object.keys(cart).filter(k => cart[k] > 0).map(k => k.endsWith("_caja") ? k.slice(0, -5) : k)).size;
  if (countEl) countEl.textContent = `${filtered.length} producto${filtered.length === 1 ? "" : "s"}`;
  if (selCountEl) selCountEl.textContent = cartItems > 0 ? `${cartItems} SELECCIONADOS` : "";

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/></svg>
      <p>${filter || activeCategory ? "Sin resultados." : "No hay productos registrados en inventario."}</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const cajaPiezas = parseInt(p.piezas) || 0;
    const cajaQty = cart[p.id + "_caja"] || 0;
    const piezaQty = cart[p.id] || 0;
    const stock = Number(p.stock) || 0;
    // Misma base de precio que calcTotal(); no inventar descuentos por caja.
    const precio = Number(p.price) || 0;
    const money = value => value.toLocaleString("es-MX", {minimumFractionDigits: 2, maximumFractionDigits: 2});
    const image = typeof p.image === "string" && /^(https?:\/\/|data:image\/)/i.test(p.image) ? p.image : "";
    const iconMeta = typeof getProductIconMeta === "function"
      ? getProductIconMeta(p.category, p.emoji)
      : { tone: "tone-slate", svg: esc(p.emoji || "📦") };
    const stockCls = stock <= 0 ? "out" : stock < 15 ? "low" : "";
    const stepper = (key, label, qty, kind) => `
      <div class="ch-quantity ${kind}-stepper ${qty > 0 ? "active" : ""}">
        <span class="ch-quantity-label">${label}</span>
        <div class="ch-controls">
          <button type="button" data-product-key="${esc(key)}" data-delta="-1" aria-label="Quitar ${label.toLowerCase()} de ${esc(p.name)}">−</button>
          <span id="qty-${esc(key)}" aria-live="polite">${qty}</span>
          <button type="button" class="ch-add" data-product-key="${esc(key)}" data-delta="1" aria-label="Agregar ${label.toLowerCase()} de ${esc(p.name)}">+</button>
        </div>
      </div>`;
    return `<article class="ch-product ${stock <= 0 ? "is-out" : ""} ${cajaQty || piezaQty ? "in-cart" : ""}" id="pcard-${esc(p.id)}">
          <div class="ch-product-meta">
          ${p.category ? `<span class="ch-category">${esc(p.category)}</span>` : ""}
            <span class="ch-stock ${stockCls}">${stock > 0 ? `${stock} disp.` : "Agotado"}</span>
          </div>
      <div class="ch-product-head">
        <div class="ch-image ${iconMeta.tone}${image ? " has-photo" : ""}">
          <span class="cat-svg-icon" aria-hidden="true">${iconMeta.svg}</span>
          ${image ? `<img src="${esc(image)}" alt="${esc(p.name)}" loading="lazy" decoding="async">` : ""}
        </div>
        <div class="ch-product-info">
          <h3>${esc(p.name)}</h3>
          ${p.unit ? `<p class="ch-unit">Presentación: ${esc(p.unit)}</p>` : ""}
        </div>
      </div>
      <div class="ch-prices ${cajaPiezas > 0 ? "" : "single"}">
        ${cajaPiezas > 0 ? `<div><span>Caja · ${cajaPiezas} piezas</span><strong>$${money(precio * cajaPiezas)}</strong></div>` : ""}
        <div><span>Por pieza</span><strong>$${money(precio)}</strong></div>
      </div>
      ${stock <= 0 ? '<p class="ch-out-message">Sin existencias disponibles</p>' : ""}
      <div class="ch-quantities ${cajaPiezas > 0 ? "" : "single"}" ${stock <= 0 && !cajaQty && !piezaQty ? 'hidden' : ''}>
        ${cajaPiezas > 0 ? stepper(p.id + "_caja", "Cajas", cajaQty, "caja") : ""}
        ${stepper(p.id, "Piezas", piezaQty, "pieza")}
      </div>
    </article>`;
  }).join("");
  syncCatalogControls();
  grid.querySelectorAll(".ch-image img").forEach(img => {
    img.addEventListener("error", () => {
      const wrap = img.closest(".ch-image");
      if (wrap) wrap.classList.remove("has-photo");
      img.remove();
    }, { once: true });
  });
}

function filterProducts() {
  renderProducts(document.getElementById("product-search")?.value || "");
}

// Sin volver a dibujar la tarjeta, conserva el foco al usar los controles.
function syncCatalogControls() {
  const grid = document.getElementById("product-grid");
  if (!grid) return;
  const byId = new Map(products.map(p => [p.id, p]));
  grid.querySelectorAll("button[data-product-key]").forEach(button => {
    const key = button.dataset.productKey;
    const isBox = key.endsWith("_caja");
    const id = isBox ? key.slice(0, -5) : key;
    const p = byId.get(id);
    if (!p) { button.disabled = true; return; }
    const pack = parseInt(p.piezas) || 0;
    const selected = (cart[id] || 0) + (cart[id + "_caja"] || 0) * pack;
    button.disabled = Number(button.dataset.delta) < 0
      ? !(cart[key] > 0)
      : (isBox && pack <= 0) || selected + (isBox ? pack : 1) > (Number(p.stock) || 0);
  });
}
