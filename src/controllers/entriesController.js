const GlucoseReading = require("../models/GlucoseReading");
const MealLog = require("../models/MealLog");
const MedicineLog = require("../models/MedicineLog");
const User = require("../models/User");
const mongoose = require("mongoose");
const { glucoseDisplayStatus } = require("../utils/glucoseDisplay");
const {
  parseTimestamp,
  parseServingAmount,
  groupFoodsIntoMeals,
  parseGlucoseValue,
  normalizeMealType,
  foodToMealItem,
  mealLogToFoods,
  medicineLogToFrontend,
  glucoseReadingToFrontend,
  mealLogToBarcodeEntry,
  medicineLogToBarcodeEntry,
  parseDateRange,
} = require("../utils/entryHelpers");
const { resolveSharedAccess, resolveSharedEditAccess, normalizeEmail } = require("../utils/sharedAccess");

async function getGlucoseTargets(userId) {
  const user = await User.findById(userId)
    .select("glucoseTargetLow glucoseTargetHigh")
    .lean();
  return {
    low: user?.glucoseTargetLow ?? 70,
    high: user?.glucoseTargetHigh ?? 180,
  };
}

function serializeReading(reading, low, high) {
  const obj = typeof reading.toObject === "function" ? reading.toObject() : reading;
  return {
    ...obj,
    status: glucoseDisplayStatus(obj.valueMgDl, low, high),
  };
}

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function resolveWritableUserId(req) {
  const email = normalizeEmail(
    req.body?.email || req.body?.sharedUserEmail || req.body?.ownerEmail,
  );
  if (!email) {
    return { ok: true, userId: req.user.id };
  }

  const access = await resolveSharedEditAccess(req.user.id, email);
  if (!access.ok) {
    return {
      ok: false,
      status: access.status,
      message: access.message,
    };
  }

  return {
    ok: true,
    userId: new mongoose.Types.ObjectId(String(access.ownerId)),
  };
}

/**
 * POST /entries/manual
 * Full neurom-native-fr manual entry: foods[], medicines[], glucose{}.
 * Legacy: meal + portion + glucoseMgDl/valueMgDl still supported.
 */
exports.manual = async (req, res) => {
  try {
    const body = req.body || {};
    const foods = Array.isArray(body.foods) ? body.foods : [];
    const medicines = Array.isArray(body.medicines) ? body.medicines : [];
    const glucoseBlock = body.glucose || {};

    const legacyMeal = body.meal;
    const legacyPortion = body.portion;
    const legacyGlucose = body.glucoseMgDl ?? body.valueMgDl;
    const legacyAt = body.consumedAt;

    const hasFoods = foods.length > 0;
    const hasMedicines = medicines.length > 0;
    const hasLegacyMeal =
      legacyMeal != null && String(legacyMeal).trim().length > 0;
    const glucoseRaw =
      glucoseBlock.valueMgDl ??
      glucoseBlock.value ??
      legacyGlucose;
    const hasGlucose =
      glucoseRaw != null && String(glucoseRaw).trim() !== "";

    if (!hasFoods && !hasMedicines && !hasLegacyMeal && !hasGlucose) {
      return res.status(400).json({
        success: false,
        message:
          "Provide at least one food item, medicine, or glucose value",
      });
    }

    const resolved = await resolveWritableUserId(req);
    if (!resolved.ok) {
      return res.status(resolved.status).json({
        success: false,
        message: resolved.message,
      });
    }
    const targetUserId = resolved.userId;

    const result = { success: true, message: "Saved successfully" };
    const meals = [];
    const savedMedicines = [];

    if (hasFoods) {
      const mealDocs = groupFoodsIntoMeals(foods, targetUserId);
      for (const doc of mealDocs) {
        if (doc.items.length === 0) continue;
        meals.push(await MealLog.create(doc));
      }
    } else if (hasLegacyMeal) {
      const at = parseTimestamp(legacyAt) || new Date();
      const portionText =
        legacyPortion != null ? String(legacyPortion).trim() : "";
      meals.push(
        await MealLog.create({
          user: targetUserId,
          mealType: "Other",
          consumedAt: at,
          items: [
            {
              foodName: String(legacyMeal).trim(),
              servingAmount: portionText ? 1 : undefined,
              servingUnit: portionText || "portion",
              servings: 1,
              mealTiming: "unspecified",
            },
          ],
          notes: portionText ? `Portion: ${portionText}` : body.notes,
        })
      );
    }

    for (const med of medicines) {
      const name = med.name || med.medicineName;
      if (!name || !String(name).trim()) continue;

      const takenAt =
        parseTimestamp(med.takenAt || med.date) || new Date();
      const dosageRaw = med.dosage ?? med.dosageValue;
      const dosageValue =
        dosageRaw != null && String(dosageRaw).trim() !== ""
          ? Number(String(dosageRaw).replace(/[^\d.]/g, ""))
          : undefined;

      savedMedicines.push(
        await MedicineLog.create({
          user: targetUserId,
          name: String(name).trim(),
          dosageValue: Number.isFinite(dosageValue) ? dosageValue : undefined,
          dosageUnit: med.dosageUnit || "mg",
          form: med.form,
          quantity:
            med.quantity != null && Number(med.quantity) > 0
              ? Number(med.quantity)
              : 1,
          takenAt,
          barcode: med.barcode,
        })
      );
    }

    if (meals.length > 0) result.meals = meals;
    if (savedMedicines.length > 0) result.medicines = savedMedicines;

    if (hasGlucose) {
      const v = parseGlucoseValue(glucoseRaw);
      if (v === null) {
        return res.status(400).json({
          success: false,
          message: "glucose value must be between 1 and 600 mg/dL",
        });
      }

      const measuredAt =
        parseTimestamp(glucoseBlock.measuredAt || legacyAt) || new Date();
      const { low, high } = await getGlucoseTargets(targetUserId);

      const reading = await GlucoseReading.create({
        user: targetUserId,
        valueMgDl: v,
        measuredAt,
        notes: glucoseBlock.notes ?? body.notes,
      });

      result.reading = serializeReading(reading, low, high);
    }

    return res.status(201).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * POST /entries/barcode
 * neurom-native-fr scanner result (food or medicine).
 */
exports.barcode = async (req, res) => {
  try {
    const body = req.body || {};
    const category = String(body.category || "food").toLowerCase();
    const barcode = body.barcode ? String(body.barcode) : undefined;
    const productName = body.productName || body.name;
    const eatenAt = parseTimestamp(body.eatenAt) || new Date();

    if (!productName || !String(productName).trim()) {
      return res.status(400).json({
        success: false,
        message: "productName is required",
      });
    }

    const resolved = await resolveWritableUserId(req);
    if (!resolved.ok) {
      return res.status(resolved.status).json({
        success: false,
        message: resolved.message,
      });
    }
    const targetUserId = resolved.userId;

    const result = { success: true, message: "Saved successfully" };

    if (category === "medicine") {
      const med = body.medicine || {};
      const medicine = await MedicineLog.create({
        user: targetUserId,
        name: String(med.medicineName || productName).trim(),
        dosageValue:
          med.dosage != null ? Number(med.dosage) : undefined,
        dosageUnit: med.dosageUnit || "mg",
        form: med.form,
        quantity:
          med.quantity != null && Number(med.quantity) > 0
            ? Number(med.quantity)
            : 1,
        takenAt: eatenAt,
        barcode,
      });
      result.medicine = medicine;
      return res.status(201).json(result);
    }

    const mealType = normalizeMealType(body.foodType);
    const servingAmount = parseServingAmount(body.servingSize);
    const item = foodToMealItem(
      {
        name: String(productName).trim(),
        servingSize: body.servingSize,
        servings: body.servings,
        nutrition: body.nutrition,
      },
      barcode
    );

    const meal = await MealLog.create({
      user: targetUserId,
      mealType,
      consumedAt: eatenAt,
      items: [item],
      notes: body.brand ? `Brand: ${body.brand}` : undefined,
    });

    result.meal = meal;
    return res.status(201).json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /entries/manual?from=&to=&date=
 * Returns foods, medicines, and glucose readings in the same shape as POST.
 */
exports.listManual = async (req, res) => {
  try {
    const { from, to } = parseDateRange(req.query);
    let userId = req.user.id;

    if (req.query.email) {
      const access = await resolveSharedAccess(req.user.id, req.query.email);
      if (!access.ok) {
        return res.status(access.status).json({
          success: false,
          message: access.message,
        });
      }
      userId = new mongoose.Types.ObjectId(String(access.ownerId));
    }

    const [meals, medicines, readings] = await Promise.all([
      MealLog.find({ user: userId, consumedAt: { $gte: from, $lte: to } })
        .sort({ consumedAt: -1 })
        .lean(),
      MedicineLog.find({ user: userId, takenAt: { $gte: from, $lte: to } })
        .sort({ takenAt: -1 })
        .lean(),
      GlucoseReading.find({ user: userId, measuredAt: { $gte: from, $lte: to } })
        .sort({ measuredAt: -1 })
        .lean(),
    ]);

    const foods = meals.flatMap(mealLogToFoods);
    const { low, high } = await getGlucoseTargets(userId);

    return res.json({
      success: true,
      from,
      to,
      foods,
      medicines: medicines.map(medicineLogToFrontend),
      glucoseReadings: readings.map((r) =>
        glucoseReadingToFrontend(r, glucoseDisplayStatus(r.valueMgDl, low, high))
      ),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /entries/barcode/:id
 * Returns a saved scanner entry in SaveBarcodeEntryPayload shape.
 */
exports.getBarcode = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(404).json({ success: false, message: "Entry not found" });
    }

    const meal = await MealLog.findOne({ _id: id, user: userId }).lean();
    if (meal && meal.items?.some((i) => i.barcode)) {
      const entry = mealLogToBarcodeEntry(meal);
      if (entry) {
        return res.json({ success: true, entry });
      }
    }

    const medicine = await MedicineLog.findOne({
      _id: id,
      user: userId,
      barcode: { $exists: true, $ne: null },
    }).lean();

    if (medicine) {
      return res.json({
        success: true,
        entry: medicineLogToBarcodeEntry(medicine),
      });
    }

    return res.status(404).json({ success: false, message: "Entry not found" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * GET /entries/:id?type=meal|medicine|glucose
 * Returns a single saved entry with full detail.
 */
exports.getById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const type = String(req.query.type || "").toLowerCase();

    if (!isValidId(id)) {
      return res.status(404).json({ success: false, message: "Entry not found" });
    }

    const { low, high } = await getGlucoseTargets(userId);

    if (!type || type === "meal" || type === "food") {
      const meal = await MealLog.findOne({ _id: id, user: userId }).lean();
      if (meal) {
        const foods = mealLogToFoods(meal);
        const barcodeEntry = meal.items?.some((i) => i.barcode)
          ? mealLogToBarcodeEntry(meal)
          : null;

        return res.json({
          success: true,
          type: barcodeEntry ? "barcode_food" : "food",
          foods,
          entry: barcodeEntry,
          meal,
        });
      }
      if (type === "meal" || type === "food") {
        return res.status(404).json({ success: false, message: "Entry not found" });
      }
    }

    if (!type || type === "medicine") {
      const medicine = await MedicineLog.findOne({ _id: id, user: userId }).lean();
      if (medicine) {
        const detail = medicineLogToFrontend(medicine);
        const barcodeEntry = medicine.barcode
          ? medicineLogToBarcodeEntry(medicine)
          : null;

        return res.json({
          success: true,
          type: barcodeEntry ? "barcode_medicine" : "medicine",
          medicine: detail,
          entry: barcodeEntry,
        });
      }
      if (type === "medicine") {
        return res.status(404).json({ success: false, message: "Entry not found" });
      }
    }

    if (!type || type === "glucose") {
      const reading = await GlucoseReading.findOne({ _id: id, user: userId }).lean();
      if (reading) {
        return res.json({
          success: true,
          type: "glucose",
          glucose: glucoseReadingToFrontend(
            reading,
            glucoseDisplayStatus(reading.valueMgDl, low, high)
          ),
        });
      }
      if (type === "glucose") {
        return res.status(404).json({ success: false, message: "Entry not found" });
      }
    }

    return res.status(404).json({ success: false, message: "Entry not found" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
