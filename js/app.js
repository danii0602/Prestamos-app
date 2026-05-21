// =========================
// FIREBASE CONFIG
// =========================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase, ref, set, push, onValue, remove, update
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBBU_mYB2a18RFpNT-wIxSk-PouMN-BKM8",
  authDomain: "prestamos-app-882f9.firebaseapp.com",
  databaseURL: "https://prestamos-app-882f9-default-rtdb.firebaseio.com",
  projectId: "prestamos-app-882f9",
  storageBucket: "prestamos-app-882f9.firebasestorage.app",
  messagingSenderId: "12365333616",
  appId: "1:12365333616:web:754673c628e387c0a0e0b5"
};

const app = initializeApp(firebaseConfig);
const db  = getDatabase(app);

// =========================
// ESTADO LOCAL (cache)
// =========================

let clientes  = [];
let prestamos = [];
let abonos    = [];

// =========================
// ESCUCHAR CAMBIOS EN TIEMPO REAL
// =========================

onValue(ref(db, 'clientes'), snap => {
  clientes = snap.val() ? Object.entries(snap.val()).map(([k,v]) => ({...v, _key: k})) : [];
  renderClientes();
  llenarSelectClientes();
});

onValue(ref(db, 'prestamos'), snap => {
  prestamos = snap.val() ? Object.entries(snap.val()).map(([k,v]) => ({...v, _key: k})) : [];
  llenarSelectPrestamos();
  renderResumen();
  renderDashboard();
});

onValue(ref(db, 'abonos'), snap => {
  abonos = snap.val() ? Object.entries(snap.val()).map(([k,v]) => ({...v, _key: k})) : [];
  renderAbonos();
});

// =========================
// TOAST
// =========================

function toast(msg, ok = true){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = ok ? '#2ecc71' : '#e74c3c';
  t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, 3000);
}

// =========================
// FORMATO MONEDA
// =========================

function moneda(valor){
  return '$' + Number(valor).toLocaleString('es-CO');
}

// =========================
// MOSTRAR SECCIONES
// =========================

window.mostrarSeccion = function(id){
  ['clientes','prestamo','abonos','resumen'].forEach(s => {
    const el = document.getElementById('sec-' + s);
    if(el) el.style.display = 'none';
  });
  const sec = document.getElementById('sec-' + id);
  if(sec) sec.style.display = 'block';

  if(id === 'clientes')  renderClientes();
  if(id === 'prestamo')  llenarSelectClientes();
  if(id === 'abonos'){   llenarSelectPrestamos(); renderAbonos(); }
  if(id === 'resumen'){  renderResumen(); renderDashboard(); }
}

// =========================
// CLIENTES
// =========================

window.registrarCliente = async function(){
  const nombre    = document.getElementById('cli-nombre').value.trim();
  const cedula    = document.getElementById('cli-cedula').value.trim();
  const direccion = document.getElementById('cli-direccion').value.trim();

  if(!nombre || !cedula || !direccion){
    toast('Completa todos los campos', false); return;
  }
  if(!/^\d+$/.test(cedula)){
    toast('La cédula solo debe contener números', false); return;
  }
  if(clientes.find(c => c.cedula === cedula)){
    toast('La cédula ya está registrada', false); return;
  }

  await push(ref(db, 'clientes'), {
    id: Date.now(), nombre, cedula, direccion
  });

  document.getElementById('cli-nombre').value    = '';
  document.getElementById('cli-cedula').value    = '';
  document.getElementById('cli-direccion').value = '';
  toast('Cliente registrado correctamente ✓');
}

function renderClientes(){
  const tbody = document.getElementById('body-clientes');
  if(!tbody) return;
  tbody.innerHTML = '';

  if(clientes.length === 0){
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5; td.style.textAlign = 'center';
    td.style.color = '#999'; td.style.padding = '20px';
    td.textContent = 'No hay clientes registrados';
    tr.appendChild(td); tbody.appendChild(tr); return;
  }

  clientes.forEach((c, i) => {
    const tr = document.createElement('tr');
    [i+1, c.nombre, c.cedula, c.direccion].forEach(val => {
      const td = document.createElement('td');
      td.textContent = val; tr.appendChild(td);
    });
    const tdBtn = document.createElement('td');
    const btn   = document.createElement('button');
    btn.textContent = 'Eliminar';
    btn.onclick = () => eliminarCliente(c._key, c.id, c.nombre);
    tdBtn.appendChild(btn); tr.appendChild(tdBtn);
    tbody.appendChild(tr);
  });
}

window.eliminarCliente = async function(key, clienteId, nombre){
  if(!confirm(`¿Eliminar a ${nombre} y todos sus préstamos?`)) return;

  // Eliminar préstamos del cliente y sus abonos
  const presDelCliente = prestamos.filter(p => p.clienteId === clienteId);
  for(const p of presDelCliente){
    const abonosDelPres = abonos.filter(a => a.prestamoId === p.id);
    for(const a of abonosDelPres){
      await remove(ref(db, 'abonos/' + a._key));
    }
    await remove(ref(db, 'prestamos/' + p._key));
  }

  await remove(ref(db, 'clientes/' + key));
  toast('Cliente y sus datos eliminados');
}

// =========================
// PRÉSTAMOS
// =========================

function llenarSelectClientes(){
  const sel = document.getElementById('pres-cliente');
  if(!sel) return;
  sel.innerHTML = '<option value="">-- Seleccionar cliente --</option>';
  clientes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.nombre;
    sel.appendChild(opt);
  });
}

window.calcularPrestamo = function(){
  const capital = parseFloat(document.getElementById('pres-capital').value);
  const interes = parseFloat(document.getElementById('pres-interes').value);
  const cuotas  = parseInt(document.getElementById('pres-cuotas').value);

  if(!capital || !interes || !cuotas || capital<=0 || interes<=0 || cuotas<=0){
    document.getElementById('proyeccion').style.display = 'none'; return;
  }

  const interesMensual = capital * (interes / 100);
  const interesTotal   = interesMensual * cuotas;
  const total          = capital + interesTotal;
  const cuotaMensual   = total / cuotas;

  document.getElementById('proyeccion').style.display = 'block';
  document.getElementById('res-capital').textContent         = moneda(capital);
  document.getElementById('res-interes-mensual').textContent = moneda(interesMensual);
  document.getElementById('res-interes').textContent         = moneda(interesTotal);
  document.getElementById('res-total').textContent           = moneda(total);
  document.getElementById('res-cuota').textContent           = moneda(cuotaMensual);
}

window.registrarPrestamo = async function(){
  const clienteId = parseInt(document.getElementById('pres-cliente').value);
  const capital   = parseFloat(document.getElementById('pres-capital').value);
  const interes   = parseFloat(document.getElementById('pres-interes').value);
  const cuotas    = parseInt(document.getElementById('pres-cuotas').value);

  if(!clienteId || !capital || !interes || !cuotas){
    toast('Completa todos los campos', false); return;
  }
  if(capital<=0){ toast('Capital inválido', false); return; }
  if(interes<=0){ toast('Interés inválido', false); return; }
  if(cuotas<=0){  toast('Número de cuotas inválido', false); return; }

  const cliente = clientes.find(c => c.id === clienteId);
  if(!cliente){ toast('Cliente no encontrado', false); return; }

  const interesMensual = capital * (interes / 100);
  const interesTotal   = interesMensual * cuotas;
  const total          = capital + interesTotal;

  await push(ref(db, 'prestamos'), {
    id: Date.now(),
    clienteId,
    clienteNombre: cliente.nombre,
    capital, interes, cuotas, total,
    saldo: total,
    estado: 'Activo',
    fecha: new Date().toLocaleDateString('es-CO')
  });

  document.getElementById('pres-capital').value = '';
  document.getElementById('pres-interes').value = '';
  document.getElementById('pres-cuotas').value  = '';
  document.getElementById('proyeccion').style.display = 'none';
  toast('Préstamo registrado ✓');
}

// =========================
// ABONOS
// =========================

function llenarSelectPrestamos(){
  const sel = document.getElementById('abo-prestamo');
  if(!sel) return;
  sel.innerHTML = '<option value="">-- Seleccionar préstamo --</option>';
  prestamos.filter(p => p.estado === 'Activo').forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.clienteNombre + ' — Saldo: ' + moneda(p.saldo);
    sel.appendChild(opt);
  });
}

window.registrarAbono = async function(){
  const prestamoId = parseInt(document.getElementById('abo-prestamo').value);
  const monto      = parseFloat(document.getElementById('abo-monto').value);

  if(!prestamoId || !monto){ toast('Completa los campos', false); return; }
  if(monto <= 0){ toast('El abono debe ser mayor a cero', false); return; }

  const prestamo = prestamos.find(p => p.id === prestamoId);
  if(!prestamo){ toast('Préstamo no encontrado', false); return; }
  if(monto > prestamo.saldo){
    toast('El abono supera el saldo (' + moneda(prestamo.saldo) + ')', false); return;
  }

  const nuevoSaldo  = prestamo.saldo - monto;
  const nuevoEstado = nuevoSaldo <= 0 ? 'Pagado' : 'Activo';

  await update(ref(db, 'prestamos/' + prestamo._key), {
    saldo: nuevoSaldo <= 0 ? 0 : nuevoSaldo,
    estado: nuevoEstado
  });

  await push(ref(db, 'abonos'), {
    id: Date.now(),
    prestamoId,
    clienteNombre: prestamo.clienteNombre,
    monto,
    saldoRestante: nuevoSaldo <= 0 ? 0 : nuevoSaldo,
    fecha: new Date().toLocaleDateString('es-CO')
  });

  document.getElementById('abo-monto').value = '';
  toast('Abono registrado ✓');
}

window.renderAbonos = function(){
  const prestamoId = parseInt(document.getElementById('abo-prestamo').value);
  const filtrados  = prestamoId ? abonos.filter(a => a.prestamoId === prestamoId) : abonos;
  const tbody      = document.getElementById('body-abonos');
  if(!tbody) return;
  tbody.innerHTML  = '';

  if(filtrados.length === 0){
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 5; td.style.textAlign = 'center';
    td.style.color = '#999'; td.style.padding = '20px';
    td.textContent = 'Sin abonos registrados';
    tr.appendChild(td); tbody.appendChild(tr); return;
  }

  filtrados.forEach((a, i) => {
    const tr = document.createElement('tr');
    [i+1, a.fecha, a.clienteNombre, moneda(a.monto), moneda(a.saldoRestante)].forEach(val => {
      const td = document.createElement('td');
      td.textContent = val; tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// =========================
// RESUMEN
// =========================

function renderResumen(){
  const tbody = document.getElementById('body-resumen');
  if(!tbody) return;
  tbody.innerHTML = '';

  if(prestamos.length === 0){
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6; td.style.textAlign = 'center';
    td.style.color = '#999'; td.style.padding = '20px';
    td.textContent = 'No hay préstamos registrados';
    tr.appendChild(td); tbody.appendChild(tr); return;
  }

  prestamos.forEach(p => {
    const abonado = p.total - p.saldo;
    const tr      = document.createElement('tr');
    [p.clienteNombre, moneda(p.capital), moneda(p.total), moneda(abonado), moneda(p.saldo)].forEach(val => {
      const td = document.createElement('td');
      td.textContent = val; tr.appendChild(td);
    });
    const tdE = document.createElement('td');
    tdE.textContent = p.estado;
    tdE.className   = p.estado === 'Pagado' ? 'estado-pagado' : 'estado-activo';
    tr.appendChild(tdE);
    tbody.appendChild(tr);
  });
}

// =========================
// DASHBOARD
// =========================

function renderDashboard(){
  let totalPrestado = 0, totalPendiente = 0, totalRecuperado = 0;
  prestamos.forEach(p => {
    totalPrestado   += p.total;
    totalPendiente  += p.saldo;
    totalRecuperado += (p.total - p.saldo);
  });
  const dp = document.getElementById('dash-prestado');
  const dd = document.getElementById('dash-pendiente');
  const dr = document.getElementById('dash-recuperado');
  const dc = document.getElementById('dash-clientes');
  if(dp) dp.textContent = moneda(totalPrestado);
  if(dd) dd.textContent = moneda(totalPendiente);
  if(dr) dr.textContent = moneda(totalRecuperado);
  if(dc) dc.textContent = clientes.length;
}

// =========================
// LOGIN
// =========================

const HASH_USUARIO = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918';
const HASH_CLAVE   = '5994471abb01112afcc18159f6cc74b4f511b99806da59b3caf5a9c173cacfc5';

async function hashStr(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

window.abrirLogin = function(){
  document.getElementById('modal-login').style.display = 'flex';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  setTimeout(() => document.getElementById('login-user').focus(), 100);
}

window.cerrarLogin = function(){
  document.getElementById('modal-login').style.display = 'none';
}

window.validarLogin = async function(){
  const usuario = document.getElementById('login-user').value.trim();
  const clave   = document.getElementById('login-pass').value;
  if(!usuario || !clave){ toast('Ingresa usuario y contraseña', false); return; }
  const hashU = await hashStr(usuario);
  const hashC = await hashStr(clave);
  if(hashU === HASH_USUARIO && hashC === HASH_CLAVE){
    cerrarLogin();
    mostrarSeccion('resumen');
    toast('Bienvenido administrador ✓');
  } else {
    toast('Usuario o contraseña incorrectos', false);
    document.getElementById('login-pass').value = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-pass')?.addEventListener('keydown', e => {
    if(e.key === 'Enter') validarLogin();
  });
  document.getElementById('login-user')?.addEventListener('keydown', e => {
    if(e.key === 'Enter') document.getElementById('login-pass').focus();
  });
});
