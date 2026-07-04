import fs from 'fs';
import path from 'path';

const BUCKET_NAME = process.env.GCS_BUCKET_NAME as string | undefined;

export async function uploadFileToGCS(
  localFilePath: string,
  destinationFileName: string
): Promise<string> {
  if (!BUCKET_NAME || BUCKET_NAME === 'your-bucket-name') {
    const destDir = path.join(process.cwd(), 'local_gcs');
    await fs.promises.mkdir(destDir, { recursive: true });
    const safeName = destinationFileName.replace(/[\\/]+/g, '_');
    const destPath = path.join(destDir, safeName);
    await fs.promises.copyFile(localFilePath, destPath);
    return `gs://local/${destinationFileName}`;
  }

  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage();
  const bucket = storage.bucket(BUCKET_NAME);
  await bucket.upload(localFilePath, {
    destination: destinationFileName,
  });
  return `gs://${BUCKET_NAME}/${destinationFileName}`;
}