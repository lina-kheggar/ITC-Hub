import { z } from "zod";

export const validate = (schema, source = "body") => {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req[source]);

      if (!result.success) {
        const firstIssue = result.error.issues[0];
        const path = firstIssue.path.length > 0 ? firstIssue.path.join(".") : source;
        const formattedMessage = `${path}: ${firstIssue.message}`;

        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: formattedMessage
          },
          message: formattedMessage
        });
      }
      
      if (source === "query") {
        for (const k of Object.keys(req.query)) {
          delete req.query[k];
        }
        Object.assign(req.query, result.data);
      } else {
        req[source] = result.data;
      }
      next();
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: err.message || "Invalid input data."
        },
        message: err.message || "Invalid input data."
      });
    }
  };
};

export const validateBody = (schema) => validate(schema, "body");
export const validateQuery = (schema) => validate(schema, "query");
export const validateParams = (schema) => validate(schema, "params");

export const schemas = {

  register: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .optional(),
    email: z.string({ required_error: "Email is required" }).trim().email("Invalid email format"),
    password: z.string({ required_error: "Password is required" }).min(6, "Password must be at least 6 characters"),
    role: z.enum(["member", "admin"]).optional().default("member")
  }),

  login: z.object({
    email: z.string({ required_error: "Email is required" }).trim().email("Invalid email format"),
    password: z.string({ required_error: "Password is required" }).min(1, "Password is required")
  }),

  refreshToken: z.object({
    refreshToken: z.string().optional()
  }),
  
  createEvent: z.object({
    title: z.string({ required_error: "Title is required" }).trim().min(2, "Title must be at least 2 characters"),
    description: z.string({ required_error: "Description is required" }).trim().min(5, "Description must be at least 5 characters"),
    date: z.string({ required_error: "Date is required" }).refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format"
    }),
    location: z.string().trim().optional().default("Université de Blida"),
    department: z.string().trim().optional().default("ITC"),
    capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").optional().default(50)
  }),

  eventPagination: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional()
  }),

  mongoIdParam: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format: must be a 24-character hex string")
  }),
  
  chatMessage: z.object({
    message: z.string({ required_error: "Message is required" }).trim().min(1, "Message cannot be empty").max(2000, "Message cannot exceed 2000 characters"),
    stream: z.boolean().optional()
  })
};

export default {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  schemas
};
