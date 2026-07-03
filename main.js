const { app, BrowserWindow, screen, globalShortcut, clipboard } = require('electron');
const path = require('path');

let win;
const W = 280, H = 320;
const FALL_T = 0.5;   // seconds; must match IMPACT in boom.html
const SHAKE_T = 0.3;

let heroEntry = () => {};

function createWindow() {
  const disp = screen.getPrimaryDisplay();

  win = new BrowserWindow({
    width: W,
    height: H,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    focusable: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false
    }
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true }); // click-through: never blocks your work
  win.loadFile(path.join(__dirname, 'index.html'));

  let cur = { x: disp.workArea.width * 0.5, y: disp.workArea.height * 0.5 };
  let last = { x: cur.x, y: cur.y };
  const OFF = { x: 80, y: 66 }; // pet sits below-right of the cursor so it never covers it
  let entry = null;

  // Boom entry: the pet plummets from above the screen and superhero-lands next to
  // the cursor while a full-screen overlay plays the impact (flash, shockwave,
  // cracks, debris, comic BOOM burst).
  heroEntry = () => {
    if (!win || win.isDestroyed() || entry) return;
    if (!win.isVisible()) win.showInactive();
    const pt = screen.getCursorScreenPoint();
    const d = screen.getDisplayNearestPoint(pt);
    const b = d.bounds, wa = d.workArea;
    const landX = Math.max(wa.x + W / 2, Math.min(wa.x + wa.width - W / 2, pt.x + OFF.x));
    const landY = Math.max(wa.y + H / 2, Math.min(wa.y + wa.height - H / 2, pt.y + OFF.y));

    const overlay = new BrowserWindow({
      x: b.x, y: b.y, width: b.width, height: b.height,
      frame: false, transparent: true, resizable: false, movable: false,
      skipTaskbar: true, alwaysOnTop: true, hasShadow: false,
      focusable: false, fullscreenable: false
    });
    overlay.setAlwaysOnTop(true, 'screen-saver');
    overlay.setIgnoreMouseEvents(true);
    overlay.loadFile(path.join(__dirname, 'boom.html'), {
      query: { x: String(landX - b.x), y: String(landY + H * 0.25 - b.y) }
    });
    overlay.webContents.once('did-finish-load', () => {
      entry = { t0: Date.now(), land: { x: landX, y: landY }, startTop: b.y - H - 20, phase: 'fall' };
      win.setPosition(Math.round(landX - W / 2), Math.round(entry.startTop));
      win.moveTop(); // keep the pet above the overlay effects
      win.webContents.send('entry', { mode: 'fall' });
    });
    setTimeout(() => { if (!overlay.isDestroyed()) overlay.destroy(); }, 2500);
  };

  function stepEntry() {
    const e = entry;
    const t = (Date.now() - e.t0) / 1000;

    if (t < FALL_T) {
      // accelerating meteor drop
      const u = t / FALL_T;
      const top = e.startTop + (e.land.y - H / 2 - e.startTop) * u * u;
      win.setPosition(Math.round(e.land.x - W / 2), Math.round(top));
    } else if (t < FALL_T + SHAKE_T) {
      if (e.phase === 'fall') {
        e.phase = 'shake';
        win.webContents.send('entry', { mode: 'land' }); // superhero landing pose
      }
      // decaying impact shake
      const u = (t - FALL_T) / SHAKE_T;
      const amp = 9 * (1 - u);
      win.setPosition(
        Math.round(e.land.x - W / 2 + (Math.random() * 2 - 1) * amp),
        Math.round(e.land.y - H / 2 + (Math.random() * 2 - 1) * amp)
      );
    } else {
      win.setPosition(Math.round(e.land.x - W / 2), Math.round(e.land.y - H / 2));
      cur = { x: e.land.x, y: e.land.y };
      last = { x: cur.x, y: cur.y };
      entry = null;
      win.webContents.send('entry', { mode: 'end' });
    }
  }

  // Smoothly trail the cursor.
  setInterval(() => {
    if (!win || win.isDestroyed()) return;
    if (entry) { stepEntry(); return; }

    const pt = screen.getCursorScreenPoint();
    const d = screen.getDisplayNearestPoint(pt);
    const b = d.bounds;

    let tx = pt.x + OFF.x;
    let ty = pt.y + OFF.y;

    // ease toward target (trailing lag)
    cur.x += (tx - cur.x) * 0.16;
    cur.y += (ty - cur.y) * 0.16;

    // keep fully on-screen
    cur.x = Math.max(b.x + W / 2, Math.min(b.x + b.width - W / 2, cur.x));
    cur.y = Math.max(b.y + H / 2, Math.min(b.y + b.height - H / 2, cur.y));

    win.setPosition(Math.round(cur.x - W / 2), Math.round(cur.y - H / 2));

    const speed = Math.hypot(cur.x - last.x, cur.y - last.y);
    last = { x: cur.x, y: cur.y };

    // cursor position relative to the pet's window centre -> used to face the cursor
    win.webContents.send('cursor', { dx: pt.x - cur.x, dy: pt.y - cur.y, speed });
  }, 16);

  // React to JSON on the clipboard: copy valid JSON -> proud flex,
  // copy broken JSON (trailing comma, single quotes, ...) -> glitch meltdown.
  let lastClip;
  try { lastClip = clipboard.readText().trim(); } catch (e) { lastClip = ''; }
  setInterval(() => {
    if (!win || win.isDestroyed()) return;
    let t;
    try { t = clipboard.readText().trim(); } catch (e) { return; }
    if (t === lastClip) return;
    lastClip = t;
    if (t.length < 2 || t.length > 200000) return;
    const c = t[0];
    if (c !== '{' && c !== '[') return; // only judge JSON-shaped text
    try {
      JSON.parse(t);
      win.webContents.send('play', 'flex');   // valid: certified
    } catch (e) {
      win.webContents.send('play', 'glitch'); // invalid: he was not fine
    }
  }, 700);
}

app.whenReady().then(() => {
  createWindow();
  // Quit / hide hotkeys (window is click-through, so it has no close button)
  globalShortcut.register('Control+Alt+Q', () => app.quit());
  globalShortcut.register('Control+Alt+H', () => {
    if (!win || win.isDestroyed()) return;
    win.isVisible() ? win.hide() : win.show();
  });
  // Manually trigger show-off moves (handy for recording clips)
  const play = (name) => { if (win && !win.isDestroyed()) win.webContents.send('play', name); };
  globalShortcut.register('Control+Alt+G', () => play('glitch'));
  globalShortcut.register('Control+Alt+D', () => play('dance'));
  globalShortcut.register('Control+Alt+B', () => play('backflip'));
  globalShortcut.register('Control+Alt+J', () => play('spin'));
  globalShortcut.register('Control+Alt+F', () => play('flex'));
  globalShortcut.register('Control+Alt+Space', () => play('random'));
  // Boom entry (Ctrl+Shift+E as a fallback for layouts where Ctrl+Alt = AltGr)
  globalShortcut.register('Control+Alt+E', () => heroEntry());
  globalShortcut.register('Control+Shift+E', () => heroEntry());
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
