const NotificationPreference = require("../models/NotificationPreference");
const CheckupReminder = require("../models/CheckupReminder");
const MedicationReminder = require("../models/MedicationReminder");
const User = require("../models/User");
const { sendMail } = require("../utils/sendMail");

const CATALOG = [
  { key: "hba1c", name: "HbA1c" },
  { key: "kidney", name: "Kidney Health" },
  { key: "eye", name: "Eye exam" },
  { key: "cholesterol", name: "Cholesterol check" },
  { key: "thyroid", name: "Thyroid check" },
  { key: "foot", name: "Foot exam" },
  { key: "glucose", name: "Blood Glucose" },
];

const FREQUENCIES = new Set([
  "one_time",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "every_3_months",
  "every_6_months",
  "yearly",
]);

const FREQUENCY_LABELS = {
  one_time: "One time",
  hourly: "Hourly",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  every_3_months: "Once in every 3 months",
  every_6_months: "Once in every 6 months",
  yearly: "Yearly",
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function serializeSettings(doc) {
  return {
    pushNotifications: !!doc.pushNotifications,
    emailNotifications: !!doc.emailNotifications,
    healthInsightAlerts: !!doc.healthInsightAlerts,
  };
}

function serializeCheckup(doc) {
  return {
    id: String(doc._id),
    catalogKey: doc.catalogKey || null,
    name: doc.name,
    frequency: doc.frequency || null,
    startTime: doc.startTime || null,
    endTime: doc.endTime || null,
    repeatEveryHours: doc.repeatEveryHours ?? null,
    snoozeMinutes: doc.snoozeMinutes ?? null,
    snoozeTimes: doc.snoozeTimes ?? null,
    weekday: doc.weekday ?? null,
    weekdays:
      Array.isArray(doc.weekdays) && doc.weekdays.length
        ? doc.weekdays
        : doc.weekday != null
          ? [doc.weekday]
          : [],
    monthDay: doc.monthDay ?? null,
    remindOn: doc.remindOn || null,
  };
}

function serializeMedication(doc) {
  return {
    id: String(doc._id),
    name: doc.name,
    time: doc.time,
    enabled: !!doc.enabled,
  };
}

async function getOrCreateSettings(userId) {
  let prefs = await NotificationPreference.findOne({ user: userId });
  if (!prefs) {
    prefs = await NotificationPreference.create({ user: userId });
  }
  return prefs;
}

function readSchedule(body) {
  const frequency = body.frequency;
  if (!FREQUENCIES.has(frequency)) {
    return { error: "A valid frequency is required" };
  }

  const startTime = String(body.startTime || "").trim();
  if (!startTime) {
    return { error: "startTime is required" };
  }

  const schedule = {
    frequency,
    startTime,
    endTime: body.endTime ? String(body.endTime).trim() : null,
    repeatEveryHours:
      body.repeatEveryHours != null && body.repeatEveryHours !== ""
        ? Number(body.repeatEveryHours)
        : null,
    snoozeMinutes:
      body.snoozeMinutes != null && body.snoozeMinutes !== ""
        ? Number(body.snoozeMinutes)
        : null,
    snoozeTimes:
      body.snoozeTimes != null && body.snoozeTimes !== ""
        ? Number(body.snoozeTimes)
        : null,
    weekday: body.weekday != null && body.weekday !== "" ? Number(body.weekday) : null,
    weekdays: Array.isArray(body.weekdays)
      ? [...new Set(body.weekdays.map(Number))].filter(
          (day) => Number.isInteger(day) && day >= 0 && day <= 6
        )
      : [],
    monthDay: body.monthDay != null && body.monthDay !== "" ? Number(body.monthDay) : null,
    remindOn: body.remindOn ? String(body.remindOn).trim() : null,
  };

  if (!schedule.weekdays.length && schedule.weekday != null) {
    schedule.weekdays = [schedule.weekday];
  }
  if (schedule.weekdays.length) {
    schedule.weekday = schedule.weekdays[0];
  }

  if (frequency === "hourly") {
    if (!schedule.endTime) {
      return { error: "endTime is required for hourly reminders" };
    }
    if (!Number.isFinite(schedule.repeatEveryHours) || schedule.repeatEveryHours < 1) {
      return { error: "repeatEveryHours is required for hourly reminders" };
    }
  }

  if (frequency === "weekly" && !schedule.weekdays.length) {
    return { error: "weekday is required for weekly reminders" };
  }

  if (frequency === "monthly" && (schedule.monthDay == null || schedule.monthDay < 1 || schedule.monthDay > 31)) {
    return { error: "monthDay is required for monthly reminders" };
  }

  if (
    (frequency === "one_time" ||
      frequency === "daily" ||
      frequency === "weekly" ||
      frequency === "monthly" ||
      frequency === "every_3_months" ||
      frequency === "every_6_months" ||
      frequency === "yearly") &&
    !schedule.remindOn
  ) {
    return { error: "remindOn is required for this frequency" };
  }

  return { schedule };
}

function describeCheckup(reminder) {
  const label = FREQUENCY_LABELS[reminder.frequency] || "Reminder";
  if (reminder.frequency === "hourly" && reminder.endTime && reminder.repeatEveryHours) {
    return `${label}, every ${reminder.repeatEveryHours} hour(s) from ${reminder.startTime} to ${reminder.endTime}`;
  }
  if (reminder.frequency === "weekly" && reminder.weekday != null) {
    return `${label} on ${WEEKDAYS[reminder.weekday]} at ${reminder.startTime}`;
  }
  if (reminder.frequency === "monthly" && reminder.monthDay) {
    return `${label} on day ${reminder.monthDay} at ${reminder.startTime}`;
  }
  if (reminder.remindOn) {
    return `${label} starting ${reminder.remindOn} at ${reminder.startTime}`;
  }
  return `${label} at ${reminder.startTime}`;
}

exports.getSettings = async (req, res) => {
  try {
    const prefs = await getOrCreateSettings(req.user.id);
    return res.json({ success: true, settings: serializeSettings(prefs) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const prefs = await getOrCreateSettings(req.user.id);
    const body = req.body || {};

    ["pushNotifications", "emailNotifications", "healthInsightAlerts"].forEach((key) => {
      if (typeof body[key] === "boolean") {
        prefs[key] = body[key];
      }
    });

    await prefs.save();
    return res.json({ success: true, settings: serializeSettings(prefs) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.listCheckups = async (req, res) => {
  try {
    const reminders = await CheckupReminder.find({ user: req.user.id }).sort({ createdAt: 1 }).lean();
    const byKey = new Map(
      reminders.filter((item) => item.catalogKey).map((item) => [item.catalogKey, item])
    );

    return res.json({
      success: true,
      recommended: CATALOG.map((item) => ({
        key: item.key,
        name: item.name,
        reminder: byKey.has(item.key) ? serializeCheckup(byKey.get(item.key)) : null,
      })),
      custom: reminders.filter((item) => !item.catalogKey).map(serializeCheckup),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.saveCheckup = async (req, res) => {
  try {
    const body = req.body || {};
    const parsed = readSchedule(body);
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const catalogKey = body.catalogKey ? String(body.catalogKey).trim() : null;
    const catalogItem = CATALOG.find((item) => item.key === catalogKey);
    if (catalogKey && !catalogItem) {
      return res.status(400).json({ success: false, message: "Unknown checkup" });
    }

    const name = catalogItem ? catalogItem.name : String(body.name || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "name is required" });
    }

    let reminder;
    if (catalogKey) {
      reminder = await CheckupReminder.findOneAndUpdate(
        { user: req.user.id, catalogKey },
        {
          $set: { name, ...parsed.schedule },
          $setOnInsert: { user: req.user.id, catalogKey },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    } else if (body.id) {
      reminder = await CheckupReminder.findOneAndUpdate(
        { _id: body.id, user: req.user.id, catalogKey: null },
        { $set: { name, ...parsed.schedule } },
        { new: true }
      );
      if (!reminder) {
        return res.status(404).json({ success: false, message: "Checkup reminder not found" });
      }
    } else {
      reminder = await CheckupReminder.create({
        user: req.user.id,
        catalogKey: null,
        name,
        ...parsed.schedule,
      });
    }

    return res.status(201).json({ success: true, reminder: serializeCheckup(reminder) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteCheckup = async (req, res) => {
  try {
    const deleted = await CheckupReminder.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Checkup reminder not found" });
    }
    return res.json({ success: true, message: "Checkup reminder removed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.listMedications = async (req, res) => {
  try {
    const reminders = await MedicationReminder.find({ user: req.user.id }).sort({ createdAt: 1 }).lean();
    return res.json({ success: true, medications: reminders.map(serializeMedication) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.createMedication = async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const time = String(req.body?.time || "").trim();
    if (!name) {
      return res.status(400).json({ success: false, message: "name is required" });
    }
    if (!time) {
      return res.status(400).json({ success: false, message: "time is required" });
    }

    const reminder = await MedicationReminder.create({
      user: req.user.id,
      name,
      time,
      enabled: req.body.enabled !== false,
    });

    return res.status(201).json({ success: true, medication: serializeMedication(reminder) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.updateMedication = async (req, res) => {
  try {
    const update = {};
    if (typeof req.body?.name === "string" && req.body.name.trim()) {
      update.name = req.body.name.trim();
    }
    if (typeof req.body?.time === "string" && req.body.time.trim()) {
      update.time = req.body.time.trim();
    }
    if (typeof req.body?.enabled === "boolean") {
      update.enabled = req.body.enabled;
    }

    const reminder = await MedicationReminder.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: update },
      { new: true }
    );

    if (!reminder) {
      return res.status(404).json({ success: false, message: "Medication reminder not found" });
    }

    return res.json({ success: true, medication: serializeMedication(reminder) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.deleteMedication = async (req, res) => {
  try {
    const deleted = await MedicationReminder.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Medication reminder not found" });
    }
    return res.json({ success: true, message: "Medication reminder removed" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.listInbox = async (req, res) => {
  try {
    const prefs = await getOrCreateSettings(req.user.id);
    const [checkups, medications] = await Promise.all([
      CheckupReminder.find({ user: req.user.id, frequency: { $ne: null } }).sort({ createdAt: -1 }).lean(),
      MedicationReminder.find({ user: req.user.id, enabled: true }).sort({ createdAt: -1 }).lean(),
    ]);

    const notifications = [
      ...checkups.map((item) => ({
        id: `checkup-${item._id}`,
        kind: "checkup",
        title: `${item.name} reminder`,
        description: describeCheckup(item),
      })),
      ...medications.map((item) => ({
        id: `medication-${item._id}`,
        kind: "medication",
        title: "Medication Reminder",
        description: `${item.name} at ${item.time}`,
      })),
    ];

    if (prefs.healthInsightAlerts) {
      notifications.unshift({
        id: "health-insights",
        kind: "insight",
        title: "Health Insight Alerts",
        description: "Important health updates are turned on for this account.",
      });
    }

    return res.json({
      success: true,
      settings: serializeSettings(prefs),
      notifications,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

exports.sendDueEmails = async (req, res) => {
  try {
    const prefs = await getOrCreateSettings(req.user.id);
    if (!prefs.emailNotifications) {
      return res.json({ success: true, sent: false, message: "Email notifications are off" });
    }

    const user = await User.findById(req.user.id).select("email name").lean();
    if (!user?.email) {
      return res.status(400).json({ success: false, message: "No email on this account" });
    }

    const [checkups, medications] = await Promise.all([
      CheckupReminder.find({ user: req.user.id, frequency: { $ne: null } }).lean(),
      MedicationReminder.find({ user: req.user.id, enabled: true }).lean(),
    ]);

    const lines = [
      ...checkups.map((item) => `${item.name}: ${describeCheckup(item)}`),
      ...medications.map((item) => `${item.name} at ${item.time}`),
    ];

    if (!lines.length) {
      return res.json({ success: true, sent: false, message: "No reminders to email" });
    }

    await sendMail({
      to: user.email,
      subject: "Your NeuroM reminders",
      text: `Hi ${user.name || "there"},\n\n${lines.join("\n")}\n`,
      html: `<p>Hi ${user.name || "there"},</p><ul>${lines
        .map((line) => `<li>${line}</li>`)
        .join("")}</ul>`,
    });

    return res.json({ success: true, sent: true, count: lines.length });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: err.message || "Could not send reminder email",
    });
  }
};
