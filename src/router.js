import express from 'express';
import * as db from './database.js';
import { renderSuccess, renderError } from './routers/renderHelpers.js';
import { upload, uploadSingleImage, deleteImage } from './imageStorage.js';

const router = express.Router();

// Main route (Home)
router.get('/', (req, res) => {
    res.render('index');
});

// Redirect explicit /index.html
router.get('/index.html', (req, res) => {
    res.redirect('/');
});

// New subject form route
router.get('/nueva-asignatura', (req, res) => {
    res.render('subject-form');
});

router.get('/nueva-asignatura.html', (req, res) => {
    res.render('subject-form');
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
