# Script manual para disparar deploy en Coolify
# Uso:
#   $env:COOLIFY_DEPLOY_HOOK="https://tu-coolify/api/v1/deploy/..."
#   .\scripts\deploy-webhook.ps1

if (-not $env:COOLIFY_DEPLOY_HOOK) {
  Write-Error "Define la variable COOLIFY_DEPLOY_HOOK antes de ejecutar este script."
  exit 1
}

try {
  $response = Invoke-WebRequest -Uri $env:COOLIFY_DEPLOY_HOOK -Method Post -TimeoutSec 30
  Write-Host "Deploy lanzado. Codigo HTTP: $($response.StatusCode)"
} catch {
  Write-Error "No se pudo lanzar el deploy: $($_.Exception.Message)"
  exit 1
}
