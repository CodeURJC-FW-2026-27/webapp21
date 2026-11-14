import { ObjectId } from 'mongodb';
import { getAsignaturaByName, asignaturas, tests } from './database.js';

/**
 * Validates the fields of a subject (asignatura) for both creation and editing operations.
 * Enforces mandatory title starting with uppercase, case-insensitive uniqueness in MongoDB,
 * description length between 20 and 1000 characters, valid course year (1-4), semester (1-2),
 * and mandatory image on create.
 *
 * @param {Object} data - Form data submitted in the request body.
 * @param {string} data.name - Name/title of the subject.
 * @param {string} data.description - Comprehensive overview (20 to 1000 characters).
 * @param {string|number} data.courseYear - Academic year (1, 2, 3, or 4).
 * @param {string|number} data.semester - Academic term/semester (1 or 2).
 * @param {Object} [file] - Uploaded file object from Multer (req.file).
 * @param {Object} [options={}] - Additional validation configuration.
 * @param {boolean} [options.isEdit=false] - Whether this validation is for an existing subject update.
 * @param {string|import('mongodb').ObjectId} [options.subjectId=null] - Subject ID to exclude from uniqueness check during edits.
 * @returns {Promise<{ isValid: boolean, errors: string[] }>} Validation result containing status flag and error list.
 */
export async function validateSubject(data = {}, file = null, { isEdit = false, subjectId = null } = {}) {
    const errors = [];

    const name = typeof data.name === 'string' ? data.name.trim() : '';
    const description = typeof data.description === 'string' ? data.description.trim() : '';
    const courseYear = data.courseYear !== undefined && data.courseYear !== null ? String(data.courseYear).trim() : '';
    const semester = data.semester !== undefined && data.semester !== null ? String(data.semester).trim() : '';

    // 1. Name is mandatory and must start with an uppercase letter (/^\p{Lu}/u)
    if (!name) {
        errors.push('El nombre de la asignatura es obligatorio.');
    } else if (!/^\p{Lu}/u.test(name)) {
        errors.push('El nombre de la asignatura debe comenzar con una letra mayúscula.');
    } else {
        // 2. Name uniqueness check in MongoDB with case-insensitive collation
        const existingSubject = await getAsignaturaByName(name, isEdit ? subjectId : null);
        if (existingSubject) {
            errors.push('Ya existe una asignatura con ese nombre.');
        }
    }

    // 3. Description must be between 20 and 1000 characters
    if (!description) {
        errors.push('La descripción de la asignatura es obligatoria.');
    } else if (description.length < 20 || description.length > 1000) {
        errors.push('La descripción debe tener entre 20 y 1000 caracteres.');
    }

    // 4. Course year must be 1, 2, 3 or 4
    const validCourseYears = ['1', '2', '3', '4'];
    if (!validCourseYears.includes(courseYear)) {
        errors.push('El curso académico debe ser 1, 2, 3 o 4.');
    }

    // 5. Semester must be 1 or 2
    const validSemesters = ['1', '2'];
    if (!validSemesters.includes(semester)) {
        errors.push('El cuatrimestre debe ser 1 o 2.');
    }

    // 6. Image is mandatory on creation
    if (!isEdit && !file) {
        errors.push('La imagen de portada es obligatoria.');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Validates the fields of a test (simulacro) linked to a parent subject.
 * Enforces mandatory title, uniqueness within the subject via case-insensitive collation,
 * description length min 10 characters, max 500 characters, valid difficulty (easy, medium, hard),
 * and integer duration between 15 and 240 minutes.
 * 
 * @param {Object} data - Submitted test form data.
 * @param {string} data.title - Title of the practice exam.
 * @param {string} data.description - Overview of the test (10-500 chars).
 * @param {string} data.difficulty - Difficulty level ('easy', 'medium', 'hard').
 * @param {string|number} data.duration - Duration in minutes (15-240).
 * @param {string|ObjectId} subjectId - Parent subject ID to check uniqueness within.
 * @param {Object} [options={}] - Additional validation options.
 * @param {boolean} [options.isEdit=false] - Whether validating an existing test edit.
 * @param {string|ObjectId} [options.testId=null] - Test ID to exclude from uniqueness check during edits.
 * @returns {Promise<{ isValid: boolean, errors: string[] }>} Validation result.
 */
export async function validateTest(data = {}, subjectId, { isEdit = false, testId = null } = {}) {
    const errors = [];

    const title = typeof data.title === 'string' ? data.title.trim() : '';
    const description = typeof data.description === 'string' ? data.description.trim() : '';
    const difficulty = typeof data.difficulty === 'string' ? data.difficulty.trim().toLowerCase() : '';
    const rawDuration = data.duration;

    // 1. Title is mandatory
    if (!title) {
        errors.push('El título del simulacro es obligatorio.');
    } else if (ObjectId.isValid(subjectId)) {
        // 2. Title uniqueness within the subject using case-insensitive collation
        const subjectObjectId = new ObjectId(subjectId);
        const testObjectId = (isEdit && testId && ObjectId.isValid(testId)) ? new ObjectId(testId) : null;

        // Query subject's embedded tests excluding current test if editing
        const subjectQuery = {
            _id: subjectObjectId,
            ...(testObjectId ? {
                tests: {
                    $elemMatch: {
                        title: title,
                        _id: { $ne: testObjectId }
                    }
                }
            } : {
                'tests.title': title
            })
        };
        const existingInSubject = await asignaturas.findOne(subjectQuery, {
            collation: { locale: 'es', strength: 2 }
        });

        // Also check secondary tests collection excluding current test if editing
        const testsQuery = {
            asignaturaId: subjectObjectId,
            title: title,
            ...(testObjectId ? { _id: { $ne: testObjectId } } : {})
        };
        const existingInTests = await tests.findOne(testsQuery, {
            collation: { locale: 'es', strength: 2 }
        });

        if (existingInSubject || existingInTests) {
            errors.push('Ya existe un simulacro con ese título en esta asignatura.');
        }
    }

    // 3. Description between 10 and 500 characters
    if (!description) {
        errors.push('La descripción del simulacro es obligatoria.');
    } else if (description.length < 10 || description.length > 500) {
        errors.push('La descripción debe tener entre 10 y 500 caracteres.');
    }

    // 4. Difficulty must be easy, medium or hard
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(difficulty)) {
        errors.push('La dificultad debe ser Fácil, Intermedio o Difícil.');
    }

    // 5. Duration must be an integer between 15 and 240
    const durationNum = Number(rawDuration);
    if (
        rawDuration === undefined ||
        rawDuration === null ||
        rawDuration === '' ||
        !Number.isInteger(durationNum) ||
        durationNum < 15 ||
        durationNum > 240
    ) {
        errors.push('La duración debe ser un número entero entre 15 y 240 minutos.');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

