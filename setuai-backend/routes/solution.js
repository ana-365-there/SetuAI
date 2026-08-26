const express = require('express');
const router = express.Router();
const Solution = require('../models/Solution');
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const fetchuser = require('../middleware/fetchuser');
const checkRole = require('../middleware/checkRole');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const STATUS_ORDER = ['Proposed', 'In Progress', 'Solved'];
const hasValidId = (id) => mongoose.isValidObjectId(id);

const canManageSolution = async (solution, user) => {
    if (user.role === 'admin' || solution.submittedBy.toString() === user.id) {
        return true;
    }

    if (user.role !== 'university') {
        return false;
    }

    const challenge = await Challenge.findById(solution.challenge).select('assignedUniversity');
    return challenge?.assignedUniversity?.toString() === user.id;
};

// GET all solutions for a challenge — public, no auth needed
// GET /api/challenges/:challengeId/solutions
router.get('/challenges/:challengeId/solutions', async (req, res) => {
    if (!hasValidId(req.params.challengeId)) {
        return res.status(400).json({ success: false, error: 'Invalid challenge ID' });
    }
    try {
        const solutions = await Solution.find({ challenge: req.params.challengeId })
            .populate('submittedBy', 'name organization role')
            .populate('teamMembers', 'name')
            .populate('mentor', 'name');
        res.json(solutions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST a new solution proposal — university/industry claims intent to work on a challenge
// POST /api/challenges/:challengeId/solutions
router.post('/challenges/:challengeId/solutions', fetchuser, checkRole(['university', 'industry']), [
    body('title', 'Title is required').notEmpty(),
    body('description', 'Description is required').notEmpty(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    if (!hasValidId(req.params.challengeId)) {
        return res.status(400).json({ success: false, error: 'Invalid challenge ID' });
    }

    try {
        const challenge = await Challenge.findById(req.params.challengeId);
        if (!challenge) {
            return res.status(404).json({ success: false, error: 'Challenge not found' });
        }

        const solution = await Solution.create({
            challenge: req.params.challengeId,
            submittedBy: req.user.id,
            title: req.body.title,
            description: req.body.description,
            attachmentUrl: req.body.attachmentUrl || undefined,
            // teamMembers/mentor deliberately left empty — assigned as a follow-up step
        });

        res.status(201).json({ success: true, solution });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT — assign team + mentor to THIS specific solution proposal
// PUT /api/solutions/:id/assign
router.put('/solutions/:id/assign', fetchuser, checkRole(['university', 'admin']), [
    body('teamMembers', 'teamMembers must be an array of valid user IDs')
        .isArray()
        .custom((memberIds) => memberIds.every(hasValidId)),
    body('mentor', 'mentor must be a valid user ID').optional().isMongoId(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    if (!hasValidId(req.params.id)) {
        return res.status(400).json({ success: false, error: 'Invalid solution ID' });
    }
    try {
        const solution = await Solution.findById(req.params.id);
        if (!solution) return res.status(404).json({ success: false, error: 'Solution not found' });
        if (!await canManageSolution(solution, req.user)) {
            return res.status(403).json({ success: false, error: 'You do not have permission to manage this solution' });
        }

        const teamMemberIds = [...new Set(req.body.teamMembers)];
        const members = await User.find({ _id: { $in: teamMemberIds } }).select('organization');
        if (members.length !== teamMemberIds.length) {
            return res.status(400).json({ success: false, error: 'One or more team members do not exist' });
        }

        solution.teamMembers = teamMemberIds;
        if (req.body.mentor) solution.mentor = req.body.mentor;

        // Derive which organizations are represented in this team
        const orgs = [...new Set(members.map((m) => m.organization).filter(Boolean))];
        solution.collaboratingOrganizations = orgs;

        await solution.save();
        res.json({ success: true, solution });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/analytics/multi-institutional-count
router.get('/analytics/multi-institutional-count', async (req, res) => {
    const count = await Solution.countDocuments({ 'collaboratingOrganizations.1': { $exists: true } });
    res.json({ multiInstitutionalProjects: count });
});

// GET /api/solutions/my-solutions — solutions submitted by the logged-in user
router.get('/solutions/my-solutions', fetchuser, async (req, res) => {
    try {
        const solutions = await Solution.find({ submittedBy: req.user.id })
            .populate('challenge', 'title category status')
            .populate('teamMembers', 'name organization')
            .populate('mentor', 'name');

        res.json(solutions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT — update status, strictly sequential (Proposed → In Progress → Solved), Rejected allowed anytime
// PUT /api/solutions/:id/status
router.put('/solutions/:id/status', fetchuser, checkRole(['university', 'admin']), [
    body('status', 'Status must be valid').isIn(['Proposed', 'In Progress', 'Solved', 'Rejected']),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    if (!hasValidId(req.params.id)) {
        return res.status(400).json({ success: false, error: 'Invalid solution ID' });
    }

    try {
        const solution = await Solution.findById(req.params.id);
        if (!solution) {
            return res.status(404).json({ success: false, error: 'Solution not found' });
        }
        if (!await canManageSolution(solution, req.user)) {
            return res.status(403).json({ success: false, error: 'You do not have permission to manage this solution' });
        }

        const { status: newStatus } = req.body;

        if (newStatus === solution.status) {
            return res.json({ success: true, solution });
        }

        if (newStatus !== 'Rejected') {
            const currentIndex = STATUS_ORDER.indexOf(solution.status);
            const newIndex = STATUS_ORDER.indexOf(newStatus);

            if (newIndex !== currentIndex + 1) {
                return res.status(400).json({
                    success: false,
                    error: `Cannot move from "${solution.status}" to "${newStatus}" — must follow order: ${STATUS_ORDER.join(' → ')}`,
                });
            }
        }

        solution.status = newStatus;
        await solution.save();
        res.json({ success: true, solution });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST — team member submits a technical link (repo, paper, demo)
// POST /api/solutions/:id/submissions
router.post('/solutions/:id/submissions', fetchuser, [
    body('link', 'A valid link is required').isURL(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    if (!hasValidId(req.params.id)) {
        return res.status(400).json({ success: false, error: 'Invalid solution ID' });
    }

    try {
        const solution = await Solution.findById(req.params.id);
        if (!solution) {
            return res.status(404).json({ success: false, error: 'Solution not found' });
        }

        const isTeamMember = solution.teamMembers.some(
            (memberId) => memberId.toString() === req.user.id
        );
        const isSubmitter = solution.submittedBy.toString() === req.user.id;

        if (!isTeamMember && !isSubmitter && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Only assigned team members, the submitter, or an admin can submit for this solution' });
        }

        solution.submissions.push({
            submittedBy: req.user.id,
            link: req.body.link,
            note: req.body.note,
        });

        await solution.save();
        res.status(201).json({ success: true, solution });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT — upvote/un-upvote a solution — any logged in user, toggle logic
// PUT /api/solutions/:id/upvote
router.put('/solutions/:id/upvote', fetchuser, async (req, res) => {
    if (!hasValidId(req.params.id)) {
        return res.status(400).json({ success: false, error: 'Invalid solution ID' });
    }
    try {
        const solution = await Solution.findById(req.params.id);
        if (!solution) {
            return res.status(404).json({ success: false, error: 'Solution not found' });
        }

        const alreadyUpvoted = solution.upvotes.includes(req.user.id);

        if (alreadyUpvoted) {
            solution.upvotes.pull(req.user.id);
        } else {
            solution.upvotes.push(req.user.id);
        }

        await solution.save();
        res.json({ success: true, upvoteCount: solution.upvotes.length, upvoted: !alreadyUpvoted });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

router.get('/solutions/leaderboard', async (req, res) => {
    try {
        const solutions = await Solution.find()
            .populate('teamMembers', 'name organization')
            .populate('challenge', 'title category');

        const scored = solutions.map((s) => {
            const statusWeight = { Proposed: 0, 'In Progress': 5, Solved: 10, Rejected: -5 };
            const score = (statusWeight[s.status] || 0) + s.upvotes.length;

            return {
                solutionId: s._id,
                title: s.title,
                challenge: s.challenge?.title,
                teamMembers: s.teamMembers,
                status: s.status,
                upvotes: s.upvotes.length,
                score,
            };
        });

        scored.sort((a, b) => b.score - a.score);

        res.json({ success: true, leaderboard: scored });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
