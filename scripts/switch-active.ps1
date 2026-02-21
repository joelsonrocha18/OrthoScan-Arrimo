param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("blue", "green")]
  [string]$Color
)

$ErrorActionPreference = "Stop"
$env:ACTIVE_COLOR = $Color
docker compose -f docker-compose.bluegreen.yml up -d orthoscan-edge
Write-Host "ACTIVE_COLOR switched to $Color"
