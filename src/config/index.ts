import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  env: process.env.NODE_ENV,
  database_url: process.env.DATABASE_URL,
  port: process.env.PORT,
  admin_client_url: process.env.ADMIN_CLIENT_URL,
  frontend_url: process.env.FRONTEND_URL,
  backend_url:process.env.BACKEND_URL,
  jwt: {
    bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
    access_secret: process.env.JWT_ACCESS_SECRET,
    access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
    refresh_secret: process.env.JWT_REFRESH_SECRET,
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
    forget_password_secret: process.env.JWT_FORGET_PASSWORD_SECRET,
    forget_password_expires_in: process.env.JWT_FORGET_PASSWORD_EXPIRES_IN,
    verify_email_secret: process.env.JWT_EMAIL_VERIFY_SECRET,
    verify_email_expires_in: process.env.JWT_EMAIL_VERIFY_EXPIRES_IN,
  },
  softograph_email: process.env.SOFTOGRAPH_EMAIL,
  softograph_pass: process.env.SOFTOPGRAPH_PASS,
  // rabbitMQ_url: process.env.RABBITMQ_URL,
  // email_queue_name: process.env.EMAIL_QUEUE_NAME,
  google_client_id: process.env.GOOGLE_CLIENT_ID,
  google_client_secret: process.env.GOOGLE_CLIENT_SECRET,
  ssl_store_id: process.env.SSL_STORE_ID,
  ssl_store_pass: process.env.SSL_STORE_PASS,
  ssl_is_sandbox: process.env.SSL_IS_SANDBOX,
  delivery_charge: Number(process.env.DELIVERY_CHARGE) || 60,

  /**
   * Object storage (Amazon S3) for uploads.
   *
   * Render's filesystem is ephemeral: every deploy, restart or scale cycle
   * discards anything written to disk, so files saved under ./uploads vanish
   * and the `path` stored in the database points at nothing. Uploads are held
   * in S3 instead, which survives restarts and is shared across instances.
   */
  storage: {
    bucket: process.env.BUCKET_NAME,
    region: process.env.BUCKET_REGION || process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    endpoint: process.env.AWS_ENDPOINT_URL_S3,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    objectAcl: process.env.S3_OBJECT_ACL || '',
    publicUrl: (process.env.BUCKET_PUBLIC_URL || '').replace(/\/$/, ''),
  },
};
