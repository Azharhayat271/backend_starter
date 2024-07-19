const User = require("../models/user");
const sendEmail = require("../utils/sendEmail");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendResetPasswordEmail } = require('../utils/forgetPassword');
const dumbPasswords = require('dumb-passwords');




//methods 

// Function to generate JWT token for password reset
const generateResetToken = (user) => {
    return jwt.sign(
        { userId: user.id },
        process.env.RESET_PASSWORD_SECRET,
        { expiresIn: '1h' }
    );
};

//API


// Register user
exports.registerUser = async (req, res) => {
    try {
        const { name, email, username, password, gender, phoneNo } = req.body;

        // Check if the password is common
        if (dumbPasswords.check(password)) {
            return res.status(400).json({ success: false, message: "Your password is found in the Leak Password Dictonary. Please use a stronger password." });
        }

        const user = new User({ name, email, username, password, gender, phoneNo });

        const emailVerificationToken = user.createEmailVerificationToken();
        await user.save();

        // Send email with the token
        const emailVerificationUrl = `${req.protocol}://${req.get("host")}/api/users/verify-email?token=${emailVerificationToken}&email=${email}`;
        const message = `Please verify your email by clicking on the following link: ${emailVerificationUrl}`;

        await sendEmail({
            email: user.email,
            subject: 'Email Verification',
            message,
        });

        res.status(201).json({ success: true, message: "User registered. Please check your email to verify your account." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Verify email
exports.verifyEmail = async (req, res) => {
    try {
        const { email, token } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid email or token." });
        }

        if (user.verifyEmailToken(token)) {
            user.isEmailVerified = true;
            user.emailVerificationCode = undefined;
            user.emailVerificationTokenExpires = undefined;
            await user.save();
            return res.status(200).json({ success: true, message: "Email verified successfully." });
        } else {
            return res.status(400).json({ success: false, message: "Invalid or expired token." });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.verifyEmailLink = async (req, res) => {
    const { token, email } = req.query;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "Invalid email or token." });
        }

        if (user.verifyEmailToken(token)) {
            user.isEmailVerified = true;
            user.emailVerificationCode = undefined;
            user.emailVerificationTokenExpires = undefined;
            await user.save();

            // Redirect to an external URL (e.g., google.com) after successful verification
            return res.redirect('https://www.google.com');
        } else {
            return res.status(400).json({ success: false, message: "Invalid or expired token." });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// login 
exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the user by email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }

        // Generate JWT token
        const payload = {
            user: {
                id: user.id,
                email: user.email 
            }
        };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.status(200).json({ success: true, token ,user});
        });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Generate and save reset token to user document
        const resetToken = generateResetToken(user);
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();

        // Send email with reset link
        const emailResult = await sendResetPasswordEmail(email, resetToken);
        if (!emailResult.success) {
            return res.status(500).json(emailResult);
        }

        res.status(200).json(emailResult);

    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
        }

        // Hash the new password using the existing schema method
        user.password = newPassword; // Assuming newPassword is already plain text
        await user.save();

        res.status(200).json({ success: true, message: 'Password reset successful.' });

    } catch (error) {
        console.error('Password reset error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error' });
    }
};



