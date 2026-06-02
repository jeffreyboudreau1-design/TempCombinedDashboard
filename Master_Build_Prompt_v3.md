# Final Master Build Prompt · Student Success Platform
**System Environment:** Next.js / TypeScript / Node.js
**Prototyping Data Layer:** Local network-exposed json-server (port 4000)
**Production Target Data Layer:** Google Workspace Domain / Firebase Firestore & OAuth

---

## Section 1 – Identity, Domain Security & Multi-Tenancy

### Authentication & Sandbox Mode (Local-to-Production Strategy)
* **Production Target:** The application will ultimately deploy to a Google Workspace environment using Firebase Google OAuth. Access must be restricted to `@i-kan.org` email addresses, denying all other domains unless explicitly whitelisted in the `Organizations` table.
* **Local Development Execution:** To ensure local safety and prevent API credential exposure during prototyping, build a **Mock Auth Layer** instead of a live Google OAuth loop.
  * Provide a developer-only drop-down menu or toggle switch in the global UI header. 
  * This menu must allow me to select any user from the provided Employee seed data (e.g., Emily Advisor, Jeff Super, Jennifer SocialWorker).
  * Upon selection, the application must instantly simulate a logged-in state by injecting a global session object containing that user's `Email`, `Role`, and auto-resolved `OrgID` into the application context.
  * Programmatically enforce the `@i-kan.org` domain check and the `Organizations` table whitelist validation on this mock email string so that the routing and access guard logic is fully functional and ready to be toggled live later.

### Multi-Tenancy Boundary Rules
* Every database record utilizes an `OrgID` field. Ensure strict data isolation—users must never see records from a different `OrgID`.
* `OrgID` is always auto-populated from the logged-in user's organization context. It is never displayed on any standard form and is never manually entered or selected by any user.
* **SuperAdmin Exception:** The only exception to `OrgID` visibility is the master Organizations table management screen, which is accessible to SuperAdmins only.

### School Year Calendar Configuration (Core Foundation)
* **The Global Term Identity:** The system must feature a dedicated Admin management view to define academic timelines. A School Year configuration cannot simply be a raw number; it is a master record (e.g., "Year 25-26") that maps to hard calendar boundaries.
* **Calendar Date Picker Constraints:** Admins must use an interactive UI calendar picker to explicitly set `SchStartDate` (e.g., `08/31/2025`) and `SchEndDate` (e.g., `05/31/2026`).
* **The Active State Toggle:** Provide an `IsActiveYear` status toggle ("Yes" or "No"). Only one School Year per `OrgID` can be marked as "Yes" at any given time. When a year is active, the entire system must automatically use its calendar dates to set defaults for all new student enrollments, course catalogs, and attendance tracking grids globally.

---

## Section 2 – Module Separation & Navigation

### Module Structure
* The application contains two distinct operational modules: **Truancy Dashboard** and **Schools Dashboard**.
* Use the `[TRUANCY]` and `[SCHOOLS]` identifier tags in the metadata to determine layout, navigation, and field visibility.
* Visibility to each dashboard is strictly controlled by the employee flags: `DepTruancyAccess` and `DepSchoolsAccess`.

### Role-Based Access Control (RBAC) Permitted Actions
| Role | Dashboard Access | Core Permissions & Field Guards |
| :--- | :--- | :--- |
| **Teacher** | Schools only | View assigned students only. Add/Edit `StudentTracking`. View-only for `StudentCourses`. |
| **SocialWorker** | Schools only | View `StudentTracking`. Edit `StudentMentalHealth` (Mental Health data and Tracking must be visible on the same screen with a link to course info). View-only for `StudentCourses`. |
| **ParaPro** | Schools only | View assigned students based on their associated Teacher context only. View-only access to `StudentTracking` and `StudentCourses`. |
| **Caseworker** | Truancy only | Full read/write access to the Truancy module data and metrics. |
| **DeptAdmin** | Assigned dept. | Full administration features for their specifically assigned department. |
| **SuperAdmin** | Both modules | Full access to all modules and configurations plus a **View As** role emulation switcher to audit other workspace perspectives. |
| **Advisor** | Schools only | View all school module students. Add/Edit `StudentTracking`. View-only for `StudentCourses` (with the explicit exception of editing `StudentCourse.RecommendNext` and updating the `Students.RollOver` field). Full access to the Credit Audit feature set. |
| **School Admin. Asst.** | Schools only | Full access to the specialized Course Recommendation Verification queue. |

---

## Section 3 – Student & Enrollment Logic

### Dependent Dropdowns
* **Grade-to-School Filter:** When `GradeLevel` is selected on a student record, dynamically filter the School dropdown menu to only display schools serving that grade level, derived from the reference rows in the `SchoolGrades` table.
* **School-to-Grade Filter:** When `HomeSchool` is selected on a student record, dynamically filter the `GradeLevel` dropdown to only expose grades served by that specific school facility based on the `SchoolGrades` cross-reference.
* **Conditional Visibility Fields:**
  * The `ReasonNoIOEP` text block is required and visible if and only if `ParentSignedIOEP` is toggled to "No."
  * The `DaysSchedule` multi-select panel is visible and editable if and only if the student's `Hybrid` configuration toggle is set to "Yes."

### Core Automation & Notification Triggers
* **New Assignment Alert:** When a student record is linked to a Caseworker, Teacher, or Social Worker, automatically generate an in-app persistent alert notification inside that specific staff member's communication panel.
* **Course Recommendation Verification Loop:** Anytime a user with the role of Advisor or SuperAdmin sets `StudentCourse.RecommendNext = "Yes"`, trigger an automated alert to users possessing the *School Admin. Asst.* role. This alert must link to a specialized verification dashboard displaying an "Accept" button next to the marked course. Selecting "Accept" programmatically clears the recommendation flag back to "No" and dismisses the alert in real time.

---

## Section 4 – Credit Audit Entry Workspace (Advisor & SuperAdmin)

### Visual Design & Layout Reference
* **UI Structure Blueprint:** When building the Credit Audit screen layout, panels, and course grid blocks, strictly read the design template saved in `blueprints/CreditAuditLayout.tsx`. Replicate its exact styling, spacing, and two-column elective magazine grid layout, while binding it to the active data schemas and RBAC controls defined below.

### Audit Initialization & Baseline Computations
* Provide a prominent navigation link labeled **"Credit Audit Entry"** for permitted roles. It must display an active ledger of incomplete student audits alongside an option to launch a "New Audit."
* Launching an audit prompts for: `StudentFirstName`, `StudentLastName`, `GradeLevel`, `SchoolsProgram`, and `HomeSchool`.
* **Dynamic Baselining:** Look up and display the baseline graduation targets from `SchoolNames.CreditsToGraduate` for the selected school. 
* **Prior Progression Logic:** Dynamically calculate and render a summary card on screen computing:
  $$\text{Total Credits Previous} = 0.5 \times \text{Courses Passed} + \text{Courses Needed}$$

### Subject Matter Matrix Grid
* Generate an interactive user interface featuring distinct rendering blocks for each core `CourseCatalog` entry where `StateRequired == "Yes"`, explicitly surfacing its `StateCreditsRequired` rule.
* Inside each block, list all active courses matching that box's specific `SubjectMatter`. Each row item must display real-time editable checkboxes mapping to the `StudentCourses.Status` configurations: **Taken**, **Needed**, **Enrolled**, and **RecommendNext**. Toggling any checkbox must recalculate audit totals on screen instantaneously.
* **The Elective Allocation:** The subject category "Elective" does not hold a static constraint value in the lookup index. Compute its target tracking value dynamically for each student profile utilizing the expression:
  $$\text{Elective Target Requirements} = \text{HomeSchool.CreditsToGraduate} - 16$$
* **Transfer / Alternative Ingestion:** At the base of each core subject matter block, provide an "Add New" input action layout. Triggering this initializes an alternate record in `XferCourseCatalog`. The form demands manual text ingestion for `CourseName` and `XferNotes`, while the system auto-assigns: `CourseCategory` = Current Subject Box Category, `CourseCredits = 0.5`, and `CourseLevel = "High School"`.
* **Submission Constraint:** Render an "Audit Completed" submission mechanism at the bottom of the workspace. Execute an error check before enabling interaction: the calculated **Credits Remaining must exactly equal 0**. Saving deletes the student from the pending audit dashboard roster.

---

## Section 5 – Dashboard Analytics & Advanced Formulations

### Schools Dashboard Calculations
* **Cumulative GPA Processing:** Calculate the student's cumulative GPA on rendering by querying letter grades in the `StudentCourses` index and resolving them silently to numeric parameters via the `GradeScale` table values (`A=4, B=3, C=2, D=1, F=0, I=0, W=0`).
* **Credits Remaining:** Compute dynamically on rendering without storing as an explicit collection property using the format:
  $$\text{Credits Remaining} = \text{SchoolNames.CreditsToGraduate} - \text{StudentSchoolYear.CreditsEarned}$$
* **Semester Determination:** Evaluate the operational academic semester dynamically at runtime using current calendar date rules:
  * If current date falls between `SchoolYear.SchStartDate` and December 31 $\rightarrow$ **Semester = 1**
  * If current date falls between January 1 and `SchoolYear.SchEndDate` $\rightarrow$ **Semester = 2**
* **Honor Roll Processing:** Render an Honor Roll achievement badge if and only if ALL the following rules validate at execution:
  1. The student has successfully completed (`Status == "Taken"` or `"Completed"`) $\ge 5$ baseline core courses within English Language and Literature, Mathematics, Social Sciences and History, or Life and Physical Sciences.
  2. The cumulative mean score across those qualifying core courses is $\ge 3.0$.
  3. The profile contains no grade of "F" within the current calculated semester.

### Advanced Truancy Analytics
* **Rolling 9-Month Attendance Tracking:** Compile the rolling attendance metric on the Truancy Dashboard utilizing the 9 most recent chronologically ordered `MonthlyAttendance` documents linked to the student. 
* **Chronological Bridge Logic:** Query items sorted by `CalendarYear` descending, then by `AcademicMonthIndex` descending. Utilize the sequential index mapping ($1 = \text{August}$ through $10 = \text{June}$) to handle year rollovers seamlessly. If fewer than 9 documents exist within the current school term context, traverse the boundary to pull tracking documents from the prior year's chronological context until exactly 9 records are aggregated.
* **Attendance Equation:** Output the final aggregated badge as a percentage utilizing the formulation:
  $$\text{Rolling Attendance \%} = \frac{\sum \text{AttPresent}}{\sum \text{AttTotalDays}}$$
* **Data Ingestion Validation Guard:** When a caseworker commits metrics to the monthly logging utility, enforce an ironclad mathematical validation before processing the write function:
  $$\text{AttTotalDays} = \text{AttPresent} + \text{AttAbsent} + \text{AttExcused} + \text{AttUnexcused} + \text{AttSuspended}$$
  If the inputs do not perfectly balance, block submission execution, halt data writes, and render a clear red structural warning text message on screen.

---

## Section 6 – Clinical Automation & Roll-Over Mechanics

### Mental Health Sync Action
* When a worker saves a narrative log in `MentalHealthNotes`, programmatically copy and sync its `UpdatedLevel` data to `CurrentLevelOfService`, and its `UpdatedGoals` text to `CurrentGoals` inside the parent `StudentMentalHealth` reference container.
* In the historical feed visual display, look up if a log row contains properties inside those sync values; if yes, apply a distinct background color treatment or warning icon to signify a status modification rather than standard session dialogue.

### Course Status Automation & Rollover Safeguards
* **Default Ingestion State:** Anytime a student is enrolled in a class from the standard `CourseCatalog`, the system must auto-populate the field `StudentCourses.Year = "Current"`. 
* **The Transfer Exception:** If a course is created or ingested via the `XferCourseCatalog` (Transfer/Alternative credits window), the application logic must allow the Advisor to explicitly designate whether those credits belong to the "Current" academic window or are historical "Previous" credits.
* **The Rollover Transition:** When a SuperAdmin executes the annual *Schools Dashboard Rollover Function*, the background process must automatically query all active student courses where `Year == "Current"`. As it clones the student profiles into the new upcoming `SchoolYear` database record context, it must programmatically flip those existing courses' `Year` properties to `"Previous"`. This cleanly freezes them as historical records before assigning the next term's blank "Current" schedule templates.

### Annual Multi-Tenant Roll-Over Functions (SuperAdmin Only)
* **Schools Dashboard Rollover Execution:** Requires an initialized upcoming `SchoolYear` record block configured via the Admin date picker. Iterate through all student documents where `Students.RollOver == "Yes"`. Duplicate their core configuration to the new term, incrementing `GradeLevel` by 1 unit (if value is 12, leave at 12). Duplicate their `StudentCourses` documents into the new calendar year context following the "Course Status Automation" parameters.
* **Truancy Dashboard Rollover Execution:** Identify all student cases within the `CaseEntryExitDates` ledger that do not contain an `ExitDate` value (active parameters). Migrate these cases into the newly deployed academic year term. Programmatically generate and post an automated system log row inside `StudentCaseworkerNotes` documenting that the student profile was officially carried forward into the new operational term.

---

## Section 7 – Code-Level Technical Boundaries

### Data Access Architecture Mapping (NoSQL Firestore Ready)
* **Flat Collection Topography:** Every logical data table outlined in our metadata sheet must be instantiated as a flat, root-level directory collection (e.g., a collection for `STUDENTS`, a collection for `StudentCourses`, a collection for `MonthlyAttendance`). **Do not use deeply nested subcollections.**
* **Primary Key Ingestion:** Every baseline field designated as an internal `ID` property must map directly to the platform's native auto-generated document identification hash (`doc.id`). These identification markers must remain completely invisible across all client-facing forms and interfaces.
* **Foreign Key Association:** Form connections between distinct documents utilizing flat, string-based properties matching the relational map guidelines (e.g., each entry in `StudentCourses` links to its year hub via a `StuSchYrID` text property containing the target `StudentSchoolYear` reference ID).
* **Global Multi-Tenant Wrapper Hook:** Abstract all database retrieval and write transactions through an isolated database client provider hook. This mechanism must automatically append a `.where('OrgID', '==', currentUser.OrgID)` constraint to every query, locking down security and multi-tenancy isolation globally.

### Network Testing Ingestion Framework
* **Shared Network Broadcasting:** Integrate local database utility connections using a shared developer framework. Install `json-server` to manage persistence via a local `db.json` layout watching port 4000.
* Configure the application execution environments using the network-expose parameters (`--host 0.0.0.0`) inside `package.json` scripts, forcing your local workstation to broadcast both the Next.js app and the JSON database endpoints directly across the local Wi-Fi router network.
* **Environment Protection Layer:** Abstract all database routing strings, ports, and infrastructure paths into a local initialization profile (`.env.local`). Never permit hardcoded connection definitions to remain in the application codebase files.