import { Resend } from 'resend';
import { parseISO, format, isToday, isTomorrow } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

if (!process.env.RESEND_API_KEY) {
  throw new Error('Missing env.RESEND_API_KEY');
}

if (!process.env.NEXT_PUBLIC_APP_EMAIL) {
  throw new Error('Missing env.NEXT_PUBLIC_APP_EMAIL');
}

if (!process.env.EXTRA_NOTIFY_EMAIL) {
  throw new Error('Missing env.EXTRA_NOTIFY_EMAIL');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

const SENDER_NAME = process.env.NODE_ENV === 'development' 
  ? 'Tavi Nathanson Test Account'
  : 'Tavi Nathanson';

const EXTRA_NOTIFY_EMAIL = process.env.EXTRA_NOTIFY_EMAIL;

interface EmailParams {
  email: string;
  id: string;
  date: Date;
  time: string;
  timezone?: string;
  type?: 'comedian' | 'audience';
  isWaitlist?: boolean;
}

async function sendEmail({
  email,
  id,
  date,
  time,
  timezone = 'America/New_York',
  type = 'comedian',
  isWaitlist = false
}: EmailParams) {
  // Validate date
  if (!date || isNaN(date.getTime())) {
    throw new Error('Invalid date provided for email');
  }

  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/cancel?id=${id}&type=${type}`;
  
  // Parse the date string from the database
  const eventDate = parseISO(date.toISOString());
  
  // Format the date text
  const dateText = isToday(eventDate)
    ? 'tonight' 
    : isTomorrow(eventDate)
    ? 'tomorrow'
    : `on ${format(eventDate, 'MMMM d')}`;

  // Format time in the specified timezone
  const [hours, minutes] = time.split(':');
  const timeString = `${format(date, 'yyyy-MM-dd')}T${hours}:${minutes}:00${timezone === 'America/New_York' ? '-04:00' : '+00:00'}`;
  const timeObj = new Date(timeString);
  const formattedTime = formatInTimeZone(timeObj, timezone, 'h:mm a');

  let message: string;
  if (isWaitlist) {
    message = `Thank you for adding your name to the waitlist for the Crave Laughs open mic at ${formattedTime} ${dateText}! I'll let you know if a spot opens up.`;
  } else if (type === 'comedian') {
    message = `Thank you for signing up to perform at the Crave Laughs open mic at ${formattedTime} ${dateText}! If you need to cancel, just reply to this email or <a href="${cancelUrl}">click here</a>.`;
  } else {
    message = `Thank you for signing up to attend the Crave Laughs open mic night at ${formattedTime} ${dateText}! See you there!`;
  }
  
  await resend.emails.send({
    from: `${SENDER_NAME} <${process.env.NEXT_PUBLIC_APP_EMAIL}>`,
    to: email,
    bcc: EXTRA_NOTIFY_EMAIL,
    subject: isWaitlist 
      ? 'Crave Laughs Open Mic Waitlist Confirmation'
      : 'Crave Laughs Open Mic Signup Confirmation',
    html: `<p>${message}</p>`,
  });
}

export async function sendConfirmationEmail(
  email: string, 
  type: 'comedian' | 'audience', 
  id: string,
  date: Date,
  time: string,
  timezone: string = 'America/New_York'
) {
  return sendEmail({
    email,
    id,
    date,
    time,
    timezone,
    type
  });
}

export async function sendWaitlistEmail(
  email: string,
  id: string,
  date: Date,
  time: string,
  timezone: string = 'America/New_York'
) {
  return sendEmail({
    email,
    id,
    date,
    time,
    timezone,
    isWaitlist: true
  });
}

export async function sendCancellationNotification(
  email: string,
  fullName: string,
  type: 'comedian' | 'audience'
) {
  await resend.emails.send({
    from: `${SENDER_NAME} <${process.env.NEXT_PUBLIC_APP_EMAIL}>`,
    to: EXTRA_NOTIFY_EMAIL,
    subject: `Open Mic Cancellation: ${fullName}`,
    html: `
      <p>Someone has cancelled their signup:</p>
      <ul>
        <li>Name: ${fullName}</li>
        <li>Email: ${email}</li>
        <li>Type: ${type}</li>
      </ul>
    `,
  });
}