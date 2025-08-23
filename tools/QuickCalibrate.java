import java.awt.*;
import java.util.Scanner;

public class QuickCalibrate {
    public static void main(String[] args) throws Exception {
        System.out.println("================================");
        System.out.println("CCC QUICK CALIBRATION");
        System.out.println("================================\n");
        
        System.out.println("This tool will capture your mouse position in 5 seconds.");
        System.out.println("You should position your mouse BETWEEN the two buttons.\n");
        
        System.out.println("INSTRUCTIONS:");
        System.out.println("1. Open http://dailyernest.com:5556/ in your browser");
        System.out.println("2. Press ENTER here");
        System.out.println("3. Quickly move your mouse to the SPACE BETWEEN the two buttons");
        System.out.println("4. Wait for capture\n");
        
        System.out.println("Press ENTER to start 5 second countdown...");
        
        Scanner scanner = new Scanner(System.in);
        scanner.nextLine();
        
        // 5 second countdown
        for (int i = 5; i > 0; i--) {
            System.out.println(i + "...");
            Thread.sleep(1000);
        }
        
        // Capture position
        Point centerPos = MouseInfo.getPointerInfo().getLocation();
        System.out.println("\n✓ Position captured: X=" + centerPos.x + ", Y=" + centerPos.y);
        
        // Calculate button positions (assuming buttons are 200 pixels apart)
        int readX = centerPos.x - 100;
        int readY = centerPos.y;
        int writeX = centerPos.x + 100;
        int writeY = centerPos.y;
        
        System.out.println("\nCalculated button positions:");
        System.out.println("  READ:  X=" + readX + ", Y=" + readY);
        System.out.println("  WRITE: X=" + writeX + ", Y=" + writeY);
        
        System.out.println("\n================================");
        System.out.println("RUN THIS COMMAND:");
        System.out.println("================================\n");
        
        System.out.println("PowerShell:");
        System.out.printf("Invoke-RestMethod -Uri \"http://localhost:5555/api/calibrate?readX=%d&readY=%d&writeX=%d&writeY=%d\"%n%n",
                          readX, readY, writeX, writeY);
        
        System.out.println("Or regular calibrate (single position):");
        System.out.printf("Invoke-RestMethod -Uri \"http://localhost:5555/api/calibrate?x=%d&y=%d\"%n",
                          centerPos.x, centerPos.y);
        
        scanner.close();
    }
}