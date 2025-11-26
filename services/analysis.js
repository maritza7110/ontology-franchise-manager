const { readDB } = require('../db/db');

function getFranchiseRanking() {
    const db = readDB();
    // Sort by sales descending
    return db.franchises.sort((a, b) => (b.sales || 0) - (a.sales || 0));
}

function getMarketInsights() {
    const db = readDB();
    return db.market;
}

function getSVPerformance() {
    const db = readDB();

    // Calculate real performance metrics for each SV
    return db.svs.map(sv => {
        const franchiseCount = sv.franchises ? sv.franchises.length : 0;

        // Calculate total sales from managed franchises
        let totalSales = 0;
        if (sv.franchises && sv.franchises.length > 0) {
            sv.franchises.forEach(franchiseName => {
                const franchise = db.franchises.find(f => f.name === franchiseName);
                if (franchise) {
                    totalSales += (franchise.sales || 0);
                }
            });
        }

        // Calculate performance score (normalized to 0-100 scale)
        // Based on: average sales per franchise (in millions)
        const avgSalesPerFranchise = franchiseCount > 0 ? totalSales / franchiseCount : 0;
        const performanceScore = Math.min(100, Math.round(avgSalesPerFranchise / 1000000)); // Normalize to 0-100

        return {
            name: sv.name,
            franchiseCount: franchiseCount,
            totalSales: totalSales,
            performanceScore: performanceScore
        };
    }).sort((a, b) => b.performanceScore - a.performanceScore); // Sort by performance
}

module.exports = { getFranchiseRanking, getMarketInsights, getSVPerformance };
