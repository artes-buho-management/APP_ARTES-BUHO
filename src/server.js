const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 8080);
const APP_NAME = process.env.APP_NAME || "APP_ARTES-BUHO";
const PANEL_PASSWORD = process.env.PANEL_PASSWORD || "";
const ARTES_BUHO_URL = process.env.ARTES_BUHO_URL || "https://contabilidad.artesbuhomanagement.com";
const BELLA_BESTIA_URL = process.env.BELLA_BESTIA_URL || "https://bella-bestia.artesbuhomanagement.com";

const AUTH_SHARED_SECRET = process.env.AUTH_SHARED_SECRET || "";
const COOKIE_DOMAIN = Object.prototype.hasOwnProperty.call(process.env, "COOKIE_DOMAIN")
  ? process.env.COOKIE_DOMAIN
  : ".artesbuhomanagement.com";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "false" ? false : true;

const SESSION_COOKIE = "ab_sso";
const SESSION_DURATION_SECONDS = 8 * 60 * 60;

const LOGO_PUBLIC_PATH = "/assets/logo-artes-buho.jpg";
const LOGO_FILE_PATH = path.join(__dirname, "..", "public", "logo-artes-buho.jpg");

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (err, content) => {
    if (err) {
      sendJson(res, 500, { error: "No se pudo cargar el archivo solicitado." });
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400"
    });
    res.end(content);
  });
}

function sendHtml(res, statusCode, html, extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    ...extraHeaders
  });
  res.end(html);
}

function redirect(res, location, extraHeaders = {}) {
  res.writeHead(302, {
    Location: location,
    ...extraHeaders
  });
  res.end();
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || "";
  const pairs = cookieHeader.split(";");
  const cookies = {};

  for (const pair of pairs) {
    const index = pair.indexOf("=");
    if (index === -1) {
      continue;
    }

    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }

  return cookies;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";

    req.on("data", (chunk) => {
      data += chunk;

      if (data.length > 10 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function toBase64Url(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, "base64");
}

function signPayload(payloadBase64Url) {
  return toBase64Url(crypto.createHmac("sha256", AUTH_SHARED_SECRET).update(payloadBase64Url).digest());
}

function safeCompare(a, b) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function buildAuthToken() {
  if (!AUTH_SHARED_SECRET) {
    return "";
  }

  const payload = {
    app: APP_NAME,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS
  };

  const payloadBase64Url = toBase64Url(Buffer.from(JSON.stringify(payload), "utf8"));
  const signature = signPayload(payloadBase64Url);
  return `${payloadBase64Url}.${signature}`;
}

function verifyAuthToken(token) {
  if (!AUTH_SHARED_SECRET || !token) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return false;
  }

  const [payloadBase64Url, signature] = parts;
  const expected = signPayload(payloadBase64Url);

  if (!safeCompare(signature, expected)) {
    return false;
  }

  try {
    const payloadRaw = fromBase64Url(payloadBase64Url).toString("utf8");
    const payload = JSON.parse(payloadRaw);
    return Number(payload.exp || 0) > Math.floor(Date.now() / 1000);
  } catch (_) {
    return false;
  }
}

function sessionCookieHeader(token) {
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_DURATION_SECONDS}`
  ];

  if (COOKIE_DOMAIN) {
    parts.push(`Domain=${COOKIE_DOMAIN}`);
  }

  if (COOKIE_SECURE) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function clearSessionCookieHeader() {
  const parts = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ];

  if (COOKIE_DOMAIN) {
    parts.push(`Domain=${COOKIE_DOMAIN}`);
  }

  if (COOKIE_SECURE) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function htmlLayout(title, body) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root {
        --red: #b1121b;
        --red-soft: #da2733;
        --yellow: #f3c316;
        --yellow-soft: #ffd84c;
        --white: #ffffff;
        --ink: #1b1b1b;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Trebuchet MS", Verdana, sans-serif;
        color: var(--white);
        background:
          radial-gradient(1000px 500px at -15% 0%, rgba(243, 195, 22, 0.25), transparent 60%),
          radial-gradient(900px 460px at 115% 95%, rgba(177, 18, 27, 0.35), transparent 62%),
          linear-gradient(145deg, #111111 0%, #0b1120 56%, #101624 100%);
        display: grid;
        place-items: center;
        padding: 24px;
      }

      .card {
        width: min(980px, 96vw);
        border: 1px solid rgba(255, 255, 255, 0.16);
        border-radius: 24px;
        padding: 28px;
        backdrop-filter: blur(2px);
        background: linear-gradient(165deg, rgba(177, 18, 27, 0.2), rgba(13, 15, 22, 0.9));
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
      }

      .brand-row {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 8px;
      }

      .brand-logo {
        width: 86px;
        height: 86px;
        border-radius: 18px;
        object-fit: cover;
        background: #ffffff;
        padding: 6px;
        border: 1px solid rgba(255, 255, 255, 0.35);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.35);
      }

      .eyebrow {
        margin: 0;
        font-size: 0.85rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #ffe9a7;
      }

      h1 {
        margin: 4px 0 8px;
        font-size: clamp(1.8rem, 2.2vw + 1rem, 2.8rem);
        letter-spacing: 0.03em;
        text-wrap: balance;
      }

      .subtitle {
        margin: 0 0 8px;
        font-size: clamp(1.02rem, 1.2vw + 0.75rem, 1.26rem);
        color: rgba(255, 255, 255, 0.94);
      }

      .context-note {
        margin: 0 0 14px;
        font-size: 1rem;
        color: rgba(255, 255, 255, 0.88);
      }

      .rule {
        height: 3px;
        border-radius: 999px;
        background: linear-gradient(90deg, var(--yellow), #ffe8a4, var(--red-soft));
        margin: 8px 0 24px;
      }

      .login-form {
        display: grid;
        gap: 6px;
      }

      .field-group {
        display: grid;
        gap: 8px;
      }

      label {
        display: block;
        font-weight: 700;
        font-size: 1.02rem;
      }

      input[type="password"] {
        width: 100%;
        border: 2px solid rgba(255, 255, 255, 0.62);
        background: rgba(255, 255, 255, 0.98);
        color: #141414;
        border-radius: 12px;
        padding: 12px 14px;
        font-size: 1.08rem;
        outline: none;
      }

      input[type="password"]:focus {
        border-color: var(--yellow-soft);
        box-shadow: 0 0 0 3px rgba(243, 195, 22, 0.22);
      }

      .button,
      button {
        width: 100%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        text-decoration: none;
        font-weight: 800;
        font-size: 1.16rem;
        padding: 14px 16px;
        border-radius: 12px;
        border: 2px solid transparent;
        cursor: pointer;
        transition: transform 0.15s ease, filter 0.15s ease;
      }

      .button:hover,
      button:hover {
        transform: translateY(-1px);
        filter: brightness(1.05);
      }

      .login-submit {
        margin-top: 14px;
      }

      .button-1 {
        color: var(--ink);
        background: linear-gradient(180deg, #ffd94f, var(--yellow));
        border-color: #ffe17b;
      }

      .button-2 {
        color: var(--white);
        background: linear-gradient(180deg, #d31825, var(--red));
        border-color: #ff5b66;
      }

      .button-ghost {
        margin-top: 18px;
        color: var(--white);
        background: transparent;
        border-color: rgba(255, 255, 255, 0.45);
      }

      .error {
        margin: 6px 0 14px;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid #ff9ea4;
        background: rgba(177, 18, 27, 0.34);
      }

      .help {
        margin-top: 16px;
        opacity: 0.94;
        font-size: 1rem;
      }

      .app-chip {
        display: inline-block;
        margin-top: 10px;
        font-weight: 800;
        color: var(--yellow);
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.22);
        border-radius: 999px;
        padding: 7px 12px;
      }

      .actions {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 14px;
        margin-top: 10px;
      }

      @media (max-width: 640px) {
        .card {
          padding: 20px;
          border-radius: 18px;
        }

        .brand-row {
          align-items: flex-start;
          gap: 12px;
        }

        .brand-logo {
          width: 72px;
          height: 72px;
          border-radius: 14px;
        }

        h1 {
          font-size: 1.7rem;
        }
      }
    </style>
  </head>
  <body>
    <main class="card">${body}</main>
  </body>
</html>`;
}

function renderLogin(errorMessage = "") {
  const errorHtml = errorMessage ? `<div class="error">${errorMessage}</div>` : "";

  return htmlLayout(
    `${APP_NAME} | Login`,
    `<section class="brand-row">
       <img class="brand-logo" src="${LOGO_PUBLIC_PATH}" alt="Logo Artes Buho" />
       <div>
         <p class="eyebrow">Artes Buho Management</p>
         <h1>PANEL PRINCIPAL DE APLICACIONES</h1>
       </div>
     </section>
     <p class="subtitle">Acceso privado a las aplicaciones internas.</p>
     <p class="context-note">Este es el panel principal de las aplicaciones de esta empresa.</p>
     <div class="rule"></div>
     ${errorHtml}
     <form class="login-form" method="post" action="/login">
       <div class="field-group">
         <label for="password">Contraseña</label>
         <input id="password" name="password" type="password" autocomplete="current-password" required />
       </div>
       <button class="button button-1 login-submit" type="submit">Entrar al panel</button>
     </form>
     <p class="help">Sesion unica para todo el ecosistema de apps.</p>`
  );
}

function renderPanel() {
  return htmlLayout(
    `${APP_NAME} | Panel`,
    `<section class="brand-row">
       <img class="brand-logo" src="${LOGO_PUBLIC_PATH}" alt="Logo Artes Buho" />
       <div>
         <p class="eyebrow">Artes Buho Management</p>
         <h1>PANEL DE APLICACIONES</h1>
       </div>
     </section>
     <p class="subtitle">Panel principal de las aplicaciones de esta empresa.</p>
     <p class="context-note">Acceso privado a las aplicaciones internas.</p>
     <div class="rule"></div>
     <div class="actions">
       <a class="button button-1" href="/go/artes-buho">CONTABILIDAD ARTES BUHO</a>
       <a class="button button-2" href="/go/bella-bestia">CONTABILIDAD BELLA BESTIA</a>
     </div>
     <span class="app-chip">Si ya iniciaste sesion aqui, no se pedira contraseña en las apps enlazadas</span>
     <a class="button button-ghost" href="/logout">Cerrar sesion</a>`
  );
}

function renderNotConfigured(appLabel, envVarName) {
  return htmlLayout(
    `${APP_NAME} | Configuracion pendiente`,
    `<h1>FALTA CONFIGURAR ENLACE</h1>
     <p class="subtitle">No hay URL para ${appLabel}.</p>
     <div class="rule"></div>
     <p class="help">Configura la variable <strong>${envVarName}</strong> en Coolify y redeploy.</p>
     <a class="button button-ghost" href="/">Volver al panel</a>`
  );
}

function isAuthenticated(req) {
  const cookies = parseCookies(req);
  return verifyAuthToken(cookies[SESSION_COOKIE]);
}

function requireAuth(req, res) {
  if (!isAuthenticated(req)) {
    redirect(res, "/login");
    return false;
  }

  return true;
}

async function handleLoginPost(req, res) {
  let body = "";

  try {
    body = await readBody(req);
  } catch (_) {
    sendHtml(res, 400, renderLogin("Error al leer la peticion. Intenta otra vez."));
    return;
  }

  const params = new URLSearchParams(body);
  const password = params.get("password") || "";

  if (!PANEL_PASSWORD) {
    sendHtml(res, 500, renderLogin("Configura PANEL_PASSWORD en Coolify."));
    return;
  }

  if (!AUTH_SHARED_SECRET) {
    sendHtml(res, 500, renderLogin("Configura AUTH_SHARED_SECRET en Coolify."));
    return;
  }

  if (password !== PANEL_PASSWORD) {
    sendHtml(res, 401, renderLogin("Contraseña incorrecta."));
    return;
  }

  const token = buildAuthToken();
  redirect(res, "/", {
    "Set-Cookie": sessionCookieHeader(token)
  });
}

function handleLogout(res) {
  redirect(res, "/login", {
    "Set-Cookie": clearSessionCookieHeader()
  });
}

function handleGoRoute(req, res, targetUrl, appLabel, envVarName) {
  if (!requireAuth(req, res)) {
    return;
  }

  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    sendHtml(res, 500, renderNotConfigured(appLabel, envVarName));
    return;
  }

  redirect(res, targetUrl);
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url || "/", "http://localhost");
  const pathname = parsedUrl.pathname;
  const method = (req.method || "GET").toUpperCase();

  if (method === "GET" && pathname === LOGO_PUBLIC_PATH) {
    sendFile(res, LOGO_FILE_PATH, "image/jpeg");
    return;
  }

  if (pathname === "/health") {
    sendJson(res, 200, {
      status: "ok",
      app: APP_NAME,
      sharedAuthReady: Boolean(AUTH_SHARED_SECRET),
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (method === "GET" && pathname === "/login") {
    if (isAuthenticated(req)) {
      redirect(res, "/");
      return;
    }

    sendHtml(res, 200, renderLogin());
    return;
  }

  if (method === "POST" && pathname === "/login") {
    await handleLoginPost(req, res);
    return;
  }

  if (method === "GET" && pathname === "/logout") {
    handleLogout(res);
    return;
  }

  if (method === "GET" && (pathname === "/" || pathname === "/index.html")) {
    if (!requireAuth(req, res)) {
      return;
    }

    sendHtml(res, 200, renderPanel());
    return;
  }

  if (method === "GET" && pathname === "/go/artes-buho") {
    handleGoRoute(req, res, ARTES_BUHO_URL, "Contabilidad Artes Buho", "ARTES_BUHO_URL");
    return;
  }

  if (method === "GET" && pathname === "/go/bella-bestia") {
    handleGoRoute(req, res, BELLA_BESTIA_URL, "Contabilidad Bella Bestia", "BELLA_BESTIA_URL");
    return;
  }

  sendJson(res, 404, { error: "Ruta no encontrada" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`${APP_NAME} escuchando en puerto ${PORT}`);
});

