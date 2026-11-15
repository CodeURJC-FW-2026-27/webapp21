import { ObjectId } from 'mongodb';
import { getAsignaturaByName, tests } from './database.js';

/**
 * Validates the form fields for a subject on both create and edit.
 * Ensures the name starts with an uppercase letter and is unique in MongoDB,
 * description is between 20 and 1000 characters, course year is 1-4, semester is 1-2,
 * and a cover image is uploaded when creating.
 * 
 * @param {Object} data - Submitted form fields (name, description, courseYear, semester).
 * @param {Object} [file=null] - Uploaded image file from Multer (req.file).
 * @param {Object} [options={}] - Extra validation options.
 * @param {boolean} [options.isEdit=false] - True if editing an existing subject.
 * @param {string|ObjectId} [options.subjectId=null] - Subject ID to exclude from duplicate check during edits.
 * @returns {Promise<{ isValid: boolean, errors: string[] }>} Validation result with status and error messages.
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
 * Validates the form fields for a test linked to a parent subject.
 * Ensures the title is required (3-100 characters) and unique within the subject,
 * description is between 10 and 500 characters, difficulty is easy/medium/hard,
 * and duration is an integer between 15 and 240 minutes.
 * 
 * @param {Object} data - Submitted form data (title, description, difficulty, duration).
 * @param {string|ObjectId} subjectId - Parent subject ID to check title uniqueness within.
 * @param {Object} [options={}] - Extra validation options.
 * @param {boolean} [options.isEdit=false] - True if editing an existing test.
 * @param {string|ObjectId} [options.testId=null] - Test ID to exclude from duplicate check during edits.
 * @returns {Promise<{ isValid: boolean, errors: string[] }>} Validation result with status and error messages.
 */
export async function validateTest(data = {}, subjectId, { isEdit = false, testId = null } = {}) {
    const errors = [];

    const title = typeof data.title === 'string' ? data.title.trim() : '';
    const description = typeof data.description === 'string' ? data.description.trim() : '';
    const difficulty = typeof data.difficulty === 'string' ? data.difficulty.trim().toLowerCase() : '';
    const rawDuration = data.duration;

    // 1. Title is mandatory and length between 3 and 100 characters
    if (!title) {
        errors.push('El título del simulacro es obligatorio.');
    } else if (title.length < 3 || title.length > 100) {
        errors.push('El título del simulacro debe tener entre 3 y 100 caracteres.');
    } else if (ObjectId.isValid(subjectId)) {
        // 2. Title uniqueness within the subject using case-insensitive collation
        const subjectObjectId = new ObjectId(subjectId);
        const testObjectId = (isEdit && testId && ObjectId.isValid(testId)) ? new ObjectId(testId) : null;

        const testsQuery = {
            asignaturaId: subjectObjectId,
            title: title,
            ...(testObjectId ? { _id: { $ne: testObjectId } } : {})
        };
        const existingInTests = await tests.findOne(testsQuery, {
            collation: { locale: 'es', strength: 2 }
        });

        if (existingInTests) {
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

