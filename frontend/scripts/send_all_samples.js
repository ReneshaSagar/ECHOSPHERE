const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const fs = require('fs');
const path = require('path');

// 1. Load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    }
  });
}

const gmailUser = process.env.GMAIL_USER;
const gmailPass = process.env.GMAIL_APP_PASSWORD;
const resendApiKey = process.env.RESEND_API_KEY;

console.log('--- EMAIL DISPATCHER CONFIGURATION ---');
console.log('Gmail User:', gmailUser ? gmailUser : 'Not configured');
console.log('Gmail Password Available:', !!gmailPass);
console.log('Resend API Key Available:', !!resendApiKey);
console.log('---------------------------------------\n');

const gmailTransporter = (gmailUser && gmailPass)
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    })
  : null;

const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * Plantra Labs Clean White HTML Email Wrapper
 */
function wrapHtmlEmail(title, bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 36px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.02em; color: #0f172a;">
                      plantra<span style="color: #7c3aed;"> ·</span> labs
                    </div>
                    <div style="font-size: 12px; font-weight: 500; color: #64748b; margin-top: 2px;">
                      Talent & Engineering Operations
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 32px 28px 32px; line-height: 1.6; font-size: 15px; color: #334155;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; font-size: 12px; color: #64748b; line-height: 1.6;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-weight: 600; color: #475569; font-size: 12px;">
                      Plantra Labs Talent Team
                    </div>
                    <div style="margin-top: 2px; font-size: 11.5px; color: #64748b;">
                      Plantra Labs, Inc. • Bengaluru · Singapore · London
                    </div>
                    <div style="margin-top: 10px; font-size: 11px; color: #94a3b8;">
                      This is an automated communication regarding your application at Plantra Labs.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Universal dispatcher
 */
async function sendSampleEmail({ recipientEmail, recipientName, subject, bodyText, htmlContent, caseName }) {
  console.log(`\n======================================================`);
  console.log(`🚀 DISPATCHING: ${caseName}`);
  console.log(`To: ${recipientName} <${recipientEmail}>`);
  console.log(`Subject: ${subject}`);

  let sent = false;

  // 1. Try Gmail SMTP
  if (gmailTransporter && gmailUser) {
    try {
      const info = await gmailTransporter.sendMail({
        from: `"Plantra Labs Talent" <${gmailUser}>`,
        to: recipientEmail,
        subject: subject,
        text: bodyText,
        html: htmlContent
      });
      console.log(`✅ [Gmail SMTP Success] Message ID: ${info.messageId}`);
      sent = true;
    } catch (err) {
      console.warn(`⚠️ [Gmail SMTP Error]: ${err.message}`);
    }
  }

  // 2. Fallback to Resend
  if (!sent && resend) {
    try {
      const resp = await resend.emails.send({
        from: 'Plantra Labs Talent <onboarding@resend.dev>',
        to: recipientEmail,
        subject: subject,
        text: bodyText,
        html: htmlContent
      });
      if (resp.data) {
        console.log(`✅ [Resend Success] ID: ${resp.data.id}`);
        sent = true;
      } else {
        console.warn(`⚠️ [Resend Notice]:`, resp.error);
      }
    } catch (err) {
      console.warn(`⚠️ [Resend Error]: ${err.message}`);
    }
  }

  if (!sent) {
    console.error(`❌ Failed to deliver email for ${caseName}`);
  }
  console.log(`======================================================\n`);
  return sent;
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function main() {
  const candidate = {
    name: 'Madhav Gairola',
    email: 'madhavgairola05@gmail.com'
  };

  const job = {
    title: 'Senior Backend Engineer — Distributed Systems & Real-Time APIs'
  };

  console.log(`Sending updated clean sample emails to: ${candidate.name} <${candidate.email}>\n`);

  // =========================================================================
  // CASE 1: APPLICATION RECEIVED
  // =========================================================================
  {
    const subject = `Application Received: ${job.title} at Plantra Labs`;
    const bodyText = `Hi ${candidate.name},

Thank you for applying for the ${job.title} position at Plantra Labs.

We have successfully received your application materials and our team is currently reviewing your background and qualifications.

Our Interview Process:
• Round 1: Practical Workspace Assessment — Hands-on coding and system design in our interactive workspace.
• Round 2: Technical Architecture Panel — Technical discussion with our engineering leads covering system architecture and scalability.
• Round 3: Engineering Leadership & Cultural Alignment — Conversational session discussing past projects, ownership, and team collaboration.

If your profile aligns with our requirements, you will receive a separate invitation email with your scheduled time slot and room access link.

Thank you again for your interest in Plantra Labs.

Best regards,
The Plantra Labs Talent Team`;

    const htmlContent = wrapHtmlEmail(
      subject,
      `
      <h2 style="font-size: 19px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">
        Application Received
      </h2>

      <p>Hi <strong>${candidate.name}</strong>,</p>
      <p>Thank you for applying for the <strong>${job.title}</strong> role at Plantra Labs. We have successfully received your application materials, and our team is currently reviewing your profile.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 24px 0;">
        <div style="font-weight: 600; color: #0f172a; font-size: 13.5px; margin-bottom: 10px;">
          Overview of Our Evaluation Process:
        </div>
        
        <ul style="margin: 0; padding-left: 18px; font-size: 13.5px; color: #475569; line-height: 1.6;">
          <li style="margin-bottom: 6px;"><strong>Round 1: Practical Workspace Assessment</strong> — Hands-on coding and system design in our interactive development workspace.</li>
          <li style="margin-bottom: 6px;"><strong>Round 2: Technical Architecture Panel</strong> — In-depth technical discussion covering distributed architecture, concurrency, and trade-offs.</li>
          <li><strong>Round 3: Engineering Leadership & Culture</strong> — Conversational interview focusing on past project ownership, incident management, and collaboration.</li>
        </ul>
      </div>
      
      <p>If your experience matches our current requirements, we will reach out with a direct invitation to schedule your interview session.</p>

      <p style="margin-top: 24px;">
        Best regards,<br/>
        <strong>The Plantra Labs Talent Team</strong>
      </p>
      `
    );

    await sendSampleEmail({
      recipientEmail: candidate.email,
      recipientName: candidate.name,
      subject,
      bodyText,
      htmlContent,
      caseName: '1. Application Received'
    });
    await sleep(1500);
  }

  // =========================================================================
  // CASE 2: INTERVIEW INVITATION
  // =========================================================================
  {
    const scheduledAt = '2026-09-18T10:30:00Z';
    const interviewLink = 'http://localhost:3000/interview/int_demo123';
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

    const startTime = new Date(scheduledAt);
    const endTime = new Date(startTime.getTime() + 45 * 60 * 1000);
    const formatGCalDate = (d) => d.toISOString().replace(/-|:|\.\d+/g, '');
    const dates = `${formatGCalDate(startTime)}/${formatGCalDate(endTime)}`;
    const title = encodeURIComponent(`Plantra Labs Technical Interview: ${candidate.name} (${job.title})`);
    const details = encodeURIComponent(
      `Role: ${job.title}\n` +
      `Candidate: ${candidate.name}\n` +
      `Scheduled Time: ${fullDateTime}\n` +
      `Interview Room: ${interviewLink}\n\n` +
      `Interview Structure:\n` +
      `• Round 1: Practical Workspace Assessment (Coding & System Design)\n` +
      `• Round 2: Technical Architecture Panel\n` +
      `• Round 3: Engineering Leadership & Cultural Alignment\n\n` +
      `Please join the room 5 minutes before your scheduled start time to check your microphone and camera.`
    );
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;

    const subject = `Interview Invitation: ${job.title} at Plantra Labs`;

    const bodyText = `Hi ${candidate.name},

Thank you for your interest in Plantra Labs. We were impressed by your background and experience, and we would like to invite you to interview for the ${job.title} position.

Scheduled Time:
${fullDateTime}

Interview Room Link:
${interviewLink}

Add to Google Calendar:
${gcalUrl}

Interview Structure:
• Round 1: Practical Workspace Assessment — Hands-on coding and system design in our interactive workspace.
• Round 2: Technical Architecture Panel — Technical discussion covering distributed architecture, concurrency, and trade-offs.
• Round 3: Engineering Leadership & Cultural Alignment — Conversational interview focusing on past project ownership, incident management, and collaboration.

Please join the link a few minutes early to test your audio and camera settings in the pre-meeting room. The session will begin promptly at your scheduled time.

We look forward to speaking with you.

Best regards,
The Plantra Labs Talent Team`;

    const htmlContent = wrapHtmlEmail(
      subject,
      `
      <h2 style="font-size: 19px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">
        Interview Invitation: ${job.title}
      </h2>

      <p>Hi <strong>${candidate.name}</strong>,</p>
      <p>Thank you for your interest in Plantra Labs. Following a review of your application, we are pleased to invite you to interview for the <strong>${job.title}</strong> role.</p>
      
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
      `
    );

    await sendSampleEmail({
      recipientEmail: candidate.email,
      recipientName: candidate.name,
      subject,
      bodyText,
      htmlContent,
      caseName: '2. Interview Invitation'
    });
    await sleep(1500);
  }

  // =========================================================================
  // CASE 3: SELECTION & FORMAL OFFER (NO SCORE)
  // =========================================================================
  {
    const subject = `Offer of Employment: ${job.title} at Plantra Labs`;

    const bodyText = `Hi ${candidate.name},

Congratulations! We are delighted to extend an offer for the ${job.title} position at Plantra Labs.

Our team was thoroughly impressed by your performance throughout the interview process and we are excited about the prospect of having you join our engineering team.

Next Steps:
1. Our Talent Operations team will reach out within 24–48 hours with your formal offer letter, compensation package, and equity details.
2. We will also coordinate a call to answer any questions you may have regarding benefits, equipment, and your start date.

In the meantime, please feel free to reply directly to this email if you have any immediate questions.

Welcome to Plantra Labs!

Warm regards,
The Plantra Labs Talent & Engineering Team`;

    const htmlContent = wrapHtmlEmail(
      subject,
      `
      <h2 style="font-size: 19px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">
        Congratulations! Offer of Employment
      </h2>

      <p>Hi <strong>${candidate.name}</strong>,</p>
      <p>We are thrilled to inform you that following your interview process, we would like to offer you the position of <strong>${job.title}</strong> at Plantra Labs!</p>

      <p>Our team was very impressed with your technical capabilities, problem-solving approach, and communication throughout our discussions. We believe you will make a significant impact on our engineering initiatives.</p>

      <!-- Next Steps Card -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 22px 0;">
        <div style="font-weight: 600; color: #0f172a; font-size: 13.5px; margin-bottom: 8px;">
          Next Steps in the Offer Process:
        </div>
        <ul style="margin: 0; padding-left: 18px; line-height: 1.6; color: #475569; font-size: 13.5px;">
          <li style="margin-bottom: 6px;">Our Talent Operations team will reach out within 24–48 hours with your formal offer letter and compensation package details.</li>
          <li>We will schedule a call to walk through benefits, equipment provisioning, and your prospective start date.</li>
        </ul>
      </div>

      <p>Welcome to Plantra Labs! We look forward to working with you.</p>

      <p style="margin-top: 24px;">
        Warm regards,<br/>
        <strong>The Plantra Labs Talent & Engineering Team</strong>
      </p>
      `
    );

    await sendSampleEmail({
      recipientEmail: candidate.email,
      recipientName: candidate.name,
      subject,
      bodyText,
      htmlContent,
      caseName: '3. Selection & Offer Notification'
    });
    await sleep(1500);
  }

  // =========================================================================
  // CASE 4: PRIORITY TALENT POOL / WAITLIST (NO CRITIQUE COMMENTS)
  // =========================================================================
  {
    const altRoles = [
      'Staff Platform Engineer — Core Cloud Infrastructure',
      'AI Systems & Inference Optimization Engineer',
      'Senior Full Stack Engineer — Next.js & Developer Platform'
    ];
    const rolesList = altRoles.join(', ');

    const subject = `Talent Pool Update: ${job.title} at Plantra Labs`;

    const bodyText = `Hi ${candidate.name},

Thank you for interviewing for the ${job.title} role at Plantra Labs.

We appreciated the opportunity to speak with you. While we have selected a candidate whose immediate background was a closer fit for this specific opening, our team was impressed with your overall skillset and would like to invite you into our Priority Talent Pool.

We would specifically like to consider you for future opportunities in the following areas:
${rolesList}

As relevant positions open, our recruiting team will reach out to you directly regarding next steps.

Thank you again for your time and interest in Plantra Labs.

Best regards,
The Plantra Labs Talent Team`;

    const htmlContent = wrapHtmlEmail(
      subject,
      `
      <h2 style="font-size: 19px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">
        Talent Pool Update
      </h2>

      <p>Hi <strong>${candidate.name}</strong>,</p>
      <p>Thank you for taking the time to interview for the <strong>${job.title}</strong> role at Plantra Labs.</p>

      <p>While we have moved forward with another candidate for this specific position, our team was impressed with your background and would like to include you in our Priority Talent Pool.</p>

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 20px; margin: 20px 0;">
        <div style="font-size: 12px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Recommended Role Areas:</div>
        <div style="font-size: 14.5px; font-weight: 600; color: #0f172a; margin-top: 4px;">
          ${rolesList}
        </div>
      </div>

      <p>As requisitions open in these areas, our recruiting team will contact you directly regarding matching opportunities.</p>

      <p style="margin-top: 24px;">
        Best regards,<br/>
        <strong>The Plantra Labs Talent Team</strong>
      </p>
      `
    );

    await sendSampleEmail({
      recipientEmail: candidate.email,
      recipientName: candidate.name,
      subject,
      bodyText,
      htmlContent,
      caseName: '4. Priority Talent Pool Update'
    });
    await sleep(1500);
  }

  // =========================================================================
  // CASE 5: APPLICATION STATUS UPDATE / REJECTION (NO CRITIQUE COMMENTS)
  // =========================================================================
  {
    const stage = 'technical panel round';
    const stageFormatted = ` after completing the ${stage}`;

    const subject = `Update regarding your application for ${job.title} at Plantra Labs`;

    const bodyText = `Hi ${candidate.name},

Thank you for your interest in Plantra Labs and for the time you took to interview for the ${job.title} position.

We evaluated your candidacy carefully alongside a very competitive group of applicants. After thoughtful deliberation${stageFormatted}, we have decided to move forward with other candidates whose experience more closely matches our immediate needs for this specific role.

We truly appreciate your time and the effort you put into our interview process. We will keep your information on file and reach out should a suitable opening arise in the future.

We wish you the very best in your job search and future career endeavors.

Sincerely,
The Plantra Labs Talent Team`;

    const htmlContent = wrapHtmlEmail(
      subject,
      `
      <h2 style="font-size: 19px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">
        Application Status Update
      </h2>

      <p>Hi <strong>${candidate.name}</strong>,</p>
      <p>Thank you for taking the time to interview with us for the <strong>${job.title}</strong> role at Plantra Labs.</p>
      
      <p>We evaluated your candidacy carefully alongside a competitive pool of applicants. After careful consideration${stageFormatted}, we have decided to move forward with other candidates whose background more closely aligns with our current technical requirements for this role.</p>

      <p>We truly appreciate the time and energy you invested in our process. We will keep your resume on file for future openings that match your skill set.</p>

      <p>We wish you the very best in your ongoing career endeavors.</p>

      <p style="margin-top: 24px;">
        Sincerely,<br/>
        <strong>The Plantra Labs Talent Team</strong>
      </p>
      `
    );

    await sendSampleEmail({
      recipientEmail: candidate.email,
      recipientName: candidate.name,
      subject,
      bodyText,
      htmlContent,
      caseName: '5. Application Status Update / Rejection'
    });
    await sleep(1500);
  }

  // =========================================================================
  // CASE 6: APPLICATION PROCESSING FAILED (ACTION REQUIRED)
  // =========================================================================
  {
    const errorReason = "The uploaded file could not be read. Please ensure your PDF is text-readable or your Google Drive link is public.";
    const subject = `Action Required: Application for ${job.title}`;

    const bodyText = `Hi ${candidate.name},

Thank you for applying to the ${job.title} position at Plantra Labs.

We encountered an issue while processing your application materials:
${errorReason}

Please check your resume permissions (e.g. ensure your Google Drive link is set to 'Anyone with the link can view') or upload a valid PDF, and submit your application again.

Best regards,
The Plantra Labs Talent Team`;

    const htmlContent = wrapHtmlEmail(
      subject,
      `
      <h2 style="font-size: 19px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">
        Action Required: Application Issue
      </h2>

      <p>Hi <strong>${candidate.name}</strong>,</p>
      <p>Thank you for applying to the <strong>${job.title}</strong> position at Plantra Labs.</p>
      
      <p>We encountered an issue while processing your application materials:</p>

      <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 14px 18px; margin: 18px 0; font-size: 13.5px; color: #9f1239;">
        <strong>Details:</strong> ${errorReason}
      </div>

      <p>Please resolve this issue (e.g., ensure your Google Drive link permissions are public or your PDF is readable) and submit your application again.</p>

      <p style="margin-top: 24px;">
        Best regards,<br/>
        <strong>The Plantra Labs Talent Team</strong>
      </p>
      `
    );

    await sendSampleEmail({
      recipientEmail: candidate.email,
      recipientName: candidate.name,
      subject,
      bodyText,
      htmlContent,
      caseName: '6. Action Required (Application Issue)'
    });
  }

  console.log('🎉 All 6 updated sample emails dispatched successfully to madhavgairola05@gmail.com!');
}

main().catch(err => {
  console.error('Fatal execution error in send_all_samples:', err);
  process.exit(1);
});
