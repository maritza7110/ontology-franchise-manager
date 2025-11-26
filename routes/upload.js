const express = require('express');
const multer = require('multer');
const path = require('path');
const { extractText } = require('../services/extractor');
const { processText } = require('../services/nlp');

const router = express.Router();

// Configure Multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            console.log('[Upload] Error: No file uploaded');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`[Upload] Processing file: ${req.file.originalname}`);
        console.log(`[Upload] File type: ${req.file.mimetype}`);
        console.log(`[Upload] File size: ${req.file.size} bytes`);

        // Extract text/data from file
        const extractionResult = await extractText(req.file);
        console.log(`[Upload] Extraction type: ${extractionResult.type}`);
        console.log(`[Upload] Content length: ${extractionResult.content.length} characters`);

        // Process extracted text to update ontology
        const processedData = processText(extractionResult.content);
        console.log(`[Upload] Processed - Franchises: ${processedData.franchises.length}, SVs: ${processedData.svs.length}, Market insights: ${processedData.market.length}`);

        res.json({
            message: 'File processed successfully',
            fileName: req.file.originalname,
            extractedType: extractionResult.type,
            ontologySnapshot: processedData
        });
    } catch (error) {
        console.error('[Upload] Processing error:', error);
        res.status(500).json({ error: 'File processing failed: ' + error.message });
    }
});

module.exports = router;
