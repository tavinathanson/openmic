import { Resend } from 'resend';
import { parseISO, format, isToday, isTomorrow } from 'date-fns';

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
  time: string,
  timezone: string = 'America/New_York'
) {
  // Validate date
  if (!date || isNaN(date.getTime())) {
    throw new Error('Invalid date provided for email confirmation');
  }

  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/cancel?id=${id}&type=${type}`;
  
  // Parse the date string from the database
  const eventDate = parseISO(date.toISOString());
  
  // Format the date text
  const dateText = isToday(eventDate)
    ? 'tonight' 
    : isTomorrow(eventDate)
    ? 'tomorrow'
    : `on ${format(eventDate, 'MMMM d, yyyy')}`;

  // Format time in the correct timezone
  const [hours, minutes] = time.split(':');
  const timeObj = new Date();
  timeObj.setHours(parseInt(hours), parseInt(minutes), 0);
  const formattedTime = format(timeObj, 'h:mm a');

  const comedianMessage = `Thank you for signing up to perform at the Crave Laughs open mic at ${formattedTime} ${dateText}! If you need to cancel, just reply to this email or <a href="${cancelUrl}">click here</a>.`;
  
  const audienceMessage = `Thank you for signing up to attend the Crave Laughs open mic night at ${formattedTime} ${dateText}! See you there!`;
  
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
  time: string,
  timezone: string = 'America/New_York'
) {
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/cancel?id=${id}&type=${type}`;
  
  // Parse the date string from the database
  const eventDate = parseISO(date.toISOString());
  
  // Format the date text
  const dateText = isToday(eventDate)
    ? 'tonight' 
    : isTomorrow(eventDate)
    ? 'tomorrow'
    : `on ${format(eventDate, 'MMMM d, yyyy')}`;

  // Format time in the correct timezone
  const [hours, minutes] = time.split(':');
  const timeObj = new Date();
  timeObj.setHours(parseInt(hours), parseInt(minutes), 0);
  const formattedTime = format(timeObj, 'h:mm a');

  const comedianMessage = `Friendly reminder that you're signed up to perform at the Crave Laughs open mic at ${formattedTime} ${dateText}! If you need to cancel, just reply to this email or <a href="${cancelUrl}">click here</a>.`;
  
  const audienceMessage = `Friendly reminder that the Crave Laughs open mic night is at ${formattedTime} ${dateText}! See you there!`;
  
  await resend.emails.send({
    from: `${SENDER_NAME} <${process.env.NEXT_PUBLIC_APP_EMAIL}>`,
    to: email,
    subject: 'Crave Laughs Open Mic Reminder',
    html: `<p>${type === 'comedian' ? comedianMessage : audienceMessage}</p>`,
  });
} 