import mongoose, { Document, Schema } from 'mongoose';

export type FitnessGoal =
  | 'fat_loss'
  | 'muscle_gain'
  | 'strength'
  | 'general_fitness'
  | 'endurance';

export type ExperienceLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced';

export type DietPreference =
  | 'vegetarian'
  | 'non_vegetarian'
  | 'vegan'
  | 'eggetarian'
  | 'other';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  dateOfBirth?: Date;
  heightCm?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  fitnessGoal: FitnessGoal;
  experienceLevel: ExperienceLevel;
  workoutDaysPerWeek: number;
  dietPreference: DietPreference;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    dateOfBirth: {
      type: Date,
    },

    heightCm: {
      type: Number,
      min: 50,
      max: 300,
    },

    currentWeightKg: {
      type: Number,
      min: 20,
      max: 500,
    },

    targetWeightKg: {
      type: Number,
      min: 20,
      max: 500,
    },

    fitnessGoal: {
      type: String,
      enum: [
        'fat_loss',
        'muscle_gain',
        'strength',
        'general_fitness',
        'endurance',
      ],
      default: 'general_fitness',
      required: true,
    },

    experienceLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
      required: true,
    },

    workoutDaysPerWeek: {
      type: Number,
      min: 1,
      max: 7,
      default: 3,
      required: true,
    },

    dietPreference: {
      type: String,
      enum: [
        'vegetarian',
        'non_vegetarian',
        'vegan',
        'eggetarian',
        'other',
      ],
      default: 'other',
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model<IUser>('User', userSchema);

export default User;
