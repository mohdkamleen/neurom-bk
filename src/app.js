const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");

const apiRoutes  = require("./routes");
const swaggerSpec = require("./config/swagger");

const app = express();

app.use(cors());
app.use(express.json());

// ── Swagger UI ────────────────────────────────────────────────────────────────
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "NeuroM API Docs",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: "list",
      filter: true,
    },
  }),
);

// Raw OpenAPI JSON (useful for importing into Postman / Insomnia)
app.get("/api-docs.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api", apiRoutes);
// Same routes without /api prefix (e.g. POST /auth/login)
app.use(apiRoutes);

app.get("/", (req, res) => {
  res.send("NeuroM API running — docs at /api-docs");
});

module.exports = app;
