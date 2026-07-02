import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const TESTMAIL_API_KEY = process.env.TESTMAIL_API_KEY!;
const TESTMAIL_NAMESPACE = process.env.TESTMAIL_NAMESPACE!;

async function fetchEmail(tag: string, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const { data } = await axios.get('https://api.testmail.app/api/json', {
      params: {
        apikey: TESTMAIL_API_KEY,
        namespace: TESTMAIL_NAMESPACE,
        tag,
        livequery: true,
      },
    });
    if (data.count > 0) return data.emails[0];
    await new Promise(r => setTimeout(r, 1500));
  }
  throw new Error(`No email received for tag "${tag}" within ${timeoutMs}ms`);
}

async function testWelcomeEmail() {
  const tag = `welcome-test-${Date.now()}`;
  const testEmail = `${tag}.${TESTMAIL_NAMESPACE}@inbox.testmail.app`;

  console.log('Registering test user:', testEmail);

  await axios.post('https://staging.agripulse.me/api/auth/register', {
    name: 'Test Buyer',
    email: testEmail,
    password: 'TestPass123!',
    role: 'buyer',
  });

  console.log('Waiting for email...');
  const email = await fetchEmail(tag);
  console.log('✓ Subject:', email.subject);
  console.log('✓ From:', email.from);
  console.log('✓ Body snippet:', email.text?.slice(0, 200));
}

testWelcomeEmail().catch(err => {
  console.error('✗ Test failed:', err.message);
  process.exit(1);
});
