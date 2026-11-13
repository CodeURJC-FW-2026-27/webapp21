import { MongoClient, ObjectId } from "mongodb";

const URL = "mongodb://localhost:27017"; 
const DBName = "DBWebApp21";
export const UPLOADS_FOLDER = "./uploads"; // the files will be uploaded to the uploads folder

export const PAGE_SIZE = 6; // Number of items per page for pagination

const client = new MongoClient(URL);

await client.connect(); // asynchronous connection to MongoDB
console.log("Connected to MongoDB");

const data = client.db(DBName);
export const asignaturas = data.collection("asignaturas"); // primary entity collection
export const tests = data.collection("tests"); // secondary entity collection

/**
 * Escapes special characters in a string to be used in search queries, preventing regex injection attacks.
 * @param {string} text - User input string
 * @returns {string} The safe text with escaped special characters for safe use in search queries
 */
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

//===================================================
// ASIGNATURAS DATABASE OPERATIONS (PRIMARY ENTITY)
//===================================================

/**
 * Get a list of asignaturas with optional filtering and pagination.
 * @param {Object} options - The options for the query.
 * @param {number} [options.page=1] - The page number to retrieve.
 * @param {string} [options.search=""] - The search term to filter by.
 * @param {string} [options.courseYear=""] - The course year to filter by.
 * @param {string} [options.semester=""] - The semester to filter by.
 * @returns {Promise<Object>} The results of the query including items, totalItems, totalPages, and currentPage.
 */
export async function getAsignaturas({ page = 1, search = "", courseYear = "", semester = "" } = {}) {
    const filter = {};

    if (search && search.trim() !== "") {
        filter.name = { $regex: escapeRegex(search.trim()), $options: "i" };
    }
    if (courseYear && courseYear.trim() !== "") {
        filter.courseYear = courseYear.trim();
    }
    if (semester && semester.trim() !== "") {
        filter.semester = semester.trim();
    }

    const totalItems = await asignaturas.countDocuments(filter);
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const currentPage = Math.min(Math.max(1, Number(page) || 1), totalPages);

    const items = await asignaturas
        .find(filter)
        .skip((currentPage - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .toArray();

    return { items, totalItems, totalPages, currentPage };
}

/**
 * Get a single asignatura by its object ID.
 * @param {ObjectId|string} id - The object ID of the asignatura to search
 * @returns {Promise<Object|undefined>} An asignatura object if found, otherwise undefined
 */
export async function getAsignatura(id) {
    if (!ObjectId.isValid(id)) {
        return undefined;
    }
    return await asignaturas.findOne({ _id: new ObjectId(id) });
}

/**
 * Find an asignatura by name with case-insensitive collation, optionally excluding a specific ID.
 * @param {string} name - Name of the subject to find
 * @param {string|ObjectId} [excludeId=null] - ID to exclude from search (useful for edit operations)
 * @returns {Promise<Object|null>} Found subject document or null
 */
export async function getAsignaturaByName(name, excludeId = null) {
    if (!name) return null;
    const query = { name: name.trim() };
    if (excludeId && ObjectId.isValid(excludeId)) {
        query._id = { $ne: new ObjectId(excludeId) };
    }
    return await asignaturas.findOne(query, {
        collation: { locale: "es", strength: 2 }
    });
}

/** 
 * Add a new asignatura to the database.
 * @param {Object} asignatura - The asignatura object to add
 * @returns {Promise<ObjectId>} The inserted ObjectId of the new asignatura
 */
export async function addAsignatura(asignatura) {
    if (!asignatura) {
        throw new Error("Invalid asignatura"); 
    }
    const result = await asignaturas.insertOne(asignatura);
    return result.insertedId;
}

/**
 * Delete an existing asignatura from the database.
 * @param {ObjectId|string} id - The object ID of the asignatura to delete
 * @returns {Promise<Object>} The deleted asignatura object if found, otherwise null
 */
export async function deleteAsignatura(id) {
    if (!ObjectId.isValid(id)) {
        throw new Error("Invalid ID");
    }
    return await asignaturas.findOneAndDelete({ _id: new ObjectId(id) });
}

/**
 * Update an existing asignatura in the database.
 * @param {ObjectId|string} id - ID of the asignatura to be updated
 * @param {Object} updatedAsignatura - Fields to update
 * @returns {Promise<Object>} The updated asignatura object if found, otherwise null
 */
export async function updateAsignatura(id, updatedAsignatura) {
    if (!ObjectId.isValid(id)) {
        throw new Error("Invalid ID");
    }
    const result = await asignaturas.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updatedAsignatura },
        { returnDocument: "after" }
    );
    return result;
}

//===================================================================
// TEST LINKED TO AN ASIGNATURA DATABASE OPERATIONS (SECONDARY ENTITY)
//===================================================================

/**
 * Get all tests linked to a specific asignatura.
 * @param {ObjectId|string} asignaturaId - Parent asignatura ObjectId
 * @returns {Promise<Array>} An array of all tests linked to that asignatura
 */
export async function getTestsByAsignaturaId(asignaturaId) {
    if (!ObjectId.isValid(asignaturaId)) {
        throw new Error("Invalid ID");
    }
    return await tests.find({ asignaturaId: new ObjectId(asignaturaId) }).toArray();
}

/**
 * Get a single test by its object ID.
 * @param {ObjectId|string} id - The object ID of the test to search
 * @returns {Promise<Object|undefined>} A test object if found, otherwise undefined
 */
export async function getTest(id) {
    if (!ObjectId.isValid(id)) {
        return undefined;
    }
    return await tests.findOne({ _id: new ObjectId(id) });
}

/**
 * Add a new test to the database.
 * @param {Object} test - The test object to add
 * @returns {Promise<ObjectId>} The inserted ObjectId of the new test
 */
export async function addTest(test) {
    if (!test || !ObjectId.isValid(test.asignaturaId)) {
        throw new Error("Invalid test or parent asignaturaId");
    }
    const testDocument = {
        ...test,
        asignaturaId: new ObjectId(test.asignaturaId)
    };
    const result = await tests.insertOne(testDocument);
    return result.insertedId;
}

/**
 * Update an existing test in the database.
 * @param {ObjectId|string} id - The object ID of the test to update
 * @param {Object} updatedFields - The fields to update
 * @returns {Promise<Object|null>} The updated test object if found, otherwise null
 */
export async function updateTest(id, updatedFields) {
    if (!ObjectId.isValid(id)) {
        return null;
    }
    const { _id, asignaturaId, ...fieldsToUpdate } = updatedFields;
    return await tests.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: fieldsToUpdate },
        { returnDocument: "after" }
    );
}

/**
 * Delete an existing test from the database.
 * @param {ObjectId|string} id - The object ID of the test to delete
 * @returns {Promise<Object>} The deleted test object if found, otherwise null
 */
export async function deleteTest(id) {
    if (!ObjectId.isValid(id)) {
        return undefined;
    }
    return await tests.findOneAndDelete({ _id: new ObjectId(id) });
}

/**
 * Delete all tests linked to a specific asignatura.
 * @param {ObjectId|string} asignaturaId - The object ID of the parent asignatura
 * @returns {Promise<Array>} An array of the deleted tests
 */
export async function deleteTestsByAsignaturaId(asignaturaId) {
    if (!ObjectId.isValid(asignaturaId)) {
        return undefined;
    }
    const asignaturaObjectId = new ObjectId(asignaturaId);
    const asignaturaTest = await tests.find({ asignaturaId: asignaturaObjectId }).toArray();
    await tests.deleteMany({ asignaturaId: asignaturaObjectId });
    return asignaturaTest;
}  

/**
 * Check if the database is empty (no asignaturas).
 * @returns {Promise<boolean>} True if the database is empty, otherwise false
 */
export async function isDatabaseEmpty() {
    return (await asignaturas.countDocuments() === 0);
}

/**
 * Delete all asignaturas and tests from the database.
 * @returns {Promise<void>}
 */
export async function deleteAllAsignaturas() {
    await asignaturas.deleteMany({});
    await tests.deleteMany({});
}

/**
 * Close the database connection.
 * @returns {Promise<void>}
 */
export async function closeDatabase() {
    await client.close();
}
