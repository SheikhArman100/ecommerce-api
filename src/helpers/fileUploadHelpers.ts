import multer from 'multer';

/**
 * Defines the storage configuration for multer based on the provided folder.This function stores all kind of files inside our local storage
 * @param folder The folder name where files will be stored (required).
 */
const storage = (folder: string) =>
  multer.diskStorage({
    destination: function (req, file, cb) {
      console.log(req.file);
      if (file.mimetype.includes('video')) {
        cb(null, `uploads/${folder}/videos`);
      } else {
        cb(null, `uploads/${folder}/images`);
      }
    },
    filename: function (req, file, cb) {
      const newFileName =
        Date.now() + `-${folder}-` + file.originalname.replace(/[^\w.-]/g, '_');
      cb(null, newFileName);
    },
  });

/**
 * Initializes multer with the provided storage configuration for a single file.
 * @param folder The folder name where files will be stored (required).
 * @returns Multer instance configured with the provided storage.
 */
const uploadSingle = (folder: string) =>
  multer({ storage: storage(folder) }).single('file');

/**
 * Initializes multer with the provided storage configuration for multiple files.
 * @param folder The folder name where files will be stored (required).
 * @param fieldName The field name in the form that contains the files.
 * @param maxCount The maximum number of files to accept.
 * @returns Multer instance configured with the provided storage.
 */
const uploadMultiple = (folder: string, fieldName: string, maxCount: number) =>
  multer({ storage: storage(folder) }).array(fieldName, maxCount);

const uploadAny = (folder: string) =>
  multer({ storage: storage(folder) }).any();

export const FileUploadHelper = {
  uploadSingle,
  uploadMultiple,
  uploadAny
};
