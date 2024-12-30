const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Route for /api/test
app.get('/api/test', (req, res) => {
    res.json({ message: 'API is working' });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
