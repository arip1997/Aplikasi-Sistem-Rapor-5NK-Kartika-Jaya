import { Student, Teacher, Category, KopSekolah, CATEGORIES_DATA, ScoreKey } from './types';
import { formatProperName } from './utils';
export const kartikaLogoUrl = 'https://lh3.googleusercontent.com/d/1S7UuyDpIDDTxOCqb1aOa1JNtmMQggUEC';

// List of 33 actual Teachers matching our requirements
export const TEACHERS_LIST: Teacher[] = [
  { id: 'T01', name: 'Dwi Wulan Septiani, S.Pd., Gr., M.M.', role: 'Wali Kelas X-A', classAssigned: 'X-A' },
  { id: 'T02', name: 'Rachma Putri Ayuningtyas, S.Pd., Gr.', role: 'Wali Kelas X-B', classAssigned: 'X-B' },
  { id: 'T03', name: 'Eko Rahmad Ramadhana, S.Pd., Gr.', role: 'Wali Kelas X-C', classAssigned: 'X-C' },
  { id: 'T04', name: 'Mohamad Nurul Huda, M.Pd.I.', role: 'Wali Kelas X-D', classAssigned: 'X-D' },
  { id: 'T05', name: 'Ramadhan Ris Wahyudi, S.Pd., Gr.', role: 'Wali Kelas XI-A1', classAssigned: 'XI-A1' },
  { id: 'T06', name: 'Recky Canvas Riyadi, S.Pd.', role: 'Wali Kelas XI-A2', classAssigned: 'XI-A2' },
  { id: 'T07', name: 'Santi Yulinar, S.Pd.Si., Gr.', role: 'Wali Kelas XI-B1', classAssigned: 'XI-B1' },
  { id: 'T08', name: 'Intan Risti Habibi, S.Pd., Gr.', role: 'Wali Kelas XI-B2', classAssigned: 'XI-B2' },
  { id: 'T09', name: 'Andriani Budi Pratiwi, S.Pd., Gr.', role: 'Wali Kelas XII-A', classAssigned: 'XII-A' },
  { id: 'T10', name: 'Novita Hardiati, S.Pd., Gr.', role: 'Wali Kelas XII-B', classAssigned: 'XII-B' },
  { id: 'T11', name: 'Pramsiska Apriyanti K., S.Pd.', role: 'Wali Kelas XII-C', classAssigned: 'XII-C' },
  { id: 'T12', name: 'Dwi Wulan Septiani, S.Pd., Gr., M.M.', role: 'Guru Ekonomi' },
  { id: 'T13', name: 'Azzahro Firdaus, S.Pd.', role: 'Guru BK (Bimbingan Konseling)' },
  { id: 'T14', name: 'Mohamad Nurul Huda, M.Pd.I.', role: 'Guru Pendidikan Agama Islam' },
  { id: 'T15', name: 'Ramadhan Ris Wahyudi, S.Pd., Gr.', role: 'Guru Pendidikan Jasmani' },
  { id: 'T16', name: 'Recky Canvas Riyadi, S.Pd.', role: 'Guru Prakarya & Kewirausahaan' },
  { id: 'T17', name: 'Intan Risti Habibi, S.Pd., Gr.', role: 'Guru Kimia / Pendamping 5NK' },
  { id: 'T18', name: 'Tiurma Intan Sari, S.Pd., M.M.', role: 'Guru Kimia / Pendamping 5NK' },
  { id: 'T19', name: 'Eko Rahmad Ramadhana, S.Pd., Gr.', role: 'Guru Sejarah' },
  { id: 'T20', name: 'Recky Canvas Riyadi, S.Pd.', role: 'Guru Seni Budaya' },
  { id: 'T21', name: 'Dion Marsel Hermawan, S.Pd.', role: 'Guru Informatika' },
  { id: 'T22', name: 'Tri Handajani, S.Pd.', role: 'Guru Bahasa Indonesia' },
  { id: 'T23', name: 'Rachma Putri Ayuningtyas, S.Pd., Gr.', role: 'Guru Bahasa Indonesia' },
  { id: 'T24', name: 'Rachma Fairuza Rizka Fitri, S.Ant.', role: 'Guru Sosiologi' },
  { id: 'T25', name: 'Pramsiska Apriyanti K., S.Pd.', role: 'Guru Bahasa Inggris / Waka Kurikulum' },
  { id: 'T26', name: 'Selfiana Isminadzila, S.Pd.', role: 'Guru PPKN' },
  { id: 'T27', name: 'Khafika Isroilliyah, S.Pd.', role: 'Guru Muatan Lokal (Bahasa Daerah)' },
  { id: 'T28', name: 'Andrian Arifandi, S.Pd.', role: 'Guru Geografi' },
  { id: 'T29', name: 'Darwis D. Tasemak, M.Th.', role: 'Guru Pendidikan Agama Kristen' },
  { id: 'T30', name: 'Santi Yulinar, S.Pd.Si., Gr.', role: 'Guru Fisika' },
  { id: 'T31', name: 'Andriani Budi Pratiwi, S.Pd., Gr.', role: 'Guru Matematika' },
  { id: 'T32', name: 'Novita Hardiati, S.Pd., Gr.', role: 'Guru Ekonomi' },
  { id: 'T33', name: 'Sania Fitri Kusumaningsih, S.Pd., Gr.', role: 'Guru Biologi' }
].map(t => ({...t, name: formatProperName(t.name)}));

export const SCHOOL_CLASSES = [
  'X-A', 'X-B', 'X-C', 'X-D',
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
  const isWiped = localStorage.getItem('rapor_5nk_database_wiped') === 'true';
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        if (isWiped) {
          return sortClasses(parsed);
        }
        let updated = [...parsed];
        let hasChanges = false;
        SCHOOL_CLASSES.forEach(c => {
          if (!updated.includes(c)) {
            updated.push(c);
            hasChanges = true;
          }
        });
        if (hasChanges) {
          const sorted = sortClasses(updated);
          localStorage.setItem('rapor_5nk_classes', JSON.stringify(sorted));
          return sorted;
        }
        return sortClasses(parsed);
      }
    } catch (e) {
      console.error('Error parsing stored classes:', e);
    }
  }
  if (isWiped) {
    return [];
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

const RAW_STUDENTS_LIST: { id: string; name: string; nis: string; kelas: string; gender: 'L' | 'P' }[] = [
  // X-A
  { id: 'STUDENT_001', name: 'ABRILIAN MAULANA MAXCELO', nis: '23073', kelas: 'X-A', gender: 'L' },
  { id: 'STUDENT_002', name: 'ADELIA PUTRI ARIFAH', nis: '23074', kelas: 'X-A', gender: 'P' },
  { id: 'STUDENT_003', name: 'ADITYA RAKHA NARENDRA', nis: '23075', kelas: 'X-A', gender: 'L' },
  { id: 'STUDENT_004', name: 'ARA JULISTIA ENDARTA', nis: '23076', kelas: 'X-A', gender: 'P' },
  { id: 'STUDENT_005', name: 'DICO DENI HARTONO', nis: '23091', kelas: 'X-A', gender: 'L' },
  { id: 'STUDENT_006', name: 'ERCHA PUTRI ARMEILYAN', nis: '23095', kelas: 'X-A', gender: 'P' },
  { id: 'STUDENT_007', name: 'FADILLA AYU DINDA RIZKYANTI BUDIONO', nis: '23096', kelas: 'X-A', gender: 'P' },
  { id: 'STUDENT_008', name: 'FAIQOTUL HIKMAH', nis: '23097', kelas: 'X-A', gender: 'P' },
  { id: 'STUDENT_009', name: 'FANDY AGUSTINA PRANATA', nis: '23105', kelas: 'X-A', gender: 'L' },
  { id: 'STUDENT_010', name: 'I WAYAN HANDRA NURCAHYA', nis: '23110', kelas: 'X-A', gender: 'L' },
  { id: 'STUDENT_011', name: 'LEVINA SESHA WAHYU FEBRIANI', nis: '23114', kelas: 'X-A', gender: 'P' },
  { id: 'STUDENT_012', name: 'MOHAMMAD NUR AKBAR', nis: '23118', kelas: 'X-A', gender: 'L' },
  { id: 'STUDENT_013', name: 'MUHAMMAD GHONI ABDULLOH', nis: '23119', kelas: 'X-A', gender: 'L' },
  { id: 'STUDENT_014', name: 'NABILA', nis: '23122', kelas: 'X-A', gender: 'P' },
  { id: 'STUDENT_015', name: 'NURU QULBI INAYAH', nis: '23126', kelas: 'X-A', gender: 'P' },
  { id: 'STUDENT_016', name: 'RANDITYA DWI PUTRA ANDRIKA', nis: '23135', kelas: 'X-A', gender: 'L' },
  { id: 'STUDENT_017', name: 'RHIVANO AFTHAF RAJA DOALY', nis: '23136', kelas: 'X-A', gender: 'L' },
  { id: 'STUDENT_018', name: 'SATRIYA ANUGRAH RAMADHAN', nis: '23145', kelas: 'X-A', gender: 'L' },
  { id: 'STUDENT_019', name: 'SHAFA SABITA JAYANTI', nis: '23146', kelas: 'X-A', gender: 'P' },
  { id: 'STUDENT_020', name: 'ZAFIRA DZUHRI RAMADHANI', nis: '23154', kelas: 'X-A', gender: 'P' },

  // X-B
  { id: 'STUDENT_021', name: 'AJENIUS SURYA BRAHMANA', nis: '23077', kelas: 'X-B', gender: 'L' },
  { id: 'STUDENT_022', name: 'ALIYA MAULIDYA', nis: '23078', kelas: 'X-B', gender: 'P' },
  { id: 'STUDENT_023', name: 'ALVIANO SAFUTRA', nis: '23079', kelas: 'X-B', gender: 'L' },
  { id: 'STUDENT_024', name: 'ANANDITA FARADISA MULIA', nis: '23080', kelas: 'X-B', gender: 'P' },
  { id: 'STUDENT_025', name: 'DITA ARIE PALUPI', nis: '23092', kelas: 'X-B', gender: 'P' },
  { id: 'STUDENT_026', name: 'DONI ANDRIAN DWI STIVANI', nis: '23093', kelas: 'X-B', gender: 'L' },
  { id: 'STUDENT_027', name: 'FAIRUZ NAJLAAM MOZAMIL', nis: '23098', kelas: 'X-B', gender: 'P' },
  { id: 'STUDENT_028', name: 'FAIZA PUTRI HELMANDIA', nis: '23099', kelas: 'X-B', gender: 'P' },
  { id: 'STUDENT_029', name: 'HUDAA ALLYA TYAZ', nis: '23106', kelas: 'X-B', gender: 'L' },
  { id: 'STUDENT_030', name: 'JIHAN NOVELIA ANDRITASARI', nis: '23111', kelas: 'X-B', gender: 'P' },
  { id: 'STUDENT_031', name: 'LYDIA LYSANDRI LACSMI', nis: '23115', kelas: 'X-B', gender: 'P' },
  { id: 'STUDENT_032', name: 'MOHAMMAD RIFQI', nis: '23120', kelas: 'X-B', gender: 'L' },
  { id: 'STUDENT_033', name: 'MUHAMMAD TAUFIQ HAIKAL', nis: '23121', kelas: 'X-B', gender: 'L' },
  { id: 'STUDENT_034', name: 'NADHIRA SANIYYAH', nis: '23123', kelas: 'X-B', gender: 'P' },
  { id: 'STUDENT_035', name: 'PRINCES ALI OLBATA', nis: '23129', kelas: 'X-B', gender: 'P' },
  { id: 'STUDENT_036', name: 'PUNDI SELLA SAFIRA', nis: '23130', kelas: 'X-B', gender: 'P' },
  { id: 'STUDENT_037', name: 'RADITYA ADAM PAHLEVI PRIYANTO', nis: '23131', kelas: 'X-B', gender: 'L' },
  { id: 'STUDENT_038', name: 'RIFFAN SETIAWAN', nis: '23137', kelas: 'X-B', gender: 'L' },
  { id: 'STUDENT_039', name: 'RISKI ADITYA REVANDA', nis: '23138', kelas: 'X-B', gender: 'L' },
  { id: 'STUDENT_040', name: 'SITI ANISAH', nis: '23147', kelas: 'X-B', gender: 'P' },
  { id: 'STUDENT_041', name: 'SURYA ANUGERA', nis: '23148', kelas: 'X-B', gender: 'L' },

  // X-C
  { id: 'STUDENT_042', name: 'ANDI LISABRINA', nis: '23081', kelas: 'X-C', gender: 'P' },
  { id: 'STUDENT_043', name: 'ANDREW DAFFAA RAHMATULLAH', nis: '23082', kelas: 'X-C', gender: 'L' },
  { id: 'STUDENT_044', name: 'APRILIO ALIYUDIN WASKITO', nis: '23083', kelas: 'X-C', gender: 'L' },
  { id: 'STUDENT_045', name: 'ARETA SHEENAZ', nis: '23084', kelas: 'X-C', gender: 'P' },
  { id: 'STUDENT_046', name: 'CLARISSA AULIA OKTAVIA', nis: '23090', kelas: 'X-C', gender: 'P' },
  { id: 'STUDENT_047', name: 'DZILVANA MYRILLA FARVARY ANDITA', nis: '23094', kelas: 'X-C', gender: 'P' },
  { id: 'STUDENT_048', name: 'FARHAN PAMUNGKAS SYIHA ILAH', nis: '23100', kelas: 'X-C', gender: 'L' },
  { id: 'STUDENT_049', name: 'FATICH AULIA RAMADHAN', nis: '23101', kelas: 'X-C', gender: 'L' },
  { id: 'STUDENT_050', name: 'GARNETTA NATANIA DHIA KIRANA', nis: '23104', kelas: 'X-C', gender: 'P' },
  { id: 'STUDENT_051', name: 'KEISHA NINDY ALIVIA', nis: '23112', kelas: 'X-C', gender: 'P' },
  { id: 'STUDENT_052', name: 'LYLA FAAZA AYUSITA', nis: '23116', kelas: 'X-C', gender: 'P' },
  { id: 'STUDENT_053', name: 'MOCH MARVEL ADITYA', nis: '23117', kelas: 'X-C', gender: 'L' },
  { id: 'STUDENT_054', name: 'NATASYA CHARINA PRASETYO', nis: '23124', kelas: 'X-C', gender: 'P' },
  { id: 'STUDENT_055', name: 'PAWITRA GANGGA KUMARA', nis: '23128', kelas: 'X-C', gender: 'L' },
  { id: 'STUDENT_056', name: 'RAHMA ANUGRAH FARIZA HIDAYAH', nis: '23133', kelas: 'X-C', gender: 'P' },
  { id: 'STUDENT_057', name: 'RAHMADONA SEPTIA WARDANI', nis: '23134', kelas: 'X-C', gender: 'P' },
  { id: 'STUDENT_058', name: 'RISKA OLIVIA', nis: '23155', kelas: 'X-C', gender: 'P' },
  { id: 'STUDENT_059', name: 'RISQY AGUSTAV RAMADHAN', nis: '23139', kelas: 'X-C', gender: 'L' },
  { id: 'STUDENT_060', name: 'RIZKY AMANULLAH', nis: '23140', kelas: 'X-C', gender: 'L' },
  { id: 'STUDENT_061', name: 'SYAHNILA NUR ANDIAN', nis: '23149', kelas: 'X-C', gender: 'P' },
  { id: 'STUDENT_062', name: 'THORIQL EL CESARIA MERAYU SUKMA', nis: '23150', kelas: 'X-C', gender: 'L' },

  // X-D
  { id: 'STUDENT_063', name: 'ATHIYA KAMILA SYAFARINA', nis: '23085', kelas: 'X-D', gender: 'P' },
  { id: 'STUDENT_064', name: 'AURA NUR FADILA ASFA REYNI', nis: '23086', kelas: 'X-D', gender: 'P' },
  { id: 'STUDENT_065', name: 'AZIZAH MAHARANI TIMOR', nis: '23087', kelas: 'X-D', gender: 'P' },
  { id: 'STUDENT_066', name: 'AZZAM FAHRI AL RAFIF', nis: '23088', kelas: 'X-D', gender: 'L' },
  { id: 'STUDENT_067', name: 'CHRISNA ARYO LAKSONO', nis: '23089', kelas: 'X-D', gender: 'L' },
  { id: 'STUDENT_068', name: 'EUNIKE TIRZA ZEFANIA PATTIASINA', nis: '23156', kelas: 'X-D', gender: 'P' },
  { id: 'STUDENT_069', name: 'FERDINAND AKBAR', nis: '23102', kelas: 'X-D', gender: 'L' },
  { id: 'STUDENT_070', name: 'FREDERIKA NILAPANCURAN', nis: '23103', kelas: 'X-D', gender: 'P' },
  { id: 'STUDENT_071', name: 'IGNATIUS ALDITA PUTRA PRATAMA', nis: '23108', kelas: 'X-D', gender: 'L' },
  { id: 'STUDENT_072', name: 'IRMILIA MARTA WIBOWO', nis: '23109', kelas: 'X-D', gender: 'P' },
  { id: 'STUDENT_073', name: 'IVANDER NOVNAS LIGHTING', nis: '23157', kelas: 'X-D', gender: 'L' },
  { id: 'STUDENT_074', name: 'KEYSA NABILA FARDHANI', nis: '23113', kelas: 'X-D', gender: 'P' },
  { id: 'STUDENT_075', name: 'NUR AISYAH PUTRI CAHYONO', nis: '23125', kelas: 'X-D', gender: 'P' },
  { id: 'STUDENT_076', name: 'OCTAVIA NUR PUTRI ANGGRA', nis: '23127', kelas: 'X-D', gender: 'P' },
  { id: 'STUDENT_077', name: 'RAFA ALFARIZI HUSEIN', nis: '23132', kelas: 'X-D', gender: 'L' },
  { id: 'STUDENT_078', name: 'RIZKY KARUNIA INDRA', nis: '23141', kelas: 'X-D', gender: 'L' },
  { id: 'STUDENT_079', name: 'SAFIRA OKTA ANDRIANA', nis: '23142', kelas: 'X-D', gender: 'P' },
  { id: 'STUDENT_080', name: 'SAFIRA SANDRA FEBRIYANTI', nis: '23143', kelas: 'X-D', gender: 'P' },
  { id: 'STUDENT_081', name: 'SAMUEL JONATHAN PELATTA', nis: '23144', kelas: 'X-D', gender: 'L' },
  { id: 'STUDENT_082', name: 'SHAFFA AZ ALIENNA HAPSARI', nis: '23151', kelas: 'X-D', gender: 'P' },
  { id: 'STUDENT_083', name: 'WIRA SOMANJAYA', nis: '23152', kelas: 'X-D', gender: 'L' },
  { id: 'STUDENT_084', name: 'YOAB ONGKI RENOLD MUNI', nis: '23153', kelas: 'X-D', gender: 'L' },

  // XI-A1
  { id: 'STUDENT_085', name: 'AKBAR MAULANA HAKIM', nis: '22964', kelas: 'XI-A1', gender: 'L' },
  { id: 'STUDENT_086', name: 'ALMER ADIKA FARRAS', nis: '22965', kelas: 'XI-A1', gender: 'L' },
  { id: 'STUDENT_087', name: 'ANAS NUR RAHMAN', nis: '22968', kelas: 'XI-A1', gender: 'L' },
  { id: 'STUDENT_088', name: 'APRILIA MAURA PUTRI', nis: '22971', kelas: 'XI-A1', gender: 'P' },
  { id: 'STUDENT_089', name: 'ATFA ANUGRAH FADHILLAH', nis: '22973', kelas: 'XI-A1', gender: 'P' },
  { id: 'STUDENT_090', name: 'AYUNDA AMELIA SUSANTI', nis: '22977', kelas: 'XI-A1', gender: 'P' },
  { id: 'STUDENT_091', name: 'AZRYA SYAFINA', nis: '22979', kelas: 'XI-A1', gender: 'P' },
  { id: 'STUDENT_092', name: 'BILQISH MAYRA IVANA', nis: '22985', kelas: 'XI-A1', gender: 'P' },
  { id: 'STUDENT_093', name: 'CHECELIA DEVINA ARYANTO', nis: '22986', kelas: 'XI-A1', gender: 'P' },
  { id: 'STUDENT_094', name: 'CHELYBYANA AYU NAFEEZADA YUDHITA SUDJARWO', nis: '22987', kelas: 'XI-A1', gender: 'P' },
  { id: 'STUDENT_095', name: 'DIVO PUTRA ANDIKA', nis: '22991', kelas: 'XI-A1', gender: 'L' },
  { id: 'STUDENT_096', name: 'GADHENG WAHYU PRAKOSO', nis: '22999', kelas: 'XI-A1', gender: 'L' },
  { id: 'STUDENT_097', name: 'HARYANTO PUTRA PAMUNGKAS', nis: '23003', kelas: 'XI-A1', gender: 'L' },
  { id: 'STUDENT_098', name: 'JANU ARDHITIAN SAPUTRA', nis: '23066', kelas: 'XI-A1', gender: 'L' },
  { id: 'STUDENT_099', name: 'KHOIRUN NISA NURFADILA', nis: '23008', kelas: 'XI-A1', gender: 'P' },
  { id: 'STUDENT_100', name: 'MEILYNA AULIA OKTAVIA', nis: '23013', kelas: 'XI-A1', gender: 'P' },
  { id: 'STUDENT_101', name: 'MOCH. AFIF ROBI\'UL WILDAM', nis: '23016', kelas: 'XI-A1', gender: 'L' },
  { id: 'STUDENT_102', name: 'MOCHAMMAD VICKY FIRMANSYAH', nis: '23019', kelas: 'XI-A1', gender: 'L' },
  { id: 'STUDENT_103', name: 'MUHAMMAD HAKIM SIROOJUDDIN', nis: '23023', kelas: 'XI-A1', gender: 'L' },
  { id: 'STUDENT_104', name: 'NADIRA RAYYA SAKHIA', nis: '23030', kelas: 'XI-A1', gender: 'P' },
  { id: 'STUDENT_105', name: 'NAFISA HINDI NABILA', nis: '23032', kelas: 'XI-A1', gender: 'P' },
  { id: 'STUDENT_106', name: 'NURUL KHARISMA', nis: '23036', kelas: 'XI-A1', gender: 'P' },
  { id: 'STUDENT_107', name: 'SYNTA PUTRI PRAMESTI', nis: '23053', kelas: 'XI-A1', gender: 'P' },
  { id: 'STUDENT_108', name: 'VELISHA PUSPITA DEWI', nis: '23057', kelas: 'XI-A1', gender: 'P' },
  { id: 'STUDENT_109', name: 'VENSYA MARVI CAROLINA', nis: '23056', kelas: 'XI-A1', gender: 'P' },
  { id: 'STUDENT_110', name: 'WALAD MUQQODDAS ISYA\' ANSHORI', nis: '23058', kelas: 'XI-A1', gender: 'L' },
  { id: 'STUDENT_111', name: 'WILLIAM HAFIZ AL AZHAR SANTOSO', nis: '23059', kelas: 'XI-A1', gender: 'L' },
  { id: 'STUDENT_112', name: 'WILSON ABIEZER BOMANTARA', nis: '23060', kelas: 'XI-A1', gender: 'L' },

  // XI-A2
  { id: 'STUDENT_113', name: 'ALVINO RAFFAEL SAPUTRA', nis: '22967', kelas: 'XI-A2', gender: 'L' },
  { id: 'STUDENT_114', name: 'AZZAMAR LOLITHA RIESVY', nis: '22980', kelas: 'XI-A2', gender: 'P' },
  { id: 'STUDENT_115', name: 'BELLA SABRINA', nis: '22983', kelas: 'XI-A2', gender: 'P' },
  { id: 'STUDENT_116', name: 'CHICHA AURELIA BASARAH', nis: '22988', kelas: 'XI-A2', gender: 'P' },
  { id: 'STUDENT_117', name: 'DAVA REYHAN PUTRA ZAINI', nis: '22989', kelas: 'XI-A2', gender: 'L' },
  { id: 'STUDENT_118', name: 'EKO WAHONO WICAKSONO', nis: '22994', kelas: 'XI-A2', gender: 'L' },
  { id: 'STUDENT_119', name: 'FAIRUZ AZLAN KANDATI', nis: '22997', kelas: 'XI-A2', gender: 'L' },
  { id: 'STUDENT_120', name: 'GABRIEL CAESSAR GRACIANO', nis: '22998', kelas: 'XI-A2', gender: 'L' },
  { id: 'STUDENT_121', name: 'KIRANA NAKEILA SEKAR RAHMA', nis: '23009', kelas: 'XI-A2', gender: 'P' },
  { id: 'STUDENT_122', name: 'MAYA F NOYA', nis: '23017', kelas: 'XI-A2', gender: 'P' },
  { id: 'STUDENT_123', name: 'MIRANDA KEYSHA', nis: '23067', kelas: 'XI-A2', gender: 'P' },
  { id: 'STUDENT_124', name: 'MOCHAMAD MUHIB BUDDIN', nis: '23018', kelas: 'XI-A2', gender: 'L' },
  { id: 'STUDENT_125', name: 'MUH ALWI', nis: '23070', kelas: 'XI-A2', gender: 'L' },
  { id: 'STUDENT_126', name: 'MUHAMMAD TEGAR MAULANA', nis: '23027', kelas: 'XI-A2', gender: 'L' },
  { id: 'STUDENT_127', name: 'NABILA ANISA PUTRI', nis: '23029', kelas: 'XI-A2', gender: 'P' },
  { id: 'STUDENT_128', name: 'NOVIA MEGA LESTARI', nis: '23034', kelas: 'XI-A2', gender: 'P' },
  { id: 'STUDENT_129', name: 'PRINCESSA AGATHA RAMADHANI SUGIARTO', nis: '23042', kelas: 'XI-A2', gender: 'P' },
  { id: 'STUDENT_130', name: 'REVANDA KANYA CHRISWANDYTA', nis: '23043', kelas: 'XI-A2', gender: 'P' },
  { id: 'STUDENT_131', name: 'RIZAL ANDRYAN PRASETYA', nis: '23037', kelas: 'XI-A2', gender: 'L' },
  { id: 'STUDENT_132', name: 'SALSABILA DWI JAYANTI', nis: '23045', kelas: 'XI-A2', gender: 'P' },
  { id: 'STUDENT_133', name: 'SELLY AZIZAH', nis: '23047', kelas: 'XI-A2', gender: 'P' },
  { id: 'STUDENT_134', name: 'SYALLOM FIRDAUS PUTRA KRISTIANTO', nis: '23068', kelas: 'XI-A2', gender: 'L' },
  { id: 'STUDENT_135', name: 'SYARIFAH HASANAH', nis: '23052', kelas: 'XI-A2', gender: 'P' },
  { id: 'STUDENT_136', name: 'TEUKU FADHIL ISMAFUTRA', nis: '23054', kelas: 'XI-A2', gender: 'L' },
  { id: 'STUDENT_137', name: 'VICKY MAULANA FERDYAN', nis: '23055', kelas: 'XI-A2', gender: 'L' },
  { id: 'STUDENT_138', name: 'WISNHU BRAWIJAYA AKBAR', nis: '23061', kelas: 'XI-A2', gender: 'L' },
  { id: 'STUDENT_139', name: 'YASMIN LAILIA', nis: '23062', kelas: 'XI-A2', gender: 'P' },

  // XI-B1
  { id: 'STUDENT_140', name: 'AILSA HASNA KHAIRINNISA', nis: '22961', kelas: 'XI-B1', gender: 'P' },
  { id: 'STUDENT_141', name: 'AISYAH INDAH AYU NUR BILQIZ AROFAH', nis: '22962', kelas: 'XI-B1', gender: 'P' },
  { id: 'STUDENT_142', name: 'AISYAH NUZUL ISNA SUBYADHINATA', nis: '22963', kelas: 'XI-B1', gender: 'P' },
  { id: 'STUDENT_143', name: 'ALVARO BIM-BIM PUTRA ANDIKA', nis: '22966', kelas: 'XI-B1', gender: 'L' },
  { id: 'STUDENT_144', name: 'APRIJA PUTRA', nis: '22969', kelas: 'XI-B1', gender: 'L' },
  { id: 'STUDENT_145', name: 'ARKADEO FACHRI ARDANENGGAR', nis: '22972', kelas: 'XI-B1', gender: 'L' },
  { id: 'STUDENT_146', name: 'AVRIZAL RIZKY HIBATULLAH', nis: '22976', kelas: 'XI-B1', gender: 'L' },
  { id: 'STUDENT_147', name: 'AZARINE ASKA RAFIFA', nis: '22978', kelas: 'XI-B1', gender: 'P' },
  { id: 'STUDENT_148', name: 'BADAR IQBAL PRAKOSO', nis: '22981', kelas: 'XI-B1', gender: 'L' },
  { id: 'STUDENT_149', name: 'BAGUS ANDREAS BINTANG MAULANA', nis: '22982', kelas: 'XI-B1', gender: 'L' },
  { id: 'STUDENT_150', name: 'DAVID BAGAS PRASETYO WAHYUDI', nis: '22990', kelas: 'XI-B1', gender: 'L' },
  { id: 'STUDENT_151', name: 'EGA ALEXA PHERIS', nis: '22993', kelas: 'XI-B1', gender: 'P' },
  { id: 'STUDENT_152', name: 'GUSTI AQSHO CHOIRUS ZAMAN', nis: '23046', kelas: 'XI-B1', gender: 'L' },
  { id: 'STUDENT_153', name: 'HANI EKA WAHYUNI', nis: '23064', kelas: 'XI-B1', gender: 'P' },
  { id: 'STUDENT_154', name: 'JIHAN KUSUMA PUTRI', nis: '23002', kelas: 'XI-B1', gender: 'P' },
  { id: 'STUDENT_155', name: 'KEVIN RHEZA MUSTOFA', nis: '23003', kelas: 'XI-B1', gender: 'L' },
  { id: 'STUDENT_156', name: 'MA\'RIFATUS SHOLEHA PUTRI IRAWAN', nis: '23007', kelas: 'XI-B1', gender: 'P' },
  { id: 'STUDENT_157', name: 'MARETHA AYU AURELIA', nis: '23014', kelas: 'XI-B1', gender: 'P' },
  { id: 'STUDENT_158', name: 'MAYANG SARI AGENG MAHESTI', nis: '23015', kelas: 'XI-B1', gender: 'P' },
  { id: 'STUDENT_159', name: 'MUHAMMAD ELHAR DWI SANTOSO', nis: '23063', kelas: 'XI-B1', gender: 'L' },
  { id: 'STUDENT_160', name: 'MUTIA PUTRI RAMADHANTI', nis: '23021', kelas: 'XI-B1', gender: 'P' },
  { id: 'STUDENT_161', name: 'NUR CAHAYANI', nis: '23028', kelas: 'XI-B1', gender: 'P' },
  { id: 'STUDENT_162', name: 'PUTRA HADI ALFATTAH', nis: '23035', kelas: 'XI-B1', gender: 'L' },
  { id: 'STUDENT_163', name: 'RAFKA RAYA ANGKASA', nis: '23044', kelas: 'XI-B1', gender: 'L' },
  { id: 'STUDENT_164', name: 'RIZKI BAGUS IBRAHIM', nis: '23039', kelas: 'XI-B1', gender: 'L' },
  { id: 'STUDENT_165', name: 'SELENA SHAFA PRASETYO', nis: '23038', kelas: 'XI-B1', gender: 'P' },
  { id: 'STUDENT_166', name: 'SILVIA WAHYU KRISTIANTI', nis: '23049', kelas: 'XI-B1', gender: 'P' },
  { id: 'STUDENT_167', name: 'SULTON FATONI', nis: '23051', kelas: 'XI-B1', gender: 'L' },
  { id: 'STUDENT_168', name: 'ADRIAN RIGI WIJAYA', nis: '22959', kelas: 'XI-B1', gender: 'L' },
  { id: 'STUDENT_169', name: 'AILEN CHELLO ALBION', nis: '22960', kelas: 'XI-B1', gender: 'L' },

  // XI-B2
  { id: 'STUDENT_170', name: 'APRILLIA DWI VANESSA SETYOWATI', nis: '22970', kelas: 'XI-B2', gender: 'P' },
  { id: 'STUDENT_171', name: 'AURELLIA AUDRY ZIZI ARTANTI', nis: '22974', kelas: 'XI-B2', gender: 'P' },
  { id: 'STUDENT_172', name: 'AVELLS GABRYEL FARELA', nis: '22975', kelas: 'XI-B2', gender: 'L' },
  { id: 'STUDENT_173', name: 'BILQIS JIHAN RIHADATUL AISY', nis: '22984', kelas: 'XI-B2', gender: 'P' },
  { id: 'STUDENT_174', name: 'DWI RATNA MUSTIKAWATI', nis: '22992', kelas: 'XI-B2', gender: 'P' },
  { id: 'STUDENT_175', name: 'EVA DWI FEBRIANIGRUM', nis: '22995', kelas: 'XI-B2', gender: 'P' },
  { id: 'STUDENT_176', name: 'FAKHRI PUTRA RADITYA', nis: '22996', kelas: 'XI-B2', gender: 'L' },
  { id: 'STUDENT_177', name: 'GITA AYUDYA FERISCA PUTRI', nis: '23000', kelas: 'XI-B2', gender: 'P' },
  { id: 'STUDENT_178', name: 'GWEN ANDREA ATTAHYA SHALOMETA', nis: '23001', kelas: 'XI-B2', gender: 'P' },
  { id: 'STUDENT_179', name: 'JANUARIZKY SAFIRA PUTRI', nis: '23005', kelas: 'XI-B2', gender: 'P' },
  { id: 'STUDENT_180', name: 'LAURA DA SILVA', nis: '23010', kelas: 'XI-B2', gender: 'P' },
  { id: 'STUDENT_181', name: 'LOCITA BELVA AZARIA', nis: '23011', kelas: 'XI-B2', gender: 'P' },
  { id: 'STUDENT_182', name: 'MAHMUDA TRI SYIFA MULYADI', nis: '23012', kelas: 'XI-B2', gender: 'P' },
  { id: 'STUDENT_183', name: 'MUHAMMAD ARIES DWI SATRIO LESMONO', nis: '23020', kelas: 'XI-B2', gender: 'L' },
  { id: 'STUDENT_184', name: 'MUHAMMAD FAIRUZ IKRAM FIRLYANSYAH', nis: '23022', kelas: 'XI-B2', gender: 'L' },
  { id: 'STUDENT_185', name: 'MUHAMMAD RIZAL HIDAYAT', nis: '23025', kelas: 'XI-B2', gender: 'L' },
  { id: 'STUDENT_186', name: 'MUHAMMAD SYAFA\' ARIF ZEIN', nis: '23026', kelas: 'XI-B2', gender: 'L' },
  { id: 'STUDENT_187', name: 'MUHAMMAD TAUFIK FAUZAN', nis: '23031', kelas: 'XI-B2', gender: 'L' },
  { id: 'STUDENT_188', name: 'NADYA LAURA ESFANDIARY', nis: '23033', kelas: 'XI-B2', gender: 'P' },
  { id: 'STUDENT_189', name: 'NAILA AYU SALSABILA', nis: '23072', kelas: 'XI-B2', gender: 'P' },
  { id: 'STUDENT_190', name: 'NURAINI NADA SAVITRI RIAZIN HARYANTO', nis: '23040', kelas: 'XI-B2', gender: 'P' },
  { id: 'STUDENT_191', name: 'SEKAR MAHKOTA RANGKUTI', nis: '23024', kelas: 'XI-B2', gender: 'P' },
  { id: 'STUDENT_192', name: 'SETYANINGTYAS CHANDRA KINASIH', nis: '23048', kelas: 'XI-B2', gender: 'P' },
  { id: 'STUDENT_193', name: 'STEFANUS RICHO RUBEN', nis: '23050', kelas: 'XI-B2', gender: 'L' },
  { id: 'STUDENT_194', name: 'SULTAN MANDALA PUTRA', nis: '23071', kelas: 'XI-B2', gender: 'L' },

  // XII-A
  { id: 'STUDENT_195', name: 'ABRAHAM IQBAL IQLASHANI', nis: '22855', kelas: 'XII-A', gender: 'L' },
  { id: 'STUDENT_196', name: 'ARBIL TRI JUNIARTO', nis: '22856', kelas: 'XII-A', gender: 'L' },
  { id: 'STUDENT_197', name: 'ADELIA KARTIKA AZ ZAHRA', nis: '22857', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_198', name: 'BARBIE ABRILLIAN WIBOWO', nis: '22859', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_199', name: 'CALLISTA ALMIRA RAMADHANI', nis: '22860', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_200', name: 'CEYCILLIA GITA APSARI', nis: '22885', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_201', name: 'CHERREN SALVADITA WIMASYAH PUTRI', nis: '22913', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_202', name: 'CLARESTA MAHARANI PRADIGMA', nis: '22938', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_203', name: 'DEFFAREL RADITYA HANIF', nis: '22861', kelas: 'XII-A', gender: 'L' },
  { id: 'STUDENT_204', name: 'DIANA NAFA NABILA', nis: '22862', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_205', name: 'DWI SAFIRA NURHIDAYAH', nis: '22864', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_206', name: 'FILDA ZAHRA PITALOKA', nis: '22886', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_207', name: 'GRECE BUNGA MARIA', nis: '22940', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_208', name: 'GYOVA MAULANA YUNI PUTRI', nis: '22887', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_209', name: 'JASMINE KANTI LESTARI', nis: '22908', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_210', name: 'JELITTA CAHYA ANGGRAENI', nis: '22918', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_211', name: 'KHULLA SUHITA', nis: '22919', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_212', name: 'LINTANG DIAN ANGGRAENI', nis: '22889', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_213', name: 'MUH.BINTANG DWI SATRIA PERKASA', nis: '22892', kelas: 'XII-A', gender: 'L' },
  { id: 'STUDENT_214', name: 'MUHAMMAD ANGGAR ADI SATYO LESMONO', nis: '22893', kelas: 'XII-A', gender: 'L' },
  { id: 'STUDENT_215', name: 'MUHAMMAD ERICK SAVERA', nis: '22924', kelas: 'XII-A', gender: 'L' },
  { id: 'STUDENT_216', name: 'MUHAMMAD FADEL AKBAR', nis: '22943', kelas: 'XII-A', gender: 'L' },
  { id: 'STUDENT_217', name: 'NAURAVA RADITIYA PUTRI', nis: '22896', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_218', name: 'PUTRI ERI PERTIWI', nis: '22897', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_219', name: 'RAISYA JIHAN SAPHIRA', nis: '22874', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_220', name: 'REVA AULIA ARLANSYA', nis: '22899', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_221', name: 'TERRY OCTAVIA HIDAYAT', nis: '22902', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_222', name: 'TOHROTUL SYAFARIYAH', nis: '22952', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_223', name: 'VIONDA AL FERISKA', nis: '22904', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_224', name: 'WULAN MAISAROH', nis: '22954', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_225', name: 'YASFIYA SANY MACHMUDAH', nis: '22955', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_226', name: 'YOHANES YUWONO', nis: '22956', kelas: 'XII-A', gender: 'L' },
  { id: 'STUDENT_227', name: 'ACHMAD RAVI PRATAMA', nis: '22881', kelas: 'XII-A', gender: 'L' },
  { id: 'STUDENT_228', name: 'ADELIA RAUDHOTUL ZHELLA SHAKTIANA', nis: '22882', kelas: 'XII-A', gender: 'P' },
  { id: 'STUDENT_229', name: 'ALFIN ADI SAPUTRA', nis: '22883', kelas: 'XII-A', gender: 'L' },
  { id: 'STUDENT_230', name: 'ALIM ATHA MAHARDIKA', nis: '22907', kelas: 'XII-A', gender: 'L' },
  { id: 'STUDENT_231', name: 'ANANDA RANIAH PARAMITHA', nis: '22909', kelas: 'XII-A', gender: 'P' },

  // XII-B
  { id: 'STUDENT_232', name: 'ANIDYA DWI MEINATI', nis: '22911', kelas: 'XII-B', gender: 'P' },
  { id: 'STUDENT_233', name: 'ANNASTASYA DELIA PUTRI', nis: '22934', kelas: 'XII-B', gender: 'P' },
  { id: 'STUDENT_234', name: 'BAGAS RADITYA', nis: '22937', kelas: 'XII-B', gender: 'L' },
  { id: 'STUDENT_235', name: 'DIMAS SULTONII', nis: '22863', kelas: 'XII-B', gender: 'L' },
  { id: 'STUDENT_236', name: 'DYAH AYU SITORESMI KURNIAWATI', nis: '22865', kelas: 'XII-B', gender: 'P' },
  { id: 'STUDENT_237', name: 'FITRI NUR AISYAH', nis: '22933', kelas: 'XII-B', gender: 'P' },
  { id: 'STUDENT_238', name: 'INDAH PRAMESTI ISTIYANTI', nis: '22888', kelas: 'XII-B', gender: 'P' },
  { id: 'STUDENT_239', name: 'LOVI YOHANA PRADIPTA', nis: '22869', kelas: 'XII-B', gender: 'P' },
  { id: 'STUDENT_240', name: 'MOCH. IRHAZ RAKA NUGRAHA', nis: '22921', kelas: 'XII-B', gender: 'L' },
  { id: 'STUDENT_241', name: 'MOHAMMAD FERDINAN FADLI RASYID', nis: '22870', kelas: 'XII-B', gender: 'L' },
  { id: 'STUDENT_242', name: 'MOHAMMAD ZACKY SETIAWAN', nis: '22891', kelas: 'XII-B', gender: 'L' },
  { id: 'STUDENT_243', name: 'MUHAMMAD BILFAQIH', nis: '22922', kelas: 'XII-B', gender: 'L' },
  { id: 'STUDENT_244', name: 'MUHAMMAD FARREL ISMAWANTO', nis: '22944', kelas: 'XII-B', gender: 'L' },
  { id: 'STUDENT_245', name: 'MUHAMMAD IQBAL DOVAN ALVARO', nis: '22941', kelas: 'XII-B', gender: 'L' },
  { id: 'STUDENT_246', name: 'MUHAMMAD RAFLI NOVIANTO', nis: '22894', kelas: 'XII-B', gender: 'L' },
  { id: 'STUDENT_247', name: 'MUHAMMAD ZAKI RIVALDO', nis: '22946', kelas: 'XII-B', gender: 'L' },
  { id: 'STUDENT_248', name: 'MUHAMMAD ZIDANE PAMUNGKAS', nis: '22925', kelas: 'XII-B', gender: 'L' },
  { id: 'STUDENT_249', name: 'NAUFAL MAULANA BINTANG PRATAMA', nis: '22926', kelas: 'XII-B', gender: 'L' },
  { id: 'STUDENT_250', name: 'NAZWA AULIA RAHMAN', nis: '22872', kelas: 'XII-B', gender: 'P' },
  { id: 'STUDENT_251', name: 'NUR ISTI KHOMARIA', nis: '22947', kelas: 'XII-B', gender: 'P' },
  { id: 'STUDENT_252', name: 'RAKHA ATA ATMAJAYA', nis: '22898', kelas: 'XII-B', gender: 'L' },
  { id: 'STUDENT_253', name: 'RIDWAN DWI ANDIKA IDRIS', nis: '22900', kelas: 'XII-B', gender: 'L' },
  { id: 'STUDENT_254', name: 'RIZKY PUTRA PRATAMA', nis: '22928', kelas: 'XII-B', gender: 'L' },
  { id: 'STUDENT_255', name: 'SASQIA SHEVA AISYAH', nis: '22901', kelas: 'XII-B', gender: 'P' },
  { id: 'STUDENT_256', name: 'SEPVIAN ADITYA RAMADHAN', nis: '22949', kelas: 'XII-B', gender: 'L' },
  { id: 'STUDENT_257', name: 'TINO AHMAD SHOLIQIN', nis: '22951', kelas: 'XII-B', gender: 'L' },
  { id: 'STUDENT_258', name: 'TRI RIYADHI W MARASABESSY', nis: '22953', kelas: 'XII-B', gender: 'L' },
  { id: 'STUDENT_259', name: 'ZAHRATUL AMALYYAH', nis: '22905', kelas: 'XII-B', gender: 'P' },

  // XII-C
  { id: 'STUDENT_260', name: 'ALYA OKTAVIA RAMADHANI', nis: '22884', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_261', name: 'ANGGA ARDHY MIKOLA', nis: '22910', kelas: 'XII-C', gender: 'L' },
  { id: 'STUDENT_262', name: 'AZAHRA FELICIA HARTANADI PAHLAWI', nis: '22936', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_263', name: 'BUNGA CINTARY BILLAH', nis: '22912', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_264', name: 'DESI CITRA FEBRIANI', nis: '22914', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_265', name: 'DYAH AYU RAMADHANI', nis: '22915', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_266', name: 'FELICIA ELLA PURNOMO', nis: '22916', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_267', name: 'GRACELLA MUTIARA JOHANA SIHOMBING', nis: '22939', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_268', name: 'GREGORIA SELAMARA MIARNARDO', nis: '22866', kelas: 'XII-C', gender: 'L' },
  { id: 'STUDENT_269', name: 'INTAN PERMATADEWI', nis: '22917', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_270', name: 'JUAN ROMAN IBRAHIMOVIC', nis: '22867', kelas: 'XII-C', gender: 'L' },
  { id: 'STUDENT_271', name: 'KARIN APRILIA TRILESTARI', nis: '22942', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_272', name: 'LAILATUL MUFARROHAH', nis: '22920', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_273', name: 'MARSYA MECCA CAHYATI', nis: '22890', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_274', name: 'MUHAMMAD RASYA NOVALDO SUBIANTORO', nis: '22945', kelas: 'XII-C', gender: 'L' },
  { id: 'STUDENT_275', name: 'MUHAMMAD VIKA IZZUL ISLAM', nis: '22874', kelas: 'XII-C', gender: 'L' },
  { id: 'STUDENT_276', name: 'MUHAMMAD YUSUF HIDAYATULLAH', nis: '22895', kelas: 'XII-C', gender: 'L' },
  { id: 'STUDENT_277', name: 'NONA ARI ZASKIA RISJAYANTI', nis: '22873', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_278', name: 'PUTRI ANGGUN FEBRIYANTI', nis: '22948', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_279', name: 'RHEZA ALVAREZHI ANANDA ASVA', nis: '22927', kelas: 'XII-C', gender: 'L' },
  { id: 'STUDENT_280', name: 'ROSSA ZAHROTUSYTA ISWARA', nis: '22929', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_281', name: 'SAMANTHA CHRISTABELLE SINGGIH', nis: '22880', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_282', name: 'SANDHI SETIYADI', nis: '22930', kelas: 'XII-C', gender: 'L' },
  { id: 'STUDENT_283', name: 'SOFIYAH', nis: '22950', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_284', name: 'TIO IVAN MAULUDIN', nis: '22875', kelas: 'XII-C', gender: 'L' },
  { id: 'STUDENT_285', name: 'TRI PARAMA PURUSHA KHAYUMAN', nis: '22931', kelas: 'XII-C', gender: 'L' },
  { id: 'STUDENT_286', name: 'VERY AGUS SUPRIATNA', nis: '22903', kelas: 'XII-C', gender: 'L' },
  { id: 'STUDENT_287', name: 'WARDAH AMELIA HARDIANTI', nis: '22876', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_288', name: 'WISNU TRIAMBODO PUTRO PAMUNGKAS', nis: '22878', kelas: 'XII-C', gender: 'L' },
  { id: 'STUDENT_289', name: 'ZAHYRA FAHTANIA ADINI PUTRI', nis: '22932', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_290', name: 'ZALFA ADINDA NUR SAFITRI', nis: '22958', kelas: 'XII-C', gender: 'P' },
  { id: 'STUDENT_291', name: 'ZASKIA SEPTI ARIEF RACHMADANI', nis: '22879', kelas: 'XII-C', gender: 'P' }
].map(s => ({...s, gender: s.gender as 'L' | 'P', name: formatProperName(s.name)}));

function randomSeeded(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

export function generate291Students(): Student[] {
  const students: Student[] = [];

  RAW_STUDENTS_LIST.forEach((raw, index) => {
    const seed = index * 17 + raw.name.charCodeAt(0) + raw.name.charCodeAt(raw.name.length - 1);

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
      ? `${raw.name} menunjukkan perkembangan mendalam pada aspek ${mainStrengths.join(' serta ')}.`
      : `${raw.name} menunjukkan perkembangan yang baik dan stabil di semua aspek nilai Kartika.`;

    const improvementText = areasToImprove.length > 0
      ? `Perlu sedikit motivasi tambahan pada aspek ${areasToImprove.join(' dan ')}.`
      : 'Pertahankan konsistensi perilaku positif ini.';

    const kesimpulan = `${strengthText} Secara keseluruhan, pencapaian 5NK (Cinta Tanah Air, Disiplin, Berbudi Luhur, Cerdas, Terampil) berkembang sangat harmonis. ${improvementText}`;
    const catatanWali = `Sangat bangga dengan kepribadian ${raw.name}. Tingkatkan prestasi belajar di semester berikutnya!`;
    const catatanOrangTua = ``;

    students.push({
      id: raw.id,
      name: raw.name,
      nis: raw.nis,
      kelas: raw.kelas,
      gender: raw.gender,
      semester: 'Semester II (Genap)',
      grades,
      kesimpulan,
      catatanWali,
      catatanOrangTua,
      completed: index % 5 !== 0 // 4/5 are already marked filled as helpful starter
    });
  });

  return students;
}

export function reconcileStudentsList(parsed: Student[]): Student[] {
  const classMap: Record<string, string> = {
    'XI-A': 'XI-A1',
    'XI-B': 'XI-A2',
    'XI-C': 'XI-B1',
    'XI-D': 'XI-B2',
    'XII-D': 'XII-C'
  };

  const updatedStudents = parsed.map(s => {
    const actualClass = classMap[s.kelas] || s.kelas;
    
    // Clear parental comment if it's the old template system comment
    let cleanedOrangTua = s.catatanOrangTua || '';
    if (
      cleanedOrangTua.includes('Alhamdulillah') || 
      cleanedOrangTua.includes('Wali Kelas atas laporannya') ||
      cleanedOrangTua.includes('komitmen penuh membimbingnya')
    ) {
      cleanedOrangTua = '';
    }

    return {
      ...s,
      name: (s.name || '').trim(),
      kelas: actualClass,
      catatanOrangTua: cleanedOrangTua
    };
  });

  return updatedStudents.sort((a, b) => {
    const clsA = (a.kelas || '').toLowerCase();
    const clsB = (b.kelas || '').toLowerCase();
    if (clsA < clsB) return -1;
    if (clsA > clsB) return 1;
    return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
  });
}

export function reconcileTeachersList(parsed: Teacher[]): Teacher[] {
  const classMap: Record<string, string> = {
    'XI-A': 'XI-A1',
    'XI-B': 'XI-A2',
    'XI-C': 'XI-B1',
    'XI-D': 'XI-B2',
    'XII-D': 'XII-C'
  };

  let updated: Teacher[] = parsed.map(t => {
    const actualClass = t.classAssigned ? (classMap[t.classAssigned] || t.classAssigned) : undefined;
    return {
      ...t,
      name: formatProperName(t.name),
      classAssigned: actualClass
    };
  });

  // Automatically add Wali Kelas X-D if missing from the user's saved list
  const hasXDTeacher = updated.some(t => t.classAssigned === 'X-D');
  if (!hasXDTeacher) {
    const xdTeacher = TEACHERS_LIST.find(t => t.classAssigned === 'X-D');
    if (xdTeacher && !updated.some(t => t.id === xdTeacher.id)) {
      updated.push(xdTeacher);
    }
  }
  return updated;
}

// Function to read from Local Storage or load fresh generated list
export function getSavedStudents(): Student[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('rapor_5nk_students');
  if (stored) {
    try {
      const parsed: Student[] = JSON.parse(stored);

      // Auto-detect if user has the old/mock database and migrate them to the real 291 student database!
      const isWiped = localStorage.getItem('rapor_5nk_database_wiped') === 'true';
      if (!isWiped && (parsed.length === 0 || (parsed.length > 0 && parsed[0].id === 'STUDENT_001' && parsed[0].name !== 'ABRILIAN MAULANA MAXCELO') || parsed.length > 300)) {
        const fresh = generate291Students();
        localStorage.setItem('rapor_5nk_students', JSON.stringify(fresh));
        localStorage.setItem('rapor_5nk_teachers', JSON.stringify(TEACHERS_LIST));
        return fresh;
      }

      const reconciled = reconcileStudentsList(parsed);
      localStorage.setItem('rapor_5nk_students', JSON.stringify(reconciled));
      return reconciled;
    } catch (e) {
      console.error('Error parsing stored data, resetting:', e);
    }
  }
  const isWiped = localStorage.getItem('rapor_5nk_database_wiped') === 'true';
  if (isWiped) return [];
  const fresh = reconcileStudentsList(generate291Students());
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

      // Auto-detect if user has the old/mock teacher list and migrate them to the real 33 teacher list!
      const isWiped = localStorage.getItem('rapor_5nk_database_wiped') === 'true';
      if (!isWiped && parsed.length < 33) {
        localStorage.setItem('rapor_5nk_teachers', JSON.stringify(TEACHERS_LIST));
        return TEACHERS_LIST;
      }
      const reconciled = reconcileTeachersList(parsed);
      localStorage.setItem('rapor_5nk_teachers', JSON.stringify(reconciled));
      return reconciled;
    } catch (e) {
      console.error('Error parsing stored teacher data:', e);
    }
  }
  // Fallback to static TEACHERS_LIST
  const isWiped = localStorage.getItem('rapor_5nk_database_wiped') === 'true';
  if (isWiped) return [];
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
  koordinator: 'KOREM 084',
  cabang: 'IV BRAWIJAYA',
  namaSekolah: 'SMA KARTIKA IV-3 SURABAYA',
  alamat: 'Jl. Brawijaya No.38',
  tahunAjaran: '2025 - 2026',
  logoUrl: kartikaLogoUrl,
  signatureTeacherUrl: '',
  signatureParentUrl: '',
  showPageNumbering: true
};

export function getSavedKopSekolah(): KopSekolah {
  if (typeof window === 'undefined') return DEFAULT_KOP;
  const stored = localStorage.getItem('rapor_5nk_kop');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Auto-migrate address and logo to the new perfect school details requested by user
      if (!parsed.alamat || parsed.alamat.includes('Karah Agung') || parsed.alamat.includes('Jambangan') || parsed.alamat !== 'Jl. Brawijaya No.38') {
        parsed.alamat = 'Jl. Brawijaya No.38';
      }
      if (!parsed.logoUrl || parsed.logoUrl === '' || parsed.logoUrl === 'logo_sma_kartika' || parsed.logoUrl.includes('kartika_logo_1781521083739.jpg') || parsed.logoUrl !== kartikaLogoUrl) {
        parsed.logoUrl = kartikaLogoUrl;
      }
      localStorage.setItem('rapor_5nk_kop', JSON.stringify(parsed));
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

