# deploy.ps1 — раскладывает файлы из Downloads по путям проекта.
#
# Формат имени файла: путь через "--" вместо "\", например:
#   app--api--ai--route.ts       -> app\api\ai\route.ts
#   app--vibe--page.tsx          -> app\vibe\page.tsx
#   lib--kashmir.ts              -> lib\kashmir.ts
#
# Запускать из корня проекта (там же, где package.json):
#   .\deploy.ps1
#
# Скрипт находит в Downloads ВСЕ файлы с "--" в имени, раскладывает их
# по местам и ничего не коммитит сам — git add/commit/push делаешь руками
# после того, как посмотрел на git diff.

$downloads = "$env:USERPROFILE\Downloads"
$files = Get-ChildItem -Path $downloads -Filter "*--*" -File

if ($files.Count -eq 0) {
    Write-Host "В Downloads нет файлов с '--' в имени. Нечего раскладывать." -ForegroundColor Yellow
    exit
}

Write-Host "Найдено файлов: $($files.Count)" -ForegroundColor Cyan
Write-Host ""

$deployed = @()

foreach ($file in $files) {
    $relPath = $file.Name -replace "--", "\"
    $destDir = Split-Path $relPath -Parent

    if ($destDir -and !(Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        Write-Host "Создал папку: $destDir" -ForegroundColor DarkGray
    }

    Copy-Item -Path $file.FullName -Destination $relPath -Force
    Write-Host "OK  $($file.Name)  ->  $relPath" -ForegroundColor Green
    $deployed += $relPath
}

Write-Host ""
Write-Host "Готово. Дальше вручную:" -ForegroundColor Cyan
Write-Host "  git --no-pager diff $($deployed -join ' ')"
Write-Host "  git add $($deployed -join ' ')"
Write-Host "  git commit -m ""..."""
Write-Host "  git push"
