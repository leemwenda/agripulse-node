// Starts the automatic fraud-evidence sweep when the API process starts.
import { sweepImageAnalysis } from './imageAnalysis.service';

const INTERVAL_MS = 10 * 60 * 1000;

function runSweep() {
  sweepImageAnalysis(25)
    .then(r => { if (!('skipped' in r)) console.log('[ImageIntel] sweep', JSON.stringify(r)); })
    .catch(e => console.error('[ImageIntel] sweep failed', e?.message));
}

const boot = setTimeout(runSweep, 20000);
const timer = setInterval(runSweep, INTERVAL_MS);
boot.unref();
timer.unref();
