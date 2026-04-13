// ============================================================
// Drive.gs — Upload de fotos a Google Drive
// ============================================================

var DRIVE_FOLDER_NAME = 'LSA-Control-Fotos';

function subirFoto(body, user) {
  try {
    var base64 = String(body.base64 || '');
    var fecha  = String(body.fecha  || getFechaHoy());

    if (!base64) return { success: false, error: 'Base64 requerido' };

    // Strip data URI prefix if present
    var parts = base64.split(',');
    var data  = parts.length > 1 ? parts[1] : parts[0];

    // Detect MIME type
    var mime = 'image/jpeg';
    if (parts.length > 1 && parts[0].indexOf('png')  > -1) mime = 'image/png';
    if (parts.length > 1 && parts[0].indexOf('webp') > -1) mime = 'image/webp';

    var blob   = Utilities.newBlob(Utilities.base64Decode(data), mime, 'foto_' + fecha + '_' + Date.now() + '.jpg');
    var folder = _getOrCreateFolder();
    var file   = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      data: {
        url:  'https://drive.google.com/uc?id=' + file.getId(),
        id:   file.getId(),
      }
    };
  } catch (err) {
    return { success: false, error: 'Error subiendo foto: ' + err.message };
  }
}

function _getOrCreateFolder() {
  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(DRIVE_FOLDER_NAME);
}
