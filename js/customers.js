// ════════════════════════════════════════════════════════════════
// MÓDULO DE TIENDAS / COMERCIOS (CHIBLI)
// ════════════════════════════════════════════════════════════════

let customerSearchQuery = "";

function renderCustomersList() {
  const container = document.getElementById("customers-list-container");
  if (!container) return;

  const q = (customerSearchQuery || "").toLowerCase().trim();
  const filtered = customers.filter(c => {
    if (!q) return true;
    const nameMatch  = (c.storeName || "").toLowerCase().includes(q);
    const ownerMatch = (c.ownerName || "").toLowerCase().includes(q);
    const phoneMatch = (c.phone || "").toLowerCase().includes(q);
    const zoneMatch  = (c.zone || "").toLowerCase().includes(q);
    const addrMatch  = (c.address || "").toLowerCase().includes(q);
    return nameMatch || ownerMatch || phoneMatch || zoneMatch || addrMatch;
  });

  if (!customers.length) {
    container.innerHTML = `
      <div class="mgmt-empty-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="M3 9l2-5h14l2 5"/><path d="M21 9v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9"/><path d="M9 22V12h6v10"/>
        </svg>
        <div class="mgmt-empty-title">Aún no hay tiendas registradas</div>
        <div class="mgmt-empty-sub">Llena el formulario superior para registrar la primera tienda cliente.</div>
      </div>`;
    return;
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="mgmt-empty-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <div class="mgmt-empty-title">Sin resultados para «${esc(customerSearchQuery)}»</div>
        <div class="mgmt-empty-sub">Intenta con otro término o limpia la barra de búsqueda.</div>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(c => {
    const initial = (c.storeName || "T").trim().charAt(0).toUpperCase();
    const metaParts = [
      c.ownerName ? `👤 ${esc(c.ownerName)}` : null,
      c.phone ? `📞 ${esc(c.phone)}` : null,
      c.zone ? `📍 ${esc(c.zone)}` : null,
      c.address ? esc(c.address) : null
    ].filter(Boolean).join(" · ");

    return `
      <div class="mgmt-item-card">
        <div class="mgmt-item-left">
          <div class="mgmt-avatar-red">${initial}</div>
          <div class="mgmt-item-info">
            <div class="mgmt-item-name">${esc(c.storeName || "Sin nombre")}</div>
            <div class="mgmt-item-meta">${metaParts || "Sin datos adicionales"}</div>
          </div>
        </div>
        <button type="button" class="mgmt-del-pill-btn" onclick="deleteCustomer('${c.id}')" title="Eliminar tienda">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
          Eliminar
        </button>
      </div>`;
  }).join("");
}

function filterCustomers() {
  const inp = document.getElementById("customer-search-input");
  customerSearchQuery = inp ? inp.value : "";
  renderCustomersList();
}

async function addCustomer() {
  const storeName = (document.getElementById("new-store-name")?.value || "").trim();
  const ownerName = (document.getElementById("new-owner-name")?.value || "").trim();
  const phone     = (document.getElementById("new-phone")?.value || "").trim();
  const zone      = (document.getElementById("new-zone")?.value || "").trim();
  const address   = (document.getElementById("new-address")?.value || "").trim();

  if (!storeName) {
    toast("El nombre de la tienda es obligatorio");
    document.getElementById("new-store-name")?.focus();
    return;
  }
  if (!ownerName) {
    toast("El nombre del dueño es obligatorio");
    document.getElementById("new-owner-name")?.focus();
    return;
  }

  const localId = "c-" + Date.now();
  const newCust = { id: localId, storeName, ownerName, phone, zone, address };
  customers.unshift(newCust);
  renderCustomersList();

  let savedCloud = false;
  try {
    if (window._db && window._firebaseReady) {
      const { collection, addDoc, serverTimestamp } = window._fsLib;
      const ref = await addDoc(collection(window._db, "customers"), {
        storeName,
        ownerName,
        phone,
        zone,
        address,
        createdAt: serverTimestamp()
      });
      const idx = customers.findIndex(c => c.id === localId);
      if (idx >= 0) customers[idx].id = ref.id;
      savedCloud = true;
    }
  } catch (e) {
    console.warn("addCustomer Firebase error:", e);
  }

  // Limpiar formulario
  document.getElementById("new-store-name").value = "";
  document.getElementById("new-owner-name").value = "";
  if (document.getElementById("new-phone"))   document.getElementById("new-phone").value = "";
  if (document.getElementById("new-zone"))    document.getElementById("new-zone").value = "";
  if (document.getElementById("new-address")) document.getElementById("new-address").value = "";

  toast(savedCloud ? "Tienda registrada con éxito" : "Tienda registrada localmente");
}

async function deleteCustomer(id) {
  const c = customers.find(x => x.id === id);
  if (!c) return;

  confirmModal({
    title: `¿Eliminar "${c.storeName}"?`,
    msg: "Esta tienda será removida del directorio de clientes de la distribuidora.",
    confirmLabel: "Sí, eliminar",
    onConfirm: async () => {
      customers = customers.filter(x => x.id !== id);
      renderCustomersList();

      try {
        if (window._db && window._firebaseReady) {
          const { doc, deleteDoc } = window._fsLib;
          await deleteDoc(doc(window._db, "customers", id));
        }
      } catch (e) {
        console.warn("deleteCustomer Firebase error:", e);
      }
      toast("Tienda eliminada");
    }
  });
}
