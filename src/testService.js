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

/**
 * Retrieves a single test by its ID and parent subject ID.
 * Looks both inside the subject's embedded tests and the tests collection.
 * 
 * @param {string|ObjectId} subjectId - Parent subject identifier.
 * @param {string|ObjectId} testId - Test identifier.
 * @returns {Promise<Object|null>} Found test object or null.
 */
export async function getTest(subjectId, testId) {
    if (!ObjectId.isValid(subjectId) || !ObjectId.isValid(testId)) {
        return null;
    }

    const subjectObjectId = new ObjectId(subjectId);
    const testObjectId = new ObjectId(testId);

    // Look inside subject's embedded tests array
    const subject = await asignaturas.findOne(
        { _id: subjectObjectId, 'tests._id': testObjectId },
        { projection: { 'tests.$': 1 } }
    );
    if (subject && subject.tests && subject.tests.length > 0) {
        return subject.tests[0];
    }

    // Fallback: look in tests collection
    return await tests.findOne({ _id: testObjectId, asignaturaId: subjectObjectId });
}

/**
 * Updates an existing test within a subject using positional operator ($).
 * Also synchronizes the secondary tests collection.
 * 
 * @param {string|ObjectId} subjectId - Parent subject identifier.
 * @param {string|ObjectId} testId - Test identifier.
 * @param {Object} data - Updated test fields (title, description, difficulty, duration).
 * @returns {Promise<boolean>} True if updated successfully.
 */
export async function updateTest(subjectId, testId, data) {
    if (!ObjectId.isValid(subjectId) || !ObjectId.isValid(testId)) {
        return false;
    }

    const subjectObjectId = new ObjectId(subjectId);
    const testObjectId = new ObjectId(testId);

    const updatedFields = {
        'tests.$.title': data.title.trim(),
        'tests.$.description': data.description.trim(),
        'tests.$.difficulty': data.difficulty.trim().toLowerCase(),
        'tests.$.duration': parseInt(data.duration, 10)
    };

    // Update inside subject's embedded array as specified
    const result = await asignaturas.updateOne(
        { _id: subjectObjectId, 'tests._id': testObjectId },
        { $set: updatedFields }
    );

    // Also synchronize tests collection for backwards compatibility
    await tests.updateOne(
        { _id: testObjectId },
        {
            $set: {
                title: data.title.trim(),
                description: data.description.trim(),
                difficulty: data.difficulty.trim().toLowerCase(),
                duration: parseInt(data.duration, 10)
            }
        }
    );

    return result.matchedCount > 0 || result.modifiedCount > 0;
}

