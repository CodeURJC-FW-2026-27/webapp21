import { MongoClient, ObjectId } from "mongodb";


const URL = "mongodb://localhost:27017"; 
const DBName="DBWebApp21";
export const UPLOADS_FOLDER = "./uploads"; //the files will be uploaded to the uploads folder


const client = new MongoClient(URL);

await client.connect(); // we use await because the connection is asynchronous and we need to wait for it to finish before continuing with the rest of the code
console.log('Connected to MongoDB');

const data =client.db(DBName);
const asignaturas = data.collection('asignaturas'); //the name of the collection is asignaturas and each document will be asignatura

/**
 * Get all asignaturas from the database in a array of objects
 * @returns  A array of asignaturas
 */
export async function getAsignaturas(){
    return await asignaturas.find().toArray();
}

/**
 * Get a single asignatura by its object ID
 * @param {string} id  The object ID of the asignatura to search
 * @returns A asignatura object if found, otherwise undefined
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
 * @returns The inserted object_ID of the new asignatura
 */
export async function addAsignatura(asignatura){
    if (!asignatura){ //error control: if asignatura is undefined we don't add it in the db
        throw new Error("Invalid asignatura"); 
    }
    const result = await asignaturas.insertOne(asignatura);
    return result.insertedId; // Return the inserted object_ID of the new asignatura
}

/**
 * Delete an existing asignatura from the database
 * @param {*} id The object ID of the asignatura to delete
 * @returns The deleted asignatura object if found, otherwise undefined
 */
export async function deleteAsignatura(id){
    if (!ObjectId.isValid(id)) { // Check if the provided ID is a valid ObjectId (error control)
        throw new Error("Invalid ID");
    }
    return await asignaturas.findOneAndDelete({ _id: new ObjectId(id) }); // Return the deleted document if found, otherwise null
}



/**
 * Update an existing asignatura in the database
 * @param {*} id of the asignatura we want to be replaced 
 * @param {*} updatedAsignatura new asignatura that we want to replace 
 * @returns tjhe updated asignatura object if found, otherwise undefined
 */
export async function updateAsignatura(id, updatedAsignatura) {
    if (!ObjectId.isValid(id)) { // Check if the provided ID is a valid ObjectId (error control)
        throw new Error("Invalid ID");
    }
    const result = await asignaturas.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updatedAsignatura },
        { returnDocument: 'after' } // Return the updated document
    );
    return result; // Return the updated document if found, otherwise null
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









