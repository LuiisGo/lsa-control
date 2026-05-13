// Limpieza controlada de la importacion de abril 2026.
// Fusiona proveedores duplicados creados desde Excel con los proveedores oficiales.

var CLEANUP_ABRIL_2026_ORIGEN = 'Limpieza proveedores abril 2026';
var CLEANUP_ABRIL_2026_SHEET = 'CLEANUP_ABRIL_2026_PROVEEDORES';

var CLEANUP_ABRIL_2026_PROVIDER_MAP = [
  { oldId: 'IMP-ABR2026-PROV-2',  oldName: 'Marisela Lanuza',    newId: 'af2e2792-2e29-489d-8f52-d2a900a3a52f', newName: 'Marisela' },
  { oldId: 'IMP-ABR2026-PROV-3',  oldName: 'Nohemy Lanuza',      newId: '3908eb9d-858f-4880-9c72-0bdf3115431a', newName: 'Nohemy' },
  { oldId: 'IMP-ABR2026-PROV-4',  oldName: 'Jorge Velasquez',    newId: '2a464a6f-9790-4c6e-b489-dac1341437dc', newName: 'Jorge Velaquez' },
  { oldId: 'IMP-ABR2026-PROV-5',  oldName: 'Rudy Morales',       newId: '93010960-44d0-45f4-8ee0-1b254f55afe0', newName: 'Rudy' },
  { oldId: 'IMP-ABR2026-PROV-6',  oldName: 'Miguel T ruta #1',   newId: '586f1a69-9bb8-427e-9286-808e21d976f1', newName: 'Miguel 1' },
  { oldId: 'IMP-ABR2026-PROV-7',  oldName: 'Miguel T ruta #2',   newId: 'b85b5c4f-05db-4e65-a726-190fe03d249f', newName: 'Miguel 2' },
  { oldId: 'IMP-ABR2026-PROV-8',  oldName: 'Alvaro Telón',       newId: 'cbc7e81c-307d-42ce-b550-a6d222f7128b', newName: 'Alvaro' },
  { oldId: 'IMP-ABR2026-PROV-10', oldName: 'Filiberto Melgar',   newId: 'd4372527-f593-4301-b0be-2854f2c38df6', newName: 'Filiberto' },
  { oldId: 'IMP-ABR2026-PROV-11', oldName: 'Carlos Salazar',     newId: '39476665-512b-4a2e-910f-61db711a1e54', newName: 'Carlos' },
  { oldId: 'IMP-ABR2026-PROV-12', oldName: 'Gustavo Moreno',     newId: '05ade95e-5394-4665-9e5f-ba55e806e04c', newName: 'Gustavo' }
];

var CLEANUP_ABRIL_2026_EXTRA_CARGAS = [
  '691ada2d-f8da-4538-aa9a-5a4274f4e679',
  '14321f37-a60d-4043-8bc7-948a778b2823'
];

function limpiarDuplicadosProveedoresAbril2026(user) {
  if (user.role !== 'admin') return { success: false, error: 'Sin permisos' };

  var resumen = {
    cargasActualizadas: 0,
    planillasActualizadas: 0,
    tarifasActualizadas: 0,
    accesosActualizados: 0,
    accesosDesactivados: 0,
    proveedoresDesactivados: 0,
    cargasExtraRemovidas: 0
  };

  for (var i = 0; i < CLEANUP_ABRIL_2026_PROVIDER_MAP.length; i++) {
    var item = CLEANUP_ABRIL_2026_PROVIDER_MAP[i];
    resumen.cargasActualizadas += cleanupReplaceProviderInCargas_(item);
    resumen.planillasActualizadas += cleanupReplaceProviderByIdName_('PLANILLAS', item, 4, 5, 'IMP-ABR2026-PLANILLA-');
    resumen.tarifasActualizadas += cleanupReplaceProviderByIdName_('TARIFAS_PROVEEDORES', item, 2, 3, 'IMP-ABR2026-TAR-');
    var accessResult = cleanupReplaceProveedorAccess_(item);
    resumen.accesosActualizados += accessResult.updated;
    resumen.accesosDesactivados += accessResult.disabled;
    resumen.proveedoresDesactivados += cleanupDeactivateProvider_(item);
  }

  resumen.cargasExtraRemovidas = cleanupRemoveExtraCargasAbril_();
  var validacion = validarLimpiezaAbril2026_();
  cleanupLog_('RESUMEN', 'TODAS', 'limpiarDuplicadosProveedoresAbril2026', resumen, validacion);

  return {
    success: validacion.ok,
    data: {
      resumen: resumen,
      validacion: validacion
    },
    error: validacion.ok ? '' : 'La limpieza corrio, pero una validacion no cuadroe. Revisar hoja de limpieza.'
  };
}

function cleanupReplaceProviderInCargas_(item) {
  var sheet = getSheet('Cargas');
  var data = sheet.getDataRange().getValues();
  var count = 0;

  for (var i = 1; i < data.length; i++) {
    var id = String(data[i][0] || '');
    var fecha = dateToString(data[i][1]);
    var nombre = String(data[i][3] || '');
    var proveedorId = String(data[i][8] || '');
    var isImportAbril = id.indexOf('IMP-ABR2026-CARGA-') === 0 && fecha >= '2026-04-16' && fecha <= '2026-04-30';
    if (!isImportAbril) continue;
    if (proveedorId !== item.oldId && nombre !== item.oldName) continue;

    var before = { id: id, proveedorId: proveedorId, proveedor: nombre };
    sheet.getRange(i + 1, 4).setValue(item.newName);
    sheet.getRange(i + 1, 9).setValue(item.newId);
    cleanupLog_('UPDATE_PROVIDER', 'Cargas', id, before, { proveedorId: item.newId, proveedor: item.newName });
    count++;
  }

  return count;
}

function cleanupReplaceProviderByIdName_(sheetName, item, idCol, nameCol, idPrefix) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  var count = 0;

  for (var i = 1; i < data.length; i++) {
    var rowId = String(data[i][0] || '');
    if (idPrefix && rowId.indexOf(idPrefix) !== 0) continue;
    var proveedorId = String(data[i][idCol - 1] || '');
    var proveedor = String(data[i][nameCol - 1] || '');
    if (proveedorId !== item.oldId && proveedor !== item.oldName) continue;

    var before = { id: rowId, proveedorId: proveedorId, proveedor: proveedor };
    sheet.getRange(i + 1, idCol).setValue(item.newId);
    sheet.getRange(i + 1, nameCol).setValue(item.newName);
    cleanupLog_('UPDATE_PROVIDER', sheetName, rowId, before, { proveedorId: item.newId, proveedor: item.newName });
    count++;
  }

  return count;
}

function cleanupReplaceProveedorAccess_(item) {
  var sheet = getSheet('ACCESOS_PROVEEDORES');
  var data = sheet.getDataRange().getValues();
  var targetHasAccess = false;
  var result = { updated: 0, disabled: 0 };

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1] || '') === item.newId && cleanupIsTrue_(data[i][5])) {
      targetHasAccess = true;
      break;
    }
  }

  for (var r = 1; r < data.length; r++) {
    if (String(data[r][1] || '') !== item.oldId) continue;
    var rowId = String(data[r][0] || '');
    var before = { id: rowId, proveedorId: data[r][1], proveedor: data[r][2], activo: data[r][5] };
    if (targetHasAccess) {
      sheet.getRange(r + 1, 6).setValue(false);
      cleanupLog_('DISABLE_ACCESS', 'ACCESOS_PROVEEDORES', rowId, before, { activo: false, motivo: 'Proveedor fusionado' });
      result.disabled++;
    } else {
      sheet.getRange(r + 1, 2).setValue(item.newId);
      sheet.getRange(r + 1, 3).setValue(item.newName);
      cleanupLog_('UPDATE_PROVIDER', 'ACCESOS_PROVEEDORES', rowId, before, { proveedorId: item.newId, proveedor: item.newName });
      targetHasAccess = true;
      result.updated++;
    }
  }

  return result;
}

function cleanupDeactivateProvider_(item) {
  var sheet = getSheet('Proveedores');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || '') !== item.oldId) continue;
    if (!cleanupIsTrue_(data[i][2])) return 0;

    var before = {
      id: data[i][0],
      nombre: data[i][1],
      activo: data[i][2],
      codigo: data[i][6]
    };
    sheet.getRange(i + 1, 3).setValue(false);
    cleanupLog_('DEACTIVATE_DUPLICATE', 'Proveedores', item.oldId, before, { activo: false, fusionadoCon: item.newId });
    return 1;
  }

  return 0;
}

function cleanupRemoveExtraCargasAbril_() {
  var sheet = getSheet('Cargas');
  var data = sheet.getDataRange().getValues();
  var ids = {};
  var count = 0;

  for (var i = 0; i < CLEANUP_ABRIL_2026_EXTRA_CARGAS.length; i++) {
    ids[CLEANUP_ABRIL_2026_EXTRA_CARGAS[i]] = true;
  }

  for (var r = data.length - 1; r >= 1; r--) {
    var id = String(data[r][0] || '');
    if (!ids[id]) continue;
    var row = data[r];
    var before = {
      id: row[0],
      fecha: dateToString(row[1]),
      hora: row[2],
      proveedor: row[3],
      litrosT1: row[4],
      litrosT2: row[5],
      total: row[6],
      proveedorId: row[8]
    };
    cleanupLog_('REMOVE_EXTRA_CARGA', 'Cargas', id, before, { motivo: 'Carga manual extra fuera del Excel importado' });
    sheet.deleteRow(r + 1);
    count++;
  }

  return count;
}

function validarLimpiezaAbril2026_() {
  var cargasSheet = getSheet('Cargas');
  var cargas = cargasSheet.getDataRange().getValues();
  var totalCargas = 0;
  var numericActive = 0;

  for (var i = 1; i < cargas.length; i++) {
    var fecha = dateToString(cargas[i][1]);
    if (fecha >= '2026-04-16' && fecha <= '2026-04-30') {
      totalCargas += num(cargas[i][6]);
    }
  }

  var provSheet = getSheet('Proveedores');
  var provData = provSheet.getDataRange().getValues();
  for (var p = 1; p < provData.length; p++) {
    var codigo = String(provData[p][6] || '');
    var activo = cleanupIsTrue_(provData[p][2]);
    if (activo && /^[0-9]+$/.test(codigo)) numericActive++;
  }

  var planillas = getSheet('PLANILLAS').getDataRange().getValues();
  var totalPlanillas = 0;
  var totalPorPagar = 0;
  for (var pl = 1; pl < planillas.length; pl++) {
    if (String(planillas[pl][0] || '').indexOf('IMP-ABR2026-PLANILLA-') !== 0) continue;
    totalPlanillas += num(planillas[pl][9]);
    totalPorPagar += num(planillas[pl][17]);
  }

  var ok = casiIgual_(totalCargas, 57225) &&
    casiIgual_(totalPlanillas, 309565.45) &&
    casiIgual_(totalPorPagar, 182194.46) &&
    numericActive === 0;

  return {
    ok: ok,
    totalCargas: Math.round(totalCargas * 100) / 100,
    totalPlanillas: Math.round(totalPlanillas * 100) / 100,
    totalPorPagar: Math.round(totalPorPagar * 100) / 100,
    proveedoresNumericosActivos: numericActive
  };
}

function cleanupLog_(accion, tabla, registroId, anterior, nuevo) {
  var sheet = getSheet(CLEANUP_ABRIL_2026_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Fecha','Origen','Accion','Tabla','Registro_ID','Anterior','Nuevo']);
  }
  sheet.appendRow([
    new Date().toISOString(),
    CLEANUP_ABRIL_2026_ORIGEN,
    accion,
    tabla,
    registroId,
    JSON.stringify(anterior || {}),
    JSON.stringify(nuevo || {})
  ]);
}

function cleanupIsTrue_(value) {
  return value === true || value === 'true' || value === 1 || value === 'TRUE';
}
