// Brevo HTTP API — uses HTTPS port 443, not blocked on Render free tier
const sendMail = async ({ to, subject, text, html }) => {
  const recipients = Array.isArray(to)
    ? to.map((email) => ({ email }))
    : [{ email: to }];

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: "NeuroM",
        email: process.env.EMAIL_USER,
      },
      to: recipients,
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Brevo API error: ${err.message}`);
  }

  return res.json();
};

module.exports = { sendMail };
