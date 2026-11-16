import { Request, Response } from "express";
import mongoose from "mongoose";
import User, { FitnessGoal, ExperienceLevel, DietPreference } from "../models/User";

interface AuthRequest extends Request {
  userId?: string;
}

const VALID_FITNESS_GOALS: FitnessGoal[] = [
  "fat_loss",
  "muscle_gain",
  "strength",
  "general_fitness",
  "endurance",
];

const VALID_EXPERIENCE_LEVELS: ExperienceLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];

const VALID_DIET_PREFERENCES: DietPreference[] = [
  "vegetarian",
  "non_vegetarian",
  "vegan",
  "eggetarian",
  "other",
];

export async function getProfile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.userId || !mongoose.isValidObjectId(req.userId)) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const user = await User.findById(req.userId).lean();

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        fitnessGoal: user.fitnessGoal,
        experienceLevel: user.experienceLevel,
        workoutDaysPerWeek: user.workoutDaysPerWeek,
        dietPreference: user.dietPreference,
        heightCm: user.heightCm,
        currentWeightKg: user.currentWeightKg,
        targetWeightKg: user.targetWeightKg,
        dateOfBirth: user.dateOfBirth,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve user profile",
    });
  }
}

export async function updateProfile(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.userId || !mongoose.isValidObjectId(req.userId)) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const updates: Record<string, unknown> = {};

    if (req.body.name !== undefined) {
      if (
        typeof req.body.name !== "string" ||
        req.body.name.trim().length < 2 ||
        req.body.name.trim().length > 80
      ) {
        res.status(400).json({
          success: false,
          message: "Name must be between 2 and 80 characters",
        });
        return;
      }
      updates.name = req.body.name.trim();
    }

    if (req.body.fitnessGoal !== undefined) {
      if (!VALID_FITNESS_GOALS.includes(req.body.fitnessGoal)) {
        res.status(400).json({
          success: false,
          message: `fitnessGoal must be one of: ${VALID_FITNESS_GOALS.join(", ")}`,
        });
        return;
      }
      updates.fitnessGoal = req.body.fitnessGoal;
    }

    if (req.body.experienceLevel !== undefined) {
      if (!VALID_EXPERIENCE_LEVELS.includes(req.body.experienceLevel)) {
        res.status(400).json({
          success: false,
          message: `experienceLevel must be one of: ${VALID_EXPERIENCE_LEVELS.join(", ")}`,
        });
        return;
      }
      updates.experienceLevel = req.body.experienceLevel;
    }

    if (req.body.workoutDaysPerWeek !== undefined) {
      const days = Number(req.body.workoutDaysPerWeek);
      if (!Number.isInteger(days) || days < 1 || days > 7) {
        res.status(400).json({
          success: false,
          message: "workoutDaysPerWeek must be an integer between 1 and 7",
        });
        return;
      }
      updates.workoutDaysPerWeek = days;
    }

    if (req.body.dietPreference !== undefined) {
      if (!VALID_DIET_PREFERENCES.includes(req.body.dietPreference)) {
        res.status(400).json({
          success: false,
          message: `dietPreference must be one of: ${VALID_DIET_PREFERENCES.join(", ")}`,
        });
        return;
      }
      updates.dietPreference = req.body.dietPreference;
    }

    if (req.body.heightCm !== undefined) {
      if (req.body.heightCm === null || req.body.heightCm === "") {
        updates.heightCm = undefined;
      } else {
        const height = Number(req.body.heightCm);
        if (!Number.isFinite(height) || height < 50 || height > 300) {
          res.status(400).json({
            success: false,
            message: "heightCm must be between 50 and 300",
          });
          return;
        }
        updates.heightCm = height;
      }
    }

    if (req.body.currentWeightKg !== undefined) {
      if (req.body.currentWeightKg === null || req.body.currentWeightKg === "") {
        updates.currentWeightKg = undefined;
      } else {
        const weight = Number(req.body.currentWeightKg);
        if (!Number.isFinite(weight) || weight < 20 || weight > 500) {
          res.status(400).json({
            success: false,
            message: "currentWeightKg must be between 20 and 500",
          });
          return;
        }
        updates.currentWeightKg = weight;
      }
    }

    if (req.body.targetWeightKg !== undefined) {
      if (req.body.targetWeightKg === null || req.body.targetWeightKg === "") {
        updates.targetWeightKg = undefined;
      } else {
        const targetWeight = Number(req.body.targetWeightKg);
        if (!Number.isFinite(targetWeight) || targetWeight < 20 || targetWeight > 500) {
          res.status(400).json({
            success: false,
            message: "targetWeightKg must be between 20 and 500",
          });
          return;
        }
        updates.targetWeightKg = targetWeight;
      }
    }

    if (req.body.dateOfBirth !== undefined) {
      if (req.body.dateOfBirth === null || req.body.dateOfBirth === "") {
        updates.dateOfBirth = undefined;
      } else {
        const dob = new Date(req.body.dateOfBirth);
        if (Number.isNaN(dob.getTime())) {
          res.status(400).json({
            success: false,
            message: "dateOfBirth must be a valid date",
          });
          return;
        }
        updates.dateOfBirth = dob;
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        message: "No valid profile fields provided for update",
      });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        fitnessGoal: updatedUser.fitnessGoal,
        experienceLevel: updatedUser.experienceLevel,
        workoutDaysPerWeek: updatedUser.workoutDaysPerWeek,
        dietPreference: updatedUser.dietPreference,
        heightCm: updatedUser.heightCm,
        currentWeightKg: updatedUser.currentWeightKg,
        targetWeightKg: updatedUser.targetWeightKg,
        dateOfBirth: updatedUser.dateOfBirth,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user profile",
    });
  }
}
