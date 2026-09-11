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
 * Base email layout wrapper with clean, professional white background styling
 */
function wrapHtmlEmail(title: string, bodyContent: string): string {
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
        from: `"Plantra Labs Talent" <${gmailUser}>`,
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
        from: 'Plantra Labs Talent <onboarding@resend.dev>',
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
 * 3. Rejection / Application Status Update Email Template
 */
export async function sendRejectionEmail(
  candidate: { name: string; email: string },
  job: { title: string },
  stage?: string,
  _reason?: string
) {
  const stageFormatted = stage ? ` after completing the ${stage.toLowerCase().replace(/_/g, ' ')}` : '';

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

  return sendEmail({
    recipientEmail: candidate.email,
    recipientName: candidate.name,
    type: 'APPLICATION_REJECTED',
    subject,
    bodyText,
    htmlContent,
    metadata: { jobTitle: job.title, stage }
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
 * 5. Waitlist / Priority Talent Pool & Alternative Roles Email Template
 */
export async function sendWaitlistAltRoleEmail(
  candidate: { name: string; email: string },
  job: { title: string },
  altRoles?: string[],
  _reason?: string
) {
  const rolesList = (altRoles && altRoles.length > 0) ? altRoles.join(', ') : 'related engineering roles';
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

  return sendEmail({
    recipientEmail: candidate.email,
    recipientName: candidate.name,
    type: 'APPLICATION_WAITLIST',
    subject,
    bodyText,
    htmlContent,
    metadata: { jobTitle: job.title, altRoles }
  });
}

/**
 * 6. Application Processing Failed Email
 */
export async function sendApplicationFailedEmail(
  candidate: { name: string; email: string },
  job: { title: string },
  errorReason: string
) {
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

  return sendEmail({
    recipientEmail: candidate.email,
    recipientName: candidate.name,
    type: 'APPLICATION_REJECTED',
    subject,
    bodyText,
    htmlContent,
    metadata: { jobTitle: job.title, errorReason }
  });
}

