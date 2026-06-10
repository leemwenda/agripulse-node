const nodemailer = require('nodemailer');
const t = nodemailer.createTransport({ host: '127.0.0.1', port: 25, secure: false, tls: { rejectUnauthorized: false } });
const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#eef2ee;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ee;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;">
  <tr><td style="background:#1a6b3c;border-radius:12px 12px 0 0;padding:8px 40px;">
    <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:1px;text-transform:uppercase;">Smart Farm Management Platform</p>
  </td></tr>
  <tr><td style="background:linear-gradient(160deg,#1a6b3c 0%,#0d3d22 100%);padding:36px 40px;">
    <table width="100%"><tr>
      <td><img src="https://agripulse.me/logo.png" width="52" height="52" style="border-radius:10px;border:2px solid rgba(255,255,255,0.2);"></td>
      <td style="padding-left:16px;"><h1 style="margin:0;color:#fff;font-size:28px;font-weight:800;">AgriPulse</h1><p style="margin:3px 0 0;color:rgba(255,255,255,0.65);font-size:13px;">agripulse.me</p></td>
      <td align="right"><span style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);color:#fff;font-size:11px;font-weight:600;padding:5px 12px;border-radius:20px;">AUTOMATED NOTICE</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#fff;padding:28px 40px 0;border-left:1px solid #e0e7e0;border-right:1px solid #e0e7e0;">
    <p style="margin:0 0 6px;font-size:11px;color:#1a6b3c;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">AgriPulse Notification</p>
    <h2 style="margin:0;color:#0f1f0f;font-size:24px;font-weight:800;">Welcome to AgriPulse</h2>
    <div style="height:3px;background:linear-gradient(90deg,#1a6b3c,transparent);border-radius:2px;margin-top:16px;"></div>
  </td></tr>
  <tr><td style="background:#fff;padding:28px 40px;color:#374151;font-size:15px;line-height:1.9;border-left:1px solid #e0e7e0;border-right:1px solid #e0e7e0;">
    <p>Hi <strong>Leemwenda</strong>,</p>
    <p>Your AgriPulse farm account is ready. Start managing your herd, tracking milk production, monitoring health records, and getting AI-powered insights — all in one place.</p>
    <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="background:#1a6b3c;border-radius:8px;">
        <a href="https://agripulse.me/dashboard" style="display:inline-block;padding:14px 32px;color:#fff;font-size:14px;font-weight:700;text-decoration:none;">Go to Dashboard</a>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:16px 0;">
      <tr style="background:#f9fafb;"><td style="padding:12px 16px;font-size:13px;color:#6b7280;width:160px;border-bottom:1px solid #f3f4f6;">Account Status</td><td style="padding:12px 16px;font-size:13px;font-weight:600;border-bottom:1px solid #f3f4f6;"><span style="background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">ACTIVE</span></td></tr>
      <tr><td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #f3f4f6;">Platform</td><td style="padding:12px 16px;font-size:13px;color:#111827;font-weight:600;border-bottom:1px solid #f3f4f6;">AgriPulse Smart Farm Management</td></tr>
      <tr style="background:#f9fafb;"><td style="padding:12px 16px;font-size:13px;color:#6b7280;">Support</td><td style="padding:12px 16px;font-size:13px;color:#111827;font-weight:600;">notifications@agripulse.me</td></tr>
    </table>
  </td></tr>
  <tr><td style="background:#1a2e1a;border-radius:0 0 12px 12px;padding:28px 40px;">
    <table width="100%"><tr>
      <td><p style="margin:0;color:#fff;font-size:14px;font-weight:700;">AgriPulse</p><p style="margin:4px 0 0;color:rgba(255,255,255,0.5);font-size:12px;">Smart Farm Management — Powered by AI</p></td>
      <td align="right"><a href="https://agripulse.me" style="background:#1a6b3c;color:#fff;font-size:12px;font-weight:600;padding:8px 18px;border-radius:6px;text-decoration:none;">Visit Platform</a></td>
    </tr></table>
    <p style="margin:16px 0 0;font-size:11px;color:rgba(255,255,255,0.35);">This is an automated message from AgriPulse. Please do not reply.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

t.sendMail({ from: 'notifications@agripulse.me', to: 'leemwenda8714@gmail.com', subject: 'AgriPulse — Welcome to Smart Farm Management', html }, (err, info) => {
  if (err) console.error('FAIL:', err.message);
  else console.log('SENT:', info.response);
});
