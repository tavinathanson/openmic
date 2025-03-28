import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('Missing env.RESEND_API_KEY');
}

if (!process.env.NEXT_PUBLIC_APP_EMAIL) {
  throw new Error('Missing env.NEXT_PUBLIC_APP_EMAIL');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

const SENDER_NAME = process.env.NODE_ENV === 'development' 
  ? 'Tavi Nathanson Test Account'
  : 'Tavi Nathanson';

export async function sendConfirmationEmail(
  email: string, 
  type: 'comedian' | 'audience', 
  id: string,
  date: Date,
  time: string
) {
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/cancel?id=${id}&type=${type}`;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const eventDate = new Date(date);
  eventDate.setHours(0, 0, 0, 0);

  const dateText = eventDate.getTime() === today.getTime() 
    ? 'tonight' 
    : eventDate.getTime() === tomorrow.getTime()
    ? 'tomorrow'
    : `on ${eventDate.toLocaleDateString()}`;

  const comedianMessage = `Thank you for signing up to perform at the Crave Laughs open mic at ${time} ${dateText}! If you need to cancel, just reply to this email or <a href="${cancelUrl}">click here</a>.`;
  
  const audienceMessage = `Thank you for signing up to attend the Crave Laughs open mic night at ${time} ${dateText}! See you there!`;
  
  await resend.emails.send({
    from: `${SENDER_NAME} <${process.env.NEXT_PUBLIC_APP_EMAIL}>`,
    to: email,
    subject: 'Crave Laughs Open Mic Signup Confirmation',
    html: `<p>${type === 'comedian' ? comedianMessage : audienceMessage}</p>`,
  });
}

export async function sendReminderEmail(
  email: string, 
  type: 'comedian' | 'audience', 
  id: string,
  date: Date,
  time: string
) {
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/cancel?id=${id}&type=${type}`;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const eventDate = new Date(date);
  eventDate.setHours(0, 0, 0, 0);

  const dateText = eventDate.getTime() === today.getTime() 
    ? 'tonight' 
    : eventDate.getTime() === tomorrow.getTime()
    ? 'tomorrow'
    : `on ${eventDate.toLocaleDateString()}`;

  const comedianMessage = `Friendly reminder that you're signed up to perform at the Crave Laughs open mic at ${time} ${dateText}! If you need to cancel, just reply to this email or <a href="${cancelUrl}">click here</a>.`;
  
  const audienceMessage = `Friendly reminder that the Crave Laughs open mic night is at ${time} ${dateText}! See you there!`;
  
  await resend.emails.send({
    from: `${SENDER_NAME} <${process.env.NEXT_PUBLIC_APP_EMAIL}>`,
    to: email,
    subject: 'Crave Laughs Open Mic Reminder',
    html: `<p>${type === 'comedian' ? comedianMessage : audienceMessage}</p>`,
  });
} 