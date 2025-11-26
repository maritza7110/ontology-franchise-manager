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

function getOntologyData() {
    const db = readDB();
    const nodes = [];
    const links = [];

    // 1. Add Franchises
    db.franchises.forEach(f => {
        nodes.push({
            id: `f_${f.name}`,
            type: 'franchise',
            name: f.name,
            sales: f.sales || 0,
            location: f.location
        });

        // Link to Location
        if (f.location) {
            const locId = `l_${f.location}`;
            if (!nodes.find(n => n.id === locId)) {
                nodes.push({ id: locId, type: 'location', name: f.location });
            }
            links.push({ source: `f_${f.name}`, target: locId, type: 'located_at' });
        }
    });

    // 2. Add SVs
    db.svs.forEach(s => {
        nodes.push({
            id: `s_${s.name}`,
            type: 'sv',
            name: s.name
        });

        // Link SV to Franchises
        if (s.franchises) {
            s.franchises.forEach(fName => {
                // Only link if franchise exists
                if (db.franchises.find(f => f.name === fName)) {
                    links.push({ source: `s_${s.name}`, target: `f_${fName}`, type: 'manages' });
                }
            });
        }
    });

    // 3. Add External Factors (from market trends/PEST)
    if (db.externalFactors) {
        db.externalFactors.forEach((factor, index) => {
            const factorId = `e_${index}`;
            nodes.push({
                id: factorId,
                type: 'external',
                name: factor.title || factor.description.substring(0, 20),
                category: factor.category
            });

            // Heuristic linking: Connect external factors to all franchises for now
            // In a real system, this would be based on specific impact analysis
            // To avoid clutter, we'll just link to top 3 franchises by sales
            const topFranchises = db.franchises.sort((a, b) => (b.sales || 0) - (a.sales || 0)).slice(0, 3);
            topFranchises.forEach(f => {
                links.push({ source: factorId, target: `f_${f.name}`, type: 'affects' });
            });
        });
    }

    return { nodes, links };
}

module.exports = { getFranchiseRanking, getMarketInsights, getSVPerformance, getOntologyData };
