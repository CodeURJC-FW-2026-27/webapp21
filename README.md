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

---

## Practice 1: Web Page Layout with HTML and CSS

### Screenshots

_Pending: screenshots of the main page, the detail page and the new subject page._

### Team Participation

#### Irene Ramos Martínez-Campos

**Tasks performed:**

_Pending: Irene's tasks._

**Most significant commits:**

_Pending: Irene's commits._

**Files with the most participation:**

_Pending: Irene's files._

#### Antonio Manuel Machuca Hortelano

**Tasks performed:**

_Pending: Antonio's tasks._

**Most significant commits:**

1. [db2c08e - Added search bar in nav](https://github.com/CodeURJC-FW-2026-27/webapp21/commit/db2c08e60e0589acaf5bc81fa27f4cd0e563d500): Integration of the search form into the `<nav>` navigation bar, synchronized across all pages of the site.
2. [bea4fce - Add course dropdown to navigation and update course labels in detail pages](https://github.com/CodeURJC-FW-2026-27/webapp21/commit/bea4fce27df36b1a84ed24c007f1165fdffd066a): Added the course category menu in the header with direct anchors and adapted the course labels.
3. [ffc516d - refactor(index): update 1-2-3 responsive grid, remove inline styles, and add bootstrap bundle](https://github.com/CodeURJC-FW-2026-27/webapp21/commit/ffc516d19fec1f6a36266e93db7d8cc5b97be23e): Restructured the catalog grid to `row-cols-1 row-cols-md-2 row-cols-lg-3`, removed inline styles and added the Bootstrap JS bundle.
4. [689eb19 - feat(styles): integrate URJC visual identity with Inter font and brand variables](https://github.com/CodeURJC-FW-2026-27/webapp21/commit/689eb19042c27019fcca4ff39862f92b73e634c8): Implemented the custom stylesheet `custom.css` with URJC CSS variables (#CB0017), Inter typography, normalized covers and hover effects.
5. [863b8d2 - feat(index): add create simulation button and about section](https://github.com/CodeURJC-FW-2026-27/webapp21/commit/863b8d24ce47f5dbe773b203629ae30a37d80a18): Created the top action button that redirects to the new subject form and the "About us" section, adapting the template to the domain of the web.

**Files with the most participation:**

_Pending: Antonio's files._

#### David Sebastián Sticea Covaciu

**Tasks performed:**

_Pending: David's tasks._

**Most significant commits:**

_Pending: David's commits._

**Files with the most participation:**

_Pending: David's files._
