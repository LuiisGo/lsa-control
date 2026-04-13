// ============================================================
// Auth.gs — Login y validación de token (username-based)
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
    var row     = data[i];
    var rowUser = String(row[2] || '').trim();
    var rowPass = String(row[3] || '').trim();
    var activo  = row[5];

    if (rowUser === username && rowPass === password &&
        activo !== false && activo !== 'false' && activo !== 0) {
      var token = generateToken();
      sheet.getRange(i + 1, 7).setValue(token);

      return {
        success: true,
        data: {
          token:  token,
          userId: String(row[0]),
          nombre: String(row[1]),
          email:  rowUser,   // kept for next-auth compatibility
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

function doLogout(body) {
  var token = String(body.token || '').trim();
  if (!token) return { success: false, error: 'Token requerido' };

  var sheet = getSheet('Usuarios');
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][6] || '').trim() === token) {
      sheet.getRange(i + 1, 7).setValue('');
      return { success: true };
    }
  }
  return { success: false, error: 'Token no encontrado' };
}

function getChallenge(body) {
  var challenge = Utilities.base64Encode(Utilities.generateKey(32));
  return { success: true, data: { challenge: challenge } };
}

function verifyWebAuthn(body) {
  var credentialId = String(body.credentialId || '').trim();
  if (!credentialId) return { success: false, error: 'credentialId requerido' };

  var sheet = getSheet('Usuarios');
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var storedCred = String(row[7] || '').trim(); // col 7 = credentialId (Fase 2 extension)
    var activo = row[5];

    if (storedCred === credentialId && activo !== false && activo !== 'false' && activo !== 0) {
      var token = generateToken();
      sheet.getRange(i + 1, 7).setValue(token);
      return {
        success: true,
        data: {
          token:  token,
          userId: String(row[0]),
          nombre: String(row[1]),
          email:  String(row[2]),
          role:   String(row[4] || 'empleado'),
        }
      };
    }
  }
  return { success: false, error: 'Credencial WebAuthn no encontrada' };
}

function saveWebAuthnCredential(body) {
  var token        = String(body.token || '').trim();
  var credentialId = String(body.credentialId || '').trim();
  var publicKey    = String(body.publicKey || '').trim();

  var user = validateToken(token);
  if (!user) return { success: false, error: 'Token inválido' };

  var sheet = getSheet('Usuarios');
  var data  = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === user.id) {
      // Ensure columns exist (extend if needed)
      sheet.getRange(i + 1, 8).setValue(credentialId);
      sheet.getRange(i + 1, 9).setValue(publicKey);
      return { success: true };
    }
  }
  return { success: false, error: 'Usuario no encontrado' };
}
