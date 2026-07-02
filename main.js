const { app, BrowserWindow, screen, globalShortcut } = require('electron');
const path = require('path');

let win;
const W = 280, H = 320;

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

  // Smoothly trail the cursor.
  let cur = { x: disp.workArea.width * 0.5, y: disp.workArea.height * 0.5 };
  let last = { x: cur.x, y: cur.y };
  const OFF = { x: 80, y: 66 }; // pet sits below-right of the cursor so it never covers it

  setInterval(() => {
    if (!win || win.isDestroyed()) return;
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
}

app.whenReady().then(() => {
  createWindow();
  // Quit / hide hotkeys (window is click-through, so it has no close button)
  globalShortcut.register('Control+Alt+Q', () => app.quit());
  globalShortcut.register('Control+Alt+H', () => {
    if (!win || win.isDestroyed()) return;
    win.isVisible() ? win.hide() : win.show();
  });
});
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
