import nodemailer from 'nodemailer';

function createTransport() {
  return nodemailer.createTransport({
    host: '127.0.0.1',
    port: 25,
    secure: false,
    tls: { rejectUnauthorized: false },
  });
}

const FROM        = process.env.MAIL_FROM  || 'AgriPulse <notifications@agripulse.me>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'leemwenda8714@gmail.com';
const SITE        = process.env.SITE_NAME  || 'AgriPulse';
const CLIENT_URL  = process.env.CLIENT_URL || 'https://agripulse.me';
const LOGO_URL    = 'https://agripulse.me/agripulse-logo.png';

// ── Base template ─────────────────────────────────────────────
function baseTemplate(title: string, body: string): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f6f8f7;font-family:Arial,Helvetica,sans-serif;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8f7;padding:40px 15px;">
<tr><td align="center">

<table role="presentation" width="600" cellpadding="0" cellspacing="0"
  style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;max-width:600px;width:100%;">

  <!-- HEADER -->
  <tr>
    <td style="background:linear-gradient(160deg,#166534 0%,#14532d 100%);padding:40px;text-align:center;">
      <img src="${LOGO_URL}" width="56" height="56" alt="${SITE}" style="border-radius:10px;display:inline-block;">
      <div style="height:18px;"></div>
      <div style="color:#ffffff;font-size:30px;font-weight:700;letter-spacing:-0.5px;">${SITE}</div>
      <div style="color:rgba(255,255,255,0.6);font-size:14px;margin-top:6px;">Smart Farm Management Platform</div>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td style="padding:45px;">
      <h1 style="margin:0 0 28px;color:#111827;font-size:26px;font-weight:700;line-height:1.3;">${title}</h1>
      ${body}
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#fafafa;border-top:1px solid #e5e7eb;padding:30px 45px;">
      <div style="color:#111827;font-size:14px;font-weight:600;">Need assistance?</div>
      <div style="margin-top:8px;color:#6b7280;font-size:14px;line-height:24px;">
        Reply to this email or contact us at <a href="mailto:notifications@agripulse.me" style="color:#166534;text-decoration:none;">notifications@agripulse.me</a>
      </div>
      <div style="margin-top:20px;color:#9ca3af;font-size:13px;line-height:22px;">
        &copy; ${year} ${SITE} &mdash; Smart Farm Management Platform<br>
        <a href="${CLIENT_URL}/profile" style="color:#9ca3af;text-decoration:underline;">Manage notification preferences</a>
      </div>
    </td>
  </tr>

</table>

</td></tr>
</table>
</body>
</html>`;
}

// ── Components ────────────────────────────────────────────────
function p(text: string): string {
  return `<p style="margin:0 0 20px;color:#6b7280;font-size:15px;line-height:28px;">${text}</p>`;
}

function btn(text: string, url: string): string {
  return `<div style="height:8px;"></div>
  <table role="presentation" cellpadding="0" cellspacing="0">
    <tr>
      <td style="background:#166534;border-radius:8px;">
        <a href="${url}" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">${text}</a>
      </td>
    </tr>
  </table>
  <div style="height:32px;"></div>`;
}

function infoCard(title: string, rows: [string, string][]): string {
  const cells = rows.map(([label, value]) => `
    <tr>
      <td style="padding:14px 24px;color:#6b7280;font-size:14px;border-bottom:1px solid #f3f4f6;width:160px;">${label}</td>
      <td style="padding:14px 24px;color:#111827;font-size:14px;font-weight:600;border-bottom:1px solid #f3f4f6;">${value}</td>
    </tr>`).join('');
  return `<div style="height:28px;"></div>
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
    <tr>
      <td colspan="2" style="padding:16px 24px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-size:15px;font-weight:600;color:#111827;">${title}</td>
    </tr>
    ${cells}
  </table>
  <div style="height:28px;"></div>`;
}

function alertBox(message: string, type: 'danger'|'warning'|'success'|'info'): string {
  const configs: Record<string, {bg:string;border:string;color:string;label:string}> = {
    danger:  { bg:'#fef2f2', border:'#dc2626', color:'#991b1b', label:'Action Required' },
    warning: { bg:'#fffbeb', border:'#f59e0b', color:'#92400e', label:'Notice' },
    success: { bg:'#f0fdf4', border:'#16a34a', color:'#14532d', label:'Confirmed' },
    info:    { bg:'#eff6ff', border:'#2563eb', color:'#1e3a8a', label:'Information' },
  };
  const c = configs[type];
  return `<div style="height:8px;"></div>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0;">
    <tr>
      <td style="background:${c.bg};border-left:4px solid ${c.border};border-radius:0 8px 8px 0;padding:16px 20px;">
        <div style="font-size:11px;font-weight:700;color:${c.border};letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">${c.label}</div>
        <div style="font-size:14px;color:${c.color};line-height:22px;">${message}</div>
      </td>
    </tr>
  </table>
  <div style="height:8px;"></div>`;
}

function statsRow(items: {label:string;value:string}[]): string {
  const cells = items.map(item => `
    <td style="text-align:center;padding:20px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;width:${Math.floor(100/items.length)}%;">
      <div style="font-size:24px;font-weight:800;color:#111827;">${item.value}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;text-transform:uppercase;letter-spacing:0.5px;">${item.label}</div>
    </td>`).join('<td style="width:8px;"></td>');
  return `<div style="height:8px;"></div>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr>${cells}</tr></table>
  <div style="height:16px;"></div>`;
}

function divider(): string {
  return `<div style="height:1px;background:#f3f4f6;margin:28px 0;"></div>`;
}

function sectionTitle(text: string): string {
  return `<div style="font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:1px;margin:28px 0 12px;padding-bottom:10px;border-bottom:2px solid #166534;">${text}</div>`;
}

async function send(to: string, subject: string, html: string): Promise<void> {
  try {
    const transport = createTransport();
    await transport.sendMail({ from: FROM, to, subject, html });
    console.log(`[Mail] Sent "${subject}" to ${to}`);
  } catch (err) {
    console.error(`[Mail] Failed "${subject}" to ${to}:`, err);
  }
}


// ── Telegram notification ─────────────────────────────────────
const TELEGRAM_BOT_TOKEN = '8864625945:AAHTTIGc0xwxewb8LU71u-hB_xYjAE487Vw';
const TELEGRAM_CHAT_ID = '8748137733';

export async function sendTelegram(message: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });
    console.log('[Telegram] Sent notification');
  } catch (err) {
    console.error('[Telegram] Failed:', err);
  }
}

// ── 1. Welcome ────────────────────────────────────────────────
export async function mailWelcome(email: string, name: string): Promise<void> {
  await send(email, `Welcome to ${SITE}`, baseTemplate('Welcome to AgriPulse', `
    ${p(`Hello <strong style="color:#111827;">${name}</strong>,`)}
    ${p('Your AgriPulse account has been successfully created and is now ready for use. You can begin managing your livestock, monitoring health records, tracking milk production, and accessing intelligent farm insights from a single platform.')}
    ${btn('Access Your Dashboard', `${CLIENT_URL}/dashboard`)}
    ${infoCard('Account Information', [
      ['Status', 'Active'],
      ['Platform', 'AgriPulse Smart Farm Management'],
      ['Support', 'notifications@agripulse.me'],
    ])}
    ${p('<span style="font-size:13px;color:#9ca3af;">If you did not create this account, you can safely ignore this email.</span>')}
  `));
}

// ── 2. Pending approval ───────────────────────────────────────
export async function mailPendingApproval(email: string, name: string): Promise<void> {
  await send(email, `Account Under Review — ${SITE}`, baseTemplate('Your Account is Under Review', `
    ${p(`Hello <strong style="color:#111827;">${name}</strong>,`)}
    ${p('Thank you for registering on AgriPulse. Your account has been submitted and is currently pending review by the platform administrator.')}
    ${alertBox('You will receive an email notification once your account has been approved. This process typically takes less than 24 hours.', 'info')}
    ${infoCard('Registration Details', [
      ['Status', 'Pending Review'],
      ['Next Step', 'Wait for admin approval'],
      ['Expected Time', 'Less than 24 hours'],
    ])}
  `));
}

// ── 3. Account approved ───────────────────────────────────────
export async function mailApproved(email: string, name: string): Promise<void> {
  await send(email, `Account Approved — ${SITE}`, baseTemplate('Your Account Has Been Approved', `
    ${p(`Hello <strong style="color:#111827;">${name}</strong>,`)}
    ${p('Great news — your AgriPulse account has been reviewed and approved by the administrator. You now have full access to the platform and can start managing your farm immediately.')}
    ${alertBox('Your account is now active. You can sign in and begin using all features.', 'success')}
    ${btn('Sign In to AgriPulse', `${CLIENT_URL}/login`)}
  `));
}

// ── 4. Password reset ─────────────────────────────────────────
export async function mailPasswordReset(email: string, name: string, token: string): Promise<void> {
  const link = `${CLIENT_URL}/reset-password?token=${token}`;
  await send(email, `Reset Your Password — ${SITE}`, baseTemplate('Reset Your Password', `
    ${p(`Hello <strong style="color:#111827;">${name}</strong>,`)}
    ${p('We received a request to reset the password for your AgriPulse account. Click the button below to choose a new password.')}
    ${alertBox('This password reset link will expire in <strong>1 hour</strong> for security reasons.', 'warning')}
    ${btn('Reset My Password', link)}
    ${p('<span style="font-size:13px;color:#9ca3af;">If you did not request a password reset, please ignore this email. Your password will remain unchanged and your account is secure.</span>')}
  `));
}

// ── 5. Admin: new registration ────────────────────────────────
export async function mailAdminNewRegistration(name: string, email: string, mode: string): Promise<void> {
  await send(ADMIN_EMAIL, `New Registration${mode === 'approval' ? ' — Approval Required' : ''} — ${SITE}`,
    baseTemplate('New User Registration', `
      ${p('A new user has registered on the AgriPulse platform.')}
      ${infoCard('Registration Details', [
        ['Full Name', name],
        ['Email Address', email],
        ['Registration Mode', mode === 'approval' ? 'Requires Manual Approval' : 'Auto-approved'],
        ['Status', mode === 'approval' ? 'Pending Review' : 'Active'],
      ])}
      ${mode === 'approval' ? alertBox('This account requires your approval before the user can access the platform.', 'warning') : ''}
      ${mode === 'approval' ? btn('Review in Admin Panel', `${CLIENT_URL}/system`) : ''}
    `)
  );
}

// ── 6. Issue submitted — user ─────────────────────────────────
export async function mailIssueSubmitted(email: string, name: string, issueTitle: string, priority: string): Promise<void> {
  await send(email, `Issue Report Received — ${SITE}`, baseTemplate('We Received Your Report', `
    ${p(`Hello <strong style="color:#111827;">${name}</strong>,`)}
    ${p('Thank you for submitting your issue report. Our team has been notified and will review it as soon as possible. We take all reports seriously and aim to respond promptly.')}
    ${infoCard('Issue Summary', [
      ['Issue Title', issueTitle],
      ['Priority', priority.charAt(0).toUpperCase() + priority.slice(1)],
      ['Status', 'Open — Under Review'],
      ['Submitted', new Date().toLocaleDateString('en-KE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })],
    ])}
    ${alertBox('You will receive an email notification when the status of your issue is updated by the admin team.', 'info')}
    ${btn('View My Reports', `${CLIENT_URL}/report-issue`)}
  `));
}

// ── 7. Issue submitted — admin ────────────────────────────────
export async function mailAdminIssueSubmitted(reporterName: string, reporterEmail: string, issueTitle: string, description: string, category: string, priority: string): Promise<void> {
  const isUrgent = priority === 'critical' || priority === 'high';
  await send(ADMIN_EMAIL, `New Issue Report [${priority.toUpperCase()}] — ${SITE}`,
    baseTemplate('New Issue Report Submitted', `
      ${p('A user has submitted a new issue report on the AgriPulse platform.')}
      ${isUrgent ? alertBox('This issue has been marked as high priority and requires your immediate attention.', 'danger') : ''}
      ${infoCard('Issue Details', [
        ['Reporter Name', reporterName],
        ['Reporter Email', reporterEmail],
        ['Issue Title', issueTitle],
        ['Category', category],
        ['Priority', priority.charAt(0).toUpperCase() + priority.slice(1)],
        ['Status', 'Open'],
        ['Submitted', new Date().toLocaleDateString('en-KE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })],
      ])}
      ${infoCard('Description', [['Details', description]])}
      ${btn('Manage Issue in Admin Panel', `${CLIENT_URL}/system`)}
    `)
  );
}

// ── 8. Issue resolved — user ──────────────────────────────────
export async function mailIssueResolved(email: string, name: string, issueTitle: string, status: string, adminNote?: string): Promise<void> {
  const isResolved = status === 'resolved' || status === 'closed';
  await send(email, `Issue Update — ${SITE}`, baseTemplate('Your Issue Has Been Updated', `
    ${p(`Hello <strong style="color:#111827;">${name}</strong>,`)}
    ${p('There is an update on your AgriPulse issue report. Please review the details below.')}
    ${infoCard('Issue Update', [
      ['Issue Title', issueTitle],
      ['New Status', status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)],
      ['Updated', new Date().toLocaleDateString('en-KE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })],
      ...(adminNote ? [['Admin Note', adminNote] as [string,string]] : []),
    ])}
    ${isResolved ? alertBox('Your issue has been resolved. Thank you for taking the time to report this and helping us improve AgriPulse.', 'success') : alertBox('Our team is actively working on your issue. We will keep you updated on any further progress.', 'info')}
    ${btn('View My Reports', `${CLIENT_URL}/report-issue`)}
  `));
}

// ── 9. Announcement ───────────────────────────────────────────
export async function mailAnnouncement(email: string, name: string, title: string, body: string, type: string): Promise<void> {
  const alertType = type === 'warning' ? 'warning' : type === 'success' ? 'success' : 'info';
  await send(email, `${title} — ${SITE}`, baseTemplate(title, `
    ${p(`Hello <strong style="color:#111827;">${name}</strong>,`)}
    ${p('The AgriPulse team has an important announcement for you.')}
    ${alertBox(body, alertType as 'danger'|'warning'|'success'|'info')}
    ${btn('Go to Dashboard', `${CLIENT_URL}/dashboard`)}
  `));
}

// ── 10. Maintenance notice ────────────────────────────────────
export async function mailMaintenanceNotice(email: string, name: string, scheduledTime: string, durationMinutes: number): Promise<void> {
  await send(email, `Scheduled Maintenance — ${SITE}`, baseTemplate('Scheduled Maintenance Notice', `
    ${p(`Hello <strong style="color:#111827;">${name}</strong>,`)}
    ${p('We want to inform you in advance that the AgriPulse platform will be undergoing scheduled maintenance. During this period, the system will be temporarily unavailable.')}
    ${infoCard('Maintenance Schedule', [
      ['Scheduled Time', scheduledTime],
      ['Estimated Duration', `${durationMinutes} minutes`],
      ['Impact', 'Platform temporarily unavailable'],
      ['Affected Services', 'All platform features'],
    ])}
    ${alertBox('We recommend completing any urgent tasks before the scheduled maintenance window begins.', 'warning')}
    ${p('<span style="font-size:13px;color:#9ca3af;">We apologise for any inconvenience this may cause. The platform will be restored to full service as soon as maintenance is complete.</span>')}
  `));
}

// ── 11. Breeding alert ────────────────────────────────────────
export async function mailBreedingAlert(animalName: string, tagNumber: string, daysInfo: string, alertType: 'overdue'|'due3'|'due7'): Promise<void> {
  const configs = {
    overdue: {
      subject: `Urgent: Overdue Birth — ${animalName}`,
      title: 'Overdue Birth Alert',
      message: `${animalName} has passed the expected birth date and requires immediate attention. Please inspect the animal as soon as possible.`,
      type: 'danger' as const,
      action: 'Inspect Animal Immediately',
    },
    due3: {
      subject: `Birth Alert: ${animalName} Due Within 3 Days`,
      title: 'Birth Due in 3 Days',
      message: `${animalName} is expected to give birth within the next 3 days. Please ensure the calving area is prepared and all necessary supplies are in place.`,
      type: 'warning' as const,
      action: 'View Breeding Records',
    },
    due7: {
      subject: `Birth Reminder: ${animalName} Due Within 7 Days`,
      title: 'Upcoming Birth Reminder',
      message: `${animalName} is expected to give birth within the next 7 days. Begin preparing for the upcoming calving.`,
      type: 'info' as const,
      action: 'View Breeding Records',
    },
  };
  const c = configs[alertType];
  await sendTelegram(`<b>AgriPulse Alert: ${c.title}</b>\n\nAnimal: ${animalName} (Tag: ${tagNumber})\nStatus: ${daysInfo}\n\nCheck your farm immediately.`);
  await send(ADMIN_EMAIL, c.subject, baseTemplate(c.title, `
    ${p('This is an automated alert from your AgriPulse farm management system.')}
    ${alertBox(c.message, c.type)}
    ${infoCard('Animal Details', [
      ['Animal Name', animalName],
      ['Tag Number', tagNumber],
      ['Birth Status', daysInfo],
      ['Alert Generated', new Date().toLocaleDateString('en-KE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })],
    ])}
    ${btn(c.action, `${CLIENT_URL}/dashboard`)}
  `));
}

// ── 12. Low milk alert ────────────────────────────────────────
export async function mailLowMilkAlert(animalName: string, avgLiters: string): Promise<void> {
  await sendTelegram(`<b>Low Milk Alert</b>\n\n${animalName} averaging ${avgLiters}L/day (below 5L threshold).\nCheck feed and health records.`);
  await send(ADMIN_EMAIL, `Low Milk Production Alert: ${animalName} — ${SITE}`, baseTemplate('Low Milk Production Alert', `
    ${p('This is an automated alert from your AgriPulse farm management system.')}
    ${alertBox(`${animalName} has been consistently producing below the minimum threshold over the past 7 days. This may indicate a health issue, nutritional deficiency, or stress factor that requires your attention.`, 'warning')}
    ${infoCard('Production Details', [
      ['Animal Name', animalName],
      ['7-Day Average', `${avgLiters} litres per day`],
      ['Minimum Threshold', '5 litres per day'],
      ['Recommended Action', 'Review feed, health records, and stress factors'],
      ['Alert Generated', new Date().toLocaleDateString('en-KE', { weekday:'long', year:'numeric', month:'long', day:'numeric' })],
    ])}
    ${btn('View Milk Production Records', `${CLIENT_URL}/dashboard`)}
  `));
}

// ── 13. Weekly report ─────────────────────────────────────────
export async function mailWeeklyReport(email: string, name: string, data: {
  totalAnimals: number; weekMilk: number; avgDaily: number;
  healthRecords: number; pregnantCount: number; overdueCount: number;
  weekIncome: number; weekExpense: number; topCow: string;
  topCowLiters: number; weekStart: string; weekEnd: string;
}): Promise<void> {
  const profit = data.weekIncome - data.weekExpense;
  const profitText = profit >= 0 ? `KSh ${profit.toLocaleString()} profit` : `KSh ${Math.abs(profit).toLocaleString()} loss`;
  await sendTelegram(`<b>Weekly Farm Report</b>\n${data.weekStart} to ${data.weekEnd}\n\nAnimals: ${data.totalAnimals}\nMilk: ${data.weekMilk.toFixed(1)}L\nIncome: KSh ${data.weekIncome.toLocaleString()}\nExpenses: KSh ${data.weekExpense.toLocaleString()}\nNet: KSh ${(data.weekIncome-data.weekExpense).toLocaleString()}\n${data.overdueCount > 0 ? '\nURGENT: '+data.overdueCount+' overdue birth(s)!' : ''}`);
  await send(email, `Weekly Farm Report — ${data.weekStart} to ${data.weekEnd}`, baseTemplate('Weekly Farm Report', `
    ${p(`Hello <strong style="color:#111827;">${name}</strong>,`)}
    ${p(`Here is your AgriPulse farm performance summary for the week of <strong style="color:#111827;">${data.weekStart} to ${data.weekEnd}</strong>.`)}
    ${statsRow([
      { label: 'Total Animals', value: String(data.totalAnimals) },
      { label: 'Week Milk', value: `${data.weekMilk.toFixed(1)}L` },
      { label: 'Net This Week', value: profitText.includes('profit') ? `+KSh ${profit.toLocaleString()}` : `-KSh ${Math.abs(profit).toLocaleString()}` },
    ])}
    ${sectionTitle('Milk Production')}
    ${infoCard('Production Summary', [
      ['Total Milk This Week', `${data.weekMilk.toFixed(1)} litres`],
      ['Daily Average', `${data.avgDaily.toFixed(1)} litres per day`],
      ['Top Producing Animal', `${data.topCow} — ${data.topCowLiters.toFixed(1)} litres`],
    ])}
    ${sectionTitle('Health and Breeding')}
    ${infoCard('Herd Status', [
      ['Health Records This Week', String(data.healthRecords)],
      ['Pregnant Animals', String(data.pregnantCount)],
      ['Overdue Births', data.overdueCount > 0 ? `${data.overdueCount} animal(s) overdue` : 'None'],
    ])}
    ${data.overdueCount > 0 ? alertBox(`You have ${data.overdueCount} overdue birth(s) that require immediate attention. Please inspect these animals as soon as possible.`, 'danger') : ''}
    ${sectionTitle('Financial Summary')}
    ${infoCard('Week Finances', [
      ['Total Income', `KSh ${data.weekIncome.toLocaleString()}`],
      ['Total Expenses', `KSh ${data.weekExpense.toLocaleString()}`],
      ['Net Result', profitText],
    ])}
    ${btn('View Full Dashboard', `${CLIENT_URL}/dashboard`)}
    ${p('<span style="font-size:13px;color:#9ca3af;">Weekly reports are sent every Monday morning. You can access detailed analytics and historical data from your AgriPulse dashboard at any time.</span>')}
  `));
}

// ── 14. Monthly overview ──────────────────────────────────────
export async function mailMonthlyOverview(email: string, name: string, data: {
  month: string; totalAnimals: number; monthMilk: number;
  avgDailyMilk: number; healthRecords: number; vaccinations: number;
  birthsThisMonth: number; pregnantCount: number; monthIncome: number;
  monthExpense: number; topCow: string; topCowLiters: number; newAnimals: number;
}): Promise<void> {
  const profit = data.monthIncome - data.monthExpense;
  const profitText = profit >= 0 ? `KSh ${profit.toLocaleString()} profit` : `KSh ${Math.abs(profit).toLocaleString()} loss`;
  await send(email, `Monthly Farm Overview — ${data.month}`, baseTemplate(`Monthly Overview: ${data.month}`, `
    ${p(`Hello <strong style="color:#111827;">${name}</strong>,`)}
    ${p(`Here is your complete AgriPulse farm performance overview for <strong style="color:#111827;">${data.month}</strong>. This report covers all farm activity recorded during the month.`)}
    ${statsRow([
      { label: 'Total Animals', value: String(data.totalAnimals) },
      { label: 'Month Milk', value: `${data.monthMilk.toFixed(0)}L` },
      { label: 'Net Result', value: profit >= 0 ? `+KSh ${(profit/1000).toFixed(1)}k` : `-KSh ${(Math.abs(profit)/1000).toFixed(1)}k` },
    ])}
    ${sectionTitle('Herd Summary')}
    ${infoCard('Animal Overview', [
      ['Total Active Animals', String(data.totalAnimals)],
      ['New Animals Added', String(data.newAnimals)],
      ['Currently Pregnant', String(data.pregnantCount)],
      ['Births This Month', String(data.birthsThisMonth)],
    ])}
    ${sectionTitle('Milk Production')}
    ${infoCard('Production Overview', [
      ['Total Milk This Month', `${data.monthMilk.toFixed(1)} litres`],
      ['Daily Average', `${data.avgDailyMilk.toFixed(1)} litres per day`],
      ['Top Producing Animal', `${data.topCow} — ${data.topCowLiters.toFixed(1)} litres`],
    ])}
    ${sectionTitle('Health Records')}

    ${sectionTitle('Health Records')}
    ${infoCard('Health Summary', [
      ['Total Health Records', String(data.healthRecords)],
      ['Vaccinations Administered', String(data.vaccinations)],
      ['Treatment Records', String(data.healthRecords - data.vaccinations)],
    ])}
    ${sectionTitle('Financial Summary')}
    ${infoCard('Monthly Finances', [
      ['Total Income', `KSh ${data.monthIncome.toLocaleString()}`],
      ['Total Expenses', `KSh ${data.monthExpense.toLocaleString()}`],
      ['Net Profit / Loss', profitText],
    ])}
    ${profit < 0 ? alertBox('Your farm recorded a net loss this month. Review your expense categories in the financial reports section.', 'warning') : alertBox(`Your farm recorded a net profit of KSh ${profit.toLocaleString()} this month.`, 'success')}
    ${btn('View Full Monthly Reports', `${CLIENT_URL}/reports`)}
    ${p('<span style="font-size:13px;color:#9ca3af;">Monthly overview reports are sent on the 1st of every month.</span>')}
  `));
}

// ── 15. Email verification ────────────────────────────────────
export async function mailEmailVerification(email: string, name: string, token: string): Promise<void> {
  const link = `${CLIENT_URL}/verify-email?token=${token}`;
  await send(email, `Verify Your Email — ${SITE}`, baseTemplate('Verify Your Email Address', `
    ${p(`Hello <strong style="color:#111827;">${name}</strong>,`)}
    ${p('Thank you for registering on AgriPulse. Please verify your email address by clicking the button below to complete your account setup.')}
    ${alertBox('This verification link will expire in 24 hours.', 'warning')}
    ${btn('Verify My Email Address', link)}
    ${infoCard('Account Details', [
      ['Name', name],
      ['Email', email],
      ['Status', 'Pending Verification'],
    ])}
    ${p('<span style="font-size:13px;color:#9ca3af;">If you did not create this account, please ignore this email.</span>')}
  `));
}

// ── 16. Resend verification ───────────────────────────────────
export async function mailResendVerification(email: string, name: string, token: string): Promise<void> {
  const link = `${CLIENT_URL}/verify-email?token=${token}`;
  await send(email, `New Verification Link — ${SITE}`, baseTemplate('Your New Verification Link', `
    ${p(`Hello <strong style="color:#111827;">${name}</strong>,`)}
    ${p('You requested a new email verification link. Your previous link has been invalidated.')}
    ${alertBox('This new verification link will expire in 24 hours.', 'warning')}
    ${btn('Verify My Email Address', link)}
    ${p('<span style="font-size:13px;color:#9ca3af;">If you did not request this, please ignore this email.</span>')}
  `));
}

// ── Security Alert ────────────────────────────────────────────
export async function mailSecurityAlert(data: {
  type: string;
  title: string;
  message: string;
  ip: string;
  details: [string, string][];
}): Promise<void> {
  const adminEmail = 'leemwenda8714@gmail.com, agripulse254@gmail.com';
  const color = data.type === 'brute_force' ? '#dc2626' : data.type === 'new_ip_login' ? '#d97706' : '#7c3aed';
  const rows = data.details.map(([k, v]) => `
    <tr>
      <td style="padding:10px 16px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;width:160px;">${k}</td>
      <td style="padding:10px 16px;color:#111827;font-size:13px;font-weight:600;border-bottom:1px solid #f3f4f6;">${v}</td>
    </tr>`).join('');

  await sendTelegram(`<b>Security Alert: ${data.title}</b>\n\n${data.message}\n\nIP: ${data.ip}\nTime: ${new Date().toISOString()}`);
  await send(adminEmail, `Security Alert: ${data.title} — ${SITE}`, `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f6f8f7;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 15px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
  <tr><td style="background:${color};padding:32px 40px;">
    <div style="color:#fff;font-size:22px;font-weight:700;">🚨 ${data.title}</div>
    <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:6px;">${SITE} Security System</div>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <p style="color:#374151;font-size:15px;margin:0 0 24px;">${data.message}</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <tr><td colspan="2" style="padding:12px 16px;background:#f9fafb;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">Incident Details</td></tr>
      ${rows}
    </table>
    <div style="margin-top:24px;padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;">
      <p style="color:#dc2626;font-size:13px;margin:0;font-weight:600;">If this was not you, please review your security settings immediately.</p>
    </div>
    <a href="${CLIENT_URL}/system" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#166534;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View Admin Panel</a>
  </td></tr>
  <tr><td style="padding:20px 40px;background:#f9fafb;font-size:12px;color:#9ca3af;border-top:1px solid #f0f0f0;">
    © ${new Date().getFullYear()} ${SITE} Security System. This is an automated alert.
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`);
}

// ── Daily Security Summary ────────────────────────────────────
export async function mailDailySecuritySummary(data: {
  failedLogins: number;
  successfulLogins: number;
  newUsers: number;
  activeUsers: number;
  topAttackers: string;
  date: string;
}): Promise<void> {
  const adminEmail = 'leemwenda8714@gmail.com, agripulse254@gmail.com';
  const threatLevel = data.failedLogins > 20 ? 'HIGH' : data.failedLogins > 5 ? 'MEDIUM' : 'LOW';
  const threatColor = threatLevel === 'HIGH' ? '#dc2626' : threatLevel === 'MEDIUM' ? '#d97706' : '#16a34a';

  await send(adminEmail, `Daily Security Report — ${data.date} — ${SITE}`, `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f6f8f7;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 15px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
  <tr><td style="background:linear-gradient(160deg,#166534,#14532d);padding:32px 40px;">
    <div style="color:#fff;font-size:22px;font-weight:700;">Daily Security Report</div>
    <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:6px;">${data.date}</div>
  </td></tr>
  <tr><td style="padding:32px 40px;">
    <div style="display:inline-block;padding:6px 16px;background:${threatColor};color:#fff;border-radius:99px;font-size:12px;font-weight:700;margin-bottom:24px;">
      THREAT LEVEL: ${threatLevel}
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="padding:16px;background:#f0fdf4;border-radius:8px;text-align:center;width:25%;">
          <div style="font-size:28px;font-weight:800;color:#16a34a;">${data.successfulLogins}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:4px;">Successful Logins</div>
        </td>
        <td style="width:8px;"></td>
        <td style="padding:16px;background:#fef2f2;border-radius:8px;text-align:center;width:25%;">
          <div style="font-size:28px;font-weight:800;color:#dc2626;">${data.failedLogins}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:4px;">Failed Attempts</div>
        </td>
        <td style="width:8px;"></td>
        <td style="padding:16px;background:#eff6ff;border-radius:8px;text-align:center;width:25%;">
          <div style="font-size:28px;font-weight:800;color:#2563eb;">${data.newUsers}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:4px;">New Registrations</div>
        </td>
        <td style="width:8px;"></td>
        <td style="padding:16px;background:#f5f3ff;border-radius:8px;text-align:center;width:25%;">
          <div style="font-size:28px;font-weight:800;color:#7c3aed;">${data.activeUsers}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:4px;">Active Users</div>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      <tr><td colspan="2" style="padding:12px 16px;background:#f9fafb;font-size:13px;font-weight:600;color:#111827;border-bottom:1px solid #e5e7eb;">Top Suspicious IPs (Last 24h)</td></tr>
      <tr><td style="padding:14px 16px;color:#374151;font-size:13px;">${data.topAttackers}</td></tr>
    </table>
    <a href="${CLIENT_URL}/system" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#166534;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">View Admin Panel</a>
  </td></tr>
  <tr><td style="padding:20px 40px;background:#f9fafb;font-size:12px;color:#9ca3af;border-top:1px solid #f0f0f0;">
    © ${new Date().getFullYear()} ${SITE} Security System. Daily report generated automatically.
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`);
}
