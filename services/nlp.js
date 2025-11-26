const { readDB, writeDB } = require('../db/db');

function processText(content) {
    const db = readDB();
    const lines = content.split('\n');

    // Track current context for multi-line parsing
    let currentFranchise = null;
    let currentSV = null;

    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return; // Skip empty lines

        // Extract Franchise Info
        // Pattern: "가맹점 [Name]"
        const franchiseMatch = trimmedLine.match(/가맹점\s+([가-힣A-Za-z0-9]+)/);
        if (franchiseMatch) {
            const name = franchiseMatch[1];
            let franchise = db.franchises.find(f => f.name === name);
            if (!franchise) {
                // 확장된 데이터 모델로 초기화
                franchise = {
                    name,
                    sales: 0,
                    location: {
                        city: '',
                        district: '',
                        address: ''
                    },
                    revenue: {
                        facility: { total: 0, items: [] },
                        fnb: { total: 0, items: [] },
                        retail: { total: 0, items: [] }
                    },
                    facilities: {
                        pc_specs: {
                            count: 0,
                            cpu: '',
                            gpu: '',
                            ram: 0,
                            last_upgrade: null
                        },
                        interior_grade: '기본',
                        lease_info: {
                            monthly_rent: 0,
                            contract_end: null
                        }
                    },
                    menu: [],
                    inventory: [],
                    operations: {
                        peak_hours: [],
                        utilization_rate: 0,
                        avg_stay_time: 0
                    },
                    sv: '',
                    status: 'Active'
                };
                db.franchises.push(franchise);
            }
            currentFranchise = franchise; // Set context
        }

        // Extract Sales - can be on same line or separate line
        const salesMatch = trimmedLine.match(/매출\s*([0-9,]+)/);
        if (salesMatch && currentFranchise) {
            currentFranchise.sales = parseInt(salesMatch[1].replace(/,/g, ''));
        }

        // Extract Location - handle multi-word locations like "서울 강남구"
        const locationMatch = trimmedLine.match(/위치\s+(.+?)(?:\s*$)/);
        if (locationMatch && currentFranchise) {
            const fullLocation = locationMatch[1].trim();

            // 시/구 분리
            const parts = fullLocation.split(/\s+/);
            if (parts.length >= 2) {
                currentFranchise.location.city = parts[0];
                currentFranchise.location.district = parts[1];
                currentFranchise.location.address = fullLocation;
            } else {
                currentFranchise.location.city = fullLocation;
                currentFranchise.location.district = '';
                currentFranchise.location.address = fullLocation;
            }
        }

        // Extract SV Info and link to franchise
        const svMatch = trimmedLine.match(/SV\s+([가-힣]+)/);
        if (svMatch) {
            const svName = svMatch[1];
            let sv = db.svs.find(s => s.name === svName);
            if (!sv) {
                sv = { name: svName, franchises: [] };
                db.svs.push(sv);
            }
            currentSV = sv;

            // Link SV to current franchise if in context
            if (currentFranchise) {
                currentFranchise.sv = svName;

                // Add franchise to SV's list if not already there
                if (!sv.franchises.includes(currentFranchise.name)) {
                    sv.franchises.push(currentFranchise.name);
                }
            }
        }

        // Extract Market Info - avoid duplicates
        if (trimmedLine.includes('시장') || trimmedLine.includes('트렌드')) {
            // Check if this exact description already exists
            const exists = db.market.some(m => m.description === trimmedLine);
            if (!exists) {
                db.market.push({
                    description: trimmedLine,
                    date: new Date().toISOString()
                });
            }
        }

        // Reset context when we hit a new section or empty line
        if (trimmedLine.startsWith('가맹점')) {
            currentSV = null; // Reset SV context for new franchise
        }
    });

    writeDB(db);
    return db;
}

module.exports = { processText };
