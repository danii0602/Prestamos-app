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
const banner = document.getElementById('banner-instalar');
const btnInstalar = document.getElementById('btn-instalar');
const btnCerrar = document.getElementById('btn-cerrar-banner');

// El navegador dispara este evento cuando la app es instalable
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  banner.style.display = 'flex';
});

// Clic en "Instalar"
btnInstalar.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    banner.style.display = 'none';
  }
  deferredPrompt = null;
});

// Clic en cerrar banner
btnCerrar.addEventListener('click', () => {
  banner.style.display = 'none';
});

// Ocultar banner si ya está instalada
window.addEventListener('appinstalled', () => {
  banner.style.display = 'none';
  deferredPrompt = null;
});

// =============================================
// RESALTAR BOTÓN ACTIVO EN NAV INFERIOR
// =============================================

// Sobreescribe mostrarSeccion para marcar el tab activo
const _mostrarSeccionOriginal = mostrarSeccion;

window.mostrarSeccion = function(id) {
  _mostrarSeccionOriginal(id);

  document.querySelectorAll('#nav-bottom button').forEach(btn => {
    btn.classList.toggle('activo', btn.dataset.sec === id);
  });
};

// Marcar "clientes" como activo al cargar
document.querySelector('#nav-bottom button[data-sec="clientes"]')
  .classList.add('activo');