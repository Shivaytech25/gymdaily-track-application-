import { Request, Response } from "express";
import mongoose from "mongoose";
import CustomExercise from "../models/CustomExercise";

interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id?: string;
    _id?: string;
  };
}

const getUserId = (req: AuthRequest): string | null => {
  const id = req.userId ?? req.user?.id ?? req.user?._id;
  if (!id || typeof id !== "string" || !mongoose.isValidObjectId(id)) {
    return null;
  }
  return id;
};

// GET /api/workouts/custom-exercises
export const getCustomExercises = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const exercises = await CustomExercise.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: exercises,
      exercises,
    });
  } catch (error) {
    console.error("Get custom exercises error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve custom exercises",
    });
  }
};

// POST /api/workouts/custom-exercises
export const createCustomExercise = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { name, muscle, category, sets, reps, durationSeconds, equipment, notes } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({
        success: false,
        message: "Exercise name is required",
      });
      return;
    }

    const parsedSets = sets !== undefined && sets !== null && sets !== "" ? Number(sets) : 3;
    const parsedReps = reps !== undefined && reps !== null && reps !== "" ? Number(reps) : 10;

    if (!Number.isInteger(parsedSets) || parsedSets < 1 || parsedSets > 50) {
      res.status(400).json({
        success: false,
        message: "Sets must be an integer between 1 and 50",
      });
      return;
    }

    if (!Number.isInteger(parsedReps) || parsedReps < 1 || parsedReps > 200) {
      res.status(400).json({
        success: false,
        message: "Reps must be an integer between 1 and 200",
      });
      return;
    }

    const customExercise = await CustomExercise.create({
      userId,
      name: name.trim(),
      muscle: typeof muscle === "string" && muscle.trim() ? muscle.trim() : "Full Body",
      category: typeof category === "string" && category.trim() ? category.trim() : typeof muscle === "string" && muscle.trim() ? muscle.trim() : "Full Body",
      sets: parsedSets,
      reps: parsedReps,
      durationSeconds: typeof durationSeconds === "number" && durationSeconds >= 0 ? durationSeconds : undefined,
      equipment: Array.isArray(equipment) && equipment.length > 0 ? equipment : ["Custom"],
      isCustom: true,
      notes: typeof notes === "string" ? notes.trim() : undefined,
    });

    res.status(201).json({
      success: true,
      message: "Custom exercise created successfully",
      exercise: customExercise,
      data: customExercise,
    });
  } catch (error: any) {
    console.error("Create custom exercise error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to create custom exercise",
    });
  }
};

// PUT or PATCH /api/workouts/custom-exercises/:id
export const updateCustomExercise = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Valid exercise ID required" });
      return;
    }

    const exercise = await CustomExercise.findOne({ _id: id, userId });
    if (!exercise) {
      res.status(404).json({
        success: false,
        message: "Custom exercise not found or unauthorized",
      });
      return;
    }

    const { name, muscle, category, sets, reps, durationSeconds, equipment, notes } = req.body;

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({ success: false, message: "Valid name required" });
        return;
      }
      exercise.name = name.trim();
    }

    if (muscle !== undefined) {
      exercise.muscle = typeof muscle === "string" && muscle.trim() ? muscle.trim() : exercise.muscle;
    }

    if (category !== undefined) {
      exercise.category = typeof category === "string" && category.trim() ? category.trim() : exercise.category;
    }

    if (sets !== undefined) {
      const parsedSets = Number(sets);
      if (!Number.isInteger(parsedSets) || parsedSets < 1 || parsedSets > 50) {
        res.status(400).json({ success: false, message: "Sets must be an integer between 1 and 50" });
        return;
      }
      exercise.sets = parsedSets;
    }

    if (reps !== undefined) {
      const parsedReps = Number(reps);
      if (!Number.isInteger(parsedReps) || parsedReps < 1 || parsedReps > 200) {
        res.status(400).json({ success: false, message: "Reps must be an integer between 1 and 200" });
        return;
      }
      exercise.reps = parsedReps;
    }

    if (durationSeconds !== undefined) {
      exercise.durationSeconds = typeof durationSeconds === "number" && durationSeconds >= 0 ? durationSeconds : exercise.durationSeconds;
    }

    if (equipment !== undefined && Array.isArray(equipment)) {
      exercise.equipment = equipment;
    }

    if (notes !== undefined) {
      exercise.notes = typeof notes === "string" ? notes.trim() : exercise.notes;
    }

    await exercise.save();

    res.status(200).json({
      success: true,
      message: "Custom exercise updated successfully",
      exercise,
      data: exercise,
    });
  } catch (error: any) {
    console.error("Update custom exercise error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to update custom exercise",
    });
  }
};

// DELETE /api/workouts/custom-exercises/:id
export const deleteCustomExercise = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const { id } = req.params;
    if (!id || !mongoose.isValidObjectId(id)) {
      res.status(400).json({ success: false, message: "Valid exercise ID required" });
      return;
    }

    // Verify ownership and delete ONLY user's custom exercise
    const exercise = await CustomExercise.findOneAndDelete({ _id: id, userId });

    if (!exercise) {
      res.status(404).json({
        success: false,
        message: "Custom exercise not found or unauthorized",
      });
      return;
    }

    // Notice: historical WorkoutSession documents are NOT modified or deleted
    res.status(200).json({
      success: true,
      message: "Custom exercise deleted successfully. Historical workout records are preserved.",
    });
  } catch (error: any) {
    console.error("Delete custom exercise error:", error);
    res.status(500).json({
      success: false,
      message: error?.message || "Failed to delete custom exercise",
    });
  }
};
