
import mongoose, { Document, Schema } from "mongoose";

export interface IWorkoutSet {
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
  restSeconds?: number;
}

export interface IWorkoutExercise {
  exerciseName: string;
  machineName: string;
  equipmentType?: string;
  sets: IWorkoutSet[];
  notes?: string;
}

export interface IWorkoutSession extends Document {
  userId: mongoose.Types.ObjectId;
  workoutDate: Date;
  title: string;
  exercises: IWorkoutExercise[];
  durationMinutes: number;
  caloriesBurned?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkoutSetSchema = new Schema<IWorkoutSet>(
  {
    setNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    weightKg: {
      type: Number,
      required: true,
      min: 0,
    },
    reps: {
      type: Number,
      required: true,
      min: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    restSeconds: {
      type: Number,
      min: 0,
    },
  },
  { _id: true }
);

const WorkoutExerciseSchema = new Schema<IWorkoutExercise>(
  {
    exerciseName: {
      type: String,
      required: true,
      trim: true,
    },
    machineName: {
      type: String,
      required: true,
      trim: true,
    },
    equipmentType: {
      type: String,
      trim: true,
    },
    sets: {
      type: [WorkoutSetSchema],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

const WorkoutSessionSchema = new Schema<IWorkoutSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
      index: true,
    },
    workoutDate: {
      type: Date,
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "Workout Session",
      trim: true,
    },
    exercises: {
      type: [WorkoutExerciseSchema],
      default: [],
    },
    durationMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    caloriesBurned: {
      type: Number,
      min: 0,
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

// Efficient date-based history queries for each user.
WorkoutSessionSchema.index({
  userId: 1,
  workoutDate: -1,
});

export default mongoose.models.WorkoutSession ||
  mongoose.model<IWorkoutSession>(
    "WorkoutSession",
    WorkoutSessionSchema
  );
