const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const axios = require('axios');
const mongoose = require('mongoose');

// Import server
const app = require('../index.js');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

const runTests = async () => {
    console.log('🚀 Starting Vernacular Translation Wrapper tests...\n');
    let server;

    try {
        // Start the server programmatically
        server = app.listen(PORT, () => {
            console.log(`✅ Test server listening on port ${PORT}`);
        });

        // Wait a bit for db connection (if any)
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // 1. Get supported languages
        console.log('Testing: GET /languages');
        const langsRes = await axios.get(`${BASE_URL}/languages`);
        const langs = langsRes.data.languages;
        console.log(`✅ Succeeded. Supported languages list loaded, count: ${Object.keys(langs).length}`);
        if (!langs.hi || !langs.ta || !langs.te) {
            throw new Error('Missing standard languages (hi, ta, te)');
        }

        // 2. Translate Offline Text (Tamil)
        console.log('Testing: POST /translate (Offline Tamil)');
        const offlineTamilRes = await axios.post(`${BASE_URL}/translate`, {
            text: 'Power surge detected',
            target_language: 'ta'
        });
        console.log('✅ Succeeded. Result:');
        console.log(JSON.stringify(offlineTamilRes.data, null, 2));
        if (offlineTamilRes.data.engine !== 'offline_dictionary') {
            throw new Error(`Expected offline_dictionary engine, got: ${offlineTamilRes.data.engine}`);
        }

        // 3. Translate Dynamic Text (Hindi)
        console.log('Testing: POST /translate (Dynamic Hindi)');
        const dynamicHindiRes = await axios.post(`${BASE_URL}/translate`, {
            text: 'Please wear protective boots before entering the power room.',
            target_language: 'hi'
        });
        console.log('✅ Succeeded. Result:');
        console.log(JSON.stringify(dynamicHindiRes.data, null, 2));

        // 4. Batch Translation (Hindi)
        console.log('Testing: POST /translate/batch (Batch Hindi)');
        const batchRes = await axios.post(`${BASE_URL}/translate/batch`, {
            texts: [
                'Power surge detected',
                'Monthly energy bill',
                'Wear safety goggles.'
            ],
            target_language: 'hi'
        });
        console.log('✅ Succeeded. Result:');
        console.log(JSON.stringify(batchRes.data, null, 2));
        if (batchRes.data.count !== 3) {
            throw new Error(`Expected 3 translations, got: ${batchRes.data.count}`);
        }

        console.log('\n🎉 ALL VERNACULAR TRANSLATOR TESTS PASSED SUCCESSFULLY! 🎉');

    } catch (error) {
        console.error('\n❌ TEST FAILED with error:');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    } finally {
        // Close server if open
        if (server) {
            server.close(() => {
                console.log('Test server shut down.');
            });
        }
        // Close Mongoose connection
        try {
            await mongoose.connection.close();
            console.log('Database connection closed.');
        } catch (e) {}
        console.log('Exiting test script.');
        process.exit(0);
    }
};

runTests();
