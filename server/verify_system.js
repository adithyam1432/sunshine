const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let createdItemId = null;

// Helper to make HTTP requests
const request = (method, path, body = null, token = null) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: `/api${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : {};
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

const runTest = async (name, fn) => {
    try {
        process.stdout.write(`Testing: ${name}... `);
        await fn();
        console.log('\x1b[32m%s\x1b[0m', 'PASSED'); // Green
    } catch (e) {
        console.log('\x1b[31m%s\x1b[0m', 'FAILED'); // Red
        console.error('Error:', e.message);
        // Don't exit, try next test
    }
};

const main = async () => {
    console.log('=== Starting Strict System Verification ===\n');
    console.log('Make sure the server is running on port 3000!\n');

    // 1. Test Server Connectivity
    await runTest('Server Connectivity', async () => {
        // We'll try fetching inventory as a simple ping
        const res = await request('GET', '/inventory');
        if (res.status !== 200) throw new Error(`Server returned status ${res.status}`);
    });

    // 2. Test Registration (Create test user)
    const testUser = `testuser_${Date.now()}`;
    await runTest('User Registration', async () => {
        const res = await request('POST', '/auth/register', {
            username: testUser,
            password: 'password123',
            role: 'staff'
        });
        if (res.status !== 200) throw new Error(`Registration failed: ${JSON.stringify(res.data)}`);
    });

    // 3. Test Login
    await runTest('User Login', async () => {
        const res = await request('POST', '/auth/login', {
            username: testUser,
            password: 'password123'
        });
        if (res.status !== 200) throw new Error(`Login failed`);
        // Note: Our current simple auth doesn't actually use tokens deeply, but verifying login works is key
    });

    // 4. Test Add Inventory
    await runTest('Add Inventory Item', async () => {
        const res = await request('POST', '/inventory', {
            name: 'Test Uniform',
            category: 'Uniform',
            size: '32',
            quantity: 100,
            price: 0
        });
        if (res.status !== 200) throw new Error(`Add failed`);
        if (!res.data.id) throw new Error(`No ID returned`);
        createdItemId = res.data.id;
    });

    // 5. Test Verify Inventory Added
    await runTest('Verify Stock Level', async () => {
        const res = await request('GET', '/inventory');
        const item = res.data.find(i => i.id === createdItemId);
        if (!item) throw new Error('New item not found');
        if (item.quantity !== 100) throw new Error(`Expected 100, got ${item.quantity}`);
    });

    // 6. Test Distribution (Transaction)
    await runTest('Distribute Item', async () => {
        const res = await request('POST', '/transactions', {
            student_name: 'Test Student',
            student_class: '10th',
            item_id: createdItemId,
            quantity: 5
        });
        if (res.status !== 200) throw new Error(`Distribution failed: ${JSON.stringify(res.data)}`);
    });

    // 7. Test Stock Deduction
    await runTest('Verify Stock Deduction', async () => {
        const res = await request('GET', '/inventory');
        const item = res.data.find(i => i.id === createdItemId);
        if (item.quantity !== 95) throw new Error(`Expected 95, got ${item.quantity}. Logic Error!`);
    });

    // 8. Test Insufficient Stock
    await runTest('Prevent Insufficient Stock', async () => {
        const res = await request('POST', '/transactions', {
            student_name: 'Greedy Student',
            student_class: '10th',
            item_id: createdItemId,
            quantity: 999
        });
        if (res.status !== 400) throw new Error(`Should have returned 400, got ${res.status}`);
    });

    // 9. Cleanup (Delete Item)
    await runTest('Cleanup (Delete Test Item)', async () => {
        const res = await request('DELETE', `/inventory/${createdItemId}`);
        if (res.status !== 200) throw new Error('Delete failed');
    });

    console.log('\n=== Verification Complete ===');
};

main();
