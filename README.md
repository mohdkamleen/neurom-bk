# Diabetes Tracking App API Documentation

## Base URL

```bash
http://localhost:5000
```

Production Example:

```bash
https://yourdomain.com
```

---

# Authentication

## 1. Send Signup OTP

### POST `/api/auth/sendOtp`

Send OTP to email for signup.

### Request Body

```json
{
  "email": "user@example.com"
}
```

### Response

```json
{
  "message": "OTP sent successfully"
}
```

---

## 2. Verify OTP & Create Account

### POST `/api/auth/verifyOtp`

Password Requirements:
- Minimum 8 characters
- At least 1 special character

### Request Body

```json
{ 
  "email": "user@example.com",
  "otp": "1234",
  "password": "Password@123"
}
```

### Response

```json
{
  "message": "Account created successfully",
  "token": "JWT_TOKEN"
}
```

---

## 3. Login

### POST `/api/auth/login`

Blocked users receive `403 Forbidden`.

### Request Body

```json
{
  "email": "user@example.com",
  "password": "Password@123"
}
```

### Response

```json
{
  "token": "JWT_TOKEN",
  "user": {
    "_id": "USER_ID",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "user",
    "calorieGoal": 2200,
    "glucoseTargetLow": 80,
    "glucoseTargetHigh": 140
  }
}
```

---

## 4. Forgot Password

### POST `/api/auth/forgot-password`

Sends 4-digit reset OTP.

### Request Body

```json
{
  "email": "user@example.com"
}
```

### Response

```json
{
  "message": "Reset OTP sent"
}
```

---

## 5. Reset Password

### POST `/api/auth/reset-password`

### Request Body

```json
{
  "email": "user@example.com",
  "otp": "1234",
  "newPassword": "NewPassword@123"
}
```

### Response

```json
{
  "message": "Password reset successful"
}
```

---

## 6. Get Profile

### GET `/api/auth/profile`

### Headers

```http
Authorization: Bearer JWT_TOKEN
```

---

## 7. Update Profile

### PATCH `/api/auth/profile`

### Headers

```http
Authorization: Bearer JWT_TOKEN
```

### Request Body

```json
{
  "name": "John Doe",
  "age": 25,
  "height": 175,
  "weight": 70,
  "size": "M",
  "gender": "Male",
  "phone": "9876543210",
  "calorieGoal": 2200,
  "glucoseTargetLow": 80,
  "glucoseTargetHigh": 140
}
```

---

# Food APIs

## 1. Search Food

### GET `/api/food/search?q=apple`

---

## 2. Get Product By Barcode

### GET `/api/food/product/:code`

Example:

```bash
/api/food/product/8901234567890
```

---

## 3. Nutrients For Serving

### GET `/api/food/nutrients-for-serving?code=123&grams=150`

---

# Dashboard APIs

## Home Dashboard

### GET `/api/dashboard/home?glucoseRange=7d`

Available ranges:
- 7d
- 14d
- 30d

---

# Glucose APIs

## 1. Get Glucose History

### GET `/api/glucose?range=7d`

---

## 2. Add Glucose Reading

### POST `/api/glucose`

### Request Body

```json
{
  "valueMgDl": 120,
  "measuredAt": "2026-05-12T10:00:00Z",
  "notes": "Before breakfast"
}
```

---

## 3. Delete Glucose Reading

### DELETE `/api/glucose/:id`

---

# Meals APIs

## 1. Add Meal

### POST `/api/meals`

### Request Body

```json
{
  "mealType": "Breakfast",
  "consumedAt": "2026-05-12T08:00:00Z",
  "items": [
    {
      "foodName": "Apple",
      "servingAmount": 100,
      "servingUnit": "g",
      "servings": 1,
      "carbsG": 14,
      "calories": 52,
      "mealTiming": "Before Workout"
    }
  ]
}
```

---

## 2. Get Meals

### GET `/api/meals`

Optional Query:

```bash
/api/meals?from=2026-05-01&to=2026-05-12
```

---

## 3. Get Meal By ID

### GET `/api/meals/:id`

---

# Medicine APIs

## 1. Add Medicine

### POST `/api/medicine`

### Request Body

```json
{
  "name": "Metformin",
  "dosageValue": 500,
  "dosageUnit": "mg",
  "form": "Tablet",
  "quantity": 1,
  "takenAt": "2026-05-12T09:00:00Z",
  "barcode": "123456789"
}
```

---

## 2. Get Medicines

### GET `/api/medicine`

---

# Reports APIs

## 1. Diet Report

### GET `/api/reports/diet?date=2026-05-12`

---

## 2. Top Foods

### GET `/api/reports/top-foods?days=7`

---

# Prediction APIs

## Run Prediction

### POST `/api/predictions/run`

### Request Body

```json
{
  "startDate": "2026-05-01",
  "endDate": "2026-05-12"
}
```

---

# Messages APIs

## 1. Get Threads

### GET `/api/messages/threads`

---

## 2. Create/Get Thread

### POST `/api/messages/threads`

### Request Body

```json
{
  "peerUserId": "USER_ID"
}
```

---

## 3. Get Thread Messages

### GET `/api/messages/threads/:threadId/messages?limit=50`

---

## 4. Send Message

### POST `/api/messages/threads/:threadId/messages`

### Request Body

```json
{
  "body": "Hello"
}
```

---

# Admin APIs

## 1. Get Users

### GET `/api/admin/users?status=active`

---

## 2. Update User

### PATCH `/api/admin/users/:id`

### Request Body

```json
{
  "name": "Updated User",
  "email": "updated@example.com",
  "phone": "9999999999",
  "role": "admin",
  "isBlocked": false
}
```

---

## 3. Delete All Users

### DELETE `/api/admin/users/all`

---

# JWT Authentication

```http
Authorization: Bearer JWT_TOKEN
```

---

# Roles

```txt
user
admin
```
