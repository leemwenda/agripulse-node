import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Baby, Heart, Milk, Info, Shield, Download, Printer, Share2, ArrowRightLeft } from 'lucide-react';
import { QRCode as QRCodeCanvas } from 'react-qrcode-logo';
import jsPDF from 'jspdf';
import api from '../lib/api';
import { PageLoader } from '../components/ui';
import { useTheme } from '../context/ThemeContext';
import { getBreedingStage } from '../lib/breedingStage';

const TABS = [
  { id: 'overview',  label: 'Overview', icon: Info },
  { id: 'passport',  label: 'Passport', icon: Shield },
  { id: 'breeding',  label: 'Breeding', icon: Baby },
  { id: 'health',    label: 'Health',   icon: Heart },
  { id: 'milk',      label: 'Milk',     icon: Milk },
];

function InfoCard({ label, value, dark }: { label: string; value: string; dark: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${dark ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-gray-50'}`}>
      <div className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${dark ? 'text-white/35' : 'text-gray-400'}`}>{label}</div>
      <div className={`text-sm font-semibold capitalize ${dark ? 'text-white/85' : 'text-gray-800'}`}>{value}</div>
    </div>
  );
}

function StatBadge({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="rounded-xl p-4 border border-white/8 bg-white/3">
      <div className="text-xs font-bold uppercase tracking-widest mb-1.5 text-white/35">{label}</div>
      <div className="text-2xl font-black" style={{ color }}>{value}</div>
    </div>
  );
}

function PassportTab({ animal, dark }: { animal: any; dark: boolean }) {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureData, setSignatureData] = useState<string>('');
  const [signatureName, setSignatureName] = useState('');
  const [sigMode, setSigMode] = useState<'draw'|'type'>('type');

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const c = sigCanvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    setIsSigning(true);
    const rect = c.getBoundingClientRect();
    ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSigning) return;
    const c = sigCanvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const rect = c.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#15803d'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
  };
  const endDraw = () => {
    setIsSigning(false);
    const c = sigCanvasRef.current; if (!c) return;
    setSignatureData(c.toDataURL());
  };
  const clearSig = () => {
    const c = sigCanvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    setSignatureData('');
  };
  const getSignature = (): string => {
    if (sigMode === 'type' && signatureName.trim()) {
      const c = document.createElement('canvas'); c.width = 300; c.height = 80;
      const ctx = c.getContext('2d'); if (!ctx) return '';
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 300, 80);
      ctx.font = 'italic 32px Georgia'; ctx.fillStyle = '#15803d';
      ctx.fillText(signatureName, 10, 52);
      return c.toDataURL();
    }
    return signatureData;
  };
  const passportUrl = `https://agripulse.me/animal/${animal.agripulseId}`;
  const [transferEmail, setTransferEmail] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferCode, setTransferCode] = useState('');
  const [transferId, setTransferId] = useState<number | null>(null);
  const [refreshingCode, setRefreshingCode] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  // Verification logic: animal must be on farm 4+ months AND have records
  const ageMonths = Math.floor((Date.now() - new Date(animal.dateOfBirth).getTime()) / (86400000 * 30.44));
  const createdMonths = Math.floor((Date.now() - new Date(animal.createdAt).getTime()) / (86400000 * 30.44));
  const hasRecords = (animal.healthRecords?.length || 0) + (animal.milkProduction?.length || 0) > 0;
  const isVerified = createdMonths >= 4 && hasRecords;

  const downloadQR = () => {
    const canvas = document.querySelector('#animal-qr-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${animal.agripulseId}-qr.png`;
    a.click();
  };

  const printQR = () => {
    const canvas = document.querySelector('#animal-qr-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('');
    if (!win) return;
    win.document.write(`
      <html><body style="text-align:center;padding:40px;font-family:sans-serif">
        <h2 style="font-size:14px;color:#15803d">AgriPulse Digital Passport</h2>
        <p style="font-size:11px;color:#666">${animal.name} &mdash; ${animal.tagNumber}</p>
        <img src="${dataUrl}" style="width:200px;height:200px;margin:16px auto;display:block" />
        <p style="font-family:monospace;font-size:13px;font-weight:bold">${animal.agripulseId}</p>
        <p style="font-size:10px;color:#999">Scan to view full digital passport</p>
      </body></html>
    `);
    win.print();
  };

  const shareQR = async () => {
    if (navigator.share) {
      await navigator.share({ title: `${animal.name} Passport`, url: passportUrl });
    } else {
      await navigator.clipboard.writeText(passportUrl);
      alert('Passport link copied to clipboard!');
    }
  };

  const downloadPDF = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210; const H = 297; const pad = 14;
    let y = 0;

    // ── Logo ──────────────────────────────────────────
    try {
      const logoRes = await fetch('/agripulse-logo.png');
      const logoBlob = await logoRes.blob();
      const logoData = await new Promise<string>(resolve => {
        const r = new FileReader(); r.onload = () => resolve(r.result as string); r.readAsDataURL(logoBlob);
      });
      doc.addImage(logoData, 'PNG', pad, 8, 18, 18);
    } catch {}

    // ── Header bar ────────────────────────────────────
    doc.setFillColor(21, 128, 61);
    doc.rect(0, 0, W, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text('AGRIPULSE DIGITAL PASSPORT', 36, 11);
    doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text(animal.name.toUpperCase(), 36, 24);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text((animal.breed || '') + ' · ' + (animal.gender || '') + ' · ' + (animal.category || ''), 36, 31);

    // ID box top right
    doc.setFillColor(22, 101, 52);
    doc.roundedRect(W - 68, 7, 54, 22, 2, 2, 'F');
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text('AgriPulse ID', W - 65, 14);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text(animal.agripulseId || '—', W - 65, 23);
    y = 46;

    // ── Animal photo + QR side by side ───────────────
    const photoUrl = animal.photos?.[0]?.url;
    if (photoUrl) {
      try {
        const imgRes = await fetch(photoUrl);
        const imgBlob = await imgRes.blob();
        const imgData = await new Promise<string>(resolve => {
          const r = new FileReader(); r.onload = () => resolve(r.result as string); r.readAsDataURL(imgBlob);
        });
        const ext = photoUrl.split('.').pop()?.toUpperCase() === 'JPG' ? 'JPEG' : 'PNG';
        doc.addImage(imgData, ext, pad, y, 52, 42);
      } catch {}
    }

    // QR code — top right of photo area
    const qrCanvas = document.querySelector('#animal-qr-canvas canvas, canvas#animal-qr-canvas, #animal-qr-canvas') as HTMLCanvasElement;
    if (qrCanvas) {
      const qrData = qrCanvas.toDataURL('image/png');
      doc.addImage(qrData, 'PNG', W - pad - 40, y, 40, 40);
      doc.setTextColor(100, 116, 139); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
      doc.text('Scan to view digital passport', W - pad - 40, y + 43);
    }
    y += 50;

    // ── Identity section ─────────────────────────────
    doc.setTextColor(21, 128, 61); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('IDENTITY', pad, y);
    doc.setDrawColor(21, 128, 61); doc.setLineWidth(0.3);
    doc.line(pad, y + 2, W - pad, y + 2);
    doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const dob = new Date(animal.dateOfBirth);
    const ageM = Math.floor((Date.now() - dob.getTime()) / (86400000 * 30.44));
    const ageStr = ageM >= 12 ? Math.floor(ageM/12) + 'y ' + (ageM%12) + 'm' : ageM + ' months';
    const idFields = [
      ['Tag Number', animal.tagNumber], ['Breed', animal.breed],
      ['Gender', animal.gender],        ['Color', animal.color || '—'],
      ['Date of Birth', dob.toLocaleDateString('en-GB')], ['Age', ageStr],
      ['Status', animal.status],        ['Country', 'Kenya'],
    ];
    idFields.forEach(([label, val], i) => {
      const col = i % 2 === 0 ? pad : W / 2 + 2;
      const row = y + 8 + Math.floor(i / 2) * 9;
      doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal'); doc.text(label, col, row);
      doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'bold'); doc.text(String(val), col, row + 4.5);
      doc.setFont('helvetica', 'normal');
    });
    y += 50;

    // ── Health section ───────────────────────────────
    doc.setTextColor(21, 128, 61); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('HEALTH SUMMARY', pad, y);
    doc.line(pad, y + 2, W - pad, y + 2);
    doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const vaccs = (animal.healthRecords || []).filter((h: any) => h.vaccination);
    const treats = (animal.healthRecords || []).filter((h: any) => h.treatment);
    doc.text('Total Records: ' + (animal.healthRecords?.length || 0), pad, y + 9);
    doc.text('Vaccinations: ' + vaccs.length, pad + 55, y + 9);
    doc.text('Treatments: ' + treats.length, pad + 110, y + 9);
    if (vaccs.length > 0) {
      doc.setTextColor(100, 116, 139); doc.text('Recent vaccinations:', pad, y + 16);
      doc.setTextColor(30, 41, 59);
      vaccs.slice(0, 3).forEach((v: any, i: number) => {
        doc.text('• ' + v.vaccination + '  (' + new Date(v.recordDate).toLocaleDateString('en-GB') + ')', pad + 4, y + 21 + i * 5);
      });
    }
    y += vaccs.length > 0 ? 24 + Math.min(vaccs.length, 3) * 5 : 18;

    // ── Breeding section ─────────────────────────────
    doc.setTextColor(21, 128, 61); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('BREEDING', pad, y);
    doc.line(pad, y + 2, W - pad, y + 2);
    doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const calvings = (animal.breeding || []).filter((b: any) => b.actualBirthDate).length;
    doc.text('Total Services: ' + (animal.breeding?.length || 0), pad, y + 9);
    doc.text('Calvings: ' + calvings, pad + 60, y + 9);
    y += 18;

    // ── Milk section ─────────────────────────────────
    if ((animal.milkProduction?.length || 0) > 0) {
      doc.setTextColor(21, 128, 61); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text('MILK PRODUCTION', pad, y);
      doc.line(pad, y + 2, W - pad, y + 2);
      doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      const total = animal.milkProduction.reduce((s: number, m: any) => s + Number(m.quantityLiters), 0);
      const avg = total / animal.milkProduction.length;
      doc.text('Records: ' + animal.milkProduction.length, pad, y + 9);
      doc.text('Total: ' + total.toFixed(1) + ' L', pad + 50, y + 9);
      doc.text('Daily Avg: ' + avg.toFixed(1) + ' L', pad + 105, y + 9);
      y += 18;
    }

    // ── Weight section ───────────────────────────────
    if ((animal.weights?.length || 0) > 0) {
      doc.setTextColor(21, 128, 61); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text('WEIGHT', pad, y);
      doc.line(pad, y + 2, W - pad, y + 2);
      doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      const latest = animal.weights[0];
      doc.text('Current: ' + latest.weightKg + ' kg', pad, y + 9);
      doc.text('Last Recorded: ' + new Date(latest.recordDate).toLocaleDateString('en-GB'), pad + 55, y + 9);
      y += 18;
    }

    // ── Ownership section ────────────────────────────
    doc.setTextColor(21, 128, 61); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('OWNERSHIP', pad, y);
    doc.line(pad, y + 2, W - pad, y + 2);
    doc.setTextColor(30, 41, 59); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    doc.text('Current Owner: ' + (animal.farm?.name || 'This Farm'), pad, y + 9);
    doc.text('Transfers: ' + (animal.ownershipTransfers?.length || 0), pad + 80, y + 9);
    y += 18;

    // ── Footer ───────────────────────────────────────
    doc.setFillColor(20, 83, 45);
    doc.rect(0, H - 18, W, 18, 'F');
    doc.setTextColor(134, 239, 172); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.text('VERIFIED BY AGRIPULSE', pad, H - 10);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
    doc.text('All records authenticated and cannot be altered.', pad, H - 5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text(animal.agripulseId || '', W - pad - 42, H - 10);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5);
    doc.text('Generated ' + new Date().toLocaleDateString('en-GB'), W - pad - 42, H - 5);

    doc.save((animal.agripulseId || 'passport') + '-passport.pdf');
  };

    const initiateTransfer = async () => {
    if (!transferEmail) return;
    const sig = getSignature();
    if (!sig) { alert('Please provide your signature.'); return; }
    setTransferring(true);
    try {
      const res = await api.post('/passport/transfer/initiate', {
        animalId: animal.id,
        toEmail: transferEmail,
        method: 'in_app',
        sellerSignature: sig,
      });
      setTransferCode(res.data.transfer.transferCode);
      setTransferId(res.data.transfer.id);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Transfer failed. Please try again.';
      alert(msg);
    } finally {
      setTransferring(false);
    }
  };

  const refreshTransferCode = async () => {
    if (!transferId) return;
    setRefreshingCode(true);
    try {
      const res = await api.post(`/passport/transfer/${transferId}/refresh-code`);
      setTransferCode(res.data.transfer.transferCode);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Failed to refresh code.');
    } finally {
      setRefreshingCode(false);
    }
  };

  const card = dark ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-white';
  const label = dark ? 'text-white/35' : 'text-gray-400';
  const text = dark ? 'text-white/85' : 'text-gray-800';
  const subtle = dark ? 'text-white/50' : 'text-gray-500';

  if (!animal.agripulseId) {
    return (
      <div className={`rounded-xl p-10 border text-center ${dark ? 'border-white/5 text-white/25' : 'border-gray-200 text-gray-400'}`}>
        <Shield className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm font-medium">No passport generated yet.</p>
        <p className="text-xs mt-1 opacity-60">This animal was added before the passport system. Edit and re-save the animal to generate an ID.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Identity header */}
      <div className={`rounded-xl p-5 border ${card}`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${label}`}>AgriPulse Digital Passport</div>
            <div className={`text-xl font-black ${text}`}>{animal.name}</div>
            <div className={`text-xs mt-1 ${subtle}`}>{animal.breed} · {animal.gender} · {animal.tagNumber}</div>
            <div className="mt-3 inline-flex items-center gap-2 bg-green-700 rounded-lg px-3 py-1.5">
              <span className="text-xs text-green-300 font-medium">ID</span>
              <span className="font-mono font-bold text-white text-sm">{animal.agripulseId}</span>
            </div>
          </div>

          {/* Verification badge */}
          <div className={`rounded-xl px-4 py-3 text-center border flex-shrink-0 ${isVerified ? 'border-green-500/30 bg-green-500/8' : 'border-amber-500/30 bg-amber-500/8'}`}>
            <Shield className={`w-6 h-6 mx-auto mb-1 ${isVerified ? 'text-green-500' : 'text-amber-500'}`} />
            <div className={`text-xs font-bold ${isVerified ? 'text-green-500' : 'text-amber-500'}`}>
              {isVerified ? 'VERIFIED' : 'PENDING'}
            </div>
            <div className={`text-xs mt-0.5 ${isVerified ? 'text-green-500/60' : 'text-amber-500/60'}`}>
              {isVerified ? 'by AgriPulse' : 'needs records'}
            </div>
          </div>
        </div>

        {!isVerified && (
          <div className={`mt-4 rounded-lg p-3 border border-amber-500/20 bg-amber-500/6 text-xs ${dark ? 'text-amber-300' : 'text-amber-700'}`}>
            To get verified: animal must be registered for 4+ months and have at least 1 health or milk record.
            Currently: {createdMonths} month(s) on farm, {(animal.healthRecords?.length || 0) + (animal.milkProduction?.length || 0)} record(s).
          </div>
        )}
      </div>

      {/* QR Code */}
      <div className={`rounded-xl p-5 border ${card}`}>
        <div className={`text-xs font-bold uppercase tracking-widest mb-4 ${label}`}>Digital QR Code</div>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="flex-shrink-0 p-3 bg-white rounded-xl shadow-sm">
            <QRCodeCanvas
              id="animal-qr-canvas"
              value={passportUrl}
              size={160}
              ecLevel="H"
            />
          </div>
          <div className="flex-1 w-full">
            <p className={`text-xs mb-4 leading-relaxed ${subtle}`}>
              Scan this QR code to view the full digital passport for <strong>{animal.name}</strong>. Print and attach to the animal's ear tag or farm record.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={downloadQR}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-colors
                  ${dark ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                <Download className="w-3.5 h-3.5" /> Download QR
              </button>
              <button onClick={printQR}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-colors
                  ${dark ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                <Printer className="w-3.5 h-3.5" /> Print QR
              </button>
              <button onClick={shareQR}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-colors
                  ${dark ? 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
              <button onClick={downloadPDF}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-colors border-blue-500/30 bg-blue-500/8 text-blue-500 hover:bg-blue-500/15`}>
                <Download className="w-3.5 h-3.5" /> Download PDF
              </button>
              <button onClick={() => setShowTransfer(!showTransfer)}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-colors border-green-500/30 bg-green-500/8 text-green-500 hover:bg-green-500/15">
                <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer Ownership */}
      {showTransfer && (
        <div className={`rounded-xl p-5 border ${card}`}>
          <div className={`text-xs font-bold uppercase tracking-widest mb-4 ${label}`}>Transfer Ownership</div>
          {transferCode ? (
            <div className="rounded-lg p-4 border border-green-500/20 bg-green-500/8 text-center">
              <div className="text-xs text-green-500 mb-2 font-medium">Transfer initiated! Share this code with the new owner:</div>
              <div className="font-mono text-2xl font-black text-green-500 tracking-widest">{transferCode}</div>
              <div className="text-xs text-green-500/60 mt-2">They enter this code in their AgriPulse app to accept the animal.</div>
              <button
                onClick={refreshTransferCode}
                disabled={refreshingCode}
                className="mt-3 text-xs font-semibold text-green-600 hover:text-green-500 underline disabled:opacity-40 transition-colors">
                {refreshingCode ? 'Refreshing...' : 'Refresh code'}
              </button>
              <div className="mt-3 pt-3 border-t border-green-500/20">
                <div className="text-xs text-green-500/70">Your e-signature has been recorded on this transfer.</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <input
                type="email"
                placeholder="New owner's email"
                value={transferEmail}
                onChange={e => setTransferEmail(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-green-500/30
                  ${dark ? 'bg-white/5 border-white/10 text-white placeholder-white/20' : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400'}`}
              />
              <div className={`rounded-lg p-3 border ${dark ? 'border-white/10' : 'border-gray-200'}`}>
                <div className={`text-xs font-bold mb-2 ${label}`}>Your E-Signature (required)</div>
                <div className="flex gap-2 mb-2">
                  <button onClick={() => setSigMode('type')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${sigMode === 'type' ? 'bg-green-700 text-white' : dark ? 'bg-white/5 text-white/50' : 'bg-gray-100 text-gray-500'}`}>
                    Type Name
                  </button>
                  <button onClick={() => setSigMode('draw')}
                    className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${sigMode === 'draw' ? 'bg-green-700 text-white' : dark ? 'bg-white/5 text-white/50' : 'bg-gray-100 text-gray-500'}`}>
                    Draw
                  </button>
                </div>
                {sigMode === 'type' ? (
                  <div>
                    <input
                      type="text"
                      placeholder="Type your full name to sign"
                      value={signatureName}
                      onChange={e => setSignatureName(e.target.value)}
                      className={`w-full px-3 py-2 rounded-lg border text-sm italic outline-none focus:ring-2 focus:ring-green-500/30
                        ${dark ? 'bg-white/5 border-white/10 text-green-400 placeholder-white/20' : 'bg-white border-gray-200 text-green-700 placeholder-gray-400'}`}
                      style={{ fontFamily: 'Georgia, serif', fontSize: 18 }}
                    />
                    {signatureName.trim() && (
                      <div style={{
                        marginTop: 8, padding: '8px 12px', borderRadius: 8,
                        border: '1px solid rgba(21,128,61,0.3)', background: 'rgba(21,128,61,0.05)',
                        fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 22, color: '#15803d',
                      }}>
                        {signatureName}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <canvas
                      ref={sigCanvasRef}
                      width={340} height={80}
                      onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                      className="rounded border w-full cursor-crosshair"
                      style={{ background: dark ? '#0d1117' : '#fff', borderColor: dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}
                    />
                    <button onClick={clearSig} className={`text-xs mt-1 ${label} hover:underline`}>Clear</button>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  const sig = getSignature();
                  if (!sig) { alert('Please sign before transferring.'); return; }
                  initiateTransfer();
                }}
                disabled={transferring || !transferEmail || (!signatureName && !signatureData)}
                className="w-full py-2 rounded-lg bg-green-700 text-white text-sm font-semibold disabled:opacity-40 hover:bg-green-600 transition-colors">
                {transferring ? 'Initiating...' : 'Sign & Initiate Transfer'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Passport summary */}
      <div className={`rounded-xl p-5 border ${card}`}>
        <div className={`text-xs font-bold uppercase tracking-widest mb-4 ${label}`}>Record Summary</div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Health Records', value: animal.healthRecords?.length || 0, color: '#ef4444' },
            { label: 'Milk Records', value: animal.milkProduction?.length || 0, color: '#3b82f6' },
            { label: 'Breeding Records', value: animal.breeding?.length || 0, color: '#6366f1' },
          ].map(item => (
            <div key={item.label} className={`rounded-lg p-3 border text-center ${dark ? 'border-white/6 bg-white/2' : 'border-gray-100 bg-gray-50'}`}>
              <div className="text-2xl font-black" style={{ color: item.color }}>{item.value}</div>
              <div className={`text-xs mt-1 ${label}`}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ownership history */}
      <div className={`rounded-xl p-5 border ${card}`}>
        <div className={`text-xs font-bold uppercase tracking-widest mb-3 ${label}`}>Ownership</div>
        <div className={`flex items-center justify-between rounded-lg p-3 border ${dark ? 'border-white/6 bg-white/2' : 'border-gray-100 bg-gray-50'}`}>
          <div>
            <div className={`text-xs ${label}`}>Current Owner</div>
            <div className={`text-sm font-bold ${text}`}>{animal.farm?.name || 'This Farm'}</div>
          </div>
          <div className="px-2.5 py-1 rounded-full text-xs font-bold border border-green-500/30 bg-green-500/8 text-green-500">
            Original Owner
          </div>
        </div>
      </div>

    </div>
  );
}

export function AnimalDetailPage() {
  useEffect(() => { document.title = 'Animal Detail — AgriPulse'; }, []);

  const { id } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [animal, setAnimal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    api.get(`/animals/${id}`)
      .then(r => setAnimal(r.data.animal))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;
  if (!animal) return (
    <div className="flex flex-col items-center justify-center min-h-64 gap-4">
      <p className="text-gray-400">Animal not found.</p>
      <button onClick={() => navigate('/animals')} className="btn-primary">Back to Animals</button>
    </div>
  );

  const stage = getBreedingStage(animal.breeding?.[0] || null, animal.dateOfBirth, animal.gender);
  const statusColors: Record<string, string> = { active: '#10b981', sold: '#f59e0b', deceased: '#ef4444' };
  const breedingColors: Record<string, string> = { pending: '#818cf8', pregnant: '#6366f1', gave_birth: '#10b981', failed: '#ef4444' };
  const ageMonths = Math.floor((Date.now() - new Date(animal.dateOfBirth).getTime()) / (86400000 * 30.44));
  const ageStr = ageMonths >= 12 ? `${Math.floor(ageMonths / 12)}y ${ageMonths % 12}m` : `${ageMonths} months`;

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0d1117]' : 'bg-gray-50'}`}>

      {/* Sticky header */}
      <div className={`sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3 flex-wrap
        ${isDark ? 'bg-[#0d1526]/90 border-white/5 backdrop-blur-xl' : 'bg-white/90 border-gray-200 backdrop-blur-xl'}`}>
        <button onClick={() => navigate('/animals')}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors flex-shrink-0
            ${isDark ? 'text-white/50 hover:bg-white/6 hover:text-white/80' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}>
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className={`text-lg font-black truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{animal.name}</h1>
            <span className={`text-xs font-mono px-2 py-0.5 rounded-md flex-shrink-0
              ${isDark ? 'text-white/40 bg-white/5 border border-white/8' : 'text-gray-400 bg-gray-100 border border-gray-200'}`}>
              {animal.tagNumber}
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full flex-shrink-0"
              style={{ background: `${statusColors[animal.status]}20`, color: statusColors[animal.status], border: `1px solid ${statusColors[animal.status]}40` }}>
              {animal.status}
            </span>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{animal.breed} · {animal.gender} · {ageStr}</p>
        </div>

        {stage && (
          <div className="flex-shrink-0 rounded-xl px-3 py-2 text-right"
            style={{ background: stage.glowColor, border: `1px solid ${stage.color}40`, boxShadow: stage.urgent ? `0 0 16px ${stage.glowColor}` : undefined }}>
            <div className="text-xs font-bold" style={{ color: stage.color }}>{stage.stage}</div>
            <div className="text-xs opacity-75" style={{ color: stage.color }}>{stage.detail}</div>
          </div>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-4 sm:py-6">

        {/* Tab bar */}
        <div className={`flex gap-1 rounded-xl p-1 mb-5 overflow-x-auto ${isDark ? 'bg-white/4' : 'bg-gray-100'}`}>
          {TABS.map(({ id: tid, label, icon: Icon }) => (
            <button key={tid} onClick={() => setTab(tid)}
              className={`flex-1 min-w-16 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                text-xs sm:text-sm font-semibold transition-all whitespace-nowrap
                ${tab === tid
                  ? isDark
                    ? 'bg-indigo-500/20 text-indigo-400 shadow-sm'
                    : 'bg-white text-indigo-600 shadow-sm'
                  : isDark
                    ? 'text-white/40 hover:text-white/60'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />{label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoCard label="Breed"         value={animal.breed}                                              dark={isDark} />
              <InfoCard label="Gender"        value={animal.gender}                                             dark={isDark} />
              <InfoCard label="Date of Birth" value={format(new Date(animal.dateOfBirth), 'dd MMM yyyy')}       dark={isDark} />
              <InfoCard label="Color"         value={animal.color || '—'}                                       dark={isDark} />
              <InfoCard label="Status"        value={animal.status}                                             dark={isDark} />
              <InfoCard label="Age"           value={ageStr}                                                    dark={isDark} />
            </div>
            {animal.notes && (
              <div className={`rounded-xl p-4 border ${isDark ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-white'}`}>
                <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDark ? 'text-white/35' : 'text-gray-400'}`}>Notes</div>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-white/60' : 'text-gray-600'}`}>{animal.notes}</p>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              {isDark ? (
                <>
                  <StatBadge value={animal.breeding?.length || 0}      label="Breeding"  color="#6366f1" />
                  <StatBadge value={animal.healthRecords?.length || 0}  label="Health"    color="#ef4444" />
                  <StatBadge value={animal.milkProduction?.length || 0} label="Milk"      color="#3b82f6" />
                </>
              ) : (
                <>
                  <div className="rounded-xl p-4 border border-gray-200 bg-white">
                    <div className="text-xs font-bold uppercase tracking-widest mb-1.5 text-gray-400">Breeding</div>
                    <div className="text-2xl font-black text-indigo-500">{animal.breeding?.length || 0}</div>
                  </div>
                  <div className="rounded-xl p-4 border border-gray-200 bg-white">
                    <div className="text-xs font-bold uppercase tracking-widest mb-1.5 text-gray-400">Health</div>
                    <div className="text-2xl font-black text-red-500">{animal.healthRecords?.length || 0}</div>
                  </div>
                  <div className="rounded-xl p-4 border border-gray-200 bg-white">
                    <div className="text-xs font-bold uppercase tracking-widest mb-1.5 text-gray-400">Milk</div>
                    <div className="text-2xl font-black text-blue-500">{animal.milkProduction?.length || 0}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* PASSPORT */}
        {tab === 'passport' && <PassportTab animal={animal} dark={isDark} />}

        {/* BREEDING */}
        {tab === 'breeding' && (
          <div className="flex flex-col gap-3">
            {!animal.breeding?.length ? (
              <div className={`rounded-xl p-10 border text-center text-sm ${isDark ? 'border-white/5 text-white/25' : 'border-gray-200 text-gray-400'}`}>No breeding records</div>
            ) : animal.breeding.map((b: any) => {
              const daysSince = Math.floor((Date.now() - new Date(b.serviceDate).getTime()) / 86400000);
              const col = breedingColors[b.pregnancyStatus] || '#818cf8';
              const progress = Math.min(100, Math.round(daysSince / 283 * 100));
              const isActive = b.pregnancyStatus === 'pregnant' || b.pregnancyStatus === 'pending';
              return (
                <div key={b.id} className={`rounded-xl p-4 sm:p-5 border ${isDark ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-white'}`}>
                  <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
                    <div>
                      <div className={`text-sm font-bold ${isDark ? 'text-white/85' : 'text-gray-800'}`}>Service: {format(new Date(b.serviceDate), 'dd MMM yyyy')}</div>
                      {b.bullName && <div className={`text-xs mt-0.5 ${isDark ? 'text-white/35' : 'text-gray-400'}`}>Bull: {b.bullName}</div>}
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full flex-shrink-0"
                      style={{ background: `${col}20`, color: col, border: `1px solid ${col}40` }}>
                      {b.pregnancyStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    <div className={`rounded-lg p-3 border ${isDark ? 'border-white/6 bg-white/2' : 'border-gray-100 bg-gray-50'}`}>
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>Day</div>
                      <div className={`text-base font-black ${isDark ? 'text-white/80' : 'text-gray-800'}`}>{daysSince} / 283</div>
                    </div>
                    {b.expectedBirthDate && (
                      <div className={`rounded-lg p-3 border ${isDark ? 'border-white/6 bg-white/2' : 'border-gray-100 bg-gray-50'}`}>
                        <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>Expected</div>
                        <div className={`text-sm font-bold ${isDark ? 'text-white/80' : 'text-gray-800'}`}>{format(new Date(b.expectedBirthDate), 'dd MMM yyyy')}</div>
                      </div>
                    )}
                    {b.actualBirthDate && (
                      <div className="rounded-lg p-3 border border-emerald-500/20 bg-emerald-500/8">
                        <div className="text-xs font-semibold uppercase tracking-wide mb-1 text-emerald-500">Calved</div>
                        <div className="text-sm font-bold text-emerald-400">{format(new Date(b.actualBirthDate), 'dd MMM yyyy')}</div>
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className={isDark ? 'text-white/30' : 'text-gray-400'}>Gestation progress</span>
                        <span className="font-bold" style={{ color: col }}>{progress}%</span>
                      </div>
                      <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/6' : 'bg-gray-100'}`}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', boxShadow: '0 0 8px rgba(99,102,241,.4)' }} />
                      </div>
                    </div>
                  )}
                  {b.notes && <p className={`mt-3 pt-3 text-xs leading-relaxed border-t ${isDark ? 'border-white/5 text-white/35' : 'border-gray-100 text-gray-400'}`}>{b.notes}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* HEALTH */}
        {tab === 'health' && (
          <div className="flex flex-col gap-3">
            {!animal.healthRecords?.length ? (
              <div className={`rounded-xl p-10 border text-center text-sm ${isDark ? 'border-white/5 text-white/25' : 'border-gray-200 text-gray-400'}`}>No health records</div>
            ) : animal.healthRecords.map((h: any) => (
              <div key={h.id} className={`rounded-xl p-4 sm:p-5 border ${isDark ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-white'}`}>
                <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                  <div className={`text-sm font-bold ${isDark ? 'text-white/85' : 'text-gray-800'}`}>{h.condition}</div>
                  <div className={`text-xs flex-shrink-0 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{format(new Date(h.recordDate), 'dd MMM yyyy')}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {h.treatment && (
                    <div className={`rounded-lg p-3 border ${isDark ? 'border-white/6 bg-white/2' : 'border-gray-100 bg-gray-50'}`}>
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>Treatment</div>
                      <div className={`text-sm ${isDark ? 'text-white/75' : 'text-gray-700'}`}>{h.treatment}</div>
                    </div>
                  )}
                  {h.vaccination && (
                    <div className="rounded-lg p-3 border border-emerald-500/20 bg-emerald-500/6">
                      <div className="text-xs font-semibold uppercase tracking-wide mb-1 text-emerald-500">Vaccination</div>
                      <div className="text-sm text-emerald-400">{h.vaccination}</div>
                    </div>
                  )}
                  {h.doctorName && (
                    <div className={`rounded-lg p-3 border ${isDark ? 'border-white/6 bg-white/2' : 'border-gray-100 bg-gray-50'}`}>
                      <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>Veterinarian</div>
                      <div className={`text-sm ${isDark ? 'text-white/75' : 'text-gray-700'}`}>Dr. {h.doctorName}</div>
                    </div>
                  )}
                </div>
                {h.notes && <p className={`mt-3 pt-3 text-xs leading-relaxed border-t ${isDark ? 'border-white/5 text-white/35' : 'border-gray-100 text-gray-400'}`}>{h.notes}</p>}
              </div>
            ))}
          </div>
        )}

        {/* MILK */}
        {tab === 'milk' && (
          <div className="flex flex-col gap-3">
            {!animal.milkProduction?.length ? (
              <div className={`rounded-xl p-10 border text-center text-sm ${isDark ? 'border-white/5 text-white/25' : 'border-gray-200 text-gray-400'}`}>No milk records</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-xl p-4 border ${isDark ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-white'}`}>
                    <div className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-white/35' : 'text-gray-400'}`}>Total Recorded</div>
                    <div className="text-2xl font-black text-blue-500">
                      {animal.milkProduction.reduce((s: number, m: any) => s + Number(m.quantityLiters), 0).toFixed(1)} L
                    </div>
                  </div>
                  <div className={`rounded-xl p-4 border ${isDark ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-white'}`}>
                    <div className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-white/35' : 'text-gray-400'}`}>Daily Average</div>
                    <div className="text-2xl font-black text-blue-500">
                      {(animal.milkProduction.reduce((s: number, m: any) => s + Number(m.quantityLiters), 0) / animal.milkProduction.length).toFixed(1)} L
                    </div>
                  </div>
                </div>
                <div className={`rounded-xl border overflow-auto ${isDark ? 'border-white/8 bg-white/3' : 'border-gray-200 bg-white'}`}>
                  <table className="w-full text-sm" style={{ minWidth: 340 }}>
                    <thead>
                      <tr className={`border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white/30 bg-white/2' : 'text-gray-400 bg-gray-50'}`}>Date</th>
                        <th className={`px-4 py-3 text-right text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white/30 bg-white/2' : 'text-gray-400 bg-gray-50'}`}>Quantity</th>
                        <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white/30 bg-white/2' : 'text-gray-400 bg-gray-50'}`}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {animal.milkProduction.map((m: any) => (
                        <tr key={m.id} className={`border-b last:border-0 ${isDark ? 'border-white/4 hover:bg-white/2' : 'border-gray-50 hover:bg-gray-50'}`}>
                          <td className={`px-4 py-3 ${isDark ? 'text-white/75' : 'text-gray-700'}`}>{format(new Date(m.productionDate), 'dd MMM yyyy')}</td>
                          <td className="px-4 py-3 text-right font-bold text-blue-500">{Number(m.quantityLiters).toFixed(1)} L</td>
                          <td className={`px-4 py-3 text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>{m.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
