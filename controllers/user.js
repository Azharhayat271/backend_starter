const User = require("../models/user");
const sendEmail = require("../utils/sendEmail");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendResetPasswordEmail } = require("../utils/forgetPassword");
const dumbPasswords = require("dumb-passwords");
const moment = require("moment");
//methods

// Function to generate JWT token for password reset
const generateResetToken = (user) => {
  return jwt.sign({ userId: user.id }, process.env.RESET_PASSWORD_SECRET, {
    expiresIn: "1h",
  });
};

//API

// Register user
exports.registerUser = async (req, res) => {
  try {
    const { name, email, username, password, gender, phoneNo } = req.body;

    // Check if the password is common
    if (dumbPasswords.check(password)) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Your password is found in the Leak Password Dictonary. Please use a stronger password.",
        });
    }

    const user = new User({ name, email, username, password, gender, phoneNo });

    const emailVerificationToken = user.createEmailVerificationToken();
    await user.save();

    // Send email with the token
    const emailVerificationUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/users/verify-email?token=${emailVerificationToken}&email=${email}`;
    const message = `Please verify your email by clicking on the following link: ${emailVerificationUrl}`;

    await sendEmail({
      email: user.email,
      subject: "Email Verification",
      message,
    });

    res
      .status(201)
      .json({
        success: true,
        message:
          "User registered. Please check your email to verify your account.",
      });
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
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or token." });
    }

    if (user.verifyEmailToken(token)) {
      user.isEmailVerified = true;
      user.emailVerificationCode = undefined;
      user.emailVerificationTokenExpires = undefined;
      await user.save();
      return res
        .status(200)
        .json({ success: true, message: "Email verified successfully." });
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token." });
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
      return res
        .status(400)
        .json({ success: false, message: "Invalid email or token." });
    }

    if (user.verifyEmailToken(token)) {
      user.isEmailVerified = true;
      user.emailVerificationCode = undefined;
      user.emailVerificationTokenExpires = undefined;
      await user.save();

      // Redirect to an external URL (e.g., google.com) after successful verification
      return res.redirect("https://www.google.com");
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token." });
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
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Check user status
    if (user.status !== "approved") {
      return res
        .status(403)
        .json({
          success: false,
          message: "Your account is not approved or is blocked",
        });
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    // Generate JWT token
    const payload = {
      user: {
        id: user.id,
        email: user.email,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
      (err, token) => {
        if (err) throw err;
        res.status(200).json({ success: true, token, user });
      }
    );
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
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
    console.error("Forgot password error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token." });
    }

    // Hash the new password using the existing schema method
    user.password = newPassword; // Assuming newPassword is already plain text
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password reset successful." });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update user by ID
// Update user by ID
exports.updateUserById = async (req, res) => {
  const { userId } = req.params;
  const { name, email, username, gender, phoneNo, image } = req.body; // Added image field

  try {
    // Validate the provided data (optional)
    if (!name || !email || !username || !gender || !phoneNo) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    // Find user by ID and update the provided fields
    const user = await User.findByIdAndUpdate(
      userId,
      { name, email, username, gender, phoneNo, image },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Delete user by ID
exports.deleteUserById = async (req, res) => {
  const { userId } = req.params;

  try {
    // Find user by ID and remove
    const user = await User.findByIdAndRemove(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res
      .status(200)
      .json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  const { userId } = req.params;

  try {
    // Find user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Get user statistics
exports.getUserStatistics = async (req, res) => {
  try {
    // Calculate the date 7 days ago
    const sevenDaysAgo = moment().subtract(7, "days").toDate();

    // Total number of users
    const totalUsers = await User.countDocuments();

    // Users by status
    const createdUsers = await User.countDocuments({ status: "created" });
    const activeUsers = await User.countDocuments({ status: "active" });
    const blockedUsers = await User.countDocuments({ status: "blocked" });

    // Users registered in the last 7 days
    const registeredLast7Days = await User.countDocuments({
      registrationDate: { $gte: sevenDaysAgo },
    });

    // Respond with statistics
    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        createdUsers,
        activeUsers,
        blockedUsers,
        registeredLast7Days,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Register user via Google
exports.registerUserViaGoogle = async (req, res) => {
  try {
    const { name, email, image } = req.body;

    // Generate a unique username by combining the name with a random number
    const randomNum = Math.floor(1000 + Math.random() * 9000); // Random 4 digit number
    const username = `${name.replace(/\s+/g, "").toLowerCase()}${randomNum}`;

    // Since Google authentication is being used, there will be no password.
    // You can store a placeholder or set it to null.
    const password = "00000000"; // Placeholder password

    // Handle other required fields
    const gender = "Male"; // Default or extracted from Google if available
    const phoneNo = "00000000"; // Default, or you may want to collect it later
    const role = "user"; // Default role
    const isAdmin = false; // Default, not admin

    // Create the user object
    const user = new User({
      name,
      email,
      username,
      password, // This won't be used but is required by the schema
      gender,
      phoneNo,
      image,
      role,
      isAdmin,
      isEmailVerified: true, // Assuming Google-verified email
      status: "approved", // User is directly active
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "User registered successfully via Google.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        image: user.image,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Login user via Google
exports.loginUserViaGoogle = async (req, res) => {
  const { email } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res
        .status(400)
        .json({
          success: false,
          message: "User not Found kindlt regsiter first",
        });
    }

    // Check user status
    if (user.status !== "approved") {
      return res
        .status(403)
        .json({
          success: false,
          message: "Your account is not approved or is blocked",
        });
    }

    // Generate JWT token
    const payload = {
      user: {
        id: user.id,
        email: user.email,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
      (err, token) => {
        if (err) throw err;
        res.status(200).json({ success: true, token, user });
      }
    );
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
