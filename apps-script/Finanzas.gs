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
  getSheet('COMPRADORES').appendRow([id, sanitizarValor(nombre), sanitizarValor(body.nit||''), true]);
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
    var rowFecha = dateToString(row[2]);
    if (String(row[1]) === compradorId && rowFecha <= fecha) {
      if (!best || rowFecha > dateToString(best[2])) best = row;
    }
  }
  if (!best) return { success: true, data: null };
  return { success: true, data: { id: String(best[0]), compradorId: String(best[1]), fecha: dateToString(best[2]), precioLitro: num(best[3]) } };
}

function savePrecioComprador(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var compradorId = String(body.compradorId||'');
  var fecha       = String(body.fecha || getFechaHoy());
  var precio      = num(body.precioLitro || body.precio_litro);
  if (!compradorId || !fecha || precio <= 0) return { success: false, error: 'Datos inválidos' };
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
  if (!tienePermiso(user, 'envios')) return { success: false, error: 'Sin permiso para registrar envíos' };

  var litros = num(body.litrosEnviados || body.litros_enviados);
  if (litros <= 0) return { success: false, error: 'Litros debe ser > 0' };

  var compradorId = String(body.compradorId || body.comprador_id || '');
  if (!compradorId) return { success: false, error: 'Comprador requerido' };

  var precioRes = getPrecioComprador({ compradorId: compradorId, fecha: getFechaHoy() }, user);
  if (!precioRes.data || num(precioRes.data.precioLitro) <= 0) {
    return { success: false, error: 'Este comprador no tiene precio vigente' };
  }
  var precioLitro = num(precioRes.data.precioLitro);
  var monto = Math.round(litros * precioLitro * 100) / 100;

  var id    = generateId();
  var fecha = getFechaHoy();
  var estadoAntes = calcularEstadoTanques_(fecha);
  if (estadoAntes.restoTotal - litros < 0) {
    return {
      success: false,
      error: 'No hay suficiente leche disponible en tanques para registrar este envío',
      data: {
        disponible: estadoAntes.restoTotal,
        solicitado: litros,
      }
    };
  }

  getSheet('ENVIOS').appendRow([
    id, fecha,
    compradorId,
    String(body.compradorNombre || body.comprador_nombre || ''),
    litros,
    monto === '' ? '' : monto,
    sanitizarValor(body.notas || ''),
    user.id, user.nombre, new Date().toISOString(),
    precioLitro, litros, 0, 'App'
  ]);

  try { verificarAlertasTanque(); } catch(e) {}

  var estadoTanques = calcularEstadoTanques_(fecha);
  var result = {
    success: true,
    data: {
      id: id,
      precioLitro: precioLitro,
      montoTotal: monto,
      saldoInicial: estadoTanques.saldoInicialTotal,
      totalCargaDia: estadoTanques.recepcionTotal,
      totalDisponibleDia: estadoTanques.disponibleTotal,
      totalEnviadoDia: estadoTanques.enviadoTotal,
      resto: estadoTanques.restoTotal,
      tanque1: estadoTanques.tanque1,
      tanque2: estadoTanques.tanque2
    }
  };
  if (estadoTanques.restoTotal < 0) {
    result.data.advertencia = 'Se envió más leche de la que aparece disponible en tanques';
  }
  return result;
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
  var sheet = getSheet('ENVIOS');
  var data  = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    var f = dateToString(data[i][1]);
    if (inicio && f < inicio) continue;
    if (fin && f > fin) continue;
    lista.push(_envioObj(data[i]));
  }
  lista.sort(function(a,b) {
    var at = a.fecha + ' ' + (a.timestamp || '');
    var bt = b.fecha + ' ' + (b.timestamp || '');
    return bt > at ? 1 : -1;
  });
  return { success: true, data: lista };
}

function editarEnvio(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var sheet = getSheet('ENVIOS');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      var oldLitros = num(data[i][4]);
      var nextLitros = body.litrosEnviados !== undefined ? num(body.litrosEnviados) : oldLitros;
      var nextMonto = body.montoTotal !== undefined ? num(body.montoTotal) : num(data[i][5]);
      if (nextLitros <= 0) return { success: false, error: 'Litros debe ser > 0' };
      if (nextMonto <= 0) return { success: false, error: 'Monto debe ser > 0' };
      var fechaEnvio = dateToString(data[i][1]);
      var estado = calcularEstadoTanques_(fechaEnvio);
      if (estado.restoTotal + oldLitros - nextLitros < 0) {
        return { success: false, error: 'No hay suficiente leche disponible para este ajuste' };
      }
      sheet.getRange(i+1,5).setValue(nextLitros);
      sheet.getRange(i+1,6).setValue(nextMonto);
      if (body.notas !== undefined) sheet.getRange(i+1,7).setValue(sanitizarValor(body.notas));
      return { success: true };
    }
  }
  return { success: false, error: 'Envío no encontrado' };
}

function _envioObj(row) {
  var litrosEnviados = num(row[4]);
  var montoTotal     = num(row[5]);
  var precioLitro    = row[10] !== undefined && row[10] !== '' ? num(row[10]) : (litrosEnviados > 0 ? montoTotal / litrosEnviados : 0);
  var litrosRecibidos = row[11] !== undefined && row[11] !== '' ? num(row[11]) : litrosEnviados;
  var diferenciaLitros = row[12] !== undefined && row[12] !== '' ? num(row[12]) : (litrosRecibidos - litrosEnviados);
  return {
    id:              String(row[0]),
    fecha:           dateToString(row[1]),
    compradorId:     String(row[2]||''),
    compradorNombre: String(row[3]||''),
    litrosEnviados:  litrosEnviados,
    montoTotal:      montoTotal,
    notas:           String(row[6]||''),
    usuarioId:       String(row[7]||''),
    usuarioNombre:   String(row[8]||''),
    timestamp:       String(row[9]||''),
    precioLitro:      Math.round(precioLitro * 1000000) / 1000000,
    litrosRecibidos:  Math.round(litrosRecibidos * 10) / 10,
    diferenciaLitros: Math.round(diferenciaLitros * 10) / 10,
    origen:           String(row[13] || ''),
  };
}

// ── REMANENTES ───────────────────────────────────────────────

function saveRemanente(body, user) {
  if (!tienePermiso(user, 'remanentes')) return { success: false, error: 'Sin permiso para registrar remanentes' };
  var t1 = num(body.litrosT1||body.litros_t1), t2 = num(body.litrosT2||body.litros_t2);
  if (t1 < 0 || t2 < 0) return { success: false, error: 'Litros no pueden ser negativos' };
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
  if (!tienePermiso(user, 'remanentes')) return { success: false, error: 'Sin permiso para usar remanentes' };
  var sheet = getSheet('REMANENTES');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      sheet.getRange(i+1,6).setValue(true);
      sheet.getRange(i+1,7).setValue(getFechaHoy());
      var t1 = num(data[i][2]), t2 = num(data[i][3]), total = num(data[i][4]);
      getSheet('Cargas').appendRow([generateId(), getFechaHoy(), getNow(), 'Remanente día anterior', t1, t2, total, '', '']);
      return { success: true };
    }
  }
  return { success: false, error: 'Remanente no encontrado' };
}

function ignorarRemanente(body, user) {
  if (!tienePermiso(user, 'remanentes')) return { success: false, error: 'Sin permiso para ignorar remanentes' };
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
  var estadoTanques = calcularEstadoTanques_(fecha);

  var ingresos        = envios.reduce(function(s,e){ return s + e.montoTotal; }, 0);
  var litrosEnviados  = envios.reduce(function(s,e){ return s + e.litrosEnviados; }, 0);
  var litrosRecibidos = cargas.reduce(function(s,c){ return s + c.total; }, 0);
  var totalGastos     = gastosR.reduce(function(s,g){ return s + g.monto; }, 0);

  return { success: true, data: {
    fecha:               fecha,
    ingresos:            Math.round(ingresos*100)/100,
    litrosRecibidos:     Math.round(litrosRecibidos*10)/10,
    gastos:              Math.round(totalGastos*100)/100,
    margen:              Math.round((ingresos-totalGastos)*100)/100,
    enviosCount:         envios.length,
    saldoInicial:        estadoTanques.saldoInicialTotal,
    saldoInicialT1:      estadoTanques.saldoInicialT1,
    saldoInicialT2:      estadoTanques.saldoInicialT2,
    litrosRecepcionados: estadoTanques.recepcionTotal,
    recepcionT1:         estadoTanques.recepcionT1,
    recepcionT2:         estadoTanques.recepcionT2,
    litrosEnviados:      estadoTanques.enviadoTotal,
    restoEstimado:       estadoTanques.restoTotal,
    tanque1:             estadoTanques.tanque1,
    tanque2:             estadoTanques.tanque2,
  }};
}

function calcularEstadoTanques_(fecha) {
  fecha = String(fecha || getFechaHoy());

  var remData = getSheet('REMANENTES').getDataRange().getValues();
  var cargasData = getSheet('Cargas').getDataRange().getValues();
  var enviosData = getSheet('ENVIOS').getDataRange().getValues();

  var saldoInicialT1 = 0;
  var saldoInicialT2 = 0;
  var fechaInicio = fecha;
  var mejorRemanenteFecha = '';

  for (var r = 1; r < remData.length; r++) {
    var remFecha = dateToString(remData[r][1]);
    var estado = String(remData[r][6] || '');
    if (!remFecha || remFecha >= fecha || estado === 'IGNORADO') continue;
    if (!mejorRemanenteFecha || remFecha > mejorRemanenteFecha) {
      mejorRemanenteFecha = remFecha;
      fechaInicio = remFecha;
      saldoInicialT1 = num(remData[r][2]);
      saldoInicialT2 = num(remData[r][3]);
    }
  }

  var tanque1 = saldoInicialT1;
  var tanque2 = saldoInicialT2;
  var recepcionT1Hoy = 0;
  var recepcionT2Hoy = 0;
  var enviadoHoy = 0;
  var inicioHoyT1 = tanque1;
  var inicioHoyT2 = tanque2;

  var cursor = fechaInicio === fecha ? fecha : sumarDiasFecha_(fechaInicio, 1);
  while (cursor <= fecha) {
    if (cursor === fecha) {
      inicioHoyT1 = tanque1;
      inicioHoyT2 = tanque2;
    }

    var recepcionDiaT1 = 0;
    var recepcionDiaT2 = 0;
    for (var c = 1; c < cargasData.length; c++) {
      if (dateToString(cargasData[c][1]) !== cursor) continue;
      if (String(cargasData[c][3] || '') === 'Remanente día anterior') continue;
      recepcionDiaT1 += num(cargasData[c][4]);
      recepcionDiaT2 += num(cargasData[c][5]);
    }

    tanque1 += recepcionDiaT1;
    tanque2 += recepcionDiaT2;
    if (cursor === fecha) {
      recepcionT1Hoy = recepcionDiaT1;
      recepcionT2Hoy = recepcionDiaT2;
    }

    var enviadoDia = 0;
    for (var e = 1; e < enviosData.length; e++) {
      if (dateToString(enviosData[e][1]) === cursor) enviadoDia += num(enviosData[e][4]);
    }
    var despuesEnvio = restarDeTanques_(tanque1, tanque2, enviadoDia);
    tanque1 = despuesEnvio.t1;
    tanque2 = despuesEnvio.t2;
    if (cursor === fecha) enviadoHoy = enviadoDia;

    cursor = sumarDiasFecha_(cursor, 1);
  }

  return {
    fecha: fecha,
    saldoInicialT1: redondearLitros_(inicioHoyT1),
    saldoInicialT2: redondearLitros_(inicioHoyT2),
    saldoInicialTotal: redondearLitros_(inicioHoyT1 + inicioHoyT2),
    recepcionT1: redondearLitros_(recepcionT1Hoy),
    recepcionT2: redondearLitros_(recepcionT2Hoy),
    recepcionTotal: redondearLitros_(recepcionT1Hoy + recepcionT2Hoy),
    disponibleTotal: redondearLitros_(inicioHoyT1 + inicioHoyT2 + recepcionT1Hoy + recepcionT2Hoy),
    enviadoTotal: redondearLitros_(enviadoHoy),
    tanque1: redondearLitros_(tanque1),
    tanque2: redondearLitros_(tanque2),
    restoTotal: redondearLitros_(tanque1 + tanque2)
  };
}

function restarDeTanques_(t1, t2, litros) {
  var pendiente = num(litros);
  var tomarT2 = Math.min(Math.max(t2, 0), pendiente);
  t2 -= tomarT2;
  pendiente -= tomarT2;
  if (pendiente > 0) {
    var tomarT1 = Math.min(Math.max(t1, 0), pendiente);
    t1 -= tomarT1;
    pendiente -= tomarT1;
  }
  if (pendiente > 0) t2 -= pendiente;
  return { t1: t1, t2: t2 };
}

function sumarDiasFecha_(fecha, dias) {
  var d = new Date(String(fecha) + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return dateToString(d);
}

function redondearLitros_(value) {
  return Math.round(num(value) * 10) / 10;
}

function getDashboardFinanciero(body, user) {
  if (!user) { user = body; body = {}; }
  body = body || {};
  var q      = body.fechaInicio && body.fechaFin
    ? { inicio: String(body.fechaInicio), fin: String(body.fechaFin) }
    : calcularQuincena(null);
  var inicio = q.inicio;
  var fin    = q.fin;

  var envios      = getEnviosPorRango({ fechaInicio: inicio, fechaFin: fin }, user).data || [];
  var gastosRes   = getGastosPorRango({ fechaInicio: inicio, fechaFin: fin }, user).data;
  var totalGastos = gastosRes ? (gastosRes.total || 0) : 0;

  var planillasRes    = getPlanillasQuincena({ quincenaInicio: inicio, quincenaFin: fin }, user).data || {};
  var cierre          = getCierreQuincena_(inicio, fin);
  if (cierre) totalGastos = num(cierre.gastosOperativos);
  var costoProveedores= cierre ? num(cierre.totalPlanillas) : num(planillasRes.totalConIVA);
  var adelantos       = cierre ? num(cierre.totalAdelantos) : num(planillasRes.totalAdelantos);
  var totalPorPagar   = cierre ? num(cierre.totalPorPagar) : num(planillasRes.totalPorPagar);

  var ingresos        = cierre ? num(cierre.totalVentas) : envios.reduce(function(s,e){ return s + e.montoTotal; }, 0);
  var litrosEnviados  = envios.reduce(function(s,e){ return s + e.litrosEnviados; }, 0);
  var litrosVendidos  = cierre ? num(cierre.totalRecibidoCompradores) : envios.reduce(function(s,e){ return s + (e.litrosRecibidos || e.litrosEnviados); }, 0);
  var diferenciaLitros= cierre ? num(cierre.diferenciaLitros) : (litrosVendidos - litrosEnviados);
  var margen          = cierre ? num(cierre.margenBruto) : (ingresos - costoProveedores - totalGastos);
  var margenPct       = ingresos > 0 ? (margen / ingresos * 100) : 0;
  var precioVenta     = litrosVendidos > 0 ? (ingresos / litrosVendidos) : 0;

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
    adelantos:            Math.round(adelantos*100)/100,
    totalPorPagar:        Math.round(totalPorPagar*100)/100,
    margen:               Math.round(margen*100)/100,
    margenPct:            Math.round(margenPct*100)/100,
    litrosTotales:        Math.round(litrosEnviados*10)/10,
    litrosVendidos:       Math.round(litrosVendidos*10)/10,
    diferenciaLitros:     Math.round(diferenciaLitros*10)/10,
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
    if (!byComp[name]) byComp[name] = { nombre: name, litros: 0, litrosRecibidos: 0, diferenciaLitros: 0, monto: 0, dias: {}, entregas: 0 };
    byComp[name].litros   += e.litrosEnviados;
    byComp[name].litrosRecibidos += e.litrosRecibidos || e.litrosEnviados;
    byComp[name].diferenciaLitros += e.diferenciaLitros || 0;
    byComp[name].monto    += e.montoTotal;
    byComp[name].dias[e.fecha] = true;
    byComp[name].entregas++;
  }
  return Object.keys(byComp).map(function(k) {
    var c = byComp[k];
    return {
      nombre:          c.nombre,
      litros:          Math.round(c.litros*10)/10,
      litrosRecibidos: Math.round(c.litrosRecibidos*10)/10,
      diferenciaLitros: Math.round(c.diferenciaLitros*10)/10,
      monto:           Math.round(c.monto*100)/100,
      diasEnvio:       Object.keys(c.dias).length,
      entregas:        c.entregas,
      precioImplicito: c.litros > 0 ? Math.round((c.monto/c.litros)*100)/100 : 0,
    };
  }).sort(function(a,b){ return b.monto - a.monto; });
}

function getCierreQuincena_(inicio, fin) {
  var sheet = getSheet('CIERRES_QUINCENA');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (dateToString(data[i][1]) === inicio && dateToString(data[i][2]) === fin) {
      return {
        totalRecepcion: num(data[i][4]),
        totalEnviado: num(data[i][5]),
        totalRecibidoCompradores: num(data[i][6]),
        diferenciaLitros: num(data[i][7]),
        totalVentas: num(data[i][8]),
        totalPlanillas: num(data[i][9]),
        totalAdelantos: num(data[i][10]),
        totalPorPagar: num(data[i][11]),
        gastosOperativos: num(data[i][12]),
        margenBruto: num(data[i][13]),
      };
    }
  }
  return null;
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
