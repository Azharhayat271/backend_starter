const express = require("express");
const authenticateJWT = require('../middleware/auth');

const { registerUser, verifyEmail, verifyEmailLink, login, forgotPassword, resetPassword, getAllUsers } = require("../controllers/user"); // Adjust the path as necessary

const router = express.Router();

router.post("/register", registerUser);
router.post("/verify-email", verifyEmail);
router.get("/verify-email", verifyEmailLink);
router.post("/login", login)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)
router.get("/get-all-users", authenticateJWT, getAllUsers)





module.exports = router;
