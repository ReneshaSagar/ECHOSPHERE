import { getDb, saveDb, EmailNotification } from '@/lib/db';

/**
 * Dispatches an automated email and logs it to db.emails for full ATS traceability.
 */
export async function sendEmail({
  recipientEmail,
  recipientName,
  type,
  subject,
  bodyText,
  metadata
}: {
  recipientEmail: string;
  recipientName: string;
  type: 'APPLICATION_RECEIVED' | 'INTERVIEW_INVITATION' | 'APPLICATION_REJECTED';
  subject: string;
  bodyText: string;
  metadata?: Record<string, any>;
}): Promise<EmailNotification> {
  const db = getDb();
  if (!db.emails) db.emails = [];

  const emailRecord: EmailNotification = {
    id: `email_${Math.random().toString(36).substring(2, 9)}`,
    recipientEmail,
    recipientName,
    type,
    subject,
    bodyText,
    sentAt: new Date().toISOString(),
    metadata
  };

  db.emails.push(emailRecord);
  saveDb(db);

  console.log(`\n========================================`);
  console.log(`[EMAIL DISPATCHED] -> To: ${recipientName} <${recipientEmail}>`);
  console.log(`Type: ${type}`);
  console.log(`Subject: ${subject}`);
  console.log(`----------------------------------------`);
  console.log(bodyText);
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
  const subject = `Application Received: ${job.title} at EchoSphere`;
  const bodyText = `Hi ${candidate.name},

Thank you for applying for the ${job.title} position at EchoSphere!

We have successfully received your application, resume, and technical links. Our autonomous evaluation engine and talent team are currently reviewing your qualifications and codecraft.

What to expect next:
- If your experience aligns with the core requirements of the role, you will be invited to our autonomous AI Voice Technical Interview led by our technical lead persona, Alex.
- You will receive a separate invitation email with your scheduled date, time, and private room link.

Thank you again for your enthusiasm about building with EchoSphere.

Best regards,
The EchoSphere Talent & Recruiting Team`;

  return sendEmail({
    recipientEmail: candidate.email,
    recipientName: candidate.name,
    type: 'APPLICATION_RECEIVED',
    subject,
    bodyText,
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
    day: 'numeric'
  });
  const formattedTime = dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  const fullDateTime = `${formattedDate} at ${formattedTime}`;

  const subject = `Congratulations! You're Selected for an Interview: ${job.title} at EchoSphere`;
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
- Our AI technical interviewer, Alex, will conduct the discussion conversationally.

We look forward to meeting you!

Warm regards,
The EchoSphere Talent & Engineering Team`;

  return sendEmail({
    recipientEmail: candidate.email,
    recipientName: candidate.name,
    type: 'INTERVIEW_INVITATION',
    subject,
    bodyText,
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

  const subject = `Update regarding your application for ${job.title} at EchoSphere`;
  const bodyText = `Hi ${candidate.name},

Thank you for your interest in EchoSphere and for the time you took to apply for the ${job.title} position.

Our team reviewed your background and qualifications thoroughly. We received many strong applications, and after careful consideration${stageFormatted}, we have decided not to move forward with your candidacy for this specific opening at this time.
${reasonText}
Please know that this was a difficult decision. We were very glad to learn about your background, and we will keep your profile in our talent pool should another opportunity arise that matches your strengths and trajectory.

We wish you the very best of luck in your job search and your ongoing engineering journey.

Sincerely,
The EchoSphere Talent Team`;

  return sendEmail({
    recipientEmail: candidate.email,
    recipientName: candidate.name,
    type: 'APPLICATION_REJECTED',
    subject,
    bodyText,
    metadata: { jobTitle: job.title, stage, reason }
  });
}
