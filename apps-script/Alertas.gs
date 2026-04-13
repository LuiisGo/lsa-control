// ============================================================
// Alertas.gs — Configuración y disparo de alertas por email
// ============================================================

// ── CONFIG ────────────────────────────────────────────────────
// Cols: 0=ID 1=Tipo 2=Descripcion 3=Umbral 4=Emails 5=Activo

function getAlertasConfig(user) {
  var sheet = getSheet('ALERTAS_CONFIG');
  var data  = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    lista.push({
      id:          String(row[0]),
      tipo:        String(row[1]||''),
      descripcion: String(row[2]||''),
      umbral:      num(row[3]),
      emails:      String(row[4]||''),
      activo:      row[5] !== false && row[5] !== 'false' && row[5] !== 0,
    });
  }
  return { success: true, data: lista };
}

function saveAlertaConfig(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var sheet = getSheet('ALERTAS_CONFIG');
  var data  = sheet.getDataRange().getValues();

  // Update existing if id provided
  if (body.id) {
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(body.id)) {
        if (body.umbral      !== undefined) sheet.getRange(i+1, 4).setValue(num(body.umbral));
        if (body.emails      !== undefined) sheet.getRange(i+1, 5).setValue(String(body.emails));
        if (body.descripcion !== undefined) sheet.getRange(i+1, 3).setValue(String(body.descripcion));
        return { success: true };
      }
    }
  }

  // Create new
  var id = generateId();
  sheet.appendRow([
    id,
    String(body.tipo        || ''),
    String(body.descripcion || ''),
    num(body.umbral),
    String(body.emails      || ''),
    true,
  ]);
  return { success: true, data: { id: id } };
}

function toggleAlerta(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var sheet = getSheet('ALERTAS_CONFIG');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      var cur = data[i][5];
      sheet.getRange(i+1, 6).setValue(!(cur !== false && cur !== 'false' && cur !== 0));
      return { success: true };
    }
  }
  return { success: false, error: 'Alerta no encontrada' };
}

// ── VERIFICACIONES ────────────────────────────────────────────

/**
 * Llamar desde saveEnvio. Verifica si los litros totales del tanque
 * están por debajo del umbral configurado.
 */
function verificarAlertasTanque() {
  try {
    var alertas = getAlertasConfig(null).data || [];
    var activas = alertas.filter(function(a) {
      return a.activo && a.tipo === 'TANQUE_MINIMO';
    });
    if (!activas.length) return;

    var fecha = getFechaHoy();
    var cargasSheet = getSheet('Cargas');
    var cargasData  = cargasSheet.getDataRange().getValues();
    var totalHoy    = 0;
    for (var i = 1; i < cargasData.length; i++) {
      if (dateToString(cargasData[i][1]) === fecha) {
        totalHoy += num(cargasData[i][6]);
      }
    }

    activas.forEach(function(alerta) {
      if (totalHoy <= alerta.umbral && alerta.emails) {
        var destinatarios = alerta.emails.split(',').map(function(e) { return e.trim(); }).filter(Boolean);
        destinatarios.forEach(function(email) {
          try {
            MailApp.sendEmail({
              to:      email,
              subject: '[LSA] Alerta de Tanque — ' + fecha,
              body:    'El nivel actual del tanque es ' + totalHoy.toFixed(1) + ' L, por debajo del umbral de ' + alerta.umbral + ' L.\n\nFecha: ' + fecha + '\nSistema LSA Control',
            });
          } catch(e) {}
        });
      }
    });
  } catch(e) {}
}

/**
 * Llamar desde saveMedicion con los totales cargados y medidos.
 */
function verificarAlertaDiferencia(totalCarga, totalReal) {
  try {
    if (totalCarga <= 0) return;
    var alertas = getAlertasConfig(null).data || [];
    var activas = alertas.filter(function(a) {
      return a.activo && a.tipo === 'DIFERENCIA_ALTA';
    });
    if (!activas.length) return;

    var dif    = Math.abs(totalReal - totalCarga);
    var difPct = (dif / totalCarga) * 100;
    var fecha  = getFechaHoy();

    activas.forEach(function(alerta) {
      if (difPct >= alerta.umbral && alerta.emails) {
        var destinatarios = alerta.emails.split(',').map(function(e) { return e.trim(); }).filter(Boolean);
        destinatarios.forEach(function(email) {
          try {
            MailApp.sendEmail({
              to:      email,
              subject: '[LSA] Alerta Diferencia Alta — ' + fecha,
              body:    'Diferencia entre carga y medición: ' + difPct.toFixed(2) + '% (' + dif.toFixed(1) + ' L).\nUmbral configurado: ' + alerta.umbral + '%.\n\nCarga total: ' + totalCarga.toFixed(1) + ' L\nMedición real: ' + totalReal.toFixed(1) + ' L\nFecha: ' + fecha + '\nSistema LSA Control',
            });
          } catch(e) {}
        });
      }
    });
  } catch(e) {}
}
