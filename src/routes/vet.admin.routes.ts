import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import { mailVetVerificationDecision } from '../services/mail.service';

const router = Router();
router.use(requireAuth);

function requireSuperadmin(req: Request, res: Response, next: any) {
  if (req.user!.role !== 'superadmin') { res.status(403).json({ error: 'Superadmin access required.' }); return; }
  next();
}

// GET /api/vet-admin/all - list all vet profiles with verification status
router.get('/all', requireSuperadmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const vets = await prisma.vetProfile.findMany({
      include: { user: { select: { id: true, name: true, email: true, phone: true, county: true, createdAt: true } } },
      orderBy: [{ verificationStatus: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ vets });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// PATCH /api/vet-admin/:id/verify - approve / reject / reset a vet (optional reason, emails the vet, audit-logged)
router.patch('/:id/verify', requireSuperadmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const { status } = req.body;
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
    if (!['verified', 'rejected', 'pending'].includes(status)) { res.status(400).json({ error: 'status must be verified, rejected, or pending.' }); return; }

    const before = await prisma.vetProfile.findUnique({ where: { id }, select: { verificationStatus: true } });
    if (!before) { res.status(404).json({ error: 'Vet profile not found.' }); return; }

    const profile = await prisma.vetProfile.update({
      where: { id },
      data: { verificationStatus: status },
      include: { user: { select: { name: true, email: true } } },
    });

    try {
      const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim() || null;
      await prisma.activityLog.create({
        data: {
          userId: req.user!.id,
          action: status === 'verified' ? 'vet_approved' : status === 'rejected' ? 'vet_rejected' : 'vet_reset_pending',
          entity: 'vet_profile',
          entityId: id,
          ipAddress: ip,
        },
      });
    } catch (e) { console.error('[VetVerify] audit log failed:', e); }

    if (before.verificationStatus !== status && status !== 'pending' && profile.user?.email) {
      mailVetVerificationDecision(profile.user.email, profile.user.name, status, reason).catch(e => console.error('[VetVerify] email failed:', e));
    }

    res.json({ profile });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;
