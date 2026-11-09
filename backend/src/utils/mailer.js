const nodemailer = require('nodemailer');

const isConfigured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = isConfigured
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const PURPOSE_TEXT = {
  verify_email: {
    subject: 'Verify your SmartStay account',
    heading: 'Verify your email',
    line: 'Use this code to finish creating your SmartStay account.',
  },
  reset_password: {
    subject: 'Reset your SmartStay password',
    heading: 'Reset your password',
    line: 'Use this code to set a new password for your SmartStay account.',
  },
};

function buildHtml({ name, code, purpose, expiryMinutes }) {
  const t = PURPOSE_TEXT[purpose];
  return `
  <div style="font-family:Inter,Arial,sans-serif;background:#F4F7FB;padding:32px 16px;">
    <div style="max-width:440px;margin:0 auto;background:#fff;border:1px solid #E2E8F0;border-radius:24px;padding:32px;">
      <div style="font-size:20px;font-weight:800;color:#0F172A;margin-bottom:24px;">
        Smart<span style="color:#059669;">Stay</span>
      </div>
      <h2 style="margin:0 0 8px;color:#0F172A;font-size:22px;">${t.heading}</h2>
      <p style="margin:0 0 24px;color:#64748B;font-size:14px;line-height:1.6;">
        Hi ${escapeHtml(name)}, ${t.line}
      </p>
      <div style="background:#ECFDF5;border-radius:16px;padding:20px;text-align:center;
                  font-size:34px;font-weight:800;letter-spacing:10px;color:#059669;">
        ${code}
      </div>
      <p style="margin:24px 0 0;color:#94A3B8;font-size:12px;line-height:1.6;">
        This code expires in ${expiryMinutes} minutes. If you didn't request it, you can ignore this email.
      </p>
    </div>
  </div>`;
}

async function sendOtpEmail({ to, name, code, purpose, expiryMinutes }) {
  const t = PURPOSE_TEXT[purpose];

  if (!isConfigured) {
    // Development mode: no email account set in .env, so show the code in the terminal.
    console.log(`\n[DEV EMAIL] ${t.subject} -> ${to}\n[DEV EMAIL] Code: ${code}\n`);
    return;
  }

  await transporter.sendMail({
    from: `"SmartStay" <${process.env.SMTP_USER}>`,
    to,
    subject: t.subject,
    text: `${t.heading}\n\nHi ${name}, ${t.line}\n\nYour code: ${code}\n\nIt expires in ${expiryMinutes} minutes.`,
    html: buildHtml({ name, code, purpose, expiryMinutes }),
  });
}

const escapeHtml = (text = '') =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const ROLE_NAMES = { admin: 'Admin', warden: 'Warden', staff: 'Staff' };

// Sent when a new account is created with a temporary password:
// - a hostel owner added by the Super Admin (isOwner = true)
// - an Admin / Warden / Staff member added by their hostel's Admin or Warden
async function sendWelcomeEmail({
  to,
  name,
  role = 'admin',
  isOwner = false,
  hostelName,
  hostelCode,
  tempPassword,
  loginUrl,
}) {
  const roleName = ROLE_NAMES[role] || role;
  const subject = `Your SmartStay account for ${hostelName}`;
  const intro = isOwner
    ? `your hostel <strong>${escapeHtml(hostelName)}</strong> is now set up on SmartStay and you are its Admin.`
    : `a <strong>${escapeHtml(roleName)}</strong> account has been created for you at <strong>${escapeHtml(hostelName)}</strong> on SmartStay.`;
  const footer = isOwner
    ? 'Share the hostel code with your residents; they enter it when they sign up.'
    : role === 'staff'
      ? 'After setting your password on the website, you can also use the SmartStay mobile app.'
      : 'Residents use the hostel code above when they sign up.';
  // Hostel code is useful to owners, admins and wardens (they share it with residents).
  const showCode = role !== 'staff';

  if (!isConfigured) {
    console.log(
      `\n[DEV EMAIL] ${subject} -> ${to} (${roleName})\n[DEV EMAIL] Temporary password: ${tempPassword}\n[DEV EMAIL] Hostel code: ${hostelCode}\n`
    );
    return;
  }

  const html = `
  <div style="font-family:Inter,Arial,sans-serif;background:#F8FAFC;padding:32px 16px;">
    <div style="max-width:460px;margin:0 auto;background:#fff;border:1px solid #E2E8F0;border-radius:20px;padding:32px;">
      <div style="font-size:20px;font-weight:800;color:#0F172A;margin-bottom:24px;">
        Smart<span style="color:#10B981;">Stay</span>
      </div>
      <h2 style="margin:0 0 8px;color:#0F172A;font-size:22px;">Welcome to SmartStay</h2>
      <p style="margin:0 0 20px;color:#64748B;font-size:14px;line-height:1.6;">
        Hi ${escapeHtml(name)}, ${intro} Log in with the details below. You will be asked to choose a new password.
      </p>
      <table style="width:100%;font-size:14px;color:#0F172A;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#64748B;">Login email</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(to)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748B;">Temporary password</td><td style="padding:6px 0;font-weight:700;font-family:monospace;">${escapeHtml(tempPassword)}</td></tr>
        ${showCode ? `<tr><td style="padding:6px 0;color:#64748B;">Hostel code</td><td style="padding:6px 0;font-weight:700;font-family:monospace;">${escapeHtml(hostelCode)}</td></tr>` : ''}
      </table>
      <p style="margin:20px 0 0;color:#64748B;font-size:13px;line-height:1.6;">
        ${footer}
        Log in at <a href="${escapeHtml(loginUrl)}" style="color:#059669;">${escapeHtml(loginUrl)}</a>.
      </p>
    </div>
  </div>`;

  const plainIntro = isOwner
    ? `your hostel ${hostelName} is set up on SmartStay and you are its Admin.`
    : `a ${roleName} account has been created for you at ${hostelName} on SmartStay.`;

  await transporter.sendMail({
    from: `"SmartStay" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text: `Welcome to SmartStay\n\nHi ${name}, ${plainIntro}\n\nLogin email: ${to}\nTemporary password: ${tempPassword}\n${showCode ? `Hostel code: ${hostelCode}\n` : ''}\nLog in at ${loginUrl}. You will be asked to choose a new password.`,
    html,
  });
}

module.exports = { sendOtpEmail, sendWelcomeEmail, isConfigured };
