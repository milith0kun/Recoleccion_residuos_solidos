# Despliegue de la app móvil SRSS Cusco

Esta guía explica cómo construir el APK y, a partir de ahí, **enviar actualizaciones OTA** (Over-The-Air) sin tener que reinstalar la app en cada celular.

## Cómo funciona

El APK lleva dentro un cliente de `expo-updates` que, al arrancar, consulta a Expo si hay un bundle JS más nuevo. Si lo hay, lo descarga y lo aplica automáticamente en el siguiente arranque. **No se reinstala el APK** — sólo se reemplaza el código JS/assets.

**Limitación**: los updates OTA cubren cambios en TypeScript/JavaScript/imágenes/estilos. Si añades una librería nativa nueva o cambias `app.json` (permisos, plugins), debes reconstruir el APK.

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

> Este es el **único** momento en que cada usuario tiene que reinstalar manualmente.

---

## Subir cambios OTA (todos los días)

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

El primer arranque después de subir el update todavía muestra la versión vieja (porque el chequeo es asíncrono); el **segundo arranque** ya muestra la versión nueva. Esto es comportamiento normal de OTA.

---

## Canales

| Canal         | Propósito                       | Uso                                              |
|---------------|---------------------------------|--------------------------------------------------|
| `development` | Dev client con hot reload       | Solo para desarrollo local                       |
| `preview`     | APK directo para pruebas        | **Esto es lo que usas ahora** (interno/equipo)   |
| `production`  | AAB para Google Play            | Cuando publiques en la tienda                    |

---

## Cuándo SÍ hay que reconstruir el APK

Tienes que correr `npm run build:preview` de nuevo (y los usuarios reinstalar) cuando:

- Subes la `version` en `app.json` (de `1.0.0` a `1.1.0`).
- Añades un plugin nuevo a `app.json` (p.ej. notificaciones push, cámara nativa).
- Instalas una librería con código nativo nuevo (`expo install <algo-con-binarios>`).
- Cambias permisos en `android.permissions` o `ios.infoPlist`.

La regla es: **si tocas `app.json` o instalas una librería nativa nueva → rebuild. Si solo tocas archivos `.ts`, `.tsx` o assets → OTA basta.**

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
```

---

## Variables de entorno

Las builds usan `EXPO_PUBLIC_API_URL` definido en `eas.json` → `build.preview.env`. Si cambias el dominio del backend:

1. Edita `eas.json`.
2. Reconstruye el APK (`npm run build:preview`) — las env vars públicas se inyectan en build time, no en runtime.

Para pruebas locales con `expo start`, usa `.env` en la raíz de `mobile-app/`.

---

## Solución de problemas

**"Project not configured"** → Falta correr `eas init` y `eas update:configure`.

**Usuarios no reciben updates** → Verifica que el APK que tienen instalado fue compilado **después** de añadir `expo-updates` al proyecto. Los APKs anteriores no tienen el cliente OTA.

**Update se publica pero los usuarios siguen viendo lo viejo** → El chequeo es asíncrono; cierra y vuelve a abrir la app dos veces. También verifica que `runtimeVersion` del APK instalado coincide con el de la versión publicada (mismo `version` en `app.json`).
