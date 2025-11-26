const express = require('express');
const { getFranchiseRanking, getMarketInsights, getSVPerformance } = require('../services/analysis');
const router = express.Router();

router.get('/franchise-ranking', (req, res) => {
    try {
        const data = getFranchiseRanking();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/market', (req, res) => {
    try {
        const data = getMarketInsights();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/sv-performance', (req, res) => {
    try {
        const data = getSVPerformance();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
