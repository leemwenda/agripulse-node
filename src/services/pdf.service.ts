import PDFDocument from 'pdfkit';

// ── Brand palette ────────────────────────────────────────────
const GREEN_DEEP = '#0f3d20';
const GREEN      = '#166534';
const GREEN2     = '#16a34a';
const GREEN_SOFT = '#22c55e';
const LIGHT      = '#f0fdf4';
const GRAY       = '#6b7280';
const GRAY_LIGHT = '#94a3b8';
const DARK       = '#0f172a';
const RED        = '#dc2626';
const AMBER      = '#d97706';
const WHITE      = '#ffffff';
const BORDER     = '#e2e8f0';
const CARD_BG    = '#f8fafc';

export interface MonthlyReportData {
  month: string;
  farmName: string;
  totalAnimals: number;
  monthMilk: number;
  avgDailyMilk: number;
  healthRecords: number;
  vaccinations: number;
  birthsThisMonth: number;
  pregnantCount: number;
  monthIncome: number;
  monthExpense: number;
  topCow: string;
  topCowLiters: number;
  newAnimals: number;
  // Optional — enables trend arrows once historical data is wired in (Phase 2)
  prevMonthMilk?: number;
  prevMonthIncome?: number;
  prevMonthExpense?: number;
  prevMonthAnimals?: number;
}

type Status = 'excellent' | 'good' | 'attention';

function statusColor(s: Status) {
  return s === 'excellent' ? GREEN2 : s === 'good' ? AMBER : RED;
}
function statusLabel(s: Status) {
  return s === 'excellent' ? 'Excellent' : s === 'good' ? 'Good' : 'Needs Attention';
}

// ── Performance score (documented, tweakable formula) ───────────
function computeScore(d: MonthlyReportData) {
  const vaccRate = d.totalAnimals > 0 ? d.vaccinations / d.totalAnimals : 0;
  const healthPts = Math.min(40, vaccRate * 40);

  const profit = d.monthIncome - d.monthExpense;
  const margin = d.monthIncome > 0 ? profit / d.monthIncome : 0;
  const financePts = profit >= 0 ? Math.min(30, 15 + margin * 30) : Math.max(0, 15 + margin * 15);

  const herdPts = Math.min(30, d.newAnimals * 6 + d.birthsThisMonth * 6 + (d.pregnantCount > 0 ? 6 : 0));

  const score = Math.round(Math.max(0, Math.min(100, healthPts + financePts + herdPts)));
  const status: Status = score >= 85 ? 'excellent' : score >= 60 ? 'good' : 'attention';
  return { score, status };
}

function trendTag(current: number, previous?: number): { text: string; color: string } {
  if (previous === undefined || previous === 0) return { text: '—', color: GRAY_LIGHT };
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  return {
    text: `${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(0)}% vs last month`,
    color: up ? GREEN2 : RED,
  };
}

function buildInsights(d: MonthlyReportData, profit: number): string[] {
  const insights: string[] = [];

  const milkTrend = trendTag(d.monthMilk, d.prevMonthMilk);
  insights.push(
    milkTrend.text === '—'
      ? `Milk production this month: ${d.monthMilk.toFixed(0)}L across ${d.totalAnimals} animals.`
      : `Milk production ${milkTrend.text.includes('▲') ? 'increased' : 'decreased'} ${milkTrend.text.replace(/[▲▼]\s*/, '')}.`
  );

  insights.push(
    profit >= 0
      ? `Profit margin remains healthy at KSh ${profit.toLocaleString()} for the month.`
      : `Farm recorded a net loss of KSh ${Math.abs(profit).toLocaleString()} — review expense categories.`
  );

  const vaccRate = d.totalAnimals > 0 ? (d.vaccinations / d.totalAnimals) * 100 : 0;
  insights.push(
    vaccRate >= 70
      ? `Vaccination coverage is strong at ${vaccRate.toFixed(0)}% of the herd.`
      : `Vaccination coverage is at ${vaccRate.toFixed(0)}% — consider scheduling catch-up doses.`
  );

  const treatments = d.healthRecords - d.vaccinations;
  insights.push(
    treatments > 3
      ? `${treatments} treatment records this month — monitor for recurring health issues.`
      : `Treatment records remain low (${treatments}) — herd health looks stable.`
  );

  return insights;
}

export async function generateMonthlyPDF(data: MonthlyReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const chunks: Buffer[] = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = 595.28;
    const M = 40;
    const CW = W - M * 2;
    const profit = data.monthIncome - data.monthExpense;
    const { score, status: scoreStatus } = computeScore(data);

    // ── PREMIUM HEADER (gradient) ───────────────────────────
    const headerH = 150;
    const grad = doc.linearGradient(0, 0, W, headerH);
    grad.stop(0, GREEN_DEEP).stop(1, GREEN2);
    doc.rect(0, 0, W, headerH).fill(grad);

    // Logo image on white rounded badge for visibility (falls back to circle badge if file missing)
    try {
      const path = require('path');
      const logoPath = path.join(process.cwd(), 'client', 'public', 'logo.png');
      doc.roundedRect(M, 28, 52, 52, 10).fill(WHITE);
      doc.image(logoPath, M + 4, 32, { width: 44, height: 44 });
    } catch {
      const badgeGrad = doc.linearGradient(M, 30, M + 48, 78);
      badgeGrad.stop(0, GREEN_SOFT).stop(1, GREEN2);
      doc.circle(M + 24, 54, 24).fill(badgeGrad);
      doc.fontSize(20).fillColor(WHITE).font('Helvetica-Bold').text('A', M + 16, 43);
    }

    doc.fontSize(23).fillColor(WHITE).font('Helvetica-Bold').text('AgriPulse', M + 58, 30);
    doc.fontSize(10.5).fillColor('#bbf7d0').font('Helvetica').text('Smart Dairy Farm Management', M + 58, 56);
    doc.fontSize(9).fillColor('#86efac').text('agripulse.me', M + 58, 73);

    doc.fontSize(14).fillColor(WHITE).font('Helvetica-Bold').text('Monthly Farm Report', 0, 30, { align: 'right', width: W - M });
    doc.fontSize(11).fillColor('#bbf7d0').font('Helvetica').text(data.month, 0, 50, { align: 'right', width: W - M });
    doc.fontSize(9).fillColor('#86efac').text(`Generated: ${new Date().toLocaleDateString('en-KE')}`, 0, 67, { align: 'right', width: W - M });

    doc.moveTo(M, 105).lineTo(W - M, 105).strokeColor('rgba(255,255,255,0.25)').lineWidth(0.5).stroke();
    doc.fontSize(13).fillColor(WHITE).font('Helvetica-Bold').text(`${data.farmName}'s Farm`, M, 116);
    doc.fontSize(9.5).fillColor('#bbf7d0').font('Helvetica').text(`Executive performance overview for ${data.month}`, M, 134);

    let y = headerH + 25;

    // ── KPI DASHBOARD ────────────────────────────────────────
    const kpis = [
      { label: 'Total Animals', value: String(data.totalAnimals), trend: trendTag(data.totalAnimals, data.prevMonthAnimals), color: GREEN2 },
      { label: 'Milk Produced', value: `${data.monthMilk.toFixed(0)}L`, trend: trendTag(data.monthMilk, data.prevMonthMilk), color: '#2563eb' },
      { label: profit >= 0 ? 'Net Profit' : 'Net Loss', value: `KSh ${Math.abs(profit).toLocaleString()}`, trend: trendTag(profit, data.prevMonthIncome !== undefined && data.prevMonthExpense !== undefined ? data.prevMonthIncome - data.prevMonthExpense : undefined), color: profit >= 0 ? GREEN2 : RED },
      { label: 'Health Score', value: `${score}%`, trend: { text: statusLabel(scoreStatus), color: statusColor(scoreStatus) }, color: statusColor(scoreStatus) },
    ];
    const kpiW = (CW - 30) / 4;
    kpis.forEach((k, i) => {
      const cx = M + i * (kpiW + 10);
      doc.roundedRect(cx, y, kpiW, 88, 10).fill(WHITE).strokeColor(BORDER).lineWidth(1).stroke();
      doc.roundedRect(cx, y, kpiW, 4, 2).fill(k.color);
      doc.fontSize(8.5).fillColor(GRAY).font('Helvetica').text(k.label, cx + 12, y + 16, { width: kpiW - 24 });
      doc.fontSize(21).fillColor(DARK).font('Helvetica-Bold').text(k.value, cx + 12, y + 32, { width: kpiW - 24 });
      doc.fontSize(7.5).fillColor(k.trend.color).font('Helvetica-Bold').text(k.trend.text, cx + 12, y + 64, { width: kpiW - 24 });
    });
    y += 110;

    // ── Helpers ──────────────────────────────────────────────
    function section(title: string) {
      doc.rect(M, y, CW, 26).fill(GREEN);
      doc.fontSize(10.5).fillColor(WHITE).font('Helvetica-Bold').text(title, M + 12, y + 7);
      y += 36;
    }
    function row(label: string, value: string, shade: boolean, highlight?: 'green' | 'red') {
      doc.rect(M, y, CW, 23).fill(shade ? CARD_BG : WHITE);
      doc.fontSize(9.5).fillColor(DARK).font('Helvetica').text(label, M + 10, y + 6);
      const color = highlight === 'green' ? GREEN2 : highlight === 'red' ? RED : DARK;
      doc.fontSize(9.5).fillColor(color).font('Helvetica-Bold').text(value, 0, y + 6, { align: 'right', width: W - M - 10 });
      doc.moveTo(M, y + 23).lineTo(M + CW, y + 23).strokeColor(BORDER).lineWidth(0.5).stroke();
      y += 23;
    }
    function twoCol(left: [string, string][], right: [string, string][]) {
      const colW = (CW - 10) / 2;
      const startY = y;
      let leftY = y, rightY = y;
      left.forEach(([l, v], i) => {
        doc.rect(M, leftY, colW, 23).fill(i % 2 === 0 ? CARD_BG : WHITE);
        doc.fontSize(9.5).fillColor(DARK).font('Helvetica').text(l, M + 10, leftY + 6);
        doc.fontSize(9.5).fillColor(DARK).font('Helvetica-Bold').text(v, M, leftY + 6, { align: 'right', width: colW - 10 });
        doc.moveTo(M, leftY + 23).lineTo(M + colW, leftY + 23).strokeColor(BORDER).lineWidth(0.5).stroke();
        leftY += 23;
      });
      right.forEach(([l, v], i) => {
        doc.rect(M + colW + 10, rightY, colW, 23).fill(i % 2 === 0 ? CARD_BG : WHITE);
        doc.fontSize(9.5).fillColor(DARK).font('Helvetica').text(l, M + colW + 20, rightY + 6);
        doc.fontSize(9.5).fillColor(DARK).font('Helvetica-Bold').text(v, M + colW + 10, rightY + 6, { align: 'right', width: colW - 10 });
        doc.moveTo(M + colW + 10, rightY + 23).lineTo(M + CW, rightY + 23).strokeColor(BORDER).lineWidth(0.5).stroke();
        rightY += 23;
      });
      y = Math.max(leftY, rightY) + 14;
    }

    // ── HERD + MILK + FINANCE ────────────────────────────────
    section('Herd Summary');
    twoCol(
      [['Total Active Animals', String(data.totalAnimals)], ['New Animals Added', String(data.newAnimals)]],
      [['Currently Pregnant', String(data.pregnantCount)], ['Births This Month', String(data.birthsThisMonth)]]
    );

    section('Milk Production');
    row('Total Milk This Month', `${data.monthMilk.toFixed(1)} litres`, false, 'green');
    row('Daily Average', `${data.avgDailyMilk.toFixed(1)} litres / day`, true);
    row('Top Producing Animal', `${data.topCow} — ${data.topCowLiters.toFixed(1)} L`, false);
    y += 8;

    section('Financial Summary');
    row('Total Income', `KSh ${data.monthIncome.toLocaleString()}`, false, 'green');
    row('Total Expenses', `KSh ${data.monthExpense.toLocaleString()}`, true, 'red');
    doc.rect(M, y, CW, 27).fill(profit >= 0 ? LIGHT : '#fef2f2');
    doc.fontSize(10.5).fillColor(profit >= 0 ? GREEN : RED).font('Helvetica-Bold').text(profit >= 0 ? 'Net Profit' : 'Net Loss', M + 10, y + 7);
    doc.fontSize(10.5).fillColor(profit >= 0 ? GREEN : RED).font('Helvetica-Bold').text(`KSh ${Math.abs(profit).toLocaleString()}`, 0, y + 7, { align: 'right', width: W - M - 10 });
    y += 42;

    // ── FARM HEALTH (status cards) ───────────────────────────
    section('Farm Health');
    const vaccRate = data.totalAnimals > 0 ? (data.vaccinations / data.totalAnimals) * 100 : 0;
    const vaccStatus: Status = vaccRate >= 70 ? 'excellent' : vaccRate >= 40 ? 'good' : 'attention';
    const treatments = data.healthRecords - data.vaccinations;
    const treatStatus: Status = treatments <= 2 ? 'excellent' : treatments <= 5 ? 'good' : 'attention';
    const breedStatus: Status = data.pregnantCount > 0 || data.birthsThisMonth > 0 ? 'excellent' : 'good';

    const healthCards = [
      { title: 'Vaccinations', big: String(data.vaccinations), status: vaccStatus },
      { title: 'Treatments', big: String(treatments), status: treatStatus },
      { title: 'Breeding Activity', big: `${data.pregnantCount} pregnant`, status: breedStatus },
    ];
    const hCardW = (CW - 20) / 3;
    healthCards.forEach((card, i) => {
      const cx = M + i * (hCardW + 10);
      doc.roundedRect(cx, y, hCardW, 64, 8).fill(CARD_BG);
      doc.roundedRect(cx, y, 4, 64, 2).fill(statusColor(card.status));
      doc.fontSize(8.5).fillColor(GRAY).font('Helvetica').text(card.title, cx + 14, y + 12);
      doc.fontSize(15).fillColor(DARK).font('Helvetica-Bold').text(card.big, cx + 14, y + 28);
      doc.fontSize(8).fillColor(statusColor(card.status)).font('Helvetica-Bold').text(statusLabel(card.status), cx + 14, y + 48);
    });
    y += 84;

    // ── AI FARM INSIGHTS ──────────────────────────────────────
    section('AI Farm Insights');
    const insights = buildInsights(data, profit);
    insights.forEach((text) => {
      const boxH = 28;
      doc.rect(M, y, CW, boxH).fill(CARD_BG);
      doc.rect(M, y, 3, boxH).fill(GREEN);
      doc.fontSize(9).fillColor(DARK).font('Helvetica').text(text, M + 14, y + 9, { width: CW - 28 });
      y += boxH + 6;
    });
    y += 6;

    // ── PERFORMANCE SCORE (headline conclusion) ──────────────
    if (y > 650) { doc.addPage(); y = 40; }
    doc.roundedRect(M, y, CW, 100, 12).fill(GREEN_DEEP);
    doc.fontSize(11).fillColor('#bbf7d0').font('Helvetica-Bold').text('Overall Farm Performance Score', M + 30, y + 22);
    doc.circle(M + 70, y + 70, 38).lineWidth(8).strokeColor(statusColor(scoreStatus)).stroke();
    doc.fontSize(22).fillColor(WHITE).font('Helvetica-Bold').text(String(score), M + 50, y + 56, { width: 40, align: 'center' });
    doc.fontSize(13).fillColor(WHITE).font('Helvetica-Bold').text(statusLabel(scoreStatus), M + 140, y + 60);
    doc.fontSize(8.5).fillColor('#bbf7d0').font('Helvetica').text('Based on herd health, vaccination coverage, financial margin and breeding activity.', M + 140, y + 78, { width: CW - 180 });
    y += 100;

    // ── FOOTER ───────────────────────────────────────────────
    const footerY = 790;
    doc.rect(0, footerY, W, 52).fill(GREEN);
    doc.fontSize(9).fillColor('#bbf7d0').font('Helvetica').text('Generated by AgriPulse — Smart Dairy Farm Management', 0, footerY + 13, { align: 'center', width: W });
    doc.fontSize(8).fillColor('#86efac').text('agripulse.me  •  Login for full details and historical reports', 0, footerY + 30, { align: 'center', width: W });

    doc.end();
  });
}
