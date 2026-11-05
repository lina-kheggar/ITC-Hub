import express from "express";
import crypto from "crypto";
import mongoose from "mongoose";
import Event from "../models/Event.js";
import Registration from "../models/Registration.js";
import redis from "../config/redis.js";

const CACHE_TTL_EVENTS = parseInt(
  process.env.CACHE_TTL_EVENTS_SECONDS || "300",
  10
);
import {
  validateBody,
  validateQuery,
  validateParams,
  schemas
} from "../middleware/validate.js";
import { authMiddleware, requireAdmin } from "../middleware/auth.js";

const router = express.Router();
// Helper to compute ETag
const computeETag = (bodyString) => {
  return `"${crypto.createHash("md5").update(bodyString).digest("hex")}"`;
};
/**
 * @route   GET /api/events
 * @desc    Get all events. Cached with Redis (Cache-aside) and Cache-Control: max-age=60 + ETag 304.
 *          Supports optional pagination: ?page=1&limit=10.
 * @access  Public
 */
router.get("/", validateQuery(schemas.eventPagination), async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page, 10) : null;
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;

    const cacheKey = page && limit ? `events:page:${page}:limit:${limit}` : "events:all";

    //  Check Redis Application Cache
    const cachedData = await redis.get(cacheKey);

    let responsePayload;
    let cacheStatus = "MISS";

    if (cachedData) {
      cacheStatus = "HIT";
      responsePayload = JSON.parse(cachedData);
    } else {
      //  Slow path: read from MongoDB with Stampede protection
      responsePayload = await redis.withStampedeProtection(cacheKey, async () => {
        let eventsQuery = Event.find().sort({ date: 1 });

        if (page && limit) {
          const skip = (page - 1) * limit;
          const [total, events] = await Promise.all([
            Event.countDocuments(),
            eventsQuery.skip(skip).limit(limit).lean()
          ]);

          const formattedEvents = events.map((ev) => ({
            ...ev,
            id: ev._id.toString()
          }));

          return {
            success: true,
            data: formattedEvents,
            events: formattedEvents, 
            pagination: {
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit)
            }
          };
        } else {
          const events = await eventsQuery.lean();
          const formattedEvents = events.map((ev) => ({
            ...ev,
            id: ev._id.toString()
          }));

          return {
            success: true,
            data: formattedEvents,
            events: formattedEvents
          };
        }
      });
      // Store in Redis 
      await redis.set(cacheKey, JSON.stringify(responsePayload), {
        EX: CACHE_TTL_EVENTS
      });
    }

    const payloadString = JSON.stringify(responsePayload);
    const etag = computeETag(payloadString);
    // Set Caching and Diagnostic Headers
    res.setHeader("X-Cache", cacheStatus);
    res.setHeader("Cache-Control", "public, max-age=60");
    res.setHeader("ETag", etag);
    // Handle HTTP 304 Not Modified
    if (req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }

    return res.status(200).type("application/json").send(payloadString);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch events."
      },
      message: "Failed to fetch events."
    });
  }
});
/**
 * @route   GET /api/events/:id
 * @desc    Get event by ID. Cached with Redis + Cache-Control: max-age=60. 404 if not found.
 * @access  Public
 */
router.get("/:id", validateParams(schemas.mongoIdParam), async (req, res) => {
  try {
    const { id } = req.params;
    const cacheKey = `events:${id}`;
    // Check Redis Cache
    const cachedEvent = await redis.get(cacheKey);

    if (cachedEvent) {
      const parsed = JSON.parse(cachedEvent);
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", "public, max-age=60");

      const bodyStr = JSON.stringify(parsed);
      const etag = computeETag(bodyStr);
      res.setHeader("ETag", etag);

      if (req.headers["if-none-match"] === etag) {
        return res.status(304).end();
      }

      return res.status(200).type("application/json").send(bodyStr);
    }
    // Slow path: MongoDB
    const event = await Event.findById(id).lean();

    if (!event) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Event not found."
        },
        message: "Event not found."
      });
    }

    const formattedEvent = {
      ...event,
      id: event._id.toString()
    };

    const payload = {
      success: true,
      data: formattedEvent,
      event: formattedEvent
    };
    // Store in Redis with TTL
    await redis.set(cacheKey, JSON.stringify(payload), {
      EX: CACHE_TTL_EVENTS
    });

    const bodyStr = JSON.stringify(payload);
    const etag = computeETag(bodyStr);

    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "public, max-age=60");
    res.setHeader("ETag", etag);

    return res.status(200).type("application/json").send(bodyStr);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch event."
      },
      message: "Failed to fetch event."
    });
  }
});
/**
 * @route   POST /api/events
 * @desc    Create a new event. Admin only. Invalidates cache.
 * @access  Admin
 */
router.post(
  "/",
  authMiddleware,
  requireAdmin,
  validateBody(schemas.createEvent),
  async (req, res) => {
    try {
      const { title, description, date, location, department, capacity } =
        req.body;

      const event = await Event.create({
        title: title.trim(),
        description: description.trim(),
        date: new Date(date),
        location: location || "Université de Blida",
        department: department || "ITC",
        capacity: capacity ? Number(capacity) : 50,
        created_at: new Date()
      });
      // Invalidate Application Cache on every write
      await redis.del("events:all");
      await redis.delPattern("events:*");

      const eventJson = event.toJSON();

      return res.status(201).json({
        success: true,
        message: "Event created successfully.",
        data: eventJson,
        event: eventJson
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create event."
        },
        message: "Failed to create event."
      });
    }
  }
);
/**
 * @route   POST /api/events/:id/register
 * @desc    Register current user to an event. Member access. 409 if already registered or event full.
 * @access  Member (Authenticated)
 */
router.post(
  "/:id/register",
  authMiddleware,
  validateParams(schemas.mongoIdParam),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id || req.user._id;
      //  Check if event exists
      const event = await Event.findById(id);
      if (!event) {
        return res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Event not found."
          },
          message: "Event not found."
        });
      }
      // Check if user is already registered (409 Conflict)
      const existingRegistration = await Registration.findOne({
        $or: [
          { user_id: userId, event_id: event._id },
          { user: userId, event: event._id }
        ]
      });

      if (existingRegistration) {
        return res.status(409).json({
          success: false,
          error: {
            code: "ALREADY_REGISTERED",
            message: "You are already registered for this event."
          },
          message: "You are already registered for this event."
        });
      }
      // Check if event has reached capacity (409 Conflict)
      const currentRegistrationsCount = await Registration.countDocuments({
        $or: [{ event_id: event._id }, { event: event._id }]
      });

      if (event.capacity && currentRegistrationsCount >= event.capacity) {
        return res.status(409).json({
          success: false,
          error: {
            code: "EVENT_FULL",
            message: "This event is already at full capacity."
          },
          message: "This event is already at full capacity."
        });
      }
      //  Create registration
      await Registration.create({
        user_id: userId,
        event_id: event._id,
        user: userId,
        event: event._id,
        created_at: new Date()
      });

      return res.status(201).json({
        success: true,
        message: "Successfully registered for this event."
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          error: {
            code: "ALREADY_REGISTERED",
            message: "You are already registered for this event."
          },
          message: "You are already registered for this event."
        });
      }

      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to register for event."
        },
        message: "Failed to register for event."
      });
    }
  }
);

export default router;
