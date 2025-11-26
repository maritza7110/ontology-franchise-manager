const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ontology.json');

// 확장된 초기 데이터 구조
const INITIAL_DATA = {
    franchises: [],
    svs: [],
    externalFactors: [],  // 새로 추가: 외부 요인
    market: [],
    notifications: []     // 새로 추가: 알림/공문
};

// Initialize DB if not exists
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify(INITIAL_DATA, null, 2));
}

function readDB() {
    try {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        const parsed = JSON.parse(data);

        // 기존 DB에 새 필드가 없으면 추가
        if (!parsed.externalFactors) parsed.externalFactors = [];
        if (!parsed.notifications) parsed.notifications = [];

        return parsed;
    } catch (error) {
        console.error('Error reading DB:', error);
        return { ...INITIAL_DATA };
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing DB:', error);
        return false;
    }
}

// 새로운 헬퍼 함수: 가맹점 검색
function findFranchise(name) {
    const db = readDB();
    return db.franchises.find(f => f.name === name);
}

// 새로운 헬퍼 함수: 외부 요인 추가
function addExternalFactor(factor) {
    const db = readDB();
    db.externalFactors.push({
        ...factor,
        id: Date.now().toString(),
        created_at: new Date().toISOString()
    });
    writeDB(db);
    return db.externalFactors[db.externalFactors.length - 1];
}

// 새로운 헬퍼 함수: 알림 추가
function addNotification(notification) {
    const db = readDB();
    db.notifications.push({
        ...notification,
        id: Date.now().toString(),
        created_at: new Date().toISOString(),
        status: 'pending'
    });
    writeDB(db);
    return db.notifications[db.notifications.length - 1];
}

module.exports = {
    readDB,
    writeDB,
    findFranchise,
    addExternalFactor,
    addNotification
};
