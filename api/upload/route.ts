import { google } from 'googleapis';
import { Readable } from 'stream';

// Enforce configuration variables validation
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

export async function POST(req: Request) {
  try {
    if (!privateKey || !clientEmail || !folderId) {
      return new Response(
        JSON.stringify({ error: 'Missing cloud-storage parameters.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Initialize OAuth JWT client
    const auth = new google.auth.JWT(clientEmail, undefined, privateKey, SCOPES);
    const drive = google.drive({ version: 'v3', auth });

    // Extract Form Data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No media payload detected.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert File ArrayBuffer into a node readable stream
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // Stream write request directly to Google Drive folder target
    const driveResponse = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: 'id, webViewLink',
    });

    return new Response(
      JSON.stringify({
        success: true,
        fileId: driveResponse.data.id,
        url: driveResponse.data.webViewLink,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Drive Cloud Upload Interrupted:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Transmission failed.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
