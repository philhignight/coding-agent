# CCC PowerShell Start Script
# Run with: powershell -ExecutionPolicy Bypass -File start.ps1

Write-Host "================================" -ForegroundColor Cyan
Write-Host "CCC PowerShell Launcher" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
function Test-Prerequisite {
    param($Command, $Name, $DownloadUrl)
    
    if (!(Get-Command $Command -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: $Name not found" -ForegroundColor Red
        Write-Host "Download from: $DownloadUrl" -ForegroundColor Yellow
        return $false
    }
    return $true
}

# Check Java
if (!(Test-Prerequisite "java" "Java" "https://adoptium.net/")) { exit 1 }
Write-Host "✓ Java found: " -NoNewline -ForegroundColor Green
java -version 2>&1 | Select-Object -First 1

# Check Node.js
if (!(Test-Prerequisite "node" "Node.js" "https://nodejs.org/")) { exit 1 }
Write-Host "✓ Node.js found: " -NoNewline -ForegroundColor Green
node --version

# Check if agent.jar exists
if (!(Test-Path "src\java-agent\agent.jar")) {
    Write-Host "Java agent not compiled. Running compile script..." -ForegroundColor Yellow
    if (Test-Path "compile.bat") {
        & .\compile.bat
    } else {
        Write-Host "compile.bat not found!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Starting CCC components..." -ForegroundColor Cyan
Write-Host ""

# Start mock server
Write-Host "Starting mock API server on port 3001..." -ForegroundColor Yellow
$mockServer = Start-Process -FilePath "node" -ArgumentList "mock-env\server.js" -PassThru -WindowStyle Normal -WorkingDirectory $PWD

Start-Sleep -Seconds 2

# Start coordinator
Write-Host "Starting coordinator on port 3000..." -ForegroundColor Yellow
$coordinator = Start-Process -FilePath "node" -ArgumentList "src\node-server\coordinator.js" -PassThru -WindowStyle Normal -WorkingDirectory $PWD

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "CCC is running!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Mock UI:     " -NoNewline; Write-Host "http://localhost:3001" -ForegroundColor Cyan
Write-Host "Coordinator: " -NoNewline; Write-Host "http://localhost:3000" -ForegroundColor Cyan
Write-Host ""

# Test connection
Write-Host "Testing connection..." -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "http://localhost:3000/api/status" -Method Get
    Write-Host "✓ Coordinator is responding" -ForegroundColor Green
    Write-Host "  Java Agent: $($status.javaAgent)" -ForegroundColor Gray
    Write-Host "  Calibrated: $($status.calibrated)" -ForegroundColor Gray
} catch {
    Write-Host "⚠ Coordinator not responding yet" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open browser: " -NoNewline; Write-Host "http://localhost:3001" -ForegroundColor Yellow
Write-Host "2. Calibrate (replace with actual coordinates):"
Write-Host '   Invoke-RestMethod -Uri "http://localhost:3000/api/calibrate?x=500&y=500"' -ForegroundColor Gray
Write-Host "3. Test chat:"
Write-Host '   $body = @{message="Hello"} | ConvertTo-Json'
Write-Host '   Invoke-RestMethod -Uri "http://localhost:3000/api/chat" -Method Post -Body $body -ContentType "application/json"' -ForegroundColor Gray
Write-Host ""

# Function to stop services
function Stop-CCC {
    Write-Host "Stopping CCC services..." -ForegroundColor Yellow
    if ($mockServer -and !$mockServer.HasExited) {
        Stop-Process -Id $mockServer.Id -Force
    }
    if ($coordinator -and !$coordinator.HasExited) {
        Stop-Process -Id $coordinator.Id -Force
    }
    # Stop any Java processes
    Get-Process | Where-Object {$_.ProcessName -like "*java*" -and $_.MainWindowTitle -like "*CCC*"} | Stop-Process -Force
    Write-Host "Services stopped" -ForegroundColor Green
}

# Register cleanup
Register-EngineEvent PowerShell.Exiting -Action { Stop-CCC }

Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Keep running
try {
    while ($true) {
        Start-Sleep -Seconds 1
        # Check if processes are still running
        if ($mockServer.HasExited -or $coordinator.HasExited) {
            Write-Host "One or more services have stopped" -ForegroundColor Red
            Stop-CCC
            break
        }
    }
} finally {
    Stop-CCC
}