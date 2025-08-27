#!/bin/bash

echo "Compiling Java agents..."

# Clean up old files
rm -f agent.jar agent-headless.jar ClipboardAgent*.class manifest.txt

# Check if display is available
if [ -z "$DISPLAY" ]; then
    echo "No X11 display detected, compiling headless version only"
    
    # Compile headless agent
    javac ClipboardAgentHeadless.java
    
    if [ $? -ne 0 ]; then
        echo "ERROR: Java compilation failed"
        exit 1
    fi
    
    # Create manifest for headless JAR
    echo "Main-Class: ClipboardAgentHeadless" > manifest.txt
    
    # Create headless JAR
    jar cfm agent-headless.jar manifest.txt ClipboardAgentHeadless.class
    
    # Link as main agent.jar
    cp agent-headless.jar agent.jar
    
    echo "Headless Java agent compiled successfully"
else
    echo "X11 display found, compiling both versions..."
    
    # Compile full agent
    javac ClipboardAgent.java
    
    if [ $? -ne 0 ]; then
        echo "ERROR: Java compilation failed"
        exit 1
    fi
    
    # Also compile headless for testing
    javac ClipboardAgentHeadless.java
    
    # Create manifest for full JAR
    echo "Main-Class: ClipboardAgent" > manifest.txt
    jar cfm agent.jar manifest.txt ClipboardAgent.class
    
    # Create manifest for headless JAR
    echo "Main-Class: ClipboardAgentHeadless" > manifest.txt
    jar cfm agent-headless.jar manifest.txt ClipboardAgentHeadless.class
    
    echo "Both Java agents compiled successfully"
fi

# Clean up
rm -f ClipboardAgent*.class manifest.txt

echo "Done. Available JARs:"
ls -la *.jar