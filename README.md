# APP_ARTES-BUHO

Panel principal privado para acceder a apps de la empresa.

## FUNCIONA ASI

- `/login`: pide contraseña.
- `/`: panel con botones de acceso.
- `/go/artes-buho` y `/go/bella-bestia`: rutas protegidas.
- `/health`: healthcheck para Coolify.

Sesion compartida entre apps mediante cookie firmada de dominio.

## VARIABLES (COOLIFY)

- `PORT=8080`
- `PANEL_PASSWORD=TU_CONTRASENA`
- `AUTH_SHARED_SECRET=UN_SECRETO_LARGO_Y_PRIVADO`
- `COOKIE_DOMAIN=.artesbuhomanagement.com`
- `COOKIE_SECURE=true`
- `ARTES_BUHO_URL=https://contabilidad.artesbuhomanagement.com`
- `BELLA_BESTIA_URL=https://bella-bestia.artesbuhomanagement.com`

## HEALTHCHECK EN COOLIFY

- Type: `HTTP`
- Method: `GET`
- Scheme: `http`
- Host: `localhost`
- Port: `8080`
- Path: `/health`
- Return code: `200`

## LOCAL

```bash
node src/server.js
```


## CIERRE CLOUD 2026-04-08
- Estado: sincronizado para migracion a nuevo PC/sistema.
- Preparado para retomar desde GitHub.
- Ultima revision: 2026-04-08 15:26:05 +02:00

## CIERRE MIGRACION CLOUD

- Fecha: 2026-04-08
- Estado: listo para retomar desde otro sistema


<!-- MIGRACION_CLOUD_START -->
## ESTADO MIGRACION CLOUD
- Revisado: 2026-04-08
- Repo listo para continuar en otro sistema.
- Estado Git al cerrar: sincronizado en GitHub.
<!-- MIGRACION_CLOUD_END -->
