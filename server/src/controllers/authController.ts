import { Request, Response, NextFunction } from 'express';
import { UserModel, formatPublicUser } from '../models/User.ts';
import { signToken } from '../utils/jwt.ts';
import { AppError } from '../utils/AppError.ts';

export class AuthController {
  /**
   * POST /api/auth/signup
   * Register a new user and return signed JWT token
   */
  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError(400, 'MISSING_FIELDS', 'Both email and password are required.');
      }

      const normalizedEmail = email.trim().toLowerCase();
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(normalizedEmail)) {
        throw new AppError(400, 'INVALID_EMAIL', 'Please provide a valid email address.');
      }

      if (password.length < 6) {
        throw new AppError(400, 'WEAK_PASSWORD', 'Password must be at least 6 characters long.');
      }

      // Check if user already exists
      const existingUser = await UserModel.findOne({ email: normalizedEmail });
      if (existingUser) {
        throw new AppError(409, 'EMAIL_EXISTS', 'An account with this email address already exists.');
      }

      // Create new user (password is automatically hashed via Mongoose pre-save hook)
      const user = await UserModel.create({
        email: normalizedEmail,
        password,
      });

      const token = signToken({
        id: user._id.toString(),
        email: user.email,
      });

      res.status(201).json({
        message: 'Account created successfully',
        token,
        user: formatPublicUser(user),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   * Authenticate user credentials and return signed JWT token
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError(400, 'MISSING_CREDENTIALS', 'Email and password are required.');
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Find user and explicitly select password field
      const user = await UserModel.findOne({ email: normalizedEmail }).select('+password');
      if (!user) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
      }

      const token = signToken({
        id: user._id.toString(),
        email: user.email,
      });

      res.status(200).json({
        message: 'Logged in successfully',
        token,
        user: formatPublicUser(user),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   * Retrieve current authenticated user profile
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new AppError(401, 'UNAUTHORIZED', 'Not authenticated.');
      }

      const user = await UserModel.findById(req.user.id);
      if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User profile not found.');
      }

      res.status(200).json({
        user: formatPublicUser(user),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
