import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';

const router = Router();
router.use(requireAuth);

function requireSuperadmin(req: Request, res: Response, next: any) {
  if (req.user!.role !== 'superadmin') { res.status(403).json({ error: 'Superadmin access required.' }); return; }
  next();
}

// GET /api/vet-admin/all — list all vet profiles with verification status
router.get('/all', requireSuperadmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const vets = await prisma.vetProfile.findMany({
      include: { user: { select: { id: true, name: true, email: true, phone: true, county: true, createdAt: true } } },
      orderBy: [{ verificationStatus: 'asc' }, { createdAt: 'desc' }],
    });
    res.json({ vets });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

// PATCH /api/vet-admin/:id/verify — approve/reject a vet
router.patch('/:id/verify', requireSuperadmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id));
    const { status } = req.body;
    if (!['verified', 'rejected', 'pending'].includes(status)) { res.status(400).json({ error: 'status must be verified, rejected, or pending.' }); return; }

    const profile = await prisma.vetProfile.update({
      where: { id },
      data: { verificationStatus: status },
      include: { user: { select: { name: true, email: true } } },
    });
    res.json({ profile });
  } catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;
