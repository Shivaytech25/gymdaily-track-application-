
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

    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
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

function getUtcDayBounds(dateStr?: string): { start: Date; end: Date; dateObj: Date } {
  let dateObj: Date;
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split("-").map(Number);
    dateObj = new Date(Date.UTC(y, m - 1, d));
  } else if (dateStr && !Number.isNaN(Date.parse(dateStr))) {
    const parsed = new Date(dateStr);
    dateObj = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
  } else {
    const now = new Date();
    dateObj = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  const start = new Date(dateObj);
  const end = new Date(dateObj);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end, dateObj };
}

// POST /api/workout-sessions/start OR /api/workouts/start
export const startWorkoutSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId || !mongoose.isValidObjectId(req.userId)) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { workoutDate, title } = req.body;
    const { start, end, dateObj } = getUtcDayBounds(workoutDate);

    // Look for existing session today
    let session = await WorkoutSession.findOne({
      userId: req.userId,
      workoutDate: { $gte: start, $lt: end },
    });

    if (!session) {
      session = await WorkoutSession.create({
        userId: req.userId,
        workoutDate: dateObj,
        title: typeof title === "string" && title.trim() ? title.trim() : "Workout Session",
        status: "in_progress",
        startedAt: new Date(),
        exercises: [],
        durationMinutes: 0,
        caloriesBurned: 0,
      });
    } else if (session.status === "completed") {
      res.status(200).json({
        success: true,
        message: "Workout session already completed for this date",
        alreadyCompleted: true,
        session,
      });
      return;
    } else {
      session.status = "in_progress";
      if (!session.startedAt) session.startedAt = new Date();
      await session.save();
    }

    res.status(200).json({
      success: true,
      message: "Workout session active",
      session,
    });
  } catch (error) {
    console.error("Start workout session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start workout session",
    });
  }
};

// POST /api/workout-sessions/complete-exercise OR /api/workouts/complete-exercise
export const completeExercise = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId || !mongoose.isValidObjectId(req.userId)) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const {
      workoutDate,
      sessionId,
      exerciseId,
      exerciseName,
      category,
      machineName,
      equipmentType,
      sets,
      reps,
      weight,
      weightKg,
      duration,
      durationSeconds,
      caloriesBurned,
      notes,
    } = req.body;

    if (!exerciseName || typeof exerciseName !== "string" || !exerciseName.trim()) {
      res.status(400).json({
        success: false,
        message: "exerciseName is required",
      });
      return;
    }

    const { start, end, dateObj } = getUtcDayBounds(workoutDate);

    let session: any = null;
    if (sessionId && mongoose.isValidObjectId(sessionId)) {
      session = await WorkoutSession.findOne({ _id: sessionId, userId: req.userId });
    }

    if (!session) {
      session = await WorkoutSession.findOne({
        userId: req.userId,
        workoutDate: { $gte: start, $lt: end },
      });
    }

    if (!session) {
      session = new WorkoutSession({
        userId: req.userId,
        workoutDate: dateObj,
        title: "Workout Session",
        status: "in_progress",
        startedAt: new Date(),
        exercises: [],
        durationMinutes: 0,
        caloriesBurned: 0,
      });
    }

    // Construct valid sets array
    let preparedSets: Array<{
      setNumber: number;
      weightKg: number;
      reps: number;
      completed: boolean;
      restSeconds?: number;
    }> = [];

    if (Array.isArray(sets) && sets.length > 0) {
      preparedSets = sets.map((s, idx) => ({
        setNumber: typeof s.setNumber === "number" ? s.setNumber : idx + 1,
        weightKg: typeof s.weightKg === "number" ? s.weightKg : typeof weight === "number" ? weight : typeof weightKg === "number" ? weightKg : 0,
        reps: typeof s.reps === "number" ? s.reps : typeof reps === "number" ? reps : 10,
        completed: s.completed !== undefined ? Boolean(s.completed) : true,
        restSeconds: typeof s.restSeconds === "number" ? s.restSeconds : 60,
      }));
    } else {
      const setCount = typeof sets === "number" && sets > 0 ? sets : 1;
      const singleReps = typeof reps === "number" ? reps : 10;
      const singleWeight = typeof weight === "number" ? weight : typeof weightKg === "number" ? weightKg : 0;
      for (let i = 1; i <= setCount; i++) {
        preparedSets.push({
          setNumber: i,
          weightKg: singleWeight,
          reps: singleReps,
          completed: true,
          restSeconds: 60,
        });
      }
    }

    const totalReps = preparedSets.reduce((sum, s) => sum + (s.completed ? s.reps : 0), 0);
    const exerciseDurationSec = typeof durationSeconds === "number"
      ? durationSeconds
      : typeof duration === "number"
      ? duration * 60
      : preparedSets.length * 90;

    // Reliable calorie calculation: ~6-8 kcal per min of resistance training or MET formula
    const calculatedCalories = typeof caloriesBurned === "number" && caloriesBurned > 0
      ? caloriesBurned
      : Math.max(3, Math.round((exerciseDurationSec / 60) * 6.5 + totalReps * 0.2));

    const cleanExId = typeof exerciseId === "string" ? exerciseId.trim() : undefined;
    const cleanName = exerciseName.trim();

    // Check if exercise is already present in session
    const existingIndex = session.exercises.findIndex((ex: any) =>
      (cleanExId && ex.exerciseId === cleanExId) ||
      ex.exerciseName.toLowerCase() === cleanName.toLowerCase()
    );

    const exerciseData = {
      exerciseId: cleanExId,
      exerciseName: cleanName,
      category: typeof category === "string" ? category.trim() : undefined,
      machineName: typeof machineName === "string" ? machineName.trim() : cleanName,
      equipmentType: typeof equipmentType === "string" ? equipmentType.trim() : "Standard",
      durationSeconds: exerciseDurationSec,
      caloriesBurned: calculatedCalories,
      completedAt: new Date(),
      sets: preparedSets,
      notes: typeof notes === "string" ? notes.trim() : undefined,
    };

    if (existingIndex >= 0) {
      session.exercises[existingIndex] = exerciseData;
    } else {
      session.exercises.push(exerciseData);
    }

    // Recalculate duration & calories
    const totalSecs = session.exercises.reduce((acc: number, ex: any) => acc + (ex.durationSeconds || 0), 0);
    session.durationMinutes = Math.max(1, Math.round(totalSecs / 60));
    session.caloriesBurned = session.exercises.reduce((acc: number, ex: any) => acc + (ex.caloriesBurned || 0), 0);

    await session.save();

    res.status(200).json({
      success: true,
      message: "Exercise completed and synchronized with session",
      session,
      exercise: exerciseData,
    });
  } catch (error) {
    console.error("Complete exercise error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to record completed exercise",
    });
  }
};

// POST /api/workout-sessions/complete-session OR /api/workouts/complete-session
export const completeSession = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.userId || !mongoose.isValidObjectId(req.userId)) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { sessionId, workoutDate, durationMinutes, caloriesBurned, notes } = req.body;
    const { start, end, dateObj } = getUtcDayBounds(workoutDate);

    let session: any = null;
    if (sessionId && mongoose.isValidObjectId(sessionId)) {
      session = await WorkoutSession.findOne({ _id: sessionId, userId: req.userId });
    }

    if (!session) {
      session = await WorkoutSession.findOne({
        userId: req.userId,
        workoutDate: { $gte: start, $lt: end },
      }).sort({ createdAt: -1 });
    }

    if (!session) {
      session = new WorkoutSession({
        userId: req.userId,
        workoutDate: dateObj,
        title: "Workout Session",
        exercises: [],
      });
    }

    session.status = "completed";
    session.completedAt = new Date();
    if (!session.startedAt) {
      session.startedAt = new Date(Date.now() - (Number(durationMinutes) || 30) * 60 * 1000);
    }

    if (typeof durationMinutes === "number" && durationMinutes > 0) {
      session.durationMinutes = durationMinutes;
    } else if (session.durationMinutes <= 0) {
      session.durationMinutes = Math.max(1, Math.round((Date.now() - session.startedAt.getTime()) / 60000));
    }

    if (typeof caloriesBurned === "number" && caloriesBurned > 0) {
      session.caloriesBurned = caloriesBurned;
    } else if (!session.caloriesBurned || session.caloriesBurned <= 0) {
      session.caloriesBurned = Math.round(session.durationMinutes * 7.5);
    }

    if (typeof notes === "string") {
      session.notes = notes.trim();
    }

    // Mark all sets as completed
    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        set.completed = true;
      }
    }

    await session.save();

    res.status(200).json({
      success: true,
      message: "Workout session finished and completed",
      session,
    });
  } catch (error) {
    console.error("Complete session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to finish workout session",
    });
  }
};
