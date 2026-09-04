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
  const jobTitle = 'Senior Full Stack Engineer — Next.js & Real-Time WebRTC';
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
  const title = encodeURIComponent(`EchoSphere AI Interview: ${candidateName} (${jobTitle})`);
  const details = encodeURIComponent(`Role: ${jobTitle}\nRoom: ${interviewLink}\nCandidate: ${candidateName}\nTime: ${fullDateTime}`);
  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;

  console.log(`Sending live invitation email to ${recipientEmail}...`);
  console.log(`Slot (IST): ${fullDateTime}`);
  console.log(`Interview Link: ${interviewLink}`);

  const response = await resend.emails.send({
    from: 'EchoSphere Talent <onboarding@resend.dev>',
    to: recipientEmail,
    subject: `Congratulations! You're Selected for an Interview: ${jobTitle} at EchoSphere`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); padding: 28px 32px; color: #ffffff;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.02em;">EchoSphere</h1>
          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #93c5fd;">Autonomous Voice Hiring Engine</p>
        </div>
        
        <!-- Body -->
        <div style="padding: 32px; color: #334155; line-height: 1.6; font-size: 15px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="background: #dcfce7; color: #166534; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 6px 14px; border-radius: 9999px; border: 1px solid #bbf7d0;">
              ✓ Selected for Next Stage
            </span>
            <h2 style="margin: 14px 0 4px 0; font-size: 20px; font-weight: 800; color: #0f172a;">Interview Invitation: ${jobTitle}</h2>
          </div>

          <p>Hi <strong>${candidateName}</strong>,</p>
          <p>Congratulations! We were impressed by your background in full-stack systems, high-performance web architectures, and your engineering trajectory.</p>
          <p>We are thrilled to invite you to an autonomous AI Voice Technical Interview led by our technical lead persona, <strong>Alex</strong>.</p>
          
          <!-- Confirmed Slot Card -->
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <div style="font-size: 11px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.05em;">Confirmed Interview Slot</div>
            <div style="font-size: 18px; font-weight: 800; color: #1e3a8a; margin-top: 4px;">${formattedDate}</div>
            <div style="font-size: 14px; font-weight: 700; color: #2563eb; margin-top: 2px;">${formattedTime} (45 mins duration)</div>
            
            <div style="margin-top: 18px;">
              <a href="${interviewLink}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                Enter Interview Room & Lobby
              </a>
            </div>
            
            <div style="margin-top: 12px;">
              <a href="${gcalUrl}" target="_blank" style="font-size: 12px; color: #2563eb; font-weight: 600; text-decoration: underline;">
                + Add to Google Calendar
              </a>
            </div>
          </div>

          <!-- Waiting Room Instruction -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; font-size: 13px; color: #475569; margin: 20px 0;">
            <strong style="color: #0f172a;">⏱️ How the Waiting Room & Countdown Works:</strong><br/>
            When you open your room link ahead of time, a live countdown timer displays on your screen. The <strong>"Join Interview"</strong> button will unlock automatically at <strong>${formattedTime}</strong>. All the best!
          </div>

          <p style="margin-top: 24px;">We look forward to speaking with you!</p>
          <p>Warm regards,<br/><strong>The EchoSphere Talent & Engineering Team</strong></p>
        </div>
        
        <!-- Footer -->
        <div style="padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
          EchoSphere Talent Team • Sent via Live Resend Integration (IST Synchronized)
        </div>
      </div>
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
      subject: `Congratulations! You're Selected for an Interview: ${jobTitle} at EchoSphere`,
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
