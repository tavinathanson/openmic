import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('Missing env.RESEND_API_KEY');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendConfirmationEmail(email: string, type: 'comedian' | 'audience', id: string) {
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/cancel?id=${id}&type=${type}`;
  
  await resend.emails.send({
    from: 'Open Mic <noreply@openmic.yourdomain.com>',
    to: email,
    subject: 'Open Mic Signup Confirmation',
    html: `
      <h1>Welcome to the Open Mic!</h1>
      <p>Thank you for signing up as a ${type}.</p>
      <p>Your spot has been reserved.</p>
      <p>If you need to cancel, please click the link below:</p>
      <a href="${cancelUrl}">Cancel Signup</a>
    `,
  });
}

export async function sendReminderEmail(email: string, type: 'comedian' | 'audience', id: string) {
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/cancel?id=${id}&type=${type}`;
  
  await resend.emails.send({
    from: 'Open Mic <noreply@openmic.yourdomain.com>',
    to: email,
    subject: 'Open Mic Reminder',
    html: `
      <h1>Open Mic Reminder</h1>
      <p>This is a reminder that you're signed up for the Open Mic as a ${type}.</p>
      <p>If you need to cancel, please click the link below:</p>
      <a href="${cancelUrl}">Cancel Signup</a>
    `,
  });
} 