
import { Request, Response } from "express";
import mongoose from "mongoose";
import WorkoutSession from "../models/WorkoutSession";

function getUserId(req: Request): string | null {
  const userId = (req as Request & { userId?: string }).userId;
  return userId && mongoose.Types.ObjectId.isValid(userId)
    ? userId
    : null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

// GET /api/workout-history/calendar?month=2026-10
export async function getWorkoutCalendar(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const month = req.query.month;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({
        success: false,
        message: "month must use YYYY-MM format",
      });
    }

    const [year, monthNumber] = month.split("-").map(Number);
    const start = new Date(Date.UTC(year, monthNumber - 1, 1));
    const end = new Date(Date.UTC(year, monthNumber, 1));

    const sessions = await WorkoutSession.find({
      userId,
      workoutDate: { $gte: start, $lt: end },
    })
      .sort({ workoutDate: 1 })
      .lean();

    const grouped = new Map<
      string,
      { date: string; sessionCount: number; durationMinutes: number; caloriesBurned: number }
    >();

    for (const session of sessions) {
      const date = dayKey(new Date(session.workoutDate));
      const existing = grouped.get(date) ?? {
        date,
        sessionCount: 0,
        durationMinutes: 0,
        caloriesBurned: 0,
      };

      existing.sessionCount += 1;
      existing.durationMinutes += session.durationMinutes || 0;
      existing.caloriesBurned += session.caloriesBurned || 0;
      grouped.set(date, existing);
    }

    return res.status(200).json({
      success: true,
      data: {
        month,
        workoutDays: Array.from(grouped.values()),
        totalSessions: sessions.length,
        totalWorkoutDays: grouped.size,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to load workout calendar",
      error: errorMessage(error),
    });
  }
}

// GET /api/workout-history/date/YYYY-MM-DD
export async function getWorkoutsByDate(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const date = parseDate(req.params.date);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date must use YYYY-MM-DD format",
      });
    }

    const nextDay = new Date(date);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const sessions = await WorkoutSession.find({
      userId,
      workoutDate: { $gte: date, $lt: nextDay },
    })
      .sort({ workoutDate: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        date: dayKey(date),
        totalSessions: sessions.length,
        sessions,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch workouts for date",
      error: errorMessage(error),
    });
  }
}

// GET /api/workout-history?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=20
export async function getWorkoutHistory(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const from = req.query.from ? parseDate(req.query.from) : null;
    const to = req.query.to ? parseDate(req.query.to) : null;

    if (req.query.from && !from) {
      return res.status(400).json({
        success: false,
        message: "from must use YYYY-MM-DD format",
      });
    }

    if (req.query.to && !to) {
      return res.status(400).json({
        success: false,
        message: "to must use YYYY-MM-DD format",
      });
    }

    if (from && to && from > to) {
      return res.status(400).json({
        success: false,
        message: "from must be earlier than or equal to to",
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

    const filter: Record<string, unknown> = { userId };

    if (from || to) {
      const range: Record<string, Date> = {};
      if (from) range.$gte = from;
      if (to) {
        const exclusiveEnd = new Date(to);
        exclusiveEnd.setUTCDate(exclusiveEnd.getUTCDate() + 1);
        range.$lt = exclusiveEnd;
      }
      filter.workoutDate = range;
    }

    const [sessions, total] = await Promise.all([
      WorkoutSession.find(filter)
        .sort({ workoutDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      WorkoutSession.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: sessions,
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
      message: "Failed to fetch workout history",
      error: errorMessage(error),
    });
  }
}
