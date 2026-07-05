import { google } from 'googleapis';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

export async function GET(req: Request) {
  // Protect the route against unauthorized public triggers
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized system access' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    if (!privateKey || !clientEmail || !folderId) {
      throw new Error('Missing cloud infrastructure parameters.');
    }

    // 1. Fetch live system datasets from our Python API
    const host = req.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const backendUrl = `${protocol}://${host}/api/backup/export-system`;

    const apiResponse = await fetch(backendUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.CRON_SECRET}`
      }
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      throw new Error(`Failed to fetch backend data: ${apiResponse.status} ${errText}`);
    }

    const systemBackupPayload = await apiResponse.json();

    // 2. Initialize Google Drive Client Connection
    const auth = new google.auth.JWT(clientEmail, undefined, privateKey, SCOPES);
    const drive = google.drive({ version: 'v3', auth });

    // 3. Format payload buffer stream
    const jsonString = JSON.stringify(systemBackupPayload, null, 2);
    const buffer = Buffer.from(jsonString, 'utf-8');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // 4. Dispatch named transaction archive file straight to Google Drive target
    const stamp = new Date().toISOString().split('T')[0];
    const fileName = `bawar-star-backup-${stamp}.json`;

    const driveResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
        mimeType: 'application/json',
      },
      media: {
        mimeType: 'application/json',
        body: stream,
      },
      fields: 'id',
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `System snapshot saved as ${fileName}`,
        fileId: driveResponse.data.id,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Automated Data Backup Terminated:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Backup failed.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
