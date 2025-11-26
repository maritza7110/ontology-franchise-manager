const crypto = require('crypto');

// AES-256-GCM encryption
// Note: In production, store the encryption key in environment variables
// Using a static key for development/testing - should be 32 bytes (256 bits)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
    ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex')
    : Buffer.from('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'hex'); // 32 bytes
const IV_LENGTH = 16; // 128 bits for AES

/**
 * Encrypts text using AES-256-GCM algorithm
 * @param {string} text - The text to encrypt
 * @returns {string} - Encrypted text in format: iv:authTag:encryptedData (hex)
 */
function encrypt(text) {
    try {
        // Generate a random initialization vector
        const iv = crypto.randomBytes(IV_LENGTH);

        // Create cipher with AES-256-GCM
        const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

        // Encrypt the text
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Get the authentication tag
        const authTag = cipher.getAuthTag();

        // Return iv:authTag:encryptedData format
        return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error('Failed to encrypt data');
    }
}

/**
 * Decrypts text encrypted with AES-256-GCM
 * @param {string} encryptedText - Encrypted text in format: iv:authTag:encryptedData (hex)
 * @returns {string} - Decrypted plain text
 */
function decrypt(encryptedText) {
    try {
        // Split the encrypted text into components
        const parts = encryptedText.split(':');

        if (parts.length !== 3) {
            throw new Error('Invalid encrypted text format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];

        // Create decipher with AES-256-GCM
        const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

        // Set the authentication tag
        decipher.setAuthTag(authTag);

        // Decrypt the text
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error('Failed to decrypt data');
    }
}

module.exports = { encrypt, decrypt };
