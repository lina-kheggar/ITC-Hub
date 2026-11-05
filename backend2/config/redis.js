import net from "net";
/**
 * High-performance Cache Service implementing Redis RESP protocol
 * with transparent In-Memory fallback and Cache Stampede protection.*/
class RedisClient {
  constructor() {
    this.memoryStore = new Map();
    this.inFlightLocks = new Map();
    this.isRedisConnected = false;
    this.socket = null;
    this.pendingCallbacks = [];
    this.buffer = "";
    
    setInterval(() => this.cleanupMemoryStore(), 30000).unref();

    this.initRedis();
  }

  initRedis() {
    try {
      const url = new URL(process.env.REDIS_URL || "redis://127.0.0.1:6379");
      const host = url.hostname || "127.0.0.1";
      const port = parseInt(url.port || "6379", 10);

      this.socket = new net.Socket();
      this.socket.setTimeout(2000);

      this.socket.connect(port, host, () => {
        this.isRedisConnected = true;
        console.log(`[Cache] Connected to Redis at ${host}:${port}`);
      });

      this.socket.on("data", (data) => {
        this.handleRedisData(data.toString());
      });

      this.socket.on("timeout", () => {
        this.socket.destroy();
      });

      this.socket.on("error", () => {
        this.isRedisConnected = false;
        
      });

      this.socket.on("close", () => {
        this.isRedisConnected = false;
      });
    } catch (err) {
      this.isRedisConnected = false;
    }
  }

  handleRedisData(data) {
    this.buffer += data;
    while (this.pendingCallbacks.length > 0 && this.buffer.length > 0) {
      const cb = this.pendingCallbacks.shift();
      cb(this.buffer);
      this.buffer = "";
    }
  }

  cleanupMemoryStore() {
    const now = Date.now();
    for (const [key, item] of this.memoryStore.entries()) {
      if (item.expiresAt && item.expiresAt <= now) {
        this.memoryStore.delete(key);
      }
    }
  }
  /**
   * Get a cached string value
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  async get(key) {
    if (this.isRedisConnected && this.socket) {
      try {
        return await new Promise((resolve) => {
          this.pendingCallbacks.push((res) => {
            if (res.startsWith("$-1")) return resolve(null);
            const lines = res.split("\r\n");
            resolve(lines[1] || null);
          });
          this.socket.write(`*2\r\n$3\r\nGET\r\n$${Buffer.byteLength(key)}\r\n${key}\r\n`);
        });
      } catch (err) {
        
      }
    }

    const item = this.memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt <= Date.now()) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.value;
  }
  /**
   * Set a cached value with optional TTL
   * @param {string} key
   * @param {string} value
   * @param {{ EX?: number }} options
   */
  async set(key, value, options = {}) {
    const strValue = typeof value === "string" ? value : JSON.stringify(value);
    const ttlSeconds = options.EX || options.ex || 300;

    if (this.isRedisConnected && this.socket) {
      try {
        const cmd = `*4\r\n$3\r\nSET\r\n$${Buffer.byteLength(key)}\r\n${key}\r\n$${Buffer.byteLength(
          strValue
        )}\r\n${strValue}\r\n$2\r\nEX\r\n$${ttlSeconds.toString().length}\r\n${ttlSeconds}\r\n`;
        this.socket.write(cmd);
      } catch (err) {
        
      }
    }

    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.memoryStore.set(key, { value: strValue, expiresAt });
    return "OK";
  }
  /**
   * Delete a key
   * @param {string} key
   */
  async del(key) {
    if (this.isRedisConnected && this.socket) {
      try {
        this.socket.write(`*2\r\n$3\r\nDEL\r\n$${Buffer.byteLength(key)}\r\n${key}\r\n`);
      } catch (err) {
        // Fallback
      }
    }
    this.memoryStore.delete(key);
    return 1;
  }
  /**
   * Delete keys matching wildcard pattern 
   * @param {string} pattern
   */
  async delPattern(pattern) {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    for (const key of Array.from(this.memoryStore.keys())) {
      if (regex.test(key)) {
        this.memoryStore.delete(key);
      }
    }
  }
  /**
   * Increment numeric counter
   * @param {string} key
   */
  async incr(key) {
    const item = this.memoryStore.get(key);
    let val = item && !isNaN(parseInt(item.value, 10)) ? parseInt(item.value, 10) : 0;
    val += 1;
    this.memoryStore.set(key, {
      value: val.toString(),
      expiresAt: item ? item.expiresAt : null
    });
    return val;
  }
  /**
   * Set expiration in seconds
   * @param {string} key
   * @param {number} seconds
   */
  async expire(key, seconds) {
    const item = this.memoryStore.get(key);
    if (item) {
      item.expiresAt = Date.now() + seconds * 1000;
      this.memoryStore.set(key, item);
      return 1;
    }
    return 0;
  }
  /** * Close connections */
  close() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }
  /** * Cache Stampede protection 
   * Prevents multiple concurrent slow DB queries for the same key.*/
  async withStampedeProtection(key, fetchFn) {
    if (this.inFlightLocks.has(key)) {
      return await this.inFlightLocks.get(key);
    }

    const promise = (async () => {
      try {
        return await fetchFn();
      } finally {
        this.inFlightLocks.delete(key);
      }
    })();

    this.inFlightLocks.set(key, promise);
    return await promise;
  }
}

export const redis = new RedisClient();
export default redis;
