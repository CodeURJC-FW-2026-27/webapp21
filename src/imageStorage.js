import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { renderError } from './routers/renderHelpers.js';

export const UPLOADS_FOLDER = 'uploads/';

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

// File filter restricting uploads strictly to image/* MIME types
const fileFilter = (req, file, cb) => {
    if (file && file.mimetype && file.mimetype.startsWith('image/')) {
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
 * Express middleware wrapper for single image upload with automatic error handling.
 *
 * @param {string} [fieldName='image'] - The form input field name.
 * @returns {import('express').RequestHandler}
 */
export function uploadSingleImage(fieldName = 'image') {
    const uploadMiddleware = upload.single(fieldName);

    return (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (err) {
                let errorMessage = 'Error al subir el archivo.';

                if (err.code === 'LIMIT_FILE_SIZE') {
                    errorMessage = 'El archivo supera el tamaño máximo permitido de 5 MB.';
                } else if (err.code === 'INVALID_FILE_TYPE' || err.message) {
                    errorMessage = err.message;
                }

                return renderError(res, {
                    pageTitle: 'Error en la subida de imagen',
                    title: 'Archivo no válido',
                    messages: [errorMessage],
                    buttonUrl: req.headers.referer || '/',
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
    if (err instanceof multer.MulterError || err.code === 'INVALID_FILE_TYPE') {
        let message = 'Error al subir el archivo.';

        if (err.code === 'LIMIT_FILE_SIZE') {
            message = 'El archivo supera el tamaño máximo permitido de 5 MB.';
        } else if (err.message) {
            message = err.message;
        }

        return renderError(res, {
            pageTitle: 'Error en la subida de imagen',
            title: 'Archivo no válido',
            messages: [message],
            buttonUrl: req.headers.referer || '/',
            buttonText: 'Volver'
        }, 400);
    }
    next(err);
}
