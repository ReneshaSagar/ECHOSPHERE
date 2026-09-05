import { getDb, saveDb, EmailNotification } from '../db';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Gmail SMTP configuration for universal hackathon delivery (Zero domain required)
const gmailUser = process.env.GMAIL_USER;
const gmailPass = process.env.GMAIL_APP_PASSWORD;
const gmailTransporter = (gmailUser && gmailPass)
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    })
  : null;

/**
 * Base email layout wrapper with EchoSphere branding
 */
function wrapHtmlEmail(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%); color: #ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: #ffffff;">mr.technologies</div>
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #93c5fd; margin-top: 2px;">Autonomous Voice Hiring Engine</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px 32px; line-height: 1.6; font-size: 15px; color: #334155;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5;">
              <div>mr.technologies Talent Team • Autonomous Voice Evaluation Panel</div>
              <div style="margin-top: 4px; font-size: 11px; color: #94a3b8;">This automated communication was generated on behalf of the engineering review board.</div>
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
 * Dispatches an automated email via Gmail SMTP (universal delivery) or Resend,
 * and logs it to db.emails for full ATS auditability.
 */
export async function sendEmail({
  recipientEmail,
  recipientName,
  type,
  subject,
  bodyText,
  htmlContent,
  metadata
}: {
  recipientEmail: string;
  recipientName: string;
  type: 'APPLICATION_RECEIVED' | 'INTERVIEW_INVITATION' | 'APPLICATION_REJECTED';
  subject: string;
  bodyText: string;
  htmlContent?: string;
  metadata?: Record<string, any>;
}): Promise<EmailNotification> {
  const db = getDb();
  if (!db.emails) db.emails = [];

  let deliveryId: string | undefined = undefined;
  let deliveryProvider: 'gmail_smtp' | 'resend' | 'none' = 'none';
  const renderedHtml = htmlContent || wrapHtmlEmail(subject, `<p>${bodyText.replace(/\n/g, '<br/>')}</p>`);

  // 1. Primary: Gmail SMTP (Universal delivery to any email without requiring a custom domain)
  if (gmailTransporter && gmailUser) {
    try {
      const mailOptions = {
        from: `"mr.technologies Talent" <${gmailUser}>`,
        to: recipientEmail,
        subject: subject,
        text: bodyText,
        html: renderedHtml,
      };

      const info = await gmailTransporter.sendMail(mailOptions);
      deliveryId = info.messageId;
      deliveryProvider = 'gmail_smtp';
      console.log(`[Gmail SMTP Delivery Success] Live email dispatched to: ${recipientEmail} | MessageID: ${deliveryId}`);
    } catch (err: any) {
      console.warn(`[Gmail SMTP Delivery Warning]: ${err.message}. Falling back to Resend...`);
    }
  }

  // 2. Fallback: Resend
  if (!deliveryId && resend) {
    try {
      const response = await resend.emails.send({
        from: 'mr.technologies Talent <onboarding@resend.dev>',
        to: recipientEmail,
        subject: subject,
        text: bodyText,
        html: renderedHtml,
      });

      if (response.data) {
        deliveryId = response.data.id;
        deliveryProvider = 'resend';
        console.log(`[Resend Delivery Success] Live email dispatched to: ${recipientEmail} | ID: ${deliveryId}`);
      } else if (response.error) {
        console.warn(`[Resend Delivery Notice]: ${response.error.message}`);
      }
    } catch (err: any) {
      console.warn(`[Resend Delivery Error]: ${err.message}`);
    }
  }

  // 2. Persist to DB for ATS records
  const emailRecord: EmailNotification = {
    id: `email_${Math.random().toString(36).substring(2, 9)}`,
    recipientEmail,
    recipientName,
    type,
    subject,
    bodyText,
    sentAt: new Date().toISOString(),
    metadata: {
      ...metadata,
      deliveryId,
      provider: deliveryProvider,
      resendId: deliveryProvider === 'resend' ? deliveryId : undefined
    }
  };

  db.emails.push(emailRecord);
  saveDb(db);

  console.log(`\n========================================`);
  console.log(`[EMAIL DISPATCHED] -> To: ${recipientName} <${recipientEmail}>`);
  console.log(`Type: ${type}`);
  console.log(`Subject: ${subject}`);
  if (deliveryId) console.log(`Delivery ID (${deliveryProvider}): ${deliveryId}`);
  console.log(`========================================\n`);

  return emailRecord;
}

/**
 * 1. Application Received Email Template
 */
export async function sendApplicationReceivedEmail(
  candidate: { name: string; email: string },
  job: { title: string }
) {
  const subject = `Application Received: ${job.title} at mr.technologies`;

  const bodyText = `Hi ${candidate.name},

Thank you for applying for the ${job.title} position at mr.technologies!

We have successfully received your application, resume, and technical links. Our autonomous evaluation engine and talent team are currently reviewing your qualifications and codecraft.

What to expect next:
- If your experience aligns with the core requirements of the role, you will be invited to our autonomous AI Voice Technical Interview led by our specialized technical panel.
- You will receive a separate invitation email with your scheduled date, time, and private room link.

Thank you again for your enthusiasm about building with mr.technologies.

Best regards,
The mr.technologies Talent & Recruiting Team`;

  const htmlContent = wrapHtmlEmail(
    subject,
    `<h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">Application Received</h2>
    <p>Hi <strong>${candidate.name}</strong>,</p>
    <p>Thank you for applying for the <strong>${job.title}</strong> role at mr.technologies! We are excited to learn more about your experience and background.</p>
    
    <div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <div style="font-weight: 700; color: #1e293b; font-size: 14px;">Next Steps in the Hiring Process:</div>
      <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; color: #475569;">
        <li>Our autonomous evaluation engine and talent team are reviewing your resume and technical profiles.</li>
        <li>Qualified candidates will receive a direct invitation to an autonomous AI Voice Technical Interview.</li>
        <li>Your invitation will include your exact scheduled time slot and live room link.</li>
      </ul>
    </div>
    
    <p>Thank you again for your time and interest in joining our engineering team.</p>
    <p style="margin-top: 24px;">Warm regards,<br/><strong>The mr.technologies Talent & Engineering Team</strong></p>`
  );

  return sendEmail({
    recipientEmail: candidate.email,
    recipientName: candidate.name,
    type: 'APPLICATION_RECEIVED',
    subject,
    bodyText,
    htmlContent,
    metadata: { jobTitle: job.title }
  });
}

/**
 * 2. Selected / Interview Invitation Email Template
 */
export async function sendInterviewInvitationEmail(
  candidate: { name: string; email: string },
  job: { title: string },
  scheduledAt: string,
  interviewLink: string
) {
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
  const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
  const dates = `${formatGCalDate(startTime)}/${formatGCalDate(endTime)}`;
  const title = encodeURIComponent(`mr.technologies AI Interview: ${candidate.name} (${job.title})`);
  const details = encodeURIComponent(`Role: ${job.title}\nRoom: ${interviewLink}\nCandidate: ${candidate.name}\nTime: ${fullDateTime}`);
  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;

  const subject = `Congratulations! You're Selected for an Interview: ${job.title} at mr.technologies`;

  const bodyText = `Hi ${candidate.name},

Congratulations! We were impressed by your background, codecraft, and experience, and we are excited to invite you to the next stage of our evaluation process for the ${job.title} role.

📅 Scheduled Interview Time:
${fullDateTime}

🔗 Your Personal Interview Room Link:
${interviewLink}

⏱️ How the Waiting Room & Interview Works:
Your interview is scheduled to start promptly at ${formattedTime} on ${formattedDate}.
When you open your room link before the scheduled time, a live countdown will display on your screen. The "Join Interview" button will unlock automatically as soon as your scheduled time arrives. All the best!

💡 Quick Tips to Prepare:
- Find a quiet space and use headphones with a clear microphone.
- Be prepared to discuss your architectural trade-offs, recent projects, and hands-on technical problem solving.
- Our AI technical interview panel will conduct the discussion conversationally.

We look forward to meeting you!

Warm regards,
The mr.technologies Talent & Engineering Team`;

  const htmlContent = wrapHtmlEmail(
    subject,
    `<div style="text-align: center; margin-bottom: 24px;">
      <span style="background-color: #dcfce7; color: #166534; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; padding: 6px 14px; border-radius: 9999px; border: 1px solid #bbf7d0;">
        ✓ Selected for Next Stage
      </span>
      <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 12px; margin-bottom: 6px;">
        You're Invited to an AI Voice Technical Interview
      </h2>
      <p style="font-size: 14px; color: #64748b; margin: 0;">Role: <strong>${job.title}</strong></p>
    </div>

    <p>Hi <strong>${candidate.name}</strong>,</p>
    <p>Congratulations! We were impressed by your background, codecraft, and experience. We are excited to invite you to participate in an autonomous AI Voice Technical Interview led by our specialized technical panel.</p>
    
    <!-- Interview Details Card -->
    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
      <div style="font-size: 12px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.05em;">Confirmed Interview Slot</div>
      <div style="font-size: 18px; font-weight: 800; color: #1e3a8a; margin-top: 4px;">${formattedDate}</div>
      <div style="font-size: 15px; font-weight: 600; color: #2563eb; margin-top: 2px;">${formattedTime} (45 mins duration)</div>

      <div style="margin-top: 20px;">
        <a href="${interviewLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
          Open Your Interview Room & Lobby
        </a>
      </div>

      <div style="margin-top: 14px;">
        <a href="${gcalUrl}" target="_blank" style="font-size: 12px; color: #2563eb; text-decoration: underline; font-weight: 600;">
          + Add to Google Calendar
        </a>
      </div>
    </div>

    <!-- How the room works -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; color: #475569;">
      <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px;">⏱️ How the Waiting Room Works:</div>
      <div>When you open your room link ahead of time, an automated countdown will display on your screen. The <strong>"Join Interview"</strong> button will unlock automatically as soon as your scheduled time arrives. All the best!</div>
    </div>

    <p style="margin-top: 24px;">We look forward to speaking with you!</p>
    <p>Warm regards,<br/><strong>The mr.technologies Talent & Engineering Team</strong></p>`
  );

  return sendEmail({
    recipientEmail: candidate.email,
    recipientName: candidate.name,
    type: 'INTERVIEW_INVITATION',
    subject,
    bodyText,
    htmlContent,
    metadata: { jobTitle: job.title, scheduledAt, interviewLink }
  });
}

/**
 * 3. Rejection Email Template
 */
export async function sendRejectionEmail(
  candidate: { name: string; email: string },
  job: { title: string },
  stage?: string,
  reason?: string
) {
  const stageFormatted = stage ? ` after our ${stage.toLowerCase().replace(/_/g, ' ')} evaluation` : '';
  const reasonText = reason 
    ? `\nSpecific Feedback from the Review Team:\n"${reason}"\n` 
    : '';

  const subject = `Update regarding your application for ${job.title} at mr.technologies`;

  const bodyText = `Hi ${candidate.name},

Thank you for your interest in mr.technologies and for the time you took to apply for the ${job.title} position.

Our team reviewed your background and qualifications thoroughly. We received many strong applications, and after careful consideration${stageFormatted}, we have decided not to move forward with your candidacy for this specific opening at this time.
${reasonText}
Please know that this was a difficult decision. We were very glad to learn about your background, and we will keep your profile in our talent pool should another opportunity arise that matches your strengths and trajectory.

We wish you the very best of luck in your job search and your ongoing engineering journey.

Sincerely,
The mr.technologies Talent Team`;

  const htmlContent = wrapHtmlEmail(
    subject,
    `<h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">
      Application Status Update
    </h2>
    <p>Hi <strong>${candidate.name}</strong>,</p>
    <p>Thank you for taking the time to apply for the <strong>${job.title}</strong> role at mr.technologies. We truly appreciate the opportunity to review your profile and codecraft.</p>
    
    <p>We evaluated your qualifications carefully alongside a competitive pool of candidates. After careful consideration${stageFormatted}, we have decided to move forward with other candidates whose experience more closely fits our immediate technical requirements for this specific role.</p>

    ${reason ? `
    <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 14px 16px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #881337;">
      <div style="font-weight: 700; margin-bottom: 4px;">Feedback from our Review Board:</div>
      <div style="font-style: italic;">"${reason}"</div>
    </div>
    ` : ''}

    <p>Please know that this was a difficult choice. We were impressed by aspects of your background, and we will keep your resume and portfolio in our talent pool for future openings that match your skill set.</p>
    <p>We wish you the very best of luck in your ongoing career endeavors.</p>
    <p style="margin-top: 24px;">Sincerely,<br/><strong>The mr.technologies Talent Team</strong></p>`
  );

  return sendEmail({
    recipientEmail: candidate.email,
    recipientName: candidate.name,
    type: 'APPLICATION_REJECTED',
    subject,
    bodyText,
    htmlContent,
    metadata: { jobTitle: job.title, stage, reason }
  });
}
