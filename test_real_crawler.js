// 실제 크롤링 테스트 스크립트
const { crawlAndSave } = require('./services/crawler');

console.log('=== 실제 웹 크롤링 테스트 ===\n');
console.log('네이버 뉴스, PC 부품 가격, 정부 데이터를 실시간으로 수집합니다...\n');

// 크롤링 실행
crawlAndSave()
    .then(factors => {
        console.log('\n📊 수집 결과 요약:');
        console.log(`- 총 ${factors.length}개 외부 요인 수집`);

        factors.forEach((f, idx) => {
            console.log(`\n${idx + 1}. [${f.category}] ${f.title}`);
            console.log(`   심각도: ${f.severity}`);
            console.log(`   출처: ${f.source_url}`);
        });

        console.log('\n✅ 크롤링 완료! DB에 저장되었습니다.');
    })
    .catch(error => {
        console.error('\n❌ 크롤링 실패:', error.message);
        process.exit(1);
    });
