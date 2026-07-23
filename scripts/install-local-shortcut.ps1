param([switch]$Silent)
Add-Type -AssemblyName PresentationFramework
$ErrorActionPreference = 'Stop'
try {
  $Root = Split-Path -Parent $PSScriptRoot
  $Desktop = [Environment]::GetFolderPath('Desktop')
  $ShortcutPath = Join-Path $Desktop '카드뉴스 스튜디오 (로컬).lnk'
  $Shell = New-Object -ComObject WScript.Shell
  $Shortcut = $Shell.CreateShortcut($ShortcutPath)
  $Shortcut.TargetPath = (Get-Command powershell.exe).Source
  $Shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$(Join-Path $PSScriptRoot 'start-local.ps1')`""
  $Shortcut.WorkingDirectory = $Root
  $Shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,14"
  $Shortcut.Description = '카드뉴스 스튜디오 로컬 서버를 열고 브라우저를 시작합니다.'
  $Shortcut.Save()
  if (-not (Test-Path $ShortcutPath)) { throw '바로가기 파일을 만들지 못했습니다.' }
  if (-not $Silent) { [System.Windows.MessageBox]::Show("바탕 화면에 바로가기를 만들었습니다.`n$ShortcutPath", '설치 완료', 'OK', 'Information') | Out-Null }
} catch {
  if ($Silent) { Write-Error $_.Exception.Message } else { [System.Windows.MessageBox]::Show($_.Exception.Message, '바로가기 설치 오류', 'OK', 'Error') | Out-Null }
  exit 1
}
