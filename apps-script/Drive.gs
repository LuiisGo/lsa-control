// ============================================================
// Drive.gs — Upload de fotos a Google Drive (con validación)
// ============================================================

var DRIVE_FOLDER_NAME = 'LSA-Control-Fotos';
var MAX_FOTO_BYTES    = 5 * 1024 * 1024; // 5MB
var ALLOWED_MIME      = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function subirFoto(body, user) {
  try {
    if (!user) return { success: false, error: 'Sesión requerida' };
    var base64 = String(body.base64 || '');
    var fecha  = String(body.fecha  || getFechaHoy());

    if (!base64) return { success: false, error: 'Foto requerida' };

    // Detect MIME from data URI prefix
    var parts = base64.split(',');
    var data, prefix;
    if (parts.length > 1) {
      prefix = String(parts[0] || '').toLowerCase();
      data   = parts[1];
    } else {
      prefix = '';
      data   = parts[0];
    }

    var mime = 'image/jpeg';
    if (prefix.indexOf('image/png')  > -1) mime = 'image/png';
    else if (prefix.indexOf('image/webp') > -1) mime = 'image/webp';
    else if (prefix.indexOf('image/jpeg') > -1 || prefix.indexOf('image/jpg') > -1) mime = 'image/jpeg';

    if (!ALLOWED_MIME[mime]) {
      return { success: false, error: 'Tipo de archivo no permitido' };
    }

    // Validar tamaño aproximado (base64 = 4/3 del tamaño binario)
    var sizeBytes = Math.floor(data.length * 0.75);
    if (sizeBytes > MAX_FOTO_BYTES) {
      return { success: false, error: 'La foto excede 5MB' };
    }

    var ext      = ALLOWED_MIME[mime];
    var filename = 'foto_' + fecha + '_' + Date.now() + '.' + ext;

    var blob   = Utilities.newBlob(Utilities.base64Decode(data), mime, filename);
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
    Logger.log('[subirFoto] ' + (err && err.stack ? err.stack : err));
    return { success: false, error: 'No se pudo subir la foto' };
  }
}

function _getOrCreateFolder() {
  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(DRIVE_FOLDER_NAME);
}
