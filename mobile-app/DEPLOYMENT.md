# Despliegue de la app móvil SRSS Cusco

Esta guía explica cómo construir el APK y, a partir de ahí, **enviar actualizaciones OTA** (Over-The-Air) sin tener que reinstalar la app en cada celular.

## Cómo funciona

El APK lleva dentro un cliente de `expo-updates` que, al arrancar, consulta a Expo si hay un bundle JS más nuevo. Si lo hay, lo descarga y lo aplica automáticamente en el siguiente arranque. **No se reinstala el APK** — sólo se reemplaza el código JS/assets.

---

## ¿Rebuild de APK u OTA? — Tabla rápida

| Cambio | OTA | Rebuild |
|---|---|---|
| Editar `.ts` / `.tsx` / estilos | ✅ | |
| Cambiar imágenes en `assets/` que se usan vía `import` | ✅ | |
| Agregar / quitar pantallas en `app/` | ✅ | |
| Editar texto, traducciones | ✅ | |
| Cambiar `icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png` | | ✅ |
| Cambiar `notification-icon.png` | | ✅ |
| Modificar `app.json` (plugins, permisos, name, scheme, version) | | ✅ |
| Modificar `eas.json` (env vars, channel) | | ✅ |
| Subir `runtimeVersion` o `version` | | ✅ |
| Instalar nueva librería **nativa** (`react-native-*`, `expo-*` con plugin) | | ✅ |
| Instalar librería **JS-only** (axios, date-fns, etc.) | ✅ | |
| Cambiar permisos Android / `infoPlist` iOS | | ✅ |

> Regla de oro: si tocás archivos dentro de `app/` o `src/` (TS/TSX/JS/assets importados), **OTA basta**. Si tocás `app.json`, `eas.json`, `package.json` con libs nativas, o `assets/icon*.png`, **rebuild**.

### Librerías nativas actuales en este proyecto

Estas tienen código nativo Android/iOS — instalar o quitar cualquiera de ellas requiere rebuild:

- `@react-native-google-signin/google-signin` (login Google)
- `expo-location` (GPS de operador y ciudadano)
- `expo-secure-store` (token / sesión)
- `expo-updates` (OTA cliente)
- `expo-notifications` (push)
- `expo-device` (detectar dispositivo físico vs emulador)
- `expo-font` (carga Inter)
- `expo-linking` (deep links)
- `expo-crypto`
- `expo-status-bar`
- `expo-router`
- `react-native-maps`
- `react-native-safe-area-context`
- `react-native-screens`
- `@react-native-async-storage/async-storage`

---

## Setup inicial (una sola vez)

### 1. Crear cuenta en Expo

```powershell
npm install -g eas-cli
eas login
```

### 2. Vincular el proyecto a tu cuenta

Desde `mobile-app/`:

```powershell
eas init
```

Esto crea el `projectId` y lo escribe automáticamente en `app.json` bajo `extra.eas.projectId`.

### 3. Configurar la URL de updates

```powershell
eas update:configure
```

Esto añade el bloque `updates.url` apuntando a `https://u.expo.dev/<projectId>`.

### 4. Compilar el primer APK

```powershell
npm run build:preview
```

EAS te devuelve un link. Descarga el APK desde ahí e instálalo en los dispositivos.

> Este es el **único** momento en que cada usuario tiene que reinstalar manualmente — luego todo va por OTA hasta que toques algo nativo.

---

## Subir cambios OTA (lo más común)

Después de editar código (TS/TSX/estilos/imágenes):

```powershell
npm run update:preview -- "Descripción del cambio"
```

Ejemplo:

```powershell
npm run update:preview -- "Arreglo del filtro de mapa y nuevo estilo de profile"
```

El bundle se publica en ~30-60s. La próxima vez que el usuario abra la app:

1. Al lanzarse, `_layout.tsx` corre `checkForOtaUpdate()` en background.
2. Si hay update disponible, lo descarga.
3. Recarga la app con la versión nueva.

El primer arranque después de subir el update todavía muestra la versión vieja (porque el chequeo es asíncrono); el **segundo arranque** ya muestra la versión nueva.

---

## Notificaciones push

### Cómo está armado

- `src/hooks/usePushToken.ts` pide permisos al SO, obtiene el Expo Push Token y lo guarda en `SecureStore`. Intenta enviarlo al backend con `PATCH /users/me { pushToken }`.
- `app/_layout.tsx` envuelve la app con `<PushSubscription />`. Ese componente:
  - Llama `usePushToken(!!user)` — solo se registra cuando hay sesión activa.
  - Escucha taps en notificaciones: si la notificación lleva `data.url = "/(tabs)/map"`, navega ahí al pulsarla.
- En `app.json`, el plugin `expo-notifications` apunta a `assets/notification-icon.png` (versión monocroma blanca del BrandMark) con color de marca `#00684A`.

### Lo que necesita el backend para que las notificaciones lleguen

1. **Endpoint** que reciba el token. Ahora mismo el hook hace `PATCH /api/v1/users/me { pushToken: "ExponentPushToken[xxx]" }`. El backend debe aceptar y guardar este campo en el documento del usuario (string indexado).

2. **Servicio de envío** que use el Expo Push API:
   ```http
   POST https://exp.host/--/api/v2/push/send
   Content-Type: application/json
   {
     "to": "ExponentPushToken[xxx]",
     "title": "Camión cerca",
     "body": "El camión está a 2 cuadras",
     "data": { "url": "/(tabs)/map" }
   }
   ```
   Docs: https://docs.expo.dev/push-notifications/sending-notifications/

3. **Cuándo enviar**:
   - Operador inicia jornada en la ruta del ciudadano → push a ciudadanos de esa zona.
   - Operador termina ruta o reporta retraso → push a ciudadanos.
   - Admin asigna nueva ruta a operador → push al operador.

### Probar push en desarrollo

Cuando tengas el token (lo podés ver en logs si descomentás el `console.log` del hook):

```powershell
curl -X POST https://exp.host/--/api/v2/push/send `
  -H "Content-Type: application/json" `
  -d '{"to":"ExponentPushToken[xxx]","title":"Hola","body":"Funciona","data":{"url":"/(tabs)/home"}}'
```

### Limitaciones

- **No funcionan en emulador** de Android Studio ni simulador iOS. Requieren dispositivo físico.
- En Expo Go funcionan solo con tokens de tipo `expo` (no Firebase directo).
- En APK preview/production usan el push token de Expo, que Expo a su vez ruta vía FCM (Android) / APNs (iOS).

---

## Canales

| Canal         | Propósito                       | Uso                                              |
|---------------|---------------------------------|--------------------------------------------------|
| `development` | Dev client con hot reload       | Solo para desarrollo local                       |
| `preview`     | APK directo para pruebas        | **Esto es lo que usás ahora** (interno/equipo)   |
| `production`  | AAB para Google Play            | Cuando publiques en la tienda                    |

---

## Cuándo SÍ hay que reconstruir el APK

Tienes que correr `npm run build:preview` de nuevo (y los usuarios reinstalar) cuando:

- Subes la `version` en `app.json` (de `1.0.0` a `1.1.0`).
- Añades un plugin nuevo a `app.json` (p.ej. notificaciones push, cámara nativa).
- Instalas una librería con código nativo nuevo (`expo install <algo-con-binarios>`).
- Cambias permisos en `android.permissions` o `ios.infoPlist`.
- Cambias los íconos `icon.png`, `adaptive-icon.png`, `splash-icon.png`, `notification-icon.png`.

La regla es: **si tocás `app.json` o instalás una librería nativa nueva → rebuild. Si solo tocás archivos `.ts`, `.tsx` o assets importados → OTA basta.**

---

## Regenerar íconos

El logo del app vive en `assets/brand-mark.svg` (versión a color) y `assets/brand-mark-mono.svg` (versión blanca para notificaciones).

Para regenerar todos los íconos derivados:

```powershell
node scripts/generate-icons.mjs
```

Esto produce:

- `icon.png` (1024×1024, transparente, padding 6%)
- `adaptive-icon.png` (1024×1024, transparente, padding 12%)
- `splash-icon.png` (1024×1024, transparente, padding 20%)
- `favicon.png` (48×48, fondo blanco)
- `notification-icon.png` (96×96, monocromo)

Después: rebuild.

---

## Cheatsheet

```powershell
# Verificar tipos antes de publicar
npm run typecheck

# Compilar APK (la primera vez o tras cambios nativos)
npm run build:preview

# Enviar update OTA (lo más común)
npm run update:preview -- "Mensaje del cambio"

# Listar updates publicados
eas update:list --branch preview

# Ver builds anteriores
eas build:list

# Regenerar íconos
node scripts/generate-icons.mjs
```

---

## Variables de entorno

Las builds usan estas vars:

| Variable | Dónde se define | Cuándo se inyecta |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `eas.json` → `build.preview.env` | Build time |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB` | EAS Environment (`preview` env) | Build time |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID` | EAS Environment (`preview` env) | Build time |

Para pruebas locales con `expo start`, usá `.env` en la raíz de `mobile-app/`.

**Importante**: cambiar el valor de una env var pública requiere rebuild — Metro las inlinea en build time.

---

## Solución de problemas

**"Project not configured"** → Falta correr `eas init` y `eas update:configure`.

**Usuarios no reciben updates** → Verifica que el APK que tienen instalado fue compilado **después** de añadir `expo-updates` al proyecto. Los APKs anteriores no tienen el cliente OTA.

**Update se publica pero los usuarios siguen viendo lo viejo** → El chequeo es asíncrono; cerrá y volvé a abrir la app dos veces. También verificá que `runtimeVersion` del APK instalado coincide con el de la versión publicada (mismo `version` en `app.json`).

**Botón Google no abre la pestaña** → Verificá que el SHA-1 del keystore EAS está registrado en Google Cloud Console → OAuth → Android client. Obtené el SHA-1 con `npx eas-cli credentials -p android`.

**Push no llega** → 1) Confirmá que estás en dispositivo físico (no emulador). 2) Verificá permisos de notificación en ajustes del SO. 3) Probá enviar manualmente al token con curl al endpoint `exp.host/--/api/v2/push/send`.
