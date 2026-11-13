import express from 'express';
import mustacheExpress from 'mustache-express';
import bodyParser from 'body-parser';

import router from './router.js';
import { handleMulterError } from './imageStorage.js';
import { loadSampleData } from './load_data.js';

const app = express();

app.use(express.static('./public'));
app.use('/uploads', express.static('./uploads'));

// Configure the template engine and shared Mustache partials.
app.set('view engine', 'html');
app.engine('html', mustacheExpress('./views/partials', '.html'));
app.set('views', './views');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use('/', router);
app.use(handleMulterError);

await loadSampleData();

app.listen(3000, () => console.log('Web ready in http://localhost:3000/'));
