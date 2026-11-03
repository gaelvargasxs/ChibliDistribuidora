// ════════════════════════════════════════════════════════════════
// IMPORTADOR EXCEL + EDICIÓN MASIVA
// ════════════════════════════════════════════════════════════════

// Carga SheetJS dinámicamente si no está disponible
function loadSheetJS(cb) {
  if (window.XLSX) { cb(); return; }
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
  s.onload = cb;
  document.head.appendChild(s);
}

function importarExcel(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById("import-excel-filename").textContent = file.name;

  loadSheetJS(() => {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const wb   = XLSX.read(e.target.result, { type: "array" });
        // Busca la hoja "Productos" o la primera hoja
        const sheetName = wb.SheetNames.includes("Productos") ? "Productos" : wb.SheetNames[0];
        const ws   = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

        // Filtrar filas vacías (sin nombre)
        const validRows = rows.filter(r => (r["nombre *"] || r["nombre"] || "").toString().trim());

        if (!validRows.length) {
          showImportResult("error", "No se encontraron productos en el archivo. Verifica que uses la plantilla de Chibli y que la hoja se llame 'Productos'.");
          return;
        }

        await procesarImport(validRows);
      } catch(err) {
        showImportResult("error", "Error leyendo el archivo: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

async function procesarImport(rows) {
  const progressCard = document.getElementById("import-progress");
  const progressBar  = document.getElementById("import-progress-bar");
  const statusEl     = document.getElementById("import-status");
  progressCard.style.display = "";
  showImportResult("hidden", "");

  let agregados = 0, actualizados = 0, errores = 0;
  const total = rows.length;

  for (let i = 0; i < total; i++) {
    const r = rows[i];
    const pct = Math.round(((i+1) / total) * 100);
    progressBar.style.width = pct + "%";
    statusEl.textContent = `Procesando ${i+1} de ${total}…`;

    try {
      const nombre    = (r["nombre *"] || r["nombre"] || "").toString().trim();
      const emoji     = (r["emoji"]    || "").toString().trim() || "";
      const categoria = (r["categoria *"] || r["categoria"] || "General").toString().trim();
      const precioV   = parseFloat((r["precio_venta *"] || r["precio_venta"] || 0).toString().replace(/[^0-9.]/g,"")) || 0;
      const precioC   = parseFloat((r["precio_costo"]   || 0).toString().replace(/[^0-9.]/g,"")) || 0;
      const unidad    = (r["unidad *"] || r["unidad"] || "Pieza").toString().trim();
      const piezas    = parseInt((r["piezas_por_caja"] || 1).toString()) || 1;
      const stock     = parseInt((r["stock"]  || 0).toString()) || 0;
      const pesado    = /^s[ií]/i.test((r["pesado"] || "").toString());
      const prioritario = /^s[ií]/i.test((r["prioritario"] || "").toString());

      const prodData = {
        name: nombre, emoji, category: categoria,
        price: precioV, precioCosto: precioC,
        unit: unidad, piezas, stock,
        pesado, prioritario
      };

      // Buscar si ya existe (por nombre exacto)
      const existing = products.find(p => p.name.trim().toLowerCase() === nombre.toLowerCase());

      if (existing) {
        // Actualizar local
        Object.assign(existing, prodData);
        actualizados++;
        // Actualizar en Firebase
        try {
          if (window._db && window._firebaseReady) {
            const { doc, updateDoc } = window._fsLib;
            await updateDoc(doc(window._db, "products", existing.id), prodData);
          }
        } catch(fe) { console.warn("import update firebase:", fe); }
      } else {
        // Nuevo producto
        const localId = "import-" + Date.now() + "-" + i;
        const newProd = { id: localId, ...prodData };
        products.push(newProd);
        agregados++;
        try {
          if (window._db && window._firebaseReady) {
            const { collection, addDoc, serverTimestamp } = window._fsLib;
            const ref = await addDoc(collection(window._db, "products"), {
              ...prodData, createdAt: serverTimestamp()
            });
            const idx = products.findIndex(p => p.id === localId);
            if (idx >= 0) products[idx].id = ref.id;
          }
        } catch(fe) { console.warn("import add firebase:", fe); }
      }
    } catch(rowErr) {
      errores++;
      console.warn(`Error fila ${i+1}:`, rowErr);
    }

    // Pequeña pausa cada 20 para no bloquear el UI
    if (i % 20 === 0) await new Promise(res => setTimeout(res, 10));
  }

  progressBar.style.width = "100%";
  statusEl.textContent = "¡Importación completa!";

  const msg = `Importación completa:<br/>
    &nbsp;• <strong>${agregados}</strong> productos nuevos agregados<br/>
    &nbsp;• <strong>${actualizados}</strong> productos actualizados<br/>
    ${errores ? `&nbsp;• <strong>${errores}</strong> filas con errores (omitidas)` : ""}`;

  showImportResult("success", msg);
  renderStockList();
  renderProducts(document.getElementById("product-search")?.value || "");
  renderBulkTable();
  toast(`${agregados} nuevos · ${actualizados} actualizados`);

  setTimeout(() => { progressCard.style.display = "none"; }, 3000);
}

function showImportResult(type, html) {
  const el = document.getElementById("import-result");
  if (type === "hidden") { el.style.display = "none"; return; }
  el.style.display   = "";
  el.style.background = type === "success" ? "#D1FAE5" : "#FEE2E2";
  el.style.color      = type === "success" ? "#065F46" : "#991B1B";
  el.style.border     = `1.5px solid ${type === "success" ? "#6EE7B7" : "#FCA5A5"}`;
  el.innerHTML        = html;
}

// ── Tabla de edición masiva ───────────────────────────────────
const CATS_BULK = [
  "Refresco","Agua","Botana","Lácteo","Abarrote",
  "Limpieza","Higiene","Bebida energética","Dulce","Pan",
  "Carne","Verdura","Fruta","Congelado","Otro"
];
const UNITS_BULK = ["Pieza","Caja","Kg","Litro","Gramo","Paquete","Bolsa","Par"];
let _bulkDirty = {}; // productId -> patched data

function renderBulkTable() {
  const tbody   = document.getElementById("bulk-edit-tbody");
  const countEl = document.getElementById("bulk-count");
  const catSel  = document.getElementById("bulk-cat-filter");
  if (!tbody) return;

  // Populate category filter
  if (catSel && catSel.options.length < 3) {
    const usedCats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    catSel.innerHTML = `<option value="">Todas las categorías</option>` +
      usedCats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
  }

  const q   = (document.getElementById("bulk-search")?.value || "").toLowerCase();
  const cat = catSel?.value || "";

  const filtered = products.filter(p =>
    (!q   || p.name.toLowerCase().includes(q) || (p.category||"").toLowerCase().includes(q)) &&
    (!cat || p.category === cat)
  ).sort((a,b) => {
    if (a.prioritario && !b.prioritario) return -1;
    if (!a.prioritario && b.prioritario) return 1;
    return (a.category||"").localeCompare(b.category||"") || a.name.localeCompare(b.name);
  });

  if (countEl) countEl.textContent = `Mostrando ${filtered.length} de ${products.length} productos`;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:1.5rem;color:var(--gray-400);">Sin productos. Usa el importador Excel o registra el primero arriba.</td></tr>`;
    return;
  }

  const catOptions = CATS_BULK.map(c => `<option value="${c}">${c}</option>`).join("");
  const unitOptions = UNITS_BULK.map(u => `<option value="${u}">${u}</option>`).join("");

  tbody.innerHTML = filtered.map(p => {
    const dirty = _bulkDirty[p.id] || {};
    const d = { ...p, ...dirty };
    const isDirty = !!_bulkDirty[p.id];
    const catOpts = CATS_BULK.map(c =>
      `<option value="${c}" ${d.category===c?"selected":""}>${c}</option>`).join("");
    const unitOpts = UNITS_BULK.map(u =>
      `<option value="${u}" ${d.unit===u?"selected":""}>${u}</option>`).join("");
    return `<tr class="${isDirty ? "bulk-dirty" : ""}" id="brow-${p.id}">
      <td><input class="bulk-input" value="${esc(d.name||"")}" onchange="patchBulk('${p.id}','name',this.value)" /></td>
      <td style="text-align:center;"><input class="bulk-input" value="${esc(d.emoji||"")}" style="width:42px;text-align:center;font-size:1.1rem;" onchange="patchBulk('${p.id}','emoji',this.value)" /></td>
      <td><select class="bulk-select" onchange="patchBulk('${p.id}','category',this.value)">${catOpts}</select></td>
      <td><input class="bulk-input" type="number" step="0.01" min="0" value="${(+d.price||0).toFixed(2)}" style="text-align:right;" onchange="patchBulk('${p.id}','price',parseFloat(this.value)||0)" /></td>
      <td><input class="bulk-input" type="number" step="0.01" min="0" value="${(+d.precioCosto||0).toFixed(2)}" style="text-align:right;" onchange="patchBulk('${p.id}','precioCosto',parseFloat(this.value)||0)" /></td>
      <td><select class="bulk-select" onchange="patchBulk('${p.id}','unit',this.value)">${unitOpts}</select></td>
      <td><input class="bulk-input" type="number" step="1" min="1" value="${+d.piezas||1}" style="text-align:center;" onchange="patchBulk('${p.id}','piezas',parseInt(this.value)||1)" /></td>
      <td><input class="bulk-input" type="number" step="1" min="0" value="${+d.stock||0}" style="text-align:center;" onchange="patchBulk('${p.id}','stock',parseInt(this.value)||0)" /></td>
      <td style="text-align:center;"><input type="checkbox" class="bulk-check" ${d.pesado?"checked":""} onchange="patchBulk('${p.id}','pesado',this.checked)" /></td>
      <td style="text-align:center;"><input type="checkbox" class="bulk-check" style="accent-color:#FBBF24;" ${d.prioritario?"checked":""} onchange="patchBulk('${p.id}','prioritario',this.checked)" /></td>
      <td style="text-align:center;"><button class="bulk-del-btn" onclick="deleteProduct('${p.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button></td>
    </tr>`;
  }).join("");
}

function patchBulk(id, field, value) {
  if (!_bulkDirty[id]) _bulkDirty[id] = {};
  _bulkDirty[id][field] = value;
  // Mark row dirty visually
  const row = document.getElementById("brow-" + id);
  if (row) row.classList.add("bulk-dirty");
  // Update local product
  const p = products.find(pr => pr.id === id);
  if (p) p[field] = value;
}

async function saveAllBulk() {
  const ids = Object.keys(_bulkDirty);
  if (!ids.length) { toast("ℹ Sin cambios pendientes"); return; }

  let saved = 0;
  for (const id of ids) {
    const p = products.find(pr => pr.id === id);
    if (!p) continue;
    const patch = _bulkDirty[id];
    try {
      if (window._db && window._firebaseReady) {
        const { doc, updateDoc } = window._fsLib;
        await updateDoc(doc(window._db, "products", id), patch);
      }
      saved++;
      delete _bulkDirty[id];
      const row = document.getElementById("brow-" + id);
      if (row) row.classList.remove("bulk-dirty");
    } catch(e) {
      console.warn("saveAllBulk error:", id, e);
    }
  }

  renderStockList();
  renderProducts(document.getElementById("product-search")?.value || "");
  toast(`${saved} producto${saved!==1?"s":""} guardado${saved!==1?"s":""} en Firestore`);
}
