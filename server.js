// Simple Express server to host the project locally
const express = require('express');
const path = require('path');

const app = express();
// Determine which port to use. The server checks for a command line
// argument first, then falls back to the PORT environment variable.
// If neither are provided, it defaults to 3000.
//   - Example CLI: `node server.js 5000`
//   - Example env var: `PORT=5000 npm start`
const PORT = process.argv[2] || process.env.PORT || 3000;

// Serve static files from the current directory
// Serve all files in this directory
app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
