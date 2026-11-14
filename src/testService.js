import { ObjectId } from 'mongodb';
import * as db from './database.js';

/**
 * Adds a new test linked to a parent subject in the tests collection.
 * 
 * @param {string|ObjectId} subjectId - Parent subject identifier.
 * @param {Object} test - Test data containing title, description, difficulty, duration.
 * @returns {Promise<ObjectId>} The generated test ObjectId.
 */
export async function addTest(subjectId, test) {
    if (!ObjectId.isValid(subjectId)) {
        throw new Error('Invalid subjectId');
    }

    return await db.addTest({
        title: test.title.trim(),
        description: test.description.trim(),
        difficulty: test.difficulty.trim().toLowerCase(),
        duration: parseInt(test.duration, 10),
        asignaturaId: new ObjectId(subjectId)
    });
}

/**
 * Retrieves a single test by its ID from the tests collection.
 * 
 * @param {string|ObjectId} testId - Test identifier.
 * @returns {Promise<Object|undefined>} The found test document or undefined.
 */
export async function getTest(testId) {
    if (!ObjectId.isValid(testId)) {
        return undefined;
    }
    return await db.getTest(testId);
}

/**
 * Updates an existing test in the tests collection.
 * 
 * @param {string|ObjectId} testId - Test identifier.
 * @param {Object} data - Updated test fields.
 * @returns {Promise<Object|null>} The updated test document or null.
 */
export async function updateTest(testId, data) {
    if (!ObjectId.isValid(testId)) {
        return null;
    }

    return await db.updateTest(testId, {
        title: data.title.trim(),
        description: data.description.trim(),
        difficulty: data.difficulty.trim().toLowerCase(),
        duration: parseInt(data.duration, 10)
    });
}

/**
 * Deletes an existing test by its ID from the tests collection.
 * 
 * @param {string|ObjectId} testId - Test identifier.
 * @returns {Promise<boolean>} True if the test was deleted.
 */
export async function deleteTest(testId) {
    if (!ObjectId.isValid(testId)) {
        return false;
    }
    const result = await db.deleteTest(testId);
    return Boolean(result);
}
