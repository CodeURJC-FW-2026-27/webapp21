import { ObjectId } from 'mongodb';
import { asignaturas, tests } from './database.js';

/**
 * Adds a new test to a parent subject using $push with a new ObjectId.
 * Also keeps the secondary tests collection synchronized for backwards compatibility.
 * 
 * @param {string|ObjectId} subjectId - Parent subject identifier.
 * @param {Object} test - Test data containing title, description, difficulty, duration.
 * @returns {Promise<ObjectId>} The generated test ObjectId.
 */
export async function addTest(subjectId, test) {
    if (!ObjectId.isValid(subjectId)) {
        throw new Error('Invalid subjectId');
    }

    const subjectObjectId = new ObjectId(subjectId);
    const testId = new ObjectId();
    const testDocument = {
        _id: testId,
        title: test.title.trim(),
        description: test.description.trim(),
        difficulty: test.difficulty.trim().toLowerCase(),
        duration: parseInt(test.duration, 10)
    };

    // Push into subject's embedded tests array
    await asignaturas.updateOne(
        { _id: subjectObjectId },
        { $push: { tests: testDocument } }
    );

    // Synchronize secondary tests collection
    await tests.insertOne({
        ...testDocument,
        asignaturaId: subjectObjectId
    });

    return testId;
}
