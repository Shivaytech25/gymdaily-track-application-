
import mongoose, { Document, Schema } from "mongoose";

export interface IWorkoutSet {
  setNumber: number;
  weightKg: number;
  reps: number;
  completed: boolean;
  restSeconds?: number;
}

export interface IWorkoutExercise {
  exerciseId?: string;
  exerciseName: string;
  category?: string;
  machineName?: string;
  equipmentType?: string;
  durationSeconds?: number;
  caloriesBurned?: number;
  completedAt?: Date;
  sets: IWorkoutSet[];
  notes?: string;
}

export interface IWorkoutSession extends Document {
  userId: mongoose.Types.ObjectId;
  workoutDate: Date;
  title: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  exercises: IWorkoutExercise[];
  durationMinutes: number;
  caloriesBurned?: number;
  notes?: string;
  startedAt?: Date;
  completedAt?: Date;
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
    exerciseId: {
      type: String,
      trim: true,
    },
    exerciseName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
    },
    machineName: {
      type: String,
      trim: true,
      default: "",
    },
    equipmentType: {
      type: String,
      trim: true,
    },
    durationSeconds: {
      type: Number,
      min: 0,
    },
    caloriesBurned: {
      type: Number,
      min: 0,
    },
    completedAt: {
      type: Date,
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
    status: {
      type: String,
      enum: ["in_progress", "completed", "cancelled"],
      default: "completed",
      index: true,
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
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
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

const WorkoutSession: mongoose.Model<IWorkoutSession> =
  (mongoose.models.WorkoutSession as mongoose.Model<IWorkoutSession>) ||
  mongoose.model<IWorkoutSession>(
    "WorkoutSession",
    WorkoutSessionSchema
  );

export default WorkoutSession;
