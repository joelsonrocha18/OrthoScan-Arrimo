$ErrorActionPreference = "Stop"

$edge = docker inspect --format='{{range .Config.Env}}{{println .}}{{end}}' orthoscan-edge 2>$null
if (-not $edge) {
  throw "orthoscan-edge container not found."
}

$activeLine = ($edge | Select-String -Pattern '^ACTIVE_COLOR=' | Select-Object -First 1).Line
if (-not $activeLine) {
  throw "ACTIVE_COLOR not found in orthoscan-edge environment."
}

$active = $activeLine.Split('=')[1].Trim()
$target = if ($active -eq 'blue') { 'green' } else { 'blue' }

Write-Host "Current active: $active. Rolling back to: $target"
$env:ACTIVE_COLOR = $target
docker compose -f docker-compose.bluegreen.yml up -d orthoscan-edge
Write-Host "Rollback complete. Active color: $target"
