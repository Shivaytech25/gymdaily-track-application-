
import mongoose, { Document, Schema } from "mongoose";

export interface IFoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
}

export interface IMeal {
  name: string;
  time?: string;
  foods: IFoodItem[];
  notes?: string;
}

export interface INutritionLog extends Document {
  userId: mongoose.Types.ObjectId;
  logDate: Date;
  meals: IMeal[];
  dailyTargets: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const FoodItemSchema = new Schema<IFoodItem>(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true },
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fats: { type: Number, required: true, min: 0 },
    fiber: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const MealSchema = new Schema<IMeal>(
  {
    name: { type: String, required: true, trim: true },
    time: { type: String },
    foods: { type: [FoodItemSchema], default: [] },
    notes: { type: String, trim: true },
  },
  { _id: true }
);

const NutritionLogSchema = new Schema<INutritionLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    logDate: { type: Date, required: true },
    meals: { type: [MealSchema], default: [] },
    dailyTargets: {
      calories: { type: Number, default: 2000, min: 0 },
      protein: { type: Number, default: 100, min: 0 },
      carbs: { type: Number, default: 250, min: 0 },
      fats: { type: Number, default: 65, min: 0 },
      fiber: { type: Number, default: 25, min: 0 },
    },
  },
  { timestamps: true }
);

NutritionLogSchema.index({ userId: 1, logDate: -1 }, { unique: true });

export default mongoose.models.NutritionLog ||
  mongoose.model<INutritionLog>("NutritionLog", NutritionLogSchema);
