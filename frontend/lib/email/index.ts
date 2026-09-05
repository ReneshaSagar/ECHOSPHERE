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
 * Base email layout wrapper with Nexora Labs branding
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
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: #ffffff;">Nexora Labs</div>
                    <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #bae6fd; margin-top: 2px;">Talent & Recruiting • Powered by OmniPanel</div>
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
              <div>Nexora Labs Talent Team • Autonomous Voice Evaluation by OmniPanel</div>
              <div style="margin-top: 4px; font-size: 11px; color: #94a3b8;">Nexora Labs, Inc. • Bengaluru HQ · Singapore · London</div>
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
  type: 'APPLICATION_RECEIVED' | 'INTERVIEW_INVITATION' | 'APPLICATION_REJECTED' | 'APPLICATION_OFFER' | 'APPLICATION_WAITLIST' | string;
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
        from: `"Nexora Labs Talent" <${gmailUser}>`,
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
        from: 'Nexora Labs Talent <onboarding@resend.dev>',
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

  // 3. Persist to DB for ATS records
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
  const subject = `Application Received: ${job.title} at Nexora Labs`;

  const bodyText = `Hi ${candidate.name},

Thank you for applying for the ${job.title} position at Nexora Labs!

We have successfully received your application, resume, and technical links. Our autonomous evaluation engine and talent team are currently reviewing your qualifications and codecraft.

What to expect next:
- If your experience aligns with the core requirements of the role, you will be invited to our autonomous AI Voice Technical Interview led by our specialized technical panel.
- You will receive a separate invitation email with your scheduled date, time, and private room link.

Thank you again for your enthusiasm about building with Nexora Labs.

Best regards,
The Nexora Labs Talent & Recruiting Team`;

  const htmlContent = wrapHtmlEmail(
    subject,
    `<h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">Application Received</h2>
    <p>Hi <strong>${candidate.name}</strong>,</p>
    <p>Thank you for applying for the <strong>${job.title}</strong> role at Nexora Labs! We are excited to learn more about your experience and background.</p>
    
    <div style="background-color: #f1f5f9; border-left: 4px solid #0284c7; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <div style="font-weight: 700; color: #1e293b; font-size: 14px;">Next Steps in the Hiring Process:</div>
      <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; color: #475569;">
        <li>Our autonomous evaluation engine and talent team are reviewing your resume and technical profiles.</li>
        <li>Qualified candidates will receive a direct invitation to an autonomous AI Voice Technical Interview powered by OmniPanel.</li>
        <li>Your invitation will include your exact scheduled time slot and live room link.</li>
      </ul>
    </div>
    
    <p>Thank you again for your time and interest in joining our engineering team.</p>
    <p style="margin-top: 24px;">Warm regards,<br/><strong>The Nexora Labs Talent & Engineering Team</strong></p>`
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
  const title = encodeURIComponent(`Nexora Labs AI Interview: ${candidate.name} (${job.title})`);
  const details = encodeURIComponent(`Role: ${job.title}\nRoom: ${interviewLink}\nCandidate: ${candidate.name}\nTime: ${fullDateTime}\n\nPowered by OmniPanel for Nexora Labs.`);
  const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;

  const subject = `Congratulations! You're Selected for an Interview: ${job.title} at Nexora Labs`;

  const bodyText = `Hi ${candidate.name},

Congratulations! We were impressed by your background, codecraft, and experience, and we are excited to invite you to the next stage of our evaluation process for the ${job.title} role at Nexora Labs.

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
- Our AI technical interview panel (powered by OmniPanel) will conduct the discussion conversationally.

We look forward to meeting you!

Warm regards,
The Nexora Labs Talent & Engineering Team`;

  const htmlContent = wrapHtmlEmail(
    subject,
    `<div style="text-align: center; margin-bottom: 24px;">
      <span style="background-color: #dcfce7; color: #166534; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; padding: 6px 14px; border-radius: 9999px; border: 1px solid #bbf7d0;">
        ✓ Selected for Next Stage
      </span>
      <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 12px; margin-bottom: 6px;">
        You're Invited to an AI Voice Technical Interview
      </h2>
      <p style="font-size: 14px; color: #64748b; margin: 0;">Role: <strong>${job.title}</strong> at Nexora Labs</p>
    </div>

    <p>Hi <strong>${candidate.name}</strong>,</p>
    <p>Congratulations! We were impressed by your background, codecraft, and experience. We are excited to invite you to participate in an autonomous AI Voice Technical Interview led by our specialized technical panel.</p>
    
    <!-- Interview Details Card -->
    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
      <div style="font-size: 12px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 0.05em;">Confirmed Interview Slot</div>
      <div style="font-size: 18px; font-weight: 800; color: #0c4a6e; margin-top: 4px;">${formattedDate}</div>
      <div style="font-size: 15px; font-weight: 600; color: #0284c7; margin-top: 2px;">${formattedTime} (45 mins duration)</div>

      <div style="margin-top: 20px;">
        <a href="${interviewLink}" style="display: inline-block; background-color: #0284c7; color: #ffffff; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2);">
          Open Your Interview Room & Lobby
        </a>
      </div>

      <div style="margin-top: 14px;">
        <a href="${gcalUrl}" target="_blank" style="font-size: 12px; color: #0284c7; text-decoration: underline; font-weight: 600;">
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
    <p>Warm regards,<br/><strong>The Nexora Labs Talent & Engineering Team</strong></p>`
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

  const subject = `Update regarding your application for ${job.title} at Nexora Labs`;

  const bodyText = `Hi ${candidate.name},

Thank you for your interest in Nexora Labs and for the time you took to apply for the ${job.title} position.

Our team reviewed your background and qualifications thoroughly. We received many strong applications, and after careful consideration${stageFormatted}, we have decided not to move forward with your candidacy for this specific opening at this time.
${reasonText}
Please know that this was a difficult decision. We were very glad to learn about your background, and we will keep your profile in our talent pool should another opportunity arise that matches your strengths and trajectory.

We wish you the very best of luck in your job search and your ongoing engineering journey.

Sincerely,
The Nexora Labs Talent Team`;

  const htmlContent = wrapHtmlEmail(
    subject,
    `<h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 16px;">
      Application Status Update
    </h2>
    <p>Hi <strong>${candidate.name}</strong>,</p>
    <p>Thank you for taking the time to apply for the <strong>${job.title}</strong> role at Nexora Labs. We truly appreciate the opportunity to review your profile and codecraft.</p>
    
    <p>We evaluated your qualifications carefully alongside a competitive pool of candidates. After careful consideration${stageFormatted}, we have decided to move forward with other candidates whose experience more closely fits our immediate technical requirements for this specific role.</p>

    ${reason ? `
    <div style="background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 14px 16px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #881337;">
      <div style="font-weight: 700; margin-bottom: 4px;">Feedback from our Review Board:</div>
      <div style="font-style: italic;">"${reason}"</div>
    </div>
    ` : ''}

    <p>Please know that this was a difficult choice. We were impressed by aspects of your background, and we will keep your resume and portfolio in our talent pool for future openings that match your skill set.</p>
    <p>We wish you the very best of luck in your ongoing career endeavors.</p>
    <p style="margin-top: 24px;">Sincerely,<br/><strong>The Nexora Labs Talent Team</strong></p>`
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

/**
 * 4. Selection / Offer Notification Email Template
 */
export async function sendSelectionOfferEmail(
  candidate: { name: string; email: string },
  job: { title: string },
  score?: number,
  summary?: string
) {
  const subject = `Congratulations! Offer & Selection Update for ${job.title} at Nexora Labs`;
  const scoreText = score ? `\nEvaluation Score: ${score}/100\n` : '';

  const bodyText = `Hi ${candidate.name},

Congratulations! We are delighted to inform you that you have been SELECTED for the ${job.title} position at Nexora Labs!

Our evaluation panel and technical leadership were thoroughly impressed by your performance across all interview rounds, your technical codecraft, and your cultural alignment with Nexora Labs.
${scoreText}
${summary ? `Panel Feedback:\n"${summary}"\n` : ''}
What happens next:
1. Our talent operations team will contact you within 24-48 hours to discuss offer compensation, equity packages, and start dates.
2. In the meantime, feel free to reply directly to this email if you have any questions about the role or team.

Welcome to Nexora Labs! We are thrilled about the prospect of building groundbreaking infrastructure together.

Warmest congratulations,
The Nexora Labs Leadership & Talent Team`;

  const htmlContent = wrapHtmlEmail(
    subject,
    `<div style="text-align: center; margin-bottom: 24px;">
      <span style="background-color: #dcfce7; color: #15803d; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; padding: 6px 14px; border-radius: 9999px; border: 1px solid #bbf7d0;">
        🎉 Application Selected / Offer Stage
      </span>
      <h2 style="font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 12px; margin-bottom: 6px;">
        Congratulations! You Have Been Selected
      </h2>
      <p style="font-size: 14px; color: #64748b; margin: 0;">Role: <strong>${job.title}</strong> at Nexora Labs</p>
    </div>

    <p>Hi <strong>${candidate.name}</strong>,</p>
    <p>We are delighted to inform you that following your interview panel and autonomous assessment, you have been <strong>selected</strong> for the <strong>${job.title}</strong> position at Nexora Labs!</p>

    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <div style="font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 0.05em;">Panel Evaluation Summary</div>
      ${score ? `<div style="font-size: 24px; font-weight: 800; color: #15803d; margin-top: 4px;">Score: ${score}/100</div>` : ''}
      <div style="font-size: 13px; color: #334155; margin-top: 6px; line-height: 1.6;">
        ${summary || 'Candidate demonstrated exceptional technical mastery, structured problem-solving, and outstanding team culture alignment.'}
      </div>
    </div>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; color: #475569;">
      <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px;">📋 Next Steps in Your Offer Process:</div>
      <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
        <li>Our Talent Operations team will reach out within 24–48 hours with formal compensation and onboarding details.</li>
        <li>We will schedule a brief call to walk through benefits, equipment provisioning, and your ideal start date.</li>
      </ul>
    </div>

    <p style="margin-top: 24px;">Welcome to the Nexora Labs team!</p>
    <p>Warm regards,<br/><strong>The Nexora Labs Talent & Executive Team</strong></p>`
  );

  return sendEmail({
    recipientEmail: candidate.email,
    recipientName: candidate.name,
    type: 'APPLICATION_OFFER',
    subject,
    bodyText,
    htmlContent,
    metadata: { jobTitle: job.title, score, summary }
  });
}

/**
 * 5. Waitlist / Talent Pool & Alternative Roles Email Template
 */
export async function sendWaitlistAltRoleEmail(
  candidate: { name: string; email: string },
  job: { title: string },
  altRoles?: string[],
  reason?: string
) {
  const rolesList = (altRoles && altRoles.length > 0) ? altRoles.join(', ') : 'related engineering and technical roles';
  const subject = `Talent Pool & Alternative Role Allocation: ${job.title} at Nexora Labs`;

  const bodyText = `Hi ${candidate.name},

Thank you for completing the interview process for the ${job.title} position at Nexora Labs.

Our evaluation panel found many strong strengths in your profile and interview performance. While we have selected a candidate whose immediate experience was an exact match for this specific opening, our team has recommended you for our Priority Talent Pool and the following alternative positions:
${rolesList}

${reason ? `Panel Feedback:\n"${reason}"\n` : ''}
What this means:
- You are placed on our fast-track priority list for upcoming openings matching your strengths.
- As soon as requisitions open for these matching roles, our recruiting leads will contact you directly.

Thank you again for your time and energy. We look forward to staying connected.

Best regards,
The Nexora Labs Talent & Recruiting Team`;

  const htmlContent = wrapHtmlEmail(
    subject,
    `<div style="text-align: center; margin-bottom: 24px;">
      <span style="background-color: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; padding: 6px 14px; border-radius: 9999px; border: 1px solid #bae6fd;">
        💡 Priority Talent Pool
      </span>
      <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 12px; margin-bottom: 6px;">
        Recommended for Priority Talent Pool
      </h2>
      <p style="font-size: 14px; color: #64748b; margin: 0;">Target Role: <strong>${job.title}</strong></p>
    </div>

    <p>Hi <strong>${candidate.name}</strong>,</p>
    <p>Thank you for taking the time to interview with us for the <strong>${job.title}</strong> role at Nexora Labs. We were impressed by your communication and technical problem-solving capabilities.</p>

    <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <div style="font-size: 12px; font-weight: 700; color: #0369a1; text-transform: uppercase; letter-spacing: 0.05em;">Alternative Role Allocations:</div>
      <div style="font-size: 15px; font-weight: 700; color: #0c4a6e; margin-top: 6px;">
        ${rolesList}
      </div>
      ${reason ? `<div style="font-size: 13px; color: #334155; margin-top: 10px; font-style: italic;">"${reason}"</div>` : ''}
    </div>

    <p>Our team has added your verified interview results to our priority talent roster. As new positions open up in these areas, our recruiting leads will reach out directly to discuss these opportunities with you.</p>

    <p style="margin-top: 24px;">Thank you again for your enthusiasm for building with Nexora Labs.</p>
    <p>Warm regards,<br/><strong>The Nexora Labs Talent Team</strong></p>`
  );

  return sendEmail({
    recipientEmail: candidate.email,
    recipientName: candidate.name,
    type: 'APPLICATION_WAITLIST',
    subject,
    bodyText,
    htmlContent,
    metadata: { jobTitle: job.title, altRoles, reason }
  });
}

