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
    tags: [
      { name: "Auth", description: "Authentication and profile" },
      { name: "Onboarding", description: "User onboarding" },
      { name: "Dashboard", description: "Home dashboard" },
      { name: "Glucose", description: "Glucose readings" },
      { name: "Meals", description: "Meal logging" },
      { name: "Medicine", description: "Medicine logging" },
      { name: "Entries", description: "Manual and barcode entries" },
      { name: "Food", description: "Food lookup — MongoDB cache, Open Food Facts, USDA" },
      { name: "Sharing", description: "Health data sharing and access management" },
    ],
    servers: [
      { url: "/api", description: "Prefixed base path" },
      { url: "/", description: "Root base path" },
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
            height:      { type: "number", description: "cm", nullable: true },
            weight:      { type: "number", description: "kg", nullable: true },
            bmi:         { type: "number", description: "Calculated: weight(kg) / height(m)²", nullable: true, example: 22.5 },
            bmiCategory: { type: "string", description: "Underweight | Normal weight | Overweight | Obese", nullable: true, example: "Normal weight" },
            bloodGroup:  { type: "string", nullable: true },
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
        // ── Food lookup (cache + Open Food Facts + USDA) ───────────────────
        FoodNutrition: {
          type: "object",
          properties: {
            calories: { type: "number", example: 65 },
            carbs:    { type: "number", example: 15.7 },
            fat:      { type: "number", example: 0.16 },
            protein:  { type: "number", example: 0.15 },
            sugar:    { type: "number", example: 13.3 },
            fiber:    { type: "number", example: 2.08 },
          },
        },
        FoodItem: {
          type: "object",
          properties: {
            source:       { type: "string", enum: ["openfoodfacts", "usda"], example: "usda" },
            barcode:      { type: "string", nullable: true, example: "3017620422003" },
            fdcId:        { type: "string", nullable: true, example: "1750340" },
            productName:  { type: "string", example: "Apples, fuji, with skin, raw" },
            brand:        { type: "string", nullable: true },
            imageUrl:     { type: "string", nullable: true },
            servingSize:  { type: "string", example: "100" },
            servings:     { type: "number", example: 1 },
            nutrition:    { $ref: "#/components/schemas/FoodNutrition" },
            foodCategory: { type: "string", nullable: true },
            dataType:     { type: "string", nullable: true },
          },
        },
        FoodSearchResponse: {
          type: "object",
          properties: {
            success:   { type: "boolean", example: true },
            query:     { type: "string", example: "apple" },
            page:      { type: "integer", example: 1 },
            pageSize:  { type: "integer", example: 20 },
            count:     { type: "integer", example: 42 },
            fromCache: { type: "boolean", description: "true when served from neurom_food MongoDB cache" },
            foods:     { type: "array", items: { $ref: "#/components/schemas/FoodItem" } },
            sources: {
              type: "object",
              properties: {
                usda:            { type: "integer" },
                openfoodfacts:   { type: "integer" },
              },
            },
          },
        },
        FoodDetailResponse: {
          allOf: [
            { $ref: "#/components/schemas/FoodItem" },
            {
              type: "object",
              required: ["success"],
              properties: {
                success:   { type: "boolean", example: true },
                fromCache: { type: "boolean", example: false },
              },
            },
          ],
        },
        // ── Sharing ────────────────────────────────────────────────────────
        SharePermission: {
          type: "string",
          enum: ["view_only", "view_edit"],
          example: "view_only",
        },
        SharedUser: {
          type: "object",
          properties: {
            id:         { type: "string", description: "Data share record id" },
            userId:     { type: "string", description: "Peer user id" },
            name:       { type: "string", example: "Jane Doe" },
            email:      { type: "string", format: "email", example: "jane@example.com" },
            phone:      { type: "string", example: "9876543210" },
            avatar:     { type: "string", nullable: true },
            permission: { $ref: "#/components/schemas/SharePermission" },
            ownerId:    { type: "string", description: "Present on sharedWithMe entries only" },
          },
        },
        ManageUsersResponse: {
          type: "object",
          properties: {
            success:       { type: "boolean", example: true },
            sharedByMe:    { type: "array", items: { $ref: "#/components/schemas/SharedUser" } },
            sharedWithMe:  { type: "array", items: { $ref: "#/components/schemas/SharedUser" } },
          },
        },
        GrantAccessRequest: {
          type: "object",
          required: ["permission"],
          properties: {
            email:       { type: "string", format: "email", description: "Receiver email (required if phone omitted)" },
            phone:       { type: "string", description: "Receiver phone (required if email omitted)" },
            countryCode: { type: "string", example: "+91" },
            permission:  { $ref: "#/components/schemas/SharePermission" },
          },
        },
        RequestAccessRequest: {
          type: "object",
          properties: {
            email:       { type: "string", format: "email", description: "Owner email (required if phone omitted)" },
            phone:       { type: "string", description: "Owner phone (required if email omitted)" },
            countryCode: { type: "string", example: "+91" },
          },
        },
        UpdatePermissionRequest: {
          type: "object",
          required: ["permission"],
          properties: {
            permission: { $ref: "#/components/schemas/SharePermission" },
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
