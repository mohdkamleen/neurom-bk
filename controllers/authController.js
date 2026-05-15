const { sendMail } = require("../utils/sendMail");
const jwt = require("jsonwebtoken");
const { setOTP, verifyOTP, setResetOTP, verifyResetOTP } = require("../config/otpStore");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const { validatePassword } = require("../utils/passwordPolicy");

function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role || "user",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm });

    if (user) {
      return res.status(400).json({
        error: "Email already exists",
      });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);

    await sendMail({
      to: emailNorm,
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

    setOTP(emailNorm, otp);

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

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Account is blocked. Contact support.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role || "user",
        phone: user.phone,
        gender: user.gender,
        age: user.age,
        height: user.height,
        weight: user.weight,
        size: user.size,
        emailVerified: user.emailVerified,
        calorieGoal: user.calorieGoal,
        glucoseTargetLow: user.glucoseTargetLow,
        glucoseTargetHigh: user.glucoseTargetHigh,
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

exports.verifyOtp = async (req, res) => {
  const { email, password, otp } = req.body;

  if (!otp) {
    return res.status(400).json({
      success: false,
      message: "Otp is required",
    });
  }

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  const pwCheck = validatePassword(password);
  if (!pwCheck.ok) {
    return res.status(400).json({ success: false, message: pwCheck.message });
  }

  const emailNorm = String(email).trim().toLowerCase();
  const result = verifyOTP(emailNorm, otp);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  try {
    const existing = await User.findOne({ email: emailNorm });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email: emailNorm,
      password: hashedPassword,
      emailVerified: true,
    });

    await newUser.save();

    const token = signToken(newUser);

    const safeUser = await User.findById(newUser._id).select("-password");

    return res.json({
      success: true,
      message: "OTP verified",
      token,
      user: safeUser,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm });
    if (!user || user.isBlocked) {
      return res.json({
        success: true,
        message: "If an account exists for this email, a reset code was sent.",
      });
    } 

    const otp = Math.floor(1000 + Math.random() * 9000);
    setResetOTP(emailNorm, otp);

    await sendMail({
      to: user.email,
      subject: "NeuroM password reset code",
      html: `
        <p>Your password reset code is <b>${otp}</b></p>
        <p>This code expires in 5 minutes.</p>
      `,
    });

    return res.json({
      success: true,
      message: "If an account exists for this email, a reset code was sent.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "email, otp, and newPassword are required",
      });
    }

    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.ok) {
      return res.status(400).json({ success: false, message: pwCheck.message });
    }

    const v = verifyResetOTP(String(email).trim().toLowerCase(), otp);
    if (!v.success) {
      return res.status(400).json({ success: false, message: v.message });
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid request" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ success: true, message: "Password updated. You can sign in now." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

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

exports.updateProfile = async (req, res) => {
  try {
    const blockedFields = new Set([
      "_id",
      "__v",
      "password",
      "role",
      "isBlocked",
      "emailVerified",
      "createdAt",
      "updatedAt",
    ]);

    const updateFields = Object.fromEntries(
      Object.entries(req.body || {})
        .filter(([key]) => !blockedFields.has(key) && User.schema.path(key))
        .map(([key, value]) => [
          key,
          key === "email" && value != null ? String(value).trim().toLowerCase() : value,
        ])
    );

    if (!Object.keys(updateFields).length) {
      return res.status(400).json({
        success: false,
        message: "Send at least one valid profile field to update",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated",
      user,
    });
  } catch (err) {
    console.log(err);
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
