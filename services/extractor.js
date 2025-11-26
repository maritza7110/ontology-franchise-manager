const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const ExcelJS = require('exceljs');
const mammoth = require('mammoth');

async function extractText(file) {
    const filePath = file.path;
    const mimeType = file.mimetype;
    const originalName = file.originalname;

    try {
        if (mimeType === 'application/pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            return { type: 'text', content: data.text };
        }
        else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || originalName.endsWith('.xlsx')) {
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.readFile(filePath);
            let content = [];
            workbook.eachSheet((sheet, id) => {
                content.push(`Sheet: ${sheet.name}`);
                sheet.eachRow((row, rowNumber) => {
                    content.push(row.values.filter(v => v).join(', '));
                });
            });
            return { type: 'table', content: content.join('\n') };
        }
        else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || originalName.endsWith('.docx')) {
            const result = await mammoth.extractRawText({ path: filePath });
            return { type: 'text', content: result.value };
        }
        else if (mimeType === 'text/plain') {
            const content = fs.readFileSync(filePath, 'utf-8');
            return { type: 'text', content: content };
        }
        else {
            return { type: 'unknown', content: '' };
        }
    } catch (error) {
        console.error('Error extracting text:', error);
        throw new Error('File extraction failed');
    }
}

module.exports = { extractText };
