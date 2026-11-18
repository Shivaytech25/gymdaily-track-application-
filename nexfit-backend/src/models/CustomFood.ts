import mongoose, { Document, Schema } from "mongoose";

export interface ICustomFood extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  servingSize: number;
  servingUnit: string;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CustomFoodSchema = new Schema<ICustomFood>(
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
      maxlength: 120,
    },
    calories: {
      type: Number,
      required: true,
      min: 0,
      max: 10000,
    },
    protein: {
      type: Number,
      required: true,
      min: 0,
      max: 1000,
      default: 0,
    },
    carbs: {
      type: Number,
      required: true,
      min: 0,
      max: 1000,
      default: 0,
    },
    fats: {
      type: Number,
      required: true,
      min: 0,
      max: 1000,
      default: 0,
    },
    fiber: {
      type: Number,
      min: 0,
      max: 500,
      default: 0,
    },
    servingSize: {
      type: Number,
      required: true,
      min: 0.1,
      default: 1,
    },
    servingUnit: {
      type: String,
      required: true,
      trim: true,
      default: "serving",
    },
    isCustom: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

CustomFoodSchema.index({ userId: 1, name: 1 });

const CustomFood: mongoose.Model<ICustomFood> =
  (mongoose.models.CustomFood as mongoose.Model<ICustomFood>) ||
  mongoose.model<ICustomFood>("CustomFood", CustomFoodSchema);

export default CustomFood;
