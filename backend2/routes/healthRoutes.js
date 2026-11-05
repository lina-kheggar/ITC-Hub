import express from "express";

const router = express.Router();
/**
 * @route   GET /api/health
 * @desc    Public health check for load balancers. NO DATABASE CALL.
 * @access  Public
 */
router.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

export default router;
