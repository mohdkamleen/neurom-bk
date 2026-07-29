const { OAuth2Client } = require("google-auth-library");
const appleSignin = require("apple-signin-auth");

function getGoogleClientIds() {
  return [
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
  ].filter(Boolean);
}

async function verifyGoogleIdToken(idToken) {
  const audiences = getGoogleClientIds();
  if (!audiences.length) {
    throw new Error(
      "Google Sign-In is not configured on the server (set GOOGLE_WEB_CLIENT_ID in .env)"
    );
  }

  const client = new OAuth2Client();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: audiences,
  });

  const payload = ticket.getPayload();
  if (!payload?.sub) {
    throw new Error("Invalid Google token");
  }

  return {
    googleId: payload.sub,
    email: payload.email ? String(payload.email).trim().toLowerCase() : null,
    name: payload.name || null,
    avatarUrl: payload.picture || null,
    emailVerified: payload.email_verified === true,
  };
}

async function verifyAppleIdToken(idToken) {
  const audience = process.env.APPLE_BUNDLE_ID || process.env.APPLE_CLIENT_ID;
  if (!audience) {
    throw new Error(
      "Apple Sign-In is not configured on the server (set APPLE_BUNDLE_ID in .env)"
    );
  }

  const payload = await appleSignin.verifyIdToken(idToken, { audience });

  if (!payload?.sub) {
    throw new Error("Invalid Apple token");
  }

  return {
    appleId: payload.sub,
    email: payload.email ? String(payload.email).trim().toLowerCase() : null,
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
  };
}

module.exports = { verifyGoogleIdToken, verifyAppleIdToken };
