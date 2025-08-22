import java.io.*;
import java.util.*;
import java.util.concurrent.*;

/**
 * Headless version of ClipboardAgent for testing without X11
 * This simulates clipboard and mouse operations for development/testing
 */
public class ClipboardAgentHeadless {
    private static String savedClipboard = "";
    private static String simulatedClipboard = "";
    private static int[] savedMousePosition = {0, 0};
    private static volatile boolean stopClicking = false;
    private static ExecutorService executor;
    private static boolean headlessMode = true;
    
    public static void main(String[] args) {
        try {
            // Check if we're in headless mode
            String display = System.getenv("DISPLAY");
            if (display == null || display.isEmpty()) {
                log("Running in headless mode (no X11 display)");
                log("Clipboard and mouse operations will be simulated");
                headlessMode = true;
            } else {
                log("Display found: " + display);
                headlessMode = false;
            }
            
            executor = Executors.newSingleThreadExecutor();
            
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
    
    private static void processCommand(String jsonCommand) {
        try {
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
            if (headlessMode) {
                // In headless mode, save the simulated clipboard
                savedClipboard = simulatedClipboard;
                sendResponse("clipboard_saved", savedClipboard.length() + " chars (simulated)");
            } else {
                // Would use real clipboard here
                sendResponse("clipboard_saved", "0 chars");
            }
        } catch (Exception e) {
            sendError("Failed to save clipboard: " + e.getMessage());
        }
    }
    
    private static void restoreClipboard() {
        try {
            if (headlessMode) {
                simulatedClipboard = savedClipboard;
                sendResponse("clipboard_restored", savedClipboard.length() + " chars (simulated)");
            } else {
                sendResponse("clipboard_restored", "0 chars");
            }
        } catch (Exception e) {
            sendError("Failed to restore clipboard: " + e.getMessage());
        }
    }
    
    private static void setClipboard(String data) {
        try {
            if (headlessMode) {
                simulatedClipboard = data;
                log("Simulated clipboard set: " + data.substring(0, Math.min(100, data.length())) + "...");
                sendResponse("clipboard_set", data.length() + " chars (simulated)");
            } else {
                sendResponse("clipboard_set", "0 chars");
            }
        } catch (Exception e) {
            sendError("Failed to set clipboard: " + e.getMessage());
        }
    }
    
    private static void getClipboard() {
        try {
            if (headlessMode) {
                sendResponse("clipboard_content", simulatedClipboard);
            } else {
                sendResponse("clipboard_content", "");
            }
        } catch (Exception e) {
            sendError("Failed to get clipboard: " + e.getMessage());
        }
    }
    
    private static void saveMousePosition() {
        if (headlessMode) {
            // Simulate saving mouse position
            savedMousePosition[0] = 100;
            savedMousePosition[1] = 100;
            sendResponse("mouse_saved", savedMousePosition[0] + "," + savedMousePosition[1] + " (simulated)");
        } else {
            sendResponse("mouse_saved", "0,0");
        }
    }
    
    private static void restoreMousePosition() {
        if (headlessMode) {
            sendResponse("mouse_restored", savedMousePosition[0] + "," + savedMousePosition[1] + " (simulated)");
        } else {
            sendResponse("mouse_restored", "0,0");
        }
    }
    
    private static void startClickLoop(int x, int y, int interval, int maxDuration) {
        stopClicking = false;
        
        executor.submit(() -> {
            try {
                long startTime = System.currentTimeMillis();
                int clickCount = 0;
                
                log("Starting simulated click loop at " + x + "," + y);
                
                while (!stopClicking && (System.currentTimeMillis() - startTime) < maxDuration) {
                    // Simulate clicking
                    clickCount++;
                    
                    if (clickCount % 10 == 0) {
                        log("Simulated clicks: " + clickCount);
                    }
                    
                    // Check clipboard for response every 5 clicks
                    if (clickCount % 5 == 0 && headlessMode) {
                        // Simulate finding a response after some clicks
                        if (clickCount == 15 && simulatedClipboard.contains("CCC_REQUEST")) {
                            // Simulate browser response
                            String mockResponse = "{\"type\":\"BROWSER_RESPONSE\",\"id\":\"mock-id\",\"status\":\"success\",\"payload\":{\"content\":\"Mock response from simulated browser\"}}|||BROWSER_END|||";
                            simulatedClipboard = mockResponse;
                            log("Simulated browser response written to clipboard");
                        }
                    }
                    
                    Thread.sleep(interval);
                }
                
                sendResponse("click_loop_complete", clickCount + " clicks (simulated)");
                
            } catch (Exception e) {
                sendError("Click loop failed: " + e.getMessage());
            }
        });
        
        sendResponse("click_loop_started", x + "," + y + " (simulated)");
    }
    
    private static void stopClicking() {
        stopClicking = true;
        sendResponse("clicking_stopped", null);
    }
    
    private static void setStatus(String message) {
        log("Status: " + message);
        sendResponse("status_set", message);
    }
    
    // Helper methods
    private static Map<String, Object> parseSimpleJson(String json) {
        Map<String, Object> result = new HashMap<>();
        
        json = json.trim();
        if (json.startsWith("{")) json = json.substring(1);
        if (json.endsWith("}")) json = json.substring(0, json.length() - 1);
        
        String[] pairs = json.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
        for (String pair : pairs) {
            String[] kv = pair.split(":", 2);
            if (kv.length == 2) {
                String key = kv[0].trim().replaceAll("\"", "");
                String value = kv[1].trim();
                
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
        System.err.println("[Headless Agent] " + message);
    }
}