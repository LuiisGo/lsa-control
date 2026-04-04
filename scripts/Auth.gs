// ============================================================
// Auth.gs — Login y validación de token
// ============================================================

function handleLogin(body) {
  var username = String(body.username || body.email || '').trim();
  var password  = String(body.password  || '').trim();

  if (!username || !password) {
    return { success: false, error: 'Usuario y contraseña requeridos' };
  }

  var sheet = getSheet('Usuarios');
  var data  = sheet.getDataRange().getValues();

  // Cols: 0=id 1=nombre 2=username 3=password 4=role 5=activo 6=apiToken
  for (var i = 1; i < data.length; i++) {
    var row       = data[i];
    var rowUser   = String(row[2] || '').trim();
    var rowPass   = String(row[3] || '').trim();
    var activo    = row[5];

    if (rowUser === username && rowPass === password && activo !== false && activo !== 'false' && activo !== 0) {
      var token = generateToken();
      sheet.getRange(i + 1, 7).setValue(token);

      return {
        success: true,
        data: {
          token:  token,
          userId: String(row[0]),
          nombre: String(row[1]),
          email:  rowUser,
          role:   String(row[4] || 'empleado'),
        }
      };
    }
  }

  return { success: false, error: 'Usuario o contraseña incorrectos' };
}

function validateToken(token) {
  if (!token) return null;
  var t = String(token).trim();
  if (!t) return null;

  var sheet = getSheet('Usuarios');
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var row    = data[i];
    var stored = String(row[6] || '').trim();
    var activo = row[5];

    if (stored && stored === t && activo !== false && activo !== 'false' && activo !== 0) {
      return {
        id:       String(row[0]),
        nombre:   String(row[1]),
        username: String(row[2]),
        role:     String(row[4] || 'empleado'),
      };
    }
  }
  return null;
}
