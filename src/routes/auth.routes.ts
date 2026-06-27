import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import prisma from '../lib/prisma';
import { requireAuth } from '../middleware/auth.middleware';
import { checkBruteForce, checkNewIP, alertUnauthorizedAccess } from '../services/security.service';
import {
  mailWelcome,
  mailAdminNewRegistration,
  mailPasswordReset,
  mailEmailVerification,
  mailResendVerification,
} from '../services/mail.service';

const router = Router();

// Rate limiter: max 10 auth attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function issueToken(userId: number): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'],
  });
}

async function isLocked(email: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  const count = await prisma.loginAttempt.count({
    where: { email, attemptedAt: { gte: cutoff } },
  });
  return count >= 5;
}

async function recordAttempt(email: string, ip: string): Promise<void> {
  await prisma.loginAttempt.create({ data: { email, ipAddress: ip } });
}

async function clearAttempts(email: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { email } });
}

// ── GET /api/auth/me ─────────────────────────────────
router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ user: req.user });
});

// ── POST /api/auth/register ──────────────────────────
const registerSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

router.post('/register', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const { name, email, password } = parsed.data;
  const roleParam = req.body.role || 'farmer';
  const roleMap: Record<string, string> = { farmer: 'admin', buyer: 'admin', vet: 'admin' };
  const assignedRole = roleMap[roleParam] || 'admin';

  // Check registration mode
  const modeFlag = await prisma.featureFlag.findFirst({
    where: { flagKey: 'registration_mode' },
  });
  const regMode = modeFlag?.value || 'open';

  if (regMode === 'disabled') {
    res.status(403).json({ error: 'Registration is currently disabled.' });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const isActive = false; // Always false until email verified
  const registrationStatus = 'pending' as const; // Always pending until verified

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: assignedRole as any,
      isActive: false,
      registrationStatus: 'pending',
    },
  });
  await prisma.user.update({ where: { id: user.id }, data: { farmId: user.id } });
  // Set farmId to match user id (each user is their own farm tenant)
  await prisma.user.update({
    where: { id: user.id },
    data: { farmId: user.id },
  });

  await prisma.activityLog.create({
    data: { userId: user.id, action: 'register', entity: 'users', entityId: user.id },
  });

  // Generate verification token
  const verifyToken = crypto.randomBytes(32).toString('hex');
  const verifyHash = crypto.createHash('sha256').update(verifyToken).digest('hex');
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.emailVerification.create({
    data: { userId: user.id, tokenHash: verifyHash, expiresAt: verifyExpires },
  });

  await mailEmailVerification(email, name, verifyToken);
  await mailAdminNewRegistration(name, email, 'open');

  res.status(201).json({
    message: 'Account created. Please check your email to verify your account before logging in.',
  });
});

// ── POST /api/auth/login ─────────────────────────────
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean().optional(),
});

router.post('/login', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid credentials.' });
    return;
  }

  const { email, password, remember } = parsed.data;
  const ip = req.ip || '';

  if (await isLocked(email)) {
    res.status(429).json({ error: 'Account temporarily locked. Try again in 15 minutes.' });
    return;
  }

  const user = await prisma.user.findFirst({ where: { email, isActive: true } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    await recordAttempt(email, ip);
    await checkBruteForce(email, ip);
    res.status(401).json({ error: 'Incorrect email or password.' });
    return;
  }

  if (user.registrationStatus === 'pending') {
    res.status(403).json({ error: 'Please verify your email address before logging in. Check your inbox for the verification link.' });
    return;
  }

  await clearAttempts(email);
  await checkNewIP(user.id, ip, user.name, user.email);
  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  await prisma.activityLog.create({
    data: { userId: user.id, action: 'login', entity: 'users', entityId: user.id, ipAddress: ip },
  });

  const token = issueToken(user.id);
  const cookieOpts = remember ? COOKIE_OPTS : { ...COOKIE_OPTS, maxAge: undefined };
  res.cookie('token', token, cookieOpts);


  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, farmId: user.farmId },
  });
});

// ── POST /api/auth/logout ────────────────────────────
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'strict' });
  res.json({ message: 'Logged out.' });
});

// ── POST /api/auth/forgot-password ──────────────────
router.post('/forgot-password', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond the same to prevent email enumeration
  const MSG = 'If this email is registered, a reset link has been sent.';

  if (!user) {
    res.json({ message: MSG });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Store hashed token as a remember token with special purpose
  await prisma.rememberToken.create({
    data: { userId: user.id, tokenHash: crypto.createHash('sha256').update(token).digest('hex'), expiresAt: expires },
  });

  await mailPasswordReset(email, user.name, token);
  res.json({ message: MSG });
});

// ── POST /api/auth/reset-password ───────────────────
router.post('/reset-password', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const schema = z.object({
    token: z.string(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  });

  const { token, password } = schema.parse(req.body);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const record = await prisma.rememberToken.findFirst({
    where: { tokenHash, expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  if (!record) {
    res.status(400).json({ error: 'Reset link is invalid or has expired.' });
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: record.userId }, data: { password: hashed } });
  await prisma.rememberToken.delete({ where: { id: record.id } });

  res.json({ message: 'Password updated. You can now log in.' });
});

// ── GET /api/auth/google ─────────────────────────────
// Redirect to Google (simple redirect — no passport needed for basic flow)
router.get('/google', (req: Request, res: Response) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: process.env.GOOGLE_CALLBACK_URL || '',
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

// ── GET /api/auth/google/callback ───────────────────
router.get('/google/callback', async (req: Request, res: Response): Promise<void> => {
  const { code } = req.query;
  const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

  if (!code) {
    res.redirect(`${CLIENT_URL}/login?error=google_cancelled`);
    return;
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: process.env.GOOGLE_CALLBACK_URL || '',
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokens.access_token) throw new Error('No access token');

    // Get user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json() as { id: string; email: string; name: string };

    // Find or create user
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: profile.id }, { email: profile.email }] },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: profile.name,
          email: profile.email,
          password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
          role: 'admin',
          googleId: profile.id,
          isActive: true,
          registrationStatus: 'approved',
        },
      });
      await prisma.user.update({ where: { id: user.id }, data: { farmId: user.id } });
      await mailWelcome(profile.email, profile.name);
    } else if (!user.googleId) {
      await prisma.user.update({ where: { id: user.id }, data: { googleId: profile.id } });
    }

    if (!user.isActive) {
      res.redirect(`${CLIENT_URL}/login?error=account_inactive`);
      return;
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    const jwtToken = issueToken(user.id);
    res.cookie('token', jwtToken, COOKIE_OPTS);
    res.redirect(`${CLIENT_URL}/dashboard`);
  } catch (err) {
    console.error('[Google OAuth]', err);
    res.redirect(`${CLIENT_URL}/login?error=google_failed`);
  }
});

// ── POST /api/auth/init-superadmin ──────────────────
// Initialize first superadmin (only works if no superadmin exists)
const initSuperadminSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

router.post('/init-superadmin', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const parsed = initSuperadminSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  // Check if any superadmin already exists
  const existingSuperadmin = await prisma.user.findFirst({
    where: { role: 'superadmin' },
  });

  if (existingSuperadmin) {
    res.status(403).json({ error: 'A superadmin already exists. Contact your system administrator.' });
    return;
  }

  const { name, email, password } = parsed.data;

  // Check if email is already registered
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: 'superadmin',
      isActive: true,
      registrationStatus: 'approved',
    },
  });

  await prisma.activityLog.create({
    data: { userId: user.id, action: 'init_superadmin', entity: 'users', entityId: user.id },
  });

  await mailWelcome(email, name);

  const token = issueToken(user.id);
  res.cookie('token', token, COOKIE_OPTS);
  res.status(201).json({ 
    message: 'Superadmin created successfully.',
    user: { id: user.id, name, email, role: user.role } 
  });
});

export default router;

// ── GET /api/auth/verify-email ───────────────────────────────
router.get('/verify-email', async (req: Request, res: Response): Promise<void> => {
  const { token } = req.query;
  const CLIENT_URL = process.env.CLIENT_URL || 'https://agripulse.me';

  if (!token || typeof token !== 'string') {
    res.redirect(`${CLIENT_URL}/login?error=invalid_token`);
    return;
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const record = await prisma.emailVerification.findFirst({
    where: { tokenHash, expiresAt: { gt: new Date() } },
    include: { user: true },
  });

  if (!record) {
    res.redirect(`${CLIENT_URL}/login?error=token_expired`);
    return;
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: { isActive: true, registrationStatus: 'approved' },
  });

  await prisma.emailVerification.delete({ where: { id: record.id } });

  // Send welcome email after verification
  await mailWelcome(record.user.email, record.user.name);

  res.redirect(`${CLIENT_URL}/login?verified=1`);
});

// ── POST /api/auth/resend-verification ──────────────────────
router.post('/resend-verification', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  const MSG = 'If this email is registered and unverified, a new link has been sent.';

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.isActive || user.registrationStatus !== 'pending') {
    res.json({ message: MSG });
    return;
  }

  // Delete old tokens
  await prisma.emailVerification.deleteMany({ where: { userId: user.id } });

  // Create new token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.emailVerification.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  await mailResendVerification(email, user.name, token);
  res.json({ message: MSG });
});


// ── POST /api/auth/resend-verification ──────────────────────
router.post('/resend-verification', authLimiter, async (req: Request, res: Response): Promise<void> => {
  const { email } = z.object({ email: z.string().email() }).parse(req.body);
  const MSG = 'If this email is registered and unverified, a new link has been sent.';

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.isActive || user.registrationStatus !== 'pending') {
    res.json({ message: MSG });
    return;
  }

  // Delete old tokens
  await prisma.emailVerification.deleteMany({ where: { userId: user.id } });

  // Create new token
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.emailVerification.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  await mailResendVerification(email, user.name, token);
  res.json({ message: MSG });
});
