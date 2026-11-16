import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getProfile, updateProfile } from "../controllers/userController";

const router = Router();

interface JwtPayload {
  userId?: string;
  id?: string;
  _id?: string;
  sub?: string;
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

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    res.status(500).json({
      success: false,
      message: "JWT_SECRET is not configured",
    });
    return;
  }

  try {
    const decoded = jwt.verify(authHeader.slice(7), secret) as JwtPayload;

    const userId =
      decoded.userId ?? decoded.id ?? decoded._id ?? decoded.sub;

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

// GET /api/users/profile
router.get("/profile", authenticate, getProfile);

// PATCH /api/users/profile
router.patch("/profile", authenticate, updateProfile);

// PUT /api/users/profile
router.put("/profile", authenticate, updateProfile);

export default router;
