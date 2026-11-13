import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import * as db from './database.js';

const router = express.Router();
export default router;

const upload = multer({ dest: db.UPLOADS_FOLDER }); // Configure multer to use the uploads folder for storing uploaded files


// Ruta principal (Home)
router.get('/', (req, res) => {
    const { course, search } = req.query;

    res.render('index', {
        search,
        isCourse1: course === '1',
        isCourse2: course === '2',
        isCourse3: course === '3',
        isCourse4: course === '4',
        isAllCourses: !course
    });
});

// Redirección si se accede explícitamente a /index.html
router.get('/index.html', (req, res) => {
    res.redirect('/');
});

// Ruta para la creación de una nueva asignatura (Página de nuevo elemento)
router.get('/nueva-asignatura', (req, res) => {
    res.render('nueva-asignatura');
});

router.get('/nueva-asignatura.html', (req, res) => {
    res.render('nueva-asignatura');
});

// Ruta para la plantilla de detalle (Página de detalle del elemento principal)
router.get('/detalle', (req, res) => {
    res.render('detalle');
});

router.get('/detalle.html', (req, res) => {
    res.render('detalle');
});

// Compatibilidad con posibles rutas antiguas
router.get('/detalle-:subject.html', (req, res) => {
    res.render('detalle');
});

router.get('/detalle-:subject', (req, res) => {
    res.render('detalle');
});


