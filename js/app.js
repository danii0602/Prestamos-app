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
// ESTADO LOCAL
// =========================

let clientes  = [];
let prestamos = [];
let abonos    = [];

// =========================
// ESCUCHAR FIREBASE EN TIEMPO REAL
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
// CALCULAR PRÓXIMA FECHA DE VENCIMIENTO
// =========================

function proximaFechaVencimiento(diaPago){
  if(!diaPago) return null;
  const hoy    = new Date();
  let   anio   = hoy.getFullYear();
  let   mes    = hoy.getMonth(); // 0-based

  // Si hoy ya pasó el día de pago de este mes, la próxima es el siguiente mes
  const vencimientoEsteMes = new Date(anio, mes, diaPago);
  if(hoy > vencimientoEsteMes){
    mes++;
    if(mes > 11){ mes = 0; anio++; }
  }

  return new Date(anio, mes, diaPago);
}

function estadoCuota(diaPago){
  if(!diaPago) return { texto: '—', vencida: false };
  const hoy      = new Date();
  const proxima  = proximaFechaVencimiento(diaPago);
  const diffDias = Math.ceil((proxima - hoy) / (1000*60*60*24));
  const fechaStr = proxima.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });

  if(diffDias < 0){
    return { texto: `⚠️ Vencida (${fechaStr})`, vencida: true, proxima };
  } else if(diffDias === 0){
    return { texto: `🔴 Vence HOY`, vencida: true, proxima };
  } else if(diffDias <= 3){
    return { texto: `🟡 Vence en ${diffDias} días (${fechaStr})`, vencida: false, proxima, alerta: true };
  } else {
    return { texto: `🟢 Vence el ${fechaStr}`, vencida: false, proxima };
  }
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

  if(!nombre || !cedula || !direccion){ toast('Completa todos los campos', false); return; }
  if(!/^\d+$/.test(cedula)){ toast('La cédula solo debe contener números', false); return; }
  if(clientes.find(c => c.cedula === cedula)){ toast('La cédula ya está registrada', false); return; }

  await push(ref(db, 'clientes'), { id: Date.now(), nombre, cedula, direccion });

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
      const td = document.createElement('td'); td.textContent = val; tr.appendChild(td);
    });
    const tdBtn = document.createElement('td');
    const btn   = document.createElement('button');
    btn.textContent = 'Eliminar';
    btn.onclick = () => eliminarCliente(c._key, c.id, c.nombre);
    tdBtn.appendChild(btn); tr.appendChild(tdBtn);
    tbody.appendChild(tr);
  });
}

// Filtrar clientes en tiempo real
window.filtrarClientes = function(){
  const q = document.getElementById('buscador-clientes').value.trim().toLowerCase();
  const filas = document.querySelectorAll('#body-clientes tr');
  let encontrados = 0;

  filas.forEach(tr => {
    const texto = tr.textContent.toLowerCase();
    const visible = !q || texto.includes(q);
    tr.style.display = visible ? '' : 'none';
    if(visible) encontrados++;
  });

  const sinRes = document.getElementById('sin-resultados');
  if(sinRes) sinRes.style.display = encontrados === 0 && q ? 'block' : 'none';
}

window.eliminarCliente = async function(key, clienteId, nombre){
  if(!confirm(`¿Eliminar a ${nombre} y todos sus préstamos?`)) return;
  const presDelCliente = prestamos.filter(p => p.clienteId === clienteId);
  for(const p of presDelCliente){
    const abonosDelPres = abonos.filter(a => a.prestamoId === p.id);
    for(const a of abonosDelPres) await remove(ref(db, 'abonos/' + a._key));
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
    opt.value = c.id; opt.textContent = c.nombre; sel.appendChild(opt);
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
  const diaPago   = parseInt(document.getElementById('pres-dia-pago').value);

  if(!clienteId || !capital || !interes || !cuotas){ toast('Completa todos los campos', false); return; }
  if(!diaPago || diaPago < 1 || diaPago > 28){ toast('El día de pago debe estar entre 1 y 28', false); return; }
  if(capital<=0){ toast('Capital inválido', false); return; }
  if(interes<=0){ toast('Interés inválido', false); return; }
  if(cuotas<=0){  toast('Número de cuotas inválido', false); return; }

  const cliente = clientes.find(c => c.id === clienteId);
  if(!cliente){ toast('Cliente no encontrado', false); return; }

  const interesMensual = capital * (interes / 100);
  const interesTotal   = interesMensual * cuotas;
  const total          = capital + interesTotal;

  await push(ref(db, 'prestamos'), {
    id: Date.now(), clienteId, clienteNombre: cliente.nombre,
    capital, interes, cuotas, total, saldo: total,
    diaPago, estado: 'Activo',
    fecha: new Date().toLocaleDateString('es-CO')
  });

  document.getElementById('pres-capital').value  = '';
  document.getElementById('pres-interes').value  = '';
  document.getElementById('pres-cuotas').value   = '';
  document.getElementById('pres-dia-pago').value = '';
  document.getElementById('proyeccion').style.display = 'none';
  toast('Préstamo registrado ✓');
}

// =========================
// DESCARGAR PDF DEL PRÉSTAMO
// =========================

window.descargarPDFPrestamo = function(){
  const clienteId = parseInt(document.getElementById('pres-cliente').value);
  const capital   = parseFloat(document.getElementById('pres-capital').value);
  const interes   = parseFloat(document.getElementById('pres-interes').value);
  const cuotas    = parseInt(document.getElementById('pres-cuotas').value);
  const diaPago   = parseInt(document.getElementById('pres-dia-pago').value);

  if(!clienteId || !capital || !interes || !cuotas){
    toast('Completa los datos del préstamo primero', false); return;
  }

  const cliente = clientes.find(c => c.id === clienteId);
  if(!cliente){ toast('Cliente no encontrado', false); return; }

  const interesMensual = capital * (interes / 100);
  const interesTotal   = interesMensual * cuotas;
  const total          = capital + interesTotal;
  const cuotaMensual   = total / cuotas;
  const fecha = new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFillColor(31,58,46);
  doc.rect(0,0,210,32,'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(20); doc.setFont('helvetica','bold');
  doc.text('PréstamosFácil', 14, 14);
  doc.setFontSize(10); doc.setFont('helvetica','normal');
  doc.text('Comprobante de Préstamo', 14, 24);
  doc.text('Fecha: ' + fecha, 150, 24);

  doc.setTextColor(0,0,0);
  doc.setFillColor(237,243,239);
  doc.rect(14,38,182,8,'F');
  doc.setFontSize(11); doc.setFont('helvetica','bold');
  doc.text('DATOS DEL CLIENTE', 16, 44);
  doc.setFontSize(10); doc.setFont('helvetica','normal');
  doc.text('Nombre:',    16, 56); doc.setFont('helvetica','bold'); doc.text(cliente.nombre,    55, 56);
  doc.setFont('helvetica','normal');
  doc.text('Cédula:',    16, 64); doc.setFont('helvetica','bold'); doc.text(cliente.cedula,    55, 64);
  doc.setFont('helvetica','normal');
  doc.text('Dirección:', 16, 72); doc.setFont('helvetica','bold'); doc.text(cliente.direccion, 55, 72);

  doc.setFillColor(237,243,239);
  doc.rect(14,80,182,8,'F');
  doc.setFontSize(11); doc.setFont('helvetica','bold');
  doc.text('DETALLE DEL PRÉSTAMO', 16, 86);

  const filasDetalle = [
    ['Capital prestado',        moneda(capital)],
    ['Tasa de interés mensual', interes + '%'],
    ['Interés mensual',         moneda(interesMensual)],
    ['Número de cuotas',        cuotas + ' meses'],
    ['Interés total acumulado', moneda(interesTotal)],
    ['Total deuda',             moneda(total)],
    ['Cuota mensual a pagar',   moneda(cuotaMensual)],
  ];
  if(diaPago) filasDetalle.push(['Día de pago mensual', 'Día ' + diaPago + ' de cada mes']);

  doc.autoTable({
    startY: 92,
    head: [['Concepto', 'Valor']],
    body: filasDetalle,
    headStyles: { fillColor:[31,58,46], textColor:255, fontStyle:'bold' },
    bodyStyles: { fontSize:10 },
    alternateRowStyles: { fillColor:[245,245,243] },
    columnStyles: { 0: { fontStyle:'bold', cellWidth:100 }, 1: { halign:'right' } }
  });

  const finalY = doc.lastAutoTable.finalY + 16;
  doc.setDrawColor(31,58,46);
  doc.line(14, finalY+20, 90, finalY+20);
  doc.line(120, finalY+20, 196, finalY+20);
  doc.setFontSize(9); doc.setTextColor(100);
  doc.text('Firma del cliente', 30, finalY+26);
  doc.text('Firma del prestamista', 138, finalY+26);
  doc.setFontSize(8); doc.setTextColor(150);
  doc.text('PréstamosFácil  |  Generado el ' + fecha, 105, 285, { align:'center' });

  doc.save('prestamo-' + cliente.nombre.replace(/ /g,'_') + '-' + new Date().toISOString().slice(0,10) + '.pdf');
  toast('PDF descargado ✓');
}

// =========================
// ABONOS
// =========================

function llenarSelectPrestamos(){
  const sel = document.getElementById('abo-prestamo');
  if(!sel) return;
  sel.innerHTML = '<option value="">-- Seleccionar préstamo --</option>';
  prestamos.filter(p => p.estado === 'Activo').forEach(p => {
    const cuota = estadoCuota(p.diaPago);
    const opt   = document.createElement('option');
    opt.value   = p.id;
    opt.textContent = p.clienteNombre + ' — Saldo: ' + moneda(p.saldo);
    if(cuota.vencida) opt.textContent += ' ⚠️';
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

  const nuevoSaldo  = Math.max(0, prestamo.saldo - monto);
  const nuevoEstado = nuevoSaldo <= 0 ? 'Pagado' : 'Activo';

  await update(ref(db, 'prestamos/' + prestamo._key), { saldo: nuevoSaldo, estado: nuevoEstado });
  await push(ref(db, 'abonos'), {
    id: Date.now(), prestamoId,
    clienteNombre: prestamo.clienteNombre,
    monto, saldoRestante: nuevoSaldo,
    fecha: new Date().toLocaleDateString('es-CO')
  });

  document.getElementById('abo-monto').value = '';
  toast('Abono registrado ✓');
}

window.renderAbonos = function(){
  // Mostrar alerta de cuotas vencidas en abonos
  const alertaEl = document.getElementById('alerta-cuotas');
  if(alertaEl){
    const vencidas = prestamos.filter(p => p.estado === 'Activo' && p.diaPago && estadoCuota(p.diaPago).vencida);
    if(vencidas.length > 0){
      alertaEl.style.display = 'block';
      alertaEl.innerHTML = `⚠️ <strong>${vencidas.length} préstamo(s) con cuota vencida:</strong> ` +
        vencidas.map(p => p.clienteNombre).join(', ');
    } else {
      alertaEl.style.display = 'none';
    }
  }

  const prestamoId = parseInt(document.getElementById('abo-prestamo').value);
  const filtrados  = prestamoId ? abonos.filter(a => a.prestamoId === prestamoId) : abonos;
  const tbody      = document.getElementById('body-abonos');
  if(!tbody) return;
  tbody.innerHTML  = '';

  // Mostrar info de cuota del préstamo seleccionado
  const infoEl = document.getElementById('info-cuota-prestamo');
  if(infoEl && prestamoId){
    const pres = prestamos.find(p => p.id === prestamoId);
    if(pres && pres.diaPago){
      const cuota = estadoCuota(pres.diaPago);
      infoEl.style.display = 'block';
      infoEl.style.background = cuota.vencida ? '#fdecea' : cuota.alerta ? '#fef9e7' : '#edf3ef';
      infoEl.style.borderLeft = `4px solid ${cuota.vencida ? '#e74c3c' : cuota.alerta ? '#f39c12' : '#27ae60'}`;
      infoEl.textContent = '📅 Próxima cuota: ' + cuota.texto + ' — Valor: ' + moneda(pres.total / pres.cuotas);
    } else {
      infoEl.style.display = 'none';
    }
  } else if(infoEl){
    infoEl.style.display = 'none';
  }

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
      const td = document.createElement('td'); td.textContent = val; tr.appendChild(td);
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
    td.colSpan = 8; td.style.textAlign = 'center';
    td.style.color = '#999'; td.style.padding = '20px';
    td.textContent = 'No hay préstamos registrados';
    tr.appendChild(td); tbody.appendChild(tr); return;
  }

  prestamos.forEach(p => {
    const abonado = p.total - p.saldo;
    const cuota   = p.estado === 'Activo' ? estadoCuota(p.diaPago) : null;
    const tr      = document.createElement('tr');

    // Resaltar fila si cuota vencida
    if(cuota && cuota.vencida) tr.style.background = '#fdecea';
    else if(cuota && cuota.alerta) tr.style.background = '#fef9e7';

    [p.clienteNombre, moneda(p.capital), moneda(p.total), moneda(abonado), moneda(p.saldo)].forEach(val => {
      const td = document.createElement('td'); td.textContent = val; tr.appendChild(td);
    });

    // Estado
    const tdE = document.createElement('td');
    tdE.textContent = p.estado;
    tdE.className   = p.estado === 'Pagado' ? 'estado-pagado' : 'estado-activo';
    tr.appendChild(tdE);

    // Próxima cuota
    const tdC = document.createElement('td');
    if(p.estado === 'Activo' && p.diaPago){
      tdC.textContent  = cuota.texto;
      tdC.style.fontSize = '.8rem';
      tdC.style.fontWeight = cuota.vencida ? '600' : 'normal';
    } else if(p.estado === 'Pagado'){
      tdC.textContent = '—';
      tdC.style.color = '#999';
    } else {
      tdC.textContent = 'Sin día fijado';
      tdC.style.color = '#999';
    }
    tr.appendChild(tdC);

    // Acciones
    const tdAcc = document.createElement('td');
    tdAcc.style.display = 'flex';
    tdAcc.style.gap = '6px';

    if(p.estado === 'Activo' && p.saldo > 0){
      const btnRenovar = document.createElement('button');
      btnRenovar.textContent = '🔄 Renovar';
      btnRenovar.style.cssText = 'background:transparent;border:1px solid #1f3a2e;color:#1f3a2e;padding:7px 10px;border-radius:8px;cursor:pointer;font-size:.78rem;white-space:nowrap;';
      btnRenovar.onclick = () => abrirModalRenovar(p);
      tdAcc.appendChild(btnRenovar);

      const btnPagado = document.createElement('button');
      btnPagado.textContent = '✅ Pagado';
      btnPagado.style.cssText = 'background:transparent;border:1px solid #27ae60;color:#27ae60;padding:7px 10px;border-radius:8px;cursor:pointer;font-size:.78rem;white-space:nowrap;';
      btnPagado.onclick = () => marcarComoPagado(p);
      tdAcc.appendChild(btnPagado);
    }

    tr.appendChild(tdAcc);
    tbody.appendChild(tr);
  });
}

// =========================
// MARCAR COMO PAGADO
// =========================

window.marcarComoPagado = async function(prestamo){
  if(!confirm(`¿Marcar el préstamo de ${prestamo.clienteNombre} como pagado?`)) return;
  await update(ref(db, 'prestamos/' + prestamo._key), { saldo: 0, estado: 'Pagado' });
  toast('Préstamo marcado como pagado ✓');
}

// =========================
// RENOVAR PRÉSTAMO
// =========================

window.abrirModalRenovar = function(prestamo){
  let modal = document.getElementById('modal-renovar');
  if(modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'modal-renovar';
  modal.className = 'modal-login';
  modal.style.display = 'flex';

  modal.innerHTML = `
    <div class="login-box" style="max-width:420px">
      <h2>🔄 Renovar Préstamo</h2>
      <p style="color:#777;font-size:.85rem;margin-bottom:16px;">
        Cliente: <strong>${prestamo.clienteNombre}</strong><br>
        Saldo actual (nuevo capital): <strong style="color:#1f3a2e">${moneda(prestamo.saldo)}</strong>
      </p>
      <label>Nueva tasa de interés (%)</label>
      <input type="number" id="ren-interes" value="${prestamo.interes}" inputmode="decimal"
        style="margin-bottom:12px" oninput="previsualizarRenovacion(${prestamo.saldo})"/>
      <label>Número de cuotas (meses)</label>
      <input type="number" id="ren-cuotas" value="${prestamo.cuotas}" inputmode="numeric"
        style="margin-bottom:12px" oninput="previsualizarRenovacion(${prestamo.saldo})"/>
      <label>Día de pago mensual (1-28)</label>
      <input type="number" id="ren-dia-pago" value="${prestamo.diaPago || ''}" min="1" max="28"
        inputmode="numeric" style="margin-bottom:16px" placeholder="Ej: 15"/>
      <div id="ren-preview" style="background:#edf3ef;border-radius:10px;padding:14px;margin-bottom:16px;font-size:.9rem;display:none">
        <p style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #ddd">
          <span>Nuevo capital</span><strong id="ren-res-capital"></strong>
        </p>
        <p style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #ddd">
          <span>Interés total</span><strong id="ren-res-interes"></strong>
        </p>
        <p style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #ddd">
          <span>Nueva deuda total</span><strong id="ren-res-total" style="color:#1f3a2e"></strong>
        </p>
        <p style="display:flex;justify-content:space-between;padding:6px 0">
          <span>Nueva cuota mensual</span><strong id="ren-res-cuota" style="color:#1f3a2e"></strong>
        </p>
      </div>
      <div class="login-buttons">
        <button onclick="confirmarRenovacion('${prestamo._key}', ${prestamo.saldo})">Confirmar</button>
        <button onclick="cerrarModalRenovar()" class="btn-cancelar">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  previsualizarRenovacion(prestamo.saldo);
}

window.previsualizarRenovacion = function(saldoActual){
  const interes = parseFloat(document.getElementById('ren-interes').value);
  const cuotas  = parseInt(document.getElementById('ren-cuotas').value);
  if(!interes || !cuotas || interes<=0 || cuotas<=0){
    document.getElementById('ren-preview').style.display = 'none'; return;
  }
  const interesTotal = saldoActual * (interes/100) * cuotas;
  const nuevoTotal   = saldoActual + interesTotal;
  document.getElementById('ren-preview').style.display = 'block';
  document.getElementById('ren-res-capital').textContent = moneda(saldoActual);
  document.getElementById('ren-res-interes').textContent = moneda(interesTotal);
  document.getElementById('ren-res-total').textContent   = moneda(nuevoTotal);
  document.getElementById('ren-res-cuota').textContent   = moneda(nuevoTotal / cuotas);
}

window.confirmarRenovacion = async function(key, saldoActual){
  const interes = parseFloat(document.getElementById('ren-interes').value);
  const cuotas  = parseInt(document.getElementById('ren-cuotas').value);
  const diaPago = parseInt(document.getElementById('ren-dia-pago').value);

  if(!interes || !cuotas || interes<=0 || cuotas<=0){
    toast('Completa todos los campos', false); return;
  }
  if(diaPago && (diaPago < 1 || diaPago > 28)){
    toast('El día de pago debe estar entre 1 y 28', false); return;
  }

  const interesTotal = saldoActual * (interes/100) * cuotas;
  const nuevoTotal   = saldoActual + interesTotal;

  await update(ref(db, 'prestamos/' + key), {
    capital: saldoActual, interes, cuotas,
    total: nuevoTotal, saldo: nuevoTotal,
    diaPago: diaPago || null,
    estado: 'Activo', renovado: true,
    fecha: new Date().toLocaleDateString('es-CO')
  });

  cerrarModalRenovar();
  toast('Préstamo renovado correctamente ✓');
}

window.cerrarModalRenovar = function(){
  const modal = document.getElementById('modal-renovar');
  if(modal) modal.remove();
}

// =========================
// CAPITAL INGRESADO (Firebase)
// =========================

let capitalIngresos = []; // historial de ingresos

onValue(ref(db, 'capitalIngresos'), snap => {
  capitalIngresos = snap.val()
    ? Object.entries(snap.val()).map(([k,v]) => ({...v, _key: k}))
    : [];
  renderDashboard();
  renderHistorialCapital();
});

window.abrirModalCapital = function(){
  let modal = document.getElementById('modal-capital');
  if(modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'modal-capital';
  modal.className = 'modal-login';
  modal.style.display = 'flex';

  modal.innerHTML = `
    <div class="login-box" style="max-width:380px">
      <h2>➕ Agregar Capital</h2>
      <p style="color:#777;font-size:.85rem;margin-bottom:16px;">
        Ingresa el monto de dinero nuevo que vas a destinar a préstamos.
      </p>
      <label>Monto ($)</label>
      <input type="number" id="cap-monto" placeholder="Ej: 2000000" inputmode="numeric"
        style="margin-bottom:12px"/>
      <label>Nota (opcional)</label>
      <input type="text" id="cap-nota" placeholder="Ej: Ahorro de enero"
        style="margin-bottom:16px"/>
      <div class="login-buttons">
        <button onclick="guardarCapital()">Guardar</button>
        <button onclick="cerrarModalCapital()" class="btn-cancelar">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('cap-monto').focus(), 100);
}

window.cerrarModalCapital = function(){
  const modal = document.getElementById('modal-capital');
  if(modal) modal.remove();
}

window.guardarCapital = async function(){
  const monto = parseFloat(document.getElementById('cap-monto').value);
  const nota  = document.getElementById('cap-nota').value.trim();

  if(!monto || monto <= 0){ toast('Ingresa un monto válido', false); return; }

  await push(ref(db, 'capitalIngresos'), {
    monto,
    nota: nota || 'Sin nota',
    fecha: new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' }),
    timestamp: Date.now()
  });

  cerrarModalCapital();
  toast('Capital agregado correctamente ✓');
}

function renderHistorialCapital(){
  const box   = document.getElementById('historial-capital-box');
  const tbody = document.getElementById('body-historial-capital');
  if(!tbody) return;
  tbody.innerHTML = '';

  if(capitalIngresos.length === 0){
    if(box) box.style.display = 'none';
    return;
  }

  if(box) box.style.display = 'block';

  const ordenados = [...capitalIngresos].sort((a,b) => b.timestamp - a.timestamp);
  ordenados.forEach((c, i) => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid #eee';
    [i+1, c.fecha, moneda(c.monto), c.nota].forEach((val, idx) => {
      const td = document.createElement('td');
      td.textContent = val;
      td.style.padding = '10px';
      td.style.fontSize = '.9rem';
      if(idx === 2) td.style.color = '#1f3a2e';
      if(idx === 2) td.style.fontWeight = '600';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// =========================
// DASHBOARD
// =========================

function renderDashboard(){
  let interesesGenera = 0;
  let deudaTotal      = 0;
  let enLaCalle       = 0;
  let totalRecaudado  = 0;

  prestamos.forEach(p => {
    interesesGenera += (p.total - p.capital);
    deudaTotal      += p.total;
    enLaCalle       += p.saldo;
    totalRecaudado  += (p.total - p.saldo);
  });

  // Capital total ingresado manualmente
  const capitalIngresado = capitalIngresos.reduce((s, c) => s + c.monto, 0);

  // Dinero en casa = capital ingresado - lo que está en la calle + lo recaudado
  const enCasa = capitalIngresado - enLaCalle + totalRecaudado;

  const vencidas = prestamos.filter(p =>
    p.estado==='Activo' && p.diaPago && estadoCuota(p.diaPago).vencida
  ).length;

  function set(id, val){
    const el = document.getElementById(id);
    if(el) el.textContent = typeof val === 'number' ? moneda(val) : val;
  }

  set('dash-capital-ingresado', capitalIngresado);
  set('dash-intereses',         interesesGenera);
  set('dash-deuda-total',       deudaTotal);
  set('dash-en-calle',          enLaCalle);
  set('dash-en-casa',           Math.max(0, enCasa));
  set('dash-recaudado',         totalRecaudado);

  const dc = document.getElementById('dash-clientes');
  if(dc) dc.textContent = clientes.length;

  // Alerta vencidas en resumen
  const alertaEl = document.getElementById('alerta-vencidas-resumen');
  if(alertaEl){
    const listVenc = prestamos.filter(p =>
      p.estado==='Activo' && p.diaPago && estadoCuota(p.diaPago).vencida
    );
    if(listVenc.length > 0){
      alertaEl.style.display = 'block';
      alertaEl.innerHTML = `⚠️ <strong>${listVenc.length} cliente(s) con cuota vencida:</strong> ` +
        listVenc.map(p => p.clienteNombre).join(', ');
    } else {
      alertaEl.style.display = 'none';
    }
  }

  const dv = document.getElementById('dash-vencidas');
  if(dv){
    dv.textContent = vencidas;
    dv.parentElement.style.borderLeft = vencidas > 0 ? '4px solid #e74c3c' : '';
    dv.parentElement.style.background = vencidas > 0 ? '#fdecea' : '';
  }
}

// =========================
// EXPORTAR PDF RESUMEN
// =========================

window.exportarPDF = function(){
  if(prestamos.length === 0){ toast('No hay préstamos para exportar', false); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('landscape');
  const fecha = new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' });

  doc.setFillColor(31,58,46);
  doc.rect(0,0,297,28,'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(18); doc.setFont('helvetica','bold');
  doc.text('PréstamosFácil', 14, 13);
  doc.setFontSize(10); doc.setFont('helvetica','normal');
  doc.text('Resumen de Préstamos', 14, 22);
  doc.text('Fecha: ' + fecha, 230, 22);

  let totalPrestado=0, totalPendiente=0, totalRecuperado=0;
  prestamos.forEach(p => {
    totalPrestado   += p.total;
    totalPendiente  += p.saldo;
    totalRecuperado += (p.total - p.saldo);
  });

  doc.setTextColor(0,0,0); doc.setFontSize(10); doc.setFont('helvetica','bold');
  doc.text('Total prestado: ' + moneda(totalPrestado), 14, 38);
  doc.text('Recuperado: '     + moneda(totalRecuperado), 100, 38);
  doc.text('Saldo pendiente: '+ moneda(totalPendiente), 200, 38);

  doc.autoTable({
    startY: 44,
    head: [['Cliente','Capital','Total deuda','Abonado','Saldo pendiente','Estado','Próxima cuota']],
    body: prestamos.map(p => {
      const cuota = p.estado==='Activo' && p.diaPago ? estadoCuota(p.diaPago).texto.replace(/[🟢🟡🔴⚠️]/g,'').trim() : '—';
      return [p.clienteNombre, moneda(p.capital), moneda(p.total), moneda(p.total-p.saldo), moneda(p.saldo), p.estado, cuota];
    }),
    headStyles: { fillColor:[31,58,46], textColor:255, fontStyle:'bold', fontSize:9 },
    bodyStyles: { fontSize:9 },
    alternateRowStyles: { fillColor:[237,243,239] }
  });

  const totalPags = doc.internal.getNumberOfPages();
  for(let i=1; i<=totalPags; i++){
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text('Página ' + i + ' de ' + totalPags + '  |  PréstamosFácil', 148, 200, { align:'center' });
  }

  doc.save('resumen-prestamos-' + new Date().toISOString().slice(0,10) + '.pdf');
  toast('PDF exportado ✓');
}

// =========================
// AUTENTICACIÓN — credenciales en Firebase
// =========================

async function hashStr(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// Estado de sesión
let sesionActiva     = false;
let sesionResumen    = false;

// Credenciales cargadas desde Firebase
let credencialesApp     = null;
let credencialesResumen = null;

// Cargar credenciales desde Firebase al iniciar
onValue(ref(db, 'credenciales/app'), snap => {
  if(snap.val()){
    credencialesApp = snap.val();
  } else {
    // Primera vez: inicializar credenciales por defecto (hasheadas)
    hashStr('admin').then(hu => hashStr('12345').then(hc => {
      set(ref(db, 'credenciales/app'), { usuario: hu, clave: hc });
    }));
  }
});

onValue(ref(db, 'credenciales/resumen'), snap => {
  if(snap.val()){
    credencialesResumen = snap.val();
  } else {
    hashStr('admin').then(hu => hashStr('admin123').then(hc => {
      set(ref(db, 'credenciales/resumen'), { usuario: hu, clave: hc });
    }));
  }
});

// =========================
// LOGIN GENERAL (acceso a la app)
// =========================

function mostrarLoginApp(){
  document.getElementById('app-contenido').style.display    = 'none';
  document.getElementById('modal-login-app').style.display  = 'flex';
  setTimeout(() => document.getElementById('app-user').focus(), 100);
}

function ocultarLoginApp(){
  document.getElementById('modal-login-app').style.display = 'none';
  document.getElementById('app-contenido').style.display   = 'block';
}

window.validarLoginApp = async function(){
  const usuario = document.getElementById('app-user').value.trim();
  const clave   = document.getElementById('app-pass').value;

  if(!usuario || !clave){ toast('Ingresa usuario y contraseña', false); return; }
  if(!credencialesApp){ toast('Cargando... intenta de nuevo', false); return; }

  const hashU = await hashStr(usuario);
  const hashC = await hashStr(clave);

  if(hashU === credencialesApp.usuario && hashC === credencialesApp.clave){
    sesionActiva = true;
    ocultarLoginApp();
    mostrarSeccion('clientes');
    toast('Bienvenido ✓');
  } else {
    toast('Usuario o contraseña incorrectos', false);
    document.getElementById('app-pass').value = '';
  }
}

// =========================
// LOGIN RESUMEN
// =========================

window.abrirLogin = function(){
  if(!sesionActiva){ toast('Debes iniciar sesión primero', false); return; }
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
  if(!credencialesResumen){ toast('Cargando... intenta de nuevo', false); return; }

  const hashU = await hashStr(usuario);
  const hashC = await hashStr(clave);

  if(hashU === credencialesResumen.usuario && hashC === credencialesResumen.clave){
    sesionResumen = true;
    cerrarLogin();
    mostrarSeccion('resumen');
    toast('Bienvenido administrador ✓');
  } else {
    toast('Usuario o contraseña incorrectos', false);
    document.getElementById('login-pass').value = '';
  }
}

// =========================
// CAMBIAR CREDENCIALES
// =========================

window.abrirModalCambiarClave = function(tipo){
  let modal = document.getElementById('modal-cambiar-clave');
  if(modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'modal-cambiar-clave';
  modal.className = 'modal-login';
  modal.style.display = 'flex';

  const titulo = tipo === 'app' ? 'Cambiar acceso a la App' : 'Cambiar acceso al Resumen';

  modal.innerHTML = `
    <div class="login-box" style="max-width:380px">
      <h2>🔑 ${titulo}</h2>
      <label>Nuevo usuario</label>
      <input type="text" id="new-user" placeholder="Nuevo usuario" style="margin-bottom:12px" autocomplete="off"/>
      <label>Nueva contraseña</label>
      <input type="password" id="new-pass" placeholder="Nueva contraseña" style="margin-bottom:12px" autocomplete="off"/>
      <label>Confirmar contraseña</label>
      <input type="password" id="new-pass2" placeholder="Repetir contraseña" style="margin-bottom:16px" autocomplete="off"/>
      <div class="login-buttons">
        <button onclick="guardarNuevaClave('${tipo}')">Guardar</button>
        <button onclick="document.getElementById('modal-cambiar-clave').remove()" class="btn-cancelar">Cancelar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => document.getElementById('new-user').focus(), 100);
}

window.guardarNuevaClave = async function(tipo){
  const usuario = document.getElementById('new-user').value.trim();
  const clave   = document.getElementById('new-pass').value;
  const clave2  = document.getElementById('new-pass2').value;

  if(!usuario || !clave){ toast('Completa todos los campos', false); return; }
  if(clave !== clave2){   toast('Las contraseñas no coinciden', false); return; }
  if(clave.length < 4){   toast('La contraseña debe tener al menos 4 caracteres', false); return; }

  const hashU = await hashStr(usuario);
  const hashC = await hashStr(clave);

  await set(ref(db, 'credenciales/' + tipo), { usuario: hashU, clave: hashC });

  document.getElementById('modal-cambiar-clave').remove();
  toast('Credenciales actualizadas correctamente ✓');
}

document.addEventListener('DOMContentLoaded', () => {
  // Enter en login app
  document.getElementById('app-pass')?.addEventListener('keydown', e => {
    if(e.key === 'Enter') validarLoginApp();
  });
  document.getElementById('app-user')?.addEventListener('keydown', e => {
    if(e.key === 'Enter') document.getElementById('app-pass').focus();
  });

  // Enter en login resumen
  document.getElementById('login-pass')?.addEventListener('keydown', e => {
    if(e.key === 'Enter') validarLogin();
  });
  document.getElementById('login-user')?.addEventListener('keydown', e => {
    if(e.key === 'Enter') document.getElementById('login-pass').focus();
  });

  // Mostrar login app al cargar
  mostrarLoginApp();
});
