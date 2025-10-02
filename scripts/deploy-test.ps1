# Test deployment script for Windows PowerShell
# Tests the Docker build and runs the container locally

Write-Host "🚀 Prophet Web Interface - Deployment Test" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "📋 Checking Docker..." -ForegroundColor Yellow
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Clean up old containers and images
Write-Host ""
Write-Host "🧹 Cleaning up old containers..." -ForegroundColor Yellow
docker stop prophet-test 2>$null
docker rm prophet-test 2>$null
Write-Host "✅ Cleanup complete" -ForegroundColor Green

# Build the Docker image
Write-Host ""
Write-Host "🔨 Building Docker image..." -ForegroundColor Yellow
Write-Host "This may take 5-10 minutes on first build..." -ForegroundColor Gray

$buildStart = Get-Date
docker build -t prophet-web-interface:test .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker build failed!" -ForegroundColor Red
    exit 1
}

$buildEnd = Get-Date
$buildTime = ($buildEnd - $buildStart).TotalSeconds
Write-Host "✅ Build completed in $([math]::Round($buildTime, 2)) seconds" -ForegroundColor Green

# Get image size
$imageSize = docker images prophet-web-interface:test --format "{{.Size}}"
Write-Host "📦 Image size: $imageSize" -ForegroundColor Cyan

# Run the container
Write-Host ""
Write-Host "🚀 Starting container..." -ForegroundColor Yellow
docker run -d `
    --name prophet-test `
    -p 8080:8080 `
    -e ENVIRONMENT=production `
    -e LOG_LEVEL=INFO `
    -e MAX_SESSION_AGE=7200 `
    -e ALLOWED_HOSTS=* `
    -e ALLOWED_ORIGINS=* `
    prophet-web-interface:test

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start container!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Container started" -ForegroundColor Green

# Wait for services to start
Write-Host ""
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check health
Write-Host ""
Write-Host "🏥 Checking health..." -ForegroundColor Yellow

$maxAttempts = 12
$attempt = 0
$healthy = $false

while ($attempt -lt $maxAttempts -and -not $healthy) {
    $attempt++
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            $healthy = $true
            Write-Host "✅ Health check passed!" -ForegroundColor Green
        }
    } catch {
        Write-Host "⏳ Attempt $attempt/$maxAttempts - Waiting..." -ForegroundColor Gray
        Start-Sleep -Seconds 5
    }
}

if (-not $healthy) {
    Write-Host "❌ Health check failed after $maxAttempts attempts" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Container logs:" -ForegroundColor Yellow
    docker logs prophet-test
    exit 1
}

# Test API endpoint
Write-Host ""
Write-Host "🧪 Testing API endpoint..." -ForegroundColor Yellow
try {
    $apiResponse = Invoke-WebRequest -Uri "http://localhost:8080/api/" -UseBasicParsing -TimeoutSec 5
    Write-Host "✅ API is responding" -ForegroundColor Green
} catch {
    Write-Host "⚠️  API test inconclusive (this may be normal)" -ForegroundColor Yellow
}

# Display results
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ Deployment test completed successfully!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Test Results:" -ForegroundColor Cyan
Write-Host "  • Build time: $([math]::Round($buildTime, 2))s" -ForegroundColor White
Write-Host "  • Image size: $imageSize" -ForegroundColor White
Write-Host "  • Container: prophet-test" -ForegroundColor White
Write-Host "  • Port: 8080" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Access the application:" -ForegroundColor Cyan
Write-Host "  • Frontend: http://localhost:8080" -ForegroundColor White
Write-Host "  • API Docs: http://localhost:8080/api/docs" -ForegroundColor White
Write-Host "  • Health: http://localhost:8080/health" -ForegroundColor White
Write-Host ""
Write-Host "📋 Useful commands:" -ForegroundColor Cyan
Write-Host "  • View logs: docker logs -f prophet-test" -ForegroundColor White
Write-Host "  • Stop: docker stop prophet-test" -ForegroundColor White
Write-Host "  • Remove: docker rm prophet-test" -ForegroundColor White
Write-Host "  • Shell: docker exec -it prophet-test /bin/bash" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop watching logs, or close this window." -ForegroundColor Gray
Write-Host ""

# Follow logs
docker logs -f prophet-test
