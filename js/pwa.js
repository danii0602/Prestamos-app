// =============================================
// REGISTRAR SERVICE WORKER
// =============================================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then(() => console.log('Service Worker registrado ✓'))
      .catch(err => console.warn('SW error:', err));
  });
}

// =============================================
// BANNER DE INSTALACIÓN
// =============================================

let deferredPrompt = null;
const banner      = document.getElementById('banner-instalar');
const btnInstalar = document.getElementById('btn-instalar');
const btnCerrar   = document.getElementById('btn-cerrar-banner');

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  if(banner) banner.style.display = 'flex';
});

if(btnInstalar){
  btnInstalar.addEventListener('click', async () => {
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if(outcome === 'accepted' && banner) banner.style.display = 'none';
    deferredPrompt = null;
  });
}

if(btnCerrar){
  btnCerrar.addEventListener('click', () => {
    if(banner) banner.style.display = 'none';
  });
}

window.addEventListener('appinstalled', () => {
  if(banner) banner.style.display = 'none';
  deferredPrompt = null;
});

// =============================================
// NAV INFERIOR — marcar botón activo
// NO depende de mostrarSeccion, solo escucha clicks
// =============================================

function marcarNavActivo(id){
  document.querySelectorAll('#nav-bottom button').forEach(btn => {
    btn.classList.toggle('activo', btn.dataset.sec === id);
  });
}

// Escuchar clicks en nav inferior
document.querySelectorAll('#nav-bottom button').forEach(btn => {
  btn.addEventListener('click', () => {
    if(btn.dataset.sec) marcarNavActivo(btn.dataset.sec);
  });
});

// Escuchar clicks en nav superior
document.querySelectorAll('nav:first-of-type button').forEach(btn => {
  btn.addEventListener('click', () => {
    const match = btn.getAttribute('onclick')?.match(/'(\w+)'/);
    if(match) marcarNavActivo(match[1]);
  });
});

// Marcar clientes como activo al cargar
window.addEventListener('load', () => marcarNavActivo('clientes'));
