# dev.ps1 - single-command CurioMap dev launcher.
# Usage: powershell -ExecutionPolicy Bypass -File .\dev.ps1
# Stop:  .\dev.ps1 -Down
param([switch]$Down,[switch]$NoDocker,[switch]$NoApi,[switch]$NoUi,[switch]$NoInstall)
$ErrorActionPreference='Stop'
$Root=Split-Path -Parent $MyInvocation.MyCommand.Path
$ApiDir=Join-Path $Root 'backend\src\CurioMap.Api'
$UiDir=Join-Path $Root 'frontend'
$ApiUrl='http://localhost:8080'; $UiUrl='http://localhost:3000'
function Step([string]$m){Write-Host "`n==> $m" -ForegroundColor Cyan}
function Ok([string]$m){Write-Host "  OK: $m" -ForegroundColor Green}
function Warn([string]$m){Write-Host "  WARN: $m" -ForegroundColor Yellow}
if($Down){
  Step 'Stopping CurioMap dev stack...'
  Get-Process powershell,pwsh -ErrorAction SilentlyContinue | Where-Object{$_.MainWindowTitle -match 'CurioMap (API|UI)'} | ForEach-Object{try{$_.CloseMainWindow()|Out-Null}catch{}}
  Start-Sleep -Seconds 1
  Get-Process powershell,pwsh -ErrorAction SilentlyContinue | Where-Object{$_.MainWindowTitle -match 'CurioMap (API|UI)'} | ForEach-Object{try{Stop-Process -Id $_.Id -Force}catch{}}
  Push-Location $Root; try{docker compose down}finally{Pop-Location}
  Ok 'Stopped (docker down + API/UI windows closed).'; exit 0
}
foreach($c in @('docker','dotnet','node','npm')){if(-not(Get-Command $c -ErrorAction SilentlyContinue)){throw "Required '$c' not on PATH."}}
if(-not $NoDocker){
  Step 'Starting infra (docker compose up -d)...'
  Push-Location $Root; try{docker compose up -d}finally{Pop-Location}
  Step 'Waiting for postgres+redis (max 60s)...'
  $dl=(Get-Date).AddSeconds(60); $up=$false
  while((Get-Date) -lt $dl){
    $ps=docker ps --format '{{.Names}} {{.Status}}' 2>$null
    if($ps -match 'curiomap-postgres.*Up' -and $ps -match 'curiomap-redis.*Up'){$up=$true;break}
    Start-Sleep -Seconds 2
  }
  if($up){Ok 'Postgres :5433 + Redis :6380 up.'}else{Warn 'Containers not Up yet - check docker compose ps.'}
}
function Launch([string]$Title,[string]$Dir,[string]$Cmd){
  $a="-NoExit -Title '$Title' -Command `"cd '$Dir'; `$Host.UI.RawUI.WindowTitle='$Title'; $Cmd`""
  Start-Process powershell -ArgumentList $a -WorkingDirectory $Dir | Out-Null
}
if(-not $NoApi){
  Step 'Starting API (dotnet run -> http://localhost:8080)...'
  Launch 'CurioMap API (:8080)' $ApiDir 'dotnet run --launch-profile http'
}
if(-not $NoUi){
  if(-not $NoInstall -and -not(Test-Path(Join-Path $UiDir 'node_modules'))){
    Step 'node_modules missing - running npm install...'
    Push-Location $UiDir; try{npm install}finally{Pop-Location}
  }
  Step 'Starting UI (npm run dev -> http://localhost:3000)...'
  Launch 'CurioMap UI (:3000)' $UiDir 'npm run dev:ui'
}
function WaitUrl([string]$Url,[int]$Secs){
  $dl=(Get-Date).AddSeconds($Secs)
  while((Get-Date) -lt $dl){try{$r=Invoke-WebRequest -Uri $Url -TimeoutSec 5 -UseBasicParsing; if($r.StatusCode -lt 500){return $true}}catch{}; Start-Sleep -Seconds 2}
  return $false
}
if(-not $NoApi){Step 'Waiting for API /health (max 120s)...'; if(WaitUrl "$ApiUrl/health" 120){Ok "API $ApiUrl (docs $ApiUrl/docs)"}else{Warn 'API not up yet - see CurioMap API window.'}}
if(-not $NoUi){Step 'Waiting for UI (max 120s)...'; if(WaitUrl $UiUrl 120){Ok "UI $UiUrl"}else{Warn 'UI not up yet - see CurioMap UI window.'}}
Write-Host ''; Write-Host 'API: http://localhost:8080/health+docs  UI: http://localhost:3000  Stop: .\dev.ps1 -Down' -ForegroundColor Gray
