import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "itc_hub_jwt_super_secret_key_2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "itc_hub_refresh_super_secret_key_2026";
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || "7d";

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id || user._id?.toString(),
      name: user.name,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user.id || user._id?.toString(),
      email: user.email,
      role: user.role
    },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
};

export const authMiddleware = (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      if (parts.length === 2 && parts[0] === "Bearer") {
        token = parts[1];
      } else {
        token = parts[0];
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required. No token provided."
        },
        message: "Authentication required. No token provided."
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      ...decoded,
      id: decoded.id || decoded._id,
      _id: decoded.id || decoded._id
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Invalid or expired authentication token."
      },
      message: "Invalid or expired authentication token."
    });
  }
};

export const chatAuthMiddleware = (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(" ");
      token = parts.length === 2 && parts[0] === "Bearer" ? parts[1] : parts[0];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = {
          ...decoded,
          id: decoded.id || decoded._id,
          _id: decoded.id || decoded._id
        };
        return next();
      } catch (err) {
      
      }
    }

    req.user = {
      id: "60c72b2f9b1d8b0015f8a000",
      name: "Visiteur",
      role: "member"
    };
    next();
  } catch (err) {
    next();
  }
};

/**
 * Role-Based Access Control middleware
 * @param {string} role 'member' | 'admin'
 */
export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required."
        },
        message: "Authentication required."
      });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Access denied. Requires '${role}' role.`
        },
        message: `Access denied. Requires '${role}' role.`
      });
    }

    next();
  };
};

export const requireAdmin = requireRole("admin");
export const requireMember = authMiddleware; 

export default authMiddleware;
