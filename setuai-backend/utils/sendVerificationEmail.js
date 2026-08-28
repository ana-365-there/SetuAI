const nodemailer = require('nodemailer');
const emailDisabled = process.env.DISABLE_EMAIL === 'true';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,    // false = STARTTLS upgrade (works on port 587)
    requireTLS: true, // refuse to send if TLS cannot be established
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
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
        console.warn('⚠️ Verification email was not sent because DISABLE_EMAIL is enabled.');
        return false;
    }

    // BACKEND_URL must be a valid absolute URL (e.g. https://setuai.onrender.com).
    // Extracting .origin prevents double-path issues if the env value includes a trailing path.
    const configuredBackendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    let backendUrl;
    try {
        backendUrl = new URL(configuredBackendUrl).origin;
    } catch {
        throw new Error('BACKEND_URL must be a valid absolute URL, for example https://setuai.onrender.com');
    }

    const verifyUrl = `${backendUrl}/api/auth/verify-email?token=${token}`;

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
};

module.exports = sendVerificationEmail;
