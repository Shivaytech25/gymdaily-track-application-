import mongoose, { Document, Schema } from "mongoose";

export interface ICustomExercise extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  muscle: string;
  category?: string;
  sets: number;
  reps: number;
  durationSeconds?: number;
  equipment?: string[];
  isCustom: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomExerciseSchema = new Schema<ICustomExercise>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    muscle: {
      type: String,
      required: true,
      trim: true,
      default: "Full Body",
    },
    category: {
      type: String,
      trim: true,
    },
    sets: {
      type: Number,
      required: true,
      min: 1,
      max: 50,
      default: 3,
    },
    reps: {
      type: Number,
      required: true,
      min: 1,
      max: 200,
      default: 10,
    },
    durationSeconds: {
      type: Number,
      min: 0,
    },
    equipment: {
      type: [String],
      default: ["Custom"],
    },
    isCustom: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find user custom exercises
CustomExerciseSchema.index({ userId: 1, name: 1 });

const CustomExercise: mongoose.Model<ICustomExercise> =
  (mongoose.models.CustomExercise as mongoose.Model<ICustomExercise>) ||
  mongoose.model<ICustomExercise>("CustomExercise", CustomExerciseSchema);

export default CustomExercise;
