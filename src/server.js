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
  app.listen(port, () =>
    console.log(`Server running on port ${port}  |  Swagger UI → http://localhost:${port}/api-docs`),
  );
}).catch(() => {
  app.listen(port, () =>
    console.log(`Server running on port ${port} (no DB)  |  Swagger UI → http://localhost:${port}/api-docs`),
  );
});
