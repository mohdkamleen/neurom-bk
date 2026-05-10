const { sendMail } = require("../utils/sendMail");
const jwt = require("jsonwebtoken");
const { setOTP, verifyOTP } = require("../config/otpStore");
const User = require("../models/User"); 
 
const bcrypt = require("bcrypt");

exports.signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
      });
    }

    // Check existing user
    const user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({
        error: "Email already exists",
      });
    }

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save temporary user
    const newUser = new User({
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // Send mail
    await sendMail({
      to: email,
      subject: "Your OTP for Email Verification",
      html: `
        Your One-Time Password (OTP) is 
        <font color="green">
          <big>${otp}</big>
        </font>
        <br /><br />

        This code is valid for 5 minutes.
        <br /><br />

        <div style="display:flex;justify-content:center;align-items:center;">
          All Right Reserved &copy; NeuroM
        </div>

        <br /><br />

        <b>Note :</b>
        <i>For security reasons, please do not share this code with anyone.</i>
      `,
    });

    // Store OTP
    setOTP(email, otp);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });

  } catch (err) {
    console.log(err);

    return res.status(500).json({
      success: false,
      error: err.message,
    });
  }
}; 

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Check user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email",
      });
    }

    // Match password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    // Generate Token
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
      },
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// 🔹 Verify OTP
exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
 console.log(req.body);
 
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and otp are required",
      });
    }

  const result = verifyOTP(email, otp);
 
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  try {
    // 🔍 find user
    let user = await User.findOne({ email });

    // 🔐 create token with id + email
    const token = jwt.sign(
      {
        id: user._id, 
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "OTP verified",
      token,
      user
    });

  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

exports.getProfile = async (req, res) => {
  try {

    // Find user and remove password
    const user = await User.findById(req.user.id).select("-password");

    // User check
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Success response
    return res.status(200).json({
      success: true,
      user,
    });

  } catch (err) {
    console.log(err);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
  
// Delete All Users
exports.deleteAllUsers = async (req, res) => {
  try {

    // Delete all users
    const result = await User.deleteMany({});

    return res.status(200).json({
      success: true,
      message: "All users deleted successfully",
      deletedCount: result.deletedCount,
    });

  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};