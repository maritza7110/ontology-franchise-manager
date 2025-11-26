const { readDB, writeDB } = require('../db/db');

/**
 * 매출 데이터를 3가지 카테고리로 자동 분류
 * - 시설 서비스업 (Facility)
 * - 외식업 (F&B)
 * - 도소매업 (Retail)
 */

// 키워드 기반 분류 규칙
const CLASSIFICATION_RULES = {
    facility: {
        keywords: ['PC', '피시', '이용료', '시간', '좌석', '룸', '방', '부스'],
        patterns: [/PC\s*이용/i, /시간\s*요금/i, /룸\s*렌탈/i]
    },
    fnb: {
        keywords: ['김치찌개', '라면', '떡볶이', '치킨', '피자', '햄버거', '샌드위치',
            '커피', '음료', '주스', '조리', '요리', '식사', '메뉴'],
        patterns: [/조리\s*음식/i, /음료/i, /식사/i]
    },
    retail: {
        keywords: ['과자', '스낵', '껌', '사탕', '초콜릿', '캔음료', '콜라', '사이다',
            '컵라면', '삼각김밥', '도시락', '상품', '판매품'],
        patterns: [/완제품/i, /도소매/i, /상품\s*판매/i]
    }
};

/**
 * 텍스트를 분석하여 카테고리 결정
 */
function classifyRevenue(text, amount) {
    const lowerText = text.toLowerCase();
    let category = 'uncategorized';
    let confidence = 0;

    // 각 카테고리별로 점수 계산
    const scores = {
        facility: 0,
        fnb: 0,
        retail: 0
    };

    Object.keys(CLASSIFICATION_RULES).forEach(cat => {
        const rules = CLASSIFICATION_RULES[cat];

        // 키워드 매칭
        rules.keywords.forEach(keyword => {
            if (lowerText.includes(keyword.toLowerCase())) {
                scores[cat] += 10;
            }
        });

        // 패턴 매칭
        rules.patterns.forEach(pattern => {
            if (pattern.test(text)) {
                scores[cat] += 20;
            }
        });
    });

    // 가장 높은 점수의 카테고리 선택
    let maxScore = 0;
    Object.keys(scores).forEach(cat => {
        if (scores[cat] > maxScore) {
            maxScore = scores[cat];
            category = cat;
            confidence = Math.min(maxScore / 30, 1.0); // 0-1 스케일
        }
    });

    return {
        category,
        confidence,
        amount: parseInt(amount) || 0
    };
}

/**
 * 가맹점의 매출 데이터를 카테고리별로 집계
 */
function categorizeStoreSales(storeName, salesData) {
    const categorized = {
        facility: { total: 0, items: [] },
        fnb: { total: 0, items: [] },
        retail: { total: 0, items: [] },
        uncategorized: { total: 0, items: [] }
    };

    salesData.forEach(item => {
        const classification = classifyRevenue(item.description || item.name, item.amount);

        categorized[classification.category].total += classification.amount;
        categorized[classification.category].items.push({
            name: item.name || item.description,
            amount: classification.amount,
            confidence: classification.confidence
        });
    });

    return categorized;
}

/**
 * 전체 가맹점의 업종별 매출 통계
 */
function getRevenueByCategory() {
    const db = readDB();
    const stats = {
        facility: 0,
        fnb: 0,
        retail: 0,
        total: 0
    };

    db.franchises.forEach(franchise => {
        if (franchise.revenue) {
            stats.facility += franchise.revenue.facility?.total || 0;
            stats.fnb += franchise.revenue.fnb?.total || 0;
            stats.retail += franchise.revenue.retail?.total || 0;
        }
    });

    stats.total = stats.facility + stats.fnb + stats.retail;

    return {
        stats,
        breakdown: {
            facility_percentage: stats.total > 0 ? (stats.facility / stats.total * 100).toFixed(1) : 0,
            fnb_percentage: stats.total > 0 ? (stats.fnb / stats.total * 100).toFixed(1) : 0,
            retail_percentage: stats.total > 0 ? (stats.retail / stats.total * 100).toFixed(1) : 0
        }
    };
}

/**
 * 특정 가맹점의 마진율 계산 (업종별)
 */
function calculateMargins(franchise) {
    if (!franchise.revenue) return null;

    const margins = {};

    // 시설업 마진 (고정비 높음, 변동비 낮음)
    if (franchise.revenue.facility) {
        const facilityCost = (franchise.facilities?.monthly_cost || 0);
        margins.facility = {
            revenue: franchise.revenue.facility.total,
            cost: facilityCost,
            margin: franchise.revenue.facility.total - facilityCost,
            margin_rate: franchise.revenue.facility.total > 0
                ? ((franchise.revenue.facility.total - facilityCost) / franchise.revenue.facility.total * 100).toFixed(1)
                : 0
        };
    }

    // 외식업 마진 (원가율 보통)
    if (franchise.revenue.fnb) {
        const fnbCost = franchise.revenue.fnb.total * 0.35; // 가정: 원가율 35%
        margins.fnb = {
            revenue: franchise.revenue.fnb.total,
            cost: fnbCost,
            margin: franchise.revenue.fnb.total - fnbCost,
            margin_rate: ((franchise.revenue.fnb.total - fnbCost) / franchise.revenue.fnb.total * 100).toFixed(1)
        };
    }

    // 유통업 마진 (마진율 낮음)
    if (franchise.revenue.retail) {
        const retailCost = franchise.revenue.retail.total * 0.70; // 가정: 원가율 70%
        margins.retail = {
            revenue: franchise.revenue.retail.total,
            cost: retailCost,
            margin: franchise.revenue.retail.total - retailCost,
            margin_rate: ((franchise.revenue.retail.total - retailCost) / franchise.revenue.retail.total * 100).toFixed(1)
        };
    }

    return margins;
}

module.exports = {
    classifyRevenue,
    categorizeStoreSales,
    getRevenueByCategory,
    calculateMargins,
    CLASSIFICATION_RULES
};
