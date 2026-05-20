// =========================
// SANITIZAR (anti-XSS)
// =========================

function sanitizar(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

// =========================
// MOSTRAR MENSAJE
// =========================

function toast(msg, ok = true){

    const t = document.getElementById('toast');

    t.textContent = msg;

    t.style.background = ok ? '#2ecc71' : '#e74c3c';

    t.style.display = 'block';

    setTimeout(() => {

        t.style.display = 'none';

    }, 3000);
}

// =========================
// FORMATO MONEDA
// =========================

function moneda(valor){

    return '$' + valor.toLocaleString('es-CO');
}

// =========================
// MOSTRAR SECCIONES
// =========================

function mostrarSeccion(id){

    document.getElementById('sec-clientes').style.display = 'none';
    document.getElementById('sec-prestamo').style.display = 'none';
    document.getElementById('sec-abonos').style.display = 'none';
    document.getElementById('sec-resumen').style.display = 'none';

    document.getElementById('sec-' + id).style.display = 'block';

    if(id === 'clientes'){
        renderClientes();
    }

    if(id === 'prestamo'){
        llenarSelectClientes();
    }

    if(id === 'abonos'){
        llenarSelectPrestamos();
        renderAbonos();
    }

    if(id === 'resumen'){
        renderResumen();
        renderDashboard();
    }
}


// =========================
// CLIENTES
// =========================

function registrarCliente(){

    const nombre = document.getElementById('cli-nombre').value.trim();

    const cedula = document.getElementById('cli-cedula').value.trim();

    const direccion = document.getElementById('cli-direccion').value.trim();

    if(!nombre || !cedula || !direccion){

        toast('Completa todos los campos', false);

        return;
    }

    const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');

    const existe = clientes.find(c => c.cedula === cedula);

    if(existe){

        toast('La cédula ya existe', false);

        return;
    }

    clientes.push({

        id: Date.now(),
        nombre,
        cedula,
        direccion
    });

    localStorage.setItem('clientes', JSON.stringify(clientes));

    document.getElementById('cli-nombre').value = '';
    document.getElementById('cli-cedula').value = '';
    document.getElementById('cli-direccion').value = '';

    toast('Cliente registrado correctamente ✓');

    renderClientes();
}


function renderClientes(){

    const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');

    const tbody = document.getElementById('body-clientes');

    tbody.innerHTML = '';

    // FIX XSS: se construye cada fila con elementos del DOM en lugar de innerHTML
    clientes.forEach((c, i) => {

        const tr = document.createElement('tr');

        // # | Nombre | Cédula | Dirección
        [i + 1, c.nombre, c.cedula, c.direccion].forEach(val => {
            const td = document.createElement('td');
            td.textContent = val;
            tr.appendChild(td);
        });

        // Botón eliminar
        const tdBtn = document.createElement('td');
        const btn = document.createElement('button');
        btn.textContent = 'Eliminar';
        btn.onclick = () => eliminarCliente(c.id);
        tdBtn.appendChild(btn);
        tr.appendChild(tdBtn);

        tbody.appendChild(tr);
    });
}


function eliminarCliente(id){

    let clientes = JSON.parse(localStorage.getItem('clientes') || '[]');

    clientes = clientes.filter(c => c.id !== id);

    localStorage.setItem('clientes', JSON.stringify(clientes));

    renderClientes();

    toast('Cliente eliminado');
}


// =========================
// PRESTAMOS
// =========================

function llenarSelectClientes(){

    const sel = document.getElementById('pres-cliente');

    sel.innerHTML = '<option value="">-- Seleccionar --</option>';

    const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');

    // FIX XSS: se usa textContent para el texto del option
    clientes.forEach(c => {

        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.nombre;
        sel.appendChild(opt);
    });
}


// =========================
// CALCULAR PROYECCION
// =========================

function calcularPrestamo(){

    const capital = parseFloat(
        document.getElementById('pres-capital').value
    );

    const interes = parseFloat(
        document.getElementById('pres-interes').value
    );

    const cuotas = parseInt(
        document.getElementById('pres-cuotas').value
    );

    if(!capital || !interes || !cuotas){

        document.getElementById('proyeccion').style.display = 'none';

        return;
    }

    const interesMensual = capital * (interes / 100);

    const interesTotal = interesMensual * cuotas;

    const total = capital + interesTotal;

    const cuotaMensual = total / cuotas;

    document.getElementById('proyeccion').style.display = 'block';

    document.getElementById('res-capital').textContent =
        moneda(capital);

    document.getElementById('res-interes-mensual').textContent =
        moneda(interesMensual);

    document.getElementById('res-interes').textContent =
        moneda(interesTotal);

    document.getElementById('res-total').textContent =
        moneda(total);

    document.getElementById('res-cuota').textContent =
        moneda(cuotaMensual);
}


// =========================
// REGISTRAR PRESTAMO
// =========================

function registrarPrestamo(){

    const clienteId = parseInt(
        document.getElementById('pres-cliente').value
    );

    const capital = parseFloat(
        document.getElementById('pres-capital').value
    );

    const interes = parseFloat(
        document.getElementById('pres-interes').value
    );

    const cuotas = parseInt(
        document.getElementById('pres-cuotas').value
    );

    if(!clienteId || !capital || !interes || !cuotas){

        toast('Completa todos los campos', false);

        return;
    }

    if(capital <= 0){

        toast('Capital inválido', false);

        return;
    }

    if(interes <= 0){

        toast('Interés inválido', false);

        return;
    }

    if(cuotas <= 0){

        toast('Número de cuotas inválido', false);

        return;
    }

    const interesMensual = capital * (interes / 100);

    const interesTotal = interesMensual * cuotas;

    const total = capital + interesTotal;

    const clientes = JSON.parse(localStorage.getItem('clientes') || '[]');

    const cliente = clientes.find(c => c.id === clienteId);

    const prestamos = JSON.parse(localStorage.getItem('prestamos') || '[]');

    prestamos.push({

        id: Date.now(),
        clienteNombre: cliente.nombre,
        capital,
        interes,
        cuotas,
        total,
        saldo: total,
        estado: 'Activo'
    });

    localStorage.setItem('prestamos', JSON.stringify(prestamos));

    toast('Préstamo registrado ✓');

    // FIX: también actualiza resumen si está visible
    renderDashboard();
    renderResumen();

    document.getElementById('pres-capital').value = '';
    document.getElementById('pres-interes').value = '';
    document.getElementById('pres-cuotas').value = '';

    document.getElementById('proyeccion').style.display = 'none';
}


// =========================
// ABONOS
// =========================

function llenarSelectPrestamos(){

    const sel = document.getElementById('abo-prestamo');

    sel.innerHTML = '<option value="">-- Seleccionar --</option>';

    const prestamos = JSON.parse(localStorage.getItem('prestamos') || '[]');

    // FIX XSS: textContent para el texto del option
    prestamos.forEach(p => {

        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.clienteNombre + ' - ' + moneda(p.saldo);
        sel.appendChild(opt);
    });
}


function registrarAbono(){

    const prestamoId = parseInt(
        document.getElementById('abo-prestamo').value
    );

    const monto = parseFloat(
        document.getElementById('abo-monto').value
    );

    if(!prestamoId || !monto){

        toast('Completa los campos', false);

        return;
    }

    const prestamos = JSON.parse(localStorage.getItem('prestamos') || '[]');

    const prestamo = prestamos.find(p => p.id === prestamoId);

    if(monto <= 0){

        toast('El abono debe ser mayor a cero', false);

        return;
    }

    if(monto > prestamo.saldo){

        toast('El abono supera el saldo pendiente', false);

        return;
    }

    prestamo.saldo -= monto;

    if(prestamo.saldo <= 0){

        prestamo.estado = 'Pagado';

        prestamo.saldo = 0;
    }

    localStorage.setItem('prestamos', JSON.stringify(prestamos));

    const abonos = JSON.parse(localStorage.getItem('abonos') || '[]');

    abonos.push({

        id: Date.now(),
        prestamoId,
        clienteNombre: prestamo.clienteNombre,
        monto,
        saldoRestante: prestamo.saldo,
        fecha: new Date().toLocaleDateString('es-CO')
    });

    localStorage.setItem('abonos', JSON.stringify(abonos));

    toast('Abono registrado ✓');

    document.getElementById('abo-monto').value = '';

    llenarSelectPrestamos();

    renderAbonos();

    renderResumen();

    renderDashboard();
}


// =========================
// HISTORIAL DE ABONOS
// =========================

function renderAbonos(){

    const prestamoId = parseInt(
        document.getElementById('abo-prestamo').value
    );

    const todos = JSON.parse(localStorage.getItem('abonos') || '[]');

    const filtrados = prestamoId
        ? todos.filter(a => a.prestamoId === prestamoId)
        : todos;

    const tbody = document.getElementById('body-abonos');

    tbody.innerHTML = '';

    if(filtrados.length === 0){

        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.style.textAlign = 'center';
        td.style.color = '#999';
        td.textContent = 'Sin abonos registrados';
        tr.appendChild(td);
        tbody.appendChild(tr);

        return;
    }

    // FIX XSS: construcción con createElement
    filtrados.forEach((a, i) => {

        const tr = document.createElement('tr');

        [
            i + 1,
            a.fecha,
            a.clienteNombre,
            moneda(a.monto),
            moneda(a.saldoRestante)
        ].forEach(val => {
            const td = document.createElement('td');
            td.textContent = val;
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });
}


// =========================
// RESUMEN
// =========================

function renderResumen(){

    const prestamos = JSON.parse(localStorage.getItem('prestamos') || '[]');

    const tbody = document.getElementById('body-resumen');

    tbody.innerHTML = '';

    // FIX XSS: construcción con createElement
    prestamos.forEach(p => {

        const abonado = p.total - p.saldo;

        const tr = document.createElement('tr');

        [
            p.clienteNombre,
            moneda(p.capital),
            moneda(p.total),
            moneda(abonado),
            moneda(p.saldo)
        ].forEach(val => {
            const td = document.createElement('td');
            td.textContent = val;
            tr.appendChild(td);
        });

        // Columna estado con clase CSS
        const tdEstado = document.createElement('td');
        tdEstado.textContent = p.estado;
        tdEstado.className = p.estado === 'Pagado' ? 'estado-pagado' : 'estado-activo';
        tr.appendChild(tdEstado);

        tbody.appendChild(tr);
    });
}


// =========================
// DASHBOARD ADMIN
// =========================

function renderDashboard(){

    const prestamos = JSON.parse(
        localStorage.getItem('prestamos') || '[]'
    );

    const clientes = JSON.parse(
        localStorage.getItem('clientes') || '[]'
    );

    let totalPrestado = 0;

    let totalPendiente = 0;

    let totalRecuperado = 0;

    prestamos.forEach(p => {

        totalPrestado += p.total;

        totalPendiente += p.saldo;

        totalRecuperado += (p.total - p.saldo);
    });

    document.getElementById('dash-prestado').textContent = moneda(totalPrestado);

    document.getElementById('dash-pendiente').textContent = moneda(totalPendiente);

    document.getElementById('dash-recuperado').textContent = moneda(totalRecuperado);

    document.getElementById('dash-clientes').textContent = clientes.length;
}


// =========================
// LOGIN RESUMEN
// =========================

function abrirLogin(){

    document.getElementById('modal-login').style.display = 'flex';

    document.getElementById('login-user').value = '';

    document.getElementById('login-pass').value = '';
}


function cerrarLogin(){

    document.getElementById('modal-login').style.display = 'none';
}


function validarLogin(){

    const usuario = document.getElementById('login-user').value;

    const clave = document.getElementById('login-pass').value;

    const userCorrecto = 'admin';

    const passCorrecta = '12345';

    if(usuario === userCorrecto && clave === passCorrecta){

        cerrarLogin();

        mostrarSeccion('resumen');

        renderResumen();

        toast('Bienvenido administrador ✓');

    }else{

        toast('Usuario o contraseña incorrectos', false);
    }
}


// =========================
// INICIAR
// =========================

renderClientes();