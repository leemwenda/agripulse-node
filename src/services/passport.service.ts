import crypto from 'crypto';
import prisma from '../lib/prisma';

export async function generateAgripulseId(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const id = 'AP-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    const existing = await prisma.animal.findUnique({ where: { agripulseId: id } });
    if (!existing) return id;
  }
  throw new Error('Could not generate unique AgriPulse ID after 10 attempts');
}
