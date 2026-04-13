# LSA Control — Apps Script Backend

Esta carpeta contiene el backend completo del sistema LSA Control implementado en Google Apps Script.

## Archivos

| Archivo | Responsabilidad |
|---------|----------------|
| `Code.gs` | Entry point: `doPost`, dispatch, helpers globales |
| `Auth.gs` | Login, tokens, WebAuthn |
| `Sheets.gs` | CRUD Cargas, Mediciones, Proveedores, Usuarios |
| `Quincena.gs` | Dashboard diario, datos quincenales, comparativa, exportar |
| `Finanzas.gs` | Compradores, Envíos, Remanentes, Dashboard financiero |
| `Pagos.gs` | Tarifas proveedores, Planillas, Comparativa proveedores |
| `Gastos.gs` | Categorías de gastos, Gastos operativos |
| `Alertas.gs` | Alertas por email (tanque mínimo, diferencia alta) |
| `Portal.gs` | Portal público para proveedores (acceso sin login) |
| `Drive.gs` | Subir fotos a Google Drive |
| `Utils.gs` | Helpers de fecha y formato reutilizables |

## Deploy

### Opción A — Manual (sin clasp)

1. Abrir [script.google.com](https://script.google.com)
2. Crear proyecto nuevo → vincular al Google Sheets de producción:
   - En el editor: Proyecto → Configuración → Cambiar proyecto de Google Sheets
   - ID del Sheets: `1R6IXVYnA9P30zHUwnHCMbyXCIxR5ReMCgmXcOe1k82c`
3. Para cada archivo `.gs`:
   - Clic en `+` junto a "Archivos" → Seleccionar "Script"
   - Nombrar exactamente igual que el archivo (sin `.gs`)
   - Pegar el contenido completo
4. Guardar (Ctrl+S)
5. Ejecutar `setup()` una vez → aparecerá un alert con las credenciales iniciales
6. Implementar como Web App:
   - Implementar → Nueva implementación → Tipo: Aplicación web
   - Ejecutar como: Yo
   - Quién tiene acceso: Cualquier usuario (even anonymous)
   - Copiar la URL generada

### Opción B — Via clasp

```bash
npm install -g @google/clasp
clasp login
```

Obtener el scriptId desde la URL del editor de Apps Script (la parte después de `/d/` y antes de `/edit`), pegarlo en `.clasp.json`:

```json
{
  "scriptId": "TU_SCRIPT_ID_AQUI",
  "rootDir": "."
}
```

```bash
cd apps-script/
clasp push
```

Luego abrir el editor en script.google.com para ejecutar `setup()` y hacer el deploy como Web App.

## Variables de entorno Next.js

Una vez que tengas la URL del Web App:

```env
NEXT_PUBLIC_API_URL=https://script.google.com/macros/s/TU_ID/exec
```

## Credenciales iniciales

Después de ejecutar `setup()`:

| Usuario | Password | Rol |
|---------|----------|-----|
| AdminLSA | Lecheria2026 | admin |
| Acopio1 | LSA2026 | empleado |

## Estructura de Sheets

El script crea automáticamente las siguientes hojas si no existen:

**Fase 1:** Cargas, Mediciones, Proveedores, Usuarios, LOG_CAMBIOS

**Fase 2:** COMPRADORES, ENVIOS, PRECIOS_COMPRADOR, REMANENTES,
TARIFAS_PROVEEDORES, PLANILLAS, GASTOS, CATEGORIAS_GASTOS,
ALERTAS_CONFIG, ACCESOS_PROVEEDORES
