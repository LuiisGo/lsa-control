// ============================================================
// ImportExcelAbril2026.gs — Importación histórica del Excel 16-30 abril 2026
// ============================================================

var IMPORT_ABRIL_2026_KEY = 'excel_abril_2026_16_30';
var IMPORT_ABRIL_2026_ORIGEN = 'Importado Excel abril 2026';

var IMPORT_ABRIL_2026 = {
  inicio: '2026-04-16',
  fin: '2026-04-30',
  fechas: ['2026-04-16','2026-04-17','2026-04-18','2026-04-19','2026-04-20','2026-04-21','2026-04-22','2026-04-23','2026-04-24','2026-04-25','2026-04-26','2026-04-27','2026-04-28','2026-04-29','2026-04-30'],
  proveedores: [
    { codigo: 1, nombre: 'San Luis', litros: [338,356,342,348,358,357,355,339,359,361,369,394,375,358,393] },
    { codigo: 2, nombre: 'Marisela Lanuza', litros: [314,316,317,328,325,321,310,326,328,330,332,317,334,353,327] },
    { codigo: 3, nombre: 'Nohemy Lanuza', litros: [81,85,99,114,104,98,109,95,103,105,96,100,96,98,98] },
    { codigo: 4, nombre: 'Jorge Velasquez', litros: [114,105,115,107,103,105,106,105,91,100,104,125,123,135,144] },
    { codigo: 5, nombre: 'Rudy Morales', litros: [275,278,260,292,269,309,290,285,274,286,280,272,288,249,268] },
    { codigo: 6, nombre: 'Miguel T ruta #1', litros: [1684,1566,1455,1779,1775,1639,1691,1686,1788,2014,2192,2474,2220,1760,1857] },
    { codigo: 7, nombre: 'Miguel T ruta #2', litros: [638,470,743,0,557,877,605,751,330,436,0,0,514,601,746] },
    { codigo: 8, nombre: 'Alvaro Telón', litros: [111,119,87,128,95,99,95,97,92,116,98,92,100,95,102] },
    { codigo: 9, nombre: 'Oscar Melgar', litros: [88,89,89,87,84,87,91,84,85,83,85,89,87,90,91] },
    { codigo: 10, nombre: 'Filiberto Melgar', litros: [54,55,55,55,54,55,55,55,55,54,54,54,51,55,55] },
    { codigo: 11, nombre: 'Carlos Salazar', litros: [20,19,19,20,18,18,20,20,21,20,18,18,18,18,17] },
    { codigo: 12, nombre: 'Gustavo Moreno', litros: [56,51,57,53,55,51,51,57,50,61,49,50,59,70,54] }
  ],
  planillas: [
    { codigo: 1, nombre: 'San Luis', litros: 5402, precio: 5.5, total: 29711, a1: 0, a2: 15000, a3: 14700, desc: 0, pagar: 11 },
    { codigo: 2, nombre: 'Marisela', litros: 4878, precio: 5.1, total: 24877.8, a1: 8000, a2: 0, a3: 16877, desc: 0, pagar: 0.8 },
    { codigo: 3, nombre: 'Nohemy', litros: 1481, precio: 5.1, total: 7553.1, a1: 0, a2: 0, a3: 7553.1, desc: 0, pagar: 0 },
    { codigo: 4, nombre: 'Jorge', litros: 1682, precio: 5.92, total: 9957.44, a1: 0, a2: 0, a3: 0, desc: 0, pagar: 9957.44 },
    { codigo: 5, nombre: 'Rudy', litros: 4175, precio: 5.5, total: 22962.5, a1: 8000, a2: 4500, a3: 10462.5, desc: 0, pagar: 0 },
    { codigo: 6, nombre: 'Miguel Ruta 1', litros: 27580, precio: 5.48, total: 151138.4, a1: 25000, a2: 0, a3: 0, desc: 0, pagar: 126138.4 },
    { codigo: 7, nombre: 'Miguel Ruta 2', litros: 7268, precio: 5.48, total: 39828.64, a1: 0, a2: 0, a3: 0, desc: 0, pagar: 39828.64 },
    { codigo: 8, nombre: 'Alvaro', litros: 1526, precio: 5.17, total: 7889.42, a1: 2300.65, a2: 3577.64, a3: 0, desc: 0, pagar: 2011.13 },
    { codigo: 9, nombre: 'Oscar', litros: 1309, precio: 4.75, total: 6217.75, a1: 1676.75, a2: 2845.25, a3: 0, desc: 0, pagar: 1695.75 },
    { codigo: 10, nombre: 'Filiberto', litros: 816, precio: 4.5, total: 3672, a1: 985.5, a2: 1719, a3: 0, desc: 0, pagar: 967.5 },
    { codigo: 11, nombre: 'Carlos Salazar', litros: 284, precio: 4.75, total: 1349, a1: 370.5, a2: 641.25, a3: 0, desc: 0, pagar: 337.25 },
    { codigo: 12, nombre: 'Gustavo Moreno', litros: 824, precio: 5.35, total: 4408.4, a1: 1160.95, a2: 2000.9, a3: 0, desc: 0, pagar: 1246.55 }
  ],
  compradores: [
    { nombre: 'Trebolac', precio: 5.970545, recibido: 42314, monto: 271678.94, daily: [{fecha:'2026-04-16',enviado:2734},{fecha:'2026-04-17',enviado:2741},{fecha:'2026-04-19',enviado:3615},{fecha:'2026-04-20',enviado:2695},{fecha:'2026-04-21',enviado:3500},{fecha:'2026-04-22',enviado:3025},{fecha:'2026-04-23',enviado:3215},{fecha:'2026-04-24',enviado:2067},{fecha:'2026-04-25',enviado:2625},{fecha:'2026-04-26',enviado:3300},{fecha:'2026-04-27',enviado:3201},{fecha:'2026-04-28',enviado:3200},{fecha:'2026-04-29',enviado:3500},{fecha:'2026-04-30',enviado:3064}] },
    { nombre: 'Artelac', precio: 5.9, recibido: 9277, monto: 54734.3, daily: [{fecha:'2026-04-16',enviado:2873},{fecha:'2026-04-23',enviado:3080},{fecha:'2026-04-29',enviado:3324}] },
    { nombre: 'Inlacsa', precio: 6.1375, recibido: 5123, monto: 31442.41, daily: [{fecha:'2026-04-17',enviado:3358},{fecha:'2026-04-24',enviado:1766}] },
    { nombre: 'La Lecheria', precio: 5.1, recibido: 402, monto: 2050.2, daily: [{fecha:'2026-04-19',enviado:100},{fecha:'2026-04-23',enviado:100},{fecha:'2026-04-28',enviado:100},{fecha:'2026-04-30',enviado:102}] }
  ],
  ajustes: [
    { concepto: 'Bono de maga 0.05%', monto: 2538.84 },
    { concepto: 'Bono cumplimiento 0.15', monto: 6347.1 },
    { concepto: 'Bono Verano 0.3', monto: 12694.2 },
    { concepto: 'Total bonif', monto: 21580.14 }
  ],
  totales: {
    recepcion: 57225,
    enviado: 57285,
    recibidoCompradores: 57117,
    diferenciaLitros: -60,
    ventas: 359905.85,
    planillas: 309565.45,
    adelantos: 127370.99,
    porPagar: 182194.46,
    margen: 50340.40
  }
};

function migrateExcelFinanceSheets(user) {
  if (user && user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  migrateSheets();
  return { success: true, data: { message: 'Hojas financieras listas' } };
}

function importExcelAbril2026(user) {
  if (!user || user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  migrateSheets();

  if (importAbrilLogCompleto_()) {
    return { success: true, data: { alreadyImported: true, message: 'La quincena de abril ya fue importada' } };
  }

  registrarImportAbrilLog_('STARTED', 'Inicio de importación');

  var providerMap = importarProveedoresAbril_();
  var buyerMap = importarCompradoresAbril_();
  importarTarifasAbril_(providerMap);
  importarPreciosCompradorAbril_(buyerMap);
  importarCargasAbril_(providerMap);
  importarEnviosAbril_(buyerMap);
  importarPlanillasAbril_(providerMap);
  importarAjustesVentaAbril_(buyerMap);
  importarCierreAbril_();
  escribirRespaldosAbril_();

  var validacion = validarImportAbril_();
  if (!validacion.ok) {
    registrarImportAbrilLog_('FAILED', validacion.message);
    return { success: false, error: validacion.message, data: validacion };
  }

  registrarImportAbrilLog_('COMPLETE', 'Importación completa');
  return { success: true, data: validacion };
}

function runMigrateExcelFinanceSheets() {
  return migrateExcelFinanceSheets({ role: 'admin', id: 'IMPORT_EXCEL', nombre: 'Importado Excel' });
}

function runImportExcelAbril2026() {
  return importExcelAbril2026({ role: 'admin', id: 'IMPORT_EXCEL', nombre: 'Importado Excel' });
}

function importAbrilLogCompleto_() {
  var sheet = ensureSheetWithHeaders_('IMPORT_LOG', ['ID','Clave','Periodo_Inicio','Periodo_Fin','Origen','Estado','Mensaje','Fecha']);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === IMPORT_ABRIL_2026_KEY && String(data[i][5]) === 'COMPLETE') return true;
  }
  return false;
}

function registrarImportAbrilLog_(estado, mensaje) {
  var sheet = ensureSheetWithHeaders_('IMPORT_LOG', ['ID','Clave','Periodo_Inicio','Periodo_Fin','Origen','Estado','Mensaje','Fecha']);
  sheet.appendRow(['IMP-ABR2026-LOG-' + estado + '-' + new Date().getTime(), IMPORT_ABRIL_2026_KEY, IMPORT_ABRIL_2026.inicio, IMPORT_ABRIL_2026.fin, IMPORT_ABRIL_2026_ORIGEN, estado, mensaje, new Date().toISOString()]);
}

function importarProveedoresAbril_() {
  var sheet = getSheet('Proveedores');
  var data = sheet.getDataRange().getValues();
  var map = {};
  for (var i = 0; i < IMPORT_ABRIL_2026.proveedores.length; i++) {
    var p = IMPORT_ABRIL_2026.proveedores[i];
    var foundRow = -1;
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][1]) === p.nombre || String(data[r][6]) === String(p.codigo)) {
        foundRow = r + 1;
        map[p.codigo] = { id: String(data[r][0]), nombre: String(data[r][1] || p.nombre) };
        break;
      }
    }
    if (foundRow === -1) {
      var id = 'IMP-ABR2026-PROV-' + p.codigo;
      sheet.appendRow([id, p.nombre, true, false, 'quincenal', 1, String(p.codigo)]);
      map[p.codigo] = { id: id, nombre: p.nombre };
    } else if (!String(sheet.getRange(foundRow, 7).getValue() || '')) {
      sheet.getRange(foundRow, 7).setValue(String(p.codigo));
    }
  }
  return map;
}

function importarCompradoresAbril_() {
  var sheet = getSheet('COMPRADORES');
  var data = sheet.getDataRange().getValues();
  var map = {};
  for (var i = 0; i < IMPORT_ABRIL_2026.compradores.length; i++) {
    var c = IMPORT_ABRIL_2026.compradores[i];
    var found = null;
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][1]).toLowerCase() === c.nombre.toLowerCase()) {
        found = { id: String(data[r][0]), nombre: String(data[r][1]) };
        break;
      }
    }
    if (!found) {
      var id = 'IMP-ABR2026-COMP-' + normalizarImportKey_(c.nombre);
      sheet.appendRow([id, c.nombre, '', true]);
      found = { id: id, nombre: c.nombre };
    }
    map[c.nombre] = found;
  }
  return map;
}

function importarTarifasAbril_(providerMap) {
  var sheet = getSheet('TARIFAS_PROVEEDORES');
  for (var i = 0; i < IMPORT_ABRIL_2026.planillas.length; i++) {
    var p = IMPORT_ABRIL_2026.planillas[i];
    var prov = providerMap[p.codigo];
    appendIfIdMissing_(sheet, 'IMP-ABR2026-TAR-' + p.codigo, ['IMP-ABR2026-TAR-' + p.codigo, prov.id, prov.nombre, p.precio, IMPORT_ABRIL_2026.inicio, false]);
  }
}

function importarPreciosCompradorAbril_(buyerMap) {
  var sheet = getSheet('PRECIOS_COMPRADOR');
  for (var i = 0; i < IMPORT_ABRIL_2026.compradores.length; i++) {
    var c = IMPORT_ABRIL_2026.compradores[i];
    var buyer = buyerMap[c.nombre];
    appendIfIdMissing_(sheet, 'IMP-ABR2026-PRECIO-' + normalizarImportKey_(c.nombre), ['IMP-ABR2026-PRECIO-' + normalizarImportKey_(c.nombre), buyer.id, IMPORT_ABRIL_2026.inicio, c.precio]);
  }
}

function importarCargasAbril_(providerMap) {
  var sheet = getSheet('Cargas');
  for (var i = 0; i < IMPORT_ABRIL_2026.proveedores.length; i++) {
    var p = IMPORT_ABRIL_2026.proveedores[i];
    var prov = providerMap[p.codigo];
    for (var d = 0; d < IMPORT_ABRIL_2026.fechas.length; d++) {
      var litros = num(p.litros[d]);
      if (litros <= 0) continue;
      var id = 'IMP-ABR2026-CARGA-' + p.codigo + '-' + IMPORT_ABRIL_2026.fechas[d];
      appendIfIdMissing_(sheet, id, [id, IMPORT_ABRIL_2026.fechas[d], 'Importado', prov.nombre, litros, 0, litros, '', prov.id]);
    }
  }
}

function importarEnviosAbril_(buyerMap) {
  var sheet = getSheet('ENVIOS');
  for (var i = 0; i < IMPORT_ABRIL_2026.compradores.length; i++) {
    var c = IMPORT_ABRIL_2026.compradores[i];
    var buyer = buyerMap[c.nombre];
    var recibidos = distribuirImportAbril_(c.daily, c.recibido, 'enviado');
    var montos = distribuirImportAbril_(c.daily, c.monto, 'enviado');
    var diferencias = distribuirImportAbril_(c.daily, c.recibido - sumarDailyImportAbril_(c.daily, 'enviado'), 'enviado');
    for (var d = 0; d < c.daily.length; d++) {
      var item = c.daily[d];
      var recibido = recibidos[d];
      var monto = montos[d];
      var diferencia = diferencias[d];
      var id = 'IMP-ABR2026-ENVIO-' + normalizarImportKey_(c.nombre) + '-' + item.fecha;
      appendIfIdMissing_(sheet, id, [
        id, item.fecha, buyer.id, buyer.nombre,
        num(item.enviado), monto,
        IMPORT_ABRIL_2026_ORIGEN, 'IMPORT_EXCEL', 'Importado Excel', item.fecha + 'T12:00:00.000Z',
        c.precio, recibido, diferencia, IMPORT_ABRIL_2026_ORIGEN
      ]);
    }
  }
}

function importarPlanillasAbril_(providerMap) {
  var sheet = getSheet('PLANILLAS');
  for (var i = 0; i < IMPORT_ABRIL_2026.planillas.length; i++) {
    var p = IMPORT_ABRIL_2026.planillas[i];
    var prov = providerMap[p.codigo];
    var id = 'IMP-ABR2026-PLANILLA-' + p.codigo;
    appendIfIdMissing_(sheet, id, [
      id, IMPORT_ABRIL_2026.inicio, IMPORT_ABRIL_2026.fin, prov.id, prov.nombre,
      p.litros, p.precio, p.total, 0, p.total, 'PAGADA', IMPORT_ABRIL_2026.fin, false,
      p.a1, p.a2, p.a3, p.desc, p.pagar, IMPORT_ABRIL_2026_ORIGEN
    ]);
  }
}

function importarAjustesVentaAbril_(buyerMap) {
  var sheet = getSheet('AJUSTES_VENTA');
  var trebolac = buyerMap.Trebolac || { id: '', nombre: 'Trebolac' };
  for (var i = 0; i < IMPORT_ABRIL_2026.ajustes.length; i++) {
    var a = IMPORT_ABRIL_2026.ajustes[i];
    var id = 'IMP-ABR2026-AJUSTE-' + (i + 1);
    appendIfIdMissing_(sheet, id, [id, IMPORT_ABRIL_2026.inicio, IMPORT_ABRIL_2026.fin, trebolac.id, trebolac.nombre, a.concepto, a.monto, IMPORT_ABRIL_2026_ORIGEN, new Date().toISOString()]);
  }
}

function importarCierreAbril_() {
  var t = IMPORT_ABRIL_2026.totales;
  var sheet = getSheet('CIERRES_QUINCENA');
  appendIfIdMissing_(sheet, 'IMP-ABR2026-CIERRE', ['IMP-ABR2026-CIERRE', IMPORT_ABRIL_2026.inicio, IMPORT_ABRIL_2026.fin, IMPORT_ABRIL_2026_ORIGEN, t.recepcion, t.enviado, t.recibidoCompradores, t.diferenciaLitros, t.ventas, t.planillas, t.adelantos, t.porPagar, 0, t.margen, new Date().toISOString()]);
}

function escribirRespaldosAbril_() {
  var recep = resetImportSheet_('IMPORT_EXCEL_ABRIL_2026_RECEPCION', ['Fecha','Codigo','Proveedor','Litros','Origen']);
  for (var i = 0; i < IMPORT_ABRIL_2026.proveedores.length; i++) {
    var p = IMPORT_ABRIL_2026.proveedores[i];
    for (var d = 0; d < IMPORT_ABRIL_2026.fechas.length; d++) {
      recep.appendRow([IMPORT_ABRIL_2026.fechas[d], p.codigo, p.nombre, num(p.litros[d]), IMPORT_ABRIL_2026_ORIGEN]);
    }
  }

  var plan = resetImportSheet_('IMPORT_EXCEL_ABRIL_2026_PLANILLAS', ['Codigo','Proveedor','Litros','Precio','Total planilla','Adelanto 1','Adelanto 2','Adelanto 3','Descuentos','Falta pagar','Origen']);
  for (var j = 0; j < IMPORT_ABRIL_2026.planillas.length; j++) {
    var pl = IMPORT_ABRIL_2026.planillas[j];
    plan.appendRow([pl.codigo, pl.nombre, pl.litros, pl.precio, pl.total, pl.a1, pl.a2, pl.a3, pl.desc, pl.pagar, IMPORT_ABRIL_2026_ORIGEN]);
  }

  var env = resetImportSheet_('IMPORT_EXCEL_ABRIL_2026_ENVIOS', ['Comprador','Fecha','Litros enviados','Litros recibidos estimados','Monto','Origen']);
  for (var k = 0; k < IMPORT_ABRIL_2026.compradores.length; k++) {
    var c = IMPORT_ABRIL_2026.compradores[k];
    var recibidos = distribuirImportAbril_(c.daily, c.recibido, 'enviado');
    var montos = distribuirImportAbril_(c.daily, c.monto, 'enviado');
    for (var x = 0; x < c.daily.length; x++) env.appendRow([c.nombre, c.daily[x].fecha, c.daily[x].enviado, recibidos[x], montos[x], IMPORT_ABRIL_2026_ORIGEN]);
  }

  var cierre = resetImportSheet_('IMPORT_EXCEL_ABRIL_2026_CIERRE', ['Concepto','Valor']);
  var t = IMPORT_ABRIL_2026.totales;
  cierre.appendRow(['Total recibido', t.recepcion]);
  cierre.appendRow(['Total enviado', t.enviado]);
  cierre.appendRow(['Total recibido compradores', t.recibidoCompradores]);
  cierre.appendRow(['Diferencia litros', t.diferenciaLitros]);
  cierre.appendRow(['Total ventas', t.ventas]);
  cierre.appendRow(['Total planillas', t.planillas]);
  cierre.appendRow(['Adelantos', t.adelantos]);
  cierre.appendRow(['Falta pagar', t.porPagar]);
  cierre.appendRow(['Margen bruto', t.margen]);

  var noImportado = resetImportSheet_('IMPORT_EXCEL_ABRIL_2026_NO_IMPORTADO', ['Hoja','Estado','Nota']);
  noImportado.appendRow(['Muestreo semanal', 'Respaldado en archivo Excel original', 'No se importó a operación activa por decisión del proyecto']);
  noImportado.appendRow(['Comparativo muestreo', 'Respaldado en archivo Excel original', 'Se trabajará en una fase posterior']);
  noImportado.appendRow(['Resumen de Pago (2)', 'Histórico viejo', 'No se importó como operación activa']);
  noImportado.appendRow(['Pagos pendientes marzo', 'Histórico viejo', 'No se importó como operación activa']);
}

function validarImportAbril_() {
  var cargas = sumarPorIdPrefix_(getSheet('Cargas'), 'IMP-ABR2026-CARGA-', 7);
  var planillas = sumarPorIdPrefix_(getSheet('PLANILLAS'), 'IMP-ABR2026-PLANILLA-', 10);
  var pagar = sumarPorIdPrefix_(getSheet('PLANILLAS'), 'IMP-ABR2026-PLANILLA-', 18);
  var envios = sumarPorIdPrefix_(getSheet('ENVIOS'), 'IMP-ABR2026-ENVIO-', 6);
  var trebolacDiff = sumarPorIdPrefix_(getSheet('ENVIOS'), 'IMP-ABR2026-ENVIO-TREBOLAC-', 13);
  var ok = casiIgual_(cargas, IMPORT_ABRIL_2026.totales.recepcion) &&
    casiIgual_(planillas, IMPORT_ABRIL_2026.totales.planillas) &&
    casiIgual_(pagar, IMPORT_ABRIL_2026.totales.porPagar) &&
    casiIgual_(envios, IMPORT_ABRIL_2026.totales.ventas) &&
    casiIgual_(trebolacDiff, -168);
  return {
    ok: ok,
    message: ok ? 'Totales validados contra Excel' : 'La importación no cuadra contra el Excel',
    recepcionLitros: Math.round(cargas * 10) / 10,
    totalPlanillas: Math.round(planillas * 100) / 100,
    totalPorPagar: Math.round(pagar * 100) / 100,
    ventas: Math.round(envios * 100) / 100,
    trebolacDiferencia: Math.round(trebolacDiff * 10) / 10,
    esperado: IMPORT_ABRIL_2026.totales
  };
}

function appendIfIdMissing_(sheet, id, row) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return false;
    }
  }
  sheet.appendRow(row);
  return true;
}

function resetImportSheet_(name, headers) {
  var sheet = getSheet(name);
  sheet.clear();
  sheet.appendRow(headers);
  return sheet;
}

function distribuirImportAbril_(daily, total, field) {
  var base = 0;
  for (var i = 0; i < daily.length; i++) base += num(daily[i][field]);
  var out = [];
  var usado = 0;
  for (var j = 0; j < daily.length; j++) {
    var val = j === daily.length - 1 ? (total - usado) : Math.round((total * (num(daily[j][field]) / base)) * 100) / 100;
    val = Math.round(val * 100) / 100;
    usado += val;
    out.push(val);
  }
  return out;
}

function sumarDailyImportAbril_(daily, field) {
  var total = 0;
  for (var i = 0; i < daily.length; i++) total += num(daily[i][field]);
  return Math.round(total * 100) / 100;
}

function sumarPorIdPrefix_(sheet, prefix, colNumber) {
  var data = sheet.getDataRange().getValues();
  var total = 0;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).indexOf(prefix) === 0) total += num(data[i][colNumber - 1]);
  }
  return total;
}

function casiIgual_(a, b) {
  return Math.abs(num(a) - num(b)) < 0.05;
}

function normalizarImportKey_(value) {
  return String(value || '').toUpperCase()
    .replace(/[ÁÀÄÂ]/g, 'A').replace(/[ÉÈËÊ]/g, 'E').replace(/[ÍÌÏÎ]/g, 'I')
    .replace(/[ÓÒÖÔ]/g, 'O').replace(/[ÚÙÜÛ]/g, 'U').replace(/Ñ/g, 'N')
    .replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
}
