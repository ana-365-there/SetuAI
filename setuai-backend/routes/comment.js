const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const Comment = require('../models/Comment');
const Challenge = require('../models/Challenge');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const hasValidId = (id) => mongoose.isValidObjectId(id);

// GET all comments for a challenge — public
router.get('/challenges/:challengeId/comments', async (req, res) => {
    if (!hasValidId(req.params.challengeId)) {
        return res.status(400).json({ error: 'Invalid challenge ID' });
    }
    try {
        const comments = await Comment.find({ challenge: req.params.challengeId }).populate('postedBy', 'name');
        res.json(comments);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST a new comment on a challenge
router.post('/challenges/:challengeId/comments', fetchuser, [
    body('text', 'Enter a valid comment').isLength({ min: 3 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    if (!hasValidId(req.params.challengeId)) {
        return res.status(400).json({ error: 'Invalid challenge ID' });
    }
    try {
        const challengeExists = await Challenge.exists({ _id: req.params.challengeId });
        if (!challengeExists) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        const comment = new Comment({
            text: req.body.text,
            postedBy: req.user.id,
            challenge: req.params.challengeId,
        });
        const savedComment = await comment.save();
        res.status(201).json(savedComment);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT — edit a comment (flat, own comments only, human comments only)
router.put('/comments/:id', fetchuser, [
    body('text', 'Enter a valid comment').isLength({ min: 3 })
], async (req, res) => {

    if (!validationResult(req).isEmpty()) {
        return res.status(400).json({ errors: validationResult(req).array() });
    }
    if (!hasValidId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid comment ID' });
    }

    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        if (comment.type !== 'comment') {
            return res.status(403).json({ message: 'System-generated entries cannot be edited' });
        }
        if (comment.postedBy.toString() !== req.user.id) {
            return res.status(403).json({ message: 'You can only edit your own comments' });
        }

        comment.text = req.body.text;
        await comment.save();
        res.json(comment);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE — flat, own comments only, human comments only
// DELETE /api/comments/:id — own comments, or any comment if admin (human comments only, never system entries)
router.delete('/comments/:id', fetchuser, async (req, res) => {
    if (!hasValidId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid comment ID' });
    }
    try {
        const comment = await Comment.findById(req.params.id);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        if (comment.type !== 'comment') {
            return res.status(403).json({ message: 'System-generated entries cannot be deleted' });
        }

        if (comment.postedBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'You can only delete your own comments' });
        }

        await comment.deleteOne();
        res.json({ message: 'Comment deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
