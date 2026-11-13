
import mongoose, { Document, Schema } from "mongoose";

export interface IBodyMeasurement extends Document {
  userId: mongoose.Types.ObjectId;
  measuredAt: Date;
  weightKg: number;
  bodyFatPercentage?: number;
  waistCm?: number;
  chestCm?: number;
  hipsCm?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BodyMeasurementSchema = new Schema<IBodyMeasurement>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    measuredAt: { type: Date, required: true, index: true },
    weightKg: { type: Number, required: true, min: 0.1, max: 1000 },
    bodyFatPercentage: { type: Number, min: 0, max: 100 },
    waistCm: { type: Number, min: 0, max: 500 },
    chestCm: { type: Number, min: 0, max: 500 },
    hipsCm: { type: Number, min: 0, max: 500 },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

BodyMeasurementSchema.index({ userId: 1, measuredAt: -1 });

export default mongoose.models.BodyMeasurement ||
  mongoose.model<IBodyMeasurement>(
    "BodyMeasurement",
    BodyMeasurementSchema
  );
