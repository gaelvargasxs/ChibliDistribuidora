// ════════════════════════════════════════════════════════════════
// MÓDULO DE VENDEDORES (CHIBLI) — ACCESO AUTORIZADO POR GOOGLE EMAIL
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

function renderVendedoresList() {
  updateNextFolioPlaceholder();
  const container = document.getElementById("vendedores-list-container");
  if (!container) return;

  const q = (vendedorSearchQuery || "").toLowerCase().trim();
  const filtered = vendedores.filter(v => {
    if (!q) return true;
    const nameMatch  = (v.nombre || "").toLowerCase().includes(q);
    const folioMatch = (v.folio || "").toLowerCase().includes(q);
    const emailMatch = (v.email || v.id || "").toLowerCase().includes(q);
    return nameMatch || folioMatch || emailMatch;
  });

  if (!vendedores.length) {
    container.innerHTML = `
      <div class="mgmt-empty-box">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        <div class="mgmt-empty-title">Aún no hay vendedores registrados</div>
        <div class="mgmt-empty-sub">Agrega su nombre, folio y correo de Google arriba para autorizarlos.</div>
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
        <div class="mgmt-empty-sub">Busca por nombre, folio (ej. VEN-001) o correo Google.</div>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(v => {
    const initial  = (v.nombre || "V").trim().charAt(0).toUpperCase();
    const folioStr = esc(v.folio || "VEN-000");
    const emailStr = esc(v.email || (String(v.id || "").includes("@") ? v.id : "Sin correo Google"));
    const safeId   = String(v.id || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");

    return `
      <div class="mgmt-item-card">
        <div class="mgmt-item-left">
          <div class="mgmt-avatar-red">${initial}</div>
          <div class="mgmt-item-info">
            <div class="mgmt-item-name">${esc(v.nombre || "Sin nombre")}</div>
            <div class="mgmt-item-meta">${emailStr}</div>
            <div>
              <span class="vend-folio-badge">${folioStr}</span>
            </div>
          </div>
        </div>
        <button type="button" class="mgmt-del-pill-btn" onclick="deleteVendedor('${safeId}')" title="Eliminar vendedor">
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
  const nombre = (document.getElementById("new-vend-nombre")?.value || "").trim();
  let   folio  = (document.getElementById("new-vend-folio")?.value || "").trim();
  const email  = (document.getElementById("new-vend-email")?.value || "").trim().toLowerCase();

  if (!nombre) {
    toast("El nombre del vendedor es obligatorio");
    document.getElementById("new-vend-nombre")?.focus();
    return;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    toast("Ingresa un correo de Google válido (ej. vendedor@gmail.com)");
    document.getElementById("new-vend-email")?.focus();
    return;
  }

  if (!folio) {
    folio = nextVendedorFolio();
  }

  if (vendedores.some(v => (v.folio || "").toUpperCase() === folio.toUpperCase())) {
    toast(`El folio ${folio} ya está en uso. Ingresa otro.`);
    document.getElementById("new-vend-folio")?.focus();
    return;
  }

  if (vendedores.some(v => (v.email || v.id || "").toLowerCase() === email)) {
    toast(`El correo ${email} ya está registrado.`);
    document.getElementById("new-vend-email")?.focus();
    return;
  }

  if (!window._db || !window._firebaseReady) {
    toast("Sin conexión con Firebase. Verifica tu red e intenta de nuevo.");
    return;
  }

  const submitBtn = document.querySelector("#form-register-vendedor button[type='submit']");
  if (submitBtn) submitBtn.disabled = true;

  try {
    const { doc, setDoc, serverTimestamp } = window._fsLib;
    await setDoc(doc(window._db, "vendedores", email), {
      nombre,
      folio,
      email,
      activo: true,
      createdAt: serverTimestamp()
    });

    if (!vendedores.some(v => v.id === email)) {
      vendedores.unshift({ id: email, nombre, folio, email, activo: true });
      renderVendedoresList();
    }

    document.getElementById("new-vend-nombre").value = "";
    document.getElementById("new-vend-folio").value  = "";
    document.getElementById("new-vend-email").value  = "";
    updateNextFolioPlaceholder();
    toast(`Vendedor ${folio} autorizado con éxito`);
  } catch (e) {
    console.warn("addVendedor Firebase error:", e);
    const msg = e?.code === "permission-denied"
      ? "Sin permiso: inicia sesión con tu cuenta de Google Administrador."
      : "No se pudo guardar el vendedor en Firebase.";
    toast(msg);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function deleteVendedor(id) {
  const v = vendedores.find(x => x.id === id);
  if (!v) return;

  confirmModal({
    title: `¿Eliminar a "${v.nombre}"?`,
    msg: `El vendedor (${v.folio} · ${v.email || v.id}) perderá el acceso inmediatamente.`,
    confirmLabel: "Sí, eliminar",
    onConfirm: async () => {
      try {
        if (window._db && window._firebaseReady) {
          const { doc, deleteDoc } = window._fsLib;
          await deleteDoc(doc(window._db, "vendedores", id));
        }
        vendedores = vendedores.filter(x => x.id !== id);
        renderVendedoresList();
        toast("Vendedor eliminado");
      } catch (e) {
        console.warn("deleteVendedor Firebase error:", e);
        toast("No se pudo eliminar: verifica permisos de administrador.");
      }
    }
  });
}

window.renderVendedores = renderVendedoresList;
window.renderVendedoresList = renderVendedoresList;
