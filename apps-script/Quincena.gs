// ============================================================
// Quincena.gs — Dashboard, quincenas y comparativa
// ============================================================

function getDashboardHoy(user) {
  var fecha  = getFechaHoy();
  var cargas = getCargas({ fecha: fecha }, user).data || [];
  var med    = getMedicion({ fecha: fecha }, user).data;

  var totalT1 = 0, totalT2 = 0;
  cargas.forEach(function(c) {
    totalT1 += num(c.litrosT1 || c.litros_t1);
    totalT2 += num(c.litrosT2 || c.litros_t2);
  });

  return {
    success: true,
    data: {
      totalT1:  Math.round(totalT1 * 100) / 100,
      totalT2:  Math.round(totalT2 * 100) / 100,
      total:    Math.round((totalT1 + totalT2) * 100) / 100,
      medicion: med ? {
        litrosRealT1:    num(med.litrosRealT1 || med.litros_real_t1),
        litrosRealT2:    num(med.litrosRealT2 || med.litros_real_t2),
        totalReal:       num(med.totalReal    || med.total_real),
        diferenciaLitros:num(med.diferenciaLitros || med.diferencia_litros),
        diferenciaPct:   num(med.diferenciaPct    || med.diferencia_pct),
      } : null,
      cargas: cargas,
    }
  };
}

function getQuincena(user) {
  return buildQuincena(0, user);
}

function getQuincenaAnterior(user) {
  return buildQuincena(-1, user);
}

function buildQuincena(offset, user) {
  var q;
  if (offset === -1) {
    q = calcularQuincenaAnterior(null);
  } else {
    q = calcularQuincena(null);
  }

  var inicioStr = q.inicio;
  var finStr    = q.fin;

  var monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var d = new Date(inicioStr + 'T12:00:00');
  var nombre = 'Quincena ' + q.tipo + ' — ' + monthNames[d.getMonth()] + ' ' + d.getFullYear();

  var cargasSheet = getSheet('Cargas');
  var cargasData  = cargasSheet.getDataRange().getValues();
  var medSheet    = getSheet('Mediciones');
  var medData     = medSheet.getDataRange().getValues();

  var cargasByDate = {};
  for (var i = 1; i < cargasData.length; i++) {
    var f = dateToString(cargasData[i][1]);
    if (f >= inicioStr && f <= finStr) {
      if (!cargasByDate[f]) cargasByDate[f] = { t1: 0, t2: 0 };
      cargasByDate[f].t1 += num(cargasData[i][4]);
      cargasByDate[f].t2 += num(cargasData[i][5]);
    }
  }

  var medByDate = {};
  for (var j = 1; j < medData.length; j++) {
    var mf = dateToString(medData[j][1]);
    if (mf >= inicioStr && mf <= finStr) {
      medByDate[mf] = {
        t1:    num(medData[j][2]),
        t2:    num(medData[j][3]),
        total: num(medData[j][4]),
        dif:   num(medData[j][5]),
        pct:   num(medData[j][6]),
      };
    }
  }

  var datos = [];
  var cur   = new Date(inicioStr + 'T12:00:00');
  var finD  = new Date(finStr    + 'T12:00:00');

  while (cur <= finD) {
    var ds    = dateToString(cur);
    var carga = cargasByDate[ds] || { t1: 0, t2: 0 };
    var med   = medByDate[ds]   || { t1: 0, t2: 0, total: 0, dif: 0, pct: 0 };
    var cargaTotal = carga.t1 + carga.t2;

    var prevDate = new Date(cur.getTime());
    prevDate.setDate(prevDate.getDate() - 1);
    var prevCarga = cargasByDate[dateToString(prevDate)] || { t1: 0, t2: 0 };
    var pipa = prevCarga.t1 + prevCarga.t2;

    datos.push({
      fecha:       ds,
      cargaT1:     Math.round(carga.t1 * 10) / 10,
      cargaT2:     Math.round(carga.t2 * 10) / 10,
      totalCarga:  Math.round(cargaTotal * 10) / 10,
      realT1:      Math.round(med.t1 * 10) / 10,
      realT2:      Math.round(med.t2 * 10) / 10,
      totalReal:   Math.round(med.total * 10) / 10,
      difLitros:   Math.round(med.dif * 10) / 10,
      difPct:      Math.round(med.pct * 100) / 100,
      pipa:        Math.round(pipa * 10) / 10,
    });

    cur.setDate(cur.getDate() + 1);
  }

  var totalRec = datos.reduce(function(s, d) { return s + d.totalCarga; }, 0);
  var totalEnv = datos.reduce(function(s, d) { return s + d.totalReal;  }, 0);

  return {
    success: true,
    data: {
      nombre:             nombre,
      inicio:             inicioStr,
      fin:                finStr,
      totalRecepcionado:  Math.round(totalRec * 10) / 10,
      totalEnviado:       Math.round(totalEnv * 10) / 10,
      datos:              datos,
    }
  };
}

function getComparativa(user) {
  var hoy   = new Date();
  var datos = [];

  for (var i = 29; i >= 0; i--) {
    var d  = new Date(hoy.getTime());
    d.setDate(d.getDate() - i);
    var ds = dateToString(d);

    var cargaTotal = _getCargaTotalDia(ds);
    var med        = getMedicion({ fecha: ds }, user).data;
    var realTotal  = med ? num(med.totalReal || med.total_real) : 0;
    var dif        = realTotal - cargaTotal;
    var difPct     = cargaTotal > 0 ? ((dif / cargaTotal) * 100) : 0;

    if (cargaTotal > 0 || realTotal > 0) {
      var abs = Math.abs(difPct);
      datos.push({
        fecha:         ds,
        cargaTotal:    Math.round(cargaTotal * 10) / 10,
        realTotal:     Math.round(realTotal * 10) / 10,
        diferencia:    Math.round(dif * 10) / 10,
        diferenciaPct: Math.round(difPct * 100) / 100,
        estado:        abs <= 1 ? 'OK' : abs <= 2 ? 'Alerta' : 'Revisar',
      });
    }
  }

  return { success: true, data: datos };
}

function _getCargaTotalDia(fecha) {
  var sheet = getSheet('Cargas');
  var data  = sheet.getDataRange().getValues();
  var total = 0;
  for (var i = 1; i < data.length; i++) {
    if (dateToString(data[i][1]) === fecha) total += num(data[i][6]);
  }
  return total;
}

function exportarDatos(body, user) {
  var inicio = String(body.fechaInicio || body.inicio || '');
  var fin    = String(body.fechaFin    || body.fin    || '');
  if (!inicio || !fin) return { success: false, error: 'Rango de fechas requerido' };

  var cargasSheet = getSheet('Cargas');
  var cargasData  = cargasSheet.getDataRange().getValues();
  var medSheet    = getSheet('Mediciones');
  var medData     = medSheet.getDataRange().getValues();

  var cargasByDate = {};
  for (var i = 1; i < cargasData.length; i++) {
    var f = dateToString(cargasData[i][1]);
    if (f >= inicio && f <= fin) {
      if (!cargasByDate[f]) cargasByDate[f] = { t1: 0, t2: 0 };
      cargasByDate[f].t1 += num(cargasData[i][4]);
      cargasByDate[f].t2 += num(cargasData[i][5]);
    }
  }

  var medByDate = {};
  for (var j = 1; j < medData.length; j++) {
    var mf = dateToString(medData[j][1]);
    if (mf >= inicio && mf <= fin) {
      medByDate[mf] = {
        t1:    num(medData[j][2]),
        t2:    num(medData[j][3]),
        total: num(medData[j][4]),
        dif:   num(medData[j][5]),
        pct:   num(medData[j][6]),
      };
    }
  }

  var rows = [];
  var cur  = new Date(inicio + 'T12:00:00');
  var finD = new Date(fin    + 'T12:00:00');

  while (cur <= finD) {
    var ds    = dateToString(cur);
    var carga = cargasByDate[ds] || { t1: 0, t2: 0 };
    var med   = medByDate[ds]   || { t1: 0, t2: 0, total: 0, dif: 0, pct: 0 };

    var prev  = new Date(cur.getTime());
    prev.setDate(prev.getDate() - 1);
    var prevCarga = cargasByDate[dateToString(prev)] || { t1: 0, t2: 0 };

    rows.push({
      fecha:      ds,
      cargaT1:   carga.t1,
      cargaT2:   carga.t2,
      totalCarga: carga.t1 + carga.t2,
      realT1:    med.t1,
      realT2:    med.t2,
      totalReal: med.total,
      difLitros: med.dif,
      difPct:    med.pct,
      pipa:      prevCarga.t1 + prevCarga.t2,
    });

    cur.setDate(cur.getDate() + 1);
  }

  return { success: true, data: rows };
}

function getCargasPorProveedor(body, user) {
  var proveedorNombre = String(body.proveedorNombre || body.proveedor_nombre || '');
  var inicio          = String(body.fechaInicio     || body.inicio           || '');
  var fin             = String(body.fechaFin        || body.fin              || '');
  if (!proveedorNombre) return { success: false, error: 'proveedorNombre requerido' };

  var sheet = getSheet('Cargas');
  var data  = sheet.getDataRange().getValues();
  var lista = [];

  for (var i = 1; i < data.length; i++) {
    var row  = data[i];
    var f    = dateToString(row[1]);
    var prov = String(row[3]||'');
    if (prov !== proveedorNombre) continue;
    if (inicio && f < inicio) continue;
    if (fin    && f > fin)    continue;
    lista.push({
      id:       String(row[0]),
      fecha:    f,
      hora:     String(row[2]||''),
      proveedor:prov,
      litrosT1: num(row[4]),
      litrosT2: num(row[5]),
      total:    num(row[6]),
      notas:    String(row[7]||''),
    });
  }

  return { success: true, data: lista };
}
