function serializeUser(doc) {
  if (!doc) return null;
  const u = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  delete u.password;

  return {
    id: String(u._id || u.id),
    email: u.email,
    name: u.name || "",
    phone: u.phone,
    gender: u.gender,
    age: u.age,
    height: u.height,
    weight: u.weight,
    bloodGroup: u.bloodGroup,
    dateOfBirth: u.dateOfBirth,
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
    familyGlucoseHistory: u.familyGlucoseHistory,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

module.exports = { serializeUser };
