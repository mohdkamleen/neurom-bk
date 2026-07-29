// Brevo HTTP API — uses HTTPS port 443, not blocked on Render free tier
const sendMail = async ({ to, subject, text, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_USER;

  console.log("[sendMail] called, to:", to);
  console.log("[sendMail] BREVO_API_KEY set:", !!apiKey);
  console.log("[sendMail] EMAIL_USER:", senderEmail);
  console.log("[sendMail] fetch available:", typeof fetch !== "undefined");

  if (!apiKey) throw new Error("BREVO_API_KEY is not set in environment variables");
  if (!senderEmail) throw new Error("EMAIL_USER is not set in environment variables");

  const recipients = Array.isArray(to)
    ? to.map((email) => ({ email }))
    : [{ email: to }];

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "NeuroM", email: senderEmail },
      to: recipients,
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  const data = await res.json();
  console.log("[sendMail] Brevo response status:", res.status, JSON.stringify(data));

  if (!res.ok) {
    throw new Error(`Brevo API error: ${data.message || JSON.stringify(data)}`);
  }

  return data;
};

module.exports = { sendMail };
