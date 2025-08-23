import java.awt.*;
import java.awt.datatransfer.*;
import java.awt.event.InputEvent;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;
import javax.swing.*;

public class ClipboardAgent {
    private static Clipboard clipboard;
    private static Robot robot;
    private static String savedClipboard = "";
    private static Point savedMousePosition = new Point(0, 0);
    private static volatile boolean stopClicking = false;
    private static TrayIcon trayIcon;
    private static ExecutorService executor;
    
    public static void main(String[] args) {
        try {
            // Initialize components
            clipboard = Toolkit.getDefaultToolkit().getSystemClipboard();
            robot = new Robot();
            executor = Executors.newSingleThreadExecutor();
            
            // Setup system tray
            setupSystemTray();
            
            // Process commands from stdin
            Scanner scanner = new Scanner(System.in);
            while (scanner.hasNextLine()) {
                String line = scanner.nextLine();
                processCommand(line);
            }
            
        } catch (Exception e) {
            sendError("Initialization failed: " + e.getMessage());
            System.exit(1);
        }
    }
    
    private static void setupSystemTray() {
        if (!SystemTray.isSupported()) {
            log("System tray not supported");
            return;
        }
        
        try {
            SystemTray tray = SystemTray.getSystemTray();
            
            // Create a simple icon (16x16 green square)
            Image image = new BufferedImage(16, 16, BufferedImage.TYPE_INT_RGB);
            Graphics g = image.getGraphics();
            g.setColor(Color.GREEN);
            g.fillRect(0, 0, 16, 16);
            g.dispose();
            
            // Create tray icon
            trayIcon = new TrayIcon(image, "CCC Agent");
            trayIcon.setImageAutoSize(true);
            
            // Add popup menu
            PopupMenu popup = new PopupMenu();
            MenuItem statusItem = new MenuItem("Status: Ready");
            MenuItem exitItem = new MenuItem("Exit");
            exitItem.addActionListener(e -> System.exit(0));
            
            popup.add(statusItem);
            popup.addSeparator();
            popup.add(exitItem);
            
            trayIcon.setPopupMenu(popup);
            tray.add(trayIcon);
            
            log("System tray initialized");
            
        } catch (Exception e) {
            log("Failed to setup system tray: " + e.getMessage());
        }
    }
    
    private static void processCommand(String jsonCommand) {
        try {
            // Parse JSON manually (avoiding external dependencies)
            Map<String, Object> cmd = parseSimpleJson(jsonCommand);
            String command = (String) cmd.get("cmd");
            
            switch (command) {
                case "SAVE_CLIPBOARD":
                    saveClipboard();
                    break;
                    
                case "RESTORE_CLIPBOARD":
                    restoreClipboard();
                    break;
                    
                case "SET_CLIPBOARD":
                    setClipboard((String) cmd.get("data"));
                    break;
                    
                case "GET_CLIPBOARD":
                    getClipboard();
                    break;
                    
                case "SAVE_MOUSE":
                    saveMousePosition();
                    break;
                    
                case "RESTORE_MOUSE":
                    restoreMousePosition();
                    break;
                    
                case "CLICK_LOOP":
                    startClickLoop(
                        parseInt(cmd.get("x")),
                        parseInt(cmd.get("y")),
                        parseInt(cmd.get("interval")),
                        parseInt(cmd.get("maxDuration"))
                    );
                    break;
                    
                case "STOP_CLICKING":
                    stopClicking();
                    break;
                    
                case "SET_STATUS":
                    setStatus((String) cmd.get("message"));
                    break;
                    
                case "PING":
                    sendResponse("pong", null);
                    break;
                    
                default:
                    sendError("Unknown command: " + command);
            }
            
        } catch (Exception e) {
            sendError("Command processing failed: " + e.getMessage());
        }
    }
    
    private static void saveClipboard() {
        try {
            Transferable contents = clipboard.getContents(null);
            if (contents != null && contents.isDataFlavorSupported(DataFlavor.stringFlavor)) {
                savedClipboard = (String) contents.getTransferData(DataFlavor.stringFlavor);
                sendResponse("clipboard_saved", savedClipboard.length() + " chars");
            } else {
                savedClipboard = "";
                sendResponse("clipboard_saved", "empty");
            }
        } catch (Exception e) {
            sendError("Failed to save clipboard: " + e.getMessage());
        }
    }
    
    private static void restoreClipboard() {
        try {
            StringSelection selection = new StringSelection(savedClipboard);
            clipboard.setContents(selection, null);
            sendResponse("clipboard_restored", savedClipboard.length() + " chars");
        } catch (Exception e) {
            sendError("Failed to restore clipboard: " + e.getMessage());
        }
    }
    
    private static void setClipboard(String data) {
        try {
            StringSelection selection = new StringSelection(data);
            clipboard.setContents(selection, null);
            sendResponse("clipboard_set", data.length() + " chars");
        } catch (Exception e) {
            sendError("Failed to set clipboard: " + e.getMessage());
        }
    }
    
    private static void getClipboard() {
        try {
            Transferable contents = clipboard.getContents(null);
            if (contents != null && contents.isDataFlavorSupported(DataFlavor.stringFlavor)) {
                String data = (String) contents.getTransferData(DataFlavor.stringFlavor);
                sendResponse("clipboard_content", data);
            } else {
                sendResponse("clipboard_content", "");
            }
        } catch (Exception e) {
            sendError("Failed to get clipboard: " + e.getMessage());
        }
    }
    
    private static void saveMousePosition() {
        savedMousePosition = MouseInfo.getPointerInfo().getLocation();
        sendResponse("mouse_saved", savedMousePosition.x + "," + savedMousePosition.y);
    }
    
    private static void restoreMousePosition() {
        robot.mouseMove(savedMousePosition.x, savedMousePosition.y);
        sendResponse("mouse_restored", savedMousePosition.x + "," + savedMousePosition.y);
    }
    
    private static void startClickLoop(int x, int y, int interval, int maxDuration) {
        stopClicking = false;
        
        executor.submit(() -> {
            try {
                long startTime = System.currentTimeMillis();
                int clickCount = 0;
                
                while (!stopClicking && (System.currentTimeMillis() - startTime) < maxDuration) {
                    // Move to position
                    robot.mouseMove(x, y);
                    robot.delay(50);
                    
                    // Click with hold time (like the proven test)
                    robot.mousePress(InputEvent.BUTTON1_DOWN_MASK);
                    robot.delay(80); // Hold for 80ms like the test
                    robot.mouseRelease(InputEvent.BUTTON1_DOWN_MASK);
                    clickCount++;
                    
                    // Wait for interval (use longer interval for more deliberate clicks)
                    Thread.sleep(Math.max(interval, 500)); // At least 500ms between clicks
                }
                
                sendResponse("click_loop_complete", clickCount + " clicks");
                
            } catch (Exception e) {
                sendError("Click loop failed: " + e.getMessage());
            }
        });
        
        sendResponse("click_loop_started", x + "," + y);
    }
    
    private static void stopClicking() {
        stopClicking = true;
        sendResponse("clicking_stopped", null);
    }
    
    private static void setStatus(String message) {
        if (trayIcon != null) {
            trayIcon.setToolTip("CCC Agent: " + message);
        }
        sendResponse("status_set", message);
    }
    
    // Helper methods
    private static Map<String, Object> parseSimpleJson(String json) {
        Map<String, Object> result = new HashMap<>();
        
        // Remove braces and split by comma
        json = json.trim();
        if (json.startsWith("{")) json = json.substring(1);
        if (json.endsWith("}")) json = json.substring(0, json.length() - 1);
        
        // Parse key-value pairs
        String[] pairs = json.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
        for (String pair : pairs) {
            String[] kv = pair.split(":", 2);
            if (kv.length == 2) {
                String key = kv[0].trim().replaceAll("\"", "");
                String value = kv[1].trim();
                
                // Remove quotes from string values
                if (value.startsWith("\"") && value.endsWith("\"")) {
                    value = value.substring(1, value.length() - 1);
                }
                
                result.put(key, value);
            }
        }
        
        return result;
    }
    
    private static int parseInt(Object value) {
        if (value == null) return 0;
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
    
    private static void sendResponse(String type, String data) {
        String response = String.format("{\"type\":\"%s\",\"data\":\"%s\",\"timestamp\":%d}",
            type, data != null ? data : "", System.currentTimeMillis());
        System.out.println(response);
        System.out.flush();
    }
    
    private static void sendError(String error) {
        String response = String.format("{\"type\":\"error\",\"error\":\"%s\",\"timestamp\":%d}",
            error, System.currentTimeMillis());
        System.out.println(response);
        System.out.flush();
    }
    
    private static void log(String message) {
        System.err.println("[Agent] " + message);
    }
}