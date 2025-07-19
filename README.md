# js_globe_gen
Uses layered perlin noise to generate a mesh and texture for a procedurally generated earth-like planet model. This is rendered using a slightly modified Three.js library.

Code is live at: https://jorbon.github.io/js_globe_gen
There is a long load time due to the number of samples made.

## Running Locally

Install [Node.js](https://nodejs.org/) if you don't have it installed. Then run:

```bash
npm install
npm start
```

This starts a local server at `http://localhost:3000` that serves the project files. Open that URL in your browser to view the globe.

To run the server on a different port, set the `PORT` environment variable or
pass the desired port as a command line argument. See
[docs/port.md](docs/port.md) for details.

## Controls

 - **Rotate:** click and drag (or touch and drag) the canvas.
 - **Zoom:** use the mouse wheel to zoom the camera in and out.
- **First Person:** enable the "First Person View" checkbox to walk on the globe. Use WASD to move and the mouse to look around.
- **Head Height:** adjust the "Head Height" input in the settings panel to control how high the camera sits above the ground when in first person view.
