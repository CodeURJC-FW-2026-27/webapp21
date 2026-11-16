import express from 'express';
import mustacheExpress from 'mustache-express';
import bodyParser from 'body-parser';

import router from './router.js';
import { handleMulterError } from './imageStorage.js';
import { loadSampleData } from './load_data.js';
import { renderError } from './renderHelpers.js';
const app = express();

app.use(express.static('./public'));
app.use('/uploads', express.static('./uploads'));

// Template engine configuration
app.set('view engine', 'html');
app.engine('html', mustacheExpress('./views/partials', '.html'));
app.set('views', './views');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Main application router
app.use('/', router);

// 404 Not Found handler for unmatched routes using message.html
app.use((req, res) => {
    renderError(res, {
        pageTitle: 'Página no encontrada',
        title: '404 - Página no encontrada',
        messages: ['La página que buscas no existe o ha sido movida.'],
        buttonUrl: '/',
        buttonText: 'Volver al inicio'
    }, 404);
});

// Global error handler for Multer upload errors
app.use(handleMulterError);

// Global generic error handler for unexpected server errors
app.use((err, req, res, next) => {
    console.error(err);
    const status = err.status && Number.isInteger(err.status) ? err.status : 500;
    renderError(res, {
        pageTitle: status === 404 ? 'Página no encontrada' : 'Error del servidor',
        title: status === 404 ? '404 - No encontrado' : 'Ha ocurrido un error inesperado',
        messages: [err.message || 'Se ha producido un error interno en el servidor. Por favor, inténtelo de nuevo más tarde.'],
        buttonUrl: '/', 
        buttonText: 'Volver al inicio'
    }, status); 
});


// Load sample data if the database is empty
await loadSampleData();

// Start the server
app.listen(3000, () => console.log('Web ready in http://localhost:3000/'));
