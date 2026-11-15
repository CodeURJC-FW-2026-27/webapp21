import express from 'express';
import { ObjectId } from 'mongodb';
import * as db from './database.js';
import { parseObjectId } from './database.js';
import { renderSuccess, renderError } from './routers/renderHelpers.js';
import { uploadSingleImage, deleteImage } from './imageStorage.js';
import { validateSubject, validateTest } from './validation.js';
import * as testService from './testService.js';

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
        const { page = 1, course = '', search = '' } = req.query;
        const cleanSearch = typeof search === 'string' ? search.trim() : '';
        const cleanCourse = typeof course === 'string' ? course.trim() : '';

        const { items, totalItems, totalPages, currentPage } = await db.getAsignaturas({
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
router.get('/subjects/:id/edit', async (req, res, next) => {
    try {
        const parsedId = parseObjectId(req.params.id);
        if (!parsedId) {
            return renderError(res, {
                pageTitle: 'Asignatura no encontrada',
                title: 'No se encontró la asignatura',
                messages: ['La asignatura que intentas editar no existe.'],
                buttonUrl: '/',
                buttonText: 'Volver al inicio'
            }, 404);
        }
        const subject = await db.getAsignatura(parsedId);
        if (!subject) {
            return renderError(res, {
                pageTitle: 'Asignatura no encontrada',
                title: 'No se encontró la asignatura',
                messages: ['La asignatura que intentas editar no existe.'],
                buttonUrl: '/',
                buttonText: 'Volver al inicio'
            }, 404);
        }
        return renderSubjectForm(res, subject, true);
    } catch (error) {
        return next(error);
    }
});

/**
 * Validates and saves a new or existing subject using the shared create/edit flow.
 * @param {import('express').Request} req - Express request containing the form and optional image.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express error continuation function.
 * @param {string|null} subjectId - Existing subject ID for edit, or null for create.
 * @returns {Promise<*>} The rendered success/error response or the next Express error handler.
 */
async function saveSubject(req, res, next, subjectId = null) {
    const isEdit = subjectId !== null;
    const uploadedFilename = req.file?.filename;
    let existingSubject = null;
    let saved = false;

    try {
        if (isEdit) {
            const parsedSubjectId = parseObjectId(subjectId);
            if (!parsedSubjectId) {
                await deleteImage(uploadedFilename);
                return renderError(res, {
                    pageTitle: 'Asignatura no encontrada',
                    title: 'No se encontró la asignatura',
                    messages: ['La asignatura que intentas editar no existe.'],
                    buttonUrl: '/',
                    buttonText: 'Volver al inicio'
                }, 404);
            }
            existingSubject = await db.getAsignatura(parsedSubjectId);
            if (!existingSubject) {
                await deleteImage(uploadedFilename);
                return renderError(res, {
                    pageTitle: 'Asignatura no encontrada',
                    title: 'No se encontró la asignatura',
                    messages: ['La asignatura que intentas editar no existe.'],
                    buttonUrl: `/subjects/${subjectId}/edit`,
                    buttonText: 'Volver al formulario'
                }, 404);
            }
        }

        const { isValid, errors } = await validateSubject(req.body, req.file, {
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
            semester: String(req.body.semester)
        };

        let savedSubjectId;
        if (isEdit) {
            if (uploadedFilename) {
                subjectFields.image = uploadedFilename;
            }
            const updatedSubject = await db.updateAsignatura(subjectId, subjectFields);
            if (!updatedSubject) {
                await deleteImage(uploadedFilename);
                return renderError(res, {
                    pageTitle: 'Asignatura no encontrada',
                    title: 'No se encontró la asignatura',
                    messages: ['La asignatura que intentas editar ya no existe.'],
                    buttonUrl: `/subjects/${subjectId}/edit`,
                    buttonText: 'Volver al formulario'
                }, 404);
            }
            saved = true;
            savedSubjectId = updatedSubject._id.toString();

            if (uploadedFilename && existingSubject.image && existingSubject.image !== uploadedFilename) {
                await deleteImage(existingSubject.image);
            }
        } else {
            const newSubject = {
                ...subjectFields,
                image: uploadedFilename,
                tests: []
            };
            savedSubjectId = (await db.addAsignatura(newSubject)).toString();
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

/** Save a new subject after validating all submitted fields on the server. */
router.post('/subjects/new', uploadSingleImage('image', '/subject-form'), (req, res, next) => {
    return saveSubject(req, res, next);
});

/** Save an edited subject through the same validation and response flow as creation. */
router.post('/subjects/:id/edit', uploadSingleImage('image', (req) => `/subjects/${req.params.id}/edit`), (req, res, next) => {
    return saveSubject(req, res, next, req.params.id);
});


/**
 * Formats a test entity with user-facing labels and badge styles.
 * @param {Object} test - The test document from MongoDB.
 * @param {string} subjectId - The parent subject's ID string.
 * @returns {Object} The formatted test object for rendering.
 */
function formatTest(test, subjectId) {
    const rawDifficulty = String(test.difficulty || '').trim().toLowerCase();
    let difficultyLabel = test.difficulty || '';
    let difficultyBadgeClass = 'bg-secondary';

    if (rawDifficulty === 'easy' || rawDifficulty === 'fácil' || rawDifficulty === 'facil') {
        difficultyLabel = 'Fácil';
        difficultyBadgeClass = 'bg-success';
    } else if (rawDifficulty === 'medium' || rawDifficulty === 'intermedio' || rawDifficulty === 'medio') {
        difficultyLabel = 'Intermedio';
        difficultyBadgeClass = 'bg-warning text-dark';
    } else if (rawDifficulty === 'hard' || rawDifficulty === 'difícil' || rawDifficulty === 'dificil') {
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
router.get('/subjects/:id', async (req, res, next) => {
    try {
        const parsedSubjectId = parseObjectId(req.params.id);
        if (!parsedSubjectId) {
            return renderError(res, {
                pageTitle: 'Asignatura no encontrada',
                title: 'Asignatura no encontrada',
                messages: ['No se ha encontrado la asignatura solicitada.'],
                buttonUrl: '/',
                buttonText: 'Volver al inicio'
            }, 404);
        }

        const subject = await db.getAsignatura(parsedSubjectId);
        if (!subject) {
            return renderError(res, {
                pageTitle: 'Asignatura no encontrada',
                title: 'Asignatura no encontrada',
                messages: ['No se ha encontrado la asignatura solicitada.'],
                buttonUrl: '/',
                buttonText: 'Volver al inicio'
            }, 404);
        }
        const rawTests = await db.getTestsByAsignaturaId(subject._id); // fetch tests belonging to this subject
        const tests = (rawTests || []).map((test) => formatTest(test, subject._id.toString()));
        res.render('detail', {
            pageTitle: subject.name,
            subject,
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
 * Renders the test form filled with current test values for editing.
 */
router.get('/subjects/:id/tests/:testId/edit', async (req, res, next) => {
    try {
        const { id: subjectId, testId } = req.params;
        const parsedSubjectId = parseObjectId(subjectId);
        const parsedTestId = parseObjectId(testId);

        if (!parsedSubjectId) {
            return renderError(res, {
                pageTitle: 'Asignatura no encontrada',
                title: 'No se encontró la asignatura',
                messages: ['La asignatura especificada no existe.'],
                buttonUrl: '/',
                buttonText: 'Volver al inicio'
            }, 404);
        }

        if (!parsedTestId) {
            return renderError(res, {
                pageTitle: 'Simulacro no encontrado',
                title: 'No se encontró el simulacro',
                messages: ['El simulacro que intentas editar no existe.'],
                buttonUrl: `/subjects/${subjectId}`,
                buttonText: 'Volver a la asignatura'
            }, 404);
        }

        const subject = await db.getAsignatura(parsedSubjectId);
        if (!subject) {
            return renderError(res, {
                pageTitle: 'Asignatura no encontrada',
                title: 'No se encontró la asignatura',
                messages: ['La asignatura especificada no existe.'],
                buttonUrl: '/',
                buttonText: 'Volver al inicio'
            }, 404);
        }

        const test = await testService.getTest(parsedTestId);
        if (!test || test.asignaturaId.toString() !== subject._id.toString()) {
            return renderError(res, {
                pageTitle: 'Simulacro no encontrado',
                title: 'No se encontró el simulacro',
                messages: ['El simulacro que intentas editar no existe.'],
                buttonUrl: `/subjects/${subjectId}`,
                buttonText: 'Volver a la asignatura'
            }, 404);
        }

        const rawDifficulty = String(test.difficulty || '').trim().toLowerCase();
        return res.render('test-form', {
            pageTitle: 'Editar simulacro',
            subject,
            test,
            isEasy: rawDifficulty === 'easy' || rawDifficulty === 'facil' || rawDifficulty === 'fácil',
            isMedium: rawDifficulty === 'medium' || rawDifficulty === 'intermedio' || rawDifficulty === 'medio',
            isHard: rawDifficulty === 'hard' || rawDifficulty === 'dificil' || rawDifficulty === 'difícil'
        });
    } catch (error) {
        return next(error);
    }
});

/**
 * Validates and saves a new or existing test using the shared create/edit flow.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next handler.
 * @param {string|null} testId - Existing test ID for edit, or null for create.
 */
async function saveTest(req, res, next, testId = null) {
    const isEdit = testId !== null;
    const subjectId = req.params.id;
    const parsedSubjectId = parseObjectId(subjectId);

    try {
        if (!parsedSubjectId) {
            return renderError(res, {
                pageTitle: 'Asignatura no encontrada',
                title: 'No se encontró la asignatura',
                messages: ['La asignatura especificada no existe.'],
                buttonUrl: '/',
                buttonText: 'Volver al inicio'
            }, 404);
        }

        const subject = await db.getAsignatura(parsedSubjectId);
        if (!subject) {
            return renderError(res, {
                pageTitle: 'Asignatura no encontrada',
                title: 'No se encontró la asignatura',
                messages: ['La asignatura especificada no existe.'],
                buttonUrl: '/',
                buttonText: 'Volver al inicio'
            }, 404);
        }

        let parsedTestId = null;
        if (isEdit) {
            parsedTestId = parseObjectId(testId);
            if (!parsedTestId) {
                return renderError(res, {
                    pageTitle: 'Simulacro no encontrado',
                    title: 'No se encontró el simulacro',
                    messages: ['El simulacro que intentas editar no existe.'],
                    buttonUrl: `/subjects/${subjectId}`,
                    buttonText: 'Volver a la asignatura'
                }, 404);
            }

            const existingTest = await testService.getTest(parsedTestId);
            if (!existingTest || existingTest.asignaturaId.toString() !== subject._id.toString()) {
                return renderError(res, {
                    pageTitle: 'Simulacro no encontrado',
                    title: 'No se encontró el simulacro',
                    messages: ['El simulacro que intentas editar no existe.'],
                    buttonUrl: `/subjects/${subjectId}`,
                    buttonText: 'Volver a la asignatura'
                }, 404);
            }
        }

        const { isValid, errors } = await validateTest(req.body, parsedSubjectId, {
            isEdit,
            testId: parsedTestId
        });

        if (!isValid) {
            return renderError(res, {
                pageTitle: isEdit ? 'Error al actualizar el simulacro' : 'Error al crear el simulacro',
                title: isEdit ? 'No se pudo actualizar el simulacro' : 'No se pudo crear el simulacro',
                messages: errors,
                buttonUrl: isEdit ? `/subjects/${subjectId}/tests/${testId}/edit` : `/subjects/${subjectId}`,
                buttonText: isEdit ? 'Volver a la edición' : 'Volver a la asignatura'
            }, 400);
        }

        if (isEdit) {
            await testService.updateTest(parsedTestId, req.body);
        } else {
            await testService.addTest(parsedSubjectId, req.body);
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
router.post('/subjects/:id/tests/new', (req, res, next) => {
    return saveTest(req, res, next);
});

/**
 * POST /subjects/:id/tests/:testId/edit
 * Updates an existing test linked to the subject using the shared save flow.
 */
router.post('/subjects/:id/tests/:testId/edit', (req, res, next) => {
    return saveTest(req, res, next, req.params.testId);
});

/**
 * POST /subjects/:id/tests/:testId/delete
 * Deletes a test from the tests collection.
 * Returns an error page if IDs are invalid or test does not exist.
 */
router.post('/subjects/:id/tests/:testId/delete', async (req, res, next) => {
    try {
        const { id: subjectId, testId } = req.params;
        const parsedSubjectId = parseObjectId(subjectId);
        const parsedTestId = parseObjectId(testId);

        if (!parsedSubjectId) {
            return renderError(res, {
                pageTitle: 'Asignatura no encontrada',
                title: 'No se encontró la asignatura',
                messages: ['La asignatura especificada no existe.'],
                buttonUrl: '/',
                buttonText: 'Volver al inicio'
            }, 404);
        }

        if (!parsedTestId) {
            return renderError(res, {
                pageTitle: 'Simulacro no encontrado',
                title: 'No se pudo eliminar el simulacro',
                messages: ['El identificador del simulacro no es válido o no existe.'],
                buttonUrl: `/subjects/${subjectId}`,
                buttonText: 'Volver a la asignatura'
            }, 404);
        }

        const subject = await db.getAsignatura(parsedSubjectId);
        if (!subject) {
            return renderError(res, {
                pageTitle: 'Asignatura no encontrada',
                title: 'No se encontró la asignatura',
                messages: ['La asignatura especificada no existe.'],
                buttonUrl: '/',
                buttonText: 'Volver al inicio'
            }, 404);
        }

        const existingTest = await testService.getTest(parsedTestId);
        if (!existingTest || existingTest.asignaturaId.toString() !== subject._id.toString()) {
            return renderError(res, {
                pageTitle: 'Simulacro no encontrado',
                title: 'No se pudo eliminar el simulacro',
                messages: ['El simulacro que intentas eliminar no existe o ya ha sido eliminado.'],
                buttonUrl: `/subjects/${subjectId}`,
                buttonText: 'Volver a la asignatura'
            }, 404);
        }

        const deleted = await testService.deleteTest(parsedTestId);
        if (!deleted) {
            return renderError(res, {
                pageTitle: 'Simulacro no encontrado',
                title: 'No se pudo eliminar el simulacro',
                messages: ['El simulacro que intentas eliminar no existe o ya ha sido eliminado.'],
                buttonUrl: `/subjects/${subjectId}`,
                buttonText: 'Volver a la asignatura'
            }, 404);
        }

        return renderSuccess(res, {
            pageTitle: 'Simulacro eliminado',
            title: 'Simulacro eliminado',
            messages: ['El simulacro se ha eliminado correctamente.'],
            buttonUrl: `/subjects/${subjectId}`,
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
router.post('/subjects/:id/delete', async (req, res, next) => {
    try {
        const parsedSubjectId = parseObjectId(req.params.id);
        if (!parsedSubjectId) {
            return renderError(res, {
                pageTitle: 'Asignatura no encontrada',
                title: 'No se encontró la asignatura',
                messages: ['La asignatura que intentas eliminar no existe.'],
                buttonUrl: '/',
                buttonText: 'Volver al inicio'
            }, 404);
        }

        const subject = await db.getAsignatura(parsedSubjectId);
        if (!subject) {
            return renderError(res, {
                pageTitle: 'Asignatura no encontrada',
                title: 'No se encontró la asignatura',
                messages: ['La asignatura que intentas eliminar no existe.'],
                buttonUrl: '/',
                buttonText: 'Volver al inicio'
            }, 404);
        }

        const deletedSubject = await db.deleteAsignatura(parsedSubjectId);
        if (!deletedSubject) {
            return renderError(res, {
                pageTitle: 'Asignatura no encontrada',
                title: 'No se encontró la asignatura',
                messages: ['La asignatura que intentas eliminar ya no existe.'],
                buttonUrl: '/',
                buttonText: 'Volver al inicio'
            }, 404);
        }

        await db.deleteTestsByAsignaturaId(parsedSubjectId);
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
