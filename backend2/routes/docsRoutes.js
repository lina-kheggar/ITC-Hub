import express from "express";

const router = express.Router();

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "ITC Hub API",
    version: "1.0.0",
    description:
      "Enterprise REST API for ITC Hub featuring JWT authentication, RBAC, Redis cache-aside, SSE AI streaming, rate limiting, and structured logging."
  },
  servers: [
    {
      url: "/api",
      description: "Base API Path"
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      },
      CookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "token"
      }
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          error: {
            type: "object",
            properties: {
              code: { type: "string", example: "VALIDATION_ERROR" },
              message: { type: "string", example: "Field 'email' is invalid" }
            }
          }
        }
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string" },
          role: { type: "string", enum: ["member", "admin"] },
          created_at: { type: "string", format: "date-time" }
        }
      },
      Event: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          date: { type: "string", format: "date-time" },
          location: { type: "string" },
          department: { type: "string" },
          capacity: { type: "integer" }
        }
      }
    }
  },
  paths: {
    "/health": {
      get: {
        summary: "Load balancer health check (no DB call)",
        responses: {
          200: {
            description: "Service is healthy"
          }
        }
      }
    },
    "/auth/register": {
      post: {
        summary: "Register new account",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string" },
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 6 },
                  role: { type: "string", enum: ["member", "admin"] }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "User registered" },
          400: { description: "Validation error", $ref: "#/components/schemas/ErrorResponse" },
          409: { description: "Email already exists", $ref: "#/components/schemas/ErrorResponse" }
        }
      }
    },
    "/auth/login": {
      post: {
        summary: "Authenticate and receive JWT token",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Login successful" },
          401: { description: "Invalid credentials" }
        }
      }
    },
    "/auth/refresh": {
      post: {
        summary: "Refresh access token",
        responses: {
          200: { description: "Token refreshed" },
          401: { description: "Invalid refresh token" }
        }
      }
    },
    "/events": {
      get: {
        summary: "List all events (cached in Redis + HTTP cache)",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer" } },
          { name: "limit", in: "query", schema: { type: "integer" } }
        ],
        responses: {
          200: { description: "List of events" },
          304: { description: "Not Modified (ETag match)" }
        }
      },
      post: {
        summary: "Create event (Admin only, invalidates cache)",
        security: [{ BearerAuth: [] }],
        responses: {
          201: { description: "Event created" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - Admin required" }
        }
      }
    },
    "/events/{id}": {
      get: {
        summary: "Get event by ID (cached)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Event details" },
          404: { description: "Event not found" }
        }
      }
    },
    "/events/{id}/register": {
      post: {
        summary: "Register member to event",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          201: { description: "Registered" },
          409: { description: "Already registered or event full" }
        }
      }
    },
    "/chat": {
      post: {
        summary: "Send chat message, streams SSE AI response",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "SSE Stream (text/event-stream) or JSON" },
          429: { description: "Rate limit exceeded (max 20/min)" }
        }
      }
    },
    "/chat/history": {
      get: {
        summary: "Get last conversation history (never cached publicly)",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Conversation history" }
        }
      }
    }
  }
};

router.get("/openapi.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  return res.json(openApiSpec);
});

router.get("/docs", (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ITC Hub API - Interactive Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; background: #fafafa; font-family: sans-serif; }
    .topbar { background-color: #1e293b; color: white; padding: 12px 24px; font-weight: bold; font-size: 18px; }
  </style>
</head>
<body>
  <div class="topbar">ITC Hub API Documentation (OpenAPI 3.0)</div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        url: '/api/openapi.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout",
        deepLinking: true
      });
    };
  </script>
</body>
</html>`;
  return res.send(html);
});

export default router;
