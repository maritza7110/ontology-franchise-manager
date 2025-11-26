const axios = require('axios');
const cheerio = require('cheerio');
const { addExternalFactor } = require('../db/db');

/**
 * 실제 웹 크롤링 엔진
 * 실제 뉴스 사이트, API, 공공데이터를 수집합니다
 */

// 크롤링 설정
const CRAWL_CONFIG = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    timeout: 10000,
    delay: 1000 // 사이트 부하 방지를 위한 딜레이
};

/**
 * 네이버 뉴스에서 경제 키워드 검색
 */
async function crawlNaverNews(keyword) {
    try {
        const url = `https://search.naver.com/search.naver?where=news&query=${encodeURIComponent(keyword)}`;
        const response = await axios.get(url, {
            headers: CRAWL_CONFIG.headers,
            timeout: CRAWL_CONFIG.timeout
        });

        const $ = cheerio.load(response.data);
        const articles = [];

        // 네이버 뉴스 검색 결과 파싱
        $('.news_area').each((i, elem) => {
            if (i >= 5) return; // 최대 5개만

            const title = $(elem).find('.news_tit').text().trim();
            const description = $(elem).find('.news_dsc').text().trim();
            const link = $(elem).find('.news_tit').attr('href');

            if (title && description) {
                articles.push({ title, description, link });
            }
        });

        return articles;
    } catch (error) {
        console.error(`[Crawler] 네이버 뉴스 크롤링 실패 (${keyword}):`, error.message);
        return [];
    }
}

/**
 * 경제 뉴스 크롤링 (실제)
 */
async function crawlEconomicNews() {
    console.log('[Crawler] 경제 뉴스 크롤링 시작...');
    const factors = [];

    // 1. 전기요금 관련 뉴스
    await delay(CRAWL_CONFIG.delay);
    const electricityNews = await crawlNaverNews('전기요금 인상');
    if (electricityNews.length > 0) {
        const news = electricityNews[0];
        factors.push({
            category: 'ECONOMIC',
            type: 'ELECTRICITY_INCREASE',
            title: news.title,
            description: news.description,
            severity: determineSeverity(news.title, ['인상', '폭등', '급등']),
            impact_areas: ['facility'],
            source_url: news.link,
            crawled_at: new Date().toISOString()
        });
    }

    // 2. 식자재 가격 뉴스
    await delay(CRAWL_CONFIG.delay);
    const foodPriceNews = await crawlNaverNews('식자재 가격 상승');
    if (foodPriceNews.length > 0) {
        const news = foodPriceNews[0];
        factors.push({
            category: 'ECONOMIC',
            type: 'FOOD_PRICE_INCREASE',
            title: news.title,
            description: news.description,
            severity: determineSeverity(news.title, ['폭등', '급등', '상승']),
            impact_areas: ['fnb'],
            source_url: news.link,
            crawled_at: new Date().toISOString()
        });
    }

    // 3. 최저임금 뉴스
    await delay(CRAWL_CONFIG.delay);
    const minWageNews = await crawlNaverNews('최저임금');
    if (minWageNews.length > 0) {
        const news = minWageNews[0];
        factors.push({
            category: 'POLITICAL',
            type: 'MIN_WAGE_INCREASE',
            title: news.title,
            description: news.description,
            severity: 'HIGH',
            impact_areas: ['facility', 'fnb', 'retail'],
            source_url: news.link,
            crawled_at: new Date().toISOString()
        });
    }

    console.log(`[Crawler] 경제 뉴스 ${factors.length}개 수집 완료`);
    return factors;
}

/**
 * 다나와 PC 부품 가격 크롤링 (간소화 버전)
 */
async function crawlPCPartsPrices() {
    console.log('[Crawler] PC 부품 가격 정보 수집...');
    const factors = [];

    try {
        // 다나와는 크롤링 방지가 있으므로, 그래픽카드 관련 뉴스로 대체
        await delay(CRAWL_CONFIG.delay);
        const gpuNews = await crawlNaverNews('RTX 그래픽카드 가격');

        if (gpuNews.length > 0) {
            const news = gpuNews[0];
            const isDropping = news.title.includes('하락') || news.title.includes('인하') || news.title.includes('할인');

            factors.push({
                category: 'TECHNOLOGICAL',
                type: isDropping ? 'GPU_PRICE_DROP' : 'GPU_PRICE_UPDATE',
                title: news.title,
                description: news.description,
                severity: isDropping ? 'LOW' : 'MEDIUM',
                impact_areas: ['facility'],
                source_url: news.link,
                crawled_at: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('[Crawler] PC 부품 가격 수집 실패:', error.message);
    }

    console.log(`[Crawler] PC 부품 정보 ${factors.length}개 수집 완료`);
    return factors;
}

/**
 * 통계청 API (실제 공공데이터 활용 예시)
 * 참고: 실제 사용시 API 키 필요
 */
async function crawlGovernmentData() {
    console.log('[Crawler] 정부 통계 데이터 수집...');
    const factors = [];

    // 실제로는 통계청 Open API 사용
    // https://kosis.kr/openapi/
    // 여기서는 뉴스로 대체

    try {
        await delay(CRAWL_CONFIG.delay);
        const cpiNews = await crawlNaverNews('소비자물가지수');

        if (cpiNews.length > 0) {
            const news = cpiNews[0];
            factors.push({
                category: 'ECONOMIC',
                type: 'CPI_CHANGE',
                title: news.title,
                description: news.description,
                severity: 'MEDIUM',
                impact_areas: ['fnb', 'retail'],
                source_url: news.link,
                crawled_at: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('[Crawler] 정부 데이터 수집 실패:', error.message);
    }

    return factors;
}

/**
 * 경쟁사 정보 크롤링
 */
async function crawlCompetitorInfo() {
    console.log('[Crawler] 경쟁사 정보 수집...');
    const factors = [];

    try {
        await delay(CRAWL_CONFIG.delay);
        const competitorNews = await crawlNaverNews('PC방 프랜차이즈 출점');

        if (competitorNews.length > 0) {
            const news = competitorNews[0];
            factors.push({
                category: 'SOCIAL',
                type: 'NEW_COMPETITOR',
                title: news.title,
                description: news.description,
                severity: 'MEDIUM',
                impact_areas: ['facility', 'fnb'],
                source_url: news.link,
                crawled_at: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('[Crawler] 경쟁사 정보 수집 실패:', error.message);
    }

    return factors;
}

/**
 * 전체 PEST 데이터 수집 (실제 크롤링)
 */
async function crawlAllPESTFactors() {
    console.log('=== 실제 PEST 요인 데이터 수집 시작 ===\n');

    const results = {
        economic: [],
        technological: [],
        social: [],
        political: []
    };

    try {
        // 경제적 요인
        const economicFactors = await crawlEconomicNews();
        results.economic = economicFactors.filter(f => f.category === 'ECONOMIC');
        results.political = economicFactors.filter(f => f.category === 'POLITICAL');

        // 기술적 요인
        const techFactors = await crawlPCPartsPrices();
        results.technological = techFactors;

        // 사회적 요인
        const socialFactors = await crawlCompetitorInfo();
        results.social = socialFactors;

        // 정부 데이터
        const govFactors = await crawlGovernmentData();
        results.economic.push(...govFactors);

        const totalCount =
            results.economic.length +
            results.technological.length +
            results.social.length +
            results.political.length;

        console.log(`\n✅ 총 ${totalCount}개 실제 요인 수집 완료`);
        console.log(`- 경제: ${results.economic.length}개`);
        console.log(`- 기술: ${results.technological.length}개`);
        console.log(`- 사회: ${results.social.length}개`);
        console.log(`- 정치: ${results.political.length}개\n`);

        return results;
    } catch (error) {
        console.error('[Crawler] 전체 데이터 수집 실패:', error);
        throw error;
    }
}

/**
 * 크롤링된 데이터를 DB에 자동 저장
 */
async function crawlAndSave() {
    const pestData = await crawlAllPESTFactors();
    const savedFactors = [];

    // 모든 카테고리의 데이터를 DB에 저장
    for (const category of Object.keys(pestData)) {
        for (const item of pestData[category]) {
            try {
                const factor = addExternalFactor({
                    category: item.category,
                    type: item.type,
                    title: item.title,
                    description: item.description,
                    severity: item.severity,
                    impact_areas: item.impact_areas || [],
                    source_url: item.source_url,
                    location: item.location
                });

                savedFactors.push(factor);
                console.log(`✅ "${item.title.substring(0, 30)}..." 저장 완료`);
            } catch (error) {
                console.error(`❌ "${item.title}" 저장 실패:`, error.message);
            }
        }
    }

    console.log(`\n=== 총 ${savedFactors.length}개 외부 요인 DB 저장 완료 ===`);
    return savedFactors;
}

// 헬퍼 함수
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function determineSeverity(text, keywords) {
    const highKeywords = ['폭등', '급등', '대폭', '크게'];
    const hasHighKeyword = highKeywords.some(kw => text.includes(kw));

    if (hasHighKeyword) return 'HIGH';

    const hasKeyword = keywords.some(kw => text.includes(kw));
    return hasKeyword ? 'MEDIUM' : 'LOW';
}

module.exports = {
    crawlNaverNews,
    crawlEconomicNews,
    crawlPCPartsPrices,
    crawlCompetitorInfo,
    crawlAllPESTFactors,
    crawlAndSave
};
