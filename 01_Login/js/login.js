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
    subEl.innerHTML     = "Ingresa con tu <span>PIN de administrador</span> del sistema.";
  } else {
    titleEl.textContent = "Ingreso de Preventa";
    subEl.innerHTML     = "Ingresa con tu <span>clave de preventista</span> o supervisor asignado.";
  }
  // Store role in hidden field for doLogin
  document.getElementById("login-role-value").value = role;
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

  if (!query) { dropdown.style.display = "none"; return; }

  const matches = vendedores.filter(v =>
    (v.folio || "").toLowerCase().includes(query) ||
    (v.nombre || "").toLowerCase().includes(query)
  );

  if (!matches.length) {
    dropdown.innerHTML = `<div style="padding:.6rem .9rem;color:rgba(255,255,255,.45);font-size:.8rem;">Sin resultados</div>`;
    dropdown.style.display = "block";
    return;
  }

  dropdown.style.display = "block";
  dropdown.innerHTML = matches.map((v, i) => {
    const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
    const highlightedFolio  = (v.folio||"").replace(re, '<strong style="color:white">$1</strong>');
    const highlightedNombre = (v.nombre||"").replace(re, '<strong style="color:white">$1</strong>');
    return `<div class="login-dd-item" data-id="${v.id}" data-folio="${(v.folio||"").replace(/"/g,'&quot;')}"
              style="padding:.6rem .9rem;cursor:pointer;font-size:.85rem;color:#111827;
                     border-bottom:1px solid #F3F4F6;"
              onmousedown="selectLoginVendedor('${v.id}','${(v.folio||"").replace(/'/g,"\'")}')"
              onmouseover="highlightDDItem(this)">
              ${highlightedFolio} — ${highlightedNombre}
           </div>`;
  }).join("");
}

function highlightDDItem(el) {
  document.querySelectorAll(".login-dd-item").forEach(i => i.style.background = "");
  el.style.background = "rgba(255,255,255,.12)";
}

function selectLoginVendedor(id, folio) {
  document.getElementById("login-vendedor-input").value = folio;
  document.getElementById("login-vendedor-id").value    = id;
  document.getElementById("login-vendedor-dropdown").style.display = "none";
  const matchEl = document.getElementById("login-vendedor-match");
  matchEl.textContent = "Vendedor encontrado";
  matchEl.style.color = "rgba(150,255,180,.9)";
}

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


// Escuchar si ya hay una sesión activa (Persistencia)
window.addEventListener('DOMContentLoaded', () => {
  if(window._auth) {
    window._auth.onAuthStateChanged(user => {
      if(user) {
        toast("¡Sesión detectada! " + user.email);
      }
    });
  }
});

async function doLogin() {
  const role = document.getElementById("login-role-value").value;
  const pass = document.getElementById("login-password").value;
  const errEl = document.getElementById("login-error");
  errEl.style.display = "none";

  if (!pass) {
    errEl.innerText = "Ingresa la contraseña";
    errEl.style.display = "block";
    return;
  }

  let emailToLogin = "";

  if (role === 'admin') {
    emailToLogin = "admin@chibli.com";
  } else {
    const vendInput = document.getElementById("login-vendedor-input").value.trim();
    const vendId = document.getElementById("login-vendedor-id").value;
    
    if (vendInput.includes('@')) {
      emailToLogin = vendInput.toLowerCase();
    } else if (vendId) {
      emailToLogin = vendId.toLowerCase() + "@chibli.com";
    } else {
      errEl.innerText = "Escribe el correo del vendedor o selecciónalo de la lista";
      errEl.style.display = "block";
      return;
    }
  }

  try {
    await window._auth.signInWithEmailAndPassword(emailToLogin, pass);
    toast("¡Acceso concedido con Auth! Módulo en desarrollo.");
  }   catch (error) {
    console.error("Error Auth:", error);
    errEl.innerText = "Error Firebase: " + error.code;
    errEl.style.display = "block";
  }
}


