import { backfillImages } from '../services/imageAnalysis.service';
(async () => {
  const r = await backfillImages(Number(process.argv[2] || 500));
  console.log(JSON.stringify(r));
  process.exit(0);
})().catch((e) => { console.error(e?.message); process.exit(1); });
