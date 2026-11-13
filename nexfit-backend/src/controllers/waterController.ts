
import { Request, Response } from "express";
import mongoose from "mongoose";
import WaterLog from "../models/WaterLog";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !DATE_REGEX.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

function getUserId(req: Request): string | null {
  const userId = (req as Request & { userId?: string }).userId;

  return userId && mongoose.Types.ObjectId.isValid(userId)
    ? userId
    : null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected server error";
}

// GET /api/water?date=YYYY-MM-DD
export async function getWaterLog(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const date = parseDate(req.query.date);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid or missing authenticated user",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid date in YYYY-MM-DD format",
      });
    }

    let log = await WaterLog.findOne({
      userId,
      logDate: date,
    });

    if (!log) {
      log = await WaterLog.create({
        userId,
        logDate: date,
        entries: [],
        dailyTargetMl: 2500,
      });
    }

    const totalMl = log.entries.reduce(
      (total, entry) => total + entry.amountMl,
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        ...log.toObject(),
        totalMl,
        remainingMl: Math.max(0, log.dailyTargetMl - totalMl),
        progressPercentage:
          log.dailyTargetMl > 0
            ? Math.min(100, Math.round((totalMl / log.dailyTargetMl) * 100))
            : 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch water log",
      error: getErrorMessage(error),
    });
  }
}

// POST /api/water/entries?date=YYYY-MM-DD
// Body: { amountMl: 250, note?: "After workout" }
export async function addWaterEntry(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const date = parseDate(req.query.date);
    const amountMl = Number(req.body.amountMl);
    const note =
      typeof req.body.note === "string" ? req.body.note.trim() : undefined;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid or missing authenticated user",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid date in YYYY-MM-DD format",
      });
    }

    if (!Number.isFinite(amountMl) || amountMl <= 0 || amountMl > 10000) {
      return res.status(400).json({
        success: false,
        message: "amountMl must be between 1 and 10000",
      });
    }

    const log = await WaterLog.findOneAndUpdate(
      { userId, logDate: date },
      {
        $setOnInsert: {
          userId,
          logDate: date,
          dailyTargetMl: 2500,
        },
        $push: {
          entries: {
            amountMl,
            consumedAt: new Date(),
            ...(note ? { note } : {}),
          },
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    if (!log) {
      return res.status(500).json({
        success: false,
        message: "Could not save water entry",
      });
    }

    const totalMl = log.entries.reduce(
      (total, entry) => total + entry.amountMl,
      0
    );

    return res.status(201).json({
      success: true,
      message: "Water intake recorded",
      data: {
        ...log.toObject(),
        totalMl,
        remainingMl: Math.max(0, log.dailyTargetMl - totalMl),
        progressPercentage:
          log.dailyTargetMl > 0
            ? Math.min(100, Math.round((totalMl / log.dailyTargetMl) * 100))
            : 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to record water intake",
      error: getErrorMessage(error),
    });
  }
}

// PATCH /api/water/target?date=YYYY-MM-DD
// Body: { dailyTargetMl: 3000 }
export async function updateWaterTarget(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const date = parseDate(req.query.date);
    const dailyTargetMl = Number(req.body.dailyTargetMl);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid or missing authenticated user",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid date in YYYY-MM-DD format",
      });
    }

    if (
      !Number.isFinite(dailyTargetMl) ||
      dailyTargetMl < 250 ||
      dailyTargetMl > 10000
    ) {
      return res.status(400).json({
        success: false,
        message: "dailyTargetMl must be between 250 and 10000",
      });
    }

    const log = await WaterLog.findOneAndUpdate(
      { userId, logDate: date },
      {
        $set: { dailyTargetMl },
        $setOnInsert: {
          userId,
          logDate: date,
        },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    if (!log) {
      return res.status(500).json({
        success: false,
        message: "Could not update water target",
      });
    }

    const totalMl = log.entries.reduce(
      (total, entry) => total + entry.amountMl,
      0
    );

    return res.status(200).json({
      success: true,
      message: "Daily water target updated",
      data: {
        ...log.toObject(),
        totalMl,
        remainingMl: Math.max(0, dailyTargetMl - totalMl),
        progressPercentage: Math.min(
          100,
          Math.round((totalMl / dailyTargetMl) * 100)
        ),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update water target",
      error: getErrorMessage(error),
    });
  }
}

// DELETE /api/water/entries/:entryId?date=YYYY-MM-DD
export async function deleteWaterEntry(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const date = parseDate(req.query.date);
    const { entryId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid or missing authenticated user",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Provide a valid date in YYYY-MM-DD format",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(entryId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid water entry ID",
      });
    }

    const log = await WaterLog.findOneAndUpdate(
      { userId, logDate: date },
      { $pull: { entries: { _id: entryId } } },
      { new: true }
    );

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Water log not found",
      });
    }

    const totalMl = log.entries.reduce(
      (total, entry) => total + entry.amountMl,
      0
    );

    return res.status(200).json({
      success: true,
      message: "Water entry deleted",
      data: {
        ...log.toObject(),
        totalMl,
        remainingMl: Math.max(0, log.dailyTargetMl - totalMl),
        progressPercentage:
          log.dailyTargetMl > 0
            ? Math.min(100, Math.round((totalMl / log.dailyTargetMl) * 100))
            : 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete water entry",
      error: getErrorMessage(error),
    });
  }
}
