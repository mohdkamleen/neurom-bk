const nodemailer = require("nodemailer");

/* ================= MAIL SETUP ================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* ================= SEND MAIL FUNCTION ================= */
const sendMail = async ({ to, subject, text, html }) => {
  return transporter.sendMail({
    from: `"Pmal Group" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html
  });
};


/* ✅ EXPORT AS OBJECT */
module.exports = { sendMail };
