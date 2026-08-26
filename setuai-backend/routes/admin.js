const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser');
const checkRole = require('../middleware/checkRole');
const User = require('../models/User');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const notifyUser = require('../utils/notifyUser');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// POST /api/admin/create-account — admin provisions a university or industry account
router.post('/admin/create-account', fetchuser, checkRole(['admin']), [
    body('name', 'Name is required').notEmpty(),
    body('email', 'Enter a valid email').isEmail(),
    body('organization', 'Organization is required').notEmpty(),
    body('role', 'Role must be university or industry').isIn(['university', 'industry']),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const existing = await User.findOne({ email: req.body.email });
        if (existing) {
            return res.status(400).json({ message: 'A user with this email already exists' });
        }

        const tempPassword = crypto.randomBytes(6).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(tempPassword, salt);

        const user = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            role: req.body.role, // 'university' or 'industry'
            organization: req.body.organization,
            expertise: req.body.role === 'university' ? (req.body.expertise || []) : [], // only universities use expertise
            isVerified: true,
        });

        await notifyUser(
            user.email,
            `Your SETU ${req.body.role} account has been created`,
            `Welcome to SETU! Your login credentials:<br>Email: ${user.email}<br>Temporary Password: <b>${tempPassword}</b><br>Please log in and change your password.`,
            null
        );

        res.status(201).json({ message: `${req.body.role} account created and credentials emailed`, userId: user._id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// GET /api/admin/users — list all users
router.get('/admin/users', fetchuser, checkRole(['admin']), async (req, res) => {
    try {
        const users = await User.find().select('-password -verificationToken -verificationTokenExpires');
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// PUT /api/admin/users/:id/verify — manually verify a user
router.put('/admin/users/:id/verify', fetchuser, checkRole(['admin']), async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid user ID' });
    }
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.isVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();
        const safeUser = user.toObject();
        delete safeUser.password;
        delete safeUser.verificationToken;
        delete safeUser.verificationTokenExpires;
        res.json({ message: 'User manually verified', user: safeUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

module.exports = router;
