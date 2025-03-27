import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('Missing env.RESEND_API_KEY');
}

if (!process.env.NEXT_PUBLIC_APP_EMAIL) {
  throw new Error('Missing env.NEXT_PUBLIC_APP_EMAIL');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendConfirmationEmail(email: string, type: 'comedian' | 'audience', id: string) {
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/cancel?id=${id}&type=${type}`;
  
  await resend.emails.send({
    from: `Tavi Nathanson <${process.env.NEXT_PUBLIC_APP_EMAIL}>`,
    to: email,
    subject: 'Crave Laughs Open Mic Signup Confirmation',
    html: `
      <p>Thank you for signing up as a ${type}. You're good to go!</p>
      <p>If you need to cancel, email me or just <a href="${cancelUrl}">click here</a>.</p>
    `,
  });
}

export async function sendReminderEmail(email: string, type: 'comedian' | 'audience', id: string) {
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/cancel?id=${id}&type=${type}`;
  
  await resend.emails.send({
    from: `Tavi Nathanson <${process.env.NEXT_PUBLIC_APP_EMAIL}>`,
    to: email,
    subject: 'Crave Laughs Open Mic Reminder',
    html: `
      <p>Friendly reminder that you're signed up for the Crave Laughs Open Mic as a ${type}.</p>
      <p>If you need to cancel, email me or just <a href="${cancelUrl}">click here</a>.</p>
    `,
  });
} 