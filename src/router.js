import express from 'express';
import * as db from './database.js';
import { renderSuccess, renderError } from './routers/renderHelpers.js';
import { uploadSingleImage, deleteImage } from './imageStorage.js';
import { validateSubject } from './validation.js';

const router = express.Router();

// Main route (Home)
router.get('/', (req, res) => {
    res.render('index');
});

// Redirect explicit /index.html
router.get('/index.html', (req, res) => {
    res.redirect('/');
});

/** Render the form used to create a subject. */
router.get(['/nueva-asignatura', '/nueva-asignatura.html'], (req, res) => {
    res.render('subject-form', {
        pageTitle: 'Nueva asignatura',
        formAction: '/subjects/new',
        isEdit: false,
        subject: {}
    });
});

/** Save a subject after validating all submitted fields on the server. */
router.post('/subjects/new', uploadSingleImage('image'), async (req, res, next) => {
    const uploadedFilename = req.file?.filename;

    try {
        const { isValid, errors } = await validateSubject(req.body, req.file);
        if (!isValid) {
            await deleteImage(uploadedFilename);
            return renderError(res, {
                pageTitle: 'Error al crear la asignatura',
                title: 'No se pudo crear la asignatura',
                messages: errors,
                buttonUrl: '/nueva-asignatura',
                buttonText: 'Volver al formulario'
            }, 400);
        }

        const subject = {
            name: req.body.name.trim(),
            description: req.body.description.trim(),
            courseYear: String(req.body.courseYear),
            semester: String(req.body.semester),
            image: uploadedFilename,
            tests: []
        };
        const id = await db.addAsignatura(subject);

        return renderSuccess(res, {
            pageTitle: 'Asignatura creada',
            title: 'Asignatura creada',
            messages: ['La asignatura se ha creado correctamente.'],
            buttonUrl: `/subjects/${id}`,
            buttonText: 'Ver asignatura'
        });
    } catch (error) {
        await deleteImage(uploadedFilename);
        return next(error);
    }
});

// Subject detail route
router.get('/detalle', (req, res) => {
    res.render('detail');
});

router.get('/detalle.html', (req, res) => {
    res.render('detail');
});

// Compatibility with legacy routes
router.get('/detalle-:subject.html', (req, res) => {
    res.render('detail');
});

router.get('/detalle-:subject', (req, res) => {
    res.render('detail');
});

// Sample / verification routes for shared confirmation and error views (Task I-01)
router.get('/sample-success', (req, res) => {
    return renderSuccess(res, {
        pageTitle: 'Operación completada',
        title: 'Asignatura creada',
        messages: ['La asignatura se ha registrado correctamente en el sistema.'],
        buttonUrl: '/',
        buttonText: 'Ir a la página principal'
    });
});

router.get('/sample-error', (req, res) => {
    return renderError(res, {
        pageTitle: 'Error de validación',
        title: 'No se pudo crear la asignatura',
        messages: [
            'El nombre de la asignatura es obligatorio y debe empezar por mayúscula.',
            'La descripción debe tener entre 20 y 1000 caracteres.',
            'Debe adjuntar una imagen válida en formato JPG o PNG.'
        ],
        buttonUrl: '/nueva-asignatura',
        buttonText: 'Volver al formulario'
    }, 400);
});

export default router;
