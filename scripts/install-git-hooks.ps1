# 將 .githooks 設為此 repo 的 Git hooks 目錄（含 pre-push .env 檢查）
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $Root

if (-not (Test-Path -LiteralPath '.git')) {
    throw 'Not a git repository: ' + $Root
}

git config --local core.hooksPath .githooks
Write-Host '已設定 core.hooksPath = .githooks' -ForegroundColor Green
Write-Host 'pre-push 會阻擋 tracked / staged / 即將推送的 .env 類檔案。'
