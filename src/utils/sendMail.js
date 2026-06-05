const nodemailer = require("nodemailer");

/* ================= MAIL SETUP ================= */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

/* ================= SEND MAIL FUNCTION ================= */
const sendMail = async ({ to, subject, text, html }) => {
  return transporter.sendMail({
    from: `"NeuroM" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });
};

module.exports = { sendMail };
