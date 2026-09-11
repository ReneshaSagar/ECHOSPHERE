const { Resend } = require('resend');
const fs = require('fs');

// Read key from .env.local
const envLocal = fs.readFileSync('frontend/.env.local', 'utf8');
const match = envLocal.match(/RESEND_API_KEY=["']?([a-zA-Z0-9_-]+)["']?/);
const apiKey = match ? match[1] : null;

if (!apiKey) {
  console.error('No RESEND_API_KEY found in frontend/.env.local');
  process.exit(1);
}

const resend = new Resend(apiKey);

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
  const title = encodeURIComponent(`Plantra Labs AI Interview: ${candidateName} (${jobTitle})`);
  const details = encodeURIComponent(
    `Role: ${jobTitle}\n` +
    `Candidate: ${candidateName}\n` +
    `Time: ${fullDateTime}\n` +
    `Interview Room & Lobby: ${interviewLink}\n\n` +
    `OmniPanel 3-Round Evaluation Agenda:\n` +
    `• Round 1: Practical Workspace (Monaco Code Editor & System Design Canvas) [35%]\n` +
    `• Round 2: Multi-Agent Technical Panel (Lead Architect & Specialist Challenger) [50%]\n` +
    `• Round 3: Engineering Leadership & Cultural Alignment (STAR Deep-Dive) [15%]\n\n` +
    `Pre-Flight: Enter 5 minutes prior to check mic volume visualizer & camera mirror.`
  );
  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;

  console.log(`Sending live invitation email to ${recipientEmail}...`);
  console.log(`Slot (IST): ${fullDateTime}`);
  console.log(`Interview Link: ${interviewLink}`);

  const response = await resend.emails.send({
    from: 'Plantra Labs Talent <onboarding@resend.dev>',
    to: recipientEmail,
    subject: `Congratulations! You're Selected for an Interview: ${jobTitle} at Plantra Labs`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interview Invitation</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #070709; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #cbd5e1;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #070709; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #0f1016; border-radius: 16px; border: 1px solid rgba(139, 92, 246, 0.2); overflow: hidden; box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.7);">
                <!-- Header -->
                <tr>
                  <td style="padding: 28px 36px; background: linear-gradient(135deg, #161224 0%, #0d111e 100%); border-bottom: 1px solid rgba(139, 92, 246, 0.18);">
                    <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.03em; color: #ffffff;">
                      plantra<span style="color: #a855f7;"> ·</span> labs
                    </div>
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: #94a3b8; margin-top: 4px;">
                      Autonomous Multi-Agent Evaluation Platform • Powered by OmniPanel
                    </div>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding: 36px 36px 32px 36px; line-height: 1.65; font-size: 15px; color: #cbd5e1;">
                    <div style="text-align: center; margin-bottom: 24px;">
                      <span style="display: inline-block; background-color: rgba(34, 197, 94, 0.15); color: #4ade80; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; padding: 6px 16px; border-radius: 9999px; border: 1px solid rgba(34, 197, 94, 0.3);">
                        ✓ Selected for Interview
                      </span>
                      <h2 style="font-size: 24px; font-weight: 800; color: #ffffff; margin-top: 14px; margin-bottom: 6px; letter-spacing: -0.02em;">
                        You're Invited to Plantra Labs
                      </h2>
                      <p style="font-size: 14px; color: #94a3b8; margin: 0;">Role: <strong style="color: #e2e8f0;">${jobTitle}</strong></p>
                    </div>

                    <p>Hi <strong style="color: #ffffff;">${candidateName}</strong>,</p>
                    <p>Congratulations! We were impressed by your background, codecraft, and engineering track record. We are excited to invite you to our 3-round autonomous AI technical evaluation.</p>
                    
                    <!-- Confirmed Slot Card -->
                    <div style="background: linear-gradient(180deg, #151624 0%, #10111a 100%); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 14px; padding: 26px; text-align: center; margin: 24px 0;">
                      <div style="font-size: 11px; font-weight: 700; color: #a855f7; text-transform: uppercase; letter-spacing: 0.1em;">Confirmed Interview Slot</div>
                      <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin-top: 6px;">${formattedDate}</div>
                      <div style="font-size: 16px; font-weight: 700; color: #818cf8; margin-top: 2px;">${formattedTime}</div>

                      <div style="margin-top: 22px;">
                        <a href="${interviewLink}" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%); color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 13px 32px; border-radius: 10px; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">
                          Enter Interview Room & Lobby →
                        </a>
                      </div>

                      <div style="margin-top: 16px;">
                        <a href="${gcalUrl}" target="_blank" style="font-size: 12px; color: #a855f7; text-decoration: underline; font-weight: 600;">
                          + Add to Google Calendar (.ics)
                        </a>
                      </div>
                    </div>

                    <!-- 3 Rounds Breakdown -->
                    <div style="background-color: #12131c; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 22px; margin: 24px 0;">
                      <div style="font-size: 12px; font-weight: 700; color: #f8fafc; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px;">
                        Interview Structure (3 Evaluation Rounds):
                      </div>

                      <div style="padding: 12px; background-color: rgba(255, 255, 255, 0.02); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05); margin-bottom: 10px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td><strong style="color: #c084fc; font-size: 13px;">Round 1: Practical Workspace Assessment</strong></td>
                            <td align="right"><span style="font-size: 11px; font-weight: 700; color: #a855f7; background: rgba(168, 85, 247, 0.15); padding: 2px 8px; border-radius: 4px;">35% Weight</span></td>
                          </tr>
                        </table>
                        <div style="font-size: 12.5px; color: #94a3b8; margin-top: 6px; line-height: 1.5;">
                          Monaco code editor & System Design canvas with real-time test execution.
                        </div>
                      </div>

                      <div style="padding: 12px; background-color: rgba(255, 255, 255, 0.02); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05); margin-bottom: 10px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td><strong style="color: #60a5fa; font-size: 13px;">Round 2: Multi-Agent Technical Panel</strong></td>
                            <td align="right"><span style="font-size: 11px; font-weight: 700; color: #60a5fa; background: rgba(96, 165, 250, 0.15); padding: 2px 8px; border-radius: 4px;">50% Weight</span></td>
                          </tr>
                        </table>
                        <div style="font-size: 12.5px; color: #94a3b8; margin-top: 6px; line-height: 1.5;">
                          Lead Architect (Priya) & Specialist Challenger (Arjun) probing concurrency, scale, and failure modes.
                        </div>
                      </div>

                      <div style="padding: 12px; background-color: rgba(255, 255, 255, 0.02); border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.05);">
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td><strong style="color: #34d399; font-size: 13px;">Round 3: Leadership & Cultural Alignment</strong></td>
                            <td align="right"><span style="font-size: 11px; font-weight: 700; color: #34d399; background: rgba(52, 211, 153, 0.15); padding: 2px 8px; border-radius: 4px;">15% Weight</span></td>
                          </tr>
                        </table>
                        <div style="font-size: 12.5px; color: #94a3b8; margin-top: 6px; line-height: 1.5;">
                          STAR behavioral assessment with Head of People (Tara) on ownership and team collaboration.
                        </div>
                      </div>
                    </div>

                    <!-- Green Room Instructions -->
                    <div style="background-color: #0c0d14; border: 1px solid rgba(139, 92, 246, 0.2); border-radius: 10px; padding: 18px; margin: 20px 0; font-size: 13px; color: #94a3b8;">
                      <div style="font-weight: 700; color: #f1f5f9; margin-bottom: 6px;">⏱️ Green Room & Hardware Check:</div>
                      <div>Access your room link early to test your video mirror and verify microphone volume visualizer in the Green Room. The <strong>"Join Interview"</strong> CTA will unlock automatically at start time.</div>
                    </div>

                    <p style="margin-top: 28px; font-size: 14px; color: #94a3b8;">
                      We look forward to speaking with you!<br/>
                      <strong style="color: #f1f5f9;">The Plantra Labs Talent & Engineering Team</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 24px 36px; background-color: #090a0f; border-top: 1px solid rgba(255, 255, 255, 0.06); font-size: 12px; color: #64748b;">
                    <div>Plantra Labs Talent Operations • Autonomous Multi-Agent Voice Evaluation by OmniPanel</div>
                    <div style="margin-top: 4px; font-size: 11px; color: #475569;">Plantra Labs, Inc. • Bengaluru HQ · Singapore · London</div>
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

  console.log('\n--- RESEND API RESPONSE ---');
  console.log(JSON.stringify(response, null, 2));

  if (response.data?.id) {
    console.log(`\nEmail sent with ID: ${response.data.id}`);

    // Update data.json emails log
    const p = 'frontend/data.json';
    const d = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!d.emails) d.emails = [];
    d.emails.push({
      id: `email_${response.data.id.slice(0, 8)}`,
      recipientEmail,
      recipientName: candidateName,
      type: 'INTERVIEW_INVITATION',
      subject: `Congratulations! You're Selected for an Interview: ${jobTitle} at Plantra Labs`,
      sentAt: new Date().toISOString(),
      metadata: {
        scheduledAt,
        interviewLink,
        resendId: response.data.id,
        timezone: 'Asia/Kolkata'
      }
    });
    fs.writeFileSync(p, JSON.stringify(d, null, 2), 'utf8');
    console.log('Recorded in frontend/data.json');
  } else if (response.error) {
    console.log('\nResend Notice:', response.error.message);
  }
}

main().catch(err => console.error('Execution Error:', err));

