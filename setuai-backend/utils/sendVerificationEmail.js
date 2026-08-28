const nodemailer = require('nodemailer');
const axios = require('axios');

const emailDisabled = process.env.DISABLE_EMAIL === 'true';

// Setup Nodemailer transporter as fallback if RESEND_API_KEY is not provided
let transporter = null;
if (!emailDisabled && !process.env.RESEND_API_KEY) {
    transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,    // false = STARTTLS upgrade
        requireTLS: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
    });

    transporter.verify((error) => {
        if (error) {
            console.error('❌ SMTP connection failed:', error.message);
        } else {
            console.log('✅ SMTP server ready — emails will send');
        }
    });
}

const sendVerificationEmail = async (toEmail, token) => {
    if (emailDisabled) {
        console.warn('⚠️ Verification email was not sent because DISABLE_EMAIL is enabled.');
        return false;
    }

    const configuredBackendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    let backendUrl;
    try {
        backendUrl = new URL(configuredBackendUrl).origin;
    } catch {
        throw new Error('BACKEND_URL must be a valid absolute URL, for example https://setuai.onrender.com');
    }

    const verifyUrl = `${backendUrl}/api/auth/verify-email?token=${token}`;

    // 1. Primary: Use Resend HTTP API (Port 443 — works everywhere including Render)
    if (process.env.RESEND_API_KEY) {
        try {
            console.log('📧 Sending verification email via Resend HTTP API...');
            const fromEmail = process.env.EMAIL_FROM || 'SETU <onboarding@resend.dev>';
            const res = await axios.post(
                'https://api.resend.com/emails',
                {
                    from: fromEmail,
                    to: [toEmail],
                    subject: 'Verify your SETU account',
                    html: `
                        <p>Welcome to SETU!</p>
                        <p>Click the link below to verify your email address:</p>
                        <a href="${verifyUrl}">${verifyUrl}</a>
                        <p>This link expires in 1 hour.</p>
                    `,
                },
                {
                    headers: {
                        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                }
            );
            console.log('✅ Verification email sent successfully via Resend API! ID:', res.data?.id);
            return true;
        } catch (error) {
            console.error('❌ Resend API delivery failed:', error.response?.data || error.message);
            throw new Error(`Resend delivery failed: ${error.response?.data?.message || error.message}`);
        }
    }

    // 2. Fallback: Nodemailer SMTP
    if (transporter) {
        const delivery = await transporter.sendMail({
            from: `"SETU" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: 'Verify your SETU account',
            html: `
                <p>Welcome to SETU!</p>
                <p>Click the link below to verify your email address:</p>
                <a href="${verifyUrl}">${verifyUrl}</a>
                <p>This link expires in 1 hour.</p>
            `,
        });

        if (!delivery.accepted || delivery.accepted.length === 0) {
            throw new Error(
                `SMTP did not accept the recipient: ${delivery.rejected?.join(', ') || 'unknown reason'}`
            );
        }
        return true;
    }

    throw new Error('No valid email provider configured (set RESEND_API_KEY or EMAIL_USER/EMAIL_APP_PASSWORD)');
};

module.exports = sendVerificationEmail;
