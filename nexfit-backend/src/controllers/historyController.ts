import { Request, Response } from "express";
import mongoose from "mongoose";
import WorkoutSession from "../models/WorkoutSession";
import NutritionLog from "../models/NutritionLog";
import WaterLog from "../models/WaterLog";
import BodyMeasurement from "../models/BodyMeasurement";

interface AuthRequest extends Request {
  userId?: string;
}

function getUserId(req: AuthRequest): string | null {
  return req.userId && mongoose.isValidObjectId(req.userId) ? req.userId : null;
}

function dateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

// GET /api/history?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&page=1&limit=15
export async function getHistoryRange(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const startParam = req.query.startDate || req.query.from;
    const endParam = req.query.endDate || req.query.to;

    const startDate = startParam ? parseDate(startParam) : null;
    const endDate = endParam ? parseDate(endParam) : null;

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 15));

    // Date filters
    const sessionFilter: Record<string, unknown> = { userId };
    const nutritionFilter: Record<string, unknown> = { userId };
    const waterFilter: Record<string, unknown> = { userId };

    if (startDate || endDate) {
      const range: Record<string, Date> = {};
      if (startDate) range.$gte = startDate;
      if (endDate) {
        const next = new Date(endDate);
        next.setUTCDate(next.getUTCDate() + 1);
        range.$lt = next;
      }
      sessionFilter.workoutDate = range;
      nutritionFilter.logDate = range;
      waterFilter.logDate = range;
    }

    // Collect all distinct dates with activity
    const [sessions, nutritionLogs, waterLogs] = await Promise.all([
      WorkoutSession.find(sessionFilter).select("workoutDate").lean(),
      NutritionLog.find(nutritionFilter).select("logDate").lean(),
      WaterLog.find(waterFilter).select("logDate").lean(),
    ]);

    const dateSet = new Set<string>();
    for (const s of sessions) {
      if (s.workoutDate) dateSet.add(dateString(new Date(s.workoutDate)));
    }
    for (const n of nutritionLogs) {
      if (n.logDate) dateSet.add(dateString(new Date(n.logDate)));
    }
    for (const w of waterLogs) {
      if (w.logDate) dateSet.add(dateString(new Date(w.logDate)));
    }

    // Sort dates descending
    const allDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));
    const total = allDates.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const pageDates = allDates.slice((page - 1) * limit, page * limit);

    if (pageDates.length === 0) {
      res.status(200).json({
        success: true,
        data: [],
        history: [],
        pagination: { page, limit, total, totalPages },
      });
      return;
    }

    // For the current page of dates, load full details
    const earliest = new Date(`${pageDates[pageDates.length - 1]}T00:00:00.000Z`);
    const latestExclusive = new Date(`${pageDates[0]}T00:00:00.000Z`);
    latestExclusive.setUTCDate(latestExclusive.getUTCDate() + 1);

    const [fullSessions, fullNutrition, fullWater] = await Promise.all([
      WorkoutSession.find({
        userId,
        workoutDate: { $gte: earliest, $lt: latestExclusive },
      }).sort({ workoutDate: -1, createdAt: -1 }).lean(),

      NutritionLog.find({
        userId,
        logDate: { $gte: earliest, $lt: latestExclusive },
      }).lean(),

      WaterLog.find({
        userId,
        logDate: { $gte: earliest, $lt: latestExclusive },
      }).lean(),
    ]);

    const dayActivities = pageDates.map((dateStr) => {
      const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

      const daySessions = fullSessions.filter((s) => {
        const d = new Date(s.workoutDate);
        return d >= dayStart && d < dayEnd;
      });

      const dayNutrition = fullNutrition.find((n) => {
        const d = new Date(n.logDate);
        return d >= dayStart && d < dayEnd;
      });

      const dayWater = fullWater.find((w) => {
        const d = new Date(w.logDate);
        return d >= dayStart && d < dayEnd;
      });

      // Nutrition totals
      const nutritionTotals = (dayNutrition?.meals || []).reduce(
        (acc, meal) => {
          for (const f of meal.foods || []) {
            acc.calories += f.calories || 0;
            acc.protein += f.protein || 0;
            acc.carbs += f.carbs || 0;
            acc.fats += f.fats || 0;
          }
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      );

      // Workout totals
      const totalMinutes = daySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      const caloriesBurned = daySessions.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0);
      const exercisesCount = daySessions.reduce((sum, s) => sum + (s.exercises?.length || 0), 0);
      const setsCount = daySessions.reduce(
        (sum, s) =>
          sum +
          (s.exercises || []).reduce(
            (eSum, e) => eSum + (e.sets || []).filter((st) => st.completed).length,
            0
          ),
        0
      );

      // Status
      let workoutStatus: "not_started" | "in_progress" | "completed" = "not_started";
      if (daySessions.some((s) => s.status === "completed")) {
        workoutStatus = "completed";
      } else if (daySessions.some((s) => s.status === "in_progress")) {
        workoutStatus = "in_progress";
      } else if (daySessions.length > 0) {
        workoutStatus = "completed";
      }

      const waterConsumedMl = (dayWater?.entries || []).reduce(
        (sum, e) => sum + (e.amountMl || 0),
        0
      );

      return {
        date: dateStr,
        hasWorkout: daySessions.length > 0,
        hasNutrition: Boolean(dayNutrition && (dayNutrition.meals?.length || 0) > 0),
        workout: {
          sessionsCount: daySessions.length,
          status: workoutStatus,
          durationMinutes: totalMinutes,
          caloriesBurned,
          exercisesCount,
          setsCount,
          sessions: daySessions,
        },
        nutrition: {
          consumed: nutritionTotals,
          targets: dayNutrition?.dailyTargets,
          mealsCount: dayNutrition?.meals?.length || 0,
          foodsCount: (dayNutrition?.meals || []).reduce((acc, m) => acc + (m.foods?.length || 0), 0),
          meals: dayNutrition?.meals || [],
        },
        hydration: {
          consumedMl: waterConsumedMl,
          targetMl: dayWater?.dailyTargetMl ?? 2500,
        },
      };
    });

    res.status(200).json({
      success: true,
      data: dayActivities,
      history: dayActivities,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Get history range error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve history",
    });
  }
}

// GET /api/history/monthly?month=11&year=2026 OR ?month=2026-11
export async function getMonthlyHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    let year: number;
    let monthNum: number;

    const monthParam = req.query.month;
    const yearParam = req.query.year;

    if (typeof monthParam === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam)) {
      const parts = monthParam.split("-").map(Number);
      year = parts[0];
      monthNum = parts[1];
    } else {
      const now = new Date();
      year = yearParam ? Number(yearParam) : now.getUTCFullYear();
      monthNum = monthParam ? Number(monthParam) : now.getUTCMonth() + 1;
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      year = new Date().getUTCFullYear();
    }
    if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
      monthNum = new Date().getUTCMonth() + 1;
    }

    const start = new Date(Date.UTC(year, monthNum - 1, 1));
    const end = new Date(Date.UTC(year, monthNum, 1));

    // Also get all distinct months the user has activity for
    const [allSessions, allNutrition, monthSessions, monthNutrition, monthWater] =
      await Promise.all([
        WorkoutSession.find({ userId }).select("workoutDate").lean(),
        NutritionLog.find({ userId }).select("logDate").lean(),
        WorkoutSession.find({
          userId,
          workoutDate: { $gte: start, $lt: end },
        }).sort({ workoutDate: 1 }).lean(),
        NutritionLog.find({
          userId,
          logDate: { $gte: start, $lt: end },
        }).lean(),
        WaterLog.find({
          userId,
          logDate: { $gte: start, $lt: end },
        }).lean(),
      ]);

    // Available months list
    const monthSet = new Set<string>();
    const currentMonthKey = `${year}-${String(monthNum).padStart(2, "0")}`;
    monthSet.add(currentMonthKey);

    for (const s of allSessions) {
      if (s.workoutDate) monthSet.add(dateString(new Date(s.workoutDate)).slice(0, 7));
    }
    for (const n of allNutrition) {
      if (n.logDate) monthSet.add(dateString(new Date(n.logDate)).slice(0, 7));
    }
    const availableMonths = Array.from(monthSet).sort((a, b) => b.localeCompare(a));

    // Build day-by-day map for every day of the month
    const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
    const daysList: any[] = [];

    let totalWorkoutDays = 0;
    let totalDurationMinutes = 0;
    let totalCaloriesBurned = 0;
    let totalCaloriesConsumed = 0;
    let activeDaysCount = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(Date.UTC(year, monthNum - 1, day));
      const dayStr = dateString(dayDate);
      const nextDay = new Date(dayDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);

      const daySessions = monthSessions.filter((s) => {
        const d = new Date(s.workoutDate);
        return d >= dayDate && d < nextDay;
      });

      const dayNutrition = monthNutrition.find((n) => {
        const d = new Date(n.logDate);
        return d >= dayDate && d < nextDay;
      });

      const dayWater = monthWater.find((w) => {
        const d = new Date(w.logDate);
        return d >= dayDate && d < nextDay;
      });

      const nutritionTotals = (dayNutrition?.meals || []).reduce(
        (acc, meal) => {
          for (const f of meal.foods || []) {
            acc.calories += f.calories || 0;
            acc.protein += f.protein || 0;
            acc.carbs += f.carbs || 0;
            acc.fats += f.fats || 0;
          }
          return acc;
        },
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      );

      const dayMinutes = daySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
      const dayBurned = daySessions.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0);
      const waterConsumedMl = (dayWater?.entries || []).reduce((sum, e) => sum + (e.amountMl || 0), 0);

      const hasWorkout = daySessions.length > 0;
      const hasNutrition = Boolean(dayNutrition && (dayNutrition.meals?.length || 0) > 0);
      const hasWater = waterConsumedMl > 0;

      if (hasWorkout) {
        totalWorkoutDays += 1;
        totalDurationMinutes += dayMinutes;
        totalCaloriesBurned += dayBurned;
      }
      if (hasNutrition) {
        totalCaloriesConsumed += nutritionTotals.calories;
      }
      if (hasWorkout || hasNutrition || hasWater) {
        activeDaysCount += 1;
      }

      daysList.push({
        date: dayStr,
        dayNumber: day,
        hasWorkout,
        hasNutrition,
        hasWater,
        active: hasWorkout || hasNutrition || hasWater,
        workout: {
          sessionsCount: daySessions.length,
          durationMinutes: dayMinutes,
          caloriesBurned: dayBurned,
          status: daySessions.some((s) => s.status === "completed") ? "completed" : daySessions.length > 0 ? "in_progress" : "none",
          sessions: daySessions,
        },
        nutrition: {
          consumed: nutritionTotals,
          targets: dayNutrition?.dailyTargets,
          mealsCount: dayNutrition?.meals?.length || 0,
          foodsCount: (dayNutrition?.meals || []).reduce((acc, m) => acc + (m.foods?.length || 0), 0),
        },
        hydration: {
          consumedMl: waterConsumedMl,
          targetMl: dayWater?.dailyTargetMl ?? 2500,
        },
      });
    }

    res.status(200).json({
      success: true,
      year,
      month: monthNum,
      days: daysList,
      monthlyTotals: {
        totalWorkouts: totalWorkoutDays,
        totalWorkoutMinutes: totalDurationMinutes,
        totalCaloriesBurned,
        totalCaloriesConsumed,
        activeDaysCount,
      },
      data: {
        year,
        month: monthNum,
        monthString: currentMonthKey,
        availableMonths,
        totals: {
          totalDays: daysInMonth,
          activeDaysCount,
          totalWorkoutDays,
          totalDurationMinutes,
          totalCaloriesBurned,
          totalCaloriesConsumed,
          averageDailyCalories: activeDaysCount > 0 ? Math.round(totalCaloriesConsumed / activeDaysCount) : 0,
        },
        days: daysList,
      },
    });
  } catch (error) {
    console.error("Get monthly history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve monthly history",
    });
  }
}

// GET /api/history/date/:date
export async function getDayHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { date } = req.params;
    const parsedDate = parseDate(date);

    if (!parsedDate) {
      res.status(400).json({ success: false, message: "date must use YYYY-MM-DD format" });
      return;
    }

    const nextDay = new Date(parsedDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const [sessions, nutrition, water, measurement] = await Promise.all([
      WorkoutSession.find({
        userId,
        workoutDate: { $gte: parsedDate, $lt: nextDay },
      }).sort({ workoutDate: 1, createdAt: 1 }).lean(),

      NutritionLog.findOne({
        userId,
        logDate: { $gte: parsedDate, $lt: nextDay },
      }).lean(),

      WaterLog.findOne({
        userId,
        logDate: { $gte: parsedDate, $lt: nextDay },
      }).lean(),

      BodyMeasurement.findOne({
        userId,
        measuredAt: { $gte: parsedDate, $lt: nextDay },
      }).lean(),
    ]);

    const nutritionTotals = (nutrition?.meals || []).reduce(
      (acc, meal) => {
        for (const f of meal.foods || []) {
          acc.calories += f.calories || 0;
          acc.protein += f.protein || 0;
          acc.carbs += f.carbs || 0;
          acc.fats += f.fats || 0;
          acc.fiber += f.fiber || 0;
        }
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0 }
    );

    const waterConsumedMl = (water?.entries || []).reduce(
      (sum, e) => sum + (e.amountMl || 0),
      0
    );

    res.status(200).json({
      success: true,
      date,
      workoutSessions: sessions,
      nutrition: {
        consumed: nutritionTotals,
        meals: nutrition?.meals || [],
      },
      data: {
        date,
        workout: {
          sessionsCount: sessions.length,
          sessions,
          totalDurationMinutes: sessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0),
          totalCaloriesBurned: sessions.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0),
        },
        nutrition: {
          consumed: nutritionTotals,
          targets: nutrition?.dailyTargets ?? {
            calories: 2000,
            protein: 100,
            carbs: 250,
            fats: 65,
            fiber: 25,
          },
          meals: nutrition?.meals || [],
        },
        hydration: {
          consumedMl: waterConsumedMl,
          targetMl: water?.dailyTargetMl ?? 2500,
          entries: water?.entries || [],
        },
        measurement,
      },
    });
  } catch (error) {
    console.error("Get day history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve day history",
    });
  }
}
