// ============================================================
// Gastos.gs — Categorías de gastos y gastos operativos
// ============================================================

// ── CATEGORÍAS ────────────────────────────────────────────────
// Cols: 0=ID 1=Nombre 2=Activo

function getCategorias(user) {
  var sheet = getSheet('CATEGORIAS_GASTOS');
  var data  = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    lista.push({
      id:     String(row[0]),
      nombre: String(row[1]||''),
      activo: row[2] !== false && row[2] !== 'false' && row[2] !== 0,
    });
  }
  return { success: true, data: lista };
}

function saveCategoria(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var nombre = String(body.nombre||'').trim();
  if (!nombre) return { success: false, error: 'Nombre requerido' };
  var id = generateId();
  getSheet('CATEGORIAS_GASTOS').appendRow([id, nombre, true]);
  return { success: true, data: { id: id } };
}

function toggleCategoria(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var sheet = getSheet('CATEGORIAS_GASTOS');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      var cur = data[i][2];
      sheet.getRange(i+1, 3).setValue(!(cur !== false && cur !== 'false' && cur !== 0));
      return { success: true };
    }
  }
  return { success: false, error: 'Categoría no encontrada' };
}

// ── GASTOS ────────────────────────────────────────────────────
// Cols: 0=ID 1=Fecha 2=Categoria_ID 3=Categoria_Nombre 4=Descripcion
//       5=Monto 6=IVA_Incluido 7=Usuario_ID 8=Usuario_Nombre 9=Comprobante_URL

function saveGasto(body, user) {
  var monto = num(body.monto || body.Monto);
  if (monto <= 0) return { success: false, error: 'Monto debe ser > 0' };

  var categoriaId     = String(body.categoriaId     || body.categoria_id     || '');
  var categoriaNombre = String(body.categoriaNombre || body.categoria_nombre || '');
  var descripcion     = String(body.descripcion     || '');
  var ivaIncluido     = body.ivaIncluido === true || body.ivaIncluido === 'true' || body.iva_incluido === true;
  var comprobanteUrl  = String(body.comprobanteUrl  || body.comprobante_url  || '');

  var id = generateId();
  getSheet('GASTOS').appendRow([
    id, getFechaHoy(), categoriaId, categoriaNombre,
    descripcion, monto, ivaIncluido,
    user.id, user.nombre, comprobanteUrl,
  ]);
  return { success: true, data: { id: id } };
}

function getGastosPorFecha(body, user) {
  var fecha = String(body.fecha || getFechaHoy());
  var sheet = getSheet('GASTOS');
  var data  = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    if (dateToString(data[i][1]) === fecha) lista.push(_gastoObj(data[i]));
  }
  return { success: true, data: lista };
}

function getGastosPorRango(body, user) {
  var inicio = String(body.fechaInicio || body.inicio || '');
  var fin    = String(body.fechaFin    || body.fin    || '');
  if (!inicio || !fin) return { success: false, error: 'Rango requerido' };

  var sheet = getSheet('GASTOS');
  var data  = sheet.getDataRange().getValues();
  var lista = [];
  var total = 0;
  var byCategoria = {};

  for (var i = 1; i < data.length; i++) {
    var f = dateToString(data[i][1]);
    if (f >= inicio && f <= fin) {
      var g = _gastoObj(data[i]);
      lista.push(g);
      total += g.monto;
      var cat = g.categoriaNombre || g.categoriaId || 'Sin categoría';
      if (!byCategoria[cat]) byCategoria[cat] = 0;
      byCategoria[cat] += g.monto;
    }
  }

  var desglose = Object.keys(byCategoria).map(function(k) {
    return { categoria: k, total: Math.round(byCategoria[k] * 100) / 100 };
  }).sort(function(a, b) { return b.total - a.total; });

  return {
    success: true,
    data: {
      gastos:   lista,
      total:    Math.round(total * 100) / 100,
      desglose: desglose,
    }
  };
}

function editarGasto(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var sheet = getSheet('GASTOS');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      if (body.descripcion !== undefined) sheet.getRange(i+1, 5).setValue(String(body.descripcion));
      if (body.monto       !== undefined) sheet.getRange(i+1, 6).setValue(num(body.monto));
      if (body.ivaIncluido !== undefined) sheet.getRange(i+1, 7).setValue(!!body.ivaIncluido);
      return { success: true };
    }
  }
  return { success: false, error: 'Gasto no encontrado' };
}

function deleteGasto(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var sheet = getSheet('GASTOS');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(body.id)) {
      var anterior = _gastoObj(data[i]);
      registrarLog(user, 'DELETE_GASTO', 'GASTOS', body.id, JSON.stringify(anterior), '');
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Gasto no encontrado' };
}

function _gastoObj(row) {
  return {
    id:              String(row[0]),
    fecha:           dateToString(row[1]),
    categoriaId:     String(row[2]||''),
    categoriaNombre: String(row[3]||''),
    descripcion:     String(row[4]||''),
    monto:           num(row[5]),
    ivaIncluido:     row[6] === true || row[6] === 'true' || row[6] === 1,
    usuarioId:       String(row[7]||''),
    usuarioNombre:   String(row[8]||''),
    comprobanteUrl:  String(row[9]||''),
  };
}
