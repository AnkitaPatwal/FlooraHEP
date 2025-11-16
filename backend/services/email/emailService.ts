import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

// Create a reusable transporter object using SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // use true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Helper function to load the HTML template and inject the user's name
function getTemplate(templateName: string, name: string) {
  const templatePath = path.join(__dirname, 'templates', templateName);
  const html = fs.readFileSync(templatePath, 'utf8');
  return html.replace('{{name}}', name);
}

export async function sendApprovalEmail(to: string, name: string) {
  const html = getTemplate('accountApproved.html', name);

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to,
    subject: 'Your Account Has Been Approved!',
    html,
  });

  console.log(`Approval email sent to ${to}`);
}

export async function sendDenialEmail(to: string, name: string) {
  const html = getTemplate('accountDenied.html', name);

  await transporter.sendMail({
    from: process.env.FROM_EMAIL,
    to,
    subject: 'Account Request Denied',
    html,
  });

  console.log(`Denial email sent to ${to}`);
}
