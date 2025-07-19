// Simple Express server to host the project locally
const express = require('express');
const path = require('path');

const app = express();
// Default port is 3000 but can be overridden with the PORT env variable
const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
// Serve all files in this directory
app.use(express.static(path.join(__dirname)));

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
