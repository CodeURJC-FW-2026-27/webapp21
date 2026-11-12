import { MongoClient, ObjectId } from "mongodb";


const URL = "mongodb://localhost:27017"; 
const DBName="DBWebApp21";
export const UPLOADS_FOLDER = "./uploads"; //the files will be uploaded to the uploads folder

export const PAGE_SIZE = 6; // Number of items per page for pagination

const client = new MongoClient(URL);

await client.connect(); // we use await because the connection is asynchronous and we need to wait for it to finish before continuing with the rest of the code
console.log("Connected to MongoDB");

const data =client.db(DBName);
const asignaturas = data.collection("asignaturas"); //the name of the collection is asignaturas and each document will be asignatura

/**
 * Escapes special characters in a string to be used in search queries, preventing regex injection attacks.
 * @param {string} text user input
 * @returns {string} the safe text with escaped special characters for safe use in search queries
 */
function escapeRegex(text){
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}


//===================================================
//ASIGNATURAS DATABASE OPERATIONS (PRINCIPAL ENTITY)
//===================================================

/**
 * Get all asignaturas from the database in a array of objects
 * @returns  A array of asignaturas
 */
export async function getAsignaturas(){
    return await asignaturas.find().toArray();
}

/**
 * Get a single asignatura by its object ID
 * @param {ObjectId} id  The object ID of the asignatura to search
 * @returns {Object} A asignatura object if found, otherwise undefined
 */
export async function getAsignatura(id){
    if (!ObjectId.isValid(id)) { // Check if the provided ID is a valid ObjectId (error control)
        return undefined;
    }
    return await asignaturas.findOne({ _id: new ObjectId(id) });
}

/** 
 * Add a new asignatura to the database
 * @param {Object} asignatura  The asignatura object to add
 * @returns {ObjectId} The inserted object_ID of the new asignatura
 */
export async function addAsignatura(asignatura){
    if (!asignatura){ //error control: if asignatura is undefined we don"t add it in the db
        throw new Error("Invalid asignatura"); 
    }
    const result = await asignaturas.insertOne(asignatura);
    return result.insertedId; // Return the inserted object_ID of the new asignatura
}

/**
 * Delete an existing asignatura from the database
 * @param {ObjectId} id The object ID of the asignatura to delete
 * @returns {Object} The deleted asignatura object if found, otherwise undefined
 */
export async function deleteAsignatura(id){
    if (!ObjectId.isValid(id)) { // Check if the provided ID is a valid ObjectId (error control)
        throw new Error("Invalid ID");
    }
    return await asignaturas.findOneAndDelete({ _id: new ObjectId(id) }); // Return the deleted document if found, otherwise null
}



/**
 * Update an existing asignatura in the database
 * @param {ObjectId} id of the asignatura we want to be replaced 
 * @param {Object} updatedAsignatura new asignatura that we want to replace 
 * @returns tjhe updated asignatura object if found, otherwise undefined
 */
export async function updateAsignatura(id, updatedAsignatura) {
    if (!ObjectId.isValid(id)) { // Check if the provided ID is a valid ObjectId (error control)
        throw new Error("Invalid ID");
    }
    const result = await asignaturas.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updatedAsignatura },
        { returnDocument: "after" } // Return the updated document
    );
    return result; // Return the updated document if found, otherwise null
}


//===================================================================
//TEST LINKED TO A ASIGNATURA DATABASE OPERATIONS (SECONDARY ENTITY)
//===================================================================


/**
 * Get all tests linked to a specific asignatura
 * @param {ObjectId} asignaturaId 
 * @returns {array} an array of all the test liked to that asignatura 
 */
export async function getTestsByAsignaturaId(asignaturaId) {
    if (!ObjectId.isValid(asignaturaId)) { // Check if the provided ID is a valid ObjectId (error control)
        throw new Error("Invalid asignatura ID");
    }
    return await test.find({ asignaturaId: new ObjectId(asignaturaId) }).toArray();
}

/**
 * Get a single test by its object ID
 * @param {ObjectId} id The object ID of the test to search
 * @returns {Object} a test object if found, otherwise undefined
 */
export async function gettest(id){
    if (!ObjectId.isValid(id)) { // Check if the provided ID is a valid ObjectId (error control)
        throw new Error("Invalid ID");
    }
    return await test.findOne({ _id: new ObjectId(id) });
}

/**
 * Add a new test to the database
 * @param {Object} test The test object to add
 * @returns {ObjectId} The inserted object_ID of the new test
 */
export async function addtest(test){
    if (!test){ //error control: if test is undefined we don"t add it in the db
        throw new Error("Invalid test"); 
    }
    const result = await test.insertOne(test);
    return result.insertedId; // Return the inserted object_ID of the new test
}

/**
 * Update an existing test in the database
 * @param {ObjectId} id The object ID of the test to update
 * @param {Object} updatedFields The fields to update
 * @returns The updated test object if found, otherwise null
 */
export async function updateTest(id, updatedFields) {
    if (!ObjectId.isValid(id)) {
        return null;
    }
    const { _id, subjectId, ...fieldsToUpdate } = updatedFields;
    return await tests.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: fieldsToUpdate },
        { returnDocument: "after" }
    );
}

/**
 * Delete an existing test from the database
 * @param {ObjectId} id The object ID of the test to delete
 * @returns {Object} The deleted test object if found, otherwise undefined
 */
export async function deleteTest(id){
    if (!ObjectId.isValid(id)) { // Check if the provided ID is a valid ObjectId (error control)
        return undefined;
    }
    return await tests.findOneAndDelete({ _id: new ObjectId(id) }); // Return the deleted document if found, otherwise null
}

/**
 * Delete all tests linked to a specific asignatura
 * @param {ObjectId} asignaturaId The object ID of the asignatura whose tests should be deleted
 * @returns {array} an array of the deleted tests if found, otherwise undefined 
 */
export async function deleteTestsByAsignaturaId(asignaturaId) {
    if (!ObjectId.isValid(asignaturaId)) { // Check if the provided ID is a valid ObjectId (error control)
        return undefined;
    }
    const asignaturaObjectId = new ObjectId(asignaturaId);
    const asignaturaTest = await tests.find({ asignaturaId: asignaturaObjectId }).toArray();
    await tests.deleteMany({ asignaturaId: asignaturaObjectId });
    return asignaturaTest;
}  

/**
 * Check if the database is empty (no asignaturas)
 * @returns true if the database is empty, otherwise false
 */
export async function isDatabaseEmpty() {
    return await asignaturas.countDocuments()===0;
}

/**
 * Delete all asignaturas from the database
 * @returns 
 */
export async function deleteAllAsignaturas(){
    return await asignaturas.deleteMany({}); // Delete all documents in the collection
}

/**
 * Close the database connection
 */
export async function closeDatabase() {
    await client.close();
}









