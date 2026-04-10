# build-synology.ps1
# Automates the build and export process for Synology deployment

$ImageName = "flashmob-gaming-prod"
$TagName = "latest"
$TarFile = "synology/flashmob-gaming-prod.tar"

Write-Host "--- FlashMob Gaming - Synology Build Pipeline ---" -ForegroundColor Cyan

# Ensure synology directory exists
if (-not (Test-Path "synology")) {
    New-Item -ItemType Directory -Path "synology"
}

Write-Host "[1/2] Building Docker image: ${ImageName}:$TagName..." -ForegroundColor Yellow
docker build -t "${ImageName}:$TagName" .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Aborting." -ForegroundColor Red
    exit 1
}

Write-Host "[2/2] Exporting to $TarFile..." -ForegroundColor Yellow
if (Test-Path $TarFile) {
    Remove-Item $TarFile
}
docker save -o $TarFile "${ImageName}:$TagName"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Export failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`nSuccess! Transfer '$TarFile' and 'synology/docker-compose.yml' to your NAS." -ForegroundColor Green
Write-Host "Follow the instructions in 'synology/deployment_guide.md'." -ForegroundColor Green
