# CHECKLIST COOLIFY + DOMINIO (APP_ARTES-BUHO)

## 1) Preparar repo en GitHub
- Nombre del repo: APP_ARTES-BUHO
- Rama principal: main
- Subir todo el contenido de este proyecto
- Nota: los workflows estan en `.github/workflows.template` por limitacion de permisos del token actual
- Para activarlos mas tarde:
  - `gh auth refresh -h github.com -s workflow`
  - `.\scripts\activar-workflows.ps1`
  - `git add . && git commit -m "ci: activar workflows" && git push`

## 2) Crear proyecto en Coolify
- Add Resource -> Application
- Source: GitHub
- Seleccionar repo: APP_ARTES-BUHO
- Branch: main
- Build Pack: Dockerfile
- Port: 8080

## 3) Variables de entorno en Coolify
- NODE_ENV=production
- PORT=8080

## 4) Dominio en Coolify
- Domain principal: artesbuhomanagement.com
- Dominio adicional: www.artesbuhomanagement.com (opcional)
- Activar SSL automatico (Let's Encrypt)
- Forzar HTTPS

## 5) DNS en tu proveedor de dominio
- Registro A:
  - Host: @
  - Valor: IP_PUBLICA_DE_TU_VPS
  - TTL: Automatico (o 300)
- Registro A:
  - Host: www
  - Valor: IP_PUBLICA_DE_TU_VPS
  - TTL: Automatico (o 300)

Estado detectado el 27/03/2026:
- `artesbuhomanagement.com` esta resolviendo a IPs de Squarespace:
  - 198.49.23.145
  - 198.185.159.144
  - 198.185.159.145
  - 198.49.23.144
- `www.artesbuhomanagement.com` apunta a `ext-sq.squarespace.com`
- Para alojar en tu VPS con Coolify, debes cambiar estos registros al IP publico de tu VPS.

## 6) Verificacion final
- Probar: https://artesbuhomanagement.com
- Probar salud: https://artesbuhomanagement.com/health
- Revisar logs en Coolify

## 7) Deploy automatico
- En Coolify copia el Deploy Webhook URL
- En GitHub -> Settings -> Secrets -> Actions:
  - Crear secreto COOLIFY_DEPLOY_HOOK con ese valor
- Cada push a main lanzara deploy automatico
