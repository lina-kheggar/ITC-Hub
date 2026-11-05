import rateLimit from "express-rate-limit";
import redis from "../config/redis.js";

const CHAT_LIMIT = parseInt(process.env.CHAT_RATE_LIMIT_PER_MINUTE || "20", 10);

const createRateLimitResponse = (message) => ({
  success: false,
  error: {
    code: "RATE_LIMIT_EXCEEDED",
    message
  },
  message
});

export const chatRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: CHAT_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    return req.user?.id || req.user?._id || req.ip || "unknown-client";
  },
  handler: (req, res) => {
    const msg = `Rate limit exceeded: maximum ${CHAT_LIMIT} chat messages per minute per user.`;
    return res.status(429).json(createRateLimitResponse(msg));
  }
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return res
      .status(429)
      .json(
        createRateLimitResponse(
          "Too many API requests from this IP. Please try again in 15 minutes."
        )
      );
  }
});

export default {
  chatRateLimiter,
  apiRateLimiter
};
