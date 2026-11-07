# One-shot deploy: GitHub repo + GitHub Pages + custom domain.
# Usage:  powershell -ExecutionPolicy Bypass -File deploy.ps1 -Domain yourdomain.com
param([Parameter(Mandatory)][string]$Domain)
$ErrorActionPreference = 'Stop'
$name = 'data-pipeline-cost-calculator'
$dst  = Join-Path $HOME "Projects\$name"

# 1. Copy project to ~/Projects (out of the hidden app folder)
if (-not (Test-Path $dst)) { New-Item -ItemType Directory -Force (Split-Path $dst) | Out-Null; Copy-Item $PSScriptRoot $dst -Recurse }
Set-Location $dst

# 2. Install git + GitHub CLI if missing
$pkgs = @{ git = 'Git.Git'; gh = 'GitHub.cli' }
foreach ($t in $pkgs.Keys) {
  if (-not (Get-Command $t -ErrorAction SilentlyContinue)) {
    winget install --id $pkgs[$t] -e --accept-source-agreements --accept-package-agreements
    $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
  }
}

# 3. Log in to GitHub (opens browser — you click Authorize)
cmd /c "gh auth status >nul 2>&1"   # cmd wrapper: PS 5.1 throws on redirected native stderr
if ($LASTEXITCODE -ne 0) { gh auth login --web --hostname github.com --git-protocol https }
gh auth setup-git
$user = gh api user -q .login

# 4. Create repo and push
gh repo create $name --public --source . --remote origin --push

# 5. Enable Pages (GitHub Actions build) + custom domain, then deploy
gh api -X POST "repos/$user/$name/pages" -f build_type=workflow | Out-Null
gh api -X PUT  "repos/$user/$name/pages" -f cname=$Domain | Out-Null
gh workflow run pages.yml --ref main

# 6. DNS records to add at your registrar
Write-Host "`nDONE. Repo: https://github.com/$user/$name" -ForegroundColor Green
Write-Host "Add these DNS records at your domain registrar:" -ForegroundColor Yellow
if (($Domain.Split('.')).Count -le 2) {
  '185.199.108.153','185.199.109.153','185.199.110.153','185.199.111.153' | ForEach-Object { "  A     @    $_" }
  "  CNAME www  $user.github.io"
} else {
  "  CNAME $($Domain.Split('.')[0])  $user.github.io"
}
Write-Host "`nAfter DNS propagates (minutes to a few hours), turn on HTTPS:"
"  gh api -X PUT repos/$user/$name/pages -F https_enforced=true"
Write-Host "Site: https://$Domain   (temporary: https://$user.github.io/$name/)"
