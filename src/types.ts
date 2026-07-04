export type ScoreKey = 'BSB' | 'B' | 'MB' | 'BB';

export interface HeaderProfile {
  id: string;
  name: string; // e.g. "Profil Header Standard", "Profil Header Ujian"
  yayasan: string;
  koordinator: string;
  cabang: string;
  namaSekolah: string;
  alamat: string;
  logoUrl: string;
  isActive: boolean;
}

export interface FooterProfile {
  id: string;
  name: string; // e.g. "Profil Footer Standard"
  text: string;
  isActive: boolean;
}

export interface KopSekolah {
  yayasan: string;
  koordinator: string;
  cabang: string;
  namaSekolah: string;
  alamat: string;
  tahunAjaran: string;
  logoUrl: string;
  signatureTeacherUrl?: string;
  signatureParentUrl?: string;
  signatureHeadmasterUrl?: string;
  enableSignatureHeadmaster?: boolean;
  signatureWaliKelasUrl?: string;
  namaKepalaSekolah?: string;
  nipKepalaSekolah?: string;
  showPageNumbering?: boolean;
  templateNotes?: string[];
  customFooterText?: string;
  enableAutoDate?: boolean;
  forcedOrientation?: 'auto' | 'portrait' | 'landscape';
  enableHeader?: boolean; // Master switch to enable/disable Header
  enableFooter?: boolean; // Master switch to enable/disable Footer
  customHeadersList?: HeaderProfile[]; // CRUD custom headers
  customFootersList?: FooterProfile[]; // CRUD custom footers
}

export interface ScoreOption {
  key: ScoreKey;
  label: string;
  description: string;
}

export interface Indicator {
  id: string;
  text: string;
}

export interface Category {
  id: string;
  name: string;
  indicators: Indicator[];
}

export interface Teacher {
  id: string;
  name: string;
  role: string;
  classAssigned?: string;
  nip?: string;
  signatureUrl?: string;
}

export interface Student {
  id: string;
  name: string;
  nis: string;
  kelas: string;
  gender: 'L' | 'P';
  semester: string;
  grades: Record<string, ScoreKey>; // maps indicator.id to ScoreKey
  kesimpulan: string;
  catatanWali: string;
  catatanOrangTua?: string;
  completed: boolean;
  printStatus?: boolean; // Tracks if a student has been printed or exported
}

export const scoreOptions: ScoreOption[] = [
  {
    key: 'BSB',
    label: 'Berkembang Sangat Baik',
    description: 'Konsisten menunjukkan perilaku sesuai indikator tanpa perlu diingatkan.',
  },
  {
    key: 'B',
    label: 'Berkembang Sesuai Harapan (BSH)',
    description: 'Menunjukkan perilaku sesuai indikator dengan sedikit arahan.',
  },
  {
    key: 'MB',
    label: 'Mulai Berkembang',
    description: 'Perlu sering diingatkan untuk menunjukkan perilaku sesuai indikator.',
  },
  {
    key: 'BB',
    label: 'Belum Berkembang',
    description: 'Memerlukan bimbingan intensif untuk menunjukkan perilaku sesuai indikator.',
  },
];

export const CATEGORIES_DATA: Category[] = [
  {
    id: 'CTA',
    name: 'Cinta Tanah Air',
    indicators: [
      { id: 'CTA1', text: 'Menginisiasi atau terlibat dalam proyek pelestarian budaya lokal.' },
      { id: 'CTA2', text: 'Mengapresiasi dan menggunakan produk-produk dalam negeri.' },
      { id: 'CTA3', text: 'Berperan serta dalam kegiatan sosial yang mendukung kesejahteraan masyarakat sekitar.' },
    ],
  },
  {
    id: 'DSP',
    name: 'Disiplin',
    indicators: [
      { id: 'DSP1', text: 'Menetapkan dan mencapai target belajar pribadi sesuai dengan jadwal yang ditetapkan.' },
      { id: 'DSP2', text: 'Menunjukkan tanggung jawab dalam menyelesaikan tugas individu dan kelompok tepat waktu.' },
      { id: 'DSP3', text: 'Mengembangkan kebiasaan belajar mandiri dan konsisten.' },
    ],
  },
  {
    id: 'BBL',
    name: 'Berbudi Luhur',
    indicators: [
      { id: 'BBL1', text: 'Mengambil inisiatif dalam kegiatan sosial yang membantu masyarakat sekitar.' },
      { id: 'BBL2', text: 'Menjaga etika dalam penggunaan media sosial dan komunikasi digital.' },
      { id: 'BBL3', text: 'Menghindari dan menentang segala bentuk diskriminasi dan intoleransi.' },
    ],
  },
  {
    id: 'CRD',
    name: 'Cerdas',
    indicators: [
      { id: 'CRD1', text: 'Mampu mengintegrasikan pengetahuan dari berbagai disiplin ilmu untuk menyelesaikan masalah.' },
      { id: 'CRD2', text: 'Menunjukkan kreativitas dalam mengembangkan ide dan solusi inovatif.' },
      { id: 'CRD3', text: 'Mengaplikasikan pengetahuan akademik dalam konteks praktis dan kehidupan sehari-hari.' },
    ],
  },
  {
    id: 'TRM',
    name: 'Terampil',
    indicators: [
      { id: 'TRM1', text: 'Mengembangkan keterampilan kewirausahaan melalui proyek atau usaha mandiri.' },
      { id: 'TRM2', text: 'Menunjukkan kemampuan adaptasi terhadap perubahan dan tantangan baru.' },
      { id: 'TRM3', text: 'Menghasilkan karya atau produk yang memiliki nilai tambah dan bermanfaat bagi masyarakat.' },
    ],
  },
];
