# Ensaya — Exam Simulation Platform


---

## Development Team

| Names| URJC Email | GitHub Account |
| :--- | :--- | :--- |
| **Irene Ramos Martínez-Campos** | `i.ramosm.2023@alumnos.urjc.es` | [@irenermc](https://github.com/irenermc) |
| **Antonio Manuel Machuca Hortelano** | `am.machuca.2023@alumnos.urjc.es` | [@antoniomachuca](https://github.com/antoniomachuca) |
| **David Sebastián Sticea Covaciu** | `ds.sticea.2023@alumnos.urjc.es` | [@David-2885](https://github.com/David-2885) |

---

## Team Coordination

* **Public Trello Board:** [https://trello.com/b/3T1RV9Hp](https://trello.com/b/3T1RV9Hp)  
  

---

## Functionality

**Ensaya** is a collaborative web platform designed by and for Software Engineering students at Universidad Rey Juan Carlos (URJC). The application allows students to prepare for official university exams through curated course catalogs and realistic, interactive test simulations.

### Entities

The application manages a hierarchical domain model structured around a **Primary Entity** and a **Secondary Entity**:

#### 1. Primary Entity: `Subject` (*Asignatura*)
The core entity represents an academic subject belonging to the Software Engineering degree curriculum. It serves as the primary container for study resources, course metadata, and related exam simulations.

* **Attributes:**
  * `name`: Official title / name of the subject (must be unique).
  * `description`: Comprehensive syllabus overview, competencies, and description.
  * `courseYear`: Academic year within the degree (`1st Year`, `2nd Year`, `3rd Year`, `4th Year`).
  * `semester`: Term / semester (`1st Semester`, `2nd Semester`).
  * `image`: Representative cover image / banner visual for the subject card and detail view.
* **Associated Images:** **Yes**. Each subject record is linked to a cover image that visually represents the discipline in the catalog grid and detail headers.

#### 2. Secondary Entity: `Test` (*Simulacro de Examen*)
The secondary entity represents an exam simulation or test evaluation associated with a specific subject. Each subject can hold multiple tests corresponding to different exam sessions, partial assessments, or practice modules. Observe that $1$ Subject contains $N$ tests.

* **Attributes:**
  * `id`: Unique identifier of the test.
  * `subjectId`: Foreign key / reference linking the test to its parent `Subject`.
  * `title`: Title or session name of the exam simulation (e.g., *"Midterm Exam - Units 1 to 4"*).
  * `description`: Overview, topics covered, instructions, and rules for the test.
  * `difficulty`: Difficulty level (`Easy`, `Medium`, `Hard`).
  * `duration`: Recommended time limit in minutes (e.g., `45`, `60`, `90`).
  * `image`: Optional badge, topic thumbnail, or exam icon.
* **Associated Images:** **Optional**. Tests may include an illustrative icon, diagram, or difficulty badge.


---

### Search and Categorization

* **Search Engine:**
  * Free-text search matching the **Subject** name or title (as well as keywords in its syllabus description). The search bar allows students to quickly locate any course in the curriculum.
* **Categorization and Filtering:**
  * **Academic Year:** Quick filters by degree progression (`1st Year`, `2nd Year`, `3rd Year`, `4th Year`).
  * **Semester / Term:** Filtering by study period (`1st Semester`, `2nd Semester`).
  * **Test Difficulty & Type (Detail Level):** Inside each subject view, simulations can be filtered by difficulty level and exam format.

---

## Design and Visual Identity

The web application adheres to the official **Universidad Rey Juan Carlos (URJC)** corporate visual identity:
* **Typography:** **Inter** (Google Fonts) as the primary digital typeface for legibility and modern hierarchy.
* **Color Palette:**
  * **URJC Red (Primary):** `#CB0017` (Pantone 485 C) — brand accents, call-to-action buttons, active navigation states.
  * **Dark Neutrals:** `#000000` / `#212529` — high-contrast typography, dark navigation headers, footers.
  * **Light Backgrounds:** `#FFFFFF` / `#F8F9FA` — clean card surfaces and readable content containers.
* **Layout:** Fully responsive multi-device design implemented with the **Bootstrap 5 (v5.2.3)** Grid System.

---

## Technical References

* **Base Template:** [Start Bootstrap - Shop Homepage](https://github.com/StartBootstrap/startbootstrap-shop-homepage) (customized and adapted for an academic course catalog and exam simulator).
* **UI Framework:** [Bootstrap 5.2.3](https://getbootstrap.com/) & [Bootstrap Icons](https://icons.getbootstrap.com/).
* **Data Sources:** Structured curriculum datasets located in `dataExamenes/`.
