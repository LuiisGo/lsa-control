// ============================================================
// Quincena.gs — Dashboard, quincenas y comparativa
// ============================================================

function getDashboardHoy(user) {
  var fecha  = getToday();
  var cargas = getCargas({ fecha: fecha }, user).data || [];
  var med    = getMedicion({ fecha: fecha }, user).data;

  var totalT1 = 0;
  var totalT2 = 0;
  cargas.forEach(function(c) {
    totalT1 += num(c.litros_t1);
    totalT2 += num(c.litros_t2);
  });

  return {
    success: true,
    data: {
      totalT1: Math.round(totalT1 * 100) / 100,
      totalT2: Math.round(totalT2 * 100) / 100,
      total:   Math.round((totalT1 + totalT2) * 100) / 100,
      medicion: med ? {
        litros_real_t1:   num(med.litros_real_t1),
        litros_real_t2:   num(med.litros_real_t2),
        total_real:       num(med.total_real),
        diferencia_litros: num(med.diferencia_litros),
        diferencia_pct:   num(med.diferencia_pct),
      } : null,
      cargas: cargas,
    }
  };
}

function getQuincena(user) {
  return buildQuincena(0);
}

function getQuincenaAnterior(user) {
  return buildQuincena(-1);
}

function buildQuincena(offset) {
  var now   = new Date();
  var year  = now.getFullYear();
  var month = now.getMonth();
  var day   = now.getDate();

  // Current quincena: A = 1-15, B = 16-end
  var isA   = day <= 15;

  // Apply offset (-1 = previous quincena)
  var qMonth = month;
  var qYear  = year;
  var qIsA   = isA;

  if (offset === -1) {
    if (isA) {
      // Current is A → previous is B of previous month
      qIsA = false;
      qMonth = month - 1;
      if (qMonth < 0) { qMonth = 11; qYear = year - 1; }
    } else {
      // Current is B → previous is A of same month
      qIsA = true;
    }
  }

  var inicio, fin;
  if (qIsA) {
    inicio = new Date(qYear, qMonth, 1);
    fin    = new Date(qYear, qMonth, 15);
  } else {
    inicio = new Date(qYear, qMonth, 16);
    fin    = new Date(qYear, qMonth + 1, 0); // last day of month
  }

  var inicioStr = dateToString(inicio);
  var finStr    = dateToString(fin);

  var monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var nombre = 'Quincena ' + (qIsA ? 'A' : 'B') + ' — ' + monthNames[qMonth] + ' ' + qYear;

  // Build data rows per day
  var cargasSheet = getSheet('Cargas');
  var cargasData  = cargasSheet.getDataRange().getValues();
  var medSheet    = getSheet('Mediciones');
  var medData     = medSheet.getDataRange().getValues();

  // Index cargas by date
  var cargasByDate = {};
  for (var i = 1; i < cargasData.length; i++) {
    var f = dateToString(cargasData[i][1]);
    if (f >= inicioStr && f <= finStr) {
      if (!cargasByDate[f]) cargasByDate[f] = { t1: 0, t2: 0 };
      cargasByDate[f].t1 += num(cargasData[i][4]);
      cargasByDate[f].t2 += num(cargasData[i][5]);
    }
  }

  // Index mediciones by date
  var medByDate = {};
  for (var j = 1; j < medData.length; j++) {
    var mf = dateToString(medData[j][1]);
    if (mf >= inicioStr && mf <= finStr) {
      medByDate[mf] = {
        t1:  num(medData[j][2]),
        t2:  num(medData[j][3]),
        total: num(medData[j][4]),
        dif:  num(medData[j][5]),
        pct:  num(medData[j][6]),
      };
    }
  }

  // Build all days in range
  var datos = [];
  var cur   = new Date(inicio.getTime());
  while (cur <= fin) {
    var ds = dateToString(cur);
    var carga = cargasByDate[ds] || { t1: 0, t2: 0 };
    var med   = medByDate[ds]   || { t1: 0, t2: 0, total: 0, dif: 0, pct: 0 };
    var cargaTotal = carga.t1 + carga.t2;

    // Compute pipa as previous day's carga total (or 0 if first day)
    var prevDate = new Date(cur.getTime());
    prevDate.setDate(prevDate.getDate() - 1);
    var prevDs   = dateToString(prevDate);
    var prevCarga = cargasByDate[prevDs] || { t1: 0, t2: 0 };
    var pipa = prevCarga.t1 + prevCarga.t2;

    datos.push({
      fecha:       ds,
      carga_t1:   Math.round(carga.t1 * 10) / 10,
      carga_t2:   Math.round(carga.t2 * 10) / 10,
      total_carga: Math.round(cargaTotal * 10) / 10,
      real_t1:    Math.round(med.t1 * 10) / 10,
      real_t2:    Math.round(med.t2 * 10) / 10,
      total_real: Math.round(med.total * 10) / 10,
      dif_litros: Math.round(med.dif * 10) / 10,
      dif_pct:    Math.round(med.pct * 100) / 100,
      pipa:       Math.round(pipa * 10) / 10,
    });

    cur.setDate(cur.getDate() + 1);
  }

  // Totals
  var totalRec = datos.reduce(function(s, d) { return s + d.total_carga; }, 0);
  var totalEnv = datos.reduce(function(s, d) { return s + d.total_real; }, 0);

  return {
    success: true,
    data: {
      nombre:             nombre,
      inicio:             inicioStr,
      fin:                finStr,
      total_recepcionado: Math.round(totalRec * 10) / 10,
      total_enviado:      Math.round(totalEnv * 10) / 10,
      datos:              datos,
    }
  };
}

function getComparativa(user) {
  // Returns last 30 days with carga vs medicion
  var today = new Date();
  var datos = [];

  for (var i = 29; i >= 0; i--) {
    var d = new Date(today.getTime());
    d.setDate(d.getDate() - i);
    var ds = dateToString(d);

    var cargaTotal = getCargasTotales(ds);
    var med = getMedicion({ fecha: ds }, user).data;
    var realTotal = med ? num(med.total_real) : 0;
    var dif       = realTotal - cargaTotal;
    var difPct    = cargaTotal > 0 ? ((dif / cargaTotal) * 100) : 0;

    if (cargaTotal > 0 || realTotal > 0) {
      var abs = Math.abs(difPct);
      datos.push({
        fecha:        ds,
        carga_total:  Math.round(cargaTotal * 10) / 10,
        real_total:   Math.round(realTotal * 10) / 10,
        diferencia:   Math.round(dif * 10) / 10,
        diferencia_pct: Math.round(difPct * 100) / 100,
        estado:       abs <= 1 ? 'OK' : abs <= 2 ? 'Alerta' : 'Revisar',
      });
    }
  }

  return { success: true, data: datos };
}

function exportarDatos(body, user) {
  var inicio = String(body.fechaInicio || '');
  var fin    = String(body.fechaFin    || '');
  if (!inicio || !fin) return { success: false, error: 'Rango de fechas requerido' };

  var cargasSheet = getSheet('Cargas');
  var cargasData  = cargasSheet.getDataRange().getValues();
  var medSheet    = getSheet('Mediciones');
  var medData     = medSheet.getDataRange().getValues();

  // Index cargas
  var cargasByDate = {};
  for (var i = 1; i < cargasData.length; i++) {
    var f = dateToString(cargasData[i][1]);
    if (f >= inicio && f <= fin) {
      if (!cargasByDate[f]) cargasByDate[f] = { t1: 0, t2: 0 };
      cargasByDate[f].t1 += num(cargasData[i][4]);
      cargasByDate[f].t2 += num(cargasData[i][5]);
    }
  }

  // Index mediciones
  var medByDate = {};
  for (var j = 1; j < medData.length; j++) {
    var mf = dateToString(medData[j][1]);
    if (mf >= inicio && mf <= fin) {
      medByDate[mf] = {
        t1:   num(medData[j][2]),
        t2:   num(medData[j][3]),
        total: num(medData[j][4]),
        dif:  num(medData[j][5]),
        pct:  num(medData[j][6]),
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

    // Pipa = prev day total
    var prev = new Date(cur.getTime());
    prev.setDate(prev.getDate() - 1);
    var prevCarga = cargasByDate[dateToString(prev)] || { t1: 0, t2: 0 };

    rows.push({
      fecha:       ds,
      carga_t1:   carga.t1,
      carga_t2:   carga.t2,
      total_carga: carga.t1 + carga.t2,
      real_t1:    med.t1,
      real_t2:    med.t2,
      total_real: med.total,
      dif_litros: med.dif,
      dif_pct:    med.pct,
      pipa:       prevCarga.t1 + prevCarga.t2,
    });

    cur.setDate(cur.getDate() + 1);
  }

  return { success: true, data: rows };
}
