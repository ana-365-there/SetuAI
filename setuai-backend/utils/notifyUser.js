const nodemailer = require('nodemailer');
const emailDisabled = process.env.DISABLE_EMAIL === 'true';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
});

const notifyUser = async (toEmail, subject, message, challengeId) => {
    if (emailDisabled) {
        return;
    }

    const challengeUrl = `${process.env.CLIENT_URL}/challenges/${challengeId}`;

    try {
        await transporter.sendMail({
            from: `"SETU" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject,
            html: `
                <p>${message}</p>
                <a href="${challengeUrl}">View your challenge</a>
            `,
        });
    } catch (error) {
        console.error('⚠️ Notification email failed:', error.message);
        // don't throw — a failed notification shouldn't break the status update itself
    }
};

module.exports = notifyUser;
