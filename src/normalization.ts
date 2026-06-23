import { Student, Teacher } from './types';
import { formatProperName, validateTeacherNameFormat } from './utils';

// Map of common titles to their preferred canonical casing/formatting
const TITLE_MAP: Record<string, string> = {
  "S.PD.": "S.Pd.",
  "S.PD": "S.Pd.",
  "M.PD.": "M.Pd.",
  "M.PD": "M.Pd.",
  "DR.": "Dr.",
  "DR": "Dr.",
  "DRS.": "Drs.",
  "M.SI.": "M.Si.",
  "M.SI": "M.Si.",
};

export function normalizeNameWithTitle(name: string): string {
  if (!name) return '';
  return formatProperName(name);
}

export function hasValidAcademicTitle(name: string): boolean {
  return validateTeacherNameFormat(name);
}

export function normalizeAllData(students: Student[], teachers: Teacher[]) {
  const normalizedStudents = students.map(s => ({
    ...s,
    name: formatProperName(s.name)
  }));
  
  const normalizedTeachers = teachers.map(t => ({
    ...t,
    name: formatProperName(t.name)
  }));
  
  return { students: normalizedStudents, teachers: normalizedTeachers };
}
