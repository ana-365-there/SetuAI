const nodemailer = require('nodemailer');
const dns = require('node:dns');
const net = require('node:net');
const emailDisabled = process.env.DISABLE_EMAIL === 'true';

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // upgrade to TLS with STARTTLS on port 587
    requireTLS: true,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
    // Render has no outbound IPv6 route. Resolve Gmail to IPv4 explicitly, then
    // let Nodemailer perform STARTTLS using the original smtp.gmail.com hostname.
    getSocket: (options, callback) => {
        dns.resolve4(options.host, (dnsError, addresses) => {
            if (dnsError || !addresses?.length) {
                return callback(dnsError || new Error('No IPv4 address found for SMTP host'));
            }

            const socket = net.connect({ host: addresses[0], port: options.port, family: 4 });
            const onTimeout = () => socket.destroy(new Error('SMTP IPv4 connection timed out'));
            const onError = (error) => callback(error);

            socket.setTimeout(options.connectionTimeout || 5000, onTimeout);
            socket.once('error', onError);
            socket.once('connect', () => {
                socket.setTimeout(0);
                socket.removeListener('timeout', onTimeout);
                socket.removeListener('error', onError);
                callback(null, { connection: socket });
            });
        });
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
        console.warn('⚠️ Verification email was not sent because DISABLE_EMAIL is enabled.');
        return false;
    }

    // BACKEND_URL must identify the backend itself. Using URL.origin also keeps a
    // pasted verification link from producing a duplicated path in the email.
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
        throw new Error(`SMTP did not accept the verification-email recipient: ${delivery.rejected?.join(', ') || 'unknown reason'}`);
    }

    console.log(`✅ Verification email accepted by SMTP (message ID: ${delivery.messageId})`);
    return true;
};

module.exports = sendVerificationEmail;
