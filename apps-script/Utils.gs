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
