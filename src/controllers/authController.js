const { sendMail } = require("../utils/sendMail");
const jwt = require("jsonwebtoken");
const { setOTP, verifyOTP, setResetOTP, verifyResetOTP, checkResetOTP } = require("../config/otpStore");
const User = require("../models/User");
const bcrypt = require("bcrypt");
const { validatePassword } = require("../utils/passwordPolicy");
const { serializeUser } = require("../utils/serializeUser");
const { verifyGoogleIdToken, verifyAppleIdToken } = require("../utils/socialAuth");

async function mailOtp(emailNorm, otp) {
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
}

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

async function issueAuthResponse(res, user) {
  if (user.isBlocked) {
    return res.status(403).json({
      success: false,
      message: "Account is blocked. Contact support.",
    });
  }

  const token = signToken(user);
  const safeUser = await User.findById(user._id).select("-password");

  return res.status(200).json({
    success: true,
    message: "Login successful",
    token,
    user: serializeUser(safeUser),
    onboardingCompleted: !!user.onboardingCompleted,
  });
}

exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: emailNorm });

    if (user) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);
    await mailOtp(emailNorm, otp);
    setOTP(emailNorm, otp);

    return res.status(200).json({ success: true, message: "OTP sent successfully" });
  } catch (err) {
    console.error("OTP mail error:", err.message);
    return res.status(500).json({ success: false, error: "Failed to send OTP email. Please try again." });
  }
};

/** Resend signup OTP (neurom-native-fr verify email screen). */
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: emailNorm });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email already registered. Sign in instead.",
      });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);
    await mailOtp(emailNorm, otp);
    setOTP(emailNorm, otp);

    return res.json({ success: true, message: "OTP resent successfully" });
  } catch (err) {
    console.error("Resend OTP mail error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to resend OTP email. Please try again." });
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

    if (!user.password) {
      const provider = user.googleId ? "Google" : user.appleId ? "Apple" : "social";
      return res.status(401).json({
        success: false,
        message: `This account uses ${provider} sign-in.`,
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
      user: serializeUser(user),
      onboardingCompleted: !!user.onboardingCompleted,
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
    return res.status(400).json({ success: false, message: result.message });
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
      user: serializeUser(safeUser),
      onboardingCompleted: false,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.googleAuth = async (req, res) => {
  try {
    const { idToken, flow } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: "idToken is required" });
    }

    const profile = await verifyGoogleIdToken(idToken);
    if (!profile.email) {
      return res.status(400).json({
        success: false,
        message: "Google account must include an email address",
      });
    }

    let user =
      (await User.findOne({ googleId: profile.googleId })) ||
      (await User.findOne({ email: profile.email }));

    if (user) {
      if (flow === "signup") {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists. Please sign in instead.",
          redirectToSignIn: true,
        });
      }
      if (user.appleId && !user.googleId) {
        return res.status(409).json({
          success: false,
          message: "This email is registered with Apple. Sign in with Apple instead.",
        });
      }
      if (!user.googleId) user.googleId = profile.googleId;
      if (!user.name && profile.name) user.name = profile.name;
      if (!user.avatarUrl && profile.avatarUrl) user.avatarUrl = profile.avatarUrl;
      if (profile.emailVerified) user.emailVerified = true;
      await user.save();
    } else {
      if (flow === "signin") {
        return res.status(404).json({
          success: false,
          message: "No account found with this Google account. Please sign up first.",
          redirectToSignUp: true,
        });
      }
      user = await User.create({
        email: profile.email,
        googleId: profile.googleId,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        emailVerified: profile.emailVerified || true,
      });
    }

    return issueAuthResponse(res, user);
  } catch (err) {
    console.error(err);
    return res.status(401).json({
      success: false,
      message: err.message || "Google sign-in failed",
    });
  }
};

exports.appleAuth = async (req, res) => {
  try {
    const { idToken, flow } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: "idToken is required" });
    }

    const profile = await verifyAppleIdToken(idToken);

    let user = await User.findOne({ appleId: profile.appleId });

    if (!user && profile.email) {
      user = await User.findOne({ email: profile.email });
    }

    if (user) {
      if (flow === "signup") {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists. Please sign in instead.",
          redirectToSignIn: true,
        });
      }
      if (user.googleId && !user.appleId) {
        return res.status(409).json({
          success: false,
          message: "This email is registered with Google. Sign in with Google instead.",
        });
      }
      if (!user.appleId) user.appleId = profile.appleId;
      if (profile.email && !user.email) user.email = profile.email;
      if (profile.emailVerified) user.emailVerified = true;
      await user.save();
    } else {
      if (flow === "signin") {
        return res.status(404).json({
          success: false,
          message: "No account found with this Apple account. Please sign up first.",
          redirectToSignUp: true,
        });
      }
      if (!profile.email) {
        return res.status(400).json({
          success: false,
          message:
            "Apple did not share an email. Remove this app from Apple ID settings and try again, or use email sign-up.",
        });
      }

      user = await User.create({
        email: profile.email,
        appleId: profile.appleId,
        emailVerified: profile.emailVerified || true,
      });
    }

    return issueAuthResponse(res, user);
  } catch (err) {
    console.error(err);
    return res.status(401).json({
      success: false,
      message: err.message || "Apple sign-in failed",
    });
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

exports.verifyResetPasswordOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "email and otp are required",
      });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const v = checkResetOTP(emailNorm, otp);
    if (!v.success) {
      return res.status(400).json({ success: false, message: v.message });
    }

    return res.json({ success: true, message: "Reset code verified" });
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
      user: serializeUser(user),
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
    const body = { ...(req.body || {}) };
    if (body.fullName != null && body.name == null) {
      body.name = body.fullName;
    }
    if (body.dob != null && body.dateOfBirth == null) {
      body.dateOfBirth = body.dob;
    }

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
      Object.entries(body)
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
      user: serializeUser(user),
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
