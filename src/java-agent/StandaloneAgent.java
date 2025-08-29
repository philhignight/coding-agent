import java.awt.*;
import java.awt.datatransfer.*;
import java.awt.event.InputEvent;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;
import javax.swing.*;

public class StandaloneAgent {
    private static Clipboard clipboard;
    private static Robot robot;
    private static String savedClipboard = "";
    private static Point clickPosition = null;
    private static volatile boolean calibrated = false;
    private static TrayIcon trayIcon;
    
    public static void main(String[] args) {
        try {
            // Initialize components
            clipboard = Toolkit.getDefaultToolkit().getSystemClipboard();
            robot = new Robot();
            
            // Setup system tray
            setupSystemTray();
            
            // Start the demo flow
            runDemo();
            
        } catch (Exception e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
    
    private static void setupSystemTray() {
        if (!SystemTray.isSupported()) {
            System.out.println("System tray not supported");
            return;
        }
        
        try {
            SystemTray tray = SystemTray.getSystemTray();
            
            // Create icon (16x16 pixels)
            BufferedImage image = new BufferedImage(16, 16, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = image.createGraphics();
            g.setColor(Color.GREEN);
            g.fillOval(0, 0, 16, 16);
            g.dispose();
            
            trayIcon = new TrayIcon(image, "CCC Agent - Ready");
            trayIcon.setImageAutoSize(true);
            
            // Add popup menu
            PopupMenu popup = new PopupMenu();
            MenuItem statusItem = new MenuItem("Status: Waiting for calibration");
            MenuItem exitItem = new MenuItem("Exit");
            exitItem.addActionListener(e -> System.exit(0));
            
            popup.add(statusItem);
            popup.addSeparator();
            popup.add(exitItem);
            
            trayIcon.setPopupMenu(popup);
            tray.add(trayIcon);
            
            System.out.println("System tray initialized");
            
        } catch (Exception e) {
            System.out.println("Failed to setup system tray: " + e.getMessage());
        }
    }
    
    private static void runDemo() throws Exception {
        System.out.println("================================");
        System.out.println("CCC Demo - Java Standalone");
        System.out.println("================================");
        System.out.println();
        System.out.println("Waiting for calibration...");
        System.out.println("Please paste the bridge script and click to calibrate");
        System.out.println();
        
        // Wait for calibration
        waitForCalibration();
        
        // Send test AI request
        sendAIRequest();
        
        // Wait for response
        waitForResponse();
        
        System.out.println("Demo completed!");
    }
    
    private static void waitForCalibration() throws Exception {
        System.out.println("[Demo] Waiting for calibration click...");
        
        while (!calibrated) {
            Thread.sleep(1000);
            
            try {
                String clipboardText = getClipboardContent();
                if (clipboardText != null && clipboardText.contains("CCC_CALIBRATION")) {
                    processCalibration(clipboardText);
                }
            } catch (Exception e) {
                // Ignore clipboard errors
            }
        }
    }
    
    private static void processCalibration(String content) throws Exception {
        System.out.println("[Demo] Calibration click detected!");
        
        // Get current mouse position
        Point mousePos = MouseInfo.getPointerInfo().getLocation();
        clickPosition = mousePos;
        calibrated = true;
        
        System.out.println("[Demo] Captured mouse position: " + mousePos.x + ", " + mousePos.y);
        
        // Update tray icon
        if (trayIcon != null) {
            PopupMenu popup = trayIcon.getPopupMenu();
            if (popup.getItemCount() > 0) {
                MenuItem statusItem = popup.getItem(0);
                statusItem.setLabel("Status: Calibrated - Sending AI request");
            }
        }
        
        // Clear clipboard
        setClipboard("");
        Thread.sleep(1000);
    }
    
    private static void sendAIRequest() throws Exception {
        System.out.println("[Demo] Sending AI request...");
        
        // Create test request
        String request = String.format(
            "{\"type\":\"CCC_REQUEST\",\"id\":\"%s\",\"timestamp\":%d,\"action\":\"ai-complete\",\"payload\":{\"prompt\":\"Write a haiku about clipboard bridges between programs\"}}|||CCC_END|||",
            generateUUID(),
            System.currentTimeMillis()
        );
        
        // Set clipboard
        setClipboard(request);
        Thread.sleep(2000);
        
        // Click at calibrated position
        System.out.println("[Demo] Clicking at calibrated position...");
        robot.mouseMove(clickPosition.x, clickPosition.y);
        Thread.sleep(500);
        
        // Single click
        robot.mousePress(InputEvent.BUTTON1_DOWN_MASK);
        robot.delay(100);
        robot.mouseRelease(InputEvent.BUTTON1_DOWN_MASK);
        
        System.out.println("[Demo] Request sent, waiting for response...");
    }
    
    private static void waitForResponse() throws Exception {
        int timeout = 60; // 60 seconds timeout
        int elapsed = 0;
        
        while (elapsed < timeout) {
            Thread.sleep(1000);
            elapsed++;
            
            try {
                String clipboardText = getClipboardContent();
                if (clipboardText != null && clipboardText.contains("BROWSER_RESPONSE")) {
                    processResponse(clipboardText);
                    return;
                }
            } catch (Exception e) {
                // Ignore clipboard errors
            }
            
            if (elapsed % 5 == 0) {
                System.out.println("[Demo] Still waiting... (" + elapsed + "s)");
            }
        }
        
        System.out.println("[Demo] Response timeout after " + timeout + " seconds");
    }
    
    private static void processResponse(String content) throws Exception {
        try {
            String responseText = content.split("\\|\\|\\|BROWSER_END\\|\\|\\|")[0];
            // Simple JSON parsing for the response content
            if (responseText.contains("\"content\":")) {
                String contentStart = "\"content\":\"";
                int start = responseText.indexOf(contentStart) + contentStart.length();
                int end = responseText.indexOf("\",", start);
                if (end == -1) end = responseText.indexOf("\"}", start);
                
                if (start > 0 && end > start) {
                    String aiResponse = responseText.substring(start, end);
                    System.out.println();
                    System.out.println("================================");
                    System.out.println("AI Response Received!");
                    System.out.println("================================");
                    System.out.println(aiResponse);
                    System.out.println("================================");
                    System.out.println();
                }
            }
            
            // Update tray icon
            if (trayIcon != null) {
                PopupMenu popup = trayIcon.getPopupMenu();
                if (popup.getItemCount() > 0) {
                    MenuItem statusItem = popup.getItem(0);
                    statusItem.setLabel("Status: Success! Response received");
                }
            }
            
        } catch (Exception e) {
            System.out.println("[Demo] Error parsing response: " + e.getMessage());
        }
    }
    
    private static String getClipboardContent() throws Exception {
        Transferable contents = clipboard.getContents(null);
        if (contents != null && contents.isDataFlavorSupported(DataFlavor.stringFlavor)) {
            return (String) contents.getTransferData(DataFlavor.stringFlavor);
        }
        return null;
    }
    
    private static void setClipboard(String text) throws Exception {
        StringSelection selection = new StringSelection(text);
        clipboard.setContents(selection, null);
    }
    
    private static String generateUUID() {
        return UUID.randomUUID().toString();
    }
}