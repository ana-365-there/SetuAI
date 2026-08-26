const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const checkRole = require('../middleware/checkRole');
const Challenge = require('../models/Challenge');
const notifyUser = require('../utils/notifyUser');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const categorizeChallenge = require('../utils/categorizer');
const routeToUniversity = require('../utils/routeToUniversity');
const hasValidId = (id) => mongoose.isValidObjectId(id);

// GET /challenges — public, no auth needed at all
router.get('/challenges', async (req, res) => {
    try {
        const filter = {};
        if (req.query.category) filter.category = req.query.category;
        if (req.query.status) filter.status = req.query.status;
        if (req.query.severity) filter.severity = req.query.severity;

        const challenges = await Challenge.find(filter).populate('submittedBy', 'name role');
        res.json(challenges);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /challenges — anyone logged in can post (or restrict to citizen/university/industry, your call)
router.post('/challenges', fetchuser, checkRole(['citizen', 'university', 'industry']), [
    body('title', 'Enter a valid title').isLength({ min: 10 }),
    body('description', 'Enter a valid description').isLength({ min: 3 }),
    body('severity', 'Enter a valid severity').isIn(['Low', 'Medium', 'High', 'Critical']),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { title, description, severity } = req.body;
        // Step 1: AI picks the category
        const category = await categorizeChallenge(title, description);

        const checkDuplicate = require('../utils/checkDuplicate');

        // after: const category = await categorizeChallenge(title, description);

        const duplicate = await checkDuplicate(title, category);
        if (duplicate) {
            return res.status(409).json({
                message: 'A similar challenge already exists',
                existingChallenge: { id: duplicate._id, title: duplicate.title },
            });
        }

        // Step 2: match a university based on that category
        const suggestedUniversityName = routeToUniversity(category);

        const challenge = new Challenge({
            title, description, category, severity,
            submittedBy: req.user.id,
            submitterType: req.user.role,
            suggestedUniversityName,
        });
        await challenge.save();
        res.status(201).json(challenge);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/challenges/my-assigned — all challenges assigned to the logged-in university (any status)
router.get('/challenges/my-assigned', fetchuser, checkRole(['university']), async (req, res) => {
    try {
        const filter = { assignedUniversity: req.user.id };

        // optional status filter, e.g. ?status=Solved to see only completed ones
        if (req.query.status) filter.status = req.query.status;

        const challenges = await Challenge.find(filter)
            .populate('submittedBy', 'name role');

        res.json(challenges);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /challenges/:id — public, no auth needed
router.get('/challenges/:id', async (req, res) => {
    try {
        const challenge = await Challenge.findById(req.params.id).populate('submittedBy', 'name role');
        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }
        res.json(challenge);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid challenge ID' });
        }
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT /challenges/:id/status — only universities/admins can change status
router.put('/challenges/:id/status', fetchuser, checkRole(['university', 'admin']), async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Open', 'Under Review', 'In Progress', 'Solved'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status value' });
        }

        const challenge = await Challenge.findById(req.params.id);
        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        if (req.user.role === 'university' &&
            (!challenge.assignedUniversity || challenge.assignedUniversity.toString() !== req.user.id)) {
            return res.status(403).json({ message: 'You are not assigned to this challenge' });
        }

        challenge.status = status;
        await challenge.save();

        await Comment.create({
            challenge: challenge._id,
            postedBy: req.user.id,
            text: `Status updated to "${status}"`,
            type: 'status_update',
        });

        // Notify the original submitter
        const submitter = await User.findById(challenge.submittedBy);
        if (submitter) {
            await notifyUser(
                submitter.email,
                `Your challenge status changed: ${status}`,
                `Your submission "${challenge.title}" has moved to "${status}".`,
                challenge._id
            );
        }

        res.json(challenge);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid challenge ID' });
        }
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT /challenges/:id/assign — only universities/admins can accept a challenge
router.put('/challenges/:id/assign', fetchuser, checkRole(['university', 'admin']), async (req, res) => {
    try {
        const challenge = await Challenge.findById(req.params.id);
        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }
        if (req.user.role === 'university' && challenge.assignedUniversity) {
            return res.status(403).json({ message: 'This challenge is already assigned to another university' });
        }

        challenge.assignedUniversity = req.user.id;
        challenge.status = 'In Progress';
        await challenge.save();

        // Notify the original submitter
        const submitter = await User.findById(challenge.submittedBy);
        const university = await User.findById(req.user.id); // for the university's name in the message

        if (submitter) {
            await notifyUser(
                submitter.email,
                `A university has taken on your challenge`,
                `${university?.organization || university?.name || 'A university'} has accepted your submission "${challenge.title}" and it is now In Progress.`,
                challenge._id
            );
        }

        // Log it in the activity feed
        await Comment.create({
            challenge: challenge._id,
            postedBy: req.user.id,
            text: `${university?.organization || university?.name || 'A university'} has taken on this challenge`,
            type: 'status_update',
        });

        res.json(challenge);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid challenge ID' });
        }
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT /challenges/:id/upvote — any logged-in user, no role restriction needed
router.put('/challenges/:id/upvote', fetchuser, async (req, res) => {
    if (!hasValidId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid challenge ID' });
    }
    try {
        const challenge = await Challenge.findById(req.params.id);
        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        const alreadyUpvoted = challenge.upvotes.includes(req.user.id);
        if (alreadyUpvoted) {
            challenge.upvotes.pull(req.user.id);
        } else {
            challenge.upvotes.push(req.user.id);
        }

        await challenge.save();
        res.json({ upvoteCount: challenge.upvotes.length, upvoted: !alreadyUpvoted });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// POST /challenges/:id/express-interest — only industry accounts
router.post('/challenges/:id/express-interest', fetchuser, checkRole(['industry']), async (req, res) => {
    try {
        const challenge = await Challenge.findById(req.params.id);
        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }
        if (challenge.interestedIndustries.includes(req.user.id)) {
            return res.status(400).json({ message: 'You have already expressed interest in this challenge' });
        }

        challenge.interestedIndustries.push(req.user.id);
        await challenge.save();

        // Notify the assigned university, if one exists yet
        if (challenge.assignedUniversity) {
            const university = await User.findById(challenge.assignedUniversity);
            const industry = await User.findById(req.user.id);

            if (university) {
                await notifyUser(
                    university.email,
                    `Industry interest in your challenge`,
                    `${industry?.organization || industry?.name || 'An industry partner'} has expressed interest in "${challenge.title}".`,
                    challenge._id
                );
            }
        }

        await Comment.create({
            challenge: challenge._id,
            postedBy: req.user.id,
            text: `${req.user.role === 'industry' ? 'An industry partner' : 'Someone'} expressed interest in this challenge`,
            type: 'interest_expressed',
        });

        res.json({ message: 'Interest expressed successfully', challenge });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(400).json({ message: 'Invalid challenge ID' });
        }
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
