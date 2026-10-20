// ════════════════════════════════════════════════════════════════
// MÓDULO DE VENDEDORES (CHIBLI)
// ════════════════════════════════════════════════════════════════

let vendedorSearchQuery = "";

function nextVendedorFolio() {
  if (!vendedores || !vendedores.length) return "VEN-001";
  const nums = vendedores.map(v => {
    const m = (v.folio || "").match(/(\d+)$/);
    return m ? parseInt(m[1], 10) : 0;
  });
  const maxNum = Math.max(0, ...nums);
  return "VEN-" + String(maxNum + 1).padStart(3, "0");
}

function updateNextFolioPlaceholder() {
  const inp = document.getElementById("new-vend-folio");
  if (inp) {
    inp.placeholder = nextVendedorFolio();
  }
}

function toggleNewVendPwd(btn) {
  const inp = document.getElementById("new-vend-password");
  if (!inp) return;
  const isPass = inp.type === "password";
  inp.type = isPass ? "text" : "password";
  btn.innerHTML = isPass
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
         <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
       </svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
         <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
       </svg>`;
}

function renderVendedoresList() {
  updateNextFolioPlaceholder();
  const container = document.getElementById("vendedores-list-container");
  if (!container) return;

  const q = (vendedorSearchQuery || "").toLowerCase().trim();
  const filtered = vendedores.filter(v => {
    if (!q) return true;
    const nameMatch  = (v.nombre || "").toLowerCase().includes(q);
    const folioMatch = (v.folio || "").toLowerCase().includes(q);
    return nameMatch || folioMatch;
  });

  if (!vendedores.length) {
    container.innerHTML = `
      <div class="mgmt-empty-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        <div class="mgmt-empty-title">Aún no hay vendedores registrados</div>
        <div class="mgmt-empty-sub">Crea el primer acceso usando el formulario superior.</div>
      </div>`;
    return;
  }

  if (!filtered.length) {
    container.innerHTML = `
      <div class="mgmt-empty-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <div class="mgmt-empty-title">Sin resultados para «${esc(vendedorSearchQuery)}»</div>
        <div class="mgmt-empty-sub">Intenta buscando por nombre o por folio (ej. VEN-001).</div>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(v => {
    const initial = (v.nombre || "V").trim().charAt(0).toUpperCase();
    const folioStr = esc(v.folio || "VEN-000");

    return `
      <div class="mgmt-item-card">
        <div class="mgmt-item-left">
          <div class="mgmt-avatar-red">${initial}</div>
          <div class="mgmt-item-info">
            <div class="mgmt-item-name">${esc(v.nombre || "Sin nombre")}</div>
            <div>
              <span class="vend-folio-badge">${folioStr}</span>
            </div>
          </div>
        </div>
        <button type="button" class="mgmt-del-pill-btn" onclick="deleteVendedor('${v.id}')" title="Eliminar vendedor">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
          </svg>
          Eliminar
        </button>
      </div>`;
  }).join("");
}

function filterVendedores() {
  const inp = document.getElementById("vendedor-search-input");
  vendedorSearchQuery = inp ? inp.value : "";
  renderVendedoresList();
}

async function addVendedor() {
  const nombre   = (document.getElementById("new-vend-nombre")?.value || "").trim();
  let   folio    = (document.getElementById("new-vend-folio")?.value || "").trim();
  const password = (document.getElementById("new-vend-password")?.value || "").trim();

  if (!nombre) {
    toast("El nombre del vendedor es obligatorio");
    document.getElementById("new-vend-nombre")?.focus();
    return;
  }
  if (!password) {
    toast("La contraseña de acceso es obligatoria");
    document.getElementById("new-vend-password")?.focus();
    return;
  }

  if (!folio) {
    folio = nextVendedorFolio();
  }

  // Verificar si el folio ya existe
  if (vendedores.some(v => (v.folio || "").toUpperCase() === folio.toUpperCase())) {
    toast(`El folio ${folio} ya está en uso. Ingresa otro.`);
    document.getElementById("new-vend-folio")?.focus();
    return;
  }

  const localId = "vend-" + Date.now();
  const newVend = { id: localId, nombre, folio, password };
  vendedores.unshift(newVend);
  renderVendedoresList();

  let savedCloud = false;
  try {
    if (window._db && window._firebaseReady) {
      const { collection, addDoc, serverTimestamp } = window._fsLib;
      const ref = await addDoc(collection(window._db, "vendedores"), {
        nombre,
        folio,
        password,
        createdAt: serverTimestamp()
      });
      const idx = vendedores.findIndex(v => v.id === localId);
      if (idx >= 0) vendedores[idx].id = ref.id;
      savedCloud = true;
    }
  } catch (e) {
    console.warn("addVendedor Firebase error:", e);
  }

  // Limpiar formulario
  document.getElementById("new-vend-nombre").value = "";
  document.getElementById("new-vend-folio").value  = "";
  document.getElementById("new-vend-password").value = "";
  updateNextFolioPlaceholder();

  toast(savedCloud ? `Vendedor ${folio} registrado con éxito` : `Vendedor ${folio} guardado localmente`);
}

async function deleteVendedor(id) {
  const v = vendedores.find(x => x.id === id);
  if (!v) return;

  confirmModal({
    title: `¿Eliminar a "${v.nombre}"?`,
    msg: `El vendedor (${v.folio}) ya no podrá iniciar sesión en la aplicación.`,
    confirmLabel: "Sí, eliminar",
    onConfirm: async () => {
      vendedores = vendedores.filter(x => x.id !== id);
      renderVendedoresList();

      try {
        if (window._db && window._firebaseReady) {
          const { doc, deleteDoc } = window._fsLib;
          await deleteDoc(doc(window._db, "vendedores", id));
        }
      } catch (e) {
        console.warn("deleteVendedor Firebase error:", e);
      }
      toast("Vendedor eliminado");
    }
  });
}
