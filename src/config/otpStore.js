// config/otpStore.js
const otpStore = {};

const setOTP = (email, otp) => {
  otpStore[email] = {
    otp,
    expires: Date.now() + 5 * 60 * 1000, // 5 min
  };
};

const verifyOTP = (email, otp) => {
  const record = otpStore[email];

  if (!record) return { success: false, message: "No OTP found" };

  if (Date.now() > record.expires) {
    delete otpStore[email];
    return { success: false, message: "OTP expired" };
  }

  if (record.otp != otp) {
    return { success: false, message: "Invalid OTP" };
  }

  delete otpStore[email];
  return { success: true };
};

module.exports = { setOTP, verifyOTP };