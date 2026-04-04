// ============================================================
// Sheets.gs — CRUD: Cargas, Mediciones, Proveedores, Usuarios
// ============================================================

// ── CARGAS ───────────────────────────────────────────────────

// Cols: 0=id 1=fecha 2=hora 3=proveedor 4=litros_t1 5=litros_t2 6=total 7=foto_url
function getCargas(body, user) {
  var fecha = body.fecha || getToday();
  var sheet = getSheet('Cargas');
  var data  = sheet.getDataRange().getValues();
  var cargas = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (dateToString(row[1]) === fecha) {
      cargas.push({
        id:        String(row[0]),
        fecha:     dateToString(row[1]),
        hora:      String(row[2] || ''),
        proveedor: String(row[3] || ''),
        litros_t1: num(row[4]),
        litros_t2: num(row[5]),
        total:     num(row[6]),
        foto_url:  String(row[7] || ''),
      });
    }
  }
  return { success: true, data: cargas };
}

function saveCarga(body, user) {
  var sheet  = getSheet('Cargas');
  var id     = generateId();
  var fecha  = getToday();
  var hora   = getNow();
  var t1     = num(body.litros_t1);
  var t2     = num(body.litros_t2);
  var total  = t1 + t2;

  sheet.appendRow([
    id, fecha, hora,
    String(body.proveedor || ''),
    t1, t2, total,
    String(body.foto_url || ''),
  ]);

  return { success: true, data: { id: id } };
}

function editarCarga(body, user) {
  var sheet = getSheet('Cargas');
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      var t1    = num(body.litros_t1 !== undefined ? body.litros_t1 : data[i][4]);
      var t2    = num(body.litros_t2 !== undefined ? body.litros_t2 : data[i][5]);
      var total = t1 + t2;
      var prov  = body.proveedor !== undefined ? String(body.proveedor) : String(data[i][3]);

      sheet.getRange(i + 1, 4).setValue(prov);
      sheet.getRange(i + 1, 5).setValue(t1);
      sheet.getRange(i + 1, 6).setValue(t2);
      sheet.getRange(i + 1, 7).setValue(total);
      return { success: true };
    }
  }
  return { success: false, error: 'Carga no encontrada' };
}

function deleteCarga(body, user) {
  var sheet = getSheet('Cargas');
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Carga no encontrada' };
}

// ── MEDICIONES ───────────────────────────────────────────────

// Cols: 0=id 1=fecha 2=litros_real_t1 3=litros_real_t2 4=total_real 5=dif_litros 6=dif_pct 7=foto_url
function getMedicion(body, user) {
  var fecha = body.fecha || getToday();
  var sheet = getSheet('Mediciones');
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (dateToString(row[1]) === fecha) {
      return {
        success: true,
        data: {
          fecha:          dateToString(row[1]),
          litros_real_t1: num(row[2]),
          litros_real_t2: num(row[3]),
          total_real:     num(row[4]),
          diferencia_litros: num(row[5]),
          diferencia_pct:    num(row[6]),
          foto_url:       String(row[7] || ''),
        }
      };
    }
  }
  return { success: true, data: null };
}

function saveMedicion(body, user) {
  var fecha = getToday();
  // Check if medicion already exists for today
  var existing = getMedicion({ fecha: fecha }, user);
  if (existing.data) {
    // Update instead
    return editarMedicion(Object.assign({}, body, { fecha: fecha }), user);
  }

  var sheet = getSheet('Mediciones');
  var id    = generateId();
  var t1    = num(body.litros_real_t1);
  var t2    = num(body.litros_real_t2);
  var total = t1 + t2;

  // Get today's total cargas to compute difference
  var cargasHoy = getCargasTotales(fecha);
  var difLitros = total - cargasHoy;
  var difPct    = cargasHoy > 0 ? ((difLitros / cargasHoy) * 100) : 0;

  sheet.appendRow([
    id, fecha, t1, t2, total,
    Math.round(difLitros * 100) / 100,
    Math.round(difPct * 100) / 100,
    String(body.foto_url || ''),
  ]);

  return { success: true, data: { id: id } };
}

function editarMedicion(body, user) {
  var fecha = body.fecha || getToday();
  var sheet = getSheet('Mediciones');
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (dateToString(data[i][1]) === fecha) {
      var t1    = num(body.litros_real_t1 !== undefined ? body.litros_real_t1 : data[i][2]);
      var t2    = num(body.litros_real_t2 !== undefined ? body.litros_real_t2 : data[i][3]);
      var total = t1 + t2;
      var cargasTotal = getCargasTotales(fecha);
      var dif    = total - cargasTotal;
      var difPct = cargasTotal > 0 ? ((dif / cargasTotal) * 100) : 0;

      sheet.getRange(i + 1, 3).setValue(t1);
      sheet.getRange(i + 1, 4).setValue(t2);
      sheet.getRange(i + 1, 5).setValue(total);
      sheet.getRange(i + 1, 6).setValue(Math.round(dif * 100) / 100);
      sheet.getRange(i + 1, 7).setValue(Math.round(difPct * 100) / 100);
      if (body.foto_url) sheet.getRange(i + 1, 8).setValue(String(body.foto_url));
      return { success: true };
    }
  }
  return { success: false, error: 'Medicion no encontrada' };
}

function getCargasTotales(fecha) {
  var sheet = getSheet('Cargas');
  var data  = sheet.getDataRange().getValues();
  var total = 0;
  for (var i = 1; i < data.length; i++) {
    if (dateToString(data[i][1]) === fecha) {
      total += num(data[i][6]);
    }
  }
  return total;
}

// ── PROVEEDORES ──────────────────────────────────────────────

// Cols: 0=id 1=nombre 2=activo
function getProveedores(user) {
  var sheet = getSheet('Proveedores');
  var data  = sheet.getDataRange().getValues();
  var lista = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    lista.push({
      id:     String(row[0]),
      nombre: String(row[1] || ''),
      activo: row[2] !== false && row[2] !== 'false' && row[2] !== 0,
    });
  }
  return { success: true, data: lista };
}

function saveProveedor(body, user) {
  var nombre = String(body.nombre || '').trim();
  if (!nombre) return { success: false, error: 'Nombre requerido' };

  // Check duplicate
  var sheet = getSheet('Proveedores');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase() === nombre.toLowerCase()) {
      return { success: false, error: 'Proveedor ya existe' };
    }
  }

  var id = generateId();
  sheet.appendRow([id, nombre, true]);
  return { success: true, data: { id: id, nombre: nombre, activo: true } };
}

function toggleProveedor(body, user) {
  var sheet = getSheet('Proveedores');
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      var current = data[i][2];
      var newVal  = !(current !== false && current !== 'false' && current !== 0);
      sheet.getRange(i + 1, 3).setValue(newVal);
      return { success: true };
    }
  }
  return { success: false, error: 'Proveedor no encontrado' };
}

// ── USUARIOS ─────────────────────────────────────────────────

// Cols: 0=id 1=nombre 2=username 3=password 4=role 5=activo 6=apiToken
function getUsuarios(user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };

  var sheet = getSheet('Usuarios');
  var data  = sheet.getDataRange().getValues();
  var lista = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    lista.push({
      id:       String(row[0]),
      nombre:   String(row[1] || ''),
      username: String(row[2] || ''),
      role:     String(row[4] || 'empleado'),
      activo:   row[5] !== false && row[5] !== 'false' && row[5] !== 0,
    });
  }
  return { success: true, data: lista };
}

function saveUsuario(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };

  var sheet    = getSheet('Usuarios');
  var data     = sheet.getDataRange().getValues();
  var username = String(body.username || '').trim();
  var password = String(body.password || '').trim();
  var nombre   = String(body.nombre || username).trim();
  var role     = String(body.role || 'empleado').trim();

  if (!username || !password) return { success: false, error: 'Usuario y contraseña requeridos' };

  // Check if updating existing (by id) or creating new
  if (body.id) {
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(body.id)) {
        sheet.getRange(i + 1, 2).setValue(nombre);
        sheet.getRange(i + 1, 3).setValue(username);
        if (password) sheet.getRange(i + 1, 4).setValue(password);
        sheet.getRange(i + 1, 5).setValue(role);
        return { success: true };
      }
    }
  }

  // New user — check duplicate username
  for (var j = 1; j < data.length; j++) {
    if (String(data[j][2]).toLowerCase() === username.toLowerCase()) {
      return { success: false, error: 'Usuario ya existe' };
    }
  }

  var id = generateId();
  sheet.appendRow([id, nombre, username, password, role, true, '']);
  return { success: true, data: { id: id } };
}

function toggleUsuario(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };

  var sheet = getSheet('Usuarios');
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      // Don't allow disabling yourself
      if (String(data[i][2]) === user.username) {
        return { success: false, error: 'No puedes desactivar tu propio usuario' };
      }
      var current = data[i][5];
      var newVal  = !(current !== false && current !== 'false' && current !== 0);
      sheet.getRange(i + 1, 6).setValue(newVal);
      return { success: true };
    }
  }
  return { success: false, error: 'Usuario no encontrado' };
}

function deleteUsuario(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };

  var sheet = getSheet('Usuarios');
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      if (String(data[i][2]) === user.username) {
        return { success: false, error: 'No puedes eliminar tu propio usuario' };
      }
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Usuario no encontrado' };
}

function deleteProveedor(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };

  var sheet = getSheet('Proveedores');
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Proveedor no encontrado' };
}

function deleteMedicion(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };

  var fecha = String(body.fecha || getToday());
  var sheet = getSheet('Mediciones');
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (dateToString(data[i][1]) === fecha) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Medicion no encontrada para esa fecha' };
}

function getCargasPorProveedor(body, user) {
  var inicio = String(body.fechaInicio || '');
  var fin    = String(body.fechaFin    || '');
  if (!inicio || !fin) return { success: false, error: 'Rango de fechas requerido' };

  var sheet = getSheet('Cargas');
  var data  = sheet.getDataRange().getValues();
  var byProv = {};

  for (var i = 1; i < data.length; i++) {
    var f = dateToString(data[i][1]);
    if (f >= inicio && f <= fin) {
      var prov = String(data[i][3] || 'Sin proveedor');
      if (!byProv[prov]) byProv[prov] = { proveedor: prov, t1: 0, t2: 0, total: 0 };
      byProv[prov].t1    += num(data[i][4]);
      byProv[prov].t2    += num(data[i][5]);
      byProv[prov].total += num(data[i][6]);
    }
  }

  var result = Object.keys(byProv).map(function(k) {
    var p = byProv[k];
    return {
      proveedor: p.proveedor,
      t1:    Math.round(p.t1    * 10) / 10,
      t2:    Math.round(p.t2    * 10) / 10,
      total: Math.round(p.total * 10) / 10,
    };
  });

  result.sort(function(a, b) { return b.total - a.total; });
  return { success: true, data: result };
}
