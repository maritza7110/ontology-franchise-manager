const express = require('express');
const router = express.Router();
const { crawlRSSAndSave } = require('../services/rssCrawler');
const { processNaturalLanguageQuery, simulateMultiFactorScenario } = require('../services/simulation');

/**
 * RSS 데이터 크롤링
 * POST /api/simulation/crawl
 */
router.post('/crawl', async (req, res) => {
    try {
        console.log('[Simulation] RSS 크롤링 시작...');
        const savedFactors = await crawlRSSAndSave();

        res.json({
            message: 'RSS 피드에서 뉴스 데이터 수집 완료',
            factors_count: savedFactors.length,
            factors: savedFactors.map(f => ({ id: f.id, title: f.title, category: f.category }))
        });
    } catch (error) {
        console.error('[Simulation] RSS 크롤링 오류:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 자연어 질의 처리
 * POST /api/simulation/query
 * Body: { query: "최저임금이 5% 오르고 그래픽카드 가격이 떨어지면?" }
 */
router.post('/query', (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'query is required' });
        }

        const result = processNaturalLanguageQuery(query);

        if (result.error) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('[Simulation] 질의 처리 오류:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 다변수 시뮬레이션
 * POST /api/simulation/scenario
 * Body: { 
 *   name: "최악의 시나리오",
 *   factors: [
 *     { type: "MIN_WAGE_INCREASE", ... },
 *     { type: "ELECTRICITY_INCREASE", ... }
 *   ]
 * }
 */
router.post('/scenario', (req, res) => {
    try {
        const { name, factors } = req.body;

        if (!name || !factors || !Array.isArray(factors)) {
            return res.status(400).json({ error: 'name and factors array are required' });
        }

        const result = simulateMultiFactorScenario(name, factors);

        res.json(result);
    } catch (error) {
        console.error('[Simulation] 시나리오 시뮬레이션 오류:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
