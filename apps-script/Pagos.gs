// ============================================================
// Pagos.gs — Tarifas, Planillas, Comparativa proveedores
// ============================================================

// ── TARIFAS PROVEEDORES ───────────────────────────────────────
// Cols: 0=ID 1=Proveedor_ID 2=Proveedor_Nombre 3=Precio_Litro 4=Vigente_Desde 5=Activo

function getTarifaProveedor(body, user) {
  var proveedorId = String(body.proveedorId || body.proveedor_id || '');
  var sheet = getSheet('TARIFAS_PROVEEDORES');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[1]) === proveedorId && (row[5] === true || row[5] === 'true' || row[5] === 1)) {
      return { success: true, data: { id: String(row[0]), proveedorId: String(row[1]), proveedorNombre: String(row[2]), precioLitro: num(row[3]), vigentDesde: String(row[4]) } };
    }
  }
  return { success: true, data: null };
}

function getAllTarifas(user) {
  var sheet = getSheet('TARIFAS_PROVEEDORES');
  var data  = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    lista.push({ id: String(row[0]), proveedorId: String(row[1]), proveedorNombre: String(row[2]), precioLitro: num(row[3]), vigenteDesde: String(row[4]), activo: row[5] === true || row[5] === 'true' || row[5] === 1 });
  }
  return { success: true, data: lista };
}

function saveTarifa(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var proveedorId     = String(body.proveedorId || body.proveedor_id || '');
  var proveedorNombre = String(body.proveedorNombre || body.proveedor_nombre || '');
  var precioLitro     = num(body.precioLitro || body.precio_litro);
  // Always use today — no user-provided vigenteDesde
  var vigenteDesde    = getFechaHoy();

  if (!proveedorId || precioLitro <= 0) return { success: false, error: 'Datos inválidos' };

  var sheet = getSheet('TARIFAS_PROVEEDORES');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]) === proveedorId && (data[i][5] === true || data[i][5] === 'true' || data[i][5] === 1)) {
      sheet.getRange(i + 1, 6).setValue(false);
    }
  }

  var id = generateId();
  sheet.appendRow([id, proveedorId, proveedorNombre, precioLitro, vigenteDesde, true]);
  return { success: true, data: { id: id } };
}

// ── PLANILLAS ─────────────────────────────────────────────────
// Cols: 0=ID 1=Quincena_Inicio 2=Quincena_Fin 3=Proveedor_ID 4=Proveedor_Nombre
//       5=Total_Litros 6=Precio_Litro 7=Subtotal 8=IVA 9=Total_Con_IVA 10=Estado 11=Fecha_Generada 12=IVA_Aplicado

function calcularPeriodoProveedor(proveedorId) {
  var provSheet = getSheet('Proveedores');
  var provData  = provSheet.getDataRange().getValues();
  var frecuencia = 'quincenal';
  var diaCorte   = 1; // default Monday

  for (var i = 1; i < provData.length; i++) {
    if (String(provData[i][0]) === String(proveedorId)) {
      frecuencia = String(provData[i][4] || 'quincenal');
      diaCorte   = (provData[i][5] != null && provData[i][5] !== '') ? Number(provData[i][5]) : 1;
      break;
    }
  }

  if (frecuencia !== 'semanal') {
    return calcularQuincena(null); // existing function in Quincena.gs
  }

  // Weekly: cut day is FIRST day of period
  var hoy    = new Date();
  var hoyTZ  = new Date(hoy.toLocaleString('en-US', { timeZone: 'America/Guatemala' }));
  // getDay(): 0=Sun,1=Mon...6=Sat -> map Sun to 7
  var hoyDow = hoyTZ.getDay() === 0 ? 7 : hoyTZ.getDay();
  var daysFromCut = (hoyDow - diaCorte + 7) % 7;

  var inicio = new Date(hoyTZ);
  inicio.setDate(hoyTZ.getDate() - daysFromCut);
  var fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 6);

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function fmt(d) { return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
  function fmtDDMM(d) { return pad(d.getDate()) + '/' + pad(d.getMonth()+1); }

  return {
    tipo:   'Semana del ' + fmtDDMM(inicio) + ' al ' + fmtDDMM(fin),
    inicio: fmt(inicio),
    fin:    fmt(fin),
  };
}

function generarPlanilla(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var proveedorId     = String(body.proveedorId || body.proveedor_id || '');
  var proveedorNombre = String(body.proveedorNombre || body.proveedor_nombre || '');
  var qInicio         = String(body.quincenaInicio || body.inicio || '');
  var qFin            = String(body.quincenaFin    || body.fin    || '');

  if (!proveedorId || !qInicio || !qFin) return { success: false, error: 'Datos incompletos' };

  // Resolve aplicarIVA: explicit body param overrides proveedor default
  var aplicarIVA;
  if (body.aplicarIVA !== undefined) {
    aplicarIVA = body.aplicarIVA === true || body.aplicarIVA === 'true' || body.aplicarIVA === 1;
  } else {
    var provSheet = getSheet('Proveedores');
    var provData  = provSheet.getDataRange().getValues();
    aplicarIVA = true; // fallback if not found
    for (var p = 1; p < provData.length; p++) {
      if (String(provData[p][0]) === proveedorId) {
        aplicarIVA = provData[p][3] === true || provData[p][3] === 'true' || provData[p][3] === 1;
        break;
      }
    }
  }

  // Get active tariff
  var tarifaRes = getTarifaProveedor({ proveedorId: proveedorId }, user);
  if (!tarifaRes.data) return { success: false, error: 'No hay tarifa activa para este proveedor' };
  var precioLitro = num(tarifaRes.data.precioLitro);

  // Sum litros from Cargas by proveedor name and date range
  var cargasSheet = getSheet('Cargas');
  var cargasData  = cargasSheet.getDataRange().getValues();
  var totalLitros = 0;
  for (var i = 1; i < cargasData.length; i++) {
    var f    = dateToString(cargasData[i][1]);
    var prov = String(cargasData[i][3] || '');
    if (f >= qInicio && f <= qFin && prov === proveedorNombre) {
      totalLitros += num(cargasData[i][6]);
    }
  }
  totalLitros = Math.round(totalLitros * 10) / 10;

  var subtotal    = Math.round(totalLitros * precioLitro * 100) / 100;
  var iva         = aplicarIVA ? Math.round(subtotal * 0.12 * 100) / 100 : 0;
  var totalConIVA = Math.round((subtotal + iva) * 100) / 100;

  var id = generateId();
  getSheet('PLANILLAS').appendRow([
    id, qInicio, qFin, proveedorId, proveedorNombre,
    totalLitros, precioLitro, subtotal, iva, totalConIVA,
    'GENERADA', getFechaHoy(),
    aplicarIVA  // col 12 = IVA_Aplicado (0-indexed)
  ]);

  return { success: true, data: { id: id, proveedor: proveedorNombre, totalLitros: totalLitros, precioLitro: precioLitro, subtotal: subtotal, iva: iva, totalConIVA: totalConIVA, ivaAplicado: aplicarIVA } };
}

function generarTodasLasPlanillas(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var proveedores = getProveedores(user).data || [];
  var resultados  = [];
  for (var i = 0; i < proveedores.length; i++) {
    var prov = proveedores[i];
    if (!prov.activo) continue;
    // Skip weekly providers — generated individually with free date range
    if (prov.frecuenciaPago === 'semanal') continue;
    var res = generarPlanilla({
      proveedorId:     prov.id,
      proveedorNombre: prov.nombre,
      quincenaInicio:  body.quincenaInicio || body.inicio || '',
      quincenaFin:     body.quincenaFin    || body.fin    || '',
      // aplicarIVA not passed -> read from proveedor row
    }, user);
    resultados.push({ proveedor: prov.nombre, resultado: res });
  }
  return { success: true, data: resultados };
}

function getPlanillasQuincena(body, user) {
  var qInicio = String(body.quincenaInicio || body.inicio || '');
  var qFin    = String(body.quincenaFin    || body.fin    || '');
  var sheet   = getSheet('PLANILLAS');
  var data    = sheet.getDataRange().getValues();
  var lista   = [];
  var totalConIVA = 0;
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0]) continue;
    if (qInicio && String(row[1]) !== qInicio) continue;
    if (qFin    && String(row[2]) !== qFin)    continue;
    var planilla = _planillaObj(row);
    lista.push(planilla);
    totalConIVA += num(row[9]);
  }
  return { success: true, data: { planillas: lista, totalConIVA: Math.round(totalConIVA * 100) / 100 } };
}

function getPlanillasPorProveedor(body, user) {
  var proveedorId = String(body.proveedorId || body.proveedor_id || '');
  var sheet = getSheet('PLANILLAS');
  var data  = sheet.getDataRange().getValues();
  var lista = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][3]) === proveedorId) lista.push(_planillaObj(data[i]));
  }
  lista.sort(function(a, b) { return b.quincenaInicio > a.quincenaInicio ? 1 : -1; });
  return { success: true, data: lista };
}

function _planillaObj(row) {
  return {
    id:              String(row[0]),
    quincenaInicio:  String(row[1]),
    quincenaFin:     String(row[2]),
    proveedorId:     String(row[3]),
    proveedorNombre: String(row[4]),
    totalLitros:     num(row[5]),
    precioLitro:     num(row[6]),
    subtotal:        num(row[7]),
    iva:             num(row[8]),
    totalConIVA:     num(row[9]),
    estado:          String(row[10] || 'GENERADA'),
    fechaGenerada:   String(row[11] || ''),
    ivaAplicado:     row[12] === true || row[12] === 'true' || row[12] === 1,
  };
}

// ── COMPARATIVA PROVEEDORES ───────────────────────────────────

function getComparativaProveedores(body, user) {
  var inicio = String(body.fechaInicio || body.inicio || '');
  var fin    = String(body.fechaFin    || body.fin    || '');
  if (!inicio || !fin) return { success: false, error: 'Rango de fechas requerido' };

  var sheet  = getSheet('Cargas');
  var data   = sheet.getDataRange().getValues();
  var byProv = {};

  for (var i = 1; i < data.length; i++) {
    var f    = dateToString(data[i][1]);
    var prov = String(data[i][3] || 'Sin proveedor');
    if (prov === 'Remanente día anterior') continue;
    if (f >= inicio && f <= fin) {
      if (!byProv[prov]) byProv[prov] = { nombre: prov, litros: 0, entregas: 0, dias: {} };
      byProv[prov].litros   += num(data[i][6]);
      byProv[prov].entregas++;
      byProv[prov].dias[f] = true;
    }
  }

  // Calculate total for participation %
  var totalLitros = 0;
  Object.keys(byProv).forEach(function(k) { totalLitros += byProv[k].litros; });

  var resultado = Object.keys(byProv).map(function(k) {
    var p         = byProv[k];
    var diasActivos = Object.keys(p.dias).length;
    // Days in range
    var d1 = new Date(inicio + 'T12:00:00');
    var d2 = new Date(fin + 'T12:00:00');
    var diasRango = Math.max(1, Math.round((d2 - d1) / (1000*60*60*24)) + 1);
    return {
      nombre:          p.nombre,
      totalLitros:     Math.round(p.litros * 10) / 10,
      totalEntregas:   p.entregas,
      diasActivos:     diasActivos,
      promLitrosDia:   Math.round((p.litros / diasRango) * 10) / 10,
      participacionPct: totalLitros > 0 ? Math.round((p.litros / totalLitros) * 1000) / 10 : 0,
    };
  });
  resultado.sort(function(a, b) { return b.totalLitros - a.totalLitros; });
  return { success: true, data: resultado };
}

function marcarPlanillaPagada(body, user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };
  var id = String(body.id || '');
  if (!id) return { success: false, error: 'ID requerido' };

  var sheet = getSheet('PLANILLAS');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sheet.getRange(i + 1, 11).setValue('PAGADA'); // Estado = col index 10 (0-based), sheet col 11 (1-based)
      return { success: true };
    }
  }
  return { success: false, error: 'Planilla no encontrada' };
}
