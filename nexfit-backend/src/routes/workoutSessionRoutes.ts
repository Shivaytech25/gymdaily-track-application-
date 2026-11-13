
import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import {
  createWorkoutSession,
  getWorkoutSessions,
  getWorkoutSessionsByDate,
  updateWorkoutSession,
  deleteWorkoutSession,
} from "../controllers/workoutSessionController";

const router = Router();

interface AuthRequest extends Request {
  userId?: string;
}

const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : null;

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication token required",
    });
    return;
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({
      success: false,
      message: "JWT_SECRET is not configured",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret);

    if (typeof decoded === "string") {
      res.status(401).json({ success: false, message: "Invalid token payload" });
      return;
    }

    const payload = decoded as jwt.JwtPayload;
    const id = payload.userId ?? payload.id ?? payload._id ?? payload.sub;

    if (typeof id !== "string" || !mongoose.isValidObjectId(id)) {
      res.status(401).json({ success: false, message: "Invalid user in token" });
      return;
    }

    req.userId = id;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

router.post("/", authenticate, createWorkoutSession);
router.get("/", authenticate, getWorkoutSessions);
router.get("/date/:date", authenticate, getWorkoutSessionsByDate);
router.patch("/:id", authenticate, updateWorkoutSession);
router.delete("/:id", authenticate, deleteWorkoutSession);

export default router;
