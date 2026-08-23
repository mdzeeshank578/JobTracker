import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function authenticateUser(req, res, next) {
  const reqUrl = req.originalUrl || req.url || '';
  
  // Public routes bypass token enforcement
  if (
    reqUrl.includes('/api/health') ||
    reqUrl.includes('/api/auth/register') ||
    reqUrl.includes('/api/auth/login') ||
    reqUrl.includes('/api/auth/google') ||
    reqUrl.includes('/api/auth/connect') ||
    reqUrl.includes('/api/auth/callback')
  ) {
    return next();
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;

  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: '401 Unauthorized: Missing authorization token'
    });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const userId = decoded.id || decoded.uid || decoded.userId || decoded.sub;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        statusCode: 401,
        message: '401 Unauthorized: Invalid token payload'
      });
    }

    req.user = {
      id: userId,
      email: decoded.email
    };
    req.userId = userId;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: '401 Unauthorized: Invalid or expired token',
      error: error.message
    });
  }
}

export const authMiddleware = authenticateUser;
export default authenticateUser;
