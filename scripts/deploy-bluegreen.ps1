param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("blue", "green")]
  [string]$Color
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$compose = "docker compose -f docker-compose.bluegreen.yml"

Write-Host "Building and starting orthoscan-web-$Color..."
Invoke-Expression "$compose up -d --build orthoscan-web-$Color"

Write-Host "Switching edge to ACTIVE_COLOR=$Color..."
$env:ACTIVE_COLOR = $Color
Invoke-Expression "$compose up -d orthoscan-edge"

Write-Host "Waiting 5 seconds for warm-up..."
Start-Sleep -Seconds 5

Write-Host "Health probe (edge):"
try {
  $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:8080/health" -TimeoutSec 10
  if ($response.StatusCode -ne 200) {
    throw "Unexpected health status: $($response.StatusCode)"
  }
  Write-Host "Deployment complete. Active color: $Color"
} catch {
  Write-Error "Health check failed after switching to $Color. Run rollback: .\scripts\switch-active.ps1 -Color $(if ($Color -eq 'blue') {'green'} else {'blue'})"
  throw
}
