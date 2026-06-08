# NeuroM API — neurom-native-fr integration

Base URL: `http://<host>:5000/api` (set in the React Native app).

## Auth

| Method | Path | Auth | Body |
|--------|------|------|------|
| POST | `/auth/sendOtp` | No | `{ "email" }` |
| POST | `/auth/resendOtp` | No | `{ "email" }` |
| POST | `/auth/verifyOtp` | No | `{ "email", "password", "otp" }` — `otp` is 4 digits |
| POST | `/auth/login` | No | `{ "email", "password" }` → `{ token, user, onboardingCompleted }` |
| POST | `/auth/forgot-password` | No | `{ "email" }` |
| POST | `/auth/reset-password` | No | `{ "email", "otp", "newPassword" }` |
| GET | `/auth/profile` | Bearer | |
| PATCH | `/auth/profile` | Bearer | profile fields (`name`, `gender`, `bloodGroup`, `dateOfBirth`, `height`, `weight`, …) |

Store `token` and send `Authorization: Bearer <token>` on protected routes.

## Onboarding

| Method | Path | Body |
|--------|------|------|
| GET | `/onboarding/status` | |
| POST | `/onboarding/complete` | Same shape as AsyncStorage `ONBOARDING_FORM` keys: `personalization`, `bloodGroup`, `physicalMetrics`, `diabetes`, `bloodSugar` |

## Home & data

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | Connectivity check |
| GET | `/dashboard/home?glucoseRange=7d` | `greeting`, `glucoseCard` (7d/14d/30d), `dietChart.segments`, `insights`, `topImpactFoods` |
| GET | `/glucose?range=7d` | History |
| POST | `/glucose` | `{ "valueMgDl", "measuredAt?", "notes?" }` |
| POST | `/entries/manual` | `{ foods[], medicines[], glucose? }` — full manual entry from Add Data screen |
| GET | `/entries/manual?from=&to=&date=` | Same shape as POST — list foods, medicines, glucose readings |
| GET | `/entries/:id?type=meal\|medicine\|glucose` | Single entry detail (auto-detects type) |
| POST | `/entries/barcode` | Scanner result: food or medicine with nutrition / dosage |
| GET | `/entries/barcode/:id` | Saved scanner entry in barcode payload shape |
| GET | `/food/search?q=egg` | No auth |
| GET | `/food/product/:code` | Barcode / OFF code |
| GET | `/food/nutrients-for-serving?code=&grams=` | |
| POST | `/meals` | Meal log |
| GET | `/predictions/summary` | Prediction summary screen payload |
| GET | `/reports/diet` | Diet chart + `segments` |
| GET | `/reports/top-foods?days=7` | Impact foods list |
