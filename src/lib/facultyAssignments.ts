import { supabase } from "./supabase";

export type FacultyAssignment = {
  id: string;
  faculty_id: string;
  subject_id: string;
  section_id: string;
  subject_name?: string;
  section_name?: string;
};

/**
 * Fetch all assignments for a given faculty member, joined with
 * subject and section names for display purposes.
 *
 * Gracefully handles the case where the `faculty_assignments` table
 * hasn't been created yet (migration not applied) ΓÇö returns [] so
 * callers fall back to showing all subjects/sections.
 */
export async function getFacultyAssignments(
  facultyId: string,
): Promise<FacultyAssignment[]> {
  const { data, error } = await supabase
    .from("faculty_assignments")
    .select(
      "id, faculty_id, subject_id, section_id, subjects(name), sections(name)",
    )
    .eq("faculty_id", facultyId);

  if (error) {
    if (error.code === "PGRST205") {
      console.warn(
        "[FacultyAssignments] Table not found, migration may not be applied. Falling back to all subjects/sections.",
      );
    } else {
      console.error("[FacultyAssignments] Fetch error:", error);
    }
    return [];
  }

  return (data ?? []).map((a: any) => ({
    id: a.id,
    faculty_id: a.faculty_id,
    subject_id: a.subject_id,
    section_id: a.section_id,
    subject_name: a.subjects?.name ?? "Unknown Subject",
    section_name: a.sections?.name ?? "Unknown Section",
  }));
}

/**
 * Fetch the unique subject IDs a faculty member is assigned to.
 * Useful for filtering the QR generator's subject picker.
 */
export async function getAssignedSubjectIds(
  facultyId: string,
): Promise<string[]> {
  const assignments = await getFacultyAssignments(facultyId);
  return [...new Set(assignments.map((a) => a.subject_id))];
}

/**
 * Fetch the unique section IDs a faculty member is assigned to.
 * Useful for filtering the QR generator's section picker.
 */
export async function getAssignedSectionIds(
  facultyId: string,
): Promise<string[]> {
  const assignments = await getFacultyAssignments(facultyId);
  return [...new Set(assignments.map((a) => a.section_id))];
}

/**
 * Create a new assignment linking a faculty member to a subject
 * in a specific section.
 */
export async function createAssignment(
  facultyId: string,
  subjectId: string,
  sectionId: string,
): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("faculty_assignments")
    .insert({ faculty_id: facultyId, subject_id: subjectId, section_id: sectionId });

  if (error) {
    if (error.code === "PGRST205") {
      return {
        error:
          "The faculty_assignments table doesn't exist yet. Run the migration SQL in supabase/migrations/20260808_faculty_assignments.sql first.",
      };
    }
    if (error.message.includes("duplicate")) {
      return { error: "This faculty is already assigned to that subject in that section." };
    }
    return { error: error.message };
  }
  return {};
}

/**
 * Delete an assignment by its ID.
 */
export async function deleteAssignment(assignmentId: string): Promise<void> {
  await supabase.from("faculty_assignments").delete().eq("id", assignmentId);
}
