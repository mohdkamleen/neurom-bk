const User = require("../models/User");
const { serializeUser } = require("../utils/serializeUser");

// ─── Unit conversion helpers ──────────────────────────────────────────────────

function parseHeightCm(height, unit = "cm") {
  const h = Number(height);
  if (!Number.isFinite(h) || h <= 0) return null;
  if (unit === "ft") return Math.round(h * 30.48 * 10) / 10;
  if (unit === "in") return Math.round(h * 2.54 * 10) / 10;
  return h; // cm
}

function parseWeightKg(weight, unit = "kg") {
  const w = Number(weight);
  if (!Number.isFinite(w) || w <= 0) return null;
  if (unit === "lbs" || unit === "lb") return Math.round(w * 0.453592 * 10) / 10;
  if (unit === "st") return Math.round(w * 6.35029 * 10) / 10;
  return w; // kg
}


// ─── GET /onboarding/status ───────────────────────────────────────────────────

exports.status = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("onboardingCompleted name")
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      onboardingCompleted: !!user.onboardingCompleted,
      hasName: !!user.name,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /onboarding/complete ────────────────────────────────────────────────
/**
 * Accepts the AsyncStorage ONBOARDING_FORM payload from neurom-native-fr.
 *
 * Expected body shape:
 * {
 *   personalization : { preferredName, dob }
 *   physicalMetrics : { height, heightUnit, weight, weightUnit }
 *   bloodGroup      : { bloodType }
 *   bloodSugar      : { highBloodSugar, familyHistory }
 *   diabetes        : { diabetesDiagnosed, diabetesType, meausureGlucose }
 * }
 */
exports.complete = async (req, res) => {
  try {
    const body            = req.body || {};
    const personalization = body.personalization || {};
    const physical        = body.physicalMetrics  || {};
    const bloodGroup      = body.bloodGroup       || {};
    const bloodSugar      = body.bloodSugar       || {};
    const diabetes        = body.diabetes         || {};

    const update = { onboardingCompleted: true };

    // ── Personalization ───────────────────────────────────────────────────────
    if (personalization.preferredName) {
      update.name = String(personalization.preferredName).trim();
    }
    if (personalization.dob) {
      update.dateOfBirth = String(personalization.dob);
    }

    // ── Physical metrics ──────────────────────────────────────────────────────
    const heightCm = parseHeightCm(physical.height, physical.heightUnit);
    const weightKg = parseWeightKg(physical.weight, physical.weightUnit);
    if (heightCm !== null) update.height = heightCm;
    if (weightKg !== null) update.weight = weightKg;

    // ── Blood group ───────────────────────────────────────────────────────────
    if (bloodGroup.bloodType) {
      update.bloodGroup = String(bloodGroup.bloodType);
    }

    // ── Blood sugar history ───────────────────────────────────────────────────
    if (bloodSugar.highBloodSugar) {
      update.highBloodSugar = String(bloodSugar.highBloodSugar);
    }
    if (bloodSugar.familyHistory) {
      update.familyGlucoseHistory = String(bloodSugar.familyHistory);
    }

    // ── Diabetes ──────────────────────────────────────────────────────────────
    if (diabetes.diabetesDiagnosed) {
      update.diabetesDiagnosed = String(diabetes.diabetesDiagnosed);
    }
    if (diabetes.diabetesType) {
      update.diabetesType = String(diabetes.diabetesType);
    }
    if (diabetes.meausureGlucose) {
      update.glucoseMeasureFrequency = String(diabetes.meausureGlucose);
    }

    const user = await User.findByIdAndUpdate(req.user.id, update, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      message: "Onboarding saved",
      user: serializeUser(user),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
