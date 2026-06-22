import prisma from '../lib/prisma';
import { mailSecurityAlert, mailDailySecuritySummary } from './mail.service';

const ADMIN_EMAILS = ['leemwenda8714@gmail.com', 'agripulse254@gmail.com'];

// ── Track known IPs per user ──────────────────────────────────
export async function checkNewIP(userId: number, ip: string, userName: string, email: string): Promise<void> {
  try {
    const recentLogins = await prisma.activityLog.findMany({
      where: { userId, action: 'login' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const knownIPs = recentLogins.map((l: { ipAddress: string | null }) => l.ipAddress).filter(Boolean);
    if (knownIPs.length > 0 && !knownIPs.includes(ip)) {
      await mailSecurityAlert({
        type: 'new_ip_login',
        title: 'New Location Login Detected',
        message: `User <strong>${userName}</strong> (${email}) just logged in from a new IP address.`,
        ip,
        details: [
          ['User', userName],
          ['Email', email],
          ['New IP', ip],
          ['Known IPs', knownIPs.slice(0, 3).join(', ')],
          ['Time', new Date().toISOString()],
        ],
      });
    }
  } catch (err) {
    console.error('[Security] checkNewIP error:', err);
  }
}

// ── Brute force detection ─────────────────────────────────────
export async function checkBruteForce(email: string, ip: string): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const count = await prisma.loginAttempt.count({
      where: { email, attemptedAt: { gte: cutoff } },
    });
    if (count === 3 || count === 5) {
      await mailSecurityAlert({
        type: 'brute_force',
        title: `Brute Force Attack Detected (${count} attempts)`,
        message: `Multiple failed login attempts detected for <strong>${email}</strong>.`,
        ip,
        details: [
          ['Target Email', email],
          ['Attacker IP', ip],
          ['Failed Attempts', String(count)],
          ['Window', 'Last 15 minutes'],
          ['Time', new Date().toISOString()],
          ['Action', count >= 5 ? 'Account locked for 15 minutes' : 'Warning threshold reached'],
        ],
      });
    }
  } catch (err) {
    console.error('[Security] checkBruteForce error:', err);
  }
}

// ── Unauthorized admin access attempt ─────────────────────────
export async function alertUnauthorizedAccess(ip: string, path: string, userEmail?: string): Promise<void> {
  try {
    await mailSecurityAlert({
      type: 'unauthorized_access',
      title: 'Unauthorized Admin Access Attempt',
      message: `Someone tried to access a protected admin route without permission.`,
      ip,
      details: [
        ['Route Attempted', path],
        ['IP Address', ip],
        ['User', userEmail || 'Not authenticated'],
        ['Time', new Date().toISOString()],
      ],
    });
  } catch (err) {
    console.error('[Security] alertUnauthorizedAccess error:', err);
  }
}

// ── Suspicious request detection ─────────────────────────────
const recentSuspiciousAlerts = new Map<string, number>();

export async function alertSuspiciousRequest(ip: string, path: string, reason: string): Promise<void> {
  const now = Date.now();
  const last = recentSuspiciousAlerts.get(ip) || 0;
  if (now - last < 10 * 60 * 1000) return;
  recentSuspiciousAlerts.set(ip, now);
  try {
    await mailSecurityAlert({
      type: 'suspicious_request',
      title: 'Suspicious Request Detected',
      message: `A potentially malicious request was blocked on AgriPulse.`,
      ip,
      details: [
        ['Reason', reason],
        ['Path', path],
        ['IP Address', ip],
        ['Time', new Date().toISOString()],
      ],
    });
  } catch (err) {
    console.error('[Security] alertSuspiciousRequest error:', err);
  }
}

// ── Daily security summary ────────────────────────────────────
export async function sendDailySecuritySummary(): Promise<void> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [failedLogins, newUsers, successfulLogins, activeUsers] = await Promise.all([
      prisma.loginAttempt.count({ where: { attemptedAt: { gte: since } } }),
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.activityLog.count({ where: { action: 'login', createdAt: { gte: since } } }),
      prisma.user.count({ where: { isActive: true } }),
    ]);

    // Get top attacking IPs
    const attempts = await prisma.loginAttempt.groupBy({
      by: ['ipAddress'],
      where: { attemptedAt: { gte: since } },
      _count: { ipAddress: true },
      orderBy: { _count: { ipAddress: 'desc' } },
      take: 5,
    });

    const topAttackers = attempts.map((a: { ipAddress: string | null; _count: { ipAddress: number } }) =>
      `${a.ipAddress ?? 'unknown'} (${a._count.ipAddress} attempts)`
    ).join(', ') || 'None';

    await mailDailySecuritySummary({
      failedLogins,
      successfulLogins,
      newUsers,
      activeUsers,
      topAttackers,
      date: new Date().toLocaleDateString('en-KE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
    });
  } catch (err) {
    console.error('[Security] sendDailySecuritySummary error:', err);
  }
}
