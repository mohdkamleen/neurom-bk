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
  connectionTimeout: 10000, // 10s to establish connection
  greetingTimeout: 10000,   // 10s for SMTP greeting
  socketTimeout: 15000,     // 15s for socket inactivity
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
