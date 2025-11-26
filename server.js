// server.js – Express backend for Ontology app
const express = require('express');
const path = require('path');
const uploadRouter = require('./routes/upload');
const analysisRouter = require('./routes/analysis');
const externalFactorsRouter = require('./routes/externalFactors');
const simulationRouter = require('./routes/simulation');
const googleDriveRouter = require('./routes/googleDrive');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory at root level
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/external-factors', externalFactorsRouter);
app.use('/api/simulation', simulationRouter);
app.use('/api/drive', googleDriveRouter);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
