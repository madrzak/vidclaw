/**
 * Boot script for VidClaw
 *
 * Runs before React so we can detect broken MessageChannel/MessagePort behavior.
 * If broken, we remove these globals before importing React so Scheduler uses
 * setTimeout fallback instead of MessageChannel.
 */

function installErrorCapture() {
  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (!msg.includes('Illegal constructor')) return;

    console.error('[ERROR-CAPTURE] Illegal constructor detected', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack || null,
    });
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason;
    const msg = typeof reason?.message === 'string' ? reason.message : String(reason || '');
    if (!msg.includes('Illegal constructor')) return;

    console.error('[ERROR-CAPTURE] Illegal constructor in promise', {
      message: msg,
      stack: reason?.stack || null,
    });
  });
}

function disableMessageChannel(reason, error) {
  console.warn(`MessageChannel issue detected: ${reason}`);
  if (error) {
    console.warn('MessageChannel error details:', error);
  }

  try {
    delete globalThis.MessageChannel;
    delete globalThis.MessagePort;
  } catch (deleteError) {
    // Fallback for non-configurable globals
    globalThis.MessageChannel = undefined;
    globalThis.MessagePort = undefined;
    console.warn('Could not delete MessageChannel/MessagePort, set to undefined instead:', deleteError);
  }

  console.warn('→ Disabling MessageChannel and MessagePort to force setTimeout fallback');
  console.log('[Fallback] setTimeout fallback engaged - app should render');
}

async function messageChannelBehaviorWorks(timeoutMs = 50) {
  if (typeof MessageChannel !== 'function') {
    return { ok: false, reason: 'MessageChannel missing or non-function', error: null };
  }

  let channel;
  try {
    channel = new MessageChannel();
  } catch (error) {
    return { ok: false, reason: 'MessageChannel constructor throws error', error };
  }

  const cleanup = () => {
    if (!channel) return;
    try { channel.port1.onmessage = null; } catch (_) {}
    try { channel.port1.close(); } catch (_) {}
    try { channel.port2.close(); } catch (_) {}
  };

  try {
    const received = await Promise.race([
      new Promise((resolve) => {
        channel.port1.onmessage = () => {
          resolve(true);
        };
      }),
      new Promise((resolve) => {
        setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);

    if (!received) {
      return { ok: false, reason: 'MessageChannel behavior test: FAIL (message not received)', error: null };
    }

    return { ok: true, reason: 'MessageChannel behavior test: PASS', error: null };
  } finally {
    cleanup();
  }
}

(async function boot() {
  installErrorCapture();

  const result = await messageChannelBehaviorWorks(50);

  if (!result.ok) {
    console.warn(result.reason);
    disableMessageChannel(result.reason, result.error);
  } else {
    console.log(result.reason);
    console.log('✓ MessageChannel is constructible and working - using native implementation');
  }

  // Log runtime descriptor snapshot for debugging what React will see at import time.
  const mcDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'MessageChannel');
  const mpDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'MessagePort');
  console.log('MessageChannel descriptor:', mcDescriptor ? {
    valueType: mcDescriptor.value ? typeof mcDescriptor.value : 'undefined',
    configurable: mcDescriptor.configurable,
    writable: mcDescriptor.writable,
    enumerable: mcDescriptor.enumerable,
  } : 'not in globalThis');
  console.log('MessagePort descriptor:', mpDescriptor ? {
    valueType: mpDescriptor.value ? typeof mpDescriptor.value : 'undefined',
    configurable: mpDescriptor.configurable,
    writable: mpDescriptor.writable,
    enumerable: mpDescriptor.enumerable,
  } : 'not in globalThis');

  // Import only after detection/fallback is complete.
  try {
    await import('./main.jsx');
  } catch (err) {
    console.error('[BOOT-ERROR] Failed to import main.jsx', {
      message: err?.message,
      stack: err?.stack,
    });

    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `
        <div style="padding: 20px; color: #f87171; font-family: sans-serif;">
          <h2>VidClaw Failed to Load</h2>
          <p>Error: ${String(err?.message || err)}</p>
          <p>Open DevTools console for full stack trace.</p>
        </div>
      `;
    }
  }
})();
