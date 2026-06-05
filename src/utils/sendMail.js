const nodemailer = require("nodemailer");

// Brevo (Sendinblue) SMTP — works with any verified sender email, no domain required
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER, // your Brevo account email
    pass: process.env.BREVO_SMTP_KEY,  // Brevo SMTP key (not account password)
  },
});

const sendMail = async ({ to, subject, text, html }) => {
  return transporter.sendMail({
    from: `"NeuroM" <${process.env.BREVO_SENDER_EMAIL}>`,
    to,
    subject,
    text,
    html,
  });
};

module.exports = { sendMail };
