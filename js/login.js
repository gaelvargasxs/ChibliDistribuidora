// ════════════════════════════════════════════════════════════════
let currentSession = null;

function setLoginRole(role) {
  document.getElementById("toggle-vendedor").classList.toggle("active", role === "vendedor");
  document.getElementById("toggle-admin").classList.toggle("active",   role === "admin");
  document.getElementById("login-vendedor-wrap").style.display = role === "vendedor" ? "" : "none";
  const titleEl = document.getElementById("login-title");
  const subEl   = document.getElementById("login-sub");
  if (role === "admin") {
    titleEl.textContent = "Acceso Administrador";
    subEl.innerHTML     = "Ingresa con tu <span>contraseña de administrador</span> del sistema.";
  } else {
    titleEl.textContent = "Ingreso de Vendedor";
    subEl.innerHTML     = "Ingresa con tu <span>clave de vendedor</span> o supervisor asignado.";
  }
  // Store role in hidden field for doLogin
  document.getElementById("login-role-value").value = role;
  const errEl = document.getElementById("login-error");
  if (errEl) {
    errEl.classList.remove("show");
    errEl.style.background = "";
    errEl.style.color = "";
    errEl.style.borderColor = "";
  }
}

function toggleLoginPwd(btn) {
  const inp = document.getElementById("login-password");
  const isText = inp.type === "text";
  inp.type = isText ? "password" : "text";
  btn.innerHTML = isText
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

function onLoginRoleChange() {
  // Legacy stub — now handled by setLoginRole
}


let _loginVendDropdownIdx = -1;

function populateLoginVendedores() {
  // La lista se filtra dinámicamente al escribir
}

function filterLoginVendedores() {
  const query = (document.getElementById("login-vendedor-input").value || "").toLowerCase().trim();
  const dropdown = document.getElementById("login-vendedor-dropdown");
  const matchEl  = document.getElementById("login-vendedor-match");
  const hiddenId = document.getElementById("login-vendedor-id");
  _loginVendDropdownIdx = -1;
  hiddenId.value = "";
  matchEl.textContent = "";

  if (!query || query.includes("@")) { dropdown.style.display = "none"; return; }

  const matches = vendedores.filter(v =>
    (v.folio || "").toLowerCase().includes(query) ||
    (v.nombre || "").toLowerCase().includes(query)
  );

  if (!matches.length) {
    dropdown.style.display = "none";
    return;
  }

  dropdown.style.display = "block";
  dropdown.innerHTML = matches.map((v, i) => {
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
    const highlightedFolio  = (v.folio||"").replace(re, '<strong style="color:#C8102E">$1</strong>');
    const highlightedNombre = (v.nombre||"").replace(re, '<strong style="color:#C8102E">$1</strong>');
    return `<div class="login-dd-item" data-id="${v.id}" data-folio="${(v.folio||"").replace(/"/g,'&quot;')}"
              style="padding:.6rem .9rem;cursor:pointer;font-size:.85rem;color:#111827;
                     border-bottom:1px solid #F3F4F6;"
              onmousedown="selectLoginVendedor('${v.id}','${(v.folio||"").replace(/'/g,"\\'")}')"
              onmouseover="highlightDDItem(this)">
              ${highlightedFolio} — ${highlightedNombre}
           </div>`;
  }).join("");
}

function highlightDDItem(el) {
  document.querySelectorAll(".login-dd-item").forEach(i => i.style.background = "");
  el.style.background = "#FEF2F2";
}

function selectLoginVendedor(id, folio) {
  document.getElementById("login-vendedor-input").value = folio;
  document.getElementById("login-vendedor-id").value    = id;
  document.getElementById("login-vendedor-dropdown").style.display = "none";
  const matchEl = document.getElementById("login-vendedor-match");
  matchEl.textContent = "✓ Vendedor encontrado";
  matchEl.style.color = "#16A34A";
}

document.addEventListener("click", e => {
  const wrap = document.getElementById("login-vendedor-wrap");
  const dd   = document.getElementById("login-vendedor-dropdown");
  if (dd && wrap && !wrap.contains(e.target)) dd.style.display = "none";
});

function loginVendedorKeydown(e) {
  const dropdown = document.getElementById("login-vendedor-dropdown");
  const items = [...dropdown.querySelectorAll(".login-dd-item")];
  if (!items.length) { if (e.key === "Enter") doLogin(); return; }
  if (e.key === "ArrowDown") {
    e.preventDefault();
    _loginVendDropdownIdx = Math.min(_loginVendDropdownIdx + 1, items.length - 1);
    items.forEach((it, i) => it.style.background = i === _loginVendDropdownIdx ? "rgba(255,255,255,.15)" : "");
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    _loginVendDropdownIdx = Math.max(_loginVendDropdownIdx - 1, 0);
    items.forEach((it, i) => it.style.background = i === _loginVendDropdownIdx ? "rgba(255,255,255,.15)" : "");
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (_loginVendDropdownIdx >= 0 && items[_loginVendDropdownIdx]) {
      const it = items[_loginVendDropdownIdx];
      selectLoginVendedor(it.dataset.id, it.dataset.folio);
    } else {
      doLogin();
    }
  } else if (e.key === "Escape") {
    dropdown.style.display = "none";
  }
}

async function doLogin() {
  const role  = document.getElementById("login-role-value")?.value || "vendedor";
  const pass  = document.getElementById("login-password").value.trim();
  const errEl = document.getElementById("login-error");
  errEl.classList.remove("show");
  errEl.style.background = "";
  errEl.style.color = "";
  errEl.style.borderColor = "";
  errEl.textContent = "Usuario o contraseña incorrectos";

  if (!pass) {
    errEl.textContent = "Escribe tu contraseña";
    errEl.classList.add("show"); return;
  }

  const authMsg = (e, email) => {
    if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential" || e.code === "auth/invalid-login-credentials") return "Contraseña incorrecta";
    if (e.code === "auth/user-not-found") return "El usuario " + email + " no existe en Firebase Auth";
    if (e.code === "auth/too-many-requests") return "Demasiados intentos, espera un momento";
    if (e.code === "auth/operation-not-supported-in-this-environment") return "Abre la página con http://localhost (no con doble clic en el archivo)";
    if (e.code === "auth/operation-not-allowed") return "Activa Email/Password en Firebase Authentication";
    if (e.code === "auth/unauthorized-domain") return "Dominio no autorizado en Firebase Authentication";
    return "Error de acceso (" + (e.code || e.message) + ")";
  };

  // ── ADMINISTRADOR: Firebase Authentication ─────────────────
  if (role === "admin") {
    const email = "admin@chibli.com";
    try {
      if (window._auth) {
        await window._auth.signInWithEmailAndPassword(email, pass);
      } else if (pass !== ADMIN_PIN) {            // sin Auth (modo demo)
        errEl.classList.add("show"); return;
      }
    } catch (e) {
      if (e.code === "auth/network-request-failed" && pass === ADMIN_PIN) {
        // respaldo sin internet
      } else {
        errEl.textContent = authMsg(e, email);
        errEl.classList.add("show"); return;
      }
    }
    currentSession = { role: "admin" };
    adminUnlocked  = true;
    applySession();
    return;
  }

  // ── VENDEDOR ───────────────────────────────────────────────
  const vendId    = document.getElementById("login-vendedor-id").value;
  const inputRaw  = (document.getElementById("login-vendedor-input").value || "").trim();
  const inputText = inputRaw.toLowerCase();
  const esCorreo  = inputText.includes("@");

  if (!inputText) {
    errEl.style.background = "";
    errEl.style.color = "";
    errEl.style.borderColor = "";
    errEl.textContent = "Escribe tu folio o correo de vendedor";
    errEl.classList.add("show"); return;
  }

  if (inputText === "admin@chibli.com" || inputText === "admin") {
    errEl.style.background = "";
    errEl.style.color = "";
    errEl.style.borderColor = "";
    errEl.textContent = "Esa cuenta es de Administrador. Selecciona la pestaña Administrador.";
    errEl.classList.add("show"); return;
  }

  // Número de un correo tipo "vendedor1@chibli.com" -> 1
  const numCorreo = esCorreo ? ((inputText.split("@")[0].match(/(\d+)$/) || [])[1] || null) : null;
  const numFolio  = v => ((v.folio || "").match(/(\d+)$/) || [])[1];

  let vendedor = vendedores.find(v => v.id === vendId);
  if (!vendedor && esCorreo) {
    vendedor = vendedores.find(v => (v.email || "").toLowerCase() === inputText) ||
               (numCorreo && vendedores.find(v => parseInt(numFolio(v)) === parseInt(numCorreo)));
  }
  if (!vendedor && !esCorreo) {
    vendedor = vendedores.find(v =>
      (v.folio  || "").toLowerCase() === inputText ||
      (v.nombre || "").toLowerCase() === inputText ||
      (v.folio  || "").toLowerCase().includes(inputText) ||
      (v.nombre || "").toLowerCase().includes(inputText)
    );
  }

  if (!vendedor && !esCorreo) {
    errEl.style.background = "";
    errEl.style.color = "";
    errEl.style.borderColor = "";
    errEl.textContent = vendedores.length === 0
      ? "No hay vendedores registrados. Entra como Admin primero."
      : "Vendedor no encontrado. Verifica tu folio.";
    errEl.classList.add("show"); return;
  }

  // Correos candidatos en Firebase Auth
  const candidatos = [];
  if (esCorreo) candidatos.push(inputText);
  if (vendedor) {
    if (vendedor.email) candidatos.push(vendedor.email.toLowerCase());
    const n = parseInt(numFolio(vendedor));
    if (n) candidatos.push("vendedor" + n + "@chibli.com");
    candidatos.push(vendedor.id.toLowerCase() + "@chibli.com");
  }

  let autenticado = false;
  let ultimoError = null;
  if (window._auth) {
    for (const email of [...new Set(candidatos)]) {
      try {
        await window._auth.signInWithEmailAndPassword(email, pass);
        autenticado = true;
        break;
      } catch (e) {
        ultimoError = e;
        if (e.code === "auth/network-request-failed" || e.code === "auth/too-many-requests") break;
      }
    }
  }

  // Respaldo: contraseña guardada en Firestore (vendedores sin cuenta en Auth)
  if (!autenticado && vendedor && vendedor.password && pass === vendedor.password) {
    autenticado = true;
  }

  if (!autenticado) {
    errEl.style.background = "";
    errEl.style.color = "";
    errEl.style.borderColor = "";
    errEl.textContent = ultimoError ? authMsg(ultimoError, candidatos[0] || "") : "Contraseña incorrecta";
    errEl.classList.add("show"); return;
  }

  if (!vendedor) {
    // Cuenta de Auth sin registro en la colección vendedores
    vendedor = { id: inputText, folio: inputText.split("@")[0].toUpperCase(), nombre: inputText.split("@")[0] };
  }

  currentSession = { role: "vendedor", vendedorId: vendedor.id, vendedorFolio: vendedor.folio, vendedorNombre: vendedor.nombre };
  applySession();
}

// ═══ SESIÓN ═══
function applySession() {
  if (!currentSession) return;
  document.getElementById("login-password").value = "";
  const errEl = document.getElementById("login-error");
  errEl.classList.remove("show");
  errEl.style.background = "";
  errEl.style.color = "";
  errEl.style.borderColor = "";

  // En esta entrega solo existe el módulo de Inventario (exclusivo de Administrador).
  // Si entra un Vendedor, se valida su acceso pero solo muestra el toast.
  if (currentSession.role === "vendedor") {
    const label = currentSession.vendedorNombre || currentSession.vendedorFolio || "Vendedor";
    toast("Acceso aceptado, " + label, 4000);
    if (window._auth) window._auth.signOut().catch(() => {});
    currentSession = null;
    return;
  }

  // Administrador → entra directo al módulo de Inventarios
  document.getElementById("login-screen").classList.add("hidden");
  document.body.classList.add("role-admin");
  document.body.classList.remove("role-vendedor");
  document.getElementById("app-header").style.display = "";
  document.getElementById("tab-bar").style.display = "";
  document.getElementById("view-admin").classList.add("active");
  document.getElementById("session-label").textContent = "Administrador";
  document.getElementById("header-menu-sub").textContent = "admin@chibli.com";
  renderStockList();
  toast("Bienvenido, Administrador");
}

function doLogout() {
  if (window._auth) window._auth.signOut().catch(() => {});
  currentSession = null;
  adminUnlocked = false;
  closeHeaderMenu();
  if (typeof closeAddProductView === "function") closeAddProductView();
  document.body.classList.remove("role-admin", "role-vendedor");
  document.getElementById("app-header").style.display = "none";
  document.getElementById("tab-bar").style.display = "none";
  document.getElementById("view-admin").classList.remove("active");
  document.getElementById("login-screen").classList.remove("hidden");
  document.getElementById("login-password").value = "";
  setLoginRole("vendedor");
}
