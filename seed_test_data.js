// 테스트용 외부 요인 데이터 생성 스크립트
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function seedExternalFactors() {
    console.log('=== 외부 요인 테스트 데이터 생성 ===\n');

    const testFactors = [
        {
            category: 'ECONOMIC',
            type: 'ELECTRICITY_INCREASE',
            title: '전기요금 5% 인상 예정',
            description: '2025년 1분기 전기요금 평균 5% 인상 결정. PC방/만화카페는 전기 사용량이 많아 직접적인 영향 예상',
            severity: 'HIGH',
            impact_areas: ['facility'],
            source_url: 'https://news.example.com/electricity-2025'
        },
        {
            category: 'ECONOMIC',
            type: 'FOOD_PRICE_ INCREASE',
            title: '돼지고기 가격 15% 상승',
            description: '아프리카돼지열병 영향으로 돼지고기 공급 감소. 김치찌개, 제육볶음 등 주요 메뉴 원가 상승',
            severity: 'MEDIUM',
            impact_areas: ['fnb'],
            source_url: 'https://news.example.com/pork-price-2025'
        },
        {
            category: 'TECHNOLOGICAL',
            type: 'GPU_PRICE_DROP',
            title: 'RTX 4070 그래픽카드 가격 20% 하락',
            description: 'NVIDIA 신제품 출시로 기존 모델 가격 급락. PC 업그레이드 적기',
            severity: 'LOW',
            impact_areas: ['facility'],
            source_url: 'https://news.example.com/gpu-price-drop'
        },
        {
            category: 'POLITICAL',
            type: 'MIN_WAGE_INCREASE',
            title: '2025년 최저임금 5.1% 인상',
            description: '시간당 10,030원으로 인상. 인건비 부담 증가 예상',
            severity: 'HIGH',
            impact_areas: ['facility', 'fnb', 'retail'],
            source_url: 'https://news.example.com/min-wage-2025'
        }
    ];

    for (const factor of testFactors) {
        try {
            const response = await axios.post(`${BASE_URL}/api/external-factors`, factor);
            console.log(`✅ "${factor.title}" 추가 완료`);
            console.log(`   영향받는 가맹점: ${response.data.analysis.affected_count}개`);
            console.log(`   고위험 가맹점: ${response.data.analysis.high_risk_count}개\n`);
        } catch (error) {
            console.error(`❌ "${factor.title}" 추가 실패:`, error.message);
        }
    }

    console.log('\n=== 테스트 데이터 생성 완료 ===');
}

// 서버 시작 후 3초 대기 후 실행
setTimeout(() => {
    seedExternalFactors().catch(console.error);
}, 3000);
