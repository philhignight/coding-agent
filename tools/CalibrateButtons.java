import java.awt.*;
import java.util.Scanner;

public class CalibrateButtons {
    public static void main(String[] args) throws Exception {
        System.out.println("================================");
        System.out.println("CCC BUTTON CALIBRATION TOOL");
        System.out.println("================================\n");
        
        Scanner scanner = new Scanner(System.in);
        Point readButtonPos = null;
        Point writeButtonPos = null;
        
        // Calibrate READ button
        System.out.println("STEP 1: Calibrate READ Button (Green)");
        System.out.println("---------------------------------------");
        System.out.println("1. Open http://dailyernest.com:5556/ in your browser");
        System.out.println("2. Position this console window so you can see both");
        System.out.println("3. When ready, press ENTER and you'll have 10 seconds to:");
        System.out.println("   - Move your mouse to the CENTER of the READ CLIPBOARD button");
        System.out.println("   - Keep it there and wait");
        System.out.println("\nPress ENTER when ready...");
        scanner.nextLine();
        
        // 10 second countdown for READ button
        for (int i = 10; i > 0; i--) {
            System.out.println(i + "...");
            Thread.sleep(1000);
        }
        
        // Capture READ button position
        readButtonPos = MouseInfo.getPointerInfo().getLocation();
        System.out.println("\n✓ READ Button position captured: X=" + readButtonPos.x + ", Y=" + readButtonPos.y);
        
        Thread.sleep(2000);
        
        // Calibrate WRITE button
        System.out.println("\n\nSTEP 2: Calibrate WRITE Button (Blue)");
        System.out.println("---------------------------------------");
        System.out.println("Now hover over the WRITE RESPONSE button");
        System.out.println("Press ENTER when ready...");
        scanner.nextLine();
        
        // 10 second countdown for WRITE button
        for (int i = 10; i > 0; i--) {
            System.out.println(i + "...");
            Thread.sleep(1000);
        }
        
        // Capture WRITE button position
        writeButtonPos = MouseInfo.getPointerInfo().getLocation();
        System.out.println("\n✓ WRITE Button position captured: X=" + writeButtonPos.x + ", Y=" + writeButtonPos.y);
        
        // Display results
        System.out.println("\n================================");
        System.out.println("CALIBRATION COMPLETE!");
        System.out.println("================================\n");
        System.out.println("Button Positions:");
        System.out.println("  READ:  X=" + readButtonPos.x + ", Y=" + readButtonPos.y);
        System.out.println("  WRITE: X=" + writeButtonPos.x + ", Y=" + writeButtonPos.y);
        
        System.out.println("\nPowerShell command to calibrate CCC:");
        System.out.println("---------------------------------------");
        System.out.printf("Invoke-RestMethod -Uri \"http://localhost:5555/api/calibrate?readX=%d&readY=%d&writeX=%d&writeY=%d\"%n",
                          readButtonPos.x, readButtonPos.y, writeButtonPos.x, writeButtonPos.y);
        
        System.out.println("\nCurl command:");
        System.out.println("-------------");
        System.out.printf("curl \"http://localhost:5555/api/calibrate?readX=%d&readY=%d&writeX=%d&writeY=%d\"%n",
                          readButtonPos.x, readButtonPos.y, writeButtonPos.x, writeButtonPos.y);
        
        System.out.println("\n✓ Copy and run one of the commands above to calibrate CCC!");
        
        scanner.close();
    }
}