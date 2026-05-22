# Activa workflows de GitHub Actions a partir de la plantilla.
# Requiere token de GitHub con scope workflow.

$templateDir = Join-Path $PSScriptRoot "..\.github\workflows.template"
$targetDir = Join-Path $PSScriptRoot "..\.github\workflows"

if (-not (Test-Path $templateDir)) {
  Write-Error "No existe la carpeta plantilla: $templateDir"
  exit 1
}

New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
Get-ChildItem -Path $templateDir -Filter *.yml | ForEach-Object {
  Move-Item -Path $_.FullName -Destination (Join-Path $targetDir $_.Name) -Force
}

Write-Host "Workflows activados en .github/workflows"
Write-Host "Ahora ejecuta: git add . && git commit -m 'ci: activar workflows' && git push"
