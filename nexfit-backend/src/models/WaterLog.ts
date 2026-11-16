
import mongoose, { Document, Schema } from "mongoose";

export interface IWaterEntry {
  amountMl: number;
  consumedAt: Date;
  note?: string;
}

export interface IWaterLog extends Document {
  userId: mongoose.Types.ObjectId;
  logDate: Date;
  entries: IWaterEntry[];
  dailyTargetMl: number;
  createdAt: Date;
  updatedAt: Date;
}

const WaterEntrySchema = new Schema<IWaterEntry>(
  {
    amountMl: { type: Number, required: true, min: 1 },
    consumedAt: { type: Date, required: true, default: Date.now },
    note: { type: String, trim: true },
  },
  { _id: true }
);

const WaterLogSchema = new Schema<IWaterLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    logDate: { type: Date, required: true },
    entries: { type: [WaterEntrySchema], default: [] },
    dailyTargetMl: { type: Number, default: 2500, min: 1 },
  },
  { timestamps: true }
);

WaterLogSchema.index({ userId: 1, logDate: -1 }, { unique: true });

const WaterLog: mongoose.Model<IWaterLog> =
  (mongoose.models.WaterLog as mongoose.Model<IWaterLog>) ||
  mongoose.model<IWaterLog>("WaterLog", WaterLogSchema);

export default WaterLog;
