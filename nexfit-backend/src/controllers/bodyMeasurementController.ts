
import { Request, Response } from "express";
import mongoose from "mongoose";
import BodyMeasurement from "../models/BodyMeasurement";

function getUserId(req: Request): string | null {
  const userId = (req as Request & { userId?: string }).userId;

  return userId && mongoose.Types.ObjectId.isValid(userId)
    ? userId
    : null;
}

function validDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

const measurementFields = [
  "weightKg",
  "bodyFatPercentage",
  "waistCm",
  "chestCm",
  "hipsCm",
] as const;

// POST /api/body-measurements
export async function createMeasurement(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const measuredAt = req.body.measuredAt
      ? validDate(req.body.measuredAt)
      : new Date();

    if (!measuredAt) {
      return res.status(400).json({
        success: false,
        message: "Invalid measuredAt date",
      });
    }

    const weightKg = Number(req.body.weightKg);

    if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 500) {
      return res.status(400).json({
        success: false,
        message: "weightKg must be greater than 0 and at most 500",
      });
    }

    const payload: Record<string, unknown> = {
      userId,
      measuredAt,
      weightKg,
    };

    for (const field of measurementFields) {
      if (field === "weightKg") continue;

      const value = req.body[field];

      if (value === undefined || value === null || value === "") continue;

      const numberValue = Number(value);

      if (!Number.isFinite(numberValue) || numberValue < 0) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a non-negative number`,
        });
      }

      if (field === "bodyFatPercentage" && numberValue > 100) {
        return res.status(400).json({
          success: false,
          message: "bodyFatPercentage cannot exceed 100",
        });
      }

      payload[field] = numberValue;
    }

    if (typeof req.body.notes === "string") {
      payload.notes = req.body.notes.trim();
    }

    const measurement = await BodyMeasurement.create(payload);

    return res.status(201).json({
      success: true,
      message: "Body measurement saved",
      data: measurement,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save body measurement",
      error: errorMessage(error),
    });
  }
}

// GET /api/body-measurements?limit=30&page=1
export async function getMeasurements(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const skip = (page - 1) * limit;

    const filter = { userId };

    const [measurements, total] = await Promise.all([
      BodyMeasurement.find(filter)
        .sort({ measuredAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BodyMeasurement.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: measurements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch body measurements",
      error: errorMessage(error),
    });
  }
}

// GET /api/body-measurements/latest
export async function getLatestMeasurement(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const measurement = await BodyMeasurement.findOne({ userId })
      .sort({ measuredAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: measurement,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch latest measurement",
      error: errorMessage(error),
    });
  }
}

// PATCH /api/body-measurements/:id
export async function updateMeasurement(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid measurement ID",
      });
    }

    const updates: Record<string, unknown> = {};

    if (req.body.measuredAt !== undefined) {
      const date = validDate(req.body.measuredAt);

      if (!date) {
        return res.status(400).json({
          success: false,
          message: "Invalid measuredAt date",
        });
      }

      updates.measuredAt = date;
    }

    for (const field of measurementFields) {
      if (req.body[field] === undefined) continue;

      const value = Number(req.body[field]);

      if (
        !Number.isFinite(value) ||
        value < 0 ||
        (field === "weightKg" && value === 0) ||
        (field === "bodyFatPercentage" && value > 100) ||
        (field === "weightKg" && value > 500)
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid value for ${field}`,
        });
      }

      updates[field] = value;
    }

    if (req.body.notes !== undefined) {
      if (typeof req.body.notes !== "string") {
        return res.status(400).json({
          success: false,
          message: "notes must be a string",
        });
      }

      updates.notes = req.body.notes.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields supplied for update",
      });
    }

    const measurement = await BodyMeasurement.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!measurement) {
      return res.status(404).json({
        success: false,
        message: "Measurement not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Measurement updated",
      data: measurement,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update measurement",
      error: errorMessage(error),
    });
  }
}

// DELETE /api/body-measurements/:id
export async function deleteMeasurement(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid measurement ID",
      });
    }

    const measurement = await BodyMeasurement.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!measurement) {
      return res.status(404).json({
        success: false,
        message: "Measurement not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Measurement deleted",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete measurement",
      error: errorMessage(error),
    });
  }
}
