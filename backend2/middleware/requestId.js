import crypto from "crypto";

export const requestIdMiddleware = (req, res, next) => {
  const reqId = req.headers["x-request-id"] || crypto.randomUUID();
  req.id = reqId;
  res.setHeader("X-Request-Id", reqId);

  const startTime = process.hrtime();

  res.on("finish", () => {
    const diff = process.hrtime(startTime);
    const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);

    const structuredLog = {
      timestamp: new Date().toISOString(),
      requestId: req.id,
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: parseFloat(durationMs),
      ip: req.ip || req.socket?.remoteAddress,
      userAgent: req.headers["user-agent"]
    };

    console.log(JSON.stringify(structuredLog));
  });

  next();
};

export default requestIdMiddleware;
