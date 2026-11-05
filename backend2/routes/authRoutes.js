import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { validateBody, schemas } from "../middleware/validate.js";

const IS_PROD = process.env.NODE_ENV === "production";
const REFRESH_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "itc_hub_refresh_super_secret_key_2026";
import {
  authMiddleware,
  generateAccessToken,
  generateRefreshToken
} from "../middleware/auth.js";

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user, hashes password, 409 on duplicate email
 * @access  Public
 */
router.post("/register", validateBody(schemas.register), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const cleanEmail = email.trim().toLowerCase();
    const cleanName =
      typeof name === "string" && name.trim()
        ? name.trim()
        : cleanEmail.split("@")[0];

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "An account with this email address already exists."
        },
        message: "An account with this email address already exists."
      });
    }

    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password_hash,
      password: password_hash, 
      role: role || "member",
      created_at: new Date()
    });

    const userJson = user.toJSON();
    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? "none" : "lax",
      // 15 mins
      maxAge: 15 * 60 * 1000 
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? "none" : "lax",
      // 7 days
      maxAge: 7 * 24 * 60 * 60 * 1000 
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      token,
      user: {
        id: userJson.id,
        name: userJson.name,
        email: userJson.email,
        role: userJson.role,
        created_at: userJson.created_at
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "An account with this email address already exists."
        },
        message: "An account with this email address already exists."
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred during registration."
      },
      message: "An error occurred during registration."
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user, returns token, sets httpOnly cookie
 * @access  Public
 */
router.post("/login", validateBody(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password."
        },
        message: "Invalid email or password."
      });
    }

    const hashToVerify = user.getPasswordHash();
    const isMatch = await bcrypt.compare(password, hashToVerify);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password."
        },
        message: "Invalid email or password."
      });
    }

    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("token", token, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? "none" : "lax",
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    const userJson = user.toJSON();

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      refreshToken,
      user: {
        id: userJson.id,
        name: userJson.name,
        email: userJson.email,
        role: userJson.role
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An error occurred during authentication."
      },
      message: "An error occurred during authentication."
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Issue a new access token using a refresh token
 * @access  Public
 */
router.post("/refresh", validateBody(schemas.refreshToken), async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: {
          code: "REFRESH_TOKEN_REQUIRED",
          message: "Refresh token is missing."
        },
        message: "Refresh token is missing."
      });
    }

    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_REFRESH_TOKEN",
          message: "User no longer exists."
        },
        message: "User no longer exists."
      });
    }

    const newAccessToken = generateAccessToken(user);

    res.cookie("token", newAccessToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? "none" : "lax",
      maxAge: 15 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      message: "Access token refreshed.",
      token: newAccessToken
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: "INVALID_REFRESH_TOKEN",
        message: "Refresh token is invalid or expired."
      },
      message: "Refresh token is invalid or expired."
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user
 * @access  Private (member or admin)
 */
router.get("/me", authMiddleware, async (req, res) => {
  try {
    
    res.setHeader("Cache-Control", "private, no-store");

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User profile not found."
        },
        message: "User profile not found."
      });
    }

    const userJson = user.toJSON();

    return res.status(200).json({
      success: true,
      user: {
        id: userJson.id,
        name: userJson.name,
        email: userJson.email,
        role: userJson.role
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to retrieve user profile."
      },
      message: "Failed to retrieve user profile."
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Clear authentication cookies
 * @access  Public
 */
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "none" : "lax"
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? "none" : "lax"
  });

  return res.status(200).json({
    success: true,
    message: "Logged out successfully."
  });
});

export default router;
