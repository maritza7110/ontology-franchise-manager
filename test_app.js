const http = require('http');

function checkServer() {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/',
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        console.log(`STATUS: ${res.statusCode}`);
        if (res.statusCode === 200) {
            console.log('Server is running and serving index.html');
        } else {
            console.log('Server returned unexpected status');
        }
    });

    req.on('error', (e) => {
        console.error(`Server check failed: ${e.message}`);
        process.exit(1);
    });

    req.end();
}

// Wait for server to start
setTimeout(checkServer, 2000);
