import fs from "node:fs/promises";
import * as db from "./database.js";
import path from "node:path";
import { fileURLToPath } from "node:url";


//we have some issues with the path of the uploads folder, so we define it here to avoid problems
const __dirname = path.dirname(fileURLToPath(import.meta.url)); // Get the directory name of the current module
const PROJECT_ROOT = path.resolve(__dirname, ".."); //

const DATA_FOLDER = path.join(PROJECT_ROOT, "data");
const DATA_FILE = "data.json";
const SAMPLE_IMAGES_FOLDER = path.join(DATA_FOLDER, "images");
const UPLOADS_FOLDER = path.join(PROJECT_ROOT, "uploads");

/**
 * Loads sample data into MongoDB on server startup if the database is empty.
 * Reads sample asignaturas and their associated tests from data/data.json,
 * ensures initial images exist inside uploads/, and inserts all records.
 */
export async function loadSampleData() {
    // we create the uploads folder if it doesn't exist yet, to avoid errors when uploading files later
    await fs.mkdir(db.UPLOADS_FOLDER, { recursive: true });

    // check if MongoDB already contains data, if it contains data we skip the sample data load 
    if (!(await db.isDatabaseEmpty())) {
        console.log("Database already contains data. Skipping sample data load.");
        return;
    }

    // if data/images exists, copy sample images into uploads/ without deleting existing files
    await fs.rm(db.UPLOADS_FOLDER, { recursive: true, force: true }); //remove the uploads folder and its contents if it exists to ensure a clean state
    await fs.mkdir(db.UPLOADS_FOLDER, { recursive: true }); //recreate the uploads folder to ensure it exists
    const imageFiles = await fs.readdir(SAMPLE_IMAGES_FOLDER); //get the list of sample image files from the data/images folder
    for (const file of imageFiles) { //copy each sample image file into the uploads folder
        await fs.copyFile(
        path.join(SAMPLE_IMAGES_FOLDER, file),
        path.join(UPLOADS_FOLDER, file)
    );
}

const rawJson = await fs.readFile(path.join(DATA_FOLDER, DATA_FILE), "utf8");
    const sampleAsignaturas = JSON.parse(rawJson);

    for (const item of sampleAsignaturas) { //separate the parent asignatura data from its linked tests
        const { tests = [], ...asignaturaData } = item;

        // insert parent asignatura and capture its generated MongoDB ObjectId
        const asignaturaId = await db.addAsignatura(asignaturaData);

        
        for (const test of tests) { // insert every secondary test linked to the parent asignaturaId
            await db.addTest({
                ...test,
                asignaturaId
            });
        }
    }

    console.log("Sample data loaded successfully into MongoDB.");
}