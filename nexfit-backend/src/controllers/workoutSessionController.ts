
import { Request, Response } from "express";
import mongoose from "mongoose";
import WorkoutSession from "../models/WorkoutSession";

interface AuthRequest extends Request {
  userId?: string;
}

const isValidDate = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));

const isValidExercises = (exercises: unknown): boolean => {
  if (!Array.isArray(exercises) || exercises.length === 0) return false;

  return exercises.every((exercise) => {
    if (
      !exercise ||
      typeof exercise.exerciseName !== "string" ||
      !exercise.exerciseName.trim() ||
      typeof exercise.machineName !== "string" ||
      !exercise.machineName.trim() ||
      !Array.isArray(exercise.sets)
    ) {
      return false;
    }

    return exercise.sets.every((set: Record<string, unknown>) =>
      Number.isInteger(set.setNumber) &&
      Number(set.setNumber) >= 1 &&
      typeof set.weightKg === "number" &&
      Number.isFinite(set.weightKg) &&
      set.weightKg >= 0 &&
      Number.isInteger(set.reps) &&
      Number(set.reps) >= 0 &&
      (set.completed === undefined || typeof set.completed === "boolean") &&
      (set.restSeconds === undefined ||
        (typeof set.restSeconds === "number" &&
          Number.isFinite(set.restSeconds) &&
          set.restSeconds >= 0))
    );
  });
};

const validNonNegativeNumber = (value: unknown): boolean =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

// POST /api/workout-sessions
export const createWorkoutSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      workoutDate,
      title,
      exercises,
      durationMinutes,
      caloriesBurned,
      notes,
    } = req.body;

    if (!req.userId || !mongoose.isValidObjectId(req.userId)) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!isValidDate(workoutDate)) {
      res.status(400).json({
        success: false,
        message: "workoutDate must be a valid date",
      });
      return;
    }

    if (!isValidExercises(exercises)) {
      res.status(400).json({
        success: false,
        message: "Provide at least one valid exercise with valid sets",
      });
      return;
    }

    if (
      durationMinutes !== undefined &&
      !validNonNegativeNumber(durationMinutes)
    ) {
      res.status(400).json({
        success: false,
        message: "durationMinutes must be a non-negative number",
      });
      return;
    }

    if (
      caloriesBurned !== undefined &&
      !validNonNegativeNumber(caloriesBurned)
    ) {
      res.status(400).json({
        success: false,
        message: "caloriesBurned must be a non-negative number",
      });
      return;
    }

    const session = await WorkoutSession.create({
      userId: req.userId,
      workoutDate: new Date(workoutDate),
      title:
        typeof title === "string" && title.trim()
          ? title.trim()
          : "Workout Session",
      exercises,
      durationMinutes: durationMinutes ?? 0,
      ...(caloriesBurned !== undefined ? { caloriesBurned } : {}),
      ...(typeof notes === "string" ? { notes: notes.trim() } : {}),
    });

    res.status(201).json({
      success: true,
      message: "Workout session saved successfully",
      session,
    });
  } catch (error) {
    console.error("Create workout session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save workout session",
    });
  }
};

// GET /api/workout-sessions?year=2026&month=10
export const getWorkoutSessions = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { year, month } = req.query;
    const filter: Record<string, unknown> = { userId: req.userId };

    if (year !== undefined || month !== undefined) {
      const parsedYear = Number(year);
      const parsedMonth = Number(month);

      if (
        !Number.isInteger(parsedYear) ||
        !Number.isInteger(parsedMonth) ||
        parsedYear < 2000 ||
        parsedYear > 2100 ||
        parsedMonth < 1 ||
        parsedMonth > 12
      ) {
        res.status(400).json({
          success: false,
          message: "Provide a valid year and month (month: 1-12)",
        });
        return;
      }

      filter.workoutDate = {
        $gte: new Date(parsedYear, parsedMonth - 1, 1),
        $lt: new Date(parsedYear, parsedMonth, 1),
      };
    }

    const sessions = await WorkoutSession.find(filter).sort({
      workoutDate: -1,
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    console.error("Get workout sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve workout sessions",
    });
  }
};

// GET /api/workout-sessions/date/2026-10-18
export const getWorkoutSessionsByDate = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const date = req.params.date;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({
        success: false,
        message: "Date must use YYYY-MM-DD format",
      });
      return;
    }

    const [year, month, day] = date.split("-").map(Number);
    const start = new Date(year, month - 1, day);
    const end = new Date(year, month - 1, day + 1);

    if (
      start.getFullYear() !== year ||
      start.getMonth() !== month - 1 ||
      start.getDate() !== day
    ) {
      res.status(400).json({ success: false, message: "Invalid calendar date" });
      return;
    }

    const sessions = await WorkoutSession.find({
      userId: req.userId,
      workoutDate: { $gte: start, $lt: end },
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      date,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    console.error("Get sessions by date error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve sessions for this date",
    });
  }
};

// PATCH /api/workout-sessions/:id
export const updateWorkoutSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid session ID" });
      return;
    }

    const allowedFields = [
      "workoutDate",
      "title",
      "exercises",
      "durationMinutes",
      "caloriesBurned",
      "notes",
    ];

    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
      return;
    }

    if (
      updates.workoutDate !== undefined &&
      !isValidDate(updates.workoutDate)
    ) {
      res.status(400).json({ success: false, message: "Invalid workoutDate" });
      return;
    }

    if (
      updates.exercises !== undefined &&
      !isValidExercises(updates.exercises)
    ) {
      res.status(400).json({ success: false, message: "Invalid exercises or sets" });
      return;
    }

    for (const field of ["durationMinutes", "caloriesBurned"] as const) {
      if (
        updates[field] !== undefined &&
        !validNonNegativeNumber(updates[field])
      ) {
        res.status(400).json({
          success: false,
          message: `${field} must be a non-negative number`,
        });
        return;
      }
    }

    if (updates.workoutDate) {
      updates.workoutDate = new Date(String(updates.workoutDate));
    }

    const session = await WorkoutSession.findOneAndUpdate(
      { _id: id, userId: req.userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!session) {
      res.status(404).json({
        success: false,
        message: "Workout session not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Workout session updated successfully",
      session,
    });
  } catch (error) {
    console.error("Update workout session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update workout session",
    });
  }
};

// DELETE /api/workout-sessions/:id
export const deleteWorkoutSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Invalid session ID" });
      return;
    }

    const session = await WorkoutSession.findOneAndDelete({
      _id: id,
      userId: req.userId,
    });

    if (!session) {
      res.status(404).json({
        success: false,
        message: "Workout session not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Workout session deleted successfully",
    });
  } catch (error) {
    console.error("Delete workout session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete workout session",
    });
  }
};
