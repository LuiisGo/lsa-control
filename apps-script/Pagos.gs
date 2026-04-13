// ============================================================
// Pagos.gs — Tarifas, Planillas, Comparativa proveedores
// ============================================================

// ── TARIFAS PROVEEDORES ───────────────────────────────────────
// Cols: 0=ID 1=Proveedor_ID 2=Proveedor_Nombre 3=Precio_Litro 4=Vigente_Desde 5=Activo

function getTarifaProveedor(body, user) {
  var proveedorId = String(body.proveedorId || body.proveedor_id || '');
  var sheet = getSheet('TARIFAS_PROVEEDORES');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[1]) === proveedorId && (row[5] === true || row[5] === 'true' || row[5] === 1)) {
      return { success: true, data: { id: String(row[0]), proveedorId: String(row[1]), proveedorNombre: String(row[2]), precioLitro: num(row[3]), vigentDesde: String(row[4]) } };
    }
  }
  return { success: true, data: null };
}

function getAllTarifas(user) {
  var sheet = getSheet('TARIFAS_PROVEEDORES');
  var data  = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    lista.push({ id: String(row[0]), proveedorId: String(row[1]), proveedorNombre: String(row[2]), precioLitro: num(row[3]), vigenteDesde: String(row[4]), activo: row[5] === true || row[5] === 'true' || row[5] === 1 });
  }
  return { success: true, data: lista };
}

function saveTarifa(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var proveedorId     = String(body.proveedorId || body.proveedor_id || '');
  var proveedorNombre = String(body.proveedorNombre || body.proveedor_nombre || '');
  var precioLitro     = num(body.precioLitro || body.precio_litro);
  var vigenteDesde    = String(body.vigenteDesde || getFechaHoy());

  if (!proveedorId || precioLitro <= 0) return { success: false, error: 'Datos inválidos' };

  // Desactivar tarifa anterior del mismo proveedor
  var sheet = getSheet('TARIFAS_PROVEEDORES');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === proveedorId && (data[i][5] === true || data[i][5] === 'true' || data[i][5] === 1)) {
      sheet.getRange(i + 1, 6).setValue(false);
    }
  }

  var id = generateId();
  sheet.appendRow([id, proveedorId, proveedorNombre, precioLitro, vigenteDesde, true]);
  return { success: true, data: { id: id } };
}

// ── PLANILLAS ─────────────────────────────────────────────────
// Cols: 0=ID 1=Quincena_Inicio 2=Quincena_Fin 3=Proveedor_ID 4=Proveedor_Nombre
//       5=Total_Litros 6=Precio_Litro 7=Subtotal 8=IVA 9=Total_Con_IVA 10=Estado 11=Fecha_Generada

function generarPlanilla(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var proveedorId     = String(body.proveedorId || body.proveedor_id || '');
  var proveedorNombre = String(body.proveedorNombre || body.proveedor_nombre || '');
  var qInicio         = String(body.quincenaInicio || body.inicio || '');
  var qFin            = String(body.quincenaFin    || body.fin    || '');

  if (!proveedorId || !qInicio || !qFin) return { success: false, error: 'Datos incompletos' };

  // Get active tariff
  var tarifaRes = getTarifaProveedor({ proveedorId: proveedorId }, user);
  if (!tarifaRes.data) return { success: false, error: 'No hay tarifa activa para este proveedor' };
  var precioLitro = num(tarifaRes.data.precioLitro);

  // Sum litros from Cargas by proveedor name and date range
  var cargasSheet = getSheet('Cargas');
  var cargasData  = cargasSheet.getDataRange().getValues();
  var totalLitros = 0;
  for (var i = 1; i < cargasData.length; i++) {
    var f    = dateToString(cargasData[i][1]);
    var prov = String(cargasData[i][3] || '');
    if (f >= qInicio && f <= qFin && prov === proveedorNombre) {
      totalLitros += num(cargasData[i][6]);
    }
  }
  totalLitros = Math.round(totalLitros * 10) / 10;

  var subtotal   = Math.round(totalLitros * precioLitro * 100) / 100;
  var iva        = Math.round(subtotal * 0.12 * 100) / 100;
  var totalConIVA= Math.round((subtotal + iva) * 100) / 100;

  var id = generateId();
  getSheet('PLANILLAS').appendRow([
    id, qInicio, qFin, proveedorId, proveedorNombre,
    totalLitros, precioLitro, subtotal, iva, totalConIVA,
    'GENERADA', getFechaHoy()
  ]);

  return { success: true, data: { id: id, proveedor: proveedorNombre, totalLitros: totalLitros, precioLitro: precioLitro, subtotal: subtotal, iva: iva, totalConIVA: totalConIVA } };
}

function generarTodasLasPlanillas(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var proveedores = getProveedores(user).data || [];
  var resultados  = [];
  for (var i = 0; i < proveedores.length; i++) {
    var prov = proveedores[i];
    if (!prov.activo) continue;
    var res = generarPlanilla({
      proveedorId:     prov.id,
      proveedorNombre: prov.nombre,
      quincenaInicio:  body.quincenaInicio || body.inicio || '',
      quincenaFin:     body.quincenaFin    || body.fin    || '',
    }, user);
    resultados.push({ proveedor: prov.nombre, resultado: res });
  }
  return { success: true, data: resultados };
}

function getPlanillasQuincena(body, user) {
  var qInicio = String(body.quincenaInicio || body.inicio || '');
  var qFin    = String(body.quincenaFin    || body.fin    || '');
  var sheet   = getSheet('PLANILLAS');
  var data    = sheet.getDataRange().getValues();
  var lista   = [];
  var totalConIVA = 0;
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    if (qInicio && String(row[1]) !== qInicio) continue;
    if (qFin    && String(row[2]) !== qFin)    continue;
    var planilla = _planillaObj(row);
    lista.push(planilla);
    totalConIVA += num(row[9]);
  }
  return { success: true, data: { planillas: lista, totalConIVA: Math.round(totalConIVA * 100) / 100 } };
}

function getPlanillasPorProveedor(body, user) {
  var proveedorId = String(body.proveedorId || body.proveedor_id || '');
  var sheet = getSheet('PLANILLAS');
  var data  = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][3]) === proveedorId) lista.push(_planillaObj(data[i]));
  }
  lista.sort(function(a, b) { return b.quincenaInicio > a.quincenaInicio ? 1 : -1; });
  return { success: true, data: lista };
}

function _planillaObj(row) {
  return {
    id:              String(row[0]),
    quincenaInicio:  String(row[1]),
    quincenaFin:     String(row[2]),
    proveedorId:     String(row[3]),
    proveedorNombre: String(row[4]),
    totalLitros:     num(row[5]),
    precioLitro:     num(row[6]),
    subtotal:        num(row[7]),
    iva:             num(row[8]),
    totalConIVA:     num(row[9]),
    estado:          String(row[10] || 'GENERADA'),
    fechaGenerada:   String(row[11] || ''),
  };
}

// ── COMPARATIVA PROVEEDORES ───────────────────────────────────

function getComparativaProveedores(body, user) {
  var inicio = String(body.fechaInicio || body.inicio || '');
  var fin    = String(body.fechaFin    || body.fin    || '');
  if (!inicio || !fin) return { success: false, error: 'Rango de fechas requerido' };

  var sheet  = getSheet('Cargas');
  var data   = sheet.getDataRange().getValues();
  var byProv = {};

  for (var i = 1; i < data.length; i++) {
    var f    = dateToString(data[i][1]);
    var prov = String(data[i][3] || 'Sin proveedor');
    if (prov === 'Remanente día anterior') continue;
    if (f >= inicio && f <= fin) {
      if (!byProv[prov]) byProv[prov] = { nombre: prov, litros: 0, entregas: 0, dias: {} };
      byProv[prov].litros   += num(data[i][6]);
      byProv[prov].entregas++;
      byProv[prov].dias[f] = true;
    }
  }

  // Calculate total for participation %
  var totalLitros = 0;
  Object.keys(byProv).forEach(function(k) { totalLitros += byProv[k].litros; });

  var resultado = Object.keys(byProv).map(function(k) {
    var p         = byProv[k];
    var diasActivos = Object.keys(p.dias).length;
    // Days in range
    var d1 = new Date(inicio + 'T12:00:00');
    var d2 = new Date(fin + 'T12:00:00');
    var diasRango = Math.max(1, Math.round((d2 - d1) / (1000*60*60*24)) + 1);
    return {
      nombre:          p.nombre,
      totalLitros:     Math.round(p.litros * 10) / 10,
      totalEntregas:   p.entregas,
      diasActivos:     diasActivos,
      promLitrosDia:   Math.round((p.litros / diasRango) * 10) / 10,
      participacionPct: totalLitros > 0 ? Math.round((p.litros / totalLitros) * 1000) / 10 : 0,
    };
  });
  resultado.sort(function(a, b) { return b.totalLitros - a.totalLitros; });
  return { success: true, data: resultado };
}
