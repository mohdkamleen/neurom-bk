// config/otpStore.js — signup OTP + password-reset OTP
const otpStore = {};
const resetOtpStore = {};

const setOTP = (email, otp) => {
  otpStore[email] = {
    otp,
    expires: Date.now() + 5 * 60 * 1000,
  };
};

const verifyOTP = (email, otp) => {
  const record = otpStore[email];

  if (!record) return { success: false, message: "No OTP found" };

  if (Date.now() > record.expires) {
    delete otpStore[email];
    return { success: false, message: "OTP expired" };
  }

  if (String(record.otp) !== String(otp)) {
    return { success: false, message: "Invalid OTP" };
  }

  delete otpStore[email];
  return { success: true };
};

const setResetOTP = (email, otp) => {
  resetOtpStore[email] = {
    otp,
    expires: Date.now() + 5 * 60 * 1000,
  };
};

const verifyResetOTP = (email, otp) => {
  const record = resetOtpStore[email];

  if (!record) return { success: false, message: "No reset code found" };

  if (Date.now() > record.expires) {
    delete resetOtpStore[email];
    return { success: false, message: "Reset code expired" };
  }

  if (String(record.otp) !== String(otp)) {
    return { success: false, message: "Invalid reset code" };
  }

  delete resetOtpStore[email];
  return { success: true };
};

module.exports = { setOTP, verifyOTP, setResetOTP, verifyResetOTP };
