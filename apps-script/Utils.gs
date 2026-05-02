// ============================================================
// Utils.gs — Helpers de fecha y formato reutilizables
// ============================================================

var TZ = 'America/Guatemala';

function getFechaAyer() {
  var d = new Date();
  d.setDate(d.getDate() - 1);
  return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
}

function formatFechaDate(date) {
  if (!date) return '';
  if (typeof date === 'string') return date;
  return Utilities.formatDate(new Date(date), TZ, 'yyyy-MM-dd');
}

/**
 * Calcular quincena para una fecha dada.
 * A = 1–15, B = 16–fin de mes
 */
function calcularQuincena(fecha) {
  var d   = fecha ? new Date(fecha + 'T12:00:00') : new Date();
  var y   = d.getFullYear();
  var mo  = d.getMonth();
  var day = d.getDate();
  var isA = day <= 15;

  var inicio = isA ? new Date(y, mo, 1) : new Date(y, mo, 16);
  var fin    = isA ? new Date(y, mo, 15) : new Date(y, mo + 1, 0);

  return {
    tipo:   isA ? 'A' : 'B',
    inicio: dateToString(inicio),
    fin:    dateToString(fin),
  };
}

/**
 * Quincena anterior a la de la fecha dada.
 */
function calcularQuincenaAnterior(fecha) {
  var q  = calcularQuincena(fecha);
  if (q.tipo === 'A') {
    // Anterior: B del mes pasado
    var d   = new Date(q.inicio + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    return calcularQuincena(dateToString(d));
  } else {
    // Anterior: A del mismo mes
    var d2  = new Date(q.inicio + 'T12:00:00');
    d2.setDate(1);
    return calcularQuincena(dateToString(d2));
  }
}

/**
 * Formatear monto en Q (para logs/alertas)
 */
function formatQ(n) {
  return 'Q ' + Number(n).toFixed(2);
}

// ============================================================
// SECURITY HELPERS
// ============================================================

// PASSWORD_SALT se lee de Script Properties (equivalente .env en Apps Script).
// Configura un valor aleatorio en: Project Settings → Script Properties → PASSWORD_SALT
// Si nunca se rotó, el fallback se usa para no romper migraciones legacy.
function _getPasswordSalt() {
  try {
    var prop = PropertiesService.getScriptProperties().getProperty('PASSWORD_SALT');
    if (prop) return prop;
  } catch (e) {}
  return 'lsa-control-2026-pwd-salt-v1';
}

var SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 horas

/**
 * SHA-256 hash con salt. Usado para guardar contraseñas en Sheets.
 * Las contraseñas en texto plano nunca se guardan ni se loguean.
 */
function hashPassword(plain) {
  var raw   = String(plain || '') + ':' + _getPasswordSalt();
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return bytes.map(function(b) {
    return ('0' + (b & 0xff).toString(16)).slice(-2);
  }).join('');
}

/**
 * Marca de un hash. Las migraciones convierten contraseñas legacy → hash.
 */
function isHashedPassword(value) {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

/**
 * Sanitiza valores para evitar formula injection en Sheets.
 * Anteponer comilla simple si empieza con =, +, -, @ neutraliza la fórmula.
 */
function sanitizarValor(v) {
  if (v === null || v === undefined) return '';
  var s = String(v);
  if (s.length > 0 && /^[=+\-@]/.test(s)) return "'" + s;
  return s;
}

/**
 * Validador de email simple (sin RFC completo).
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}
