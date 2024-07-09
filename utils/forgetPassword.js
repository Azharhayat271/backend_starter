const nodemailer = require('nodemailer');
require('dotenv').config();

const sendResetPasswordEmail = async (email, resetToken) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USERNAME,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.EMAIL_USERNAME,
            to: email,
            subject: 'Password Reset Request',
            html: `
                <p>You are receiving this email because you (or someone else) has requested the reset of the password for your account.</p>
                <p>Please click on the following link, or paste this into your browser to complete the process:</p>
                <p><a href="${process.env.CLIENT_URL}/reset-password/${resetToken}">Reset Password Link</a></p>
                <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
            `
        };

        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return { success: true, message: 'Reset email sent' };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, message: 'Error sending email' };
    }
};

module.exports = { sendResetPasswordEmail };
