document.addEventListener('DOMContentLoaded', () => {
    // Upload Method Switching
    const methodBtns = document.querySelectorAll('.method-btn');
    const uploadAreas = document.querySelectorAll('.upload-area');

    methodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const method = btn.dataset.method;

            // Update active states
            methodBtns.forEach(b => b.classList.remove('active'));
            uploadAreas.forEach(a => a.classList.remove('active'));

            btn.classList.add('active');

            // Explicitly handle each method to avoid ID errors
            if (method === 'file') document.getElementById('file-upload-area').classList.add('active');
            else if (method === 'text') document.getElementById('text-input-area').classList.add('active');
            else if (method === 'drive') document.getElementById('drive-area').classList.add('active');
        });
    });

    // Tab Switching
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');

            loadTabData(tab.dataset.tab);
        });
    });

    // File Upload
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const statusDiv = document.getElementById('upload-status');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#4a90e2';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '#444';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#444';
        const files = e.dataTransfer.files;
        if (files.length) handleUpload(files[0]);
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) handleUpload(fileInput.files[0]);
    });

    // Text Direct Input Handler
    document.getElementById('text-submit-btn')?.addEventListener('click', async () => {
        const textContent = document.getElementById('text-direct-input').value;
        const statusDiv = document.getElementById('upload-status');
        const btn = document.getElementById('text-submit-btn');

        if (!textContent.trim()) {
            alert('텍스트를 입력해주세요.');
            return;
        }

        btn.disabled = true;
        btn.textContent = '처리 중...';
        statusDiv.textContent = 'Processing text...';

        try {
            // Create a blob from text and send as file
            const blob = new Blob([textContent], { type: 'text/plain' });
            const formData = new FormData();
            formData.append('file', blob, 'direct-input.txt');

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                statusDiv.textContent = `Success: ${data.message}`;
                document.getElementById('text-direct-input').value = ''; // Clear input
                loadDashboard(); // Refresh data
            } else {
                statusDiv.textContent = `Error: ${data.error}`;
            }
        } catch (error) {
            statusDiv.textContent = `Upload failed: ${error.message}`;
        } finally {
            btn.disabled = false;
            btn.textContent = '📝 데이터 처리';
        }
    });

    async function handleUpload(file) {
        const formData = new FormData();
        formData.append('file', file);

        statusDiv.textContent = 'Uploading and processing...';

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok) {
                statusDiv.textContent = `Success: ${data.message}`;
                loadDashboard(); // Refresh data
            } else {
                statusDiv.textContent = `Error: ${data.error}`;
            }
        } catch (error) {
            statusDiv.textContent = `Upload failed: ${error.message}`;
        }
    }

    // Data Loading
    async function loadTabData(tabName) {
        if (tabName === 'dashboard') loadDashboard();
        if (tabName === 'franchise') loadFranchise();
        if (tabName === 'sv') loadSV();
        if (tabName === 'external') loadExternalFactors();
        if (tabName === 'simulation') { } // No auto-load
        if (tabName === 'ontology') {
            if (window.initOntologyGraph) window.initOntologyGraph();
        }
        if (tabName === 'market') loadMarket();
    }

    async function loadDashboard() {
        try {
            const res = await fetch('/api/analysis/franchise-ranking');
            const franchises = await res.json();

            // Filter out non-franchise items (reports, analysis results)
            const validFranchises = franchises.filter(f =>
                !f.name.includes('보고서') &&
                !f.name.includes('분석') &&
                !f.name.includes('Report')
            );

            const totalSales = validFranchises.reduce((sum, f) => sum + (f.sales || 0), 0);

            document.getElementById('total-franchises').textContent = validFranchises.length;
            document.getElementById('total-sales').textContent = totalSales.toLocaleString() + '원';

            renderChart(validFranchises);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        }
    }

    async function loadFranchise() {
        const res = await fetch('/api/analysis/franchise-ranking');
        const data = await res.json();
        const list = document.getElementById('franchise-list');
        list.innerHTML = data.map(f => `
            <li class="list-item">
                <span>${f.name}</span>
                <span>${(f.sales || 0).toLocaleString()}원</span>
            </li>
        `).join('');
    }

    async function loadSV() {
        const res = await fetch('/api/analysis/sv-performance');
        const data = await res.json();
        const list = document.getElementById('sv-list');
        list.innerHTML = data.map(s => `
            <li class="list-item">
                <span>${s.name}</span>
                <span>성과 점수: ${s.performanceScore}</span>
            </li>
        `).join('');
    }

    async function loadMarket() {
        const res = await fetch('/api/analysis/market');
        const data = await res.json();
        const list = document.getElementById('market-list');
        list.innerHTML = data.map(m => `
            <li class="list-item">
                <span>${m.description}</span>
                <small>${new Date(m.date).toLocaleDateString()}</small>
            </li>
        `).join('');
    }

    let salesChart = null;
    function renderChart(data) {
        const ctx = document.getElementById('salesChart').getContext('2d');
        if (salesChart) salesChart.destroy();

        salesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(f => f.name),
                datasets: [{
                    label: '매출',
                    data: data.map(f => f.sales),
                    backgroundColor: '#4a90e2'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    // External Factors Loading
    async function loadExternalFactors() {
        try {
            const res = await fetch('/api/external-factors');
            const factors = await res.json();
            const grid = document.getElementById('external-factors-grid');

            if (factors.length === 0) {
                grid.innerHTML = '<p class="empty-state">외부 요인이 없습니다. "최신 데이터 수집" 버튼을 눌러주세요.</p>';
                return;
            }

            grid.innerHTML = factors.map(f => `
                <div class="factor-card severity-${f.severity?.toLowerCase() || 'medium'}">
                    <div class="factor-header">
                        <span class="factor-category">${getCategoryIcon(f.category)} ${f.category}</span>
                        <span class="factor-severity">${getSeverityText(f.severity)}</span>
                    </div>
                    <h4>${f.title}</h4>
                    <p>${f.description || ''}</p>
                    <div class="factor-impact">
                        <strong>영향 업종:</strong> ${(f.impact_areas || []).join(', ')}
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Failed to load external factors:', error);
        }
    }

    function getCategoryIcon(category) {
        const icons = {
            'ECONOMIC': '💰',
            'POLITICAL': '⚖️',
            'SOCIAL': '👥',
            'TECHNOLOGICAL': '💻'
        };
        return icons[category] || '📊';
    }

    function getSeverityText(severity) {
        const texts = {
            'HIGH': '🔴 높음',
            'MEDIUM': '🟡 중간',
            'LOW': '🟢 낮음'
        };
        return texts[severity] || '🟡 중간';
    }

    // Crawl Button
    document.getElementById('crawl-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('crawl-btn');
        btn.disabled = true;
        btn.textContent = '🔄 수집 중...';

        try {
            const res = await fetch('/api/simulation/crawl', { method: 'POST' });
            const data = await res.json();

            alert(`✅ ${data.factors_count}개 외부 요인 수집 완료!`);
            loadExternalFactors();
        } catch (error) {
            alert('❌ 데이터 수집 실패: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = '🔄 최신 데이터 수집';
        }
    });

    // AI Simulation Query
    document.getElementById('query-btn')?.addEventListener('click', async () => {
        const query = document.getElementById('query-input').value;
        const resultDiv = document.getElementById('simulation-result');
        const btn = document.getElementById('query-btn');

        if (!query.trim()) {
            alert('질문을 입력해주세요.');
            return;
        }

        btn.disabled = true;
        btn.textContent = '분석 중...';
        resultDiv.innerHTML = '<p class="loading">AI가 분석 중입니다...</p>';

        try {
            const res = await fetch('/api/simulation/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            const data = await res.json();

            if (data.error) {
                resultDiv.innerHTML = `<p class="error">❌ ${data.error}</p>`;
                return;
            }

            resultDiv.innerHTML = `
                <div class="result-box">
                    <h3>📊 분석 결과</h3>
                    <div class="result-factors">
                        <strong>감지된 요인:</strong> ${data.factors.join(', ')}
                    </div>
                    <div class="result-impact">
                        <p><strong>영향받는 가맹점:</strong> ${data.simulation.affected_store_count}개</p>
                        <p><strong>평균 위험도:</strong> ${data.simulation.avg_risk_score}점</p>
                        ${data.simulation.estimated_monthly_cost > 0 ?
                    `<p><strong>예상 월 비용:</strong> ${data.simulation.estimated_monthly_cost.toLocaleString()}원</p>`
                    : ''}
                    </div>
                    <div class="result-response">
                        <pre>${data.response}</pre>
                    </div>
                </div>
            `;
        } catch (error) {
            resultDiv.innerHTML = `<p class="error">❌ 분석 실패: ${error.message}</p>`;
        } finally {
            btn.disabled = false;
            btn.textContent = '🤖 AI 분석 요청';
        }
    });

    async function processDriveFile(fileId, fileName) {
        const statusDiv = document.getElementById('upload-status');
        statusDiv.textContent = `${fileName} 처리 중...`;

        try {
            const res = await fetch(`/api/drive/process-file/${fileId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: fileName })
            });

            const data = await res.json();

            if (res.ok) {
                statusDiv.textContent = `✅ ${data.message}`;
                loadDashboard();
            } else {
                statusDiv.textContent = `❌ ${data.error}`;
            }
        } catch (error) {
            statusDiv.textContent = `❌ 처리 실패: ${error.message}`;
        }
    }

    // Google Drive Auth Button
    document.getElementById('google-auth-btn')?.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/drive/auth-url');
            const { authUrl } = await res.json();

            // Open popup
            const width = 500;
            const height = 600;
            const left = (window.screen.width / 2) - (width / 2);
            const top = (window.screen.height / 2) - (height / 2);

            window.open(authUrl, 'Google Auth', `width=${width},height=${height},top=${top},left=${left}`);

            // Listen for success message
            window.addEventListener('message', (event) => {
                if (event.data.type === 'google-auth-success') {
                    alert('✅ 구글 드라이브 연동 성공!');
                    // Optionally refresh file list here
                }
            }, { once: true });
        } catch (error) {
            console.error('Auth Error:', error);
            alert('인증 URL을 가져오는데 실패했습니다. API 설정을 확인해주세요.');
        }
    });

    // API Settings Modal
    const openApiConfigBtn = document.getElementById('open-api-config');
    const closeApiConfigBtn = document.getElementById('close-api-config');
    const saveApiConfigBtn = document.getElementById('save-api-config');
    const apiConfigModal = document.getElementById('api-config-modal');

    openApiConfigBtn?.addEventListener('click', () => {
        // Load existing values from localStorage
        const clientId = localStorage.getItem('google_client_id') || '';
        const clientSecret = localStorage.getItem('google_client_secret') || '';

        document.getElementById('google-client-id').value = clientId;
        document.getElementById('google-client-secret').value = clientSecret;

        apiConfigModal.classList.remove('hidden');
    });

    closeApiConfigBtn?.addEventListener('click', () => {
        apiConfigModal.classList.add('hidden');
    });

    saveApiConfigBtn?.addEventListener('click', () => {
        const clientId = document.getElementById('google-client-id').value.trim();
        const clientSecret = document.getElementById('google-client-secret').value.trim();

        if (clientId && clientSecret) {
            localStorage.setItem('google_client_id', clientId);
            localStorage.setItem('google_client_secret', clientSecret);
            alert('✅ API 설정이 저장되었습니다!');
            apiConfigModal.classList.add('hidden');
        } else {
            alert('⚠️ Client ID와 Client Secret을 모두 입력해주세요.');
        }
    });

    // Initial Load
    loadDashboard();
});
