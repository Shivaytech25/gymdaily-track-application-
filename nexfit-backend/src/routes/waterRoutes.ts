
import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import {
  getWaterLog,
  addWaterEntry,
  updateWaterTarget,
  deleteWaterEntry,
} from "../controllers/waterController";

const router = Router();

interface JwtPayload {
  userId?: string;
  id?: string;
  _id?: string;
}

function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      message: "Authentication token required",
    });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({
      success: false,
      message: "JWT_SECRET is not configured",
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
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

router.get("/", authenticate, getWaterLog);
router.post("/entries", authenticate, addWaterEntry);
router.patch("/target", authenticate, updateWaterTarget);
router.delete("/entries/:entryId", authenticate, deleteWaterEntry);

export default router;
