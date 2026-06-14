import { Student, Teacher, Category, KopSekolah, CATEGORIES_DATA, ScoreKey } from './types';

// List of 22 Teachers matching our requirements
export const TEACHERS_LIST: Teacher[] = [
  // 10 Wali Kelas for the 10 Classes
  { id: 'T01', name: 'Drs. H. Bambang Susilo, M.Pd.', role: 'Wali Kelas X-A', classAssigned: 'X-A', nip: '19740512 200003 1 002' },
  { id: 'T02', name: 'Sri Wahyuni, S.Pd.', role: 'Wali Kelas X-B', classAssigned: 'X-B', nip: '19811009 200801 2 015' },
  { id: 'T03', name: 'Ahmad Fauzi, S.Si.', role: 'Wali Kelas X-C', classAssigned: 'X-C', nip: '19790321 200502 1 004' },
  { id: 'T04', name: 'Siti Aminah, S.Pd.I.', role: 'Wali Kelas XI-A1', classAssigned: 'XI-A1', nip: '19841215 201001 2 008' },
  { id: 'T05', name: 'Budi Santoso, S.Kom.', role: 'Wali Kelas XI-A2', classAssigned: 'XI-A2', nip: '19860618 201101 1 003' },
  { id: 'T06', name: 'Dewi Lestari, S.Hum.', role: 'Wali Kelas XI-B1', classAssigned: 'XI-B1', nip: '19830214 200904 2 007' },
  { id: 'T07', name: 'Rian Hidayat, S.E.', role: 'Wali Kelas XI-B2', classAssigned: 'XI-B2', nip: '19800808 200604 1 009' },
  { id: 'T08', name: 'Maria Ulfa, S.Psi.', role: 'Wali Kelas XII-A', classAssigned: 'XII-A', nip: '19871103 201402 2 011' },
  { id: 'T09', name: 'H. Sugeng Riyadi, M.T.', role: 'Wali Kelas XII-B', classAssigned: 'XII-B', nip: '19710925 199803 1 001' },
  { id: 'T10', name: 'Endah Sulistyowati, S.Pd.', role: 'Wali Kelas XII-C', classAssigned: 'XII-C', nip: '19760416 200212 2 003' },
  
  // Remaining 12 Subject or Counseling Teachers
  { id: 'T11', name: 'Dr. Robert Siahaan, M.Si.', role: 'Guru FISIKA', nip: '19681201 199403 1 005' },
  { id: 'T12', name: 'Linda Permata, S.S.', role: 'Guru Sosiologi', nip: '19890522 201504 2 004' },
  
  // 10 Subject or Counseling Teachers
  { id: 'T13', name: 'Drs. Ridwan Hakim', role: 'Guru BK (Bimbingan Konseling)', nip: '19730514 199903 1 002' },
  { id: 'T14', name: 'Yuliana, S.Th.', role: 'Guru Pendidikan Agama', nip: '19850130 200912 2 009' },
  { id: 'T15', name: 'Agus Setiawan, S.Pd.', role: 'Guru Pendidikan Jasmani', nip: '19820719 201003 1 012' },
  { id: 'T16', name: 'Ir. Handoko Wibowo', role: 'Guru Prakarya & Kewirausahaan', nip: '19690321 199602 1 001' },
  { id: 'T17', name: 'Fitriani, M.Sc.', role: 'Guru Kimia / Pendamping 5NK', nip: '19861111 201201 2 003' },
  { id: 'T18', name: 'Andi Wijaya, M.A.', role: 'Guru Sejarah / Kebudayaan', nip: '19840404 201001 1 006' },
  { id: 'T19', name: 'Lia Herlina, S.Sn.', role: 'Guru Seni Budaya', nip: '19880915 201402 2 010' },
  { id: 'T20', name: 'Denny Siregar, S.T.', role: 'Guru Informatika / Operator Rapor', nip: '19870105 201501 1 002' },
  { id: 'T21', name: 'Mega Utami, S.Pd.', role: 'Guru Bahasa Indonesia', nip: '19900318 201803 2 001' },
  { id: 'T22', name: 'Hendra Wijaya, M.Pd.', role: 'Guru Bahasa Inggris / Waka Kurikulum', nip: '19780228 200312 1 004' },
];

export const SCHOOL_CLASSES = [
  'X-A', 'X-B', 'X-C',
  'XI-A1', 'XI-A2', 'XI-B1', 'XI-B2',
  'XII-A', 'XII-B', 'XII-C'
];

export function sortClasses(classList: string[]): string[] {
  const getRank = (cls: string) => {
    const uppercase = cls.trim().toUpperCase();
    if (uppercase.startsWith('XII')) {
      const remainder = uppercase.substring(3);
      // Strip leading dash or spaces from suffix
      return { grade: 12, suffix: remainder.replace(/^[-_\s]+/, '') };
    }
    if (uppercase.startsWith('XI')) {
      const remainder = uppercase.substring(2);
      return { grade: 11, suffix: remainder.replace(/^[-_\s]+/, '') };
    }
    if (uppercase.startsWith('X')) {
      const remainder = uppercase.substring(1);
      return { grade: 10, suffix: remainder.replace(/^[-_\s]+/, '') };
    }
    return { grade: 99, suffix: uppercase };
  };

  return [...classList].sort((a, b) => {
    const rankA = getRank(a);
    const rankB = getRank(b);
    if (rankA.grade !== rankB.grade) {
      return rankA.grade - rankB.grade;
    }
    return rankA.suffix.localeCompare(rankB.suffix, undefined, { numeric: true, sensitivity: 'base' });
  });
}

export function getSavedClasses(): string[] {
  if (typeof window === 'undefined') return sortClasses(SCHOOL_CLASSES);
  const stored = localStorage.getItem('rapor_5nk_classes');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return sortClasses(parsed);
      }
    } catch (e) {
      console.error('Error parsing stored classes:', e);
    }
  }
  const sortedDefault = sortClasses(SCHOOL_CLASSES);
  localStorage.setItem('rapor_5nk_classes', JSON.stringify(sortedDefault));
  return sortedDefault;
}

export function saveClassesList(classes: string[]) {
  if (typeof window !== 'undefined') {
    const sorted = sortClasses(classes);
    localStorage.setItem('rapor_5nk_classes', JSON.stringify(sorted));
  }
}

const FIRST_NAMES = [
  'Muhammad', 'Aulia', 'Ahmad', 'Dimas', 'Aditya', 'Rian', 'Fajar', 'Dwi', 'Ayu', 'Siti',
  'Rizky', 'Anisa', 'Dewi', 'Putra', 'Eka', 'Bagus', 'Hendra', 'Sari', 'Indah', 'Lestari',
  'Gede', 'Made', 'Nyoman', 'Putu', 'Arya', 'Pratama', 'Wibowo', 'Kurniawan', 'Satria', 'Taufik',
  'Vina', 'Rina', 'Desi', 'Rudi', 'Budi', 'Andi', 'Rahmat', 'Agus', 'Yanto', 'Tri',
  'Nisa', 'Rinto', 'Melati', 'Siska', 'Wahyu', 'Gani', 'Yanti', 'Hafiz', 'Zaki', 'Aris'
];

const LAST_NAMES = [
  'Saputra', 'Lestari', 'Wahyuni', 'Utami', 'Pratama', 'Hidayat', 'Santoso', 'Kusuma', 'Sari', 'Subagyo',
  'Nugroho', 'Wibowo', 'Wijaya', 'Kurniawan', 'Ramadhan', 'Hadi', 'Setiawan', 'Budiman', 'Gunawan', 'Siregar',
  'Tarigan', 'Manurung', 'Siahaan', 'Harahap', 'Ginting', 'Sembiring', 'Limbong', 'Pasaribu', 'Sitompul', 'Lubis',
  'Riyadi', 'Yuliana', 'Fitriani', 'Mahendra', 'Kartika', 'Chandra', 'Prasetya', 'Sanjaya', 'Arifin', 'Rahman'
];

// Helper to generate Indonesian names deterministically using a seed
function randomSeeded(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function generate400Students(): Student[] {
  const students: Student[] = [];
  let studentCounter = 1;
  const classes = SCHOOL_CLASSES;

  // Generate around 33-34 students per class to reach exactly 400.
  // We'll calculate the exact size sequence to hit 400.
  const classSizes = [34, 33, 33, 33, 34, 33, 33, 33, 34, 33, 33, 33]; // Sum is exactly 400: (34*3 = 102) + (33*9 = 297) = 399... wait, 102 + 297 = 399. Let's make the last one 34 as well: 34, 33, 33, 33, 34, 33, 33, 33, 34, 33, 33, 34 = 400!
  
  classes.forEach((kelasName, classIndex) => {
    const size = classSizes[classIndex];
    
    for (let u = 0; u < size; u++) {
      const seed = studentCounter * 17 + classIndex * 3 + u;
      const firstNameIndex = Math.floor(randomSeeded(seed) * FIRST_NAMES.length);
      const lastNameIndex = Math.floor(randomSeeded(seed + 1) * LAST_NAMES.length);
      
      const genderSeed = randomSeeded(seed + 2);
      const gender = genderSeed > 0.5 ? 'L' : 'P';
      
      // Select appropriate gender name occasionally if needed, but simple mix works well
      let name = `${FIRST_NAMES[firstNameIndex]} ${LAST_NAMES[lastNameIndex]}`;
      // Basic gender-based adjustments for names
      if (gender === 'P' && (name.includes('Muhammad') || name.includes('Putra') || name.includes('Budi') || name.includes('Rudi'))) {
        name = name.replace('Muhammad', 'Siti').replace('Putra', 'Putri').replace('Budi', 'Ayu').replace('Rudi', 'Rina');
      }
      if (gender === 'L' && (name.includes('Siti') || name.includes('Ayu') || name.includes('Anisa') || name.includes('Sari') || name.includes('Indah'))) {
        name = name.replace('Siti', 'Ahmad').replace('Ayu', 'Agus').replace('Anisa', 'Rian').replace('Sari', 'Nugroho').replace('Indah', 'Satria');
      }

      // Generate realistic NIS (Nomor Induk Siswa) -> e.g. "202409001" sequence
      const baseYear = 2024;
      const classInfix = (classIndex < 4) ? '10' : (classIndex < 8) ? '11' : '12';
      const studentNumString = String(studentCounter).padStart(3, '0');
      const nis = `${baseYear}${classInfix}${studentNumString}`;

      // Set up starting grades (mostly Berkembang (B) and Berkembang Sangat Baik (BSB), with minor Mulai Berkembang (MB))
      const grades: Record<string, ScoreKey> = {};
      CATEGORIES_DATA.forEach(cat => {
        cat.indicators.forEach(ind => {
          const scoreSeed = randomSeeded(seed + ind.id.charCodeAt(0) + ind.id.charCodeAt(3));
          if (scoreSeed > 0.85) {
            grades[ind.id] = 'BSB';
          } else if (scoreSeed > 0.2) {
            grades[ind.id] = 'B';
          } else if (scoreSeed > 0.05) {
            grades[ind.id] = 'MB';
          } else {
            grades[ind.id] = 'BB';
          }
        });
      });

      // Generate typical comment templates
      const mainStrengths: string[] = [];
      const areasToImprove: string[] = [];
      
      if (grades['CTA1'] === 'BSB' || grades['CTA2'] === 'BSB') mainStrengths.push('nasionalisme');
      if (grades['DSP1'] === 'BSB' || grades['DSP2'] === 'BSB') mainStrengths.push('kedisiplinan belajar');
      if (grades['BBL1'] === 'BSB' || grades['BBL3'] === 'BSB') mainStrengths.push('sifat tolong menolong dan budi luhur');
      if (grades['CRD1'] === 'BSB' || grades['CRD2'] === 'BSB') mainStrengths.push('pemecahan masalah akademis yang cerdas');
      if (grades['TRM1'] === 'BSB' || grades['TRM3'] === 'BSB') mainStrengths.push('keterampilan berkarya dan kemandirian');

      if (grades['DSP2'] === 'MB' || grades['DSP3'] === 'MB') areasToImprove.push('konsistensi mandiri');
      if (grades['BBL2'] === 'MB') areasToImprove.push('etika bersosial media');
      if (grades['TRM2'] === 'MB') areasToImprove.push('adaptasi tantangan baru');

      const strengthText = mainStrengths.length > 0 
        ? `${name} menunjukkan perkembangan mendalam pada aspek ${mainStrengths.join(' serta ')}.` 
        : `${name} menunjukkan perkembangan yang baik dan stabil di semua aspek nilai Kartika.`;
        
      const improvementText = areasToImprove.length > 0
        ? `Perlu sedikit motivasi tambahan pada aspek ${areasToImprove.join(' dan ')}.`
        : 'Pertahankan konsistensi perilaku positif ini.';

      const kesimpulan = `${strengthText} Secara keseluruhan, pencapaian 5NK (Cinta Tanah Air, Disiplin, Berbudi Luhur, Cerdas, Terampil) berkembang sangat harmonis. ${improvementText}`;
      const catatanWali = `Sangat bangga dengan kepribadian ${name}. Tingkatkan prestasi belajar di semester berikutnya!`;
      const catatanOrangTua = `Alhamdulillah, perkembangan anak kami sangat kami pantau, terima kasih atas bimbingan Wali Kelas.`;

      students.push({
        id: `STUDENT_${String(studentCounter).padStart(3, '0')}`,
        name,
        nis,
        kelas: kelasName,
        gender,
        semester: 'Semester II (Genap)',
        grades,
        kesimpulan,
        catatanWali,
        catatanOrangTua,
        completed: u % 5 !== 0 // 4/5 are already marked filled as helpful starter
      });

      studentCounter++;
    }
  });

  return students;
}

// Function to read from Local Storage or load fresh generated list
export function getSavedStudents(): Student[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('rapor_5nk_students');
  if (stored) {
    try {
      const parsed: Student[] = JSON.parse(stored);
      // Migration for changed class names
      const classMap: Record<string, string> = {
        'X-D': 'XI-A1',
        'XI-A': 'XI-A1',
        'XI-B': 'XI-A2',
        'XI-C': 'XI-B1',
        'XI-D': 'XI-B2',
        'XII-D': 'XII-C' // Or handle otherwise
      };
      return parsed.map(s => ({
        ...s,
        kelas: classMap[s.kelas] || s.kelas
      }));
    } catch (e) {
      console.error('Error parsing stored data, resetting:', e);
    }
  }
  const fresh = generate400Students();
  localStorage.setItem('rapor_5nk_students', JSON.stringify(fresh));
  return fresh;
}

export function saveStudentsList(students: Student[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('rapor_5nk_students', JSON.stringify(students));
  }
}

// Function to read from Local Storage or load fresh teacher list
export function getSavedTeachers(): Teacher[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('rapor_5nk_teachers');
  if (stored) {
    try {
      const parsed: Teacher[] = JSON.parse(stored);
      const classMap: Record<string, string> = {
        'X-D': 'XI-A1',
        'XI-A': 'XI-A1',
        'XI-B': 'XI-A2',
        'XI-C': 'XI-B1',
        'XI-D': 'XI-B2',
        'XII-D': 'XII-C'
      };
      return parsed.map(t => ({
        ...t,
        classAssigned: t.classAssigned ? (classMap[t.classAssigned] || t.classAssigned) : undefined
      }));
    } catch (e) {
      console.error('Error parsing stored teacher data:', e);
    }
  }
  // Fallback to static TEACHERS_LIST
  localStorage.setItem('rapor_5nk_teachers', JSON.stringify(TEACHERS_LIST));
  return TEACHERS_LIST;
}

// Save teachers list
export function saveTeachersList(teachers: Teacher[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('rapor_5nk_teachers', JSON.stringify(teachers));
  }
}

// Function to read from Local Storage or load initial static CATEGORIES_DATA
export function getSavedCategories(): Category[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('rapor_5nk_categories');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing stored categories data:', e);
    }
  }
  // Dynamic import or fallback to static CATEGORIES_DATA imported from ./types
  localStorage.setItem('rapor_5nk_categories', JSON.stringify(CATEGORIES_DATA));
  return CATEGORIES_DATA;
}

// Save categories and indicators
export function saveCategoriesList(categories: Category[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('rapor_5nk_categories', JSON.stringify(categories));
  }
}

export const DEFAULT_KOP: KopSekolah = {
  yayasan: 'YAYASAN KARTIKA JAYA',
  koordinator: 'JAKARTA',
  cabang: 'XVIII SMA/SMK',
  namaSekolah: 'SMA / SMK KARTIKA VIII-1',
  alamat: 'Jl.Srengseng Sawah No.17, Jagakarsa, Kota Jakarta Selatan, DKI Jakarta',
  tahunAjaran: '2025 - 2026',
  logoUrl: ''
};

export function getSavedKopSekolah(): KopSekolah {
  if (typeof window === 'undefined') return DEFAULT_KOP;
  const stored = localStorage.getItem('rapor_5nk_kop');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_KOP, ...parsed };
    } catch (e) {
      console.error('Error parsing stored kop data:', e);
    }
  }
  localStorage.setItem('rapor_5nk_kop', JSON.stringify(DEFAULT_KOP));
  return DEFAULT_KOP;
}

export function saveKopSekolah(kop: KopSekolah) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('rapor_5nk_kop', JSON.stringify(kop));
  }
}

