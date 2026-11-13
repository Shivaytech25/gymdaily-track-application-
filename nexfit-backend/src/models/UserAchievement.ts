
import mongoose, { Document, Schema } from "mongoose";

export interface IUserAchievement extends Document {
  userId: mongoose.Types.ObjectId;
  code: string;
  title: string;
  description: string;
  category: string;
  threshold: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserAchievementSchema = new Schema<IUserAchievement>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    code: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ["workout", "streak", "strength", "nutrition", "hydration"],
    },
    threshold: { type: Number, required: true, min: 1 },
    progress: { type: Number, default: 0, min: 0 },
    unlocked: { type: Boolean, default: false },
    unlockedAt: { type: Date },
  },
  { timestamps: true }
);

UserAchievementSchema.index(
  { userId: 1, code: 1 },
  { unique: true }
);

export default mongoose.models.UserAchievement ||
  mongoose.model<IUserAchievement>(
    "UserAchievement",
    UserAchievementSchema
  );
