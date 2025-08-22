@echo off
echo ================================
echo CCC Build Script for Windows
echo ================================
echo.

REM Check Java
where java >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Java not found. Please install Java 8 or higher.
    echo Download from: https://adoptium.net/
    exit /b 1
)

echo Checking Java version...
java -version 2>&1

REM Check javac
where javac >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Java compiler ^(javac^) not found. Please install JDK ^(not just JRE^).
    echo Make sure JAVA_HOME is set and %%JAVA_HOME%%\bin is in your PATH
    exit /b 1
)

echo Checking Java compiler...
javac -version 2>&1

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js 14 or higher.
    echo Download from: https://nodejs.org/
    exit /b 1
)

echo Checking Node.js version...
node --version

echo.
echo ================================
echo Compiling Java Agent...
echo ================================

cd src\java-agent

REM Clean up old files
del /f /q agent.jar agent-headless.jar *.class manifest.txt 2>nul

REM Compile main agent
echo Compiling ClipboardAgent.java...
javac ClipboardAgent.java
if %errorlevel% neq 0 (
    echo ERROR: Java compilation failed for ClipboardAgent
    cd ..\..
    exit /b 1
)

REM Compile headless agent
echo Compiling ClipboardAgentHeadless.java...
javac ClipboardAgentHeadless.java
if %errorlevel% neq 0 (
    echo ERROR: Java compilation failed for ClipboardAgentHeadless
    cd ..\..
    exit /b 1
)

REM Create manifest for main JAR
echo Creating manifest for main agent...
echo Main-Class: ClipboardAgent> manifest.txt

REM Create main JAR
echo Building agent.jar...
jar cfm agent.jar manifest.txt ClipboardAgent.class
if %errorlevel% neq 0 (
    echo ERROR: JAR creation failed for agent.jar
    cd ..\..
    exit /b 1
)

REM Create manifest for headless JAR
echo Main-Class: ClipboardAgentHeadless> manifest.txt

REM Create headless JAR
echo Building agent-headless.jar...
jar cfm agent-headless.jar manifest.txt ClipboardAgentHeadless.class
if %errorlevel% neq 0 (
    echo ERROR: JAR creation failed for agent-headless.jar
    cd ..\..
    exit /b 1
)

REM Clean up
del /f /q *.class manifest.txt

echo SUCCESS: Java agents compiled successfully

cd ..\..

echo.
echo ================================
echo Setup Complete!
echo ================================
echo.
echo All components ready
echo.
echo Quick Start Guide:
echo 1. Run the test environment:
echo    start.bat
echo.
echo 2. Open the mock UI in browser:
echo    http://localhost:3001
echo.
echo 3. The coordinator API will be at:
echo    http://localhost:3000
echo.
echo For production use, see README.md
echo.