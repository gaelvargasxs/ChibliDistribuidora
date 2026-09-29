const ADMIN_PIN = "1234";
let vendedores = [];
let pendingAdminSub = "dashboard";

function initApp() {
  if (!window._fsLib) return;
  window._fsLib.collection('vendedores').onSnapshot(snap => {
    vendedores = snap.docs.map(d => ({id: d.id, ...d.data()}));
  });
}

document.addEventListener('DOMContentLoaded', initApp);
