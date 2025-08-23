// Clipboard Test JavaScript - Paste this into browser DevTools console

(() => {
  console.clear();
  console.log(
    "%c=== Clipboard Click Test Started ===",
    "color: blue; font-size: 16px"
  );

  // Remove any existing test elements
  const existing = document.getElementById("clipboard-test-container");
  if (existing) existing.remove();

  // Create test UI
  const container = document.createElement("div");
  container.id = "clipboard-test-container";
  container.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 3px solid #007bff;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 999999;
        font-family: monospace;
        min-width: 400px;
    `;

  container.innerHTML = `
        <h2 style="margin-top: 0; color: #007bff;">Clipboard Test Interface</h2>
        <div style="margin: 20px 0;">
            <button id="test-write-btn" style="
                background: #28a745;
                color: white;
                border: none;
                padding: 15px 30px;
                font-size: 16px;
                cursor: pointer;
                border-radius: 5px;
                margin-right: 10px;
            ">Test Write Clipboard</button>
            
            <button id="test-read-btn" style="
                background: #17a2b8;
                color: white;
                border: none;
                padding: 15px 30px;
                font-size: 16px;
                cursor: pointer;
                border-radius: 5px;
            ">Test Read Clipboard</button>
        </div>
        <div id="status" style="
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
            min-height: 100px;
            white-space: pre-wrap;
        ">Ready for testing...</div>
        <div style="margin-top: 15px; color: #666;">
            <small>Position mouse over a button and run the Java program</small>
        </div>
    `;

  document.body.appendChild(container);

  const statusDiv = document.getElementById("status");
  let clickCount = 0;
  let successCount = 0;
  let failCount = 0;

  function log(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    const color =
      type === "success" ? "green" : type === "error" ? "red" : "black";
    const logMessage = `[${timestamp}] ${message}`;

    statusDiv.innerHTML += `<div style="color: ${color}">${logMessage}</div>`;
    statusDiv.scrollTop = statusDiv.scrollHeight;

    // Also log to console
    if (type === "success") {
      console.log("%c✓ " + logMessage, "color: green");
    } else if (type === "error") {
      console.error("✗ " + logMessage);
    } else {
      console.log(logMessage);
    }
  }

  // Test Write Button
  document
    .getElementById("test-write-btn")
    .addEventListener("click", async (e) => {
      clickCount++;
      const testText = `Test clipboard write #${clickCount} at ${new Date().toISOString()}`;

      log(`Click #${clickCount}: Attempting to write to clipboard...`);

      try {
        // Try modern clipboard API
        await navigator.clipboard.writeText(testText);
        successCount++;
        log(`SUCCESS: Wrote "${testText}" to clipboard`, "success");

        // Verify by reading it back
        try {
          const readBack = await navigator.clipboard.readText();
          log(`Verification: Read back "${readBack}"`, "success");
        } catch (readErr) {
          log(`Could not verify (read blocked): ${readErr.message}`, "error");
        }
      } catch (error) {
        failCount++;
        log(`FAILED: ${error.message}`, "error");

        // Try fallback method
        log("Trying fallback method (execCommand)...");
        try {
          const textarea = document.createElement("textarea");
          textarea.value = testText;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          const success = document.execCommand("copy");
          document.body.removeChild(textarea);

          if (success) {
            successCount++;
            failCount--; // Correct the count
            log("SUCCESS with fallback method!", "success");
          } else {
            log("Fallback method also failed", "error");
          }
        } catch (fallbackErr) {
          log(`Fallback error: ${fallbackErr.message}`, "error");
        }
      }

      updateStats();
    });

  // Test Read Button
  document
    .getElementById("test-read-btn")
    .addEventListener("click", async (e) => {
      clickCount++;
      log(`Click #${clickCount}: Attempting to read from clipboard...`);

      try {
        const text = await navigator.clipboard.readText();
        successCount++;
        log(`SUCCESS: Read "${text}" from clipboard`, "success");
      } catch (error) {
        failCount++;
        log(`FAILED: ${error.message}`, "error");

        // Note: There's no reliable fallback for reading clipboard in modern browsers
        log("Note: Reading clipboard has no fallback method", "info");
      }

      updateStats();
    });

  function updateStats() {
    log(
      `\n--- Stats: ${successCount} successes, ${failCount} failures out of ${clickCount} clicks ---\n`
    );
  }

  // Add keyboard listener for manual testing
  document.addEventListener("keydown", (e) => {
    if (e.key === "w" && e.ctrlKey) {
      log("Manual Ctrl+W pressed (write test)");
      document.getElementById("test-write-btn").click();
    } else if (e.key === "r" && e.ctrlKey) {
      log("Manual Ctrl+R pressed (read test)");
      document.getElementById("test-read-btn").click();
    }
  });

  // Monitor for any click events
  let lastClickTime = 0;
  document.addEventListener(
    "click",
    (e) => {
      const now = Date.now();
      const timeSinceLastClick = now - lastClickTime;
      lastClickTime = now;

      // Log ALL clicks for debugging
      console.log(
        `%cClick detected!`,
        "background: yellow; color: black; font-weight: bold"
      );
      console.log(`  Target: ${e.target.tagName}#${e.target.id || "(no-id)"}`);
      console.log(`  isTrusted: ${e.isTrusted}`);
      console.log(`  Time since last click: ${timeSinceLastClick}ms`);

      if (e.target.id === "test-write-btn" || e.target.id === "test-read-btn") {
        console.log(
          `%c>>> BUTTON CLICKED: ${e.target.id} <<<`,
          "background: green; color: white; font-size: 14px"
        );
      }
    },
    true
  );

  // Also monitor mousedown/mouseup
  document.addEventListener(
    "mousedown",
    (e) => {
      console.log(`%cMouse DOWN detected`, "color: orange");
    },
    true
  );

  document.addEventListener(
    "mouseup",
    (e) => {
      console.log(`%cMouse UP detected`, "color: orange");
    },
    true
  );

  log(
    "Test interface ready! Position your mouse over a button and run the Java program."
  );
  log("The Java program will simulate clicks on the button.");
  log("Watch for SUCCESS or FAILED messages.\n");
})();