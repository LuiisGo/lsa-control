// ============================================================
// Auth.gs — Login y validación de token (con hashing + expiración)
// ============================================================
// Cols Usuarios: 0=ID 1=Nombre 2=Username 3=Password(hash) 4=Role
//                5=Activo 6=ApiToken 7=credentialId 8=publicKey
//                9=Permisos 10=Token_Expira

function handleLogin(body) {
  var username = String(body.username || body.email || '').trim();
  var password = String(body.password || '').trim();

  if (!username || !password) {
    return { success: false, error: 'Usuario y contraseña requeridos' };
  }

  var sheet = getSheet('Usuarios');
  var data  = sheet.getDataRange().getValues();
  var hashed = hashPassword(password);

  for (var i = 1; i < data.length; i++) {
    var row     = data[i];
    var rowUser = String(row[2] || '').trim();
    var rowPass = String(row[3] || '').trim();
    var activo  = row[5];

    if (rowUser !== username) continue;
    if (activo === false || activo === 'false' || activo === 0) continue;

    // Match contra hash. Si el sheet aún tiene texto plano (legacy pre-migración)
    // se compara directo y se promueve a hash en el mismo login.
    var matched = false;
    if (isHashedPassword(rowPass)) {
      matched = (rowPass === hashed);
    } else if (rowPass !== '' && rowPass === password) {
      matched = true;
      sheet.getRange(i + 1, 4).setValue(hashed); // upgrade in-place
    }
    if (!matched) break;

    var token   = generateToken();
    var expira  = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    sheet.getRange(i + 1, 7).setValue(token);
    _setTokenExpira(sheet, i + 1, expira);

    var rawPermisos = String(row[9] || '');
    var permisos    = _parsePermisos(rawPermisos);

    return {
      success: true,
      data: {
        token:    token,
        userId:   String(row[0]),
        nombre:   String(row[1]),
        email:    rowUser,
        role:     String(row[4] || 'empleado'),
        permisos: permisos,
        expira:   expira,
      }
    };
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

    if (!stored || stored !== t) continue;
    if (activo === false || activo === 'false' || activo === 0) continue;

    // Verificar expiración
    var rawExpira = row[10];
    if (rawExpira) {
      var expiraMs = new Date(rawExpira).getTime();
      if (!isNaN(expiraMs) && Date.now() > expiraMs) {
        // Token expirado: invalidar y rechazar
        sheet.getRange(i + 1, 7).setValue('');
        return null;
      }
    }

    var rawPermisos = String(row[9] || '');
    return {
      id:       String(row[0]),
      nombre:   String(row[1]),
      username: String(row[2]),
      role:     String(row[4] || 'empleado'),
      permisos: _parsePermisos(rawPermisos),
    };
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
      _setTokenExpira(sheet, i + 1, '');
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
    var storedCred = String(row[7] || '').trim();
    var activo = row[5];

    if (storedCred === credentialId && activo !== false && activo !== 'false' && activo !== 0) {
      var token  = generateToken();
      var expira = new Date(Date.now() + SESSION_TTL_MS).toISOString();
      sheet.getRange(i + 1, 7).setValue(token);
      _setTokenExpira(sheet, i + 1, expira);
      return {
        success: true,
        data: {
          token:  token,
          userId: String(row[0]),
          nombre: String(row[1]),
          email:  String(row[2]),
          role:   String(row[4] || 'empleado'),
          expira: expira,
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
      sheet.getRange(i + 1, 8).setValue(credentialId);
      sheet.getRange(i + 1, 9).setValue(publicKey);
      return { success: true };
    }
  }
  return { success: false, error: 'Usuario no encontrado' };
}

// ── Helper: setea Token_Expira col 11 (1-indexed) sin romper si la columna no existe ─

function _setTokenExpira(sheet, rowIdx, value) {
  try {
    sheet.getRange(rowIdx, 11).setValue(value);
  } catch (e) { /* hoja antigua sin la columna; ignorar */ }
}

// ── PATCH: PERMISOS ───────────────────────────────────────────

var TODOS_PERMISOS = ['cargas', 'medicion', 'envios', 'gastos', 'remanentes'];

function tienePermiso(session, permiso) {
  if (!session) return false;
  if (session.role === 'admin') return true;
  var permisos = session.permisos || TODOS_PERMISOS;
  return permisos.indexOf(permiso) !== -1;
}

function _parsePermisos(rawValue) {
  if (!rawValue || rawValue === '') return TODOS_PERMISOS;
  try {
    var parsed = JSON.parse(String(rawValue));
    if (Array.isArray(parsed)) return parsed;
    return TODOS_PERMISOS;
  } catch(e) {
    return TODOS_PERMISOS;
  }
}

// ── MIGRACIÓN: hashea contraseñas existentes en texto plano ─

function migrarPasswords() {
  var sheet = getSheet('Usuarios');
  var data  = sheet.getDataRange().getValues();
  var migrados = 0;
  for (var i = 1; i < data.length; i++) {
    var pwd = String(data[i][3] || '');
    if (!pwd) continue;
    if (isHashedPassword(pwd)) continue; // ya migrado
    sheet.getRange(i + 1, 4).setValue(hashPassword(pwd));
    migrados++;
  }
  Logger.log('migrarPasswords: ' + migrados + ' contraseñas hasheadas.');
  return migrados;
}
