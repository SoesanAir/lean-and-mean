# Deploy Lean & Mean to GitHub Pages (gh-pages branch of this repo).
# Usage: powershell -ExecutionPolicy Bypass -File scripts\deploy-pages.ps1
$ErrorActionPreference = "Stop"
Set-Location "$PSScriptRoot\.."

$env:NEXT_PUBLIC_BASE_PATH = "/lean-and-mean"
npm run build
if ($LASTEXITCODE -ne 0) { throw "build failed" }
Remove-Item Env:NEXT_PUBLIC_BASE_PATH

# GitHub Pages: disable Jekyll so _next/* is served
New-Item -ItemType File -Force "out\.nojekyll" | Out-Null

# publish out/ as the gh-pages branch (history-free snapshot)
Push-Location out
git init -b gh-pages | Out-Null
git add -A
git -c user.name="deploy" -c user.email="deploy@local" commit -m "deploy $(Get-Date -Format s)" | Out-Null
git push --force "https://github.com/SoesanAir/lean-and-mean.git" gh-pages
Pop-Location
Remove-Item -Recurse -Force "out\.git"

Write-Host "Deployed: https://soesanair.github.io/lean-and-mean/"
