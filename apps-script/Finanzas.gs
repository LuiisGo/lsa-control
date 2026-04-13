// ============================================================
// Finanzas.gs — Compradores, Envíos, Remanentes, Dashboard financiero
// ============================================================

// ── COMPRADORES ──────────────────────────────────────────────

function getCompradores(user) {
  var sheet = getSheet('COMPRADORES');
  var data  = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    lista.push({ id: String(row[0]), nombre: String(row[1]||''), nit: String(row[2]||''), activo: row[3] !== false && row[3] !== 'false' && row[3] !== 0 });
  }
  return { success: true, data: lista };
}

function saveComprador(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var nombre = String(body.nombre||'').trim();
  if (!nombre) return { success: false, error: 'Nombre requerido' };
  var id = generateId();
  getSheet('COMPRADORES').appendRow([id, nombre, String(body.nit||''), true]);
  return { success: true, data: { id: id } };
}

function toggleComprador(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var sheet = getSheet('COMPRADORES');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      var cur = data[i][3];
      sheet.getRange(i+1,4).setValue(!(cur !== false && cur !== 'false' && cur !== 0));
      return { success: true };
    }
  }
  return { success: false, error: 'Comprador no encontrado' };
}

// ── PRECIOS POR COMPRADOR ─────────────────────────────────────

function getPrecioComprador(body, user) {
  var compradorId = String(body.compradorId||body.comprador_id||'');
  var fecha       = String(body.fecha || getFechaHoy());
  var sheet = getSheet('PRECIOS_COMPRADOR');
  var data  = sheet.getDataRange().getValues();
  var best  = null;
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[1]) === compradorId && String(row[2]) <= fecha) {
      if (!best || String(row[2]) > String(best[2])) best = row;
    }
  }
  if (!best) return { success: true, data: null };
  return { success: true, data: { id: String(best[0]), compradorId: String(best[1]), fecha: String(best[2]), precioLitro: num(best[3]) } };
}

function savePrecioComprador(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var compradorId = String(body.compradorId||'');
  var fecha       = String(body.fecha || getFechaHoy());
  var precio      = num(body.precioLitro || body.precio_litro);
  if (!compradorId || precio <= 0) return { success: false, error: 'Datos inválidos' };
  var id = generateId();
  getSheet('PRECIOS_COMPRADOR').appendRow([id, compradorId, fecha, precio]);
  return { success: true, data: { id: id } };
}

function getPreciosHistorial(body, user) {
  var compradorId = String(body.compradorId||body.comprador_id||'');
  var sheet = getSheet('PRECIOS_COMPRADOR');
  var data  = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === compradorId) {
      lista.push({ id: String(data[i][0]), compradorId: String(data[i][1]), fecha: String(data[i][2]), precioLitro: num(data[i][3]) });
    }
  }
  lista.sort(function(a,b){ return b.fecha > a.fecha ? 1 : -1; });
  return { success: true, data: lista };
}

// ── ENVÍOS ───────────────────────────────────────────────────

function saveEnvio(body, user) {
  var litros = num(body.litrosEnviados || body.litros_enviados);
  var monto  = num(body.montoTotal     || body.monto_total);
  if (litros <= 0) return { success: false, error: 'Litros debe ser > 0' };
  if (monto  <= 0) return { success: false, error: 'Monto debe ser > 0' };
  var id = generateId();
  var fecha = getFechaHoy();
  getSheet('ENVIOS').appendRow([
    id, fecha,
    String(body.compradorId || body.comprador_id || ''),
    String(body.compradorNombre || body.comprador_nombre || ''),
    litros, monto,
    String(body.notas||''),
    user.id, user.nombre, new Date().toISOString()
  ]);
  try { verificarAlertasTanque(); } catch(e) {}
  return { success: true, data: { id: id } };
}

function getEnviosPorFecha(body, user) {
  var fecha = String(body.fecha || getFechaHoy());
  var sheet = getSheet('ENVIOS');
  var data  = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    if (dateToString(data[i][1]) === fecha) lista.push(_envioObj(data[i]));
  }
  return { success: true, data: lista };
}

function getEnviosPorRango(body, user) {
  var inicio = String(body.fechaInicio||''), fin = String(body.fechaFin||'');
  if (!inicio || !fin) return { success: false, error: 'Rango requerido' };
  var sheet = getSheet('ENVIOS');
  var data  = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    var f = dateToString(data[i][1]);
    if (f >= inicio && f <= fin) lista.push(_envioObj(data[i]));
  }
  return { success: true, data: lista };
}

function editarEnvio(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var sheet = getSheet('ENVIOS');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      if (body.litrosEnviados !== undefined) sheet.getRange(i+1,5).setValue(num(body.litrosEnviados));
      if (body.montoTotal     !== undefined) sheet.getRange(i+1,6).setValue(num(body.montoTotal));
      if (body.notas          !== undefined) sheet.getRange(i+1,7).setValue(String(body.notas));
      return { success: true };
    }
  }
  return { success: false, error: 'Envío no encontrado' };
}

function _envioObj(row) {
  return {
    id:              String(row[0]),
    fecha:           dateToString(row[1]),
    compradorId:     String(row[2]||''),
    compradorNombre: String(row[3]||''),
    litrosEnviados:  num(row[4]),
    montoTotal:      num(row[5]),
    notas:           String(row[6]||''),
    usuarioId:       String(row[7]||''),
    usuarioNombre:   String(row[8]||''),
    timestamp:       String(row[9]||''),
  };
}

// ── REMANENTES ───────────────────────────────────────────────

function saveRemanente(body, user) {
  var t1 = num(body.litrosT1||body.litros_t1), t2 = num(body.litrosT2||body.litros_t2);
  if (t1 + t2 <= 0) return { success: false, error: 'Total remanente debe ser > 0' };
  var id = generateId();
  getSheet('REMANENTES').appendRow([id, getFechaHoy(), t1, t2, t1+t2, false, '']);
  return { success: true, data: { id: id } };
}

function getRemanentePendiente(user) {
  var ayer  = getFechaAyer();
  var sheet = getSheet('REMANENTES');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (dateToString(row[1]) === ayer) {
      var usado = row[5];
      if (usado === false || usado === 'false' || usado === 0 || usado === '') {
        return { success: true, data: { id: String(row[0]), fecha: dateToString(row[1]), litrosT1: num(row[2]), litrosT2: num(row[3]), total: num(row[4]) } };
      }
    }
  }
  return { success: true, data: null };
}

function usarRemanente(body, user) {
  var sheet = getSheet('REMANENTES');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      sheet.getRange(i+1,6).setValue(true);
      sheet.getRange(i+1,7).setValue(getFechaHoy());
      var t1 = num(data[i][2]), t2 = num(data[i][3]), total = num(data[i][4]);
      getSheet('Cargas').appendRow([generateId(), getFechaHoy(), getNow(), 'Remanente día anterior', t1, t2, total, '']);
      return { success: true };
    }
  }
  return { success: false, error: 'Remanente no encontrado' };
}

function ignorarRemanente(body, user) {
  var sheet = getSheet('REMANENTES');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      sheet.getRange(i+1,6).setValue(true);
      sheet.getRange(i+1,7).setValue('IGNORADO');
      return { success: true };
    }
  }
  return { success: false, error: 'Remanente no encontrado' };
}

// ── DASHBOARD FINANCIERO ──────────────────────────────────────

function getResumenFinancieroDia(body, user) {
  var fecha   = String(body.fecha || getFechaHoy());
  var envios  = getEnviosPorFecha({ fecha: fecha }, user).data || [];
  var cargas  = getCargas({ fecha: fecha }, user).data || [];
  var gastosR = getGastosPorFecha({ fecha: fecha }, user).data || [];

  var ingresos        = envios.reduce(function(s,e){ return s + e.montoTotal; }, 0);
  var litrosEnviados  = envios.reduce(function(s,e){ return s + e.litrosEnviados; }, 0);
  var litrosRecibidos = cargas.reduce(function(s,c){ return s + c.total; }, 0);
  var totalGastos     = gastosR.reduce(function(s,g){ return s + g.monto; }, 0);

  return { success: true, data: {
    fecha:          fecha,
    ingresos:       Math.round(ingresos*100)/100,
    litrosEnviados: Math.round(litrosEnviados*10)/10,
    litrosRecibidos:Math.round(litrosRecibidos*10)/10,
    gastos:         Math.round(totalGastos*100)/100,
    margen:         Math.round((ingresos-totalGastos)*100)/100,
    enviosCount:    envios.length,
  }};
}

function getDashboardFinanciero(user) {
  var q      = calcularQuincena(null);
  var inicio = q.inicio;
  var fin    = q.fin;

  var envios      = getEnviosPorRango({ fechaInicio: inicio, fechaFin: fin }, user).data || [];
  var gastosRes   = getGastosPorRango({ fechaInicio: inicio, fechaFin: fin }, user).data;
  var totalGastos = gastosRes ? (gastosRes.total || 0) : 0;

  var planillasRes    = getPlanillasQuincena({ quincenaInicio: inicio, quincenaFin: fin }, user).data || {};
  var costoProveedores= num(planillasRes.totalConIVA);

  var ingresos        = envios.reduce(function(s,e){ return s + e.montoTotal; }, 0);
  var litrosEnviados  = envios.reduce(function(s,e){ return s + e.litrosEnviados; }, 0);
  var margen          = ingresos - costoProveedores - totalGastos;
  var margenPct       = ingresos > 0 ? (margen / ingresos * 100) : 0;
  var precioVenta     = litrosEnviados > 0 ? (ingresos / litrosEnviados) : 0;

  // Litros recibidos
  var cargasSheet = getSheet('Cargas');
  var cargasData  = cargasSheet.getDataRange().getValues();
  var litrosRec   = 0;
  for (var i = 1; i < cargasData.length; i++) {
    var f = dateToString(cargasData[i][1]);
    if (f >= inicio && f <= fin) litrosRec += num(cargasData[i][6]);
  }
  var precioCompra = litrosRec > 0 ? (costoProveedores / litrosRec) : 0;

  return { success: true, data: {
    quincena:             { inicio: inicio, fin: fin },
    ingresos:             Math.round(ingresos*100)/100,
    costoProveedores:     Math.round(costoProveedores*100)/100,
    gastosOperativos:     Math.round(totalGastos*100)/100,
    margen:               Math.round(margen*100)/100,
    margenPct:            Math.round(margenPct*100)/100,
    litrosTotales:        Math.round(litrosEnviados*10)/10,
    litrosRecibidos:      Math.round(litrosRec*10)/10,
    precioPromedioCompra: Math.round(precioCompra*100)/100,
    precioPromedioVenta:  Math.round(precioVenta*100)/100,
    porComprador:         getResumenPorComprador(envios),
    porProveedor:         getResumenPorProveedor(inicio, fin),
  }};
}

function getResumenPorComprador(envios) {
  var byComp = {};
  for (var i = 0; i < envios.length; i++) {
    var e    = envios[i];
    var name = e.compradorNombre || e.compradorId || 'Sin nombre';
    if (!byComp[name]) byComp[name] = { nombre: name, litros: 0, monto: 0, dias: {}, entregas: 0 };
    byComp[name].litros   += e.litrosEnviados;
    byComp[name].monto    += e.montoTotal;
    byComp[name].dias[e.fecha] = true;
    byComp[name].entregas++;
  }
  return Object.keys(byComp).map(function(k) {
    var c = byComp[k];
    return {
      nombre:          c.nombre,
      litros:          Math.round(c.litros*10)/10,
      monto:           Math.round(c.monto*100)/100,
      diasEnvio:       Object.keys(c.dias).length,
      entregas:        c.entregas,
      precioImplicito: c.litros > 0 ? Math.round((c.monto/c.litros)*100)/100 : 0,
    };
  }).sort(function(a,b){ return b.monto - a.monto; });
}

function getResumenPorProveedor(fechaInicio, fechaFin) {
  var sheet  = getSheet('Cargas');
  var data   = sheet.getDataRange().getValues();
  var byProv = {};
  for (var i = 1; i < data.length; i++) {
    var f    = dateToString(data[i][1]);
    var prov = String(data[i][3]||'Sin proveedor');
    if (prov === 'Remanente día anterior') continue;
    if (f >= fechaInicio && f <= fechaFin) {
      if (!byProv[prov]) byProv[prov] = { nombre: prov, litros: 0, entregas: 0 };
      byProv[prov].litros   += num(data[i][6]);
      byProv[prov].entregas++;
    }
  }
  return Object.keys(byProv).map(function(k) {
    var p = byProv[k];
    return { nombre: p.nombre, litros: Math.round(p.litros*10)/10, entregas: p.entregas };
  }).sort(function(a,b){ return b.litros - a.litros; });
}
