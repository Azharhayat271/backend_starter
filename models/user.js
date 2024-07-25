const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        required: true,
    },
    role: {
        type: String,
        default: 'user',
    },
    phoneNo: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        default: '',
    },
    isAdmin: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        default: 'created',
    },
    emailVerificationCode: {
        type: String,
    },
    emailVerificationTokenExpires: {
        type: Date,
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    resetPasswordToken: {
        type: String,
        default: null,
    },
    resetPasswordExpires: {
        type: Date,
        default: null,
    },
}, { timestamps: true });

// Hash the password before saving the user model
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Method to create email verification token
userSchema.methods.createEmailVerificationToken = function () {
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");

    this.emailVerificationCode = crypto
        .createHash("sha256")
        .update(emailVerificationToken)
        .digest("hex");

    this.emailVerificationTokenExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    return emailVerificationToken;
};

// Method to verify email token
userSchema.methods.verifyEmailToken = function (token) {
    const hashedToken = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    return hashedToken === this.emailVerificationCode && this.emailVerificationTokenExpires > Date.now();
};

const User = mongoose.model("User", userSchema);

module.exports = User;
