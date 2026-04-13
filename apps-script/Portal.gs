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
  // Verify access first
  var loginRes = loginPortalProveedor(body);
  if (!loginRes.success) return loginRes;

  var proveedorId     = loginRes.data.proveedorId;
  var proveedorNombre = loginRes.data.proveedorNombre;
  var hoy             = getFechaHoy();

  // Last 7 days of cargas for this proveedor
  var hace7 = new Date(hoy + 'T12:00:00');
  hace7.setDate(hace7.getDate() - 6);
  var hace7Str = dateToString(hace7);

  var cargasSheet = getSheet('Cargas');
  var cargasData  = cargasSheet.getDataRange().getValues();
  var ultimas7    = [];
  for (var i = 1; i < cargasData.length; i++) {
    var f    = dateToString(cargasData[i][1]);
    var prov = String(cargasData[i][3]||'');
    if (f >= hace7Str && f <= hoy && prov === proveedorNombre) {
      ultimas7.push({
        fecha:    f,
        hora:     String(cargasData[i][2]||''),
        litrosT1: num(cargasData[i][4]),
        litrosT2: num(cargasData[i][5]),
        total:    num(cargasData[i][6]),
      });
    }
  }

  // Current quincena
  var qActual   = calcularQuincena(null);
  var qAnterior = calcularQuincenaAnterior(null);

  function _resumenQuincena(q) {
    var totalLitros = 0;
    for (var i = 1; i < cargasData.length; i++) {
      var f    = dateToString(cargasData[i][1]);
      var prov = String(cargasData[i][3]||'');
      if (f >= q.inicio && f <= q.fin && prov === proveedorNombre) {
        totalLitros += num(cargasData[i][6]);
      }
    }

    // Find planilla if exists
    var planSheet = getSheet('PLANILLAS');
    var planData  = planSheet.getDataRange().getValues();
    var planilla  = null;
    for (var j = 1; j < planData.length; j++) {
      if (String(planData[j][3]) === proveedorId &&
          String(planData[j][1]) === q.inicio &&
          String(planData[j][2]) === q.fin) {
        planilla = {
          totalLitros: num(planData[j][5]),
          precioLitro: num(planData[j][6]),
          subtotal:    num(planData[j][7]),
          iva:         num(planData[j][8]),
          totalConIVA: num(planData[j][9]),
          estado:      String(planData[j][10]||'GENERADA'),
        };
        break;
      }
    }

    return {
      inicio:      q.inicio,
      fin:         q.fin,
      totalLitros: Math.round(totalLitros * 10) / 10,
      planilla:    planilla,
    };
  }

  // Last 12 planillas
  var planSheet = getSheet('PLANILLAS');
  var planData  = planSheet.getDataRange().getValues();
  var historial = [];
  for (var j = 1; j < planData.length; j++) {
    if (String(planData[j][3]) === proveedorId) {
      historial.push({
        quincenaInicio: String(planData[j][1]),
        quincenaFin:    String(planData[j][2]),
        totalLitros:    num(planData[j][5]),
        precioLitro:    num(planData[j][6]),
        subtotal:       num(planData[j][7]),
        iva:            num(planData[j][8]),
        totalConIVA:    num(planData[j][9]),
        estado:         String(planData[j][10]||'GENERADA'),
        fechaGenerada:  String(planData[j][11]||''),
      });
    }
  }
  historial.sort(function(a, b) { return b.quincenaInicio > a.quincenaInicio ? 1 : -1; });
  historial = historial.slice(0, 12);

  return {
    success: true,
    data: {
      proveedor:       { id: proveedorId, nombre: proveedorNombre },
      ultimas7Dias:    ultimas7,
      quincenaActual:  _resumenQuincena(qActual),
      quincenaAnterior:_resumenQuincena(qAnterior),
      historialPlanillas: historial,
    }
  };
}
