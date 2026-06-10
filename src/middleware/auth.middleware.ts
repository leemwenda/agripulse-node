import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  farmId: number | null;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function extractToken(req: Request): string | null {
  // 1. HttpOnly cookie (preferred)
  if (req.cookies?.token) return req.cookies.token;
  // 2. Authorization header fallback
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
    const user = await prisma.user.findFirst({
      where: { id: payload.userId, isActive: true },
      select: { id: true, name: true, email: true, role: true, farmId: true, isActive: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    req.user = user as AuthUser;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireRole('admin', 'superadmin')(req, res, next);
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  requireRole('superadmin')(req, res, next);
}

// Returns the farm ID for the current user
// Admin = their own user ID; Worker = their farm_id
export function getFarmId(user: AuthUser): number {
  if (user.role === 'admin') return user.id;
  return user.farmId ?? 0;
}
