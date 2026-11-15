import fs from "node:fs/promises";
import * as db from "./database.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { UPLOADS_FOLDER } from "./imageStorage.js";

// Resolving data folders relative to project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const DATA_FOLDER = path.join(PROJECT_ROOT, "data");
const DATA_FILE = "data.json";
const SAMPLE_IMAGES_FOLDER = path.join(DATA_FOLDER, "images");

/**
 * Loads sample data into MongoDB on server startup if the database is empty.
 * Reads sample asignaturas and their associated tests from data/data.json,
 * ensures initial images exist inside uploads/, and inserts all records.
 */
export async function loadSampleData() {
    // Create the uploads folder if it doesn't exist yet to avoid errors when uploading files later
    await fs.mkdir(UPLOADS_FOLDER, { recursive: true });

    // Check if MongoDB already contains data; if so, skip loading sample data
    if (!(await db.isDatabaseEmpty())) {
        console.log("Database already contains data. Skipping sample data load.");
        return;
    }

    // Reset the uploads folder and copy sample images into it
    await fs.rm(UPLOADS_FOLDER, { recursive: true, force: true }); // Remove the uploads folder and its contents to ensure a clean state
    await fs.mkdir(UPLOADS_FOLDER, { recursive: true }); // Recreate the uploads folder to ensure it exists
    const imageFiles = await fs.readdir(SAMPLE_IMAGES_FOLDER); // Get the list of sample image files from data/images
    for (const file of imageFiles) { // Copy each sample image file into the uploads folder
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