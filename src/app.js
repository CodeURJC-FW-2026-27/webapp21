import express from 'express';
import mustacheExpress from 'mustache-express';
import bodyParser from 'body-parser';

import router from './router.js';
import { handleMulterError } from './imageStorage.js';
import { loadSampleData } from './load_data.js';
import { renderError } from './routers/renderHelpers.js';
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

// Global error handler for Multer upload errors
app.use(handleMulterError);

// Global error handler for unexpected server errors,
app.use((err, req, res, next) => {
        console.error(err);
        renderError(res, {
            pageTitle: 'Error del servidor',
            title: 'Ha ocurrido un error inesperado',
            messages: ['Se ha producido un error interno en el servidor. Por favor, inténtelo de nuevo más tarde.'],
            buttonUrl: '/', 
            buttonText: 'Ir al inicio'
        }, 500); 
    });


// Load sample data if the database is empty
await loadSampleData();

// Start the server
app.listen(3000, () => console.log('Web ready in http://localhost:3000/'));
