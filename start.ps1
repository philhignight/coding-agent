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

# Always recompile to ensure latest changes
Write-Host "Compiling Java agent..." -ForegroundColor Yellow
if (Test-Path "compile.bat") {
    & .\compile.bat
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Compilation failed. Exiting." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "compile.bat not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting CCC components..." -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:MOCK_PORT = "5556"
$env:COORDINATOR_PORT = "5555"

# Start mock server
Write-Host "Starting mock API server on port 5556..." -ForegroundColor Yellow
$mockServer = Start-Process -FilePath "node" -ArgumentList "mock-env\server.js" -PassThru -WindowStyle Normal -WorkingDirectory $PWD

Start-Sleep -Seconds 2

# Start coordinator
Write-Host "Starting coordinator on port 5555..." -ForegroundColor Yellow
$coordinator = Start-Process -FilePath "node" -ArgumentList "src\node-server\coordinator.js" -PassThru -WindowStyle Normal -WorkingDirectory $PWD

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "CCC is running!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Mock UI:     " -NoNewline; Write-Host "http://localhost:5556" -ForegroundColor Cyan
Write-Host "Coordinator: " -NoNewline; Write-Host "http://localhost:5555" -ForegroundColor Cyan
Write-Host ""

# Auto-calibrate with hardcoded coordinates
Write-Host "Auto-calibrating button positions..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5555/api/calibrate?readX=360&readY=216&writeX=630&writeY=207" -Method Get
    Write-Host "✓ Calibration successful!" -ForegroundColor Green
    Write-Host "  READ button:  X=360, Y=216" -ForegroundColor Gray
    Write-Host "  WRITE button: X=630, Y=207" -ForegroundColor Gray
} catch {
    Write-Host "⚠ Auto-calibration failed. You may need to calibrate manually." -ForegroundColor Yellow
}

# Test connection
Write-Host ""
Write-Host "Testing connection..." -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod -Uri "http://localhost:5555/api/status" -Method Get
    Write-Host "✓ Coordinator is responding" -ForegroundColor Green
    Write-Host "  Java Agent: $($status.javaAgent)" -ForegroundColor Gray
    Write-Host "  Calibrated: $($status.calibrated)" -ForegroundColor Gray
} catch {
    Write-Host "⚠ Coordinator not responding yet" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open browser: " -NoNewline; Write-Host "http://localhost:5556" -ForegroundColor Yellow
Write-Host "2. Wait for " -NoNewline; Write-Host "CCC BRIDGE ACTIVE" -ForegroundColor Green -NoNewline; Write-Host " indicator"
Write-Host "3. Test chat:"
Write-Host '   $body = @{message="Hello"} | ConvertTo-Json' -ForegroundColor Gray
Write-Host '   Invoke-RestMethod -Uri "http://localhost:5555/api/chat" -Method Post -Body $body -ContentType "application/json"' -ForegroundColor Gray
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