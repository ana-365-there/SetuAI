const nodemailer = require('nodemailer');
const emailDisabled = process.env.DISABLE_EMAIL === 'true';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use SSL
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
});

// Verify SMTP connection on startup — logs exact error if credentials are wrong
if (!emailDisabled) {
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
        return;
    }

    // Determine backend URL for verification endpoint (local fallback to port 5000)
    const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    const verifyUrl = `${backendUrl}/api/auth/verify-email?token=${token}`;

    await transporter.sendMail({
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
};

module.exports = sendVerificationEmail;
