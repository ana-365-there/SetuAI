const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const Solution = require('../models/Solution');
const User = require('../models/User');

// GET /api/analytics/overview — top-line stats for your dashboard cards
router.get('/analytics/overview', async (req, res) => {
    try {
        const [totalChallenges, openChallenges, totalSolutions, solvedChallenges, totalUniversities, totalIndustries] = await Promise.all([
            Challenge.countDocuments(),
            Challenge.countDocuments({ status: 'Open' }),
            Solution.countDocuments(),
            Challenge.countDocuments({ status: 'Solved' }),
            User.countDocuments({ role: 'university' }),
            User.countDocuments({ role: 'industry' }),
        ]);

        res.json({
            totalChallenges,
            openChallenges,
            totalSolutions,
            solvedChallenges,
            totalUniversities,
            totalIndustries,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/analytics/by-category — challenge counts grouped by category (pie/bar chart)
router.get('/analytics/by-category', async (req, res) => {
    try {
        const data = await Challenge.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/analytics/by-status — challenge counts grouped by status (pipeline funnel chart)
router.get('/analytics/by-status', async (req, res) => {
    try {
        const data = await Challenge.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/analytics/submissions-over-time — challenges created per day/week (line chart)
router.get('/analytics/submissions-over-time', async (req, res) => {
    try {
        const data = await Challenge.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/analytics/by-severity — challenge counts grouped by severity
router.get('/analytics/by-severity', async (req, res) => {
    try {
        const data = await Challenge.aggregate([
            { $group: { _id: '$severity', count: { $sum: 1 } } },
        ]);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;