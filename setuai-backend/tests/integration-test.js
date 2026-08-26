const assert = require('node:assert/strict');
const path = require('node:path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Prevent an integration run from sending real notifications.
process.env.EMAIL_USER = 'integration-test@invalid.test';
process.env.EMAIL_APP_PASSWORD = 'not-a-real-password';
process.env.DISABLE_EMAIL = 'true';

const app = require('../index');
const User = require('../models/User');
const Challenge = require('../models/Challenge');
const Solution = require('../models/Solution');
const Comment = require('../models/Comment');

const runId = `integration-${Date.now()}`;
const challengeTitle = `${randomUUID()} traffic safety monitoring`;
const createdUserIds = [];
let server;

const createUser = async (name, role, options = {}) => {
    const user = await User.create({
        name,
        email: `${role}.${runId}.${createdUserIds.length}@example.invalid`,
        password: await bcrypt.hash('password123', 10),
        role,
        organization: options.organization,
        isVerified: options.isVerified ?? true,
    });
    createdUserIds.push(user._id);
    return user;
};

const tokenFor = (user) => jwt.sign(
    { user: { id: user.id, role: user.role } },
    process.env.JWT_SECRET,
    { expiresIn: '10m' },
);

const request = async (method, pathname, { token, body, expectedStatus } = {}) => {
    const response = await fetch(`${baseUrl}${pathname}`, {
        method,
        headers: {
            ...(token ? { 'auth-token': token } : {}),
            ...(body ? { 'content-type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    console.log(`${method} ${pathname} -> ${response.status}`);
    assert.equal(response.status, expectedStatus, `${method} ${pathname}: ${JSON.stringify(data)}`);
    return data;
};

let baseUrl;

const cleanup = async () => {
    if (createdUserIds.length > 0) {
        await Comment.deleteMany({ postedBy: { $in: createdUserIds } });
        const challenges = await Challenge.find({ submittedBy: { $in: createdUserIds } }).select('_id');
        const challengeIds = challenges.map((challenge) => challenge._id);
        if (challengeIds.length > 0) {
            await Comment.deleteMany({ challenge: { $in: challengeIds } });
            await Solution.deleteMany({ challenge: { $in: challengeIds } });
            await Challenge.deleteMany({ _id: { $in: challengeIds } });
        }
        await User.deleteMany({ _id: { $in: createdUserIds } });
        const remainingUsers = await User.countDocuments({ _id: { $in: createdUserIds } });
        assert.equal(remainingUsers, 0, 'Integration cleanup left test users in the database');
    }
};

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}/api`;

    const citizen = await createUser('Integration Citizen', 'citizen');
    const university = await createUser('Integration University', 'university', { organization: 'Integration University' });
    const unrelatedUniversity = await createUser('Unrelated University', 'university', { organization: 'Unrelated University' });
    const industry = await createUser('Integration Industry', 'industry', { organization: 'Integration Industry' });
    const teammate = await createUser('Integration Teammate', 'citizen');
    const admin = await createUser('Integration Admin', 'admin');
    const unverified = await createUser('Integration Unverified', 'citizen', { isVerified: false });

    const citizenToken = tokenFor(citizen);
    const universityToken = tokenFor(university);
    const unrelatedUniversityToken = tokenFor(unrelatedUniversity);
    const industryToken = tokenFor(industry);
    const teammateToken = tokenFor(teammate);
    const adminToken = tokenFor(admin);

    await request('GET', '/challenges', { expectedStatus: 200 });
    await request('GET', '/analytics/overview', { expectedStatus: 200 });
    await request('GET', '/auth/getuser', { token: citizenToken, expectedStatus: 200 });
    await request('GET', '/auth/getuser', { expectedStatus: 401 });
    await request('GET', '/challenges/not-an-id/solutions', { expectedStatus: 400 });
    await request('PUT', '/solutions/not-an-id/upvote', { token: citizenToken, expectedStatus: 400 });

    const challenge = await request('POST', '/challenges', {
        token: citizenToken,
        body: {
            title: challengeTitle,
            description: 'Install sensors and alerts at accident-prone junctions to improve road safety.',
            severity: 'High',
        },
        expectedStatus: 201,
    });

    await request('GET', `/challenges/${challenge._id}`, { expectedStatus: 200 });
    await request('PUT', `/challenges/${challenge._id}/upvote`, { token: citizenToken, expectedStatus: 200 });
    await request('PUT', `/challenges/${challenge._id}/assign`, { token: universityToken, expectedStatus: 200 });
    await request('GET', '/challenges/my-assigned', { token: universityToken, expectedStatus: 200 });
    await request('PUT', `/challenges/${challenge._id}/status`, {
        token: universityToken,
        body: { status: 'Under Review' },
        expectedStatus: 200,
    });
    await request('POST', `/challenges/${challenge._id}/express-interest`, { token: industryToken, expectedStatus: 200 });

    const comment = await request('POST', `/challenges/${challenge._id}/comments`, {
        token: citizenToken,
        body: { text: 'This is a valid integration-test comment.' },
        expectedStatus: 201,
    });
    await request('GET', `/challenges/${challenge._id}/comments`, { expectedStatus: 200 });
    await request('PUT', `/comments/${comment._id}`, {
        token: citizenToken,
        body: { text: 'This integration-test comment was edited.' },
        expectedStatus: 200,
    });

    const solutionResponse = await request('POST', `/challenges/${challenge._id}/solutions`, {
        token: universityToken,
        body: {
            title: 'Sensor-based traffic safety platform',
            description: 'A technical proposal for real-time incident detection and safety alerts.',
        },
        expectedStatus: 201,
    });
    const solution = solutionResponse.solution;

    await request('GET', `/challenges/${challenge._id}/solutions`, { expectedStatus: 200 });
    await request('PUT', `/solutions/${solution._id}/assign`, {
        token: universityToken,
        body: { teamMembers: ['not-an-id'] },
        expectedStatus: 400,
    });
    await request('PUT', `/solutions/${solution._id}/assign`, {
        token: unrelatedUniversityToken,
        body: { teamMembers: [teammate.id] },
        expectedStatus: 403,
    });
    await request('PUT', `/solutions/${solution._id}/assign`, {
        token: universityToken,
        body: { teamMembers: [teammate.id] },
        expectedStatus: 200,
    });
    await request('PUT', `/solutions/${solution._id}/status`, {
        token: universityToken,
        body: { status: 'In Progress' },
        expectedStatus: 200,
    });
    await request('PUT', `/solutions/${solution._id}/status`, {
        token: unrelatedUniversityToken,
        body: { status: 'Solved' },
        expectedStatus: 403,
    });
    await request('POST', `/solutions/${solution._id}/submissions`, {
        token: teammateToken,
        body: { link: 'https://example.com/integration-test', note: 'Integration test artifact' },
        expectedStatus: 201,
    });
    await request('PUT', `/solutions/${solution._id}/upvote`, { token: citizenToken, expectedStatus: 200 });
    await request('GET', '/solutions/my-solutions', { token: universityToken, expectedStatus: 200 });
    await request('GET', '/solutions/leaderboard', { expectedStatus: 200 });

    await request('GET', '/analytics/by-category', { expectedStatus: 200 });
    await request('GET', '/analytics/by-status', { expectedStatus: 200 });
    await request('GET', '/analytics/by-severity', { expectedStatus: 200 });
    await request('GET', '/analytics/submissions-over-time', { expectedStatus: 200 });
    await request('GET', '/analytics/multi-institutional-count', { expectedStatus: 200 });

    await request('GET', '/admin/users', { token: adminToken, expectedStatus: 200 });
    await request('POST', '/admin/create-account', { token: adminToken, body: {}, expectedStatus: 400 });
    const verificationResponse = await request('PUT', `/admin/users/${unverified.id}/verify`, {
        token: adminToken,
        expectedStatus: 200,
    });
    assert.equal('password' in verificationResponse.user, false, 'Admin verification response must not include a password hash');
    await request('DELETE', `/comments/${comment._id}`, { token: citizenToken, expectedStatus: 200 });

    console.log('Integration workflow completed successfully.');
};

run()
    .catch((error) => {
        console.error('Integration workflow failed:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await cleanup();
        if (server) await new Promise((resolve) => server.close(resolve));
        await mongoose.connection.close();
        console.log('Integration test data cleaned up.');
    });
