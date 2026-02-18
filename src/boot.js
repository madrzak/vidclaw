/**
 * Boot script for VidClaw
 *
 * This file is loaded BEFORE any React code to detect and disable
 * broken MessageChannel/MessagePort implementations that cause
 * "Illegal constructor" errors in the React scheduler.
 *
 * If MessageChannel is not constructible, we force React's scheduler
 * to fall back to setTimeout by removing these globals from the
 * runtime before React loads.
 */

(function detectAndFixMessageChannel() {
  try {
    // Test if MessageChannel is constructible
    const channel = new MessageChannel();
    // If we got here, it's working - nothing to do
    channel.port1.close();
    channel.port2.close();
  } catch (e) {
    // MessageChannel is broken (throws Illegal constructor)
    console.warn('MessageChannel not constructible (Illegal constructor). Disabling to force React scheduler to use setTimeout.', e);
    // Remove the broken globals so React's scheduler falls back to setTimeout
    delete globalThis.MessageChannel;
    delete globalThis.MessagePort;
  }
})();

// Dynamically import the actual app entry point
// This ensures our fix runs before any React code is evaluated
import('./main.jsx');
