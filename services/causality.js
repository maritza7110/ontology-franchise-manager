const { readDB, writeDB, findFranchise, addExternalFactor } = require('../db/db');
const { calculateMargins } = require('./classification');

/**
 * 인과관계 분석 엔진
 * 외부 요인이 가맹점에 미치는 영향을 분석
 */

// 영향도 매트릭스
const IMPACT_MATRIX = {
    ELECTRICITY_INCREASE: {
        facility: 'HIGH',      // 시설업은 전기 많이 사용
        fnb: 'MEDIUM',         // 외식업도 어느정도 영향
        retail: 'LOW'          // 유통업은 영향 적음
    },
    FOOD_PRICE_INCREASE: {
        facility: 'LOW',
        fnb: 'HIGH',           // 외식업 직접 타격
        retail: 'LOW'
    },
    GPU_PRICE_DROP: {
        facility: 'HIGH',      // PC 업그레이드 기회
        fnb: 'LOW',
        retail: 'LOW'
    },
    MIN_WAGE_INCREASE: {
        facility: 'MEDIUM',
        fnb: 'MEDIUM',
        retail: 'MEDIUM'       // 모든 업종 인건비 영향
    },
    NEW_COMPETITOR: {
        facility: 'HIGH',
        fnb: 'MEDIUM',
        retail: 'MEDIUM'
    }
};

/**
 * 외부 요인에 영향받는 가맹점 식별
 */
function identifyAffectedStores(externalFactor) {
    const db = readDB();
    const affectedStores = [];

    db.franchises.forEach(franchise => {
        const impact = calculateImpact(franchise, externalFactor);

        if (impact.riskScore > 30) {  // 위험도 30 이상만
            affectedStores.push({
                franchise: franchise.name,
                location: franchise.location,
                riskScore: impact.riskScore,
                impactDetails: impact.details,
                recommendations: generateRecommendations(franchise, externalFactor, impact)
            });
        }
    });

    // 위험도 높은 순으로 정렬
    return affectedStores.sort((a, b) => b.riskScore - a.riskScore);
}

/**
 * 특정 가맹점에 대한 영향도 계산
 */
function calculateImpact(franchise, externalFactor) {
    let riskScore = 0;
    const details = [];

    const factorType = externalFactor.type;
    const impactLevels = IMPACT_MATRIX[factorType] || {};

    // 업종별 영향도 체크
    const margins = calculateMargins(franchise);

    // 시설업 영향
    if (impactLevels.facility === 'HIGH') {
        riskScore += 30;
        if (margins?.facility?.margin_rate < 20) {
            riskScore += 20;
            details.push('시설 마진율이 낮아 전기요금 인상에 취약');
        }
    }

    // 외식업 영향
    if (impactLevels.fnb === 'HIGH') {
        riskScore += 30;
        if (margins?.fnb?.margin_rate < 30) {
            riskScore += 20;
            details.push('외식 마진율이 낮아 식자재 가격 인상에 취약');
        }
    }

    // 매출 규모 체크 (매출이 낮으면 더 취약)
    const totalSales = franchise.sales || 0;
    if (totalSales < 100000000) {  // 1억 미만
        riskScore += 15;
        details.push('매출 규모가 작아 비용 변화에 민감');
    }

    // 경쟁점 거리 체크
    if (factorType === 'NEW_COMPETITOR' && externalFactor.location) {
        const distance = calculateDistance(franchise.location, externalFactor.location);
        if (distance < 1) {  // 1km 이내
            riskScore += 50;
            details.push(`경쟁점이 ${distance.toFixed(1)}km 거리에 위치`);
        } else if (distance < 3) {
            riskScore += 20;
        }
    }

    return {
        riskScore: Math.min(100, riskScore),  // 최대 100
        details
    };
}

/**
 * 거리 계산 (간단한 버전, 실제로는 Haversine 공식 사용)
 */
function calculateDistance(loc1, loc2) {
    if (!loc1 || !loc2) return 999;

    // 임시: 같은 구면 2km, 같은 시면 5km, 다르면 50km로 가정
    if (loc1.city !== loc2.city) return 50;
    if (loc1.district !== loc2.district) return 5;
    return 2;
}

/**
 * 권고사항 생성
 */
function generateRecommendations(franchise, externalFactor, impact) {
    const recommendations = [];

    const factorType = externalFactor.type;

    switch (factorType) {
        case 'ELECTRICITY_INCREASE':
            recommendations.push({
                priority: 'HIGH',
                action: 'LED 조명 교체',
                expectedSaving: '월 15만원 절감',
                roi: '6개월'
            });
            recommendations.push({
                priority: 'MEDIUM',
                action: '심야시간 PC 대수 조절',
                expectedSaving: '월 8만원 절감'
            });
            break;

        case 'FOOD_PRICE_INCREASE':
            recommendations.push({
                priority: 'HIGH',
                action: '고마진 메뉴 프로모션 강화',
                expectedEffect: '마진율 5%p 개선'
            });
            recommendations.push({
                priority: 'MEDIUM',
                action: '일부 메뉴 가격 인상',
                expectedEffect: '매출 유지'
            });
            break;

        case 'GPU_PRICE_DROP':
            if (franchise.facilities?.pc_specs?.last_upgrade) {
                const upgradeDate = new Date(franchise.facilities.pc_specs.last_upgrade);
                const monthsSince = (Date.now() - upgradeDate) / (1000 * 60 * 60 * 24 * 30);

                if (monthsSince > 24) {  // 2년 이상
                    recommendations.push({
                        priority: 'HIGH',
                        action: 'PC 업그레이드',
                        cost: '2,500만원',
                        expectedEffect: '신규 고객 유입 30% 증가'
                    });
                }
            }
            break;

        case 'MIN_WAGE_INCREASE':
            recommendations.push({
                priority: 'HIGH',
                action: '무인 키오스크 도입',
                cost: '350만원',
                roi: '18개월'
            });
            break;
    }

    return recommendations;
}

/**
 * 전체 위험 요인 분석
 */
function analyzeAllRisks() {
    const db = readDB();
    const analysis = {
        criticalFactors: [],
        affectedStoresCount: 0,
        totalRiskScore: 0,
        byCategory: {
            facility: { count: 0, avgRisk: 0 },
            fnb: { count: 0, avgRisk: 0 },
            retail: { count: 0, avgRisk: 0 }
        }
    };

    db.externalFactors.forEach(factor => {
        const affected = identifyAffectedStores(factor);

        if (affected.length > 0) {
            analysis.criticalFactors.push({
                factor: factor.title,
                type: factor.type,
                severity: factor.severity,
                affectedCount: affected.length,
                topRisk: affected[0].riskScore
            });
            analysis.affectedStoresCount += affected.length;
        }
    });

    return analysis;
}

module.exports = {
    identifyAffectedStores,
    calculateImpact,
    generateRecommendations,
    analyzeAllRisks,
    IMPACT_MATRIX
};
