
import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

import { connectDatabase } from "./config/database";

import authRoutes from "./routes/authRoutes";
import workoutRoutes from "./routes/workoutRoutes";
import workoutSessionRoutes from "./routes/workoutSessionRoutes";
import nutritionRoutes from "./routes/nutritionRoutes";
import waterRoutes from "./routes/waterRoutes";
import bodyMeasurementRoutes from "./routes/bodyMeasurementRoutes";
import achievementRoutes from "./routes/achievementRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import workoutHistoryRoutes from "./routes/workoutHistoryRoutes";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to NexFit API!",
    version: "1.0.0",
  });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "NexFit API is running",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/workout-sessions", workoutSessionRoutes);
app.use("/api/nutrition", nutritionRoutes);
app.use("/api/water", waterRoutes);
app.use("/api/body-measurements", bodyMeasurementRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/workout-history", workoutHistoryRoutes);

async function startServer(): Promise<void> {
  try {
    await connectDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 NexFit API running on http://localhost:${PORT}`);
      console.log("💚 Health check: /api/health");
      console.log("🔐 Auth: /api/auth");
      console.log("🏋️ Workout plans: /api/workouts");
      console.log("📅 Workout sessions: /api/workout-sessions");
      console.log("🥗 Nutrition: /api/nutrition");
      console.log("💧 Water: /api/water");
      console.log("📏 Body measurements: /api/body-measurements");
      console.log("🏆 Achievements: /api/achievements");
      console.log("📊 Dashboard: /api/dashboard");
      console.log("🗓️ Workout history: /api/workout-history");
    });
  } catch (error) {
    console.error("❌ Failed to start NexFit API:", error);
    process.exit(1);
  }
}

void startServer();

export default app;
