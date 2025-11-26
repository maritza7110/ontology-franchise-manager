const { readDB } = require('../db/db');
const { identifyAffectedStores } = require('./causality');

/**
 * 시뮬레이션 엔진
 * 다양한 외부 요인 조합에 대한 영향을 시뮬레이션
 */

/**
 * 단일 시나리오 시뮬레이션
 */
function simulateSingleScenario(scenarioName, factors) {
    console.log(`\n=== 시뮬레이션: ${scenarioName} ===`);

    const db = readDB();
    const totalImpact = {
        affected_stores: new Set(),
        total_cost_increase: 0,
        total_risk_score: 0,
        recommendations: []
    };

    // 각 요인별로 영향 분석
    factors.forEach(factor => {
        const affected = identifyAffectedStores(factor);

        affected.forEach(store => {
            totalImpact.affected_stores.add(store.franchise);
            totalImpact.total_risk_score += store.riskScore;

            // 권고사항 수집
            store.recommendations.forEach(rec => {
                totalImpact.recommendations.push({
                    store: store.franchise,
                    ...rec
                });
            });
        });

        // 비용 증가 추정 (예시)
        if (factor.estimated_impact?.cost_increase_per_store) {
            totalImpact.total_cost_increase +=
                factor.estimated_impact.cost_increase_per_store * affected.length;
        }
    });

    return {
        scenario: scenarioName,
        affected_store_count: totalImpact.affected_stores.size,
        avg_risk_score: totalImpact.affected_stores.size > 0
            ? (totalImpact.total_risk_score / totalImpact.affected_stores.size).toFixed(1)
            : 0,
        estimated_monthly_cost: totalImpact.total_cost_increase,
        top_recommendations: totalImpact.recommendations
            .filter(r => r.priority === 'HIGH')
            .slice(0, 3)
    };
}

/**
 * 복합 시나리오 시뮬레이션
 * 예: "최저임금 5% 인상 + 전기요금 5% 인상"
 */
function simulateMultiFactorScenario(scenarioName, factorCombinations) {
    const db = readDB();

    // 모든 요인을 조합하여 분석
    const allFactors = factorCombinations.map(fc => {
        // DB에서 실제 요인 찾기 또는 Mock 요인 생성
        return db.externalFactors.find(f => f.type === fc.type) || {
            type: fc.type,
            title: fc.title,
            severity: fc.severity || 'MEDIUM',
            impact_areas: fc.impact_areas || [],
            estimated_impact: fc.estimated_impact
        };
    });

    return simulateSingleScenario(scenarioName, allFactors);
}

/**
 * 자연어 질의 처리 (간단한 버전)
 */
function processNaturalLanguageQuery(query) {
    console.log(`\n💬 질문: "${query}"\n`);

    // 키워드 추출
    const keywords = {
        minWage: /최저임금|임금|인건비/i.test(query),
        electricity: /전기|전기세|전기요금/i.test(query),
        gpu: /그래픽카드|GPU|pc|피시/i.test(query),
        food: /식자재|돼지고기|원가|음식/i.test(query)
    };

    // 시나리오 생성
    const factors = [];

    if (keywords.minWage) {
        factors.push({
            type: 'MIN_WAGE_INCREASE',
            title: '최저임금 5% 인상',
            severity: 'HIGH',
            impact_areas: ['facility', 'fnb', 'retail'],
            estimated_impact: { cost_increase_per_store: 500000 }
        });
    }

    if (keywords.electricity) {
        factors.push({
            type: 'ELECTRICITY_INCREASE',
            title: '전기요금 5% 인상',
            severity: 'HIGH',
            impact_areas: ['facility'],
            estimated_impact: { cost_increase_per_store: 250000 }
        });
    }

    if (keywords.gpu) {
        factors.push({
            type: 'GPU_PRICE_DROP',
            title: 'GPU 가격 20% 하락',
            severity: 'LOW',
            impact_areas: ['facility'],
            estimated_impact: { opportunity: 'PC_UPGRADE' }
        });
    }

    if (keywords.food) {
        factors.push({
            type: 'FOOD_PRICE_INCREASE',
            title: '식자재 가격 상승',
            severity: 'MEDIUM',
            impact_areas: ['fnb'],
            estimated_impact: { cost_increase_per_store: 300000 }
        });
    }

    if (factors.length === 0) {
        return {
            error: '질문을 이해하지 못했습니다. 최저임금, 전기요금, 그래픽카드, 식자재 등의 키워드를 포함해주세요.'
        };
    }

    // 시뮬레이션 실행
    const result = simulateSingleScenario('사용자 질의 시뮬레이션', factors);

    // 응답 생성
    const response = generateNLResponse(query, factors, result);

    return {
        query,
        factors: factors.map(f => f.title),
        simulation: result,
        response
    };
}

/**
 * 자연어 응답 생성
 */
function generateNLResponse(query, factors, simulationResult) {
    let response = `📊 시뮬레이션 결과:\n\n`;

    // 영향받는 가맹점
    response += `【영향 분석】\n`;
    response += `• 영향받는 가맹점: ${simulationResult.affected_store_count}개\n`;
    response += `• 평균 위험도: ${simulationResult.avg_risk_score}점 (0-100)\n`;

    if (simulationResult.estimated_monthly_cost > 0) {
        response += `• 예상 월 비용 증가: ${simulationResult.estimated_monthly_cost.toLocaleString()}원\n`;
    }

    response += `\n【종합 권고안】\n`;

    if (simulationResult.top_recommendations.length > 0) {
        simulationResult.top_recommendations.forEach((rec, idx) => {
            response += `${idx + 1}. ${rec.action}`;
            if (rec.expectedSaving) {
                response += ` (${rec.expectedSaving})`;
            } else if (rec.expectedEffect) {
                response += ` (${rec.expectedEffect})`;
            }
            if (rec.roi) {
                response += ` ROI: ${rec.roi}`;
            }
            response += `\n`;
        });
    } else {
        response += `현재 상황에서 즉각적인 조치는 필요하지 않습니다.\n`;
    }

    return response;
}

module.exports = {
    simulateSingleScenario,
    simulateMultiFactorScenario,
    processNaturalLanguageQuery
};
