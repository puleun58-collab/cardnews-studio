Add-Type -AssemblyName PresentationFramework
$ErrorActionPreference = 'Stop'
$Url = 'http://127.0.0.1:5273'
$Root = Split-Path -Parent $PSScriptRoot
function Test-Studio {
  try { $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2; return $response.StatusCode -eq 200 } catch { return $false }
}
try {
  if (-not (Get-Command node.exe -ErrorAction SilentlyContinue) -or -not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'Node.js가 설치되어 있지 않습니다. nodejs.org에서 LTS 버전을 설치한 뒤 다시 실행해주세요.' }
  if (-not (Test-Studio)) {
    Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','local' -WorkingDirectory $Root -WindowStyle Hidden
    $ready = $false
    for ($i = 0; $i -lt 60; $i++) { Start-Sleep -Milliseconds 500; if (Test-Studio) { $ready = $true; break } }
    if (-not $ready) { throw '로컬 서버가 30초 안에 준비되지 않았습니다. 프로젝트 폴더에서 npm install을 실행한 뒤 다시 시도해주세요.' }
  }
  Start-Process $Url
} catch { [System.Windows.MessageBox]::Show($_.Exception.Message, '카드뉴스 스튜디오 실행 오류', 'OK', 'Error') | Out-Null }
