const User = require("../models/User");
const { serializeUser } = require("../utils/serializeUser");

function parseHeightCm(height, unit = "cm") {
  const h = Number(height);
  if (!Number.isFinite(h) || h <= 0) return null;
  if (unit === "ft") return Math.round(h * 30.48 * 10) / 10;
  if (unit === "in") return Math.round(h * 2.54 * 10) / 10;
  return h;
}

function parseWeightKg(weight, unit = "kg") {
  const w = Number(weight);
  if (!Number.isFinite(w) || w <= 0) return null;
  if (unit === "lb") return Math.round(w * 0.453592 * 10) / 10;
  return w;
}

exports.status = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("onboardingCompleted name").lean();
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

/**
 * Accepts the AsyncStorage onboarding payload from neurom-native-fr.
 */
exports.complete = async (req, res) => {
  try {
    const body = req.body || {};
    const personalization = body.personalization || {};
    const bloodGroup = body.bloodGroup || {};
    const physical = body.physicalMetrics || {};
    const diabetes = body.diabetes || {};
    const bloodSugar = body.bloodSugar || {};

    const update = {
      onboardingCompleted: true,
    };

    if (personalization.name) update.name = String(personalization.name).trim();
    if (personalization.age != null && personalization.age !== "") {
      const age = parseInt(String(personalization.age), 10);
      if (Number.isFinite(age) && age > 0 && age < 130) update.age = age;
    }

    const bg = bloodGroup.selectedBloodGroup;
    if (bg) update.bloodGroup = String(bg);

    const heightCm = parseHeightCm(physical.height, physical.heightUnit);
    const weightKg = parseWeightKg(physical.weight, physical.weightUnit);
    if (heightCm != null) update.height = heightCm;
    if (weightKg != null) update.weight = weightKg;

    if (diabetes.diabetesDiagnosed) update.diabetesDiagnosed = String(diabetes.diabetesDiagnosed);
    if (diabetes.diabetesType) update.diabetesType = String(diabetes.diabetesType);
    if (diabetes.meausureGlucose) {
      update.glucoseMeasureFrequency = String(diabetes.meausureGlucose);
    }

    if (bloodSugar.bloodSugar) update.familyGlucoseHistory = String(bloodSugar.bloodSugar);
    if (bloodSugar.bsFlag) {
      update.familyGlucoseHistory = [
        update.familyGlucoseHistory,
        `flag:${bloodSugar.bsFlag}`,
      ]
        .filter(Boolean)
        .join(" | ");
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
