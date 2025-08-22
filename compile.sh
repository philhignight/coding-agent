#!/bin/bash

echo "================================"
echo "CCC Build & Setup Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Java
echo "Checking Java installation..."
if command -v java &> /dev/null; then
    JAVA_VERSION=$(java -version 2>&1 | head -n 1)
    echo -e "${GREEN}✓${NC} Java found: $JAVA_VERSION"
else
    echo -e "${RED}✗${NC} Java not found. Please install Java 8 or higher."
    echo "  Ubuntu/Debian: sudo apt-get install default-jdk"
    echo "  macOS: brew install openjdk"
    echo "  Windows: Download from https://adoptium.net/"
    exit 1
fi

# Check javac
echo "Checking Java compiler..."
if command -v javac &> /dev/null; then
    JAVAC_VERSION=$(javac -version 2>&1)
    echo -e "${GREEN}✓${NC} Java compiler found: $JAVAC_VERSION"
else
    echo -e "${RED}✗${NC} Java compiler (javac) not found. Please install JDK (not just JRE)."
    exit 1
fi

# Check Node.js
echo "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js found: $NODE_VERSION"
    
    # Check version (need 14+)
    NODE_MAJOR=$(node --version | cut -d. -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -lt 14 ]; then
        echo -e "${YELLOW}⚠${NC} Warning: Node.js version 14+ recommended (you have $NODE_VERSION)"
    fi
else
    echo -e "${RED}✗${NC} Node.js not found. Please install Node.js 14 or higher."
    echo "  Download from: https://nodejs.org/"
    exit 1
fi

echo ""
echo "================================"
echo "Compiling Java Agent..."
echo "================================"

cd src/java-agent

# Clean up old files
rm -f agent.jar agent-headless.jar ClipboardAgent*.class manifest.txt

# Check if display is available
if [ -z "$DISPLAY" ]; then
    echo -e "${YELLOW}⚠${NC} No X11 display detected, compiling headless version only"
    
    # Compile headless agent
    echo "Compiling ClipboardAgentHeadless.java..."
    javac ClipboardAgentHeadless.java
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗${NC} Java compilation failed"
        exit 1
    fi
    
    # Create manifest for headless JAR
    echo "Main-Class: ClipboardAgentHeadless" > manifest.txt
    
    # Create headless JAR
    jar cfm agent-headless.jar manifest.txt ClipboardAgentHeadless.class
    
    # Link as main agent.jar
    cp agent-headless.jar agent.jar
    
    # Clean up
    rm -f ClipboardAgentHeadless.class manifest.txt
    
    echo -e "${GREEN}✓${NC} Headless Java agent compiled successfully"
else
    echo "X11 display found, compiling full version..."
    
    # Compile full agent
    echo "Compiling ClipboardAgent.java..."
    javac ClipboardAgent.java
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗${NC} Java compilation failed"
        exit 1
    fi
    
    # Also compile headless for testing
    echo "Compiling headless version for testing..."
    javac ClipboardAgentHeadless.java
    
    # Create manifest for full JAR
    echo "Main-Class: ClipboardAgent" > manifest.txt
    jar cfm agent.jar manifest.txt ClipboardAgent.class
    
    # Create manifest for headless JAR
    echo "Main-Class: ClipboardAgentHeadless" > manifest.txt
    jar cfm agent-headless.jar manifest.txt ClipboardAgentHeadless.class
    
    # Clean up
    rm -f ClipboardAgent*.class manifest.txt
    
    echo -e "${GREEN}✓${NC} Both Java agents compiled successfully"
fi

cd ../..

echo ""
echo "================================"
echo "Setup Complete!"
echo "================================"
echo ""
echo -e "${GREEN}✓${NC} All components ready"
echo ""
echo "Quick Start Guide:"
echo "1. Run the test environment:"
echo "   ${YELLOW}./test.sh${NC}"
echo ""
echo "2. Open the mock UI in browser:"
echo "   ${YELLOW}http://localhost:3001${NC}"
echo ""
echo "3. The coordinator API will be at:"
echo "   ${YELLOW}http://localhost:3000${NC}"
echo ""
echo "For production use, see README.md"
echo ""