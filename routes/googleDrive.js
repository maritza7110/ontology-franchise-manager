const express = require('express');
const router = express.Router();
const {
    getAuthUrl,
    getTokenFromCode,
    listDriveFiles,
    downloadFile
} = require('../services/googleDrive');
const { processText } = require('../services/nlp');
const { extractText } = require('../services/extractor');

/**
 * 구글 드라이브 OAuth 라우트
 */

// 1. 인증 URL 생성
router.get('/auth-url', (req, res) => {
    try {
        const authUrl = getAuthUrl();
        res.json({ authUrl });
    } catch (error) {
        res.status(500).json({
            error: error.message,
            hint: '환경 변수 GOOGLE_CLIENT_ID와 GOOGLE_CLIENT_SECRET를 설정하세요.'
        });
    }
});

// 2. OAuth 콜백 처리
router.get('/oauth2callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('인증 코드가 없습니다.');
    }

    try {
        await getTokenFromCode(code);
        res.send(`
            <html>
                <body>
                    <h1>✅ 구글 드라이브 연동 완료!</h1>
                    <p>이 창을 닫고 앱으로 돌아가세요.</p>
                    <script>
                        window.opener.postMessage({ type: 'google-auth-success' }, '*');
                        setTimeout(() => window.close(), 2000);
                    </script>
                </body>
            </html>
        `);
    } catch (error) {
        res.status(500).send(`인증 실패: ${error.message}`);
    }
});

// 3. 파일 목록 조회
router.get('/files', async (req, res) => {
    try {
        const files = await listDriveFiles({
            fileTypes: [
                'text/plain',
                'application/pdf',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ]
        });

        res.json({ files });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. 파일 다운로드 및 처리
router.post('/process-file/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;

        console.log(`[Google Drive] 파일 다운로드 중: ${fileId}`);

        // 파일 다운로드
        const fileBuffer = await downloadFile(fileId);

        // 가상 파일 객체 생성
        const file = {
            buffer: fileBuffer,
            originalname: req.body.filename || 'drive-file.txt',
            mimetype: req.body.mimetype || 'text/plain'
        };

        // 텍스트 추출
        const extractionResult = await extractText(file);
        console.log(`[Google Drive] 텍스트 추출 완료: ${extractionResult.content.length}자`);

        // NLP 처리
        const processedData = processText(extractionResult.content);
        console.log(`[Google Drive] 처리 완료 - 가맹점: ${processedData.franchises.length}개`);

        res.json({
            message: 'Google Drive 파일 처리 완료',
            fileName: file.originalname,
            ontologySnapshot: processedData
        });
    } catch (error) {
        console.error('[Google Drive] 파일 처리 실패:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
