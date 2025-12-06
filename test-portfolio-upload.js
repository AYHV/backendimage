const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test portfolio upload functionality
async function testPortfolioUpload() {
    try {
        console.log('🚀 Testing Portfolio Upload API...\n');

        // First, login to get admin token
        console.log('1. Logging in as admin...');
        const loginResponse = await axios.post('http://localhost:5000/api/v1/auth/login', {
            email: 'admin@example.com',
            password: 'Admin123!@#'
        });

        const token = loginResponse.data.data.accessToken;
        console.log('✅ Login successful, got token');

        // Create form data for portfolio upload
        console.log('\n2. Preparing portfolio upload...');
        const formData = new FormData();
        
        // Add required fields
        formData.append('title', 'Test Portfolio Item');
        formData.append('description', 'This is a test portfolio item created via API');
        formData.append('category', 'Portrait');
        formData.append('featured', 'false');
        formData.append('isPublished', 'true');

        // Create a small test image buffer (1x1 pixel PNG)
        const testImageBuffer = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
            0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
            0x01, 0x00, 0x01, 0x5C, 0xC2, 0x5D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
            0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);

        // Add the test image
        formData.append('images', testImageBuffer, {
            filename: 'test-image.png',
            contentType: 'image/png'
        });

        // Upload portfolio item
        console.log('📤 Uploading portfolio item...');
        const uploadResponse = await axios.post(
            'http://localhost:5000/api/v1/portfolio',
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    ...formData.getHeaders()
                }
            }
        );

        console.log('✅ Portfolio upload successful!');
        console.log('Response:', JSON.stringify(uploadResponse.data, null, 2));

    } catch (error) {
        console.error('❌ Test failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('No response received from server');
            console.error('Request config:', error.config);
        } else {
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
    }
}

// Run the test
testPortfolioUpload();