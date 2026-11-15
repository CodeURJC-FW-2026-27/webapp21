import { MongoClient, ObjectId } from "mongodb";

const URL = "mongodb://localhost:27017";
const DBName = "DBWebApp21";

export const PAGE_SIZE = 6; // Number of items per page for pagination

const client = new MongoClient(URL);

await client.connect(); // Asynchronous connection to MongoDB
console.log("Connected to MongoDB");

const data = client.db(DBName);
export const subjects = data.collection("subjects"); // Primary entity collection
export const tests = data.collection("tests"); // Secondary entity collection

/**
 * Escapes special regex characters in a search string.
 * This ensures characters like '(', '*', or '+' are treated as normal text
 * and do not cause syntax errors in MongoDB regex queries.
 *
 * @param {string} text - The search text typed by the user.
 * @returns {string} The safe string with escaped regex characters.
 */
export function escapeRegex(text) {
    if (!text || typeof text !== "string") return "";
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Safely converts a string to a MongoDB ObjectId.
 * If the provided ID is invalid or malformed, it returns null instead of throwing
 * an error, protecting our routes from crashing on invalid URLs.
 *
 * @param {string|ObjectId|null|undefined} id - The ID string to parse.
 * @returns {ObjectId|null} A valid ObjectId, or null if invalid.
 */
export function parseObjectId(id) {
    if (!id) return null;
    if (id instanceof ObjectId) return id;
    if (typeof id !== "string") return null;
    if (!ObjectId.isValid(id)) return null;
    try {
        const parsed = new ObjectId(id);
        if (parsed.toString() === id) {
            return parsed;
        }
        return null;
    } catch {
        return null;
    }
}

// ===================================================
// SUBJECTS DATABASE OPERATIONS (PRIMARY ENTITY)
// ===================================================

/**
 * Get a list of subjects with optional filtering and pagination.
 *
 * @param {Object} [options={}] - Query options.
 * @param {number} [options.page=1] - Page number to retrieve.
 * @param {string} [options.search=""] - Search term to filter by name.
 * @param {string} [options.courseYear=""] - Course year to filter by.
 * @param {string} [options.semester=""] - Semester to filter by.
 * @returns {Promise<Object>} Query results including items, totalItems, totalPages, and currentPage.
 */
export async function getSubjects({ page = 1, search = "", courseYear = "", semester = "" } = {}) {
    const filter = {};

    const cleanSearch = typeof search === "string" ? search.trim() : "";
    if (cleanSearch !== "") {
        filter.name = { $regex: escapeRegex(cleanSearch), $options: "i" };
    }
    if (courseYear !== undefined && courseYear !== null && String(courseYear).trim() !== "") {
        const cleanCourse = String(courseYear).trim();
        const courseNum = Number(cleanCourse);
        if (!isNaN(courseNum)) {
            filter.courseYear = { $in: [cleanCourse, courseNum] };
        } else {
            filter.courseYear = cleanCourse;
        }
    }
    if (semester !== undefined && semester !== null && String(semester).trim() !== "") {
        const cleanSemester = String(semester).trim();
        const semNum = Number(cleanSemester);
        if (!isNaN(semNum)) {
            filter.semester = { $in: [cleanSemester, semNum] };
        } else {
            filter.semester = cleanSemester;
        }
    }

    const totalItems = await subjects.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);

    const items = await subjects
        .find(filter)
        .skip((currentPage - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .toArray();

    return { items, totalItems, totalPages, currentPage };
}

/**
 * Get a single subject by its ObjectId.
 *
 * @param {ObjectId|string} id - The ObjectId of the subject to find.
 * @returns {Promise<Object|undefined>} A subject document if found, otherwise undefined.
 */
export async function getSubject(id) {
    const parsedId = parseObjectId(id);
    if (!parsedId) {
        return undefined;
    }
    return await subjects.findOne({ _id: parsedId });
}

/**
 * Find a subject by name using case-insensitive collation, optionally excluding a specific ID.
 *
 * @param {string} name - Name of the subject to find.
 * @param {string|ObjectId|null} [excludeId=null] - ID to exclude from search (useful for edits).
 * @returns {Promise<Object|null>} Found subject document or null.
 */
export async function getSubjectByName(name, excludeId = null) {
    if (!name) return null;
    const query = { name: name.trim() };
    const parsedExcludeId = parseObjectId(excludeId);
    if (parsedExcludeId) {
        query._id = { $ne: parsedExcludeId };
    }
    return await subjects.findOne(query, {
        collation: { locale: "es", strength: 2 }
    });
}

/**
 * Add a new subject to the database.
 *
 * @param {Object} subject - The subject document to insert.
 * @returns {Promise<ObjectId>} The inserted ObjectId of the new subject.
 */
export async function addSubject(subject) {
    if (!subject) {
        throw new Error("Invalid subject");
    }
    const result = await subjects.insertOne(subject);
    return result.insertedId;
}

/**
 * Delete an existing subject from the database.
 *
 * @param {ObjectId|string} id - The ObjectId of the subject to delete.
 * @returns {Promise<Object|null>} The deleted subject document if found, otherwise null.
 */
export async function deleteSubject(id) {
    const parsedId = parseObjectId(id);
    if (!parsedId) {
        return null;
    }
    return await subjects.findOneAndDelete({ _id: parsedId });
}

/**
 * Update an existing subject in the database.
 *
 * @param {ObjectId|string} id - ID of the subject to update.
 * @param {Object} updatedSubject - Fields to update.
 * @returns {Promise<Object|null>} The updated subject document if found, otherwise null.
 */
export async function updateSubject(id, updatedSubject) {
    const parsedId = parseObjectId(id);
    if (!parsedId) {
        return null;
    }
    return await subjects.findOneAndUpdate(
        { _id: parsedId },
        { $set: updatedSubject },
        { returnDocument: "after" }
    );
}

// ===================================================================
// TESTS DATABASE OPERATIONS (SECONDARY ENTITY LINKED TO SUBJECT)
// ===================================================================

/**
 * Get all tests linked to a specific subject.
 *
 * @param {ObjectId|string} subjectId - Parent subject ObjectId.
 * @returns {Promise<Array>} An array of all tests linked to that subject.
 */
export async function getTestsBySubjectId(subjectId) {
    const parsedId = parseObjectId(subjectId);
    if (!parsedId) {
        return [];
    }
    return await tests.find({ subjectId: parsedId }).toArray();
}

/**
 * Get a single test by its ObjectId.
 *
 * @param {ObjectId|string} id - The ObjectId of the test to find.
 * @returns {Promise<Object|undefined>} A test document if found, otherwise undefined.
 */
export async function getTest(id) {
    const parsedId = parseObjectId(id);
    if (!parsedId) {
        return undefined;
    }
    return await tests.findOne({ _id: parsedId });
}

/**
 * Find a test by title within a specific subject using case-insensitive collation,
 * optionally excluding a specific test ID (useful for edit operations).
 *
 * @param {string} title - Title of the test to find.
 * @param {string|ObjectId} subjectId - Parent subject ID.
 * @param {string|ObjectId|null} [excludeId=null] - Test ID to exclude from search.
 * @returns {Promise<Object|null>} Found test document or null.
 */
export async function getTestByTitle(title, subjectId, excludeId = null) {
    const parsedSubjectId = parseObjectId(subjectId);
    if (!title || !parsedSubjectId) return null;

    const query = {
        subjectId: parsedSubjectId,
        title: title.trim()
    };

    const parsedExcludeId = parseObjectId(excludeId);
    if (parsedExcludeId) {
        query._id = { $ne: parsedExcludeId };
    }

    return await tests.findOne(query, {
        collation: { locale: "es", strength: 2 }
    });
}

/**
 * Adds a new test to the database linked to its parent subject.
 * Supports being called either as addTest(subjectId, testData) or addTest({ ...testData, subjectId }).
 * Automatically cleans text strings and parses duration to an integer.
 *
 * @param {string|ObjectId|Object} firstArg - Either the parent subject ID or the test object itself.
 * @param {Object} [secondArg] - The test data object if firstArg is the subject ID.
 * @returns {Promise<ObjectId>} The generated ObjectId of the inserted test.
 */
export async function addTest(firstArg, secondArg) {
    let testData;
    let parentId;

    if (secondArg && typeof secondArg === "object") {
        parentId = parseObjectId(firstArg);
        testData = secondArg;
    } else if (firstArg && typeof firstArg === "object") {
        parentId = parseObjectId(firstArg.subjectId);
        testData = firstArg;
    }

    if (!testData || !parentId) {
        throw new Error("Invalid test or parent subjectId");
    }

    const testDocument = {
        title: typeof testData.title === "string" ? testData.title.trim() : "",
        description: typeof testData.description === "string" ? testData.description.trim() : "",
        difficulty: typeof testData.difficulty === "string" ? testData.difficulty.trim().toLowerCase() : "",
        duration: parseInt(testData.duration, 10),
        subjectId: parentId
    };

    const result = await tests.insertOne(testDocument);
    return result.insertedId;
}

/**
 * Updates an existing test with new values for its fields.
 * Only updates the allowed fields (title, description, difficulty, duration).
 *
 * @param {string|ObjectId} id - The ID of the test to update.
 * @param {Object} updatedFields - The fields to update (title, description, difficulty, duration).
 * @returns {Promise<Object|null>} The updated test document, or null if not found.
 */
export async function updateTest(id, updatedFields) {
    const parsedId = parseObjectId(id);
    if (!parsedId || !updatedFields || typeof updatedFields !== "object") {
        return null;
    }

    const fieldsToUpdate = {};

    if (updatedFields.title !== undefined) {
        fieldsToUpdate.title = typeof updatedFields.title === "string" ? updatedFields.title.trim() : updatedFields.title;
    }
    if (updatedFields.description !== undefined) {
        fieldsToUpdate.description = typeof updatedFields.description === "string" ? updatedFields.description.trim() : updatedFields.description;
    }
    if (updatedFields.difficulty !== undefined) {
        fieldsToUpdate.difficulty = typeof updatedFields.difficulty === "string" ? updatedFields.difficulty.trim().toLowerCase() : updatedFields.difficulty;
    }
    if (updatedFields.duration !== undefined) {
        fieldsToUpdate.duration = parseInt(updatedFields.duration, 10);
    }

    return await tests.findOneAndUpdate(
        { _id: parsedId },
        { $set: fieldsToUpdate },
        { returnDocument: "after" }
    );
}

/**
 * Deletes a single test from the database by its ID.
 *
 * @param {string|ObjectId} id - The ID of the test to delete.
 * @returns {Promise<Object|null>} The deleted test document if found, or null.
 */
export async function deleteTest(id) {
    const parsedId = parseObjectId(id);
    if (!parsedId) {
        return null;
    }
    return await tests.findOneAndDelete({ _id: parsedId });
}

/**
 * Delete all tests linked to a specific subject.
 *
 * @param {ObjectId|string} subjectId - The ObjectId of the parent subject.
 * @returns {Promise<Array>} An array of the deleted tests.
 */
export async function deleteTestsBySubjectId(subjectId) {
    const parsedId = parseObjectId(subjectId);
    if (!parsedId) {
        return [];
    }
    const subjectTests = await tests.find({ subjectId: parsedId }).toArray();
    await tests.deleteMany({ subjectId: parsedId });
    return subjectTests;
}

/**
 * Check if the database is empty (no subjects).
 *
 * @returns {Promise<boolean>} True if the database is empty, otherwise false.
 */
export async function isDatabaseEmpty() {
    return (await subjects.countDocuments()) === 0;
}

/**
 * Delete all subjects and tests from the database.
 *
 * @returns {Promise<void>}
 */
export async function deleteAllSubjects() {
    await subjects.deleteMany({});
    await tests.deleteMany({});
}

/**
 * Close the database connection.
 *
 * @returns {Promise<void>}
 */
export async function closeDatabase() {
    await client.close();
}
