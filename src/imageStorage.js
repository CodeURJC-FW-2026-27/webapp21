import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderError } from './renderHelpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOADS_FOLDER = path.resolve(__dirname, '..', 'uploads');

// Ensure destination folder exists
if (!fs.existsSync(UPLOADS_FOLDER)) {
    fs.mkdirSync(UPLOADS_FOLDER, { recursive: true });
}

// Storage configuration with random unique names preserving original extensions
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_FOLDER);
    },
    filename: (req, file, cb) => {
        const uniqueId = crypto.randomUUID();
        const extension = path.extname(file.originalname).toLowerCase();
        cb(null, `${uniqueId}${extension}`);
    }
});

// Restrict uploads to the image formats supported by the application.
const ALLOWED_IMAGE_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
]);

const fileFilter = (req, file, cb) => {
    if (file && ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
        cb(null, true);
    } else {
        const error = new Error('Solo se permiten archivos de imagen (PNG, JPG, JPEG, GIF, WEBP). No se admiten documentos PDF ni otros formatos.');
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
    }
};

// 5 MB maximum file size limit
const limits = {
    fileSize: 5 * 1024 * 1024
};

// Configured Multer instance
export const upload = multer({
    storage,
    fileFilter,
    limits
});

/**
 * Deletes an uploaded image from the uploads directory.
 *
 * @param {string} filename - The name of the file to remove.
 * @returns {Promise<void>}
 */
export async function deleteImage(filename) {
    if (!filename) return;
    const cleanFilename = path.basename(filename);
    const filePath = path.join(UPLOADS_FOLDER, cleanFilename);
    await fs.promises.rm(filePath, { force: true });
}

/**
 * Checks whether an error was raised by Multer or by the image type filter.
 * @param {Error & { code?: string }} error - Error reported by the upload middleware.
 * @returns {boolean} Whether the error should be rendered as an upload error.
 */
function isMulterUploadError(error) {
    return error instanceof multer.MulterError || error.code === 'INVALID_FILE_TYPE';
}

/**
 * Converts an upload error into a user-facing message.
 * @param {Error & { code?: string }} error - Error reported by Multer or the image type filter.
 * @returns {string} A message suitable for the upload error page.
 */
function getMulterErrorMessage(error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
        return 'El archivo supera el tamaño máximo permitido de 5 MB.';
    }
    if (error.code === 'INVALID_FILE_TYPE') {
        return error.message;
    }
    if (error instanceof multer.MulterError && error.message) {
        return error.message;
    }
    return 'Error al subir el archivo.';
}

/**
 * Express middleware wrapper for single image upload with automatic error handling.
 *
 * @param {string} [fieldName='image'] - The form input field name.
 * @param {string|((req: import('express').Request) => string)} [errorButtonUrl] - Error page destination, or a function that derives it from the request.
 * @returns {import('express').RequestHandler}
 */
export function uploadSingleImage(fieldName = 'image', errorButtonUrl = null) {
    const uploadMiddleware = upload.single(fieldName);

    return (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (err) {
                if (!isMulterUploadError(err)) {
                    return next(err);
                }
                const buttonUrl = typeof errorButtonUrl === 'function'
                    ? errorButtonUrl(req)
                    : errorButtonUrl || req.headers.referer || '/';

                return renderError(res, {
                    pageTitle: 'Error en la subida de imagen',
                    title: 'Archivo no válido',
                    messages: [getMulterErrorMessage(err)],
                    buttonUrl,
                    buttonText: 'Volver'
                }, 400);
            }
            next();
        });
    };
}

/**
 * Express error-handling middleware for Multer errors.
 */
export function handleMulterError(err, req, res, next) {
    if (isMulterUploadError(err)) {
        return renderError(res, {
            pageTitle: 'Error en la subida de imagen',
            title: 'Archivo no válido',
            messages: [getMulterErrorMessage(err)],
            buttonUrl: req.headers.referer || '/',
            buttonText: 'Volver'
        }, 400);
    }
    next(err);
}
