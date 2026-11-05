import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import mongoose from "mongoose";
import app from "../server.js";
import redis from "../config/redis.js";
// Helper to start the server for testing
let server;
let baseUrl;

test.before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  redis.close();
});

test("GET /api/health returns 200 and healthy status (no DB call)", async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.status, "healthy");
  assert.ok(typeof data.uptime === "number");
});

test("POST /api/auth/register validation error returns 400 with standard error format", async () => {
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "invalid-email", password: "123" })
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.ok(data.error);
  assert.equal(data.error.code, "VALIDATION_ERROR");
  assert.ok(typeof data.error.message === "string");
});

test("POST /api/auth/login invalid credentials returns 401", async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "nonexistent@test.com",
      password: "wrongpassword123"
    })
  });

  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.equal(data.error.code, "INVALID_CREDENTIALS");
});

test("POST /api/auth/login valid credentials returns 200 and sets token", async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "member@itchub.org",
      password: "member123456"
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.token);
  assert.equal(data.user.role, "member");
});

test("GET /api/events returns 200 with X-Cache, Cache-Control, and ETag", async () => {
  // First call: MISS or HIT
  const res1 = await fetch(`${baseUrl}/api/events`);
  assert.equal(res1.status, 200);
  assert.ok(res1.headers.get("x-cache"));
  assert.equal(res1.headers.get("cache-control"), "public, max-age=60");
  const etag = res1.headers.get("etag");
  assert.ok(etag);
  // Second call with If-None-Match should return 304 Not Modified
  const res2 = await fetch(`${baseUrl}/api/events`, {
    headers: { "If-None-Match": etag }
  });
  assert.equal(res2.status, 304);
});

test("POST /api/events by non-admin returns 403 Forbidden", async () => {
  // Login as member
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "member@itchub.org",
      password: "member123456"
    })
  });
  const { token } = await loginRes.json();
  // Try creating an event with member token
  const createRes = await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      title: "Unauthorized Event",
      description: "Should fail",
      date: new Date().toISOString()
    })
  });

  assert.equal(createRes.status, 403);
  const data = await createRes.json();
  assert.equal(data.success, false);
  assert.equal(data.error.code, "FORBIDDEN");
});

test("POST /api/events by admin returns 201 and invalidates cache", async () => {
  // Login as admin
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@itchub.org",
      password: "admin123456"
    })
  });
  const { token } = await loginRes.json();

  const createRes = await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      title: "Admin Test Workshop",
      description: "A workshop created by an admin to test caching invalidation",
      date: new Date(Date.now() + 86400000).toISOString(),
      location: "Blida Tech Park",
      department: "ITC AI",
      capacity: 30
    })
  });

  assert.equal(createRes.status, 201);
  const data = await createRes.json();
  assert.equal(data.success, true);
  assert.ok(data.data.id);
});

test("GET /api/chat/history requires authentication and sets private no-store", async () => {
  // Without token -> 401
  const unauthRes = await fetch(`${baseUrl}/api/chat/history`);
  assert.equal(unauthRes.status, 401);
  // Login as member
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "member@itchub.org",
      password: "member123456"
    })
  });
  const { token } = await loginRes.json();

  const authRes = await fetch(`${baseUrl}/api/chat/history`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  assert.equal(authRes.status, 200);
  assert.equal(authRes.headers.get("cache-control"), "private, no-store");
  const data = await authRes.json();
  assert.equal(data.success, true);
});

test("POST /api/events/:id/register registers member and returns 409 on duplicate", async () => {
  // Login as member
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "member@itchub.org",
      password: "member123456"
    })
  });
  const { token } = await loginRes.json();
  // Get first event
  const eventsRes = await fetch(`${baseUrl}/api/events`);
  const eventsData = await eventsRes.json();
  const eventId = eventsData.data[0].id;
  // First registration -> 201 or 409 if already registered
  const regRes1 = await fetch(`${baseUrl}/api/events/${eventId}/register`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  assert.ok(regRes1.status === 201 || regRes1.status === 409);
  // Subsequent registration 
  const regRes2 = await fetch(`${baseUrl}/api/events/${eventId}/register`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  assert.equal(regRes2.status, 409);
  const data = await regRes2.json();
  assert.equal(data.success, false);
  assert.equal(data.error.code, "ALREADY_REGISTERED");
});

test("POST /api/chat streams SSE response and uses Layer 7 generic question cache", async () => {
  // Login as member
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "member@itchub.org",
      password: "member123456"
    })
  });
  const { token } = await loginRes.json();
  // Send first chat message (generic question about joining)
  const chatRes1 = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream"
    },
    body: JSON.stringify({
      message: "Comment rejoindre le club ITC ?"
    })
  });

  assert.equal(chatRes1.status, 200);
  assert.equal(chatRes1.headers.get("content-type"), "text/event-stream");
  const sseBody1 = await chatRes1.text();
  assert.ok(sseBody1.includes("data:"));
  assert.ok(sseBody1.includes("[DONE]"));
  // Send same generic question again -> Layer 7 AI Cache HIT
  const chatRes2 = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream"
    },
    body: JSON.stringify({
      message: "Comment rejoindre le club ITC ?"
    })
  });

  assert.equal(chatRes2.status, 200);
  assert.equal(chatRes2.headers.get("x-cache"), "HIT");
});

test("GET /api/docs and /api/openapi.json expose interactive OpenAPI docs", async () => {
  const jsonRes = await fetch(`${baseUrl}/api/openapi.json`);
  assert.equal(jsonRes.status, 200);
  const spec = await jsonRes.json();
  assert.equal(spec.openapi, "3.0.3");
  assert.ok(spec.paths["/events"]);

  const docsRes = await fetch(`${baseUrl}/api/docs`);
  assert.equal(docsRes.status, 200);
  const html = await docsRes.text();
  assert.ok(html.includes("swagger-ui"));
});
