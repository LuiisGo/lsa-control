// ============================================================
// Portal.gs — Portal público para proveedores
// ============================================================
// Cols ACCESOS_PROVEEDORES: 0=ID 1=Proveedor_ID 2=Proveedor_Nombre
//                           3=Codigo_Acceso 4=Link_Token 5=Activo

var PORTAL_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin I,O,0,1

function _generarCodigo() {
  var code = '';
  for (var i = 0; i < 6; i++) {
    code += PORTAL_CODE_CHARS.charAt(Math.floor(Math.random() * PORTAL_CODE_CHARS.length));
  }
  return code;
}

function getAccesosProveedores(user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var sheet = getSheet('ACCESOS_PROVEEDORES');
  var data  = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    lista.push({
      id:              String(row[0]),
      proveedorId:     String(row[1]||''),
      proveedorNombre: String(row[2]||''),
      codigoAcceso:    String(row[3]||''),
      linkToken:       String(row[4]||''),
      activo:          row[5] !== false && row[5] !== 'false' && row[5] !== 0,
    });
  }
  return { success: true, data: lista };
}

function generarAccesoProveedor(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var proveedorId     = String(body.proveedorId     || '');
  var proveedorNombre = String(body.proveedorNombre || '');
  if (!proveedorId) return { success: false, error: 'proveedorId requerido' };

  var codigo = _generarCodigo();
  var token  = generateId() + generateId(); // longer token for URL

  var sheet = getSheet('ACCESOS_PROVEEDORES');
  var data  = sheet.getDataRange().getValues();

  // Check if already exists — regenerate
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === proveedorId) {
      sheet.getRange(i+1, 4).setValue(codigo);
      sheet.getRange(i+1, 5).setValue(token);
      sheet.getRange(i+1, 6).setValue(true);
      return { success: true, data: { id: String(data[i][0]), codigoAcceso: codigo, linkToken: token } };
    }
  }

  // Create new
  var id = generateId();
  sheet.appendRow([id, proveedorId, proveedorNombre, codigo, token, true]);
  return { success: true, data: { id: id, codigoAcceso: codigo, linkToken: token } };
}

function loginPortalProveedor(body) {
  var token  = String(body.token  || '').trim();
  var codigo = String(body.codigo || '').trim().toUpperCase();
  if (!token || !codigo) return { success: false, error: 'Token y código requeridos' };

  var sheet = getSheet('ACCESOS_PROVEEDORES');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[4]) === token && String(row[3]) === codigo) {
      var activo = row[5];
      if (activo === false || activo === 'false' || activo === 0) {
        return { success: false, error: 'Acceso desactivado' };
      }
      return { success: true, data: { proveedorId: String(row[1]), proveedorNombre: String(row[2]) } };
    }
  }
  return { success: false, error: 'Credenciales inválidas' };
}

function getPortalProveedor(body) {
  // Verify access
  var loginRes = loginPortalProveedor(body);
  if (!loginRes.success) return loginRes;

  var proveedorId     = loginRes.data.proveedorId;
  var proveedorNombre = loginRes.data.proveedorNombre;
  var hoy             = getFechaHoy();

  // Read proveedor frecuencia (col 4 = Frecuencia_Pago)
  var provSheet = getSheet('Proveedores');
  var provData  = provSheet.getDataRange().getValues();
  var frecuenciaPago = 'quincenal';
  for (var pi = 1; pi < provData.length; pi++) {
    if (String(provData[pi][0]) === proveedorId) {
      frecuenciaPago = String(provData[pi][4] || 'quincenal');
      break;
    }
  }

  // Cargas sheet (reused in multiple inner loops)
  var cargasSheet = getSheet('Cargas');
  var cargasData  = cargasSheet.getDataRange().getValues();

  // ── HOY ──────────────────────────────────────────────────────
  var cargasHoy = [];
  var totalHoy  = 0;
  for (var i = 1; i < cargasData.length; i++) {
    var rowF = dateToString(cargasData[i][1]);
    var rowP = String(cargasData[i][3] || '');
    if (rowF === hoy && rowP === proveedorNombre) {
      var t = num(cargasData[i][6]);
      cargasHoy.push({
        hora:     String(cargasData[i][2] || ''),
        litrosT1: num(cargasData[i][4]),
        litrosT2: num(cargasData[i][5]),
        total:    t,
      });
      totalHoy += t;
    }
  }

  // ── PERÍODOS ACTUAL Y ANTERIOR ─────────────────────────────────
  var periodoActual = calcularPeriodoProveedor(proveedorId);
  // For previous period: subtract 1 day from inicio to land inside the previous period
  var dInicio = new Date(periodoActual.inicio + 'T12:00:00');
  dInicio.setDate(dInicio.getDate() - 1);
  var periodoAnterior = _calcularPeriodoAnteriorProveedor(proveedorId, dInicio);

  function _resumenPeriodo(periodo) {
    var byDay = {};
    var total = 0;
    for (var ci = 1; ci < cargasData.length; ci++) {
      var f = dateToString(cargasData[ci][1]);
      var p = String(cargasData[ci][3] || '');
      if (f >= periodo.inicio && f <= periodo.fin && p === proveedorNombre) {
        var lit = num(cargasData[ci][6]);
        byDay[f] = (byDay[f] || 0) + lit;
        total   += lit;
      }
    }
    var dias = Object.keys(byDay).sort();
    var acumulado = 0;
    var cargasDia = dias.map(function(d) {
      acumulado += byDay[d];
      return { fecha: d, totalLitros: Math.round(byDay[d]*10)/10, acumulado: Math.round(acumulado*10)/10 };
    });

    var planSheet = getSheet('PLANILLAS');
    var planData  = planSheet.getDataRange().getValues();
    var planilla  = null;
    for (var j = 1; j < planData.length; j++) {
      if (String(planData[j][3]) === proveedorId &&
          String(planData[j][1]) === periodo.inicio &&
          String(planData[j][2]) === periodo.fin) {
        planilla = {
          litros:      num(planData[j][5]),
          precioLitro: num(planData[j][6]),
          subtotal:    num(planData[j][7]),
          iva:         num(planData[j][8]),
          totalConIva: num(planData[j][9]),
          estado:      String(planData[j][10] || 'GENERADA'),
          aplicaIva:   planData[j][12] === true || planData[j][12] === 'true' || planData[j][12] === 1,
        };
        break;
      }
    }

    return {
      tipo:        periodo.tipo,
      inicio:      periodo.inicio,
      fin:         periodo.fin,
      cargas:      cargasDia,
      totalLitros: Math.round(total * 10) / 10,
      planilla:    planilla,
    };
  }

  // ── HISTORIAL (last 10 planillas) ────────────────────────────
  var planSheet2 = getSheet('PLANILLAS');
  var planData2  = planSheet2.getDataRange().getValues();
  var historial  = [];
  for (var h = 1; h < planData2.length; h++) {
    if (String(planData2[h][3]) === proveedorId) {
      historial.push({
        inicio:      String(planData2[h][1]),
        fin:         String(planData2[h][2]),
        litros:      num(planData2[h][5]),
        precioLitro: num(planData2[h][6]),
        subtotal:    num(planData2[h][7]),
        iva:         num(planData2[h][8]),
        totalConIva: num(planData2[h][9]),
        estado:      String(planData2[h][10] || 'GENERADA'),
        aplicaIva:   planData2[h][12] === true || planData2[h][12] === 'true' || planData2[h][12] === 1,
      });
    }
  }
  historial.sort(function(a, b) { return b.inicio > a.inicio ? 1 : -1; });
  historial = historial.slice(0, 10);

  return {
    success: true,
    data: {
      proveedorNombre: proveedorNombre,
      frecuenciaPago:  frecuenciaPago,
      hoy: {
        fecha:       hoy,
        cargas:      cargasHoy,
        totalLitros: Math.round(totalHoy * 10) / 10,
      },
      periodoActual:   _resumenPeriodo(periodoActual),
      periodoAnterior: _resumenPeriodo(periodoAnterior),
      historial:       historial,
    }
  };
}

// Helper: calculate previous period for a proveedor
// Pass a Date object that falls INSIDE the desired previous period
function _calcularPeriodoAnteriorProveedor(proveedorId, dateInPrevPeriod) {
  var provSheet = getSheet('Proveedores');
  var provData  = provSheet.getDataRange().getValues();
  var frecuencia = 'quincenal';
  var diaCorte   = 1;
  for (var i = 1; i < provData.length; i++) {
    if (String(provData[i][0]) === proveedorId) {
      frecuencia = String(provData[i][4] || 'quincenal');
      diaCorte   = (provData[i][5] != null && provData[i][5] !== '') ? Number(provData[i][5]) : 1;
      break;
    }
  }

  if (frecuencia !== 'semanal') {
    return calcularQuincenaAnterior(null); // existing function in Quincena.gs
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
  function fmtDDMM(d) { return pad(d.getDate()) + '/' + pad(d.getMonth()+1); }

  var d   = new Date(dateInPrevPeriod);
  var dow = d.getDay() === 0 ? 7 : d.getDay();
  var daysFromCut = (dow - diaCorte + 7) % 7;
  var inicio = new Date(d);
  inicio.setDate(d.getDate() - daysFromCut);
  var fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 6);

  return {
    tipo:   'Semana del ' + fmtDDMM(inicio) + ' al ' + fmtDDMM(fin),
    inicio: fmt(inicio),
    fin:    fmt(fin),
  };
}
