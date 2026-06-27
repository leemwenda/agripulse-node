import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.routes';
import passportRoutes from './routes/passport.routes';
import marketplaceRoutes from './routes/marketplace.routes';
import animalsRoutes from './routes/animals.routes';
import { milkRouter, healthRouter, breedingRouter, financialRouter } from './routes/data.routes';
import { startAnimalCategoryCron, updateAllAnimalCategories } from './services/animalCategory.service';
import { dashboardRouter, workersRouter, aiRouter, adminRouter, reportsRouter, profileRouter, notificationsRouter, issuesRouter } from './routes/extra.routes';

const app = express();
const PORT = parseInt(process.env.PORT || '5000');

// ── Security Middleware ──────────────────────────────────────
// Trust nginx proxy
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  contentSecurityPolicy: false,
}));

const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'https://agripulse.me',
  'https://www.agripulse.me',
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Global rate limit: 100 requests per 15 min per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/api/health',
}));

// Strict auth rate limit: 10 attempts per 15 min
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again in 15 minutes.' },
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// ── Suspicious request detection ─────────────────────────────
app.use((req, res, next) => {
  const ip = req.ip || '';
  const path = req.path;
  const body = JSON.stringify(req.body || '');
  const query = JSON.stringify(req.query || '');
  const combined = body + query + path;
  
  const sqlPatterns = /(\bunion\b.{1,20}\bselect\b|\bselect\b.{1,40}\bfrom\b|\bdrop\b\s+\btable\b|\bor\b\s+1\s*=\s*1|--\s|\/\*.*\*\/|;\s*drop\b)/i;
  const xssPatterns = /<script|javascript:|onerror=|onload=/i;
  
  if (sqlPatterns.test(combined) || xssPatterns.test(combined)) {
    const { alertSuspiciousRequest } = require('./services/security.service');
    alertSuspiciousRequest(ip, path, sqlPatterns.test(combined) ? 'Possible SQL injection' : 'Possible XSS attack').catch(console.error);
  }
  next();
});

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',      authLimiter, authRoutes);
app.use('/api/animals',   animalsRoutes);
app.use('/api/milk',      milkRouter);
app.use('/api/animal-health', healthRouter);
app.use('/api/breeding',  breedingRouter);
app.use('/api/financial', financialRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/workers',   workersRouter);
app.use('/api/ai',        aiRouter);
app.use('/api/admin',         adminRouter);
app.use('/api/reports',       reportsRouter);
app.use('/api/profile',       profileRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/issues',        issuesRouter);
app.use('/api/passport',      passportRoutes);
app.use('/api/marketplace',   marketplaceRoutes);


// ── Sentry test route (remove after testing) ─────────────────
app.get('/api/debug-sentry', (_req, _res) => {
  throw new Error('Sentry test error from AgriPulse API');
});


// ── Sentry test route (remove after testing) ─────────────────
app.get('/api/debug-sentry', (_req, _res) => {
  throw new Error('Sentry test error from AgriPulse API');
});

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', name: 'AgriPulse API' });
});

// ── 404 ──────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ─────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.listen(PORT, async () => {
  console.log(`\n🌿 AgriPulse API v2.0`);
  console.log(`   Server : http://localhost:${PORT}`);
  console.log(`   Client : ${process.env.CLIENT_URL}`);
  console.log(`   Mode   : ${process.env.NODE_ENV}\n`);
  await updateAllAnimalCategories();
  startAnimalCategoryCron();
});
