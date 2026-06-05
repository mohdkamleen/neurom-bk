const dns = require("node:dns");
dns.setDefaultResultOrder("ipv4first"); // Force IPv4 — Render blocks IPv6
dns.setServers(["1.1.1.1", "1.0.0.1"]);

const path = require("path");
const dotenv = require("dotenv");

dotenv.config({
  path: path.resolve(__dirname, "../.env"),
  override: true,
  quiet: true,
});

const app = require("./app");
const connectDB = require("./config/database");

const port = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(port, () => console.log(`Server running on port ${port}`));
});
