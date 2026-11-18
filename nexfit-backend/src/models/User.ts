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
  phoneNumber?: string;
  passwordHash: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  heightCm?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  fitnessGoal: FitnessGoal;
  experienceLevel: ExperienceLevel;
  workoutDaysPerWeek: number;
  dietPreference: DietPreference;
  nutritionTargets?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber?: number;
  };
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

    phoneNumber: {
      type: String,
      trim: true,
      sparse: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    dateOfBirth: {
      type: Date,
    },

    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
      default: 'prefer_not_to_say',
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

    nutritionTargets: {
      calories: { type: Number, min: 0, default: 2000 },
      protein: { type: Number, min: 0, default: 100 },
      carbs: { type: Number, min: 0, default: 250 },
      fats: { type: Number, min: 0, default: 65 },
      fiber: { type: Number, min: 0, default: 25 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const User = mongoose.model<IUser>('User', userSchema);

export default User;
