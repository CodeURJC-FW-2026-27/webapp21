import express from 'express';

const router = express.Router();

// Ruta principal (Home)
router.get('/', (req, res) => {
    res.render('index');
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

export default router;
