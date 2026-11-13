
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

export default mongoose.models.WorkoutPlan ||
  mongoose.model<IWorkoutPlan>("WorkoutPlan", WorkoutPlanSchema);
