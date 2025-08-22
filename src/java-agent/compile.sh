#!/bin/bash

# Compile the Java agent
javac -d . ClipboardAgent.java

# Create manifest for JAR
echo "Main-Class: ClipboardAgent" > manifest.txt

# Create JAR file
jar cfm agent.jar manifest.txt ClipboardAgent*.class

# Clean up
rm -f ClipboardAgent*.class manifest.txt

echo "Java agent compiled to agent.jar"
echo "Run with: java -jar agent.jar"