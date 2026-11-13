import express from 'express';
import * as db from './database.js';
import { renderSuccess, renderError } from './routers/renderHelpers.js';
import { uploadSingleImage, deleteImage } from './imageStorage.js';
import { validateSubject } from './validation.js';

const router = express.Router();



// Main route (Home)
/**
 * GET /
 * Renders the index page with optional filtering by course year and search term.
 * Query parameters:
 * - course: Optional. Filter subjects by course year (1, 2, 3, or 4).
 * - search: Optional. Search term to filter subjects by name (case-insensitive).
 * - page: Optional. Page number for pagination (default is 1).
 * 
 * The route retrieves subjects from the database based on the provided filters and pagination settings.
 * It then renders the 'index' view with the retrieved subjects and additional context for rendering.
 * 
 * PAGINATION SETTINGS:     
 * - PAGE_SIZE: The number of subjects to display per page (defined in database.js).
 * - totalItems: The total number of subjects matching the filters.
 * - totalPages: The total number of pages based on the PAGE_SIZE and totalItems.
 * - currentPage: The current page number being viewed.
 * 
 * The route also constructs an array of page objects for rendering pagination links in the view.
 */
router.get('/', async (req, res, next) => {
    try {
        const {page = 1, course = '', search = ''}=req.query; //default values for query parameters
        const {items, totalItems, totalPages, currentPage}=await db.getAsignaturas({ //ask db for all the subjects with the given filters and pagination
            page,
            search,
            courseYear: course 
        });

        const buildPageURL=(targetPage)=>{ //function to build the url for the pagination links
            const params=new URLSearchParams();
            params.set('page', targetPage);
            return `/?${params.toString()}`;
        };

        const pages=[]; //we are creating an array with the page numbers to display in the pagination component
        for (let i=1; i<=totalPages; i++) { //we are creating an array with the page numbers to display in the pagination component
            pages.push({
                number: i,
                active: i === currentPage,
                url: buildPageURL(i)
            });
        }
        
        const hasPrev=currentPage > 1; //check if there is a previous page (if is the first page, there is no previous page)
        const hasNext=currentPage < totalPages; //check if there is a next page (if is the last page, there is no next page)
        
    
        res.render('index', { // Render the index view with the retrieved subjects and additional context
            subjects: items,
            hasSubjects: items.length > 0, //check if there are subjects to display
            search,
            course,
            isCourse1: course === '1',
            isCourse2: course === '2',
            isCourse3: course === '3',
            isCourse4: course === '4',
            isAllCourses: !course,
            totalItems,
            totalPages,
            currentPage,
            pages,
            hasPagination: totalPages > 1,
            prevUrl: hasPrev ? buildPageURL(currentPage - 1) : null, //if there is a previous page, build the url for the previous page, otherwise set it to null
            nextUrl: hasNext ? buildPageURL(currentPage + 1) : null,//if there is a next page, build the url for the next page, otherwise set it to null
            hasNext,
            hasPrev
        });
    } catch (error) { //control errors 
        next(error);
    }
});


// Redirect explicit /index.html
router.get('/index.html', (req, res) => {
    res.redirect('/');
});

/** Render the form used to create a subject. */
router.get(['/detail', '/detail.html'], (req, res) => {
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
