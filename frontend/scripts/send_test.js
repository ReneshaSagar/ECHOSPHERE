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

console.log('Using Resend API Key:', apiKey.substring(0, 8) + '...');
const resend = new Resend(apiKey);

async function main() {
  console.log('Sending live invitation email to madhavgairola05@gmail.com...');
  
  const response = await resend.emails.send({
    from: 'EchoSphere Talent <onboarding@resend.dev>',
    to: 'madhavgairola05@gmail.com',
    subject: "Congratulations! You're Selected for an Interview: Senior AI Engineer at EchoSphere",
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
            <h2 style="margin: 14px 0 4px 0; font-size: 20px; font-weight: 800; color: #0f172a;">Interview Invitation: Senior AI Engineer</h2>
          </div>

          <p>Hi <strong>Madhav Gairola</strong>,</p>
          <p>Congratulations! We were impressed by your background, your GitHub project showcases (such as <em>ExpensWise</em>, <em>HealthLens</em>, and <em>syn-2</em>), and your active shipping velocity over the past month.</p>
          <p>We are thrilled to invite you to an autonomous AI Voice Technical Interview led by our technical lead persona, <strong>Alex</strong>.</p>
          
          <!-- Confirmed Slot Card -->
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
            <div style="font-size: 11px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.05em;">Confirmed Interview Slot</div>
            <div style="font-size: 18px; font-weight: 800; color: #1e3a8a; margin-top: 4px;">Saturday, September 5, 2026</div>
            <div style="font-size: 14px; font-weight: 600; color: #2563eb; margin-top: 2px;">10:00 AM UTC (45 mins duration)</div>
            
            <div style="margin-top: 18px;">
              <a href="http://localhost:3000/interview/int_namzxfu" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                Enter Interview Room & Lobby
              </a>
            </div>
            
            <div style="margin-top: 12px;">
              <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=EchoSphere+AI+Interview:+Madhav+Gairola&dates=20260905T100000Z/20260905T104500Z&details=Role:+Senior+AI+Engineer%0ARoom:+http://localhost:3000/interview/int_namzxfu" target="_blank" style="font-size: 12px; color: #2563eb; font-weight: 600; text-decoration: underline;">
                + Add to Google Calendar
              </a>
            </div>
          </div>

          <!-- Waiting Room Instruction -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; font-size: 13px; color: #475569; margin: 20px 0;">
            <strong style="color: #0f172a;">⏱️ How the Waiting Room & Countdown Works:</strong><br/>
            When you open your room link ahead of time, a countdown timer will display on your screen. The <strong>"Join Interview"</strong> button will unlock automatically as soon as your scheduled time arrives. All the best!
          </div>

          <p style="margin-top: 24px;">We look forward to speaking with you!</p>
          <p>Warm regards,<br/><strong>The EchoSphere Talent & Engineering Team</strong></p>
        </div>
        
        <!-- Footer -->
        <div style="padding: 16px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
          EchoSphere Talent Team • Sent via Live Resend Integration
        </div>
      </div>
    `
  });

  console.log('\n--- RESEND API RESPONSE ---');
  console.log(JSON.stringify(response, null, 2));
}

main().catch(err => console.error('Execution Error:', err));
