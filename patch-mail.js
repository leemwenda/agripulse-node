const fs = require("fs");
const path = "/home/mwenda/agripulse/src/services/mail.service.ts";
let content = fs.readFileSync(path, "utf8");
let changes = 0;

function mustReplace(oldStr, newStr) {
  if (!content.includes(oldStr)) throw new Error("NOT FOUND: " + oldStr.slice(0, 60));
  content = content.replace(oldStr, newStr);
  changes++;
}

// 1. Add import
mustReplace(
  "import fs from 'fs';",
  "import fs from 'fs';\nimport { generateMonthlyPDF } from './pdf.service';"
);

// 2. Provider interface signature
mustReplace(
  "  send: (to: string, from: string, subject: string, html: string) => Promise<void>;",
  "  send: (to: string, from: string, subject: string, html: string, attachment?: { name: string; content: string }) => Promise<void>;"
);

// 3. send() wrapper signature
mustReplace(
  "async function send(to: string, subject: string, html: string): Promise<void> {",
  "async function send(to: string, subject: string, html: string, attachment?: { name: string; content: string }): Promise<void> {"
);

// 4. provider.send call
mustReplace(
  "      await provider.send(to, FROM, subject, html);",
  "      await provider.send(to, FROM, subject, html, attachment);"
);

// 5. All 3 provider send signatures (identical text, replace all)
{
  const oldSig = "    send: async (to, from, subject, html) => {";
  const newSig = "    send: async (to, from, subject, html, attachment) => {";
  if (!content.includes(oldSig)) throw new Error("NOT FOUND: provider signature");
  const count = content.split(oldSig).length - 1;
  content = content.split(oldSig).join(newSig);
  changes += count;
  console.log("Patched " + count + " provider signatures");
}

// 6. Brevo body
mustReplace(
  "        body: JSON.stringify({ sender: { name: m ? m[1].trim() : 'AgriPulse', email: m ? m[2].trim() : from }, to: [{ email: to }], subject, htmlContent: html }),",
  "        body: JSON.stringify({ sender: { name: m ? m[1].trim() : 'AgriPulse', email: m ? m[2].trim() : from }, to: [{ email: to }], subject, htmlContent: html, attachment: attachment ? [{ name: attachment.name, content: attachment.content }] : undefined }),"
);

// 7. Resend body
mustReplace(
  "        body: JSON.stringify({ from, to, subject, html }),",
  "        body: JSON.stringify({ from, to, subject, html, attachments: attachment ? [{ filename: attachment.name, content: attachment.content }] : undefined }),"
);

// 8. Mailjet body
mustReplace(
  "        body: JSON.stringify({ Messages: [{ From: { Email: m ? m[2].trim() : from, Name: m ? m[1].trim() : 'AgriPulse' }, To: [{ Email: to }], Subject: subject, HTMLPart: html }] }),",
  "        body: JSON.stringify({ Messages: [{ From: { Email: m ? m[2].trim() : from, Name: m ? m[1].trim() : 'AgriPulse' }, To: [{ Email: to }], Subject: subject, HTMLPart: html, Attachments: attachment ? [{ ContentType: 'application/pdf', Filename: attachment.name, Base64Content: attachment.content }] : undefined }] }),"
);

// 9. Insert PDF generation in mailMonthlyOverview (anchored to that function only)
const fnStart = "export async function mailMonthlyOverview(email: string, name: string, data: {";
const fnIdx = content.indexOf(fnStart);
if (fnIdx === -1) throw new Error("mailMonthlyOverview not found");

const profitLine = "const profitText = profit>=0?`KSh ${profit.toLocaleString()} profit`:`KSh ${Math.abs(profit).toLocaleString()} loss`;";
const profitIdx = content.indexOf(profitLine, fnIdx);
if (profitIdx === -1) throw new Error("profitText line not found inside mailMonthlyOverview");
const insertPoint = profitIdx + profitLine.length;
const insertion = "\n  const pdfBuffer = await generateMonthlyPDF({ ...data, farmName: name });\n  const pdfAttachment = { name: `AgriPulse-Monthly-Report-${data.month.replace(/\\s+/g, '-')}.pdf`, content: pdfBuffer.toString('base64') };";
content = content.slice(0, insertPoint) + insertion + content.slice(insertPoint);
changes++;

// 10. Attach pdfAttachment to the send() call inside mailMonthlyOverview (search from fnIdx forward)
const endMarker = "    ${btn('View Full Monthly Reports',`${URL}/reports`)}\n  `));\n}";
const endIdx = content.indexOf(endMarker, fnIdx);
if (endIdx === -1) throw new Error("end-of-function marker not found");
const endReplacement = "    ${btn('View Full Monthly Reports',`${URL}/reports`)}\n  `), pdfAttachment);\n}";
content = content.slice(0, endIdx) + endReplacement + content.slice(endIdx + endMarker.length);
changes++;

fs.writeFileSync(path, content, "utf8");
console.log("✅ All " + changes + " patches applied successfully");
