// ============================================================
// Code.gs — Entry point del Web App LSA Control (Fase 1 + Fase 2)
// ============================================================

var SPREADSHEET_ID = '1R6IXVYnA9P30zHUwnHCMbyXCIxR5ReMCgmXcOe1k82c';

var HOJAS = {
  // Fase 1
  CARGAS:      'Cargas',
  MEDICIONES:  'Mediciones',
  PROVEEDORES: 'Proveedores',
  USUARIOS:    'Usuarios',
  LOG:         'LOG_CAMBIOS',
  // Fase 2
  COMPRADORES:       'COMPRADORES',
  ENVIOS:            'ENVIOS',
  PRECIOS_COMPRADOR: 'PRECIOS_COMPRADOR',
  REMANENTES:        'REMANENTES',
  TARIFAS:           'TARIFAS_PROVEEDORES',
  PLANILLAS:         'PLANILLAS',
  GASTOS:            'GASTOS',
  CATEGORIAS_GASTOS: 'CATEGORIAS_GASTOS',
  ALERTAS_CONFIG:    'ALERTAS_CONFIG',
  ACCESOS:           'ACCESOS_PROVEEDORES',
};

function doGet(e) {
  return respond({ success: true, message: 'LSA Control API v3.0 activa', fase: 2 });
}

function doPost(e) {
  try {
    var body   = JSON.parse(e.postData.contents);
    var action = body.action;
    var token  = body.token;

    // Acciones públicas (sin token)
    var publicActions = ['login', 'webauthn-challenge', 'webauthn-verify', 'saveWebAuthnCredential', 'portalLogin', 'portalData'];
    if (publicActions.indexOf(action) !== -1) {
      switch (action) {
        case 'login':                  return respond(handleLogin(body));
        case 'webauthn-challenge':     return respond(getChallenge(body));
        case 'webauthn-verify':        return respond(verifyWebAuthn(body));
        case 'saveWebAuthnCredential': return respond(saveWebAuthnCredential(body));
        case 'portalLogin':            return respond(loginPortalProveedor(body));
        case 'portalData':             return respond(getPortalProveedor(body));
      }
    }

    // Acciones protegidas
    var user = validateToken(token);
    if (!user) return respond({ success: false, error: 'Token inválido o sesión expirada' });

    switch (action) {
      // ── Fase 1: Dashboard ──────────────────────────────────
      case 'getDashboardHoy':     return respond(getDashboardHoy(user));
      case 'getQuincena':         return respond(getQuincena(user));
      case 'getQuincenaAnterior': return respond(getQuincenaAnterior(user));
      case 'getComparativa':      return respond(getComparativa(user));
      case 'exportarDatos':       return respond(exportarDatos(body, user));
      case 'getCargasPorProveedor': return respond(getCargasPorProveedor(body, user));

      // ── Fase 1: Cargas ────────────────────────────────────
      case 'getCargas':    return respond(getCargas(body, user));
      case 'saveCarga':    return respond(saveCarga(body, user));
      case 'editarCarga':  return respond(editarCarga(body, user));
      case 'deleteCarga':  return respond(deleteCarga(body, user));

      // ── Fase 1: Mediciones ────────────────────────────────
      case 'getMedicion':    return respond(getMedicion(body, user));
      case 'saveMedicion':   return respond(saveMedicion(body, user));
      case 'editarMedicion': return respond(editarMedicion(body, user));
      case 'deleteMedicion': return respond(deleteMedicion(body, user));

      // ── Fase 1: Proveedores ───────────────────────────────
      case 'getProveedores':  return respond(getProveedores(user));
      case 'saveProveedor':   return respond(saveProveedor(body, user));
      case 'toggleProveedor': return respond(toggleProveedor(body, user));
      case 'deleteProveedor': return respond(deleteProveedor(body, user));

      // ── Fase 1: Usuarios ──────────────────────────────────
      case 'getUsuarios':   return respond(getUsuarios(user));
      case 'saveUsuario':   return respond(saveUsuario(body, user));
      case 'toggleUsuario': return respond(toggleUsuario(body, user));
      case 'deleteUsuario': return respond(deleteUsuario(body, user));

      // ── Fase 1: Drive ─────────────────────────────────────
      case 'subirFoto': return respond(subirFoto(body, user));

      // ── Fase 2: Compradores ───────────────────────────────
      case 'getCompradores':       return respond(getCompradores(user));
      case 'saveComprador':        return respond(saveComprador(body, user));
      case 'toggleComprador':      return respond(toggleComprador(body, user));

      // ── Fase 2: Precios por comprador ─────────────────────
      case 'getPrecioComprador':   return respond(getPrecioComprador(body, user));
      case 'savePrecioComprador':  return respond(savePrecioComprador(body, user));
      case 'getPreciosHistorial':  return respond(getPreciosHistorial(body, user));

      // ── Fase 2: Envíos ────────────────────────────────────
      case 'saveEnvio':        return respond(saveEnvio(body, user));
      case 'getEnviosPorFecha': return respond(getEnviosPorFecha(body, user));
      case 'getEnviosPorRango': return respond(getEnviosPorRango(body, user));
      case 'editarEnvio':       return respond(editarEnvio(body, user));

      // ── Fase 2: Remanentes ───────────────────────────────
      case 'saveRemanente':        return respond(saveRemanente(body, user));
      case 'getRemanentePendiente': return respond(getRemanentePendiente(user));
      case 'usarRemanente':         return respond(usarRemanente(body, user));
      case 'ignorarRemanente':      return respond(ignorarRemanente(body, user));

      // ── Fase 2: Dashboard financiero ──────────────────────
      case 'getResumenFinancieroDia': return respond(getResumenFinancieroDia(body, user));
      case 'getDashboardFinanciero':  return respond(getDashboardFinanciero(user));

      // ── Fase 2: Tarifas proveedores ───────────────────────
      case 'getTarifaProveedor': return respond(getTarifaProveedor(body, user));
      case 'getAllTarifas':       return respond(getAllTarifas(user));
      case 'saveTarifa':          return respond(saveTarifa(body, user));

      // ── Fase 2: Planillas ─────────────────────────────────
      case 'generarPlanilla':          return respond(generarPlanilla(body, user));
      case 'generarTodasLasPlanillas': return respond(generarTodasLasPlanillas(body, user));
      case 'marcarPlanillaPagada':     return respond(marcarPlanillaPagada(body, user));
      case 'calcularPeriodoProveedor': return respond(calcularPeriodoProveedor(body.proveedorId || body.proveedor_id || ''));
      case 'getPlanillasQuincena':     return respond(getPlanillasQuincena(body, user));
      case 'getPlanillasPorProveedor': return respond(getPlanillasPorProveedor(body, user));
      case 'getComparativaProveedores': return respond(getComparativaProveedores(body, user));

      // ── Fase 2: Gastos ────────────────────────────────────
      case 'getCategorias':    return respond(getCategorias(user));
      case 'saveCategoria':    return respond(saveCategoria(body, user));
      case 'toggleCategoria':  return respond(toggleCategoria(body, user));
      case 'saveGasto':        return respond(saveGasto(body, user));
      case 'getGastosPorFecha': return respond(getGastosPorFecha(body, user));
      case 'getGastosPorRango': return respond(getGastosPorRango(body, user));
      case 'editarGasto':       return respond(editarGasto(body, user));
      case 'deleteGasto':       return respond(deleteGasto(body, user));

      // ── Fase 2: Alertas ───────────────────────────────────
      case 'getAlertasConfig':  return respond(getAlertasConfig(user));
      case 'saveAlertaConfig':  return respond(saveAlertaConfig(body, user));
      case 'toggleAlerta':      return respond(toggleAlerta(body, user));

      // ── Fase 2: Portal proveedores ────────────────────────
      case 'getAccesosProveedores':    return respond(getAccesosProveedores(user));
      case 'generarAccesoProveedor':   return respond(generarAccesoProveedor(body, user));

      default:
        return respond({ success: false, error: 'Accion no reconocida: ' + action });
    }
  } catch (err) {
    return respond({ success: false, error: 'Error interno: ' + err.message });
  }
}

// ── Helpers ────────────────────────────────────────────────

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function getToday() {
  return getFechaHoy();
}

function getFechaHoy() {
  var now = new Date();
  var tz  = 'America/Guatemala';
  var y   = Utilities.formatDate(now, tz, 'yyyy');
  var m   = Utilities.formatDate(now, tz, 'MM');
  var d   = Utilities.formatDate(now, tz, 'dd');
  return y + '-' + m + '-' + d;
}

function getHoraActual() {
  var now = new Date();
  return Utilities.formatDate(now, 'America/Guatemala', 'HH:mm');
}

function getNow() {
  return getHoraActual();
}

function generateId() {
  return Utilities.getUuid();
}

function generarId() {
  return Utilities.getUuid();
}

function generateToken() {
  var raw   = Date.now().toString() + Math.random().toString();
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return bytes.map(function(b) {
    return ('0' + (b & 0xff).toString(16)).slice(-2);
  }).join('').substring(0, 48);
}

function dateToString(d) {
  if (!d) return '';
  if (typeof d === 'string') return d;
  var dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  var y  = dt.getFullYear();
  var m  = String(dt.getMonth() + 1).padStart(2, '0');
  var dy = String(dt.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + dy;
}

function num(v) {
  var n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function rowToObj(headers, row) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    obj[headers[i]] = row[i];
  }
  return obj;
}

function registrarLog(session, accion, hoja, id, anterior, nuevo) {
  try {
    var sheet = getSheet(HOJAS.LOG);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['ID', 'Fecha', 'Hora', 'Usuario', 'Accion', 'Hoja', 'Registro_ID', 'Anterior', 'Nuevo']);
    }
    sheet.appendRow([
      generarId(),
      getFechaHoy(),
      getHoraActual(),
      session ? (session.username || session.id) : 'sistema',
      accion,
      hoja,
      id,
      JSON.stringify(anterior),
      JSON.stringify(nuevo),
    ]);
  } catch (e) { /* silenciar para no interrumpir flujo */ }
}

// ── Setup y menú ───────────────────────────────────────────

function setup() {
  initSheets();
  SpreadsheetApp.getUi().alert(
    'Control LSA — Setup completado\n\n' +
    'Credenciales iniciales:\n' +
    'Usuario: AdminLSA\n' +
    'Contraseña: Lecheria2026\n\n' +
    'Pasos para deploy:\n' +
    '1. Implementar > Administrar implementaciones\n' +
    '2. Seleccionar "Nueva versión"\n' +
    '3. Copiar la URL del Web App\n' +
    '4. Agregar en Netlify como NEXT_PUBLIC_API_URL'
  );
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Control LSA')
    .addItem('Ejecutar Setup', 'setup')
    .addToUi();
}
