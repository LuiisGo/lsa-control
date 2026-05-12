// ============================================================
// Code.gs — Entry point del Web App LSA Control
// ============================================================

var SPREADSHEET_ID = '1R6IXVYnA9P30zHUwnHCMbyXCIxR5ReMCgmXcOe1k82c';

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var token  = body.token;

    // Acción pública
    if (action === 'login') return respond(handleLogin(body));

    // Acciones protegidas
    var user = validateToken(token);
    if (!user) return respond({ success: false, error: 'Token inválido o sesión expirada' });

    switch (action) {
      // Dashboard
      case 'getDashboardHoy':     return respond(getDashboardHoy(user));
      case 'getQuincena':         return respond(getQuincena(user));
      case 'getQuincenaAnterior': return respond(getQuincenaAnterior(user));
      case 'getComparativa':      return respond(getComparativa(user));
      // Cargas
      case 'getCargas':    return respond(getCargas(body, user));
      case 'saveCarga':    return respond(saveCarga(body, user));
      case 'editarCarga':  return respond(editarCarga(body, user));
      case 'deleteCarga':  return respond(deleteCarga(body, user));
      // Mediciones
      case 'getMedicion':    return respond(getMedicion(body, user));
      case 'saveMedicion':   return respond(saveMedicion(body, user));
      case 'editarMedicion': return respond(editarMedicion(body, user));
      case 'deleteMedicion': return respond(deleteMedicion(body, user));
      // Proveedores
      case 'getProveedores':  return respond(getProveedores(user));
      case 'saveProveedor':   return respond(saveProveedor(body, user));
      case 'toggleProveedor': return respond(toggleProveedor(body, user));
      case 'deleteProveedor': return respond(deleteProveedor(body, user));
      // Usuarios
      case 'getUsuarios':   return respond(getUsuarios(user));
      case 'saveUsuario':   return respond(saveUsuario(body, user));
      case 'toggleUsuario': return respond(toggleUsuario(body, user));
      case 'deleteUsuario': return respond(deleteUsuario(body, user));
      // Análisis
      case 'getCargasPorProveedor': return respond(getCargasPorProveedor(body, user));
      // Exportar
      case 'exportarDatos': return respond(exportarDatos(body, user));
      // Drive
      case 'subirFoto': return respond(subirFoto(body, user));
      // WebAuthn (not implemented — graceful fallback)
      case 'webauthn-challenge':
      case 'webauthn-verify':
      case 'saveWebAuthnCredential':
        return respond({ success: false, error: 'WebAuthn no configurado en el servidor' });

      default:
        return respond({ success: false, error: 'Accion no reconocida: ' + action });
    }
  } catch (err) {
    return respond({ success: false, error: 'Error interno: ' + err.message });
  }
}

function doGet(e) {
  return respond({ success: true, message: 'LSA Control API v2.0 activa' });
}

// ── Helpers ────────────────────────────────────────────────

function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(name) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function getToday() {
  var now = new Date();
  var y = now.getFullYear();
  var m = String(now.getMonth() + 1).padStart(2, '0');
  var d = String(now.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function getNow() {
  var now = new Date();
  return now.toTimeString().substring(0, 5);
}

function generateId() {
  return Utilities.getUuid();
}

function generateToken() {
  var raw = Date.now().toString() + Math.random().toString();
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
  var y = dt.getFullYear();
  var m = String(dt.getMonth() + 1).padStart(2, '0');
  var day = String(dt.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function num(v) {
  var n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}
