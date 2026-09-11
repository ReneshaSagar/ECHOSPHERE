const nodemailer = require('nodemailer');
const fs = require('fs');

// Read key from .env.local
const envLocal = fs.readFileSync('frontend/.env.local', 'utf8');
const userMatch = envLocal.match(/GMAIL_USER=["']?([^"'\r\n]+)["']?/);
const passMatch = envLocal.match(/GMAIL_APP_PASSWORD=["']?([^"'\r\n]+)["']?/);

const gmailUser = userMatch ? userMatch[1].trim() : null;
const gmailPass = passMatch ? passMatch[1].trim() : null;

if (!gmailUser || !gmailPass) {
  console.error('Missing GMAIL_USER or GMAIL_APP_PASSWORD in frontend/.env.local');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailUser,
    pass: gmailPass
  }
});

async function main() {
  const recipientEmail = 'reneshasagar@gmail.com';
  const candidateName = 'Renesha Sagar';
  const jobTitle = 'Senior Full Stack Engineer — Next.js & Developer Platform';
  const scheduledAt = '2026-09-17T12:00:00Z';
  const interviewLink = 'http://localhost:3000/interview/int_67z12dp';

  const dateObj = new Date(scheduledAt);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  }) + ' IST';
  const fullDateTime = `${formattedDate} at ${formattedTime}`;

  // Google Calendar Link
  const startTime = new Date(scheduledAt);
  const endTime = new Date(startTime.getTime() + 45 * 60 * 1000);
  const formatGCalDate = (d) => d.toISOString().replace(/-|:|\.\d+/g, '');
  const dates = `${formatGCalDate(startTime)}/${formatGCalDate(endTime)}`;
  const title = encodeURIComponent(`Plantra Labs Technical Interview: ${candidateName} (${jobTitle})`);
  const details = encodeURIComponent(
    `Role: ${jobTitle}\n` +
    `Candidate: ${candidateName}\n` +
    `Time: ${fullDateTime}\n` +
    `Interview Room: ${interviewLink}\n\n` +
    `Interview Structure:\n` +
    `• Round 1: Practical Workspace Assessment (Coding & System Design)\n` +
    `• Round 2: Technical Architecture Panel\n` +
    `• Round 3: Engineering Leadership & Cultural Alignment\n\n` +
    `Please join the room 5 minutes before your scheduled start time to check your microphone and camera.`
  );
  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;

  console.log(`Sending live email via Gmail SMTP to ${recipientEmail}...`);
  console.log(`Slot: ${fullDateTime}`);

  const info = await transporter.sendMail({
    from: `"Plantra Labs Talent" <${gmailUser}>`,
    to: recipientEmail,
    subject: `Interview Invitation: ${jobTitle} at Plantra Labs`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interview Invitation</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 36px 16px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #f1f5f9;">
                    <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.02em; color: #0f172a;">
                      plantra<span style="color: #7c3aed;"> ·</span> labs
                    </div>
                    <div style="font-size: 12px; font-weight: 500; color: #64748b; margin-top: 2px;">
                      Talent & Engineering Operations
                    </div>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 32px 32px 28px 32px; line-height: 1.6; font-size: 15px; color: #334155;">
                    <h2 style="font-size: 19px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">
                      Interview Invitation: ${jobTitle}
                    </h2>

                    <p>Hi <strong>${candidateName}</strong>,</p>
                    <p>Thank you for your interest in Plantra Labs. Following a review of your application, we are pleased to invite you to interview for the <strong>${jobTitle}</strong> role.</p>
                    
                    <!-- Confirmed Slot Card -->
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 22px; text-align: center; margin: 24px 0;">
                      <div style="font-size: 11.5px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Confirmed Schedule</div>
                      <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 4px;">${formattedDate}</div>
                      <div style="font-size: 15px; font-weight: 600; color: #7c3aed; margin-top: 2px;">${formattedTime}</div>

                      <div style="margin-top: 18px;">
                        <a href="${interviewLink}" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 11px 26px; border-radius: 6px;">
                          Enter Interview Room
                        </a>
                      </div>

                      <div style="margin-top: 12px;">
                        <a href="${gcalUrl}" target="_blank" style="font-size: 12.5px; color: #7c3aed; text-decoration: underline; font-weight: 500;">
                          + Add to Google Calendar
                        </a>
                      </div>
                    </div>

                    <!-- 3 Rounds Breakdown -->
                    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
                      <div style="font-size: 13px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 12px;">
                        Interview Structure:
                      </div>

                      <div style="margin-bottom: 10px;">
                        <strong style="color: #0f172a; font-size: 13.5px;">Round 1: Practical Workspace Assessment</strong>
                        <div style="font-size: 13px; color: #64748b; margin-top: 2px;">Hands-on coding and system design in our interactive workspace.</div>
                      </div>

                      <div style="margin-bottom: 10px;">
                        <strong style="color: #0f172a; font-size: 13.5px;">Round 2: Technical Architecture Panel</strong>
                        <div style="font-size: 13px; color: #64748b; margin-top: 2px;">Technical discussion exploring distributed architecture, concurrency, and trade-offs.</div>
                      </div>

                      <div>
                        <strong style="color: #0f172a; font-size: 13.5px;">Round 3: Engineering Leadership & Cultural Alignment</strong>
                        <div style="font-size: 13px; color: #64748b; margin-top: 2px;">Conversational session on past projects, incident management, and team collaboration.</div>
                      </div>
                    </div>

                    <p style="font-size: 13.5px; color: #64748b;">
                      Please access the link a few minutes early to verify your camera and microphone settings. The interview will begin promptly at your scheduled time.
                    </p>

                    <p style="margin-top: 24px;">
                      Best regards,<br/>
                      <strong>The Plantra Labs Talent Team</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b;">
                    <div>Plantra Labs Talent Operations</div>
                    <div style="margin-top: 4px; font-size: 11px; color: #94a3b8;">Plantra Labs, Inc. • Bengaluru · Singapore · London</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `
  });

  console.log('Message ID:', info.messageId);
}

main().catch(err => console.error('Execution Error:', err));
