// ============================================================
// Sheets.gs — CRUD Fase 1 + initSheets Fase 1+2
// ============================================================

function initSheets() {
  var ss = SpreadsheetApp.openById('1R6IXVYnA9P30zHUwnHCMbyXCIxR5ReMCgmXcOe1k82c');

  function ensureSheet(name, headers) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(headers);
      Logger.log('Creada: ' + name);
    } else {
      Logger.log('Existe: ' + name);
    }
    return sheet;
  }

  // Fase 1
  ensureSheet('Cargas',     ['ID','Fecha','Hora','Proveedor','Litros_T1','Litros_T2','Total','Foto_URL']);
  ensureSheet('Mediciones', ['ID','Fecha','Litros_Real_T1','Litros_Real_T2','Total_Real','Dif_Litros','Dif_Pct','Foto_URL']);
  ensureSheet('Proveedores',['ID','Nombre','Activo']);
  ensureSheet('LOG_CAMBIOS',['ID','Fecha','Hora','Usuario','Accion','Hoja','Registro_ID','Anterior','Nuevo']);

  var usuSheet = ss.getSheetByName('Usuarios');
  if (!usuSheet) {
    usuSheet = ss.insertSheet('Usuarios');
    usuSheet.appendRow(['ID','Nombre','Username','Password','Role','Activo','ApiToken','CredentialId','PublicKey','Permisos','Token_Expira']);
  }

  // Fase 2
  ensureSheet('COMPRADORES',        ['ID','Nombre','NIT','Activo']);
  ensureSheet('ENVIOS',             ['ID','Fecha','Comprador_ID','Comprador_Nombre','Litros_Enviados','Monto_Total','Notas','Usuario_ID','Usuario_Nombre','Timestamp']);
  ensureSheet('PRECIOS_COMPRADOR',  ['ID','Comprador_ID','Fecha','Precio_Litro']);
  ensureSheet('REMANENTES',         ['ID','Fecha_Origen','Litros_T1','Litros_T2','Total','Usado_Como_Inicial','Fecha_Uso']);
  ensureSheet('TARIFAS_PROVEEDORES',['ID','Proveedor_ID','Proveedor_Nombre','Precio_Litro','Vigente_Desde','Activo']);
  ensureSheet('PLANILLAS',          ['ID','Quincena_Inicio','Quincena_Fin','Proveedor_ID','Proveedor_Nombre','Total_Litros','Precio_Litro','Subtotal','IVA','Total_Con_IVA','Estado','Fecha_Generada']);
  ensureSheet('GASTOS',             ['ID','Fecha','Categoria_ID','Categoria_Nombre','Descripcion','Monto','IVA_Incluido','Usuario_ID','Usuario_Nombre','Comprobante_URL']);
  ensureSheet('CATEGORIAS_GASTOS',  ['ID','Nombre','Activo']);
  ensureSheet('ALERTAS_CONFIG',     ['ID','Tipo','Descripcion','Umbral','Emails','Activo']);
  ensureSheet('ACCESOS_PROVEEDORES',['ID','Proveedor_ID','Proveedor_Nombre','Codigo_Acceso','Link_Token','Activo']);

  // Initial users (passwords ya hasheadas — nunca guardar texto plano)
  var uData = usuSheet.getDataRange().getValues();
  if (uData.length <= 1) {
    var defaultAdminPwd = hashPassword('Lecheria2026');
    var defaultEmpPwd   = hashPassword('LSA2026');
    var allPermisos     = JSON.stringify(['cargas','medicion','envios','gastos','remanentes']);
    usuSheet.appendRow([generateId(),'Administrador LSA','AdminLSA',defaultAdminPwd,'admin',true,'','','',allPermisos,'']);
    usuSheet.appendRow([generateId(),'Empleado Acopio','Acopio1',defaultEmpPwd,'empleado',true,'','','',allPermisos,'']);
  }

  // Proteger hoja USUARIOS (no editable manualmente desde la UI de Sheets)
  try {
    var existingProtections = usuSheet.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    if (existingProtections.length === 0) {
      usuSheet.protect()
        .setDescription('Protegida por LSA Control — no editar manualmente')
        .setWarningOnly(true);
    }
  } catch (e) { /* ignorar si no hay permisos */ }

  // Initial proveedores
  var provSheet = ss.getSheetByName('Proveedores');
  if (provSheet.getDataRange().getValues().length <= 1) {
    provSheet.appendRow([generateId(),'Proveedor Ejemplo 1',true]);
    provSheet.appendRow([generateId(),'Proveedor Ejemplo 2',true]);
  }

  // Initial gastos categories
  var catSheet = ss.getSheetByName('CATEGORIAS_GASTOS');
  if (catSheet.getDataRange().getValues().length <= 1) {
    ['Combustible','Mantenimiento','Materiales','Servicios','Otros'].forEach(function(n) {
      catSheet.appendRow([generateId(), n, true]);
    });
  }

  // Default alerts
  var alertSheet = ss.getSheetByName('ALERTAS_CONFIG');
  if (alertSheet.getDataRange().getValues().length <= 1) {
    alertSheet.appendRow([generateId(),'TANQUE_MINIMO','Notificar cuando el total del día baje de X litros',500,'',false]);
    alertSheet.appendRow([generateId(),'DIFERENCIA_ALTA','Notificar cuando la diferencia carga/regla supere X%',5,'',false]);
  }
}

// ── CARGAS ───────────────────────────────────────────────────

function getCargas(body, user) {
  var fecha  = body.fecha || getToday();
  var sheet  = getSheet('Cargas');
  var data   = sheet.getDataRange().getValues();
  var cargas = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (dateToString(row[1]) === fecha) {
      cargas.push({
        id: String(row[0]), fecha: dateToString(row[1]),
        hora: String(row[2]||''), proveedor: String(row[3]||''),
        litros_t1: num(row[4]), litros_t2: num(row[5]), total: num(row[6]),
        foto_url: String(row[7]||''),
      });
    }
  }
  return { success: true, data: cargas };
}

function saveCarga(body, user) {
  if (!tienePermiso(user, 'cargas')) return { success: false, error: 'Sin permiso para registrar cargas' };
  var t1 = num(body.litros_t1), t2 = num(body.litros_t2);
  if (t1 < 0 || t2 < 0)       return { success: false, error: 'Litros no pueden ser negativos' };
  if (t1 + t2 <= 0)           return { success: false, error: 'Total litros debe ser > 0' };
  var proveedor = String(body.proveedor || '').trim();
  if (!proveedor)             return { success: false, error: 'Proveedor requerido' };

  var sheet = getSheet('Cargas');
  var id    = generateId();
  var fecha = body.fecha || getToday();
  var hora  = body.hora  || getNow();
  sheet.appendRow([
    id, fecha, hora, sanitizarValor(proveedor),
    t1, t2, t1+t2, sanitizarValor(body.foto_url||'')
  ]);
  registrarLog(user, 'CREATE_CARGA', 'Cargas', id, '', { fecha: fecha, proveedor: proveedor, total: t1+t2 });
  return { success: true, data: { id: id } };
}

function editarCarga(body, user) {
  if (!tienePermiso(user, 'cargas') && user.role !== 'admin') {
    return { success: false, error: 'Sin permisos para editar cargas' };
  }
  var sheet = getSheet('Cargas');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      var t1   = num(body.litros_t1 !== undefined ? body.litros_t1 : data[i][4]);
      var t2   = num(body.litros_t2 !== undefined ? body.litros_t2 : data[i][5]);
      if (t1 < 0 || t2 < 0) return { success: false, error: 'Litros no pueden ser negativos' };
      var prov = body.proveedor !== undefined ? String(body.proveedor).trim() : String(data[i][3]);
      if (!prov) return { success: false, error: 'Proveedor requerido' };
      var anterior = { proveedor: String(data[i][3]), t1: num(data[i][4]), t2: num(data[i][5]), total: num(data[i][6]) };
      sheet.getRange(i+1,4).setValue(sanitizarValor(prov));
      sheet.getRange(i+1,5).setValue(t1);
      sheet.getRange(i+1,6).setValue(t2);
      sheet.getRange(i+1,7).setValue(t1+t2);
      registrarLog(user, 'UPDATE_CARGA', 'Cargas', body.id, anterior, { proveedor: prov, t1: t1, t2: t2, total: t1+t2 });
      return { success: true };
    }
  }
  return { success: false, error: 'Carga no encontrada' };
}

function deleteCarga(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var sheet = getSheet('Cargas');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      var anterior = { fecha: dateToString(data[i][1]), proveedor: String(data[i][3]), total: num(data[i][6]) };
      sheet.deleteRow(i+1);
      registrarLog(user, 'DELETE_CARGA', 'Cargas', body.id, anterior, '');
      return { success: true };
    }
  }
  return { success: false, error: 'Carga no encontrada' };
}

function getCargasTotales(fecha) {
  var sheet = getSheet('Cargas');
  var data  = sheet.getDataRange().getValues();
  var total = 0;
  for (var i = 1; i < data.length; i++) {
    if (dateToString(data[i][1]) === fecha) total += num(data[i][6]);
  }
  return total;
}

// ── MEDICIONES ───────────────────────────────────────────────

function getMedicion(body, user) {
  var fecha = body.fecha || getToday();
  var sheet = getSheet('Mediciones');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (dateToString(row[1]) === fecha) {
      return { success: true, data: {
        fecha: dateToString(row[1]),
        litros_real_t1: num(row[2]), litros_real_t2: num(row[3]),
        total_real: num(row[4]), diferencia_litros: num(row[5]),
        diferencia_pct: num(row[6]), foto_url: String(row[7]||''),
      }};
    }
  }
  return { success: true, data: null };
}

function saveMedicion(body, user) {
  if (!tienePermiso(user, 'medicion')) return { success: false, error: 'Sin permiso para registrar mediciones' };
  var fecha    = getToday();
  var existing = getMedicion({ fecha: fecha }, user);
  if (existing.data) return editarMedicion(Object.assign({}, body, { fecha: fecha }), user);
  var sheet    = getSheet('Mediciones');
  var id       = generateId();
  var t1       = num(body.litros_real_t1), t2 = num(body.litros_real_t2);
  var total    = t1 + t2;
  var cargasH  = getCargasTotales(fecha);
  var dif      = total - cargasH;
  var difPct   = cargasH > 0 ? (dif / cargasH * 100) : 0;
  sheet.appendRow([id, fecha, t1, t2, total, Math.round(dif*100)/100, Math.round(difPct*100)/100, String(body.foto_url||'')]);
  try { verificarAlertaDiferencia(cargasH, total); } catch(e) {}
  return { success: true, data: { id: id } };
}

function editarMedicion(body, user) {
  var fecha = body.fecha || getToday();
  var sheet = getSheet('Mediciones');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (dateToString(data[i][1]) === fecha) {
      var t1     = num(body.litros_real_t1 !== undefined ? body.litros_real_t1 : data[i][2]);
      var t2     = num(body.litros_real_t2 !== undefined ? body.litros_real_t2 : data[i][3]);
      var total  = t1 + t2;
      var cargasT= getCargasTotales(fecha);
      var dif    = total - cargasT;
      var difPct = cargasT > 0 ? (dif / cargasT * 100) : 0;
      sheet.getRange(i+1,3).setValue(t1); sheet.getRange(i+1,4).setValue(t2);
      sheet.getRange(i+1,5).setValue(total);
      sheet.getRange(i+1,6).setValue(Math.round(dif*100)/100);
      sheet.getRange(i+1,7).setValue(Math.round(difPct*100)/100);
      if (body.foto_url) sheet.getRange(i+1,8).setValue(String(body.foto_url));
      return { success: true };
    }
  }
  return { success: false, error: 'Medicion no encontrada' };
}

function deleteMedicion(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var fecha = String(body.fecha || getToday());
  var sheet = getSheet('Mediciones');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (dateToString(data[i][1]) === fecha) {
      var anterior = { fecha: fecha, total_real: num(data[i][4]) };
      sheet.deleteRow(i+1);
      registrarLog(user, 'DELETE_MEDICION', 'Mediciones', '', anterior, '');
      return { success: true };
    }
  }
  return { success: false, error: 'Medicion no encontrada' };
}

// ── PROVEEDORES ──────────────────────────────────────────────

function getProveedores(user) {
  var sheet = getSheet('Proveedores');
  var data  = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    lista.push({
      id:            String(row[0]),
      nombre:        String(row[1]||''),
      activo:        row[2] !== false && row[2] !== 'false' && row[2] !== 0,
      aplicaIVA:     row[3] === true  || row[3] === 'true'  || row[3] === 1,
      frecuenciaPago:String(row[4] || 'quincenal'),
      diaCorte:      (row[5] != null && row[5] !== '') ? Number(row[5]) : 1,
      codigo:        String(row[6]||''),
    });
  }
  return { success: true, data: lista };
}

function _generarCodigoProveedor(nombre, existentes) {
  var base = String(nombre||'')
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z]/g, '');
  while (base.length < 3) base += 'X';
  var prefix = base.slice(0, 3);
  var existSet = {};
  for (var i = 0; i < existentes.length; i++) existSet[existentes[i]] = true;
  for (var n = 1; n <= 999; n++) {
    var cand = prefix + ('00' + n).slice(-3);
    if (!existSet[cand]) return cand;
  }
  // fallback: prefijo + sufijo aleatorio
  return prefix + Math.floor(Math.random() * 900 + 100);
}

function saveProveedor(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var nombre = String(body.nombre||'').trim();
  if (!nombre) return { success: false, error: 'Nombre requerido' };
  var aplicaIVA  = body.aplicaIVA === true || body.aplicaIVA === 'true' || body.aplicaIVA === 1;
  var frecuencia = String(body.frecuenciaPago || 'quincenal');
  var diaCorte   = (body.diaCorte != null && body.diaCorte !== '') ? Number(body.diaCorte) : 1;

  var sheet = getSheet('Proveedores');
  var data  = sheet.getDataRange().getValues();

  // ── Edición ─────────────────────────────────────────────────
  if (body.id) {
    for (var e = 1; e < data.length; e++) {
      if (String(data[e][0]) === String(body.id)) {
        // nombre único (excluyendo la propia fila)
        for (var k = 1; k < data.length; k++) {
          if (k !== e && String(data[k][1]).toLowerCase() === nombre.toLowerCase()) {
            return { success: false, error: 'Proveedor ya existe' };
          }
        }
        sheet.getRange(e+1, 2).setValue(nombre);
        sheet.getRange(e+1, 4).setValue(aplicaIVA);
        sheet.getRange(e+1, 5).setValue(frecuencia);
        sheet.getRange(e+1, 6).setValue(diaCorte);
        // codigo es inmutable; ignorar cualquier cambio entrante
        return { success: true, data: { id: String(body.id), codigo: String(data[e][6]||'') } };
      }
    }
    return { success: false, error: 'Proveedor no encontrado' };
  }

  // ── Creación ────────────────────────────────────────────────
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase() === nombre.toLowerCase()) return { success: false, error: 'Proveedor ya existe' };
  }

  // Validar / generar código
  var codigo = String(body.codigo||'').trim().toUpperCase();
  var codigosExistentes = [];
  for (var j = 1; j < data.length; j++) {
    if (data[j][6]) codigosExistentes.push(String(data[j][6]).toUpperCase());
  }
  if (codigo) {
    if (!/^[A-Z]{3}[0-9]{3}$/.test(codigo)) {
      return { success: false, error: 'Formato inválido. Usar 3 letras + 3 números. Ejemplo: LSA001' };
    }
    for (var c = 0; c < codigosExistentes.length; c++) {
      if (codigosExistentes[c] === codigo) return { success: false, error: 'Este código ya está en uso' };
    }
  } else {
    codigo = _generarCodigoProveedor(nombre, codigosExistentes);
  }

  var id = generateId();
  sheet.appendRow([id, nombre, true, aplicaIVA, frecuencia, diaCorte, codigo]);
  return { success: true, data: { id: id, nombre: nombre, activo: true, aplicaIVA: aplicaIVA, frecuenciaPago: frecuencia, diaCorte: diaCorte, codigo: codigo } };
}

function getProveedorPorCodigo(body, user) {
  var codigo = String(body.codigo||'').trim().toUpperCase();
  if (!codigo) return { success: false, error: 'Código requerido' };
  var sheet = getSheet('Proveedores');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][6]||'').toUpperCase() === codigo) {
      return { success: true, data: {
        id: String(data[i][0]),
        nombre: String(data[i][1]||''),
        codigo: String(data[i][6]||''),
      }};
    }
  }
  return { success: false, error: 'Proveedor no encontrado' };
}

function toggleProveedor(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var sheet = getSheet('Proveedores');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      var cur = data[i][2];
      sheet.getRange(i+1,3).setValue(!(cur !== false && cur !== 'false' && cur !== 0));
      return { success: true };
    }
  }
  return { success: false, error: 'Proveedor no encontrado' };
}

function deleteProveedor(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var sheet = getSheet('Proveedores');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) { sheet.deleteRow(i+1); return { success: true }; }
  }
  return { success: false, error: 'Proveedor no encontrado' };
}

// ── USUARIOS ─────────────────────────────────────────────────

function getUsuarios(user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var sheet = getSheet('Usuarios');
  var data  = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    lista.push({ id: String(row[0]), nombre: String(row[1]||''), username: String(row[2]||''), role: String(row[4]||'empleado'), activo: row[5] !== false && row[5] !== 'false' && row[5] !== 0 });
  }
  return { success: true, data: lista };
}

function saveUsuario(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var sheet    = getSheet('Usuarios');
  var data     = sheet.getDataRange().getValues();
  var username = String(body.username||'').trim();
  var password = String(body.password||'').trim();
  var nombre   = String(body.nombre||username).trim();
  var role     = String(body.role||'empleado').trim();

  if (!username) return { success: false, error: 'Usuario requerido' };
  if (role !== 'admin' && role !== 'empleado') return { success: false, error: 'Role inválido' };

  // En edición la password es opcional. En creación es obligatoria y mínimo 6 chars.
  if (!body.id) {
    if (!password)              return { success: false, error: 'Contraseña requerida' };
    if (password.length < 6)    return { success: false, error: 'Contraseña mínimo 6 caracteres' };
  } else if (password && password.length < 6) {
    return { success: false, error: 'Contraseña mínimo 6 caracteres' };
  }

  // Verificar username duplicado (siempre, también en edit)
  for (var k = 1; k < data.length; k++) {
    if (body.id && String(data[k][0]) === String(body.id)) continue; // permitir mismo registro
    if (String(data[k][2]).toLowerCase() === username.toLowerCase()) {
      return { success: false, error: 'Usuario ya existe' };
    }
  }

  if (body.id) {
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(body.id)) {
        var prev = { username: String(data[i][2]), role: String(data[i][4]), passwordChanged: !!password };
        sheet.getRange(i+1,2).setValue(sanitizarValor(nombre));
        sheet.getRange(i+1,3).setValue(sanitizarValor(username));
        if (password) sheet.getRange(i+1,4).setValue(hashPassword(password));
        sheet.getRange(i+1,5).setValue(role);
        if (body.permisos) sheet.getRange(i+1,10).setValue(JSON.stringify(body.permisos));
        registrarLog(user, 'UPDATE_USUARIO', 'Usuarios', body.id, prev, { username: username, role: role, passwordChanged: !!password });
        return { success: true };
      }
    }
    return { success: false, error: 'Usuario no encontrado' };
  }

  var id = generateId();
  var permisosJson = body.permisos ? JSON.stringify(body.permisos) : JSON.stringify(['cargas','medicion','envios','gastos','remanentes']);
  // 11 cols: ID Nombre Username Password(hash) Role Activo ApiToken credentialId publicKey Permisos Token_Expira
  sheet.appendRow([id, sanitizarValor(nombre), sanitizarValor(username), hashPassword(password), role, true, '', '', '', permisosJson, '']);
  registrarLog(user, 'CREATE_USUARIO', 'Usuarios', id, '', { username: username, role: role });
  return { success: true, data: { id: id } };
}

function toggleUsuario(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var sheet = getSheet('Usuarios');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      if (String(data[i][2]) === user.username) return { success: false, error: 'No puedes desactivar tu propio usuario' };
      var cur = data[i][5];
      sheet.getRange(i+1,6).setValue(!(cur !== false && cur !== 'false' && cur !== 0));
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
      if (String(data[i][2]) === user.username) return { success: false, error: 'No puedes eliminar tu propio usuario' };
      sheet.deleteRow(i+1);
      return { success: true };
    }
  }
  return { success: false, error: 'Usuario no encontrado' };
}

// ── CARGAS POR PROVEEDOR ──────────────────────────────────────

function getCargasPorProveedor(body, user) {
  var inicio = String(body.fechaInicio||''), fin = String(body.fechaFin||'');
  if (!inicio || !fin) return { success: false, error: 'Rango de fechas requerido' };
  var sheet  = getSheet('Cargas');
  var data   = sheet.getDataRange().getValues();
  var byProv = {};
  for (var i = 1; i < data.length; i++) {
    var f = dateToString(data[i][1]);
    if (f >= inicio && f <= fin) {
      var prov = String(data[i][3]||'Sin proveedor');
      if (!byProv[prov]) byProv[prov] = { proveedor: prov, t1: 0, t2: 0, total: 0 };
      byProv[prov].t1    += num(data[i][4]);
      byProv[prov].t2    += num(data[i][5]);
      byProv[prov].total += num(data[i][6]);
    }
  }
  var result = Object.keys(byProv).map(function(k) {
    var p = byProv[k];
    return { proveedor: p.proveedor, t1: Math.round(p.t1*10)/10, t2: Math.round(p.t2*10)/10, total: Math.round(p.total*10)/10 };
  });
  result.sort(function(a,b){ return b.total - a.total; });
  return { success: true, data: result };
}

// ── PATCH: MIGRACIÓN DE COLUMNAS ──────────────────────────────

function addColIfMissing(sheetName, colName) {
  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) { Logger.log('Hoja no encontrada: ' + sheetName); return; }
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    sheet.getRange(1, 1).setValue(colName);
    Logger.log('Columna agregada (hoja vacía): ' + sheetName + '.' + colName);
    return;
  }
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i]).trim() === colName) {
      Logger.log('Columna ya existe: ' + sheetName + '.' + colName);
      return;
    }
  }
  var nextCol = sheet.getLastColumn() + 1;
  sheet.getRange(1, nextCol).setValue(colName);
  Logger.log('Columna agregada: ' + sheetName + '.' + colName + ' en col ' + nextCol);
}

function migrarCodigosProveedores() {
  var sheet = getSheet('Proveedores');
  var data  = sheet.getDataRange().getValues();
  if (data.length <= 1) { Logger.log('Proveedores vacía, nada que migrar.'); return; }
  var existentes = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][6]) existentes.push(String(data[i][6]).toUpperCase());
  }
  var asignados = 0;
  for (var j = 1; j < data.length; j++) {
    if (!data[j][0]) continue;
    if (data[j][6]) continue;
    var codigo = _generarCodigoProveedor(String(data[j][1]||''), existentes);
    sheet.getRange(j+1, 7).setValue(codigo);
    existentes.push(codigo);
    asignados++;
    Logger.log('Codigo asignado: ' + data[j][1] + ' → ' + codigo);
  }
  Logger.log('Migración códigos proveedores: ' + asignados + ' asignados.');
}

function migrateSheets() {
  addColIfMissing('Proveedores', 'Aplica_IVA');
  addColIfMissing('Proveedores', 'Frecuencia_Pago');
  addColIfMissing('Proveedores', 'Dia_Corte_Semanal');
  addColIfMissing('Proveedores', 'Codigo');
  addColIfMissing('Usuarios',    'CredentialId');
  addColIfMissing('Usuarios',    'PublicKey');
  addColIfMissing('Usuarios',    'Permisos');
  addColIfMissing('Usuarios',    'Token_Expira');
  addColIfMissing('PLANILLAS',   'IVA_Aplicado');
  migrarCodigosProveedores();
  migrarPasswords();              // hashea contraseñas legacy en texto plano
  Logger.log('Migración completa.');
}
