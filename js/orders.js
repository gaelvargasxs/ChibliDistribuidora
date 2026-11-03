// ════════════════════════════════════════════════════════════════
// EDITAR PEDIDO
// ════════════════════════════════════════════════════════════════
let _editOrderId = null;
let _editLines   = [];

function openEditOrder(orderId) {
  const o = orders.find(x => x.id === orderId);
  if (!o) return;
  _editOrderId = orderId;
  _editLines   = (o.lines || []).map(l => ({ ...l })); // copia profunda

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay open";
  overlay.id = "edit-order-overlay";
  overlay.innerHTML = `
    <div class="modal-sheet" style="max-height:92dvh;overflow-y:auto;">
      <div class="modal-handle"></div>
      <div class="modal-title">Editar pedido — ${esc(o.customerName)}</div>
      <p style="font-size:.8rem;color:var(--gray-400);margin-bottom:.85rem;">
        Modifica cantidades, elimina o agrega productos.
      </p>
      <div id="edit-lines-list"></div>

      <!-- Agregar producto -->
      <div class="section-label" style="margin-top:.75rem;">Agregar producto</div>
      <div style="position:relative;margin-bottom:.5rem;">
        <input type="text" id="edit-add-input" placeholder="Busca un producto..."
               autocomplete="off"
               oninput="filterEditProducts()"
               onkeydown="editProductKeydown(event)"
               style="padding-right:2.5rem;" />
        <div id="edit-add-dropdown"
             style="display:none;position:absolute;left:0;right:0;top:100%;z-index:200;
                    background:var(--white);border:2px solid var(--red-600);
                    border-top:none;border-radius:0 0 var(--radius-sm) var(--radius-sm);
                    max-height:200px;overflow-y:auto;box-shadow:var(--shadow-md);"></div>
        <input type="hidden" id="edit-add-prod-id" />
        <div id="edit-add-match" style="font-size:.72rem;margin-top:.25rem;min-height:1rem;"></div>
      </div>
      <div style="display:flex;gap:.4rem;align-items:center;">
        <div style="flex:0 0 auto;">
          <label style="font-size:.72rem;margin-bottom:.2rem;">Cantidad</label>
          <input type="number" id="edit-add-qty" value="1" min="1"
                 style="width:80px;text-align:center;font-weight:700;" />
        </div>
        <button class="btn btn-sm" style="background:var(--red-600);color:white;margin-top:1.2rem;flex:1;"
                onclick="editOrderAddLine()">+ Agregar al pedido</button>
      </div>

      <div style="margin-top:1.25rem;display:flex;gap:.5rem;">
        <button class="btn btn-primary" style="flex:1;" onclick="saveEditOrder()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg> Guardar cambios</button>
        <button class="btn btn-secondary" style="flex:0 0 auto;width:auto;padding:.8rem 1rem;"
                onclick="document.getElementById('edit-order-overlay').remove()">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", e => { if (e.target === overlay) overlay.remove(); });
  renderEditLines();
}

function renderEditLines() {
  const el = document.getElementById("edit-lines-list");
  if (!el) return;
  if (!_editLines.length) {
    el.innerHTML = `<div style="font-size:.82rem;color:var(--gray-400);padding:.5rem 0;">Sin productos en el pedido.</div>`;
    return;
  }
  el.innerHTML = _editLines.map((l, i) => `
    <div class="edit-line-row">
      <div style="flex:1;min-width:0;">
        <div class="edit-line-name">${l.emoji||""} ${esc(l.name)}</div>
        <div class="edit-line-price">$${(+l.price||0).toFixed(2)} c/u</div>
      </div>
      <input type="number" class="edit-line-qty" value="${l.qty}" min="1"
             oninput="editLineQtyChange(${i}, this.value)" />
      <button class="edit-line-del" onclick="editLineRemove(${i})"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg></button>
    </div>`).join("");
}

function editLineQtyChange(idx, val) {
  const qty = Math.max(1, parseInt(val, 10) || 1);
  if (_editLines[idx]) {
    _editLines[idx].qty      = qty;
    _editLines[idx].subtotal = (_editLines[idx].price || 0) * qty;
  }
}

function editLineRemove(idx) {
  _editLines.splice(idx, 1);
  renderEditLines();
}

let _editProdDropIdx = -1;

function filterEditProducts() {
  const query    = (document.getElementById("edit-add-input").value || "").toLowerCase().trim();
  const dropdown = document.getElementById("edit-add-dropdown");
  const matchEl  = document.getElementById("edit-add-match");
  const hiddenId = document.getElementById("edit-add-prod-id");
  _editProdDropIdx = -1;
  hiddenId.value = "";
  matchEl.textContent = "";

  if (!query) { dropdown.style.display = "none"; return; }

  const matches = products.filter(p => p.stock > 0 && p.name.toLowerCase().includes(query));

  if (!matches.length) {
    dropdown.innerHTML = `<div style="padding:.6rem .9rem;font-size:.8rem;color:var(--gray-400);">Sin resultados</div>`;
    dropdown.style.display = "block";
    return;
  }

  dropdown.style.display = "block";
  dropdown.innerHTML = matches.map((p, i) => {
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
    const highlighted = esc(p.name).replace(re, '<strong>$1</strong>');
    const isLow = p.stock < 15;
    return `<div class="edit-prod-dd-item"
              data-id="${p.id}" data-name="${esc(p.name)}"
              style="padding:.6rem .9rem;cursor:pointer;font-size:.85rem;
                     border-bottom:1px solid var(--gray-100);display:flex;
                     align-items:center;justify-content:space-between;gap:.5rem;"
              onmousedown="selectEditProduct('${p.id}','${p.name.replace(/'/g,"\\'")}')"
              onmouseover="this.style.background='var(--red-50)'">
              <span>${p.emoji||""} ${highlighted}</span>
              <span style="font-size:.72rem;color:${isLow?'var(--amber)':'var(--gray-400)'};white-space:nowrap;">
                $${(+p.price).toFixed(2)} · ${p.stock} uds${isLow?' ':''}
              </span>
            </div>`;
  }).join("");
}

function selectEditProduct(id, name) {
  document.getElementById("edit-add-input").value  = name;
  document.getElementById("edit-add-prod-id").value = id;
  document.getElementById("edit-add-dropdown").style.display = "none";
  const matchEl = document.getElementById("edit-add-match");
  matchEl.textContent = "Producto seleccionado";
  matchEl.style.color = "var(--green)";
}

function editProductKeydown(e) {
  const dropdown = document.getElementById("edit-add-dropdown");
  const items = [...dropdown.querySelectorAll(".edit-prod-dd-item")];
  if (!items.length) { if (e.key === "Enter") editOrderAddLine(); return; }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    _editProdDropIdx = Math.min(_editProdDropIdx + 1, items.length - 1);
    items.forEach((it, i) => it.style.background = i === _editProdDropIdx ? "var(--red-50)" : "");
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    _editProdDropIdx = Math.max(_editProdDropIdx - 1, 0);
    items.forEach((it, i) => it.style.background = i === _editProdDropIdx ? "var(--red-50)" : "");
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (_editProdDropIdx >= 0 && items[_editProdDropIdx]) {
      const it = items[_editProdDropIdx];
      selectEditProduct(it.dataset.id, it.dataset.name);
    } else {
      editOrderAddLine();
    }
  } else if (e.key === "Escape") {
    dropdown.style.display = "none";
  }
}

function editOrderAddLine() {
  const prodId = document.getElementById("edit-add-prod-id").value;
  const qty    = Math.max(1, parseInt(document.getElementById("edit-add-qty").value, 10) || 1);
  if (!prodId) { toast("Escribe y selecciona un producto"); return; }

  const prod = products.find(p => p.id === prodId);
  if (!prod) return;

  const existing = _editLines.find(l => l.productId === prod.id || l.name === prod.name);
  if (existing) {
    existing.qty     += qty;
    existing.subtotal = (existing.price || prod.price) * existing.qty;
  } else {
    _editLines.push({ productId: prod.id, name: prod.name, emoji: prod.emoji||"",
                      qty, price: prod.price, subtotal: prod.price * qty });
  }

  // Limpiar búsqueda
  document.getElementById("edit-add-input").value   = "";
  document.getElementById("edit-add-prod-id").value = "";
  document.getElementById("edit-add-match").textContent = "";
  document.getElementById("edit-add-dropdown").style.display = "none";
  document.getElementById("edit-add-qty").value = 1;
  renderEditLines();
  toast(`${prod.emoji||""} ${prod.name} agregado`);
}

async function saveEditOrder() {
  if (!_editOrderId) return;
  if (!_editLines.length) { toast("El pedido debe tener al menos un producto"); return; }

  // Recalcular total
  const newTotal = _editLines.reduce((s, l) => s + (+l.subtotal || 0), 0);

  const o = orders.find(x => x.id === _editOrderId);
  const oldLines = o ? (o.lines || []) : [];

  // ── Reconciliar stock: comparar cantidades viejas vs. nuevas por producto ──
  // Si bajó la cantidad (o se quitó el producto), se regresa la diferencia al stock.
  // Si subió (o es un producto nuevo en el pedido), se descuenta la diferencia extra.
  const oldQty = {};
  oldLines.forEach(l => { oldQty[l.productId] = (oldQty[l.productId] || 0) + (l.qty || 0); });
  const newQty = {};
  _editLines.forEach(l => { newQty[l.productId] = (newQty[l.productId] || 0) + (l.qty || 0); });

  const allProductIds = new Set([...Object.keys(oldQty), ...Object.keys(newQty)]);
  const stockDeltas = []; // { productId, newStock }
  allProductIds.forEach(pid => {
    const diff = (oldQty[pid] || 0) - (newQty[pid] || 0); // positivo = regresar al stock
    if (!diff) return;
    const p = products.find(pr => pr.id === pid);
    if (p) {
      p.stock = Math.max(0, (p.stock || 0) + diff);
      stockDeltas.push({ productId: pid, newStock: p.stock });
    }
  });

  // Actualizar array local
  if (o) {
    o.lines = _editLines;
    o.total = newTotal;
  }

  renderStockList();

  // Persistir en Firebase si está conectado
  try {
    if (window._db && window._firebaseReady) {
      const { doc, updateDoc } = window._fsLib;
      await updateDoc(doc(window._db, "orders", _editOrderId), {
        lines: _editLines, total: newTotal
      });
      stockDeltas.forEach(({ productId, newStock }) => {
        updateDoc(doc(window._db, "products", productId), { stock: newStock }).catch(()=>{});
      });
    }
  } catch(e) { console.warn("saveEditOrder Firebase error:", e); }

  document.getElementById("edit-order-overlay")?.remove();
  renderOrdersAdmin();
  renderCaja();
  toast("Pedido actualizado — stock ajustado");
}


async function deleteOrder(orderId) {
  confirmModal({
    title: "¿Eliminar pedido?",
    msg: "Se borrará el pedido permanentemente y se regresará el stock de sus productos.",
    confirmLabel: "Sí, eliminar",
    onConfirm: async () => {
      const o = orders.find(x => x.id === orderId);
      const linesToRestore = o ? (o.lines || []) : [];

      orders = orders.filter(x => x.id !== orderId);
      renderOrdersAdmin();
      renderCaja();

      // Regresar stock local de cada línea del pedido eliminado
      linesToRestore.forEach(l => {
        const p = products.find(pr => pr.id === l.productId);
        if (p) p.stock = (p.stock || 0) + (l.qty || 0);
      });
      renderStockList();

      try {
        if (window._db && window._firebaseReady) {
          const { doc, deleteDoc, updateDoc } = window._fsLib;
          await deleteDoc(doc(window._db, "orders", orderId));
          // Persistir el stock devuelto en Firebase
          linesToRestore.forEach(l => {
            const p = products.find(pr => pr.id === l.productId);
            if (p) updateDoc(doc(window._db, "products", l.productId), { stock: p.stock }).catch(()=>{});
          });
        }
      } catch(e) { console.warn("deleteOrder Firebase error:", e); }
      toast("Pedido eliminado — stock devuelto");
    }
  });
}
