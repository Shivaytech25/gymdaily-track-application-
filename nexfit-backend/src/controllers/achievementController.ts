
import { Request, Response } from "express";
import mongoose from "mongoose";
import WorkoutSession from "../models/WorkoutSession";
import UserAchievement from "../models/UserAchievement";

function getUserId(req: Request): string | null {
  const userId = (req as Request & { userId?: string }).userId;

  return userId && mongoose.Types.ObjectId.isValid(userId)
    ? userId
    : null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getStreaks(dates: string[]) {
  const uniqueDates = [...new Set(dates)].sort().reverse();

  if (uniqueDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const today = dateKey(new Date());
  const yesterday = dateKey(new Date(Date.now() - dayMs));

  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;
  let previousDate: string | null = null;

  for (const currentDate of uniqueDates) {
    if (previousDate === null) {
      runningStreak = 1;
    } else {
      const difference =
        (Date.parse(`${previousDate}T00:00:00.000Z`) -
          Date.parse(`${currentDate}T00:00:00.000Z`)) /
        dayMs;

      runningStreak = difference === 1 ? runningStreak + 1 : 1;
    }

    longestStreak = Math.max(longestStreak, runningStreak);
    previousDate = currentDate;
  }

  if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
    currentStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const previous = Date.parse(`${uniqueDates[i - 1]}T00:00:00.000Z`);
      const current = Date.parse(`${uniqueDates[i]}T00:00:00.000Z`);

      if ((previous - current) / dayMs !== 1) break;

      currentStreak++;
    }
  }

  return { currentStreak, longestStreak };
}

function calculatePersonalRecords(sessions: Array<{
  exercises: Array<{
    exerciseName: string;
    sets: Array<{
      weightKg: number;
      reps: number;
      completed: boolean;
    }>;
  }>;
}>) {
  const records: Record<
    string,
    { exerciseName: string; weightKg: number; reps: number }
  > = {};

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      for (const set of exercise.sets) {
        if (!set.completed) continue;

        const key = exercise.exerciseName.trim().toLowerCase();
        const existing = records[key];

        if (!existing || set.weightKg > existing.weightKg) {
          records[key] = {
            exerciseName: exercise.exerciseName,
            weightKg: set.weightKg,
            reps: set.reps,
          };
        }
      }
    }
  }

  return Object.values(records).sort((a, b) =>
    a.exerciseName.localeCompare(b.exerciseName)
  );
}

const ACHIEVEMENTS = [
  {
    code: "first_workout",
    title: "First Step",
    description: "Complete your first workout",
    category: "workout",
    threshold: 1,
  },
  {
    code: "workouts_10",
    title: "Getting Stronger",
    description: "Complete 10 workouts",
    category: "workout",
    threshold: 10,
  },
  {
    code: "workouts_50",
    title: "Fitness Enthusiast",
    description: "Complete 50 workouts",
    category: "workout",
    threshold: 50,
  },
  {
    code: "workouts_100",
    title: "Century Club",
    description: "Complete 100 workouts",
    category: "workout",
    threshold: 100,
  },
  {
    code: "streak_3",
    title: "Consistency Begins",
    description: "Maintain a 3-day workout streak",
    category: "streak",
    threshold: 3,
  },
  {
    code: "streak_7",
    title: "One Week Strong",
    description: "Maintain a 7-day workout streak",
    category: "streak",
    threshold: 7,
  },
  {
    code: "streak_30",
    title: "Unstoppable",
    description: "Maintain a 30-day workout streak",
    category: "streak",
    threshold: 30,
  },
] as const;

// GET /api/achievements/dashboard
export async function getAchievementDashboard(
  req: Request,
  res: Response
) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const sessions = await WorkoutSession.find({ userId })
      .sort({ workoutDate: -1 })
      .lean();

    // Every session counts as a workout. Multiple sessions on one
    // calendar day count separately for total workouts, but once for streaks.
    const workoutDates = sessions.map((session) =>
      dateKey(new Date(session.workoutDate))
    );

    const totalWorkouts = sessions.length;
    const { currentStreak, longestStreak } = getStreaks(workoutDates);
    const personalRecords = calculatePersonalRecords(sessions);

    const metrics = {
      totalWorkouts,
      currentStreak,
      longestStreak,
    };

    const achievementDefinitions = ACHIEVEMENTS.map((achievement) => {
      const progress =
        achievement.category === "streak"
          ? longestStreak
          : totalWorkouts;

      return {
        ...achievement,
        progress: Math.min(progress, achievement.threshold),
        unlocked: progress >= achievement.threshold,
      };
    });

    // Upsert each achievement without deleting existing user data.
    await Promise.all(
      achievementDefinitions.map((achievement) =>
        UserAchievement.findOneAndUpdate(
          { userId, code: achievement.code },
          {
            $set: {
              title: achievement.title,
              description: achievement.description,
              category: achievement.category,
              threshold: achievement.threshold,
              progress: achievement.progress,
              unlocked: achievement.unlocked,
              ...(achievement.unlocked
                ? { unlockedAt: new Date() }
                : {}),
            },
            $setOnInsert: { userId, code: achievement.code },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        )
      )
    );

    const achievements = await UserAchievement.find({ userId })
      .sort({ unlocked: -1, threshold: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        metrics,
        personalRecords,
        achievements,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to calculate achievements",
      error: getErrorMessage(error),
    });
  }
}

// GET /api/achievements
export async function getAchievements(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const achievements = await UserAchievement.find({ userId })
      .sort({ unlocked: -1, threshold: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: achievements,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch achievements",
      error: getErrorMessage(error),
    });
  }
}

// GET /api/achievements/stats
export async function getWorkoutStats(req: Request, res: Response) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const sessions = await WorkoutSession.find({ userId })
      .sort({ workoutDate: -1 })
      .lean();

    const dates = sessions.map((session) =>
      dateKey(new Date(session.workoutDate))
    );

    const { currentStreak, longestStreak } = getStreaks(dates);

    const totalDurationMinutes = sessions.reduce(
      (total, session) => total + (session.durationMinutes || 0),
      0
    );

    const totalCaloriesBurned = sessions.reduce(
      (total, session) => total + (session.caloriesBurned || 0),
      0
    );

    const totalCompletedSets = sessions.reduce(
      (total, session) =>
        total +
        session.exercises.reduce(
          (exerciseTotal, exercise) =>
            exerciseTotal +
            exercise.sets.filter((set) => set.completed).length,
          0
        ),
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        totalWorkouts: sessions.length,
        currentStreak,
        longestStreak,
        totalDurationMinutes,
        totalCaloriesBurned,
        totalCompletedSets,
        personalRecords: calculatePersonalRecords(sessions),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to calculate workout stats",
      error: getErrorMessage(error),
    });
  }
}
