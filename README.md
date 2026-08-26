# OrbiMod — Twitch & Kick Multi-Channel Moderation Control Suite

**OrbiMod** es una suite profesional de alto rendimiento diseñada para moderar múltiples canales de **Twitch** y **Kick** simultáneamente desde una única pantalla orbital unificada con sincronización en la nube multi-dispositivo y persistencia total de widgets y canales.

![Licencia](https://img.shields.io/badge/license-MIT-blue.svg)
![Twitch API](https://img.shields.io/badge/Twitch-Helix%20OAuth-9146FF?logo=twitch)
![Kick API](https://img.shields.io/badge/Kick-Pusher%20Cluster-53FC18?logo=kick)
![Supabase Cloud](https://img.shields.io/badge/Supabase-Cloud%20Sync-3ECF8E?logo=supabase)

---

## ⚡ Sincronización Automática con Git (1-Clic Push)

Para enviar todos los cambios automáticamente a tu repositorio de GitHub (`origin main`), dispones de varias opciones rápidas:

### Opción 1: Con npm
```bash
npm run push
```
*(O también: `npm run git:push` o `npm run sync`)*

### Opción 2: Doble Clic en Windows
- Haz doble clic en el archivo **`auto-git-push.bat`** en la carpeta del proyecto.
- O ejecuta en PowerShell:
```powershell
.\auto-git-push.ps1 "Mensaje del commit opcional"
```

El script se encargará automáticamente de ejecutar `git add .`, crear el commit con timestamp y hacer `git push origin main`.

---

## ☁️ Sincronización Multi-Dispositivo en la Nube

OrbiMod sincroniza automáticamente en Supabase:
- **Diseños y Layouts del Deck**: Cuadrículas (Grid 2x2, Muro Chats, Split 1+2, Dual Stream, Focus 1).
- **Canales Activos y Guardados**: Lista de canales y su orden personalizado en el deck.
- **Configuración de Widgets**: Estado de reproductor de video (activado/desactivado), audio/muteo y filtros.
- **Historial de Moderación**: Canales donde eres moderador o propietario accesibles en cualquier computador.

---

## 🚀 Despliegue en GitHub Pages (Conexión Directa con Twitch)

### 1. Subir a GitHub
```bash
npm run push
```

### 2. Activar GitHub Pages
1. Ve a tu repositorio en GitHub -> **Settings** -> **Pages**.
2. En **Source**, selecciona **Deploy from a branch** -> branch `main` / `(root)` y pulsa **Save**.
3. Tu app estará disponible en: `https://bersek3.github.io/Orbimod/`

### 3. Registrar tu Aplicación en Twitch Developer Console (Direct 1-Click OAuth)
1. Ve a [https://dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps) e inicia sesión.
2. Haz clic en **"Register Your Application"** (Registrar Aplicación):
   - **Name**: `OrbiMod`
   - **OAuth Redirect URLs**: `https://bersek3.github.io/Orbimod/` (y también puedes añadir `http://localhost:5500`)
   - **Category**: `Website Integration`
3. Copia el **Client ID** que te proporciona Twitch.
4. Abre **OrbiMod** -> haz clic en **Vincular Twitch** -> pega tu **Client ID** y haz clic en **"🟣 Iniciar Sesión Directa"**.

---

## 💻 Ejecución Local

### Con Node.js (Recomendado):
```bash
npm start
```
O bien:
```bash
node server.js
```

### Con Python:
```bash
python server.py
```

Abre en tu navegador: `http://localhost:5500`

