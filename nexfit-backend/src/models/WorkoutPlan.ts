
import mongoose, { Document, Schema } from "mongoose";

export interface IWorkoutPlan extends Document {
  userId: mongoose.Types.ObjectId;
  preferences: {
    goal: string;
    level: string;
    location: string;
    daysPerWeek: number;
    duration: number;
    mode: string;
  };
  preferenceHistory?: Array<{
    preferences: {
      goal: string;
      level: string;
      location: string;
      daysPerWeek: number;
      duration: number;
      mode: string;
    };
    effectiveDate: Date;
    createdAt: Date;
  }>;
  plan: unknown[];
  completedExercises: string[];
  createdAt: Date;
  updatedAt: Date;
}

const WorkoutPlanSchema = new Schema<IWorkoutPlan>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    preferences: {
      goal: { type: String, required: true },
      level: { type: String, required: true },
      location: { type: String, required: true },
      daysPerWeek: { type: Number, required: true },
      duration: { type: Number, required: true },
      mode: { type: String, required: true },
    },
    preferenceHistory: {
      type: [
        {
          preferences: { type: Schema.Types.Mixed, required: true },
          effectiveDate: { type: Date, default: Date.now },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    plan: {
      type: [Schema.Types.Mixed],
      default: [],
    },
    completedExercises: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const WorkoutPlan: mongoose.Model<IWorkoutPlan> =
  (mongoose.models.WorkoutPlan as mongoose.Model<IWorkoutPlan>) ||
  mongoose.model<IWorkoutPlan>("WorkoutPlan", WorkoutPlanSchema);

export default WorkoutPlan;
