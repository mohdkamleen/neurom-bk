const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM || "NeuroM <onboarding@resend.dev>";

const sendMail = async ({ to, subject, text, html }) => {
  return resend.emails.send({
    from: FROM,
    to,
    subject,
    text,
    html,
  });
};

module.exports = { sendMail };
