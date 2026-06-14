import fs from 'fs';

let content = fs.readFileSync('src/components/RaporCetak.tsx', 'utf-8');

// Replace {student. to {activeStudent.
content = content.replace(/\{student\./g, '{activeStudent.');

// Replace student.grades to activeStudent.grades inside the map
content = content.replace(/student\.grades/g, 'activeStudent.grades');

// Wait! In the props, student: initialStudent is already parsed, but let's check if there are other student.name, etc.
content = content.replace(/student\.name/g, 'activeStudent.name');
content = content.replace(/student\.nis/g, 'activeStudent.nis');
content = content.replace(/student\.kelas/g, 'activeStudent.kelas');
content = content.replace(/student\.semester/g, 'activeStudent.semester');
content = content.replace(/student\.kesimpulan/g, 'activeStudent.kesimpulan');
content = content.replace(/student\.catatanWali/g, 'activeStudent.catatanWali');
content = content.replace(/student\.catatanOrangTua/g, 'activeStudent.catatanOrangTua');

fs.writeFileSync('src/components/RaporCetak.tsx', content);

console.log("Done replacing student. with activeStudent. in RaporCetak.tsx");
