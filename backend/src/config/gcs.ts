import fs from 'fs';
import path from 'path';
import { Storage, StorageOptions } from '@google-cloud/storage';

const BUCKET_NAME = process.env.GCS_BUCKET_NAME as string | undefined;
const USE_REAL_GCS =
  process.env.STORAGE_DRIVER === 'gcs' &&
  !!BUCKET_NAME &&
  BUCKET_NAME !== 'your-bucket-name';

function createStorage(): Storage {
  const clientEmail = process.env.GCS_CLIENT_EMAIL;
  const privateKey = process.env.GCS_PRIVATE_KEY;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;

  const options: StorageOptions = {};
  if (projectId) options.projectId = projectId;

  if (clientEmail && privateKey) {
    options.credentials = {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    };
  }

  return new Storage(options);
}

async function saveLocally(
  localFilePath: string,
  destinationFileName: string
): Promise<string> {
  const destDir = path.join(process.cwd(), 'local_gcs');
  await fs.promises.mkdir(destDir, { recursive: true });
  const safeName = destinationFileName.replace(/[\\/]+/g, '_');
  const destPath = path.join(destDir, safeName);
  await fs.promises.copyFile(localFilePath, destPath);
  console.log(`[gcs:local] saved -> ${destPath}`);
  return `gs://local/${destinationFileName}`;
}

export async function uploadFileToGCS(
  localFilePath: string,
  destinationFileName: string
): Promise<string> {
  if (!USE_REAL_GCS) {
    console.log(
      '[gcs] STORAGE_DRIVER is not "gcs" (or no bucket set) — using LOCAL storage. ' +
        'No Google Cloud credentials required.'
    );
    return saveLocally(localFilePath, destinationFileName);
  }

  try {
    console.log(`[gcs] uploading to bucket "${BUCKET_NAME}" ...`);
    const storage = createStorage();
    const bucket = storage.bucket(BUCKET_NAME!);
    await bucket.upload(localFilePath, { destination: destinationFileName });
    const gcsPath = `gs://${BUCKET_NAME}/${destinationFileName}`;
    console.log(`[gcs] upload OK -> ${gcsPath}`);
    return gcsPath;
  } catch (err) {
    console.warn(
      '[gcs] real GCS upload failed — this is expected when Google credentials ' +
        'are not configured. Falling back to LOCAL storage. Reason:',
      (err as Error).message
    );
    return saveLocally(localFilePath, destinationFileName);
  }
}
