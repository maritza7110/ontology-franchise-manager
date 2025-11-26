const { encrypt, decrypt } = require('./utils/security');

console.log('=== Security Module Test ===\n');

// Test 1: Basic encryption and decryption
console.log('Test 1: Basic Encryption/Decryption');
const originalText = 'This is sensitive franchise data';
console.log('Original text:', originalText);

try {
    const encrypted = encrypt(originalText);
    console.log('Encrypted:', encrypted);

    const decrypted = decrypt(encrypted);
    console.log('Decrypted:', decrypted);

    if (originalText === decrypted) {
        console.log('✓ Test 1 PASSED\n');
    } else {
        console.log('✗ Test 1 FAILED - Decrypted text does not match original\n');
    }
} catch (error) {
    console.log('✗ Test 1 FAILED:', error.message, '\n');
}

// Test 2: Unicode support
console.log('Test 2: Korean Text Support');
const koreanText = '가맹점 데이터: 서울점 매출 1000000원';
console.log('Original text:', koreanText);

try {
    const encrypted = encrypt(koreanText);
    console.log('Encrypted:', encrypted);

    const decrypted = decrypt(encrypted);
    console.log('Decrypted:', decrypted);

    if (koreanText === decrypted) {
        console.log('✓ Test 2 PASSED\n');
    } else {
        console.log('✗ Test 2 FAILED - Decrypted text does not match original\n');
    }
} catch (error) {
    console.log('✗ Test 2 FAILED:', error.message, '\n');
}

// Test 3: Error handling for invalid input
console.log('Test 3: Invalid Decryption Input');
try {
    decrypt('invalid:encrypted:text');
    console.log('✗ Test 3 FAILED - Should have thrown an error\n');
} catch (error) {
    console.log('✓ Test 3 PASSED - Correctly caught error:', error.message, '\n');
}

// Test 4: Empty string
console.log('Test 4: Empty String');
try {
    const encrypted = encrypt('');
    const decrypted = decrypt(encrypted);

    if (decrypted === '') {
        console.log('✓ Test 4 PASSED\n');
    } else {
        console.log('✗ Test 4 FAILED\n');
    }
} catch (error) {
    console.log('✗ Test 4 FAILED:', error.message, '\n');
}

console.log('=== All Tests Complete ===');
