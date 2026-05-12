/** Figma: at least 8 characters & one special character */
function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters" };
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { ok: false, message: "Password must include at least one special character" };
  }
  return { ok: true };
}

module.exports = { validatePassword };
