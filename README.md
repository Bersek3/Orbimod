# OrbiMod — Twitch & Kick Multi-Channel Moderation Control Suite

**OrbiMod** es una suite profesional de alto rendimiento diseñada para moderar múltiples canales de **Twitch** y **Kick** simultáneamente desde una única pantalla orbital unificada.

![Licencia](https://img.shields.io/badge/license-MIT-blue.svg)
![Twitch API](https://img.shields.io/badge/Twitch-Helix%20OAuth-9146FF?logo=twitch)
![Kick API](https://img.shields.io/badge/Kick-Pusher%20Cluster-53FC18?logo=kick)

---

## 🚀 Despliegue en GitHub Pages (Conexión Directa con Twitch)

### 1. Subir a GitHub
```bash
git add .
git commit -m "Update branding to OrbiMod"
git push origin main
```

### 2. Activar GitHub Pages
1. Ve a tu repositorio en GitHub -> **Settings** -> **Pages**.
2. En **Source**, selecciona **Deploy from a branch** -> branch `main` / `(root)` y pulsa **Save**.
3. Tu app estará disponible en: `https://TU_USUARIO.github.io/futbol/`

### 3. Registrar tu Aplicación en Twitch Developer Console (Direct 1-Click OAuth)
1. Ve a [https://dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps) e inicia sesión.
2. Haz clic en **"Register Your Application"** (Registrar Aplicación):
   - **Name**: `OrbiMod`
   - **OAuth Redirect URLs**: `https://TU_USUARIO.github.io/futbol/` (y también puedes añadir `http://localhost:5500`)
   - **Category**: `Website Integration`
3. Copia el **Client ID** que te proporciona Twitch.
4. Abre **OrbiMod** -> haz clic en **Vincular Twitch** -> pega tu **Client ID** en la Opción 1 y haz clic en **"🟣 Iniciar Sesión Directa"**.

¡Listo! La aplicación iniciará sesión con 1 solo clic y autodetectará todos los canales que moderas.

---

## 💻 Ejecución Local
```bash
python server.py
```
Abre en tu navegador: `http://localhost:5500`
