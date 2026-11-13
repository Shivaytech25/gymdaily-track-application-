
import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import {
  getWorkoutCalendar,
  getWorkoutsByDate,
  getWorkoutHistory,
} from "../controllers/workoutHistoryController";

const router = Router();

function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  const secret = process.env.JWT_SECRET;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication token required",
    });
    return;
  }

  if (!secret) {
    res.status(500).json({
      success: false,
      message: "JWT_SECRET is not configured",
    });
    return;
  }

  try {
    const decoded = jwt.verify(header.slice(7), secret) as {
      userId?: string;
      id?: string;
      _id?: string;
    };

    const userId = decoded.userId ?? decoded.id ?? decoded._id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
      return;
    }

    (req as Request & { userId?: string }).userId = userId;
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
}

router.get("/", authenticate, getWorkoutHistory);
router.get("/calendar", authenticate, getWorkoutCalendar);
router.get("/date/:date", authenticate, getWorkoutsByDate);

export default router;
