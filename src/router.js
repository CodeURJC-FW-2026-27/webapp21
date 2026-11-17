import express from 'express';
import * as db from './database.js';
import { parseObjectId } from './database.js';
import { renderSuccess, renderError } from './renderHelpers.js';
import { uploadSingleImage, deleteImage } from './imageStorage.js';
import { validateSubject, validateTest } from './validation.js';

const router = express.Router();

/**
 * Helper to render a standardized 404 error page when a subject or test is not found.
 *
 * @param {import('express').Response} res - Express response object.
 * @param {string} pageTitle - Browser tab title.
 * @param {string} title - Main error heading.
 * @param {string} message - User-facing error message.
 * @param {string} [buttonUrl='/'] - Destination URL for the back button.
 * @param {string} [buttonText='Volver al inicio'] - Label for the back button.
 */
function renderNotFound(res, pageTitle, title, message, buttonUrl = '/', buttonText = 'Volver al inicio') {
    return renderError(res, {
        pageTitle,
        title,
        messages: [message],
        buttonUrl,
        buttonText
    }, 404);
}



/**
 * We use this helper to render a subject not found error page with a default back button to the home page.
 * So we dont duplicate a lot of code.
 * @param {*} res 
 * @param {*} buttonUrl 
 * @param {*} buttonText 
 * @returns 
 */
function renderSubjectNotFound(res, buttonUrl = '/', buttonText = 'Volver al inicio') {
    return renderNotFound(
        res,
        'Asignatura no encontrada',
        'No se encontró la asignatura',
        'La asignatura solicitada no existe o ya ha sido eliminada.',
        buttonUrl,
        buttonText
    );
}


/**
 * Renders a test not found error page.
 * @param {*} res 
 * @param {*} subjectId 
 * @returns 
 */
function renderTestNotFound(res, subjectId) {
    return renderNotFound(
        res,
        'Simulacro no encontrado',
        'No se encontró el simulacro',
        'El simulacro solicitado no existe o ya ha sido eliminado.',
        `/subjects/${subjectId}`,
        'Volver a la asignatura'
    );
}


/**
 * Function to make sure the subject exists before proceeding to the next middleware or route handler.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
async function requireSubject(req, res, next) {
    try {
        const parsedId = parseObjectId(req.params.id);
        const subject = parsedId ? await db.getSubject(parsedId) : null;

        if (!subject) {
            await deleteImage(req.file?.filename);
            return renderSubjectNotFound(res);
        }

        req.subjectId = parsedId;
        req.subject = subject;
        return next();
    } catch (error) {
        await deleteImage(req.file?.filename);
        return next(error);
    }
}

/**
 * With this function we make sure the test exists and belongs to the subject before proceeding.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
async function requireTest(req, res, next) {
    try {
        const parsedTestId = parseObjectId(req.params.testId);
        const test = parsedTestId ? await db.getTest(parsedTestId) : null;

        if (!test || test.subjectId?.toString() !== req.subject._id.toString()) {
            return renderTestNotFound(res, req.params.id);
        }

        req.testId = parsedTestId;
        req.test = test;
        return next();
    } catch (error) {
        return next(error);
    }
}

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
        const { page = 1, course = '', search = '' } = req.query;
        const cleanSearch = typeof search === 'string' ? search.trim() : '';
        const requestedCourse = typeof course === 'string' ? course.trim() : '';
        const cleanCourse = ['1', '2', '3', '4'].includes(requestedCourse) ? requestedCourse : '';

        const { items, totalItems, totalPages, currentPage } = await db.getSubjects({
            page,
            search: cleanSearch,
            courseYear: cleanCourse
        });

        const buildPageURL = (targetPage) => {
            const params = new URLSearchParams();
            params.set('page', targetPage);
            if (cleanCourse) params.set('course', cleanCourse);
            if (cleanSearch) params.set('search', cleanSearch);
            return `/?${params.toString()}`;
        };

        const buildFilterURL = (targetCourse) => {
            const params = new URLSearchParams();
            if (targetCourse) params.set('course', targetCourse);
            if (cleanSearch) params.set('search', cleanSearch);
            const qs = params.toString();
            return qs ? `/?${qs}` : '/';
        };

        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push({
                number: i,
                active: i === currentPage,
                url: buildPageURL(i)
            });
        }

        const hasPrev = currentPage > 1;
        const hasNext = currentPage < totalPages;

        let emptyMessage = 'No se han encontrado asignaturas';
        if (cleanSearch) {
            emptyMessage = `No hay asignaturas que coincidan con '${cleanSearch}'`;
        } else if (cleanCourse) {
            emptyMessage = `No hay asignaturas que coincidan con el curso ${cleanCourse}º`;
        }

        res.render('index', {
            subjects: items,
            hasSubjects: items.length > 0,
            search: cleanSearch,
            course: cleanCourse,
            isCourse1: cleanCourse === '1',
            isCourse2: cleanCourse === '2',
            isCourse3: cleanCourse === '3',
            isCourse4: cleanCourse === '4',
            isAllCourses: !cleanCourse,
            urlCourseAll: buildFilterURL(''),
            urlCourse1: buildFilterURL('1'),
            urlCourse2: buildFilterURL('2'),
            urlCourse3: buildFilterURL('3'),
            urlCourse4: buildFilterURL('4'),
            hasFilters: Boolean(cleanSearch || cleanCourse),
            emptyMessage,
            totalItems,
            totalPages,
            currentPage,
            pages,
            hasPagination: totalPages > 1,
            prevUrl: hasPrev ? buildPageURL(currentPage - 1) : null,
            nextUrl: hasNext ? buildPageURL(currentPage + 1) : null,
            hasNext,
            hasPrev
        });
    } catch (error) {
        next(error);
    }
});


// Redirect explicit /index.html
router.get('/index.html', (req, res) => {
    res.redirect('/');
});

/**
 * Converts legacy course and semester labels to the numeric values used by the form.
 * @param {string|number|undefined} value - Existing value stored in MongoDB.
 * @param {number} maxValue - Largest allowed numeric option.
 * @param {Object<string, string>} aliases - Legacy text values mapped to their numeric options.
 * @returns {string} The matching numeric option, or an empty string when there is no match.
 */
function normaliseFormOption(value, maxValue, aliases) {
    const normalisedValue = String(value ?? '').trim().toLocaleLowerCase('es');
    const numericMatch = normalisedValue.match(/^([1-4])(?:st|nd|rd|th|\u00ba|\u00b0)?(?:\s+(?:year|curso|semester|cuatrimestre))?$/i);
    if (numericMatch && Number(numericMatch[1]) <= maxValue) {
        return numericMatch[1];
    }
    return aliases[normalisedValue] || '';
}

/**
 * Renders the shared subject form with its current mode, action and selected options.
 * @param {import('express').Response} res - Express response object.
 * @param {Object} subject - Subject values to display in the form.
 * @param {boolean} isEdit - Whether the form is editing an existing subject.
 * @returns {*} The Express render response.
 */
function renderSubjectForm(res, subject = {}, isEdit = false) {
    const courseYear = normaliseFormOption(subject.courseYear, 4, {
        primero: '1', segundo: '2', tercero: '3', cuarto: '4'
    });
    const semester = normaliseFormOption(subject.semester, 2, {
        primero: '1', segundo: '2', 'primer cuatrimestre': '1', 'segundo cuatrimestre': '2'
    });
    const subjectForForm = { ...subject, courseYear, semester };
    const subjectId = subject._id?.toString();

    return res.render('subject-form', {
        pageTitle: isEdit ? 'Editar asignatura' : 'Nueva asignatura',
        formAction: isEdit ? `/subjects/${subjectId}/edit` : '/subjects/new',
        isEdit,
        subject: subjectForForm,
        isCourse1: courseYear === '1',
        isCourse2: courseYear === '2',
        isCourse3: courseYear === '3',
        isCourse4: courseYear === '4',
        isSemester1: semester === '1',
        isSemester2: semester === '2'
    });
}

/** Render the form used to create a subject. */
router.get(['/subject-form', '/subject-form.html'], (req, res) => {
    return renderSubjectForm(res);
});

/** Render the shared subject form with the existing values for editing. */
router.get('/subjects/:id/edit', requireSubject, (req, res) => {
    return renderSubjectForm(res, req.subject, true);
});


/**
 * Handles both creating and updating a subject.
 * Validates the submitted form data, saves the subject to the database,
 * and renders a success or error page based on the outcome.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
async function saveSubject(req, res, next) {
    const isEdit = Boolean(req.subject);
    const subjectId = req.params.id || null;
    const uploadedFilename = req.file?.filename;
    let saved = false;

    try {
        const { isValid, errors } = await validateSubject(req.body, req.file, {//we use the function validateSubject to check
            isEdit,
            subjectId
        });
        if (!isValid) {
            await deleteImage(uploadedFilename);
            return renderError(res, {
                pageTitle: isEdit ? 'Error al actualizar la asignatura' : 'Error al crear la asignatura',
                title: isEdit ? 'No se pudo actualizar la asignatura' : 'No se pudo crear la asignatura',
                messages: errors,
                buttonUrl: isEdit ? `/subjects/${subjectId}/edit` : '/subject-form',
                buttonText: 'Volver al formulario'
            }, 400);
        }

        const subjectFields = {
            name: req.body.name.trim(),
            description: req.body.description.trim(),
            courseYear: String(req.body.courseYear),
            semester: String(req.body.semester),
            //the 3 dots operator is used to conditionally add the image field only if a new image was uploaded
            ...(uploadedFilename ? { image: uploadedFilename } : {})
        };

        let savedSubjectId;
        if (isEdit) {
            const updatedSubject = await db.updateSubject(subjectId, subjectFields);
            if (!updatedSubject) {
                await deleteImage(uploadedFilename);
                return renderSubjectNotFound(res, `/subjects/${subjectId}/edit`, 'Volver al formulario');
            }
            saved = true;
            savedSubjectId = updatedSubject._id.toString();

            if (uploadedFilename && req.subject.image && req.subject.image !== uploadedFilename) {
                await deleteImage(req.subject.image);
            }
        } else {
            savedSubjectId = (await db.addSubject(subjectFields)).toString();
            saved = true;
        }

        return renderSuccess(res, {
            pageTitle: isEdit ? 'Asignatura actualizada' : 'Asignatura creada',
            title: isEdit ? 'Asignatura actualizada' : 'Asignatura creada',
            messages: [isEdit
                ? 'La asignatura se ha actualizado correctamente.'
                : 'La asignatura se ha creado correctamente.'],
            buttonUrl: `/subjects/${savedSubjectId}`,
            buttonText: 'Ver asignatura'
        });
    } catch (error) {
        if (!saved) {
            await deleteImage(uploadedFilename);
        }
        return next(error);
    }
}

// Save a new subject after validating all submitted fields on the server.
router.post('/subjects/new', uploadSingleImage('image', '/subject-form'), saveSubject);

// Save an edited subject through the same validation and response flow as creation. 
router.post(
    '/subjects/:id/edit',
    uploadSingleImage('image', (req) => `/subjects/${req.params.id}/edit`),
    requireSubject,
    saveSubject
);


/**
 * Normalises supported English and Spanish difficulty values.
 * @param {string} difficulty - The stored difficulty value.
 * @returns {'easy'|'medium'|'hard'|null} The canonical value, or null if unsupported.
 */
function normaliseDifficulty(difficulty) {
    const rawDifficulty = String(difficulty || '').trim().toLowerCase();

    if (['easy', 'fácil', 'facil'].includes(rawDifficulty)) return 'easy';
    if (['medium', 'intermedio', 'medio'].includes(rawDifficulty)) return 'medium';
    if (['hard', 'difícil', 'dificil'].includes(rawDifficulty)) return 'hard';

    return null;
}

/**
 * Formats a test entity with user-facing labels and badge styles.
 * @param {Object} test - The test document from MongoDB.
 * @param {string} subjectId - The parent subject's ID string.
 * @returns {Object} The formatted test object for rendering.
 */
function formatTest(test, subjectId) {
    const difficulty = normaliseDifficulty(test.difficulty);
    let difficultyLabel = test.difficulty || '';
    let difficultyBadgeClass = 'bg-secondary';

    if (difficulty === 'easy') {
        difficultyLabel = 'Fácil';
        difficultyBadgeClass = 'bg-success';
    } else if (difficulty === 'medium') {
        difficultyLabel = 'Intermedio';
        difficultyBadgeClass = 'bg-warning text-dark';
    } else if (difficulty === 'hard') {
        difficultyLabel = 'Difícil';
        difficultyBadgeClass = 'bg-danger';
    }

    return {
        ...test,
        _id: test._id.toString(),
        subjectId,
        difficultyLabel,
        difficultyBadgeClass,
        durationText: test.duration != null ? `${test.duration} min` : ''
    };
}

/**
 * GET /subjects/:id
 * Renders the detail page for a specific subject by its ID.
 * If the subject is not found, renders an error page with a 404 status.
 */
router.get('/subjects/:id', requireSubject, async (req, res, next) => {
    try {
        const rawTests = await db.getTestsBySubjectId(req.subject._id);
        const tests = (rawTests || []).map((test) => formatTest(test, req.subject._id.toString()));
        res.render('detail', {
            pageTitle: req.subject.name,
            subject: req.subject,
            tests,
            hasTests: tests.length > 0,
            isMedium: true
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /subjects/:id/tests/:testId/edit
 * Displays the edit form for a test pre-filled with its current values.
 * Verifies that both the subject and test exist, and that the test belongs to this subject.
 */
router.get('/subjects/:id/tests/:testId/edit', requireSubject, requireTest, (req, res) => {
    const difficulty = normaliseDifficulty(req.test.difficulty);
    return res.render('test-form', {
        pageTitle: 'Editar simulacro',
        subject: req.subject,
        test: req.test,
        isEasy: difficulty === 'easy',
        isMedium: difficulty === 'medium',
        isHard: difficulty === 'hard'
    });
});

/**
 * with this function we handle both creating and updating a test, 
 * validating the submitted form data, saving the test to the database, 
 * and rendering a success or error page based on the outcome.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 * @returns 
 */
async function saveTest(req, res, next) {
    const isEdit = Boolean(req.test);
    const subjectId = req.params.id;

    try {
        const testData = {
            title: req.body.title,
            description: req.body.description,
            difficulty: req.body.difficulty,
            duration: req.body.duration
        };

        const { isValid, errors } = await validateTest(testData, req.subjectId, {
            isEdit,
            testId: req.testId || null
        });

        if (!isValid) {
            return renderError(res, {
                pageTitle: isEdit ? 'Error al actualizar el simulacro' : 'Error al crear el simulacro',
                title: isEdit ? 'No se pudo actualizar el simulacro' : 'No se pudo crear el simulacro',
                messages: errors,
                buttonUrl: isEdit ? `/subjects/${subjectId}/tests/${req.params.testId}/edit` : `/subjects/${subjectId}`,
                buttonText: isEdit ? 'Volver a la edición' : 'Volver a la asignatura'
            }, 400);
        }

        if (isEdit) {
            const updatedTest = await db.updateTest(req.testId, testData);
            if (!updatedTest) {
                return renderTestNotFound(res, subjectId);
            }
        } else {
            await db.addTest(req.subjectId, testData);
        }

        return renderSuccess(res, {
            pageTitle: isEdit ? 'Simulacro actualizado' : 'Simulacro creado',
            title: isEdit ? 'Simulacro actualizado' : 'Simulacro creado',
            messages: [isEdit
                ? 'El simulacro se ha actualizado correctamente.'
                : 'El simulacro se ha añadido correctamente a la asignatura.'],
            buttonUrl: `/subjects/${subjectId}`,
            buttonText: 'Volver a la asignatura'
        });
    } catch (error) {
        return next(error);
    }
}

/**
 * POST /subjects/:id/tests/new
 * Creates a new test linked to the specified subject using the shared save flow.
 */
router.post('/subjects/:id/tests/new', requireSubject, saveTest);


/**
 * POST /subjects/:id/tests/:testId/edit
 * Updates an existing test linked to the subject using the shared save flow.
 */
router.post('/subjects/:id/tests/:testId/edit', requireSubject, requireTest, saveTest);


/**
 * POST /subjects/:id/tests/:testId/delete
 * Deletes a test from the database after verifying that both the parent subject
 * and the test exist and that the test belongs to this subject.
 */
router.post('/subjects/:id/tests/:testId/delete', requireSubject, requireTest, async (req, res, next) => {
    try {
        const deleted = await db.deleteTest(req.testId);
        if (!deleted) {
            return renderTestNotFound(res, req.params.id);
        }

        return renderSuccess(res, {
            pageTitle: 'Simulacro eliminado',
            title: 'Simulacro eliminado',
            messages: ['El simulacro se ha eliminado correctamente.'],
            buttonUrl: `/subjects/${req.params.id}`,
            buttonText: 'Volver a la asignatura'
        });
    } catch (error) {
        return next(error);
    }
});

/**
 * POST /subjects/:id/delete
 * Deletes the subject, its separately stored tests, and its uploaded image.
 * Returns a 404 message page when the subject ID is invalid or no subject exists.
 */
router.post('/subjects/:id/delete', requireSubject, async (req, res, next) => {
    try {
        const deletedSubject = await db.deleteSubject(req.subjectId);
        if (!deletedSubject) {
            return renderSubjectNotFound(res);
        }

        await db.deleteTestsBySubjectId(req.subjectId);
        await deleteImage(deletedSubject.image);

        return renderSuccess(res, {
            pageTitle: 'Asignatura eliminada',
            title: 'Asignatura eliminada',
            messages: ['La asignatura se ha eliminado correctamente.'],
            buttonUrl: '/',
            buttonText: 'Ir a la página principal'
        });
    } catch (error) {
        return next(error);
    }
});
export default router;
