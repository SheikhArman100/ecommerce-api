import { Request, Response, NextFunction, RequestHandler } from 'express';
import multer from 'multer';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import config from '../config';

/** S3 upload helpers. Files go to the configured bucket, not local disk. */
const storageConfig = config.storage;

let client: S3Client | null = null;

const getClient = (): S3Client => {
  if (client) return client;

  const { bucket, region, accessKeyId, secretAccessKey } = storageConfig;

  if (!bucket || !region) {
    throw new Error('Object storage is not configured. Set BUCKET_NAME and BUCKET_REGION.');
  }

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'Object storage credentials are missing. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.',
    );
  }

  client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    ...(storageConfig.endpoint
      ? { endpoint: storageConfig.endpoint, forcePathStyle: true }
      : {}),
  });

  return client;
};

export const isObjectStorageEnabled = (): boolean =>
  Boolean(
    storageConfig.bucket &&
      storageConfig.region &&
      storageConfig.accessKeyId &&
      storageConfig.secretAccessKey,
  );

/** Object key for an upload: `<folder>/images|videos/<name>`. */
export const buildObjectKey = (
  folder: string,
  file: { mimetype: string; originalname: string },
  customFilename?: string,
): string => {
  const safeFolder = folder.replace(/[^\w-]/g, '_');
  const subdir = file.mimetype?.includes('video') ? 'videos' : 'images';
  const baseName =
    customFilename || `${Date.now()}-${folder}-${file.originalname}`;

  return `${safeFolder}/${subdir}/${baseName.replace(/[^\w.-]/g, '_')}`;
};

const ALLOWED_ACLS: readonly string[] = [
  'private',
  'public-read',
  'public-read-write',
  'authenticated-read',
  'aws-exec-read',
  'bucket-owner-read',
  'bucket-owner-full-control',
];

/** Uploads a buffer and returns the key it was stored under. */
export const uploadToObjectStorage = async (
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> => {
  const acl = storageConfig.objectAcl;
  if (acl && !ALLOWED_ACLS.includes(acl)) {
    throw new Error(
      `Invalid S3_OBJECT_ACL "${acl}". Expected one of: ${ALLOWED_ACLS.join(', ')}.`,
    );
  }

  await getClient().send(
    new PutObjectCommand({
      Bucket: storageConfig.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      // Omitted entirely when unset rather than sent as `private`. The index
      // access picks up S3's own ACL union without reaching into a type the
      // SDK does not re-export.
      ...(acl ? { ACL: acl as PutObjectCommandInput['ACL'] } : {}),
    }),
  );

  return key;
};

/** Deletes an object. Never throws. */
export const deleteFromObjectStorage = async (key: string): Promise<void> => {
  if (!key) return;
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: storageConfig.bucket, Key: key }),
    );
  } catch (error) {
    console.error(`Failed to delete object "${key}" from storage:`, error);
  }
};

/** Absolute URL for a stored key, for API responses and the storefront. */
export const publicUrlFor = (key: string): string => {
  if (!key) return '';
  if (/^https?:\/\//i.test(key)) return key;
  return `${storageConfig.publicUrl}/${key}`;
};
/** Deletes the object a database row points at. Never throws. */
export const deleteStoredFile = async (key?: string | null): Promise<void> => {
  if (!key) return;
  // A fully-qualified URL predates the key-based layout and maps back to no
  // bucket key, so skip rather than issue a malformed delete.
  if (/^https?:\/\//i.test(key)) return;
  await deleteFromObjectStorage(key);
};

/** Fire-and-forget delete for synchronous call sites. */
export const deleteStoredFileSafe = (key?: string | null): void => {
  void deleteStoredFile(key);
};
/** Object key to record in the database for an uploaded file. */
export const storedPathFor = (
  file: { path?: string; filename: string },
  folder: string,
): string => file.path || `${folder}/images/${file.filename}`;
/** Multer buffers uploads in memory. 10 MB / 10 files max, images and videos only. */
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 10;

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    if (/^(image|video)\//.test(file.mimetype)) return cb(null, true);
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
});
/** Uploads a buffered file to S3 and restores the IFile shape (path, filename, destination). */
const persist = async (
  file: Express.Multer.File,
  folder: string,
): Promise<Express.Multer.File> => {
  const key = buildObjectKey(folder, file);
  await uploadToObjectStorage(key, file.buffer, file.mimetype);

  const persisted = file as Express.Multer.File & {
    destination: string;
    filename: string;
    path: string;
  };

  persisted.filename = key.split('/').pop()!;
  persisted.destination = key.split('/').slice(0, -1).join('/');
  persisted.path = key;
  delete (persisted as any).buffer;

  return persisted;
};

/** Uploads every attached file. Cleans up stored objects on partial failure. */
const persistAll = async (req: Request, folder: string): Promise<void> => {
  const files: Express.Multer.File[] = [];

  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) {
    files.push(...req.files);
  } else if (req.files) {
    for (const group of Object.values(req.files)) {
      if (Array.isArray(group)) files.push(...group);
    }
  }

  if (files.length === 0) return;

  const uploaded: string[] = [];
  try {
    for (const file of files) {
      await persist(file, folder);
      uploaded.push((file as any).path);
    }
  } catch (error) {
    await Promise.all(uploaded.map((key) => deleteFromObjectStorage(key)));
    throw error;
  }
};

/** Wraps a multer handler so files land in S3 before the route runs. */
const toHandler = (handler: RequestHandler, folder: string): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, async (err?: any) => {
      if (err) return next(err);
      try {
        await persistAll(req, folder);
        next();
      } catch (error) {
        next(error);
      }
    });
  };

/** Accepts a single file under the field name `file`. */
const uploadSingle = (folder: string): RequestHandler =>
  toHandler(memoryUpload.single('file'), folder);

/** Accepts multiple files under one field name. */
const uploadMultiple = (
  folder: string,
  fieldName: string,
  maxCount: number,
): RequestHandler =>
  toHandler(memoryUpload.array(fieldName, maxCount), folder);

/** Accepts files under any field name. */
const uploadAny = (folder: string): RequestHandler =>
  toHandler(memoryUpload.any(), folder);

export const FileUploadHelper = {
  uploadSingle,
  uploadMultiple,
  uploadAny,
};
