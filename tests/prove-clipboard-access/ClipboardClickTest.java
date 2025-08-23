import java.awt.*;
import java.awt.event.InputEvent;

public class ClipboardClickTest {
    public static void main(String[] args) throws Exception {
        System.out.println("=== Simple Click Test - 10 Second Delay ===\n");
        System.out.println("INSTRUCTIONS:");
        System.out.println("1. Run this program");
        System.out.println("2. You have 10 seconds to:");
        System.out.println("   - Switch to your browser");
        System.out.println("   - Position mouse over the test button");
        System.out.println("   - Wait (don't click anything!)");
        System.out.println("\nStarting 10 second countdown NOW...\n");

        // Create Robot
        Robot robot = new Robot();

        // 10 second countdown
        for (int i = 10; i > 0; i--) {
            System.out.println(i + "...");
            Thread.sleep(1000);
        }

        System.out.println("\nCAPTURING MOUSE POSITION AND CLICKING!");

        // Get current mouse position
        Point pos = MouseInfo.getPointerInfo().getLocation();
        System.out.println("Mouse at: " + pos.x + ", " + pos.y);

        // Do 5 clicks with different timings
        for (int i = 1; i <= 5; i++) {
            System.out.println("\nClick " + i + " of 5:");

            // Ensure mouse is at position
            robot.mouseMove(pos.x, pos.y);
            robot.delay(100);

            // Click
            robot.mousePress(InputEvent.BUTTON1_DOWN_MASK);
            robot.delay(80); // Hold for 80ms
            robot.mouseRelease(InputEvent.BUTTON1_DOWN_MASK);

            System.out.println("  Click " + i + " done!");

            // Wait 2 seconds between clicks
            Thread.sleep(2000);
        }

        System.out.println("\n=== DONE! Check browser for results ===");
    }
}