
import { Request, Response } from 'express';
import mongoose from 'mongoose';

import User from '../models/User';
import {
  validateLoginInput,
  validateRegisterInput,
} from '../utils/validation';
import {
  createAccessToken,
  hashPassword,
  verifyPassword,
} from '../services/authService';

export async function register(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validation = validateRegisterInput(req.body);

    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.message,
      });
      return;
    }

    const { name, email, password } = validation.data;

    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
      return;
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      name,
      email,
      passwordHash,
    });

    const accessToken = createAccessToken(user.id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      data: {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          fitnessGoal: user.fitnessGoal,
          experienceLevel: user.experienceLevel,
          workoutDaysPerWeek: user.workoutDaysPerWeek,
          dietPreference: user.dietPreference,
        },
      },
    });
  } catch (error) {
    if (
      error instanceof mongoose.Error &&
      error.name === 'ValidationError'
    ) {
      res.status(400).json({
        success: false,
        message: 'Please check your account details.',
      });
      return;
    }

    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 11000
    ) {
      res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
      return;
    }

    console.error('Registration error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to create your account right now.',
    });
  }
}

export async function login(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validation = validateLoginInput(req.body);

    if (!validation.valid) {
      res.status(400).json({
        success: false,
        message: validation.message,
      });
      return;
    }

    const { email, password } = validation.data;

    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    const passwordMatches = await verifyPassword(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
      return;
    }

    const accessToken = createAccessToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          fitnessGoal: user.fitnessGoal,
          experienceLevel: user.experienceLevel,
          workoutDaysPerWeek: user.workoutDaysPerWeek,
          dietPreference: user.dietPreference,
          heightCm: user.heightCm,
          currentWeightKg: user.currentWeightKg,
          targetWeightKg: user.targetWeightKg,
        },
      },
    });
  
  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      success: false,
      message: 'Unable to log in right now.',
    });
  }

}
