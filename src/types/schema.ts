/**
 * SECTION 1: GLOBAL ROLE-BASED ACCESS CONTROL (RBAC) ENUMS
 */
export enum EmployeeRole {
  CASEWORKER = 'Caseworker',
  DEPT_ADMIN = 'DeptAdmin',
  PARAPRO = 'ParaPro',
  SOCIAL_WORKER = 'SocialWorker',
  SUPER_ADMIN = 'SuperAdmin',
  TEACHER = 'Teacher',
  ADVISOR = 'Advisor',
  SCHOOL_ADMIN_ASST = 'School Admin. Assist.'
}

export enum AccessToggle {
  YES = 'Yes',
  NO = 'No'
}

/**
 * SECTION 2: STUDENT PROFILE & TRACKING ENUMS
 */
export enum StudentSex {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}

export enum StudentStatus {
  ENROLLED = 'Enrolled',
  GRADUATED = 'Graduated',
  DROPPED = 'Dropped',
  RETURNED_TO_DISTRICT = 'Returned to District'
}

export enum AttendanceSession {
  AM = 'AM',
  PM = 'PM',
  FULL_DAY = 'Full Day'
}

export enum HybridDays {
  MONDAY = 'Monday',
  TUESDAY = 'Tuesday',
  WEDNESDAY = 'Wednesday',
  THURSDAY = 'Thursday',
  FRIDAY = 'Friday'
}

export enum GradeLevel {
  PK = 'PK',
  K = 'K',
  G1 = '1',
  G2 = '2',
  G3 = '3',
  G4 = '4',
  G5 = '5',
  G6 = '6',
  G7 = '7',
  G8 = '8',
  G9 = '9',
  G10 = '10',
  G11 = '11',
  G12 = '12'
}

export enum SchoolsProgram {
  SALT = 'SALT',
  ALOP = 'ALOP',
  RAAC = 'RAAC'
}

/**
 * SECTION 3: TRUANCY & REFERRAL LOOKUPS
 */
export enum PrimaryReferral {
  TRUANT = 'Truant',
  CHRONIC_TRUANT = 'Chronic Truant',
  POTENTIAL_DROPOUT = 'Potential Dropout',
  DROPOUT = 'Dropout'
}

export enum ContactRelationship {
  BOTH_PARENTS = 'Both Parents',
  SINGLE_MOTHER = 'Single Parent - Mother',
  SINGLE_FATHER = 'Single Parent - Father',
  FOSTER_CARE = 'Foster Care',
  GUARDIAN = 'Guardian',
  OTHER = 'Other'
}

export enum CourseLevel {
  JR_HIGH = 'Jr High',
  HIGH_SCHOOL = 'High School'
}

export enum CourseStatus {
  NEEDED = 'Needed',
  COMPLETED = 'Completed',
  TAKEN = 'Taken'
}

export enum MentalHealthTier {
  TIER_1 = 'Tier 1',
  TIER_2 = 'Tier 2',
  TIER_3 = 'Tier 3'
}

export enum SnapshotMethod {
  AUTOMATED = 'Automated - Semester End',
  MANUAL = 'Manual - SuperAdmin'
}

/**
 * SECTION 4: COOPERATION & CONFIGURATION SYSTEM TYPES
 */
export type DBTimestamp = string | { seconds: number; nanoseconds: number };

export type ReasonForExitLabel =
  | 'Deceased' | 'Department of Corrections' | 'Dropout' | 'Excluded' 
  | 'Home school' | 'Homebound' | 'Improved attendance' | 'Moved out of district' 
  | 'Never enrolled in school' | 'No longer needs TAOEP services' | 'Over 17' 
  | 'Removed from the TAOEP' | 'Residential treatment facility' | 'Runaway' 
  | 'Transferred to another program' | 'Transferred to court ordered program' 
  | 'Transferred to GED program' | 'Transferred to private or parochial school' 
  | 'Transferred to SALT' | 'Unable to locate';

export type BehaviorLabel =
  | 'Sleeping' | 'Distracted' | 'Disruptive' | 'Off Task' 
  | 'Positive Engagement' | 'On Time' | 'Completed Work';

export type MonthSequenceName =
  | 'Aug-Sept' | 'October' | 'November' | 'December' 
  | 'January' | 'February' | 'March' | 'April' | 'May-June';

/**
 * SECTION 5: STRICT DATA OBJECT SCHEMAS (Flat Root-Level Target Collections)
 */
export interface UserSessionContext {
  Email: string;
  Role: EmployeeRole;
  OrgID: string;
  EmployeeName: string;
  DeptTruancyAccess: AccessToggle; // Checked by global navigation components
  DeptSchoolsAccess: AccessToggle; // Checked by global navigation components
  AssignedTeacher?: string; // Pointing to EmployeeName if current role is ParaPro
}

export interface StudentRecord {
  id: string; // Maps directly to Firestore doc.id
  OrgID: string;
  StudentID: number; // Illinois State ID
  StudentLastName: string;
  StudentFirstName: string;
  StudentMid?: string;
  
  // Direct Staff Assignment Links
  StudentTeacher: string; // Foreign Key pointing to Employee.id (Filtered to Teacher Role)
  StudentSocialWorker: string; // Foreign Key pointing to Employee.id (Filtered to SocialWorker Role)
  
  StudentBirthdate: string;
  StudentSex: StudentSex;
  StudentEthnicity?: string;
  StudentAddress?: string;
  StudentCity?: string;
  StudentState?: string;
  StudentZip?: string;
  StudentPrimaryReferral?: PrimaryReferral;
  ParentSignedIOEP?: AccessToggle;
  AuditComplete?: string;
  Employed?: string;
  ReasonNoIOEP?: string; // Required and visible if ParentSignedIOEP == 'No'
  TransportationConsent?: AccessToggle;
  FamilyComment?: string;
  ConstitutionPass: AccessToggle;
  NewClassesNeeded?: AccessToggle;
  RollOver?: AccessToggle;
  SchoolsProgram?: SchoolsProgram;
  GradeLevel: GradeLevel;
  HomeSchool: string; // Foreign Key pointing to SchoolNames.id
  Hybrid: AccessToggle;
  Status: StudentStatus;
  Session: AttendanceSession;
  DaysSchedule?: HybridDays[]; // Visible only if Hybrid == 'Yes'
  CreatedAt: DBTimestamp;
  UpdatedAt: DBTimestamp;
}

export interface StudentSchoolYear {
  id: string; // The StuSchYrID (Maps directly to Firestore doc.id)
  OrgID: string;
  StudentRecordID: string; // Foreign Key pointing to STUDENTS.id
  SchoolYearID: string; // Foreign Key pointing to SchoolYear.id
  CaseNo: number; // Auto-assigned chronological truancy case number
  CaseWorker?: string; // Foreign Key pointing to Employee.id (Filtered to Caseworker Role)
  SchoolID: string; // Foreign Key pointing to SchoolNames.id
  GradeLevel: GradeLevel; // Active student grade level context for this operational school year
  SchoolEntryDate: string;
  SchoolExitDate?: string;
  
  // TAOEP / Truancy Module Specific Structural Fields
  SpecialEd?: AccessToggle;
  Immunizations?: AccessToggle;
  Physical?: AccessToggle;
  NewCase?: 'New' | 'Old';
  SecondaryReferral?: string[]; // Array of lookup strings
  OtherReferralExplain?: string;
  Characteristics?: string[]; // Array of multi-select configuration labels
  OtherOutcomes?: string[];
  PrimaryAcademicOutcomes?: string[];
  
  // Academic Module Specific Fields
  CreditsEarned: number; // Evaluated dynamically against graduation target
  
  CreatedAt: DBTimestamp;
  UpdatedAt: DBTimestamp;
}

export interface SubjectRequirements {
  id: string; // Internal id
  SubjectArea: string; // The UI label e.g., 'MATHEMATICS'
  RequiredCredits: number;
  IsActive: AccessToggle;
}

export interface LetterGrades {
  id: string;
  GradeValue: string;
  GradeOrder: number;
}

export interface CourseCategories {
  id: string;
  CategoryName: string;
  CategoryOrder: number;
  StateCreditsRequired?: number;
}

export interface StudentCourses {
  id: string;
  StuSchYrID: string; // Foreign Key pointing to StudentSchoolYear.id
  OrgID: string;
  CourseID: string; // Foreign Key pointing to CourseCatalog.id
  Status?: CourseStatus;
  Enrolled?: AccessToggle;
  Grade?: 'A' | 'B' | 'C' | 'D' | 'F' | 'I' | 'W' | 'T' | 'P';
  RecommendNext?: AccessToggle;
  Year: 'Current' | 'Previous' | 'Transfer';
  CreatedAt: DBTimestamp;
  UpdatedAt: DBTimestamp;
}

export interface MonthlyAttendance {
  id: string;
  StuSchYrID: string; // Foreign Key pointing to StudentSchoolYear.id
  OrgID: string;
  MonthID: string; // Foreign Key pointing to Months lookup table
  CalendarYear: number;
  SequenceOrder: number; // 1-9 index validation marker used for trailing chronological math
  AttTotalDays: number;
  AttPresent: number;
  AttAbsent: number;
  AttExcused: number;
  AttUnexcused: number;
  AttSuspended: number;
  AttTardy: number;
  AttDiscipline: number;
  CreatedAt: DBTimestamp;
}

export interface StudentCaseworkerNotes {
  id: string;
  StuSchYrID: string; // Foreign Key pointing to StudentSchoolYear.id
  OrgID: string;
  CWDate: string;
  CWNotes: string;
  CWAuthor: string; // Foreign Key pointing to Employee.id
  CreatedAt: DBTimestamp;
}

export interface StudentTracking {
  id: string;
  StuSchYrID: string; // Foreign Key pointing to StudentSchoolYear.id
  OrgID: string;
  TrackingDate: string;
  Rating: 'Green' | 'Red';
  Behavior: string; // Links to BehaviorTypes lookup label
  RecordedBy: string; // Foreign Key pointing to Employee.id (Filtered to Teacher Role)
  CreatedAt: DBTimestamp;
}

export interface StudentMentalHealth {
  id: string;
  StuSchYrID: string; // Foreign Key pointing to StudentSchoolYear.id
  OrgID: string;
  CurrentLevelOfService?: MentalHealthTier; // Automatically calculated sync property
  CurrentGoals?: string; // Automatically calculated sync property
  CreatedBy: string; // Foreign Key pointing to Employee.id (Filtered to SocialWorker Role)
  CreatedAt: DBTimestamp;
  UpdatedAt: DBTimestamp;
}

export interface MentalHealthNotes {
  id: string;
  MentalHealthID: string; // Foreign Key pointing to StudentMentalHealth.id
  OrgID: string;
  MeetingNotesDate: string;
  NoteContent: string;
  UpdatedLevel?: MentalHealthTier; // Syncs back to parent table context on component save
  UpdatedGoals?: string; // Syncs back to parent table context on component save
  RecordedBy: string; // Foreign Key pointing to Employee.id
  CreatedAt: DBTimestamp;
}

export interface HonorRollSnapshot {
  id: string;
  StuSchYrID: string; // Foreign Key pointing to StudentSchoolYear.id
  OrgID: string;
  SchoolYearID: string; // Foreign Key pointing to SchoolYear.id
  Semester: number; // Dynamic evaluation parameter (1 or 2)
  OnHonorRoll: AccessToggle;
  GPAAtSnapshot: number;
  QualifyingCourses: number; // Must check constraint parameter >= 5 core selections
  SnapshotDate: DBTimestamp;
  SnapshotMethod: SnapshotMethod;
  CreatedAt: DBTimestamp;
}

export interface CourseCatalog {
  id: string; // Native auto-generated Firestore doc.id
  OrgID: string;
  CourseName: string;
  CourseDescription?: string;
  CourseCredits: number; // Defaults to 0.5
  CourseCategory: string; // Links to CourseCategory mapping string (e.g. 'Mathematics')
  CourseLevel: CourseLevel; // 'Jr High' | 'High School'
  CourseRequired: AccessToggle; // 'Yes' auto-assigns on enrollment
  IsActive: AccessToggle;
}

export interface XferCourseCatalog {
  id: string; // Native auto-generated Firestore doc.id
  OrgID: string;
  CourseName: string; // Manually processed input field text string
  CourseDescription?: string;
  CourseCredits: number; // Automatically forced to 0.5 parameters
  CourseCategory: string; // Automatically mirrors targeted container box category
  CourseLevel: CourseLevel; // Automatically forced to 'High School' parameters
  CourseRequired: AccessToggle; // Automatically forced to 'No'
  XferNotes?: string; // Manually processed tracking description text
  IsActive: AccessToggle;
}

export interface CaseEntryExitDates {
  id: string; // Native auto-generated Firestore doc.id
  StuSchYrID: string; // Foreign Key pointing to StudentSchoolYear.id
  OrgID: string;
  EntryDate: string; // Operational check tracking timeline open parameter
  ExitDate?: string; // Empty indicator value defines an active tracking case configuration
  ReasonForExit?: string; // Links to ReasonForExit lookup string row parameters
  NewReferral: AccessToggle;
  PreAttendancePresent: number;
  PreAttendanceAbsent: number;
  PreAttendanceExcused: number;
  PreAttendanceUnexcused: number;
  PreAttendanceSuspended: number;
  PreAttendanceTardy: number;
  LastYearsUnexcused: number;
  CreatedAt: DBTimestamp;
}