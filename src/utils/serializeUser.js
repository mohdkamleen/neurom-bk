/**
 * Calculates BMI from height (cm) and weight (kg).
 * Returns null if either value is missing or invalid.
 */
function calcBmi(heightCm, weightKg) {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const bmi = weightKg / Math.pow(heightCm / 100, 2);
  return Math.round(bmi * 10) / 10;
}

/**
 * Returns a BMI category label.
 */
function bmiCategory(bmi) {
  if (bmi === null) return null;
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25)   return "Normal weight";
  if (bmi < 30)   return "Overweight";
  return "Obese";
}

/**
 * Calculates the current age in years from an ISO date string.
 * Returns null if the date is missing or invalid.
 */
function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age > 0 && age < 130 ? age : null;
}

function serializeUser(doc) {
  if (!doc) return null;
  const u = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  delete u.password;

  // Always derive age from DOB so it stays current; fall back to stored age
  const age = calcAge(u.dateOfBirth) ?? u.age ?? null;

  const bmi      = calcBmi(u.height, u.weight);
  const bmiLabel = bmiCategory(bmi);

  return {
    id: String(u._id || u.id),
    email: u.email,
    name: u.name || "",
    phone: u.phone,
    gender: u.gender,
    age,
    dateOfBirth: u.dateOfBirth,
    height: u.height,
    weight: u.weight,
    bmi,
    bmiCategory: bmiLabel,
    bloodGroup: u.bloodGroup,
    avatarUrl: u.avatarUrl,
    emailVerified: !!u.emailVerified,
    role: u.role || "user",
    calorieGoal: u.calorieGoal ?? 2200,
    glucoseTargetLow: u.glucoseTargetLow ?? 70,
    glucoseTargetHigh: u.glucoseTargetHigh ?? 180,
    onboardingCompleted: !!u.onboardingCompleted,
    diabetes: {
      diagnosed: u.diabetesDiagnosed,
      type: u.diabetesType,
      measureFrequency: u.glucoseMeasureFrequency,
    },
    highBloodSugar: u.highBloodSugar,
    familyGlucoseHistory: u.familyGlucoseHistory,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

module.exports = { serializeUser };
