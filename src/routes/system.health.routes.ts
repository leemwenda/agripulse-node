import { Router, Request, Response } from 'express';
import { requireAuth, requireSuperAdmin } from '../middleware/auth.middleware';
import os from 'os';
import { execSync } from 'child_process';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth, requireSuperAdmin);

function safeExec(cmd: string): string {
  try { return execSync(cmd, { timeout: 5000 }).toString().trim(); }
  catch { return ''; }
}

router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    // ── CPU & Memory ──────────────────────────────
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;

    // ── Disk (via df) ─────────────────────────────
    let diskUsedPct = 0, diskTotal = '', diskUsed = '', diskAvail = '';
    const dfOut = safeExec("df -h / | tail -1");
    if (dfOut) {
      const parts = dfOut.split(/\s+/);
      diskTotal = parts[1]; diskUsed = parts[2]; diskAvail = parts[3];
      diskUsedPct = parseInt(parts[4]) || 0;
    }

    // ── Swap ──────────────────────────────────────
    let swapTotal = 0, swapUsed = 0;
    const swapOut = safeExec("free -b | grep Swap");
    if (swapOut) {
      const parts = swapOut.split(/\s+/);
      swapTotal = parseInt(parts[1]) || 0;
      swapUsed = parseInt(parts[2]) || 0;
    }

    // ── PM2 processes ─────────────────────────────
    let pm2Processes: any[] = [];
    const pm2Out = safeExec("pm2 jlist");
    if (pm2Out) {
      try {
        const parsed = JSON.parse(pm2Out);
        pm2Processes = parsed.map((p: any) => ({
          name: p.name,
          status: p.pm2_env?.status,
          pid: p.pid,
          uptime: p.pm2_env?.pm_uptime ? Date.now() - p.pm2_env.pm_uptime : 0,
          restarts: p.pm2_env?.restart_time ?? 0,
          memory: p.monit?.memory ?? 0,
          cpu: p.monit?.cpu ?? 0,
        }));
      } catch {}
    }

    // ── MySQL status ──────────────────────────────
    let dbConnections = 0, dbStatus = 'unknown';
    try {
      const result: any = await prisma.$queryRawUnsafe("SHOW STATUS LIKE 'Threads_connected'");
      dbConnections = parseInt(result?.[0]?.Value ?? '0');
      dbStatus = 'online';
    } catch { dbStatus = 'offline'; }

    // ── System uptime ─────────────────────────────
    const systemUptimeSec = os.uptime();

    res.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      cpu: {
        cores: cpuCount,
        loadAvg1: loadAvg[0],
        loadAvg5: loadAvg[1],
        loadAvg15: loadAvg[2],
        loadPct: Math.min(100, Math.round((loadAvg[0] / cpuCount) * 100)),
      },
      memory: {
        totalMB: Math.round(totalMem / 1024 / 1024),
        usedMB: Math.round(usedMem / 1024 / 1024),
        freeMB: Math.round(freeMem / 1024 / 1024),
        usedPct: Math.round((usedMem / totalMem) * 100),
      },
      swap: {
        totalMB: Math.round(swapTotal / 1024 / 1024),
        usedMB: Math.round(swapUsed / 1024 / 1024),
        usedPct: swapTotal > 0 ? Math.round((swapUsed / swapTotal) * 100) : 0,
      },
      disk: {
        total: diskTotal, used: diskUsed, avail: diskAvail, usedPct: diskUsedPct,
      },
      pm2: pm2Processes,
      database: { status: dbStatus, activeConnections: dbConnections },
      systemUptimeSec,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
