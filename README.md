# Nexus Mod Deck — Twitch & Kick Moderation Suite

Una suite profesional de alto rendimiento diseñada para moderar múltiples canales de **Twitch** y **Kick** simultáneamente desde una única pantalla unificada.

![Licencia](https://img.shields.io/badge/license-MIT-blue.svg)
![Twitch API](https://img.shields.io/badge/Twitch-Helix%20OAuth-9146FF?logo=twitch)
![Kick API](https://img.shields.io/badge/Kick-Pusher%20Cluster-53FC18?logo=kick)

---

## 🚀 Despliegue en GitHub Pages (Conexión Directa con Twitch)

### 1. Subir a GitHub
```bash
git init
git add .
git commit -m "Initial commit - Nexus Mod Deck"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```

### 2. Activar GitHub Pages
1. Ve a tu repositorio en GitHub -> **Settings** -> **Pages**.
2. En **Source**, selecciona **Deploy from a branch** -> branch `main` / `(root)` y pulsa **Save**.
3. Tu app estará disponible en: `https://TU_USUARIO.github.io/TU_REPOSITORIO/`

### 3. Registrar tu Aplicación en Twitch Developer Console (Direct 1-Click OAuth)
1. Ve a [https://dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps) e inicia sesión.
2. Haz clic en **"Register Your Application"** (Registrar Aplicación):
   - **Name**: `Nexus Mod Deck (o el nombre que elijas)`
   - **OAuth Redirect URLs**: `https://TU_USUARIO.github.io/TU_REPOSITORIO/` (y también puedes añadir `http://localhost:5500`)
   - **Category**: `Website Integration`
3. Copia el **Client ID** que te proporciona Twitch.
4. Abre tu web en GitHub Pages -> haz clic en **Vincular Twitch** -> pega tu **Client ID** en la Opción 1 y haz clic en **"🟣 Iniciar Sesión Directa"**.

¡Listo! La aplicación iniciará sesión con 1 solo clic y autodetectará todos los canales que moderas.

---

## 💻 Ejecución Local
```bash
python server.py
```
Abre en tu navegador: `http://localhost:5500`
