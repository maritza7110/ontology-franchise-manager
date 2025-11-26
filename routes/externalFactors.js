const express = require('express');
const router = express.Router();
const { readDB, addExternalFactor, addNotification } = require('../db/db');
const { identifyAffectedStores, analyzeAllRisks } = require('../services/causality');
const { getRevenueByCategory, calculateMargins } = require('../services/classification');

/**
 * 외부 요인 목록 조회
 * GET /api/external-factors
 */
router.get('/', (req, res) => {
    try {
        const db = readDB();
        const factors = db.externalFactors || [];

        // 최신 순으로 정렬
        const sorted = factors.sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );

        res.json(sorted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 새로운 외부 요인 추가
 * POST /api/external-factors
 */
router.post('/', (req, res) => {
    try {
        const { category, type, title, description, severity, impact_areas } = req.body;

        if (!title || !type) {
            return res.status(400).json({ error: 'title and type are required' });
        }

        const factor = addExternalFactor({
            category: category || 'ECONOMIC',
            type,
            title,
            description: description || '',
            severity: severity || 'MEDIUM',
            impact_areas: impact_areas || [],
            source_url: req.body.source_url || ''
        });

        // 영향받는 가맹점 분석
        const affectedStores = identifyAffectedStores(factor);

        res.json({
            factor,
            analysis: {
                affected_count: affectedStores.length,
                high_risk_count: affectedStores.filter(s => s.riskScore > 70).length,
                affected_stores: affectedStores
            }
        });
    } catch (error) {
        console.error('[ExternalFactors] Error adding factor:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 특정 외부 요인의 영향 분석
 * GET /api/external-factors/:id/impact
 */
router.get('/:id/impact', (req, res) => {
    try {
        const db = readDB();
        const factor = db.externalFactors.find(f => f.id === req.params.id);

        if (!factor) {
            return res.status(404).json({ error: 'External factor not found' });
        }

        const affectedStores = identifyAffectedStores(factor);

        res.json({
            factor,
            affected_stores: affectedStores,
            summary: {
                total_affected: affectedStores.length,
                critical: affectedStores.filter(s => s.riskScore > 70).length,
                warning: affectedStores.filter(s => s.riskScore > 40 && s.riskScore <= 70).length,
                low: affectedStores.filter(s => s.riskScore <= 40).length
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 전체 위험 분석
 * GET /api/external-factors/analysis/all-risks
 */
router.get('/analysis/all-risks', (req, res) => {
    try {
        const analysis = analyzeAllRisks();
        res.json(analysis);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 업종별 매출 통계
 * GET /api/external-factors/stats/revenue-by-category
 */
router.get('/stats/revenue-by-category', (req, res) => {
    try {
        const stats = getRevenueByCategory();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * 가맹점별 마진 분석
 * GET /api/external-factors/margins/:storeName
 */
router.get('/margins/:storeName', (req, res) => {
    try {
        const db = readDB();
        const franchise = db.franchises.find(f => f.name === req.params.storeName);

        if (!franchise) {
            return res.status(404).json({ error: 'Franchise not found' });
        }

        const margins = calculateMargins(franchise);
        res.json({
            store: franchise.name,
            margins: margins || {}
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
