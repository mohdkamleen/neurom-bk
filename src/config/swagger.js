const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "NeuroM API",
      version: "1.0.0",
      description:
        "REST API for the NeuroM diabetes management mobile application. All protected routes require a Bearer JWT token obtained from `/auth/login` or `/auth/verifyOtp`.",
    },
    servers: [
      { url: "/api", description: "Prefixed base path" },
      { url: "/",    description: "Root base path" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        // ── Shared primitives ──────────────────────────────────────────────
        SuccessMessage: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Something went wrong" },
          },
        },
        // ── User / Auth ────────────────────────────────────────────────────
        User: {
          type: "object",
          properties: {
            id:                 { type: "string" },
            email:              { type: "string", format: "email" },
            name:               { type: "string" },
            phone:              { type: "string", nullable: true },
            gender:             { type: "string", nullable: true },
            age:                { type: "integer", nullable: true, description: "Calculated from dateOfBirth" },
            dateOfBirth:        { type: "string", format: "date-time", nullable: true },
            height:             { type: "number", description: "cm", nullable: true },
            weight:             { type: "number", description: "kg", nullable: true },
            bloodGroup:         { type: "string", nullable: true },
            avatarUrl:          { type: "string", nullable: true },
            emailVerified:      { type: "boolean" },
            role:               { type: "string", enum: ["user", "admin"] },
            calorieGoal:        { type: "integer", example: 2200 },
            glucoseTargetLow:   { type: "number",  example: 70 },
            glucoseTargetHigh:  { type: "number",  example: 180 },
            onboardingCompleted:{ type: "boolean" },
            diabetes: {
              type: "object",
              properties: {
                diagnosed:       { type: "string", nullable: true },
                type:            { type: "string", nullable: true },
                measureFrequency:{ type: "string", nullable: true },
              },
            },
            highBloodSugar:       { type: "string", nullable: true },
            familyGlucoseHistory: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            token:   { type: "string" },
            onboardingCompleted: { type: "boolean" },
            user:    { $ref: "#/components/schemas/User" },
          },
        },
        // ── Onboarding ─────────────────────────────────────────────────────
        OnboardingPayload: {
          type: "object",
          properties: {
            personalization: {
              type: "object",
              properties: {
                preferredName: { type: "string", example: "Alex" },
                dob:           { type: "string", format: "date-time", example: "2000-03-15T00:00:00.000Z" },
              },
            },
            physicalMetrics: {
              type: "object",
              properties: {
                height:     { type: "string", example: "170" },
                heightUnit: { type: "string", enum: ["cm", "ft", "in"], example: "cm" },
                weight:     { type: "string", example: "65" },
                weightUnit: { type: "string", enum: ["kg", "lbs", "st"], example: "kg" },
              },
            },
            bloodGroup: {
              type: "object",
              properties: {
                bloodType: { type: "string", example: "O+" },
              },
            },
            bloodSugar: {
              type: "object",
              properties: {
                highBloodSugar: { type: "string", enum: ["Yes", "No"], example: "No" },
                familyHistory:  { type: "string", example: "Father" },
              },
            },
            diabetes: {
              type: "object",
              properties: {
                diabetesDiagnosed: { type: "string", enum: ["Yes", "No"], example: "Yes" },
                diabetesType:      { type: "string", enum: ["Type A", "Type B", "Prediabetes"], example: "Type B" },
                meausureGlucose:   { type: "string", enum: ["Daily", "Weekly", "Monthly"], example: "Daily" },
              },
            },
          },
        },
        // ── Glucose ────────────────────────────────────────────────────────
        GlucoseReading: {
          type: "object",
          properties: {
            _id:       { type: "string" },
            userId:    { type: "string" },
            value:     { type: "number", example: 98 },
            unit:      { type: "string", example: "mg/dL" },
            type:      { type: "string", example: "fasting" },
            note:      { type: "string", nullable: true },
            recordedAt:{ type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        // ── Meal ───────────────────────────────────────────────────────────
        MealLog: {
          type: "object",
          properties: {
            _id:       { type: "string" },
            userId:    { type: "string" },
            name:      { type: "string" },
            calories:  { type: "number" },
            mealType:  { type: "string", example: "lunch" },
            loggedAt:  { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        // ── Medicine ───────────────────────────────────────────────────────
        MedicineLog: {
          type: "object",
          properties: {
            _id:       { type: "string" },
            userId:    { type: "string" },
            name:      { type: "string" },
            dose:      { type: "string" },
            takenAt:   { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    // Default security applied globally (overridden per-route where not needed)
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/docs/*.yaml"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
