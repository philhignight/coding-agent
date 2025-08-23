@echo off
echo ================================
echo CCC Button Calibration Tool
echo ================================
echo.

REM Check if Java is available
where java >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Java not found. Please install Java.
    exit /b 1
)

REM Check if javac is available
where javac >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: javac not found. Please install JDK.
    exit /b 1
)

REM Compile if needed
if not exist "tools\CalibrateButtons.class" (
    echo Compiling calibration tool...
    cd tools
    javac CalibrateButtons.java
    if %errorlevel% neq 0 (
        echo Compilation failed!
        cd ..
        exit /b 1
    )
    cd ..
)

REM Run the calibration tool
echo Starting calibration tool...
echo.
cd tools
java CalibrateButtons
cd ..

echo.
pause