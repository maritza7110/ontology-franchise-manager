const { google } = require('googleapis');
const { writeFileSync, readFileSync, existsSync } = require('fs');
const path = require('path');

/**
 * 구글 드라이브 OAuth 연동
 * 사용자 인증 후 드라이브에서 파일 목록 조회 및 다운로드
 */

// OAuth2 클라이언트 설정
// 실제 사용 시 Google Cloud Console에서 OAuth 클라이언트 ID 발급 필요
const CREDENTIALS_PATH = path.join(__dirname, '../config/google-credentials.json');
const TOKEN_PATH = path.join(__dirname, '../config/google-token.json');

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

/**
 * OAuth2 클라이언트 생성
 */
function createOAuth2Client() {
    // 실제 환경에서는 환경 변수나 설정 파일에서 로드
    // Production URL on Render
    const productionRedirectUri = 'https://ontology-franchise-manager.onrender.com/api/drive/oauth2callback';
    const localRedirectUri = 'http://localhost:3000/api/drive/oauth2callback';

    const redirectUri = process.env.NODE_ENV === 'production' ? productionRedirectUri : localRedirectUri;

    const credentials = {
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uris: [redirectUri]
    };

    const { client_id, client_secret, redirect_uris } = credentials;

    if (!client_id || !client_secret) {
        throw new Error('Google OAuth 자격증명이 설정되지 않았습니다. 환경 변수 GOOGLE_CLIENT_ID와 GOOGLE_CLIENT_SECRET를 설정하세요.');
    }

    return new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    );
}

/**
 * 인증 URL 생성
 */
function getAuthUrl() {
    const oauth2Client = createOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });

    return authUrl;
}

/**
 * 인증 코드로 토큰 획득
 */
async function getTokenFromCode(code) {
    const oauth2Client = createOAuth2Client();

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // 토큰 저장
    writeFileSync(TOKEN_PATH, JSON.stringify(tokens));

    return tokens;
}

/**
 * 저장된 토큰으로 클라이언트 인증
 */
function getAuthenticatedClient() {
    if (!existsSync(TOKEN_PATH)) {
        return null;
    }

    const oauth2Client = createOAuth2Client();
    const token = JSON.parse(readFileSync(TOKEN_PATH, 'utf-8'));
    oauth2Client.setCredentials(token);

    return oauth2Client;
}

/**
 * 드라이브에서 파일 목록 조회
 */
async function listDriveFiles(query = {}) {
    const auth = getAuthenticatedClient();

    if (!auth) {
        throw new Error('Google Drive 인증이 필요합니다.');
    }

    const drive = google.drive({ version: 'v3', auth });

    const params = {
        pageSize: 50,
        fields: 'files(id, name, mimeType, modifiedTime, size)',
        orderBy: 'modifiedTime desc'
    };

    // 특정 폴더만 검색 (옵션)
    if (query.folderId) {
        params.q = `'${query.folderId}' in parents`;
    }

    // 파일 타입 필터
    if (query.fileTypes) {
        const mimeTypes = query.fileTypes.map(type => `mimeType='${type}'`).join(' or ');
        params.q = params.q ? `${params.q} and (${mimeTypes})` : mimeTypes;
    }

    const res = await drive.files.list(params);

    return res.data.files;
}

/**
 * 특정 파일 다운로드
 */
async function downloadFile(fileId) {
    const auth = getAuthenticatedClient();

    if (!auth) {
        throw new Error('Google Drive 인증이 필요합니다.');
    }

    const drive = google.drive({ version: 'v3', auth });

    const res = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
    );

    return Buffer.from(res.data);
}

/**
 * 파일 메타데이터 조회
 */
async function getFileMetadata(fileId) {
    const auth = getAuthenticatedClient();

    if (!auth) {
        throw new Error('Google Drive 인증이 필요합니다.');
    }

    const drive = google.drive({ version: 'v3', auth });

    const res = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, modifiedTime, parents'
    });

    return res.data;
}

module.exports = {
    getAuthUrl,
    getTokenFromCode,
    getAuthenticatedClient,
    listDriveFiles,
    downloadFile,
    getFileMetadata
};
