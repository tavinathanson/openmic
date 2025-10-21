import { google } from 'googleapis';
import { createServiceRoleClient } from '../src/lib/supabase';
import { format, subDays } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

const MAIN_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

if (!MAIN_SHEET_ID || !GOOGLE_SERVICE_ACCOUNT_KEY) {
  console.error('Missing required environment variables: GOOGLE_SHEET_ID or GOOGLE_SERVICE_ACCOUNT_KEY');
  process.exit(1);
}

// Parse the service account key
let serviceAccountKey;
try {
  serviceAccountKey = JSON.parse(GOOGLE_SERVICE_ACCOUNT_KEY);
} catch (error) {
  console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY. Make sure it\'s valid JSON.');
  process.exit(1);
}

// Initialize Google Sheets API
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccountKey,
  scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
});

const sheets = google.sheets({ version: 'v4', auth });
const drive = google.drive({ version: 'v3', auth });

async function getExistingEmailsFromMainSheet(): Promise<Set<string>> {
  try {
    // Get all data from the main sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: MAIN_SHEET_ID,
      range: '1:10000', // Get first 10000 rows
    });
    
    const values = response.data.values || [];
    
    if (values.length === 0) {
      return new Set();
    }
    
    // Find the "Email" column index
    const headers = values[0];
    const emailColumnIndex = headers.findIndex((header: string) => 
      header.toLowerCase().trim() === 'email'
    );
    
    if (emailColumnIndex === -1) {
      console.error('No "Email" column found in the main sheet');
      return new Set();
    }
    
    // Extract all existing emails from that column
    const existingEmails = new Set<string>();
    for (let i = 1; i < values.length; i++) {
      const email = values[i]?.[emailColumnIndex];
      if (email) {
        existingEmails.add(email.toLowerCase().trim());
      }
    }
    
    return existingEmails;
  } catch (error: any) {
    console.error('Error fetching existing emails from main sheet:', error.message);
    return new Set();
  }
}

async function createDateSheet(date: string, newEmails: string[][]): Promise<void> {
  try {
    // Create a new spreadsheet
    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: `New Comedians - ${date}`,
        },
        sheets: [{
          properties: {
            title: 'New Emails',
          },
        }],
      },
    });

    const newSpreadsheetId = createResponse.data.spreadsheetId;
    console.log(`Created new sheet: ${createResponse.data.properties?.title}`);
    console.log(`Sheet URL: https://docs.google.com/spreadsheets/d/${newSpreadsheetId}`);

    // Add headers and data
    const values = [
      ['Email', 'Name', 'Date'], // Headers
      ...newEmails.map(row => [...row, date]), // Add date to each row
    ];

    await sheets.spreadsheets.values.update({
      spreadsheetId: newSpreadsheetId!,
      range: 'New Emails!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    // Share the sheet with the same permissions as the main sheet
    // This ensures the user can access it
    console.log('Sheet created successfully!');
  } catch (error: any) {
    console.error('Error creating date sheet:', error.message);
    throw error;
  }
}

async function syncComedianEmails() {
  console.log('Starting comedian email sync...');
  
  const supabase = createServiceRoleClient();
  
  // Get yesterday's date in EST/EDT (where the open mics happen)
  // This ensures we check the right date regardless of where the server runs
  const nowInEastern = utcToZonedTime(new Date(), 'America/New_York');
  const yesterdayInEastern = subDays(nowInEastern, 1);
  const yesterdayStr = format(yesterdayInEastern, 'yyyy-MM-dd');
  
  console.log(`Looking for open mic date: ${yesterdayStr} (Eastern Time)`);
  
  // Check if there was an open mic yesterday
  const { data: openMicDate, error: dateError } = await supabase
    .from('open_mic_dates')
    .select('id, date')
    .eq('date', yesterdayStr)
    .single();
    
  if (dateError || !openMicDate) {
    console.log('No open mic date found for yesterday. Skipping sync.');
    return;
  }
  
  console.log(`Found open mic date: ${openMicDate.date}`);
  
  // Get existing emails from the main sheet
  const existingEmails = await getExistingEmailsFromMainSheet();
  console.log(`Found ${existingEmails.size} existing emails in the main sheet`);
  
  // Get all comedian signups for yesterday's open mic
  const { data: signups, error: signupError } = await supabase
    .from('sign_ups')
    .select('people(email, full_name)')
    .eq('signup_type', 'comedian')
    .eq('open_mic_date_id', openMicDate.id)
    .order('created_at', { ascending: true });
  
  if (signupError) {
    console.error('Error fetching comedians from database:', signupError);
    process.exit(1);
  }
  
  // Filter for new emails only
  const newEmails = [];
  for (const signup of signups || []) {
    const email = signup.people?.email;
    if (email && !existingEmails.has(email.toLowerCase().trim())) {
      newEmails.push([email, signup.people?.full_name || '']);
    }
  }
  
  console.log(`Found ${newEmails.length} new emails from last night's open mic`);
  
  if (newEmails.length === 0) {
    console.log('No new emails to report');
    return;
  }
  
  // Create a new sheet with the new emails
  await createDateSheet(openMicDate.date, newEmails);
  
  console.log(`Created sheet with ${newEmails.length} new comedian emails for manual review`);
}

// Run the sync
syncComedianEmails().catch(error => {
  console.error('Sync failed:', error);
  process.exit(1);
});