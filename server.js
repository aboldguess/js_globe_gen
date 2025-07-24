// Simple Express server to host the project locally
const express = require('express');
const path = require('path');
// Utility to find the first open port starting from a base port
const portfinder = require('portfinder');
// We will spawn the platform-specific command to open the browser
const { exec } = require('child_process');

const app = express();
// Determine which port to use. The server checks for a command line
// argument first, then falls back to the PORT environment variable.
// If neither are provided, it defaults to 3000.
//   - Example CLI: `node server.js 5000`
//   - Example env var: `PORT=5000 npm start`
const basePort = Number(process.argv[2] || process.env.PORT || 3000);

// Serve static files from the current directory
// Serve all files in this directory
app.use(express.static(path.join(__dirname)));

// Helper function to open the browser in a cross-platform way
function openBrowser(url) {
    const command = process.platform === 'darwin'
        ? 'open'
        : process.platform === 'win32'
            ? 'start'
            : 'xdg-open';
    exec(`${command} ${url}`);
}

// Start the server on the first available port and open the browser
async function startServer() {
    try {
        // portfinder will scan from basePort upwards until it finds a free port
        const port = await portfinder.getPortPromise({ port: basePort });
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
            // Automatically launch the default browser to the server URL
            openBrowser(`http://localhost:${port}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
    }
}

startServer();
