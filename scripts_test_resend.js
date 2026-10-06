require('dotenv').config();

const recipients = ['leemwenda8714@gmail.com', 'carson00official@gmail.com'];

async function sendTest(to) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || 'AgriPulse <noreply@agripulse.me>',
      to,
      subject: 'AgriPulse — Production Email Test',
      html: '<p>This is a test email confirming production Resend integration is working correctly.</p>',
    }),
  });
  const data = await res.json();
  console.log(`${to} → status ${res.status}:`, JSON.stringify(data));
}

(async () => {
  for (const to of recipients) {
    await sendTest(to);
  }
})();
