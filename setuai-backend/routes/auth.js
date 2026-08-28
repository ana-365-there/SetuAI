// routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
var fetchuser = require('../middleware/fetchuser')
const crypto = require('crypto');
const sendVerificationEmail = require('../utils/sendVerificationEmail');
const university = require('../models/University');

const JWT_SECRET = process.env.JWT_SECRET;

//create a user using: POST "/api/auth/createuser". No login required
const VALID_ROLES = ['citizen', 'university', 'industry', 'admin'];

router.post('/createuser', [
    body('name', 'Enter a valid name of at least 3 characters').isLength({ min: 3 }),
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password must be at least 5 characters').isLength({ min: 5 }),
    body('role', `Role must be one of: ${VALID_ROLES.join(', ')}`)
        .notEmpty()
        .isIn(VALID_ROLES),
], async (req, res) => {

    let success = false;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success,
            errors: errors.array()
        });
    }

    if (['university', 'industry'].includes(req.body.role)) {
        return res.status(403).json({
            success: false,
            restrictedRole: true, // frontend checks this flag specifically
            message: 'University and Industry accounts are provisioned by SETU admin. Please contact admin@setuai.com to request access.',
        });
    }

    try {
        // Check if user already exists
        let user = await User.findOne({ email: req.body.email });

        if (user) {
            // If account exists but was never verified (e.g. email failed before),
            // refresh the token and resend rather than leaving them stuck
            if (!user.isVerified) {
                const verificationToken = crypto.randomBytes(32).toString('hex');
                user.verificationToken = verificationToken;
                user.verificationTokenExpires = Date.now() + 60 * 60 * 1000;
                await user.save();

                try {
                    const emailSent = await sendVerificationEmail(user.email, verificationToken);
                    if (!emailSent) {
                        throw new Error('Email delivery disabled or unavailable');
                    }
                    return res.status(200).json({
                        success: true,
                        message: "This email is already registered. We've resent the verification email — please check your inbox."
                    });
                } catch (emailError) {
                    console.warn(`⚠️ Resend on signup failed (${emailError.message}). Auto-verifying existing user ${user.email}...`);
                    user.isVerified = true;
                    user.verificationToken = undefined;
                    user.verificationTokenExpires = undefined;
                    await user.save();

                    return res.status(200).json({
                        success: true,
                        message: "Your account has been verified! You can now log in."
                    });
                }
            }

            // Account exists and is verified — normal duplicate error
            return res.status(400).json({
                success,
                error: 'A user with this email already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const secPass = await bcrypt.hash(req.body.password, salt);

        // Generate email verification token (expires in 1 hour)
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationTokenExpires = Date.now() + 60 * 60 * 1000;

        // Create user in DB
        user = await User.create({
            name: req.body.name,
            email: req.body.email,
            password: secPass,
            role: req.body.role,
            organization: req.body.organization || undefined,
            expertise: req.body.expertise || [],
            verificationToken,
            verificationTokenExpires,
        });

        // Send verification email — if email delivery fails or is blocked on Render,
        // auto-verify the user so signups are never stranded or failed.
        try {
            const emailSent = await sendVerificationEmail(user.email, verificationToken);
            if (!emailSent) {
                throw new Error('Email delivery disabled or unavailable');
            }
            return res.json({
                success: true,
                message: 'Signup successful. Please check your email to verify your account.'
            });
        } catch (emailError) {
            console.warn(`⚠️ Verification email failed (${emailError.message}). Auto-verifying user ${user.email}...`);
            user.isVerified = true;
            user.verificationToken = undefined;
            user.verificationTokenExpires = undefined;
            await user.save();

            return res.json({
                success: true,
                message: 'Signup successful! Your account has been verified.'
            });
        }

    } catch (error) {
        console.error('🔥 CREATE USER ERROR:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

//authenticate a user using: POST "/api/auth/login". No login required
router.post('/login', [
    body('email', 'Enter a valid email').isEmail(),
    body('password', 'Password cannot be blank').exists()
], async (req, res) => {

    let success = false;
    //if there are errors, return bad request and the errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success, errors: errors.array() });
    }
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success, error: 'Please try to login with correct credentials' });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).json({ success, error: 'Please try to login with correct credentials' });
        }

        if (!user.isVerified) {
            return res.status(403).json({ success, error: 'Please verify your email before logging in' });
        }

        const data = {
            user: {
                id: user.id,
                role: user.role,
            }
        };

        const authtoken = await jwt.sign(data, JWT_SECRET);

        success = true;
        res.json({ success, authtoken, role: user.role });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

//Verify new user's mail using: GET "/api/auth/verify-email". No login required
router.get('/verify-email', async (req, res) => {
    const { token } = req.query;
    console.log('Email verification requested');

    if (!token) {
        return res.status(400).send('<h2>Verification token is missing.</h2>');
    }
    try {
        // Find user by token first to see if it even exists
        const userByToken = await User.findOne({ verificationToken: token });
        if (!userByToken) {
            console.log('❌ No user found with this verification token');
            return res.status(400).send('<h2>Invalid verification link (token not found).</h2>');
        }

        // Check if token is expired
        if (userByToken.verificationTokenExpires && userByToken.verificationTokenExpires < new Date()) {
            console.log('❌ Verification token has expired');
            return res.status(400).send('<h2>Verification link has expired.</h2>');
        }

        userByToken.isVerified = true;
        userByToken.verificationToken = undefined;
        userByToken.verificationTokenExpires = undefined;
        await userByToken.save();

        console.log('✅ User successfully marked as verified in DB');

        // Redirect to your frontend login page once verified
        res.redirect(`${process.env.CLIENT_URL}/login?verified=true`);

    } catch (error) {
        console.error('🔥 Email verification error:', error);
        res.status(500).send(`<h2>Something went wrong. Please try again. Error: ${error.message}</h2>`);
    }
});

//In case original verification fails, add for work using: POST "/api/auth/resend-verification". No login required
router.post('/resend-verification', [
    body('email', 'Enter a valid email').isEmail(),
], async (req, res) => {
    // Validate input first
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(400).json({ success: false, error: 'User not found' });
        }
        if (user.isVerified) {
            return res.status(400).json({ success: false, error: 'Email already verified' });
        }

        const verificationToken = crypto.randomBytes(32).toString('hex');
        user.verificationToken = verificationToken;
        user.verificationTokenExpires = Date.now() + 60 * 60 * 1000;
        await user.save();

        // Try sending verification email — if sending fails/times out, auto-verify user
        try {
            const emailSent = await sendVerificationEmail(user.email, verificationToken);
            if (!emailSent) {
                throw new Error('Email delivery disabled or unavailable');
            }
            res.json({ success: true, message: 'Verification email resent' });
        } catch (emailError) {
            console.warn(`⚠️ Resend email failed (${emailError.message}). Auto-verifying user ${user.email}...`);
            user.isVerified = true;
            user.verificationToken = undefined;
            user.verificationTokenExpires = undefined;
            await user.save();

            res.json({ success: true, message: 'Your account has been auto-verified! You can now log in.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

//Get logged in user's info. POST "/api/auth/getuser". Login required
router.get('/getuser', fetchuser, async (req, res) => {

    let success = false;

    try {
        const user = await User.findById(req.user.id).select("-password");
        res.json(user);
    } catch (error) {
        console.log(error);
        res.status(500).json({ success, error: 'Internal server error' });
    }
});

module.exports = router;  // ← must export the router
