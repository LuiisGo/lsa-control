// ============================================================
// Auth.gs — Login y validación de token (con hashing + expiración)
// ============================================================
// Cols Usuarios: 0=ID 1=Nombre 2=Username 3=Password(hash) 4=Role
//                5=Activo 6=ApiToken 7=legacyCredentialId 8=legacyPublicKey
//                9=Permisos 10=Token_Expira

function handleLogin(body) {
  var username = String(body.username || body.email || '').trim();
  var password = String(body.password || '').trim();

  if (!username || !password) {
    return { success: false, error: 'Usuario y contraseña requeridos' };
  }

  var rate = _getLoginRateLimit(username);
  if (rate.locked) {
    return { success: false, error: 'Demasiados intentos. Espera 5 minutos e intenta otra vez.' };
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
    _clearLoginRateLimit(username);

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

  _recordFailedLogin(username);
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

var LOGIN_MAX_ATTEMPTS = 5;
var LOGIN_LOCK_SECONDS = 5 * 60;

function _loginRateKey(username) {
  return 'login:' + String(username || '').trim().toLowerCase();
}

function _getLoginRateLimit(username) {
  try {
    var cache = CacheService.getScriptCache();
    var raw = cache.get(_loginRateKey(username));
    var attempts = raw ? Number(raw) : 0;
    return { attempts: attempts, locked: attempts >= LOGIN_MAX_ATTEMPTS };
  } catch (e) {
    return { attempts: 0, locked: false };
  }
}

function _recordFailedLogin(username) {
  try {
    var cache = CacheService.getScriptCache();
    var key = _loginRateKey(username);
    var raw = cache.get(key);
    var attempts = raw ? Number(raw) : 0;
    attempts++;
    cache.put(key, String(attempts), LOGIN_LOCK_SECONDS);
  } catch (e) {}
}

function _clearLoginRateLimit(username) {
  try {
    CacheService.getScriptCache().remove(_loginRateKey(username));
  } catch (e) {}
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

// ── RESCATE: resetear contraseña de un usuario desde el editor ─
// Uso: editar el username y la pwd nueva, seleccionar la función en
// el dropdown, click Run. Útil cuando se rota PASSWORD_SALT y los
// hashes viejos quedan desfasados.

function resetPasswordUsuario(username, nuevaPassword) {
  var u = String(username || '').trim();
  var p = String(nuevaPassword || '').trim();
  if (!u || !p) { Logger.log('Usage: resetPasswordUsuario("AdminLSA","Lecheria2026")'); return; }

  var sheet = getSheet('Usuarios');
  var data  = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2] || '').trim().toLowerCase() === u.toLowerCase()) {
      var h = hashPassword(p);
      sheet.getRange(i + 1, 4).setValue(h);
      sheet.getRange(i + 1, 7).setValue('');       // invalidar token
      _setTokenExpira(sheet, i + 1, '');
      Logger.log('Password reseteado para ' + u + '. Hash: ' + h);
      return h;
    }
  }
  Logger.log('Usuario no encontrado: ' + u);
}

function resetAdmin() {
  return resetPasswordUsuario('AdminLSA', 'Lecheria2026');
}

function resetEmpleado() {
  return resetPasswordUsuario('Acopio1', 'LSA2026');
}
