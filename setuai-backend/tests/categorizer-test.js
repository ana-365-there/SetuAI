const assert = require('node:assert/strict');
const path = require('node:path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const categorizeChallenge = require('../utils/categorizer');
const routeToUniversity = require('../utils/routeToUniversity');

const CATEGORIES = new Set([
    'Healthcare',
    'Education',
    'Agriculture',
    'Environment',
    'Technology',
    'Infrastructure',
    'Other',
]);

const run = async () => {
    const category = await categorizeChallenge(
        'Lack of doctors in primary health centers',
        'Our primary health center has had no resident doctor for six months.',
    );

    assert.ok(CATEGORIES.has(category), `Unexpected category: ${category}`);

    const university = routeToUniversity(category);
    assert.ok(university === null || typeof university === 'string');
    assert.equal(routeToUniversity('Healthcare'), 'AIIMS');
    assert.equal(routeToUniversity('Technology'), 'VIT');

    console.log(`Categorized as: ${category}`);
    console.log(`Routed to: ${university}`);
};

run().catch((error) => {
    console.error('Categorizer test failed:', error.message);
    process.exitCode = 1;
});
