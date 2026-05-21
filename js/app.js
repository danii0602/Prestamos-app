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
    td.colSpan = 7; td.style.textAlign = 'center';
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

    // Estado
    const tdE = document.createElement('td');
    tdE.textContent = p.estado;
    tdE.className   = p.estado === 'Pagado' ? 'estado-pagado' : 'estado-activo';
    tr.appendChild(tdE);

    // Botón Renovar (solo si está Activo y tiene saldo)
    const tdAcc = document.createElement('td');
    if(p.estado === 'Activo' && p.saldo > 0){
      const btn = document.createElement('button');
      btn.textContent = '🔄 Renovar';
      btn.style.background = 'transparent';
      btn.style.border = '1px solid #1f3a2e';
      btn.style.color = '#1f3a2e';
      btn.style.padding = '8px 12px';
      btn.style.borderRadius = '8px';
      btn.style.cursor = 'pointer';
      btn.style.fontSize = '.8rem';
      btn.onclick = () => abrirModalRenovar(p);
      tdAcc.appendChild(btn);
    }
    tr.appendChild(tdAcc);
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

// =========================
// EXPORTAR PDF
// =========================

window.exportarPDF = function(){
  if(prestamos.length === 0){
    toast('No hay préstamos para exportar', false);
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Encabezado
  doc.setFillColor(31, 58, 46);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('PréstamosFácil', 14, 13);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Resumen de Préstamos', 14, 22);

  // Fecha
  const fecha = new Date().toLocaleDateString('es-CO', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  doc.text('Fecha: ' + fecha, 150, 22);

  // Totales
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  let totalPrestado = 0, totalPendiente = 0, totalRecuperado = 0;
  prestamos.forEach(p => {
    totalPrestado   += p.total;
    totalPendiente  += p.saldo;
    totalRecuperado += (p.total - p.saldo);
  });

  doc.setFont('helvetica', 'bold');
  doc.text('Total prestado: '    + moneda(totalPrestado),   14, 38);
  doc.text('Total recuperado: '  + moneda(totalRecuperado), 80, 38);
  doc.text('Saldo pendiente: '   + moneda(totalPendiente),  150, 38);

  // Tabla
  const filas = prestamos.map(p => [
    p.clienteNombre,
    moneda(p.capital),
    moneda(p.total),
    moneda(p.total - p.saldo),
    moneda(p.saldo),
    p.estado
  ]);

  doc.autoTable({
    startY: 44,
    head: [['Cliente', 'Capital', 'Total deuda', 'Abonado', 'Saldo pendiente', 'Estado']],
    body: filas,
    headStyles: {
      fillColor: [31, 58, 46],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9
    },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [237, 243, 239] },
    columnStyles: {
      5: {
        fontStyle: 'bold',
        textColor: (cell) => cell.raw === 'Pagado' ? [39, 174, 96] : [214, 137, 16]
      }
    },
    didDrawCell: (data) => {
      if(data.section === 'body' && data.column.index === 5){
        const val = data.cell.raw;
        if(val === 'Pagado'){
          data.doc.setTextColor(39, 174, 96);
        } else {
          data.doc.setTextColor(214, 137, 16);
        }
        data.doc.setFont('helvetica', 'bold');
        data.doc.text(val, data.cell.x + 2, data.cell.y + data.cell.height / 2 + 1);
        data.doc.setTextColor(0, 0, 0);
        data.doc.setFont('helvetica', 'normal');
      }
    }
  });

  // Pie de página
  const totalPaginas = doc.internal.getNumberOfPages();
  for(let i = 1; i <= totalPaginas; i++){
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      'Página ' + i + ' de ' + totalPaginas + '  |  PréstamosFácil',
      105, 290, { align: 'center' }
    );
  }

  doc.save('prestamos-' + new Date().toISOString().slice(0,10) + '.pdf');
  toast('PDF exportado correctamente ✓');
}

// =========================
// RENOVAR PRÉSTAMO
// =========================

window.abrirModalRenovar = function(prestamo){
  // Crear modal dinámico
  let modal = document.getElementById('modal-renovar');
  if(modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'modal-renovar';
  modal.className = 'modal-login';
  modal.style.display = 'flex';

  modal.innerHTML = `
    <div class="login-box" style="max-width:420px">
      <h2>🔄 Renovar Préstamo</h2>
      <p style="color:#777; font-size:.85rem; margin-bottom:16px;">
        Cliente: <strong>${prestamo.clienteNombre}</strong><br>
        Saldo actual: <strong style="color:#1f3a2e">${moneda(prestamo.saldo)}</strong>
      </p>

      <label for="ren-interes">Nueva tasa de interés (%)</label>
      <input type="number" id="ren-interes" value="${prestamo.interes}" inputmode="decimal"
        style="margin-bottom:12px" oninput="previsualizarRenovacion('${prestamo._key}', ${prestamo.saldo})"/>

      <label for="ren-cuotas">Número de cuotas (meses)</label>
      <input type="number" id="ren-cuotas" value="${prestamo.cuotas}" inputmode="numeric"
        style="margin-bottom:16px" oninput="previsualizarRenovacion('${prestamo._key}', ${prestamo.saldo})"/>

      <div id="ren-preview" style="background:#edf3ef; border-radius:10px; padding:14px; margin-bottom:16px; font-size:.9rem; display:none">
        <p style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #ddd">
          <span>Nuevo capital (saldo actual)</span>
          <strong id="ren-res-capital"></strong>
        </p>
        <p style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #ddd">
          <span>Interés total</span>
          <strong id="ren-res-interes"></strong>
        </p>
        <p style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #ddd">
          <span>Nueva deuda total</span>
          <strong id="ren-res-total" style="color:#1f3a2e"></strong>
        </p>
        <p style="display:flex; justify-content:space-between; padding:6px 0">
          <span>Nueva cuota mensual</span>
          <strong id="ren-res-cuota" style="color:#1f3a2e"></strong>
        </p>
      </div>

      <div class="login-buttons">
        <button onclick="confirmarRenovacion('${prestamo._key}', ${prestamo.saldo})">Confirmar Renovación</button>
        <button onclick="cerrarModalRenovar()" class="btn-cancelar">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Previsualizar al abrir
  previsualizarRenovacion(prestamo._key, prestamo.saldo);
}

window.previsualizarRenovacion = function(key, saldoActual){
  const interes = parseFloat(document.getElementById('ren-interes').value);
  const cuotas  = parseInt(document.getElementById('ren-cuotas').value);

  if(!interes || !cuotas || interes <= 0 || cuotas <= 0){
    document.getElementById('ren-preview').style.display = 'none';
    return;
  }

  const interesMensual = saldoActual * (interes / 100);
  const interesTotal   = interesMensual * cuotas;
  const nuevoTotal     = saldoActual + interesTotal;
  const nuevaCuota     = nuevoTotal / cuotas;

  document.getElementById('ren-preview').style.display = 'block';
  document.getElementById('ren-res-capital').textContent = moneda(saldoActual);
  document.getElementById('ren-res-interes').textContent = moneda(interesTotal);
  document.getElementById('ren-res-total').textContent   = moneda(nuevoTotal);
  document.getElementById('ren-res-cuota').textContent   = moneda(nuevaCuota);
}

window.confirmarRenovacion = async function(key, saldoActual){
  const interes = parseFloat(document.getElementById('ren-interes').value);
  const cuotas  = parseInt(document.getElementById('ren-cuotas').value);

  if(!interes || !cuotas || interes <= 0 || cuotas <= 0){
    toast('Completa todos los campos', false); return;
  }

  const interesMensual = saldoActual * (interes / 100);
  const interesTotal   = interesMensual * cuotas;
  const nuevoTotal     = saldoActual + interesTotal;

  await update(ref(db, 'prestamos/' + key), {
    capital: saldoActual,
    interes,
    cuotas,
    total: nuevoTotal,
    saldo: nuevoTotal,
    estado: 'Activo',
    fecha: new Date().toLocaleDateString('es-CO'),
    renovado: true
  });

  cerrarModalRenovar();
  toast('Préstamo renovado correctamente ✓');
}

window.cerrarModalRenovar = function(){
  const modal = document.getElementById('modal-renovar');
  if(modal) modal.remove();
}

// =========================
// DESCARGAR PDF DE UN PRÉSTAMO
// =========================

window.descargarPDFPrestamo = function(){
  const clienteId = parseInt(document.getElementById('pres-cliente').value);
  const capital   = parseFloat(document.getElementById('pres-capital').value);
  const interes   = parseFloat(document.getElementById('pres-interes').value);
  const cuotas    = parseInt(document.getElementById('pres-cuotas').value);

  if(!clienteId || !capital || !interes || !cuotas){
    toast('Primero completa los datos del préstamo', false); return;
  }

  const cliente = clientes.find(c => c.id === clienteId);
  if(!cliente){ toast('Cliente no encontrado', false); return; }

  const interesMensual = capital * (interes / 100);
  const interesTotal   = interesMensual * cuotas;
  const total          = capital + interesTotal;
  const cuotaMensual   = total / cuotas;
  const fecha          = new Date().toLocaleDateString('es-CO', {
    year:'numeric', month:'long', day:'numeric'
  });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // --- Encabezado ---
  doc.setFillColor(31, 58, 46);
  doc.rect(0, 0, 210, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PréstamosFácil', 14, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Comprobante de Préstamo', 14, 24);
  doc.text('Fecha: ' + fecha, 150, 24);

  // --- Datos del cliente ---
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(237, 243, 239);
  doc.rect(14, 38, 182, 8, 'F');
  doc.text('DATOS DEL CLIENTE', 16, 44);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Nombre:',    16, 56); doc.setFont('helvetica','bold'); doc.text(cliente.nombre,    50, 56);
  doc.setFont('helvetica', 'normal');
  doc.text('Cédula:',    16, 64); doc.setFont('helvetica','bold'); doc.text(cliente.cedula,    50, 64);
  doc.setFont('helvetica', 'normal');
  doc.text('Dirección:', 16, 72); doc.setFont('helvetica','bold'); doc.text(cliente.direccion, 50, 72);

  // --- Datos del préstamo ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setFillColor(237, 243, 239);
  doc.rect(14, 82, 182, 8, 'F');
  doc.text('DETALLE DEL PRÉSTAMO', 16, 88);

  doc.autoTable({
    startY: 94,
    head: [['Concepto', 'Valor']],
    body: [
      ['Capital prestado',          moneda(capital)],
      ['Tasa de interés mensual',   interes + '%'],
      ['Interés mensual',           moneda(interesMensual)],
      ['Número de cuotas',          cuotas + ' meses'],
      ['Interés total acumulado',   moneda(interesTotal)],
      ['Total deuda',               moneda(total)],
      ['Cuota mensual a pagar',     moneda(cuotaMensual)],
    ],
    headStyles: { fillColor: [31, 58, 46], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { fontSize: 10 },
    alternateRowStyles: { fillColor: [245, 245, 243] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 100 },
      1: { halign: 'right' }
    },
    didDrawRow: (data) => {
      // Resaltar fila de total y cuota
      if(data.row.index === 5 || data.row.index === 6){
        data.doc.setFillColor(31, 58, 46);
      }
    }
  });

  const finalY = doc.lastAutoTable.finalY + 10;

  // --- Firma ---
  doc.setDrawColor(31, 58, 46);
  doc.line(14, finalY + 20, 90, finalY + 20);
  doc.line(120, finalY + 20, 196, finalY + 20);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text('Firma del cliente', 30, finalY + 26);
  doc.text('Firma del prestamista', 138, finalY + 26);

  // --- Pie ---
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('PréstamosFácil  |  Documento generado el ' + fecha, 105, 285, { align: 'center' });

  doc.save('prestamo-' + cliente.nombre.replace(/ /g,'_') + '-' + new Date().toISOString().slice(0,10) + '.pdf');
  toast('PDF descargado correctamente ✓');
}
