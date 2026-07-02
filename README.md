# JSON — Desktop Pet

A cute 3D **JSON** mascot that lives on your desktop, trails your cursor, turns to watch it, and runs after it. Built with **Electron + three.js**. The window is transparent, always-on-top, and click-through, so the pet never gets in the way of your work.

![JSON mascot](preview.png)

## Features

- **Runs after your cursor** across the whole screen — feet and hands pump in a real run cycle while it chases.
- **Turns to face** wherever your cursor is.
- **Idle bob, blinks, and an occasional wave** when you stop moving.
- **Hops** when the cursor gets close.
- Transparent, always-on-top, **click-through** — never blocks what you're doing.

## Run it

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm start
```

On Windows you can also just double-click **`launch-pet.cmd`**.

## Controls

| Shortcut | Action |
| --- | --- |
| `Ctrl+Alt+Q` | Quit the pet |
| `Ctrl+Alt+H` | Hide / show the pet |
| `Ctrl+Alt+G` | Glitch (the "Unexpected token" corruption) |
| `Ctrl+Alt+D` | Dance |
| `Ctrl+Alt+B` | Backflip |
| `Ctrl+Alt+J` | Jump-spin |
| `Ctrl+Alt+F` | Hero flex |
| `Ctrl+Alt+Space` | Random move |

The pet also performs a random show-off move on its own after a few seconds of stillness, and one on launch.

## How it works

- **`main.js`** — Electron main process: creates the transparent, click-through, always-on-top window, and polls the global cursor position ~60×/sec so the pet can trail and face it.
- **`preload.js`** — securely forwards cursor updates to the renderer.
- **`renderer.js`** — three.js scene: loads `mascot.glb`, lights it, and drives the idle / run / wave / hop animation and cursor-facing.
- **`mascot.glb`** — the 3D character (modeled in Blender; body, face, "JSON" wordmark, and floating hands/feet as separately animated nodes).

## Troubleshooting

If Electron launches but no window appears, make sure the `ELECTRON_RUN_AS_NODE` environment variable is **not** set — when it is, Electron runs as plain Node.js and the app never starts.

## License

MIT
