import { useState, useId, FormEvent, useRef, useEffect, ChangeEvent } from 'react';
import { Student, Teacher, Category, Indicator, ScoreKey, KopSekolah } from '../types';
import { SCHOOL_CLASSES, DEFAULT_KOP } from '../data';
import { exportDatabaseBackupConfig, parseExcelDatabase, uploadExcelToGoogleDrive, encryptData, decryptData } from '../utils';
import { initAuth, googleSignIn, getAccessToken, logout } from '../firebase';
import { 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  Plus, 
  Check, 
  HelpCircle, 
  Award,
  BookOpen,
  UserCheck,
  Hash,
  ListFilter,
  Users,
  Building2,
  Save,
  Download,
  Upload,
  Lock,
  Unlock
} from 'lucide-react';

interface DatabaseCrudProps {
  students: Student[];
  onUpdateStudents: (students: Student[]) => void;
  teachers: Teacher[];
  onUpdateTeachers: (teachers: Teacher[]) => void;
  categories: Category[];
  onUpdateCategories: (categories: Category[]) => void;
  kopSekolah: KopSekolah;
  onUpdateKopSekolah: (kop: KopSekolah) => void;
  selectedClass: string;
  classes: string[];
  onUpdateClasses: (classes: string[]) => void;
}

export default function DatabaseCrud({
  students,
  onUpdateStudents,
  teachers,
  onUpdateTeachers,
  categories,
  onUpdateCategories,
  kopSekolah,
  onUpdateKopSekolah,
  selectedClass,
  classes,
  onUpdateClasses,
}: DatabaseCrudProps) {
  const [activeSubTab, setActiveSubTab] = useState<'siswa' | 'guru' | 'indikator' | 'kop' | 'backup'>('siswa');
  const [siswaSearch, setSiswaSearch] = useState('');
  const [guruSearch, setGuruSearch] = useState('');
  
  // Custom states for class additions
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  // Password-based Encrypted JSON backup controls
  const [backupPassword, setBackupPassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // Kop Sekolah Edit State
  const [editKop, setEditKop] = useState<KopSekolah>(kopSekolah);
  
  // Modals / Editor states
  const [editingSiswa, setEditingSiswa] = useState<Student | null>(null);
  const [isSiswaFormOpen, setIsSiswaFormOpen] = useState(false);
  const [newSiswa, setNewSiswa] = useState<Partial<Student>>({
    name: '',
    nis: '',
    kelas: selectedClass,
    gender: 'L',
    semester: 'Semester II (Genap)',
    kesimpulan: '',
    catatanWali: '',
    catatanOrangTua: '',
  });

  const [editingGuru, setEditingGuru] = useState<Teacher | null>(null);
  const [isGuruFormOpen, setIsGuruFormOpen] = useState(false);
  const [newGuru, setNewGuru] = useState<Partial<Teacher>>({
    name: '',
    nip: '',
    role: 'Wali Kelas',
    classAssigned: '',
  });

  const [editingIndicator, setEditingIndicator] = useState<{ catId: string; ind: Indicator } | null>(null);
  const [isIndicatorFormOpen, setIsIndicatorFormOpen] = useState(false);
  const [currentCatIdForInd, setCurrentCatIdForInd] = useState('');
  const [newIndText, setNewIndText] = useState('');

  // ----------------- SISWA CRUD OPERATIONS -----------------
  const filteredStudentsByClass = students.filter(s => s.kelas === selectedClass && 
    (s.name.toLowerCase().includes(siswaSearch.toLowerCase()) || s.nis.includes(siswaSearch))
  );

  const handleOpenAddSiswa = () => {
    // Generate realistic starting NIS
    const classIndex = classes.indexOf(selectedClass);
    const classInfix = (classIndex < 4) ? '10' : (classIndex < 8) ? '11' : '12';
    const num = students.length + 1;
    const suggestedNis = `2024${classInfix}${String(num).padStart(3, '0')}`;
    
    setEditingSiswa(null);
    setNewSiswa({
      name: '',
      nis: suggestedNis,
      kelas: selectedClass,
      gender: 'L',
      semester: 'Semester II (Genap)',
      kesimpulan: 'Siswa menunjukkan antusiasme yang luar biasa dan tekad kuat untuk terus berprestasi. Perkembangan moral dan akademik berjalan seimbang serta berkembang ideal.',
      catatanWali: 'Uraian motivasi bagimu agar tangkas belajar di semester berikutnya! Tingkatkan terus prestasimu!',
      catatanOrangTua: 'Alhamdulillah, kami pantau terus perkembangan anak. Terima kasih bimbingan bapak/ibu Guru.',
    });
    setIsSiswaFormOpen(true);
  };

  const handleOpenEditSiswa = (s: Student) => {
    setEditingSiswa(s);
    setNewSiswa({ ...s });
    setIsSiswaFormOpen(true);
  };

  const handleSaveSiswa = (e: FormEvent) => {
    e.preventDefault();
    if (!newSiswa.name || !newSiswa.nis) {
      alert('Nama dan NIS wajib diisi!');
      return;
    }

    // 🛡   Integritas Data: NIS harus unik (Tidak boleh ganda)
    const normalizedNis = (newSiswa.nis || '').trim();
    const isNisDuplicate = students.some(s => s.nis.trim() === normalizedNis && s.id !== editingSiswa?.id);
    if (isNisDuplicate) {
      alert(`VALIDASI GAGAL:\nNIS "${normalizedNis}" sudah terdaftar pada siswa lain di database!\n\nTiap siswa wajib memiliki Nomor Induk Siswa (NIS) unik agar korelasi rapor tidak tertukar.`);
      return;
    }

    if (editingSiswa) {
      // Update existing
      const updated = students.map(s => {
        if (s.id === editingSiswa.id) {
          return {
            ...s,
            name: newSiswa.name!,
            nis: newSiswa.nis!,
            kelas: newSiswa.kelas!,
            gender: newSiswa.gender!,
            kesimpulan: newSiswa.kesimpulan || '',
            catatanWali: newSiswa.catatanWali || '',
            catatanOrangTua: newSiswa.catatanOrangTua || '',
          };
        }
        return s;
      });
      onUpdateStudents(updated);
    } else {
      // Create new
      const nextId = `STUDENT_${String(students.length + 1).padStart(3, '0')}`;
      const fresh: Student = {
        id: nextId,
        name: newSiswa.name!,
        nis: newSiswa.nis!,
        kelas: newSiswa.kelas!,
        gender: newSiswa.gender!,
        semester: newSiswa.semester!,
        grades: {}, // Starts empty
        kesimpulan: newSiswa.kesimpulan || '',
        catatanWali: newSiswa.catatanWali || '',
        catatanOrangTua: newSiswa.catatanOrangTua || '',
        completed: false
      };
      onUpdateStudents([...students, fresh]);
    }
    setIsSiswaFormOpen(false);
    setEditingSiswa(null);
  };

  const handleDeleteSiswa = (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus siswa "${name}" dari database? Tindakan ini permanen.`)) {
      onUpdateStudents(students.filter(s => s.id !== id));
    }
  };

  // ----------------- GURU CRUD OPERATIONS -----------------
  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(guruSearch.toLowerCase()) || 
    t.role.toLowerCase().includes(guruSearch.toLowerCase()) || 
    (t.nip && t.nip.includes(guruSearch))
  );

  const handleOpenAddGuru = () => {
    setEditingGuru(null);
    setNewGuru({
      name: '',
      nip: '',
      role: 'Wali Kelas',
      classAssigned: '',
    });
    setIsGuruFormOpen(true);
  };

  const handleOpenAddWaliKelasForCurrentClass = () => {
    setEditingGuru(null);
    setNewGuru({
      name: '',
      nip: '',
      role: 'Wali Kelas',
      classAssigned: selectedClass,
    });
    setIsGuruFormOpen(true);
  };

  const handleAddClassSubmit = (className: string) => {
    const trimmed = className.trim().toUpperCase();
    if (!trimmed) {
      alert('Nama kelas tidak boleh kosong!');
      return;
    }
    if (classes.includes(trimmed)) {
      alert(`VALIDASI GAGAL:\nKelas "${trimmed}" sudah terdaftar di database!`);
      return;
    }
    const updated = [...classes, trimmed];
    onUpdateClasses(updated);
    setIsAddClassModalOpen(false);
    setNewClassName('');
  };

  const handleOpenEditGuru = (g: Teacher) => {
    setEditingGuru(g);
    setNewGuru({ ...g });
    setIsGuruFormOpen(true);
  };

  const handleSaveGuru = (e: FormEvent) => {
    e.preventDefault();
    if (!newGuru.name) {
      alert('Nama Guru wajib diisi!');
      return;
    }

    // 🛡   Integritas Data: Validasi Format NIP Guru (Harus 18 digit bila tidak kosong / '-')
    const cleanedNip = (newGuru.nip || '').trim().replace(/\s+/g, '');
    if (cleanedNip && cleanedNip !== '-' && !/^\d{18}$/.test(cleanedNip)) {
      alert('VALIDASI GAGAL:\nFormat NIP Guru salah! Nomor Induk Pegawai (NIP) bagi PNS di Indonesia harus tepat terdiri dari 18 digit angka.\n\nContoh format baku: 198203112009121002\n(Arti: Lahir 11-03-1982, Pengangkatan 12-2009, Gender Laki-laki [1], Nomor Urut 002)');
      return;
    }

    if (editingGuru) {
      // Update
      const updated = teachers.map(t => {
        if (t.id === editingGuru.id) {
          return {
            ...t,
            name: newGuru.name!,
            nip: newGuru.nip || '-',
            role: newGuru.role!,
            classAssigned: newGuru.classAssigned || undefined
          };
        }
        return t;
      });
      onUpdateTeachers(updated);
    } else {
      // Create
      const nextId = `TEACHER_${String(teachers.length + 1).padStart(3, '0')}`;
      const fresh: Teacher = {
        id: nextId,
        name: newGuru.name!,
        nip: newGuru.nip || '-',
        role: newGuru.role!,
        classAssigned: newGuru.classAssigned || undefined
      };
      onUpdateTeachers([...teachers, fresh]);
    }
    setIsGuruFormOpen(false);
    setEditingGuru(null);
  };

  const handleDeleteGuru = (id: string, name: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus Guru "${name}" dari database?`)) {
      onUpdateTeachers(teachers.filter(t => t.id !== id));
    }
  };

  // ----------------- INDIKATOR CRUD OPERATIONS -----------------
  const handleOpenAddIndicator = (catId: string) => {
    // Generate logical ID e.g. CTA4, DSP4
    const category = categories.find(c => c.id === catId);
    let nextNum = 1;
    if (category) {
      nextNum = category.indicators.length + 1;
    }
    const suggestedId = `${catId}${nextNum}`;

    setEditingIndicator(null);
    setCurrentCatIdForInd(catId);
    setNewIndText('');
    setEditingIndicator({
      catId,
      ind: { id: suggestedId, text: '' }
    });
    setIsIndicatorFormOpen(true);
  };

  const handleOpenEditIndicator = (catId: string, ind: Indicator) => {
    setEditingIndicator({ catId, ind });
    setCurrentCatIdForInd(catId);
    setNewIndText(ind.text);
    setIsIndicatorFormOpen(true);
  };

  const handleSaveIndicator = (e: FormEvent) => {
    e.preventDefault();
    if (!newIndText) {
      alert('Teks pernyataan indikator wajib diisi!');
      return;
    }

    if (!editingIndicator) return;

    const { catId, ind } = editingIndicator;
    
    // Check if edits or adding new
    const isNew = !categories.flatMap(c => c.indicators).some(i => i.id === ind.id);

    const updatedCategories = categories.map(cat => {
      if (cat.id === catId) {
        if (isNew) {
          return {
            ...cat,
            indicators: [...cat.indicators, { id: ind.id, text: newIndText }]
          };
        } else {
          return {
            ...cat,
            indicators: cat.indicators.map(i => i.id === ind.id ? { ...i, text: newIndText } : i)
          };
        }
      }
      return cat;
    });

    onUpdateCategories(updatedCategories);
    setIsIndicatorFormOpen(false);
    setEditingIndicator(null);
  };

  const handleDeleteIndicator = (catId: string, indId: string, text: string) => {
    if (window.confirm(`WASPADA: Menghapus indikator "${indId}" akan menghapus kaitan nilai indikator ini di seluruh rapor siswa. Apakah Anda yakin ingin menghapusnya?\n\nIndikator: "${text}"`)) {
      // Remove from categories
      const updatedCategories = categories.map(cat => {
        if (cat.id === catId) {
          return {
            ...cat,
            indicators: cat.indicators.filter(i => i.id !== indId)
          };
        }
        return cat;
      });
      onUpdateCategories(updatedCategories);

      // Clean up score records from all students
      const cleanedStudents = students.map(s => {
        const nextGrades = { ...s.grades };
        delete nextGrades[indId];
        return {
          ...s,
          grades: nextGrades
        };
      });
      onUpdateStudents(cleanedStudents);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, t) => {
        setToken(t);
        setNeedsAuth(false);
      },
      () => setNeedsAuth(true)
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Login failed:', err);
      alert('Gagal autentikasi dengan Google');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleExportDatabase = () => {
    exportDatabaseBackupConfig(students, teachers);
  };

  const handleBackupToDrive = async () => {
    if (needsAuth || !token) {
      alert('Silahkan Sign in ke Google terlebih dahulu sebelum melakukan backup ke Drive.');
      return;
    }
    
    const confirmBackup = window.confirm('Apakah Anda yakin ingin melakukan sinkronisasi backup master data Rapor 5NK ke akun Google Drive Anda?');
    if (!confirmBackup) return;

    try {
      await uploadExcelToGoogleDrive(students, teachers, token);
      alert('Berhasil! File Master Database Rapor 5NK telah disimpan ke Google Drive Anda.');
    } catch (e) {
      console.error(e);
      alert('Gagal upload ke Google Drive. Coba sign in ulang.');
      setNeedsAuth(true); // Token might be expired
    }
  };

  const handleImportDatabaseAction = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await parseExcelDatabase(file);
      
      // 🛡️ Enforce NIS Duplicate & Format Integrity Checks during Impor
      let validStudents = data.students || [];
      let validTeachers = data.teachers || [];

      if (validStudents.length > 0) {
        const nisSet = new Set<string>();
        const duplicates: string[] = [];
        const missingNis: string[] = [];
        
        validStudents = validStudents.filter(s => {
          const nis = (s.nis || '').trim();
          if (!nis) {
            missingNis.push(s.name);
            return false;
          }
          if (nisSet.has(nis)) {
            duplicates.push(`${s.name} (NIS: ${nis})`);
            return false;
          }
          nisSet.add(nis);
          return true;
        });

        if (missingNis.length > 0) {
          alert(`PERINGATAN IMPOR:\nAda ${missingNis.length} siswa yang tidak memiliki NIS dalam file Excel Anda dan otomatis dilewatkan demi integritas database.`);
        }

        if (duplicates.length > 0) {
          alert(`INTEGRITAS DATA TERANCAM:\nDitemukan ${duplicates.length} siswa dengan NIS ganda di file Excel:\n\n${duplicates.slice(0, 5).join('\n')}${duplicates.length > 5 ? '\n...dan sisa lainnya' : ''}\n\nSiswa-siswa dengan NIS ganda tersebut secara otomatis dilewatkan untuk mencegah tabrakan data.`);
        }
      }

      if (validTeachers.length > 0) {
        const invalidNip: string[] = [];
        validTeachers.forEach(t => {
          const cleanedNip = (t.nip || '').trim().replace(/\s+/g, '');
          if (cleanedNip && cleanedNip !== '-' && !/^\d{18}$/.test(cleanedNip)) {
            invalidNip.push(`${t.name} (NIP: ${t.nip})`);
            t.nip = '-'; // Auto repair to secure fallback
          }
        });

        if (invalidNip.length > 0) {
          alert(`PERBAIKAN FORMAT OTOMATIS (NIP GURU):\nDitemukan ${invalidNip.length} guru dengan format NIP tidak valid (harus persis 18 digit angka):\n\n${invalidNip.slice(0, 5).join('\n')}${invalidNip.length > 5 ? '\n...dan sisa lainnya' : ''}\n\nSistem secara otomatis mengubah nilai tersebut ke default '-' agar dapat tersimpan dengan aman.`);
        }
      }

      if (validStudents.length === 0 && validTeachers.length === 0) {
        alert('Gagal mengimpor: Tidak ditemukan baris data siswa atau guru yang valid di file Excel.');
        return;
      }

      if (validStudents.length > 0) {
        onUpdateStudents(validStudents);
      }
      if (validTeachers.length > 0) {
        onUpdateTeachers(validTeachers);
      }
      alert('Impor database berhasil diload dari Excel dan divalidasi dengan aman!');
    } catch (error) {
      console.error(error);
      alert('Gagal mengimpor database, pastikan format excel sesuai dengan hasil export.');
    }
    
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDirectEncryptedBackup = () => {
    const password = window.prompt(
      "AMANKAN DATABASE OFFLINE (JSON TERENKRIPSI):\n" +
      "Tentukan kata sandi/PIN untuk mengenkripsi file backup Anda.\n" +
      "Tinggalkan kosong untuk menggunakan sandi pengaman bawaan.",
      ""
    );
    if (password === null) return; // cancelled

    const payload = {
      students,
      teachers,
      categories,
      kopSekolah,
      timestamp: new Date().toISOString()
    };
    
    try {
      const jsonString = JSON.stringify(payload);
      const cipherText = encryptData(jsonString, password || 'KARTIKA_5NK_DEFAULT_SALT');
      
      const blob = new Blob([cipherText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ENC_BACKUP_5NK_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert('DATABASE SUKSES DI-BACKUP!\n\nFile JSON terenkripsi buatan Anda telah berhasil disimpan offline ke komputer.');
    } catch (err: any) {
      alert(`Gagal membuat backup terenkripsi: ${err.message}`);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col h-full overflow-hidden">
      <input 
        type="file" 
        accept=".xlsx, .xls" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleImportDatabaseAction} 
      />
      
      {/* Dynamic Sub Tab Toggle */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-col xl:flex-row gap-3 justify-between items-stretch xl:items-center no-print">
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setActiveSubTab('siswa')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer select-none border transition-colors ${
              activeSubTab === 'siswa' 
                ? 'bg-white text-slate-800 border-slate-200 shadow-xs' 
                : 'text-slate-500 hover:bg-slate-200/50 border-transparent'
            }`}
          >
            🧑‍🎓 Siswa Kelas {selectedClass}
          </button>
          <button
            onClick={() => setActiveSubTab('guru')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer select-none border transition-colors ${
              activeSubTab === 'guru' 
                ? 'bg-white text-slate-800 border-slate-200 shadow-xs' 
                : 'text-slate-500 hover:bg-slate-200/50 border-transparent'
            }`}
          >
            👩‍🏫 Roster Guru
          </button>
          <button
            onClick={() => setActiveSubTab('indikator')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer select-none border transition-colors ${
              activeSubTab === 'indikator' 
                ? 'bg-white text-slate-800 border-slate-200 shadow-xs' 
                : 'text-slate-500 hover:bg-slate-200/50 border-transparent'
            }`}
          >
            📝 Indikator 5NK
          </button>
          <button
            onClick={() => setActiveSubTab('kop')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer select-none border transition-colors ${
              activeSubTab === 'kop' 
                ? 'bg-white text-slate-800 border-slate-200 shadow-xs' 
                : 'text-slate-500 hover:bg-slate-200/50 border-transparent'
            }`}
          >
            🏢 Kop Sekolah
          </button>
          <button
            onClick={() => setActiveSubTab('backup')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer select-none border transition-colors ${
              activeSubTab === 'backup' 
                ? 'bg-white text-slate-800 border-slate-200 shadow-xs' 
                : 'text-slate-500 hover:bg-slate-200/50 border-transparent'
            }`}
          >
            🛡️ Backup & Enkripsi
          </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {needsAuth ? (
            <button 
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="flex items-center gap-1.5 text-[11px] font-bold bg-white border border-slate-300 text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              Sign in with Google
            </button>
          ) : (
            <button 
              onClick={handleBackupToDrive}
              className="flex items-center gap-1 text-[11px] font-bold bg-blue-50 border border-blue-200 text-blue-700 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors shadow-xs"
            >
              <Upload className="h-3 w-3" /> Backup ke Drive
            </button>
          )}

          <div className="hidden sm:block w-px h-4 bg-slate-300 mx-1"></div>

          <span className="text-[10px] font-bold text-slate-400 mr-1 hidden sm:inline">EXCEL IO:</span>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-[11px] font-bold bg-white border border-slate-300 text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors shadow-xs cursor-pointer"
            title="Impor database massal dari Excel (.xlsx)"
          >
            <Upload className="h-3 w-3" /> Impor
          </button>
          
          <button 
            onClick={handleExportDatabase}
            className="flex items-center gap-1 text-[11px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors shadow-xs cursor-pointer"
            title="Download Master database rekap dalam format Excel"
          >
            <Download className="h-3 w-3" /> Backup Lokal
          </button>
          
          <button 
            onClick={handleDirectEncryptedBackup}
            className="flex items-center gap-1.5 text-[11px] font-bold bg-amber-600 border border-amber-700 text-white px-2.5 py-1.5 rounded-lg hover:bg-amber-700 transition-colors shadow-xs cursor-pointer"
            title="Download salinan database terenkripsi penuh dalam format JSON"
          >
            <Lock className="h-3 w-3" /> Backup (JSON)
          </button>
        </div>
      </div>

      {/* -------------------- SUBTAB 1: SISWA SCREEN -------------------- */}
      {activeSubTab === 'siswa' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-50/50">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                Manajemen Murid Kelas {selectedClass}
              </h4>
              <p className="text-[11px] text-slate-400">Tambah, sunting, atau hapus database data primer murid</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Murid..."
                  value={siswaSearch}
                  onChange={(e) => setSiswaSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full md:w-48"
                />
              </div>

              <button
                onClick={handleOpenAddSiswa}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
              >
                <Plus className="h-4 w-4" /> Tambah Siswa
              </button>

              <button
                onClick={handleOpenAddWaliKelasForCurrentClass}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                title={`Tambah Wali Kelas baru untuk Kelas ${selectedClass}`}
              >
                <UserCheck className="h-4 w-4" /> Tambah Wali Kelas
              </button>

              <button
                onClick={() => setIsAddClassModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                title="Tambah Kelas baru ke daftar sekolah"
              >
                <Building2 className="h-4 w-4" /> Tambah Kelas
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto max-h-[450px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-12 text-center">No</th>
                  <th className="p-3">NIS</th>
                  <th className="p-3">Nama Lengkap</th>
                  <th className="p-3">Kelas</th>
                  <th className="p-3 text-center">Gender</th>
                  <th className="p-3">Semester</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudentsByClass.length > 0 ? (
                  filteredStudentsByClass.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-400 font-medium">{idx + 1}</td>
                      <td className="p-3 font-mono font-bold text-slate-700">{s.nis}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                            s.gender === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                          }`}>
                            {s.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-800">{s.name}</span>
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-slate-600">Kelas {s.kelas}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.gender === 'L' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-pink-50 text-pink-700 border border-pink-100'
                        }`}>
                          {s.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 font-medium">{s.semester}</td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1.5 justify-center">
                          <button
                            onClick={() => handleOpenEditSiswa(s)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200 cursor-pointer"
                            title="Edit data utama siswa"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSiswa(s.id, s.name)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200 cursor-pointer"
                            title="Hapus siswa ini"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-slate-400 italic">
                      Tidak ada siswa terdaftar di database untuk kelas {selectedClass}. Klik "Tambah Siswa" untuk menambahkan murid baru.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- SUBTAB 2: GURU SCREEN -------------------- */}
      {activeSubTab === 'guru' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-50/50">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                Roster Guru & Wali Kelas Kartika
              </h4>
              <p className="text-[11px] text-slate-400">Manajemen staf pengajar, bimbingan konseling dan wali kelas pengisi rapor</p>
            </div>

            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari Guru..."
                  value={guruSearch}
                  onChange={(e) => setGuruSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full md:w-48"
                />
              </div>

              <button
                onClick={handleOpenAddGuru}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" /> Tambah Staf Guru
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto max-h-[450px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-12 text-center">No</th>
                  <th className="p-3">NIP</th>
                  <th className="p-3">Nama Guru</th>
                  <th className="p-3">Jabatan / Peran</th>
                  <th className="p-3">Alokasi Kelas Wali</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.length > 0 ? (
                  filteredTeachers.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-400 font-medium">{idx + 1}</td>
                      <td className="p-3 font-mono text-slate-500 font-semibold">{t.nip || '-'}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                            {t.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-800">{t.name}</span>
                        </div>
                      </td>
                      <td className="p-3 font-medium text-slate-600">{t.role}</td>
                      <td className="p-3">
                        {t.classAssigned ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full font-bold text-[10px]">
                            Kelas Wali {t.classAssigned}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic font-mono">-</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1.5 justify-center">
                          <button
                            onClick={() => handleOpenEditGuru(t)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded border border-transparent hover:border-blue-200 cursor-pointer"
                            title="Edit Guru"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGuru(t.id, t.name)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded border border-transparent hover:border-rose-200 cursor-pointer"
                            title="Hapus Guru"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-400 italic">
                      Data guru tidak ditemukan. Silakan tambahkan staf pengajar baru.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* -------------------- SUBTAB 3: INDIKATOR SCREEN -------------------- */}
      {activeSubTab === 'indikator' && (
        <div className="flex-1 overflow-y-auto p-6 max-h-[500px]">
          <div className="mb-6">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-600" />
              Manajemen Rubrik Indikator Penilaian (5NK)
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Edit kalimat deskripsi penilaian atau tambahkan kriteria baru untuk dicetak di Rapor 5NK</p>
          </div>

          <div className="flex flex-col gap-8">
            {categories.map((cat) => (
              <div key={cat.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                {/* Header aspect */}
                <div className="bg-slate-50 border-b border-teal-600/20 px-4 py-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full mr-2">
                      FAMILY ID: {cat.id}
                    </span>
                    <span className="font-bold text-slate-800 text-xs md:text-sm">Nilai Kartika: {cat.name}</span>
                  </div>
                  <button
                    onClick={() => handleOpenAddIndicator(cat.id)}
                    className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Tambah Indikator
                  </button>
                </div>

                {/* List indicators in this aspect */}
                <div className="divide-y divide-slate-100">
                  {cat.indicators.map((ind, i) => (
                    <div key={ind.id} className="p-4 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded flex-none">
                        {ind.id}
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed font-semibold flex-1">
                        {ind.text}
                      </p>
                      
                      <div className="flex gap-1 flex-none">
                        <button
                          onClick={() => handleOpenEditIndicator(cat.id, ind)}
                          className="bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 p-1 rounded text-blue-600 cursor-pointer"
                          title="Sunting kalimat indikator"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteIndicator(cat.id, ind.id, ind.text)}
                          className="bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 p-1 rounded text-rose-600 cursor-pointer"
                          title="Hapus kriteria ini"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* -------------------- SUBTAB 4: KOP SEKOLAH -------------------- */}
      {activeSubTab === 'kop' && (
        <div className="flex-1 overflow-y-auto p-6 max-h-[500px]">
          <div className="mb-6">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" />
              Pengaturan Profil & Kop Sekolah
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Informasi di bawah ini akan memengaruhi kop/header hasil cetak rapor 5NK.</p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            onUpdateKopSekolah(editKop);
            alert('Kop sekolah berhasil disimpan!');
          }} className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col gap-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-bold text-slate-500 uppercase tracking-wider">Nama Yayasan</label>
                <input
                  type="text"
                  required
                  value={editKop.yayasan || ''}
                  onChange={(e) => setEditKop({ ...editKop, yayasan: e.target.value })}
                  placeholder="Contoh: YAYASAN KARTIKA JAYA"
                  className="bg-white border border-slate-300 rounded-lg p-2.5 font-bold"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-bold text-slate-500 uppercase tracking-wider">Koordinator</label>
                <input
                  type="text"
                  required
                  value={editKop.koordinator || ''}
                  onChange={(e) => setEditKop({ ...editKop, koordinator: e.target.value })}
                  placeholder="Contoh: JAKARTA"
                  className="bg-white border border-slate-300 rounded-lg p-2.5 font-sans"
                />
              </div>
              
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-bold text-slate-500 uppercase tracking-wider">Cabang</label>
                <input
                  type="text"
                  required
                  value={editKop.cabang || ''}
                  onChange={(e) => setEditKop({ ...editKop, cabang: e.target.value })}
                  placeholder="Contoh: XVIII SMA/SMK"
                  className="bg-white border border-slate-300 rounded-lg p-2.5 font-sans"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-bold text-slate-500 uppercase tracking-wider">Judul Sekolah</label>
                <input
                  type="text"
                  required
                  value={editKop.namaSekolah || ''}
                  onChange={(e) => setEditKop({ ...editKop, namaSekolah: e.target.value })}
                  placeholder="Contoh: SMA / SMK KARTIKA VIII-1"
                  className="bg-white border border-slate-300 rounded-lg p-2.5 font-bold"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <label className="font-bold text-slate-500 uppercase tracking-wider">Alamat Sekolah</label>
              <textarea
                required
                value={editKop.alamat || ''}
                onChange={(e) => setEditKop({ ...editKop, alamat: e.target.value })}
                rows={2}
                placeholder="Contoh: Jl.Srengseng Sawah No.17, Jagakarsa..."
                className="bg-white border border-slate-300 rounded-lg p-2.5 font-sans"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-bold text-slate-500 uppercase tracking-wider">Tahun Ajaran</label>
                <input
                  type="text"
                  required
                  value={editKop.tahunAjaran || ''}
                  onChange={(e) => setEditKop({ ...editKop, tahunAjaran: e.target.value })}
                  placeholder="Contoh: 2025 - 2026"
                  className="bg-white border border-slate-300 rounded-lg p-2.5 font-semibold text-center"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                <label className="font-bold text-slate-500 uppercase tracking-wider">Logo Sekolah (Opsional)</label>
                <div className="flex items-center gap-3">
                  {editKop.logoUrl && (
                    <img src={editKop.logoUrl} alt="Logo" className="w-10 h-10 object-contain bg-white rounded border border-slate-200" />
                  )}
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditKop({ ...editKop, logoUrl: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      } else {
                        // Jika dihapus melalui dialog, bisa mengosongkan jika diinginkan.
                      }
                    }}
                    className="flex-1 bg-white border border-slate-300 rounded-lg p-2 font-mono text-[11px] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                  />
                  {editKop.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setEditKop({ ...editKop, logoUrl: '' })}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus Logo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-2 text-right">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-xs cursor-pointer inline-flex"
              >
                <Save className="h-4 w-4" /> Simpan Profil Sekolah
              </button>
            </div>
          </form>
        </div>
      )}

      {/* -------------------- SUBTAB 5: BACKUP & ENKRIPSI -------------------- */}
      {activeSubTab === 'backup' && (
        <div className="flex-1 overflow-y-auto p-6 max-h-[500px]">
          <div className="mb-6">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-600" />
              Keamanan Data Offline & Encrypted JSON Backup
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Guru dapat mengunduh seluruh data aplikasi (Siswa, Guru, Nilai, Kategori) dalam format JSON terenkripsi agar aman disimpan secara fisik/perangkat offline.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
            {/* CARD 1: EXPORT ENCRYPTED BACKUP */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-emerald-50 p-1.5 rounded-lg border border-emerald-200">
                    <Download className="h-4 w-4 text-emerald-700" />
                  </div>
                  <h5 className="font-bold text-slate-700 text-xs">Unduh Backup Terenkripsi</h5>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                  Sistem mengekspor database (Siswa, Guru, Nilai, Kategori, Kop) dan menyandikannya menggunakan sandi pribadi Anda demi mencegah pencurian data nilai siswa secara offline.
                </p>

                <div className="flex flex-col gap-1.5 text-xs mb-4">
                  <span className="font-bold text-slate-600 uppercase tracking-wide text-[10px]">Tentukan Kata Sandi Enkripsi (Opsional):</span>
                  <input
                    type="password"
                    placeholder="Masukkan sandi pengaman (default jika kosong)"
                    value={backupPassword}
                    onChange={(e) => setBackupPassword(e.target.value)}
                    className="p-2 border border-slate-300 rounded-lg bg-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[9px] text-slate-400">Ingat kata sandi ini! Anda akan membutuhkannya kembali saat merestorasi data rapor.</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    const payload = {
                      students,
                      teachers,
                      categories,
                      kopSekolah,
                      timestamp: new Date().toISOString()
                    };
                    const jsonString = JSON.stringify(payload, null, 2);
                    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `RAW_BACKUP_5NK_${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    alert('Database berhasil di-backup murni tanpa enkripsi (.json)!');
                  }}
                  className="w-full py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs mb-1"
                >
                  <Download className="h-3.5 w-3.5" /> Unduh Raw JSON (Tanpa Enkripsi)
                </button>

                <button
                  onClick={() => {
                    const payload = {
                      students,
                      teachers,
                      categories,
                      kopSekolah,
                      timestamp: new Date().toISOString()
                    };
                    const jsonString = JSON.stringify(payload);
                    const cipherResult = encryptData(jsonString, backupPassword || 'KARTIKA_5NK_DEFAULT_SALT');
                    const blob = new Blob([cipherResult], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `ENC_BACKUP_5NK_${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    alert('Database berhasil di-backup dan diunduh dalam format JSON terenkripsi!');
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                >
                  <Lock className="h-3.5 w-3.5" /> Amankan & Unduh .json
                </button>
              </div>
            </div>

            {/* CARD 2: RESTORE ENCRYPTED BACKUP */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-indigo-50 p-1.5 rounded-lg border border-indigo-200">
                    <Upload className="h-4 w-4 text-indigo-700" />
                  </div>
                  <h5 className="font-bold text-slate-700 text-xs">Restorasi & Pulihkan Database</h5>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                  Kembalikan atau pindahkan seluruh data Anda dari perangkat lain. Berkas .json terenkripsi akan dibaca, didekripsi, dan diintegrasikan kembali ke memori lokal browser Anda seketika.
                </p>

                <div className="flex flex-col gap-1.5 text-xs mb-4">
                  <span className="font-bold text-slate-600 uppercase tracking-wide text-[10px]">Masukkan Kata Sandi Dekripsi:</span>
                  <input
                    type="password"
                    placeholder="Masukkan sandi dekripsi yang dipakai saat backup"
                    value={restorePassword}
                    onChange={(e) => setRestorePassword(e.target.value)}
                    className="p-2 border border-slate-300 rounded-lg bg-white font-mono text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  ref={jsonFileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      try {
                        const cipherText = evt.target?.result as string;
                        if (!cipherText) throw new Error('Berkas kosong!');
                        
                        const decryptedText = decryptData(cipherText, restorePassword || 'KARTIKA_5NK_DEFAULT_SALT');
                        const parsed = JSON.parse(decryptedText);
                        
                        if (!parsed.students || !parsed.teachers || !parsed.categories) {
                          throw new Error('Format database backup tidak valid.');
                        }
                        
                        // Succeeded! Restore
                        onUpdateStudents(parsed.students);
                        onUpdateTeachers(parsed.teachers);
                        onUpdateCategories(parsed.categories);
                        if (parsed.kopSekolah) {
                          onUpdateKopSekolah(parsed.kopSekolah);
                        }
                        
                        alert('RESTORE BERHASIL:\nSeluruh data primer siswa, guru, kategori indikator, dan profil kop sekolah berhasil dipulihkan secara penuh.');
                        if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
                        setRestorePassword('');
                      } catch (err: any) {
                        alert(`RESTORE GAGAL:\nSandi dekripsi yang Anda masukkan salah, atau format berkas backup telah dimanipulasi.\n\nDetail: ${err.message}`);
                      }
                    };
                    reader.readAsText(file);
                  }}
                />
                
                <button
                  onClick={() => jsonFileInputRef.current?.click()}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                >
                  <Unlock className="h-3.5 w-3.5" /> Dekripsi & Pulihkan (.json)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- POPUP MODAL 0: TAMBAH KELAS ----------------- */}
      {isAddClassModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-300 shadow-2xl p-6 max-w-sm w-full flex flex-col gap-4 animate-in slide-in-from-bottom duration-200">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Tambah Kelas Baru</h3>
              <p className="text-[11px] text-slate-400">Masukkan nama kelas yang ingin Anda daftarkan dalam sistem.</p>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="new-class-input" className="font-bold text-slate-500 text-xs">Nama Kelas</label>
              <input
                id="new-class-input"
                type="text"
                placeholder="Contoh: XII-D, X-E, XI-A3"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddClassSubmit(newClassName);
                  }
                }}
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAddClassModalOpen(false);
                  setNewClassName('');
                }}
                className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleAddClassSubmit(newClassName)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs cursor-pointer"
              >
                Simpan Kelas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- POPUP MODAL 1: SISWA FORM ----------------- */}
      {isSiswaFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <form onSubmit={handleSaveSiswa} className="bg-white rounded-xl border border-slate-300 shadow-2xl p-6 max-w-lg w-full flex flex-col gap-4 animate-in slide-in-from-bottom duration-200">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{editingSiswa ? 'Sunting Data Utama Murid' : 'Tambah Murid Baru'}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Isi formulir pendaftaran murid dengan sesuai</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex flex-col gap-1 col-span-2">
                <label htmlFor="modal-name" className="font-bold text-slate-500">Nama Lengkap Siswa</label>
                <input
                  id="modal-name"
                  type="text"
                  required
                  value={newSiswa.name || ''}
                  onChange={(e) => setNewSiswa({ ...newSiswa, name: e.target.value })}
                  placeholder="Contoh: Muhammad Syafii"
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="modal-nis" className="font-bold text-slate-500">NIS (Nomor Induk Siswa)</label>
                <input
                  id="modal-nis"
                  type="text"
                  required
                  value={newSiswa.nis || ''}
                  onChange={(e) => setNewSiswa({ ...newSiswa, nis: e.target.value })}
                  placeholder="Contoh: 202410123"
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="modal-gender" className="font-bold text-slate-500">Jenis Kelamin</label>
                <select
                  id="modal-gender"
                  value={newSiswa.gender}
                  onChange={(e) => setNewSiswa({ ...newSiswa, gender: e.target.value as 'L' | 'P' })}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold"
                >
                  <option value="L">Laki-laki (L)</option>
                  <option value="P">Perempuan (P)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="modal-class" className="font-bold text-slate-500">Pendaftaran Kelas</label>
                <select
                  id="modal-class"
                  value={newSiswa.kelas}
                  onChange={(e) => setNewSiswa({ ...newSiswa, kelas: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold"
                >
                  {classes.map(cls => (
                    <option key={cls} value={cls}>Kelas {cls}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="modal-semester" className="font-bold text-slate-500">Semester</label>
                <input
                  id="modal-semester"
                  type="text"
                  value={newSiswa.semester || 'Semester II (Genap)'}
                  onChange={(e) => setNewSiswa({ ...newSiswa, semester: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsSiswaFormOpen(false);
                  setEditingSiswa(null);
                }}
                className="py-1.5 px-3 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="submit"
                className="py-1.5 px-3 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer flex items-center gap-1"
              >
                <Check className="h-4 w-4" /> {editingSiswa ? 'Simpan Perubahan' : 'Masukkan ke Database'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ----------------- POPUP MODAL 2: GURU FORM ----------------- */}
      {isGuruFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <form onSubmit={handleSaveGuru} className="bg-white rounded-xl border border-slate-300 shadow-2xl p-6 max-w-md w-full flex flex-col gap-4 animate-in slide-in-from-bottom duration-200">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">{editingGuru ? 'Sunting Data Staff Pengajar' : 'Tambah Staff Wali Kelas / Guru'}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Input detail wali kelas atau pengasuh asrama lainnya</p>
            </div>

            <div className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500">Nama Guru Lengkap beserta Gelar</label>
                <input
                  type="text"
                  required
                  value={newGuru.name || ''}
                  onChange={(e) => setNewGuru({ ...newGuru, name: e.target.value })}
                  placeholder="Contoh: Drs. H. Bambang Susilo, M.Pd."
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500">NIP (Nomor Induk Pegawai)</label>
                <input
                  type="text"
                  value={newGuru.nip || ''}
                  onChange={(e) => setNewGuru({ ...newGuru, nip: e.target.value })}
                  placeholder="Contoh: 19740512 200003 1 002"
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500">Alokasi Kelas Wali (Optional)</label>
                <select
                  value={newGuru.classAssigned || ''}
                  onChange={(e) => setNewGuru({ ...newGuru, classAssigned: e.target.value })}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold"
                >
                  <option value="">-- Tidak Ada Alokasi Wali Kelas --</option>
                  {classes.map(cls => (
                    <option key={cls} value={cls}>Wali Kelas {cls}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-500">Deskripsi Jabatan / Peran</label>
                <input
                  type="text"
                  value={newGuru.role || ''}
                  onChange={(e) => setNewGuru({ ...newGuru, role: e.target.value })}
                  required
                  placeholder="Contoh: Guru Seni Budaya / Wali Kelas"
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsGuruFormOpen(false);
                  setEditingGuru(null);
                }}
                className="py-1.5 px-3 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="submit"
                className="py-1.5 px-3 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer flex items-center gap-1"
              >
                <Check className="h-4 w-4" /> Simpan Guru
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ----------------- POPUP MODAL 3: INDIKATOR FORM ----------------- */}
      {isIndicatorFormOpen && editingIndicator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <form onSubmit={handleSaveIndicator} className="bg-white rounded-xl border border-slate-300 shadow-2xl p-6 max-w-md w-full flex flex-col gap-4 animate-in slide-in-from-bottom duration-200">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                {categories.flatMap(c => c.indicators).some(i => i.id === editingIndicator.ind.id)
                  ? `Sunting Kalimat Indikator ${editingIndicator.ind.id}`
                  : `Tambah Indikator Baru ${editingIndicator.ind.id}`}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Sesuaikan teks indikator untuk dicetak di rubrik Nilai Kartika
              </p>
            </div>

            <div className="flex flex-col gap-4 text-xs font-sans">
              <div className="flex flex-col gap-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="font-bold text-slate-400 text-[10px]">PENGUMPULAN KELOMPOK KE:</span>
                <span className="font-bold text-slate-700 mt-1">
                  {categories.find(c => c.id === currentCatIdForInd)?.name}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-500">Butir Pernyataan Unik / Deskripsi Indikator</label>
                <textarea
                  required
                  value={newIndText}
                  onChange={(e) => setNewIndText(e.target.value)}
                  rows={4}
                  placeholder="Contoh: Mengapresiasi dan terlibat aktif dalam pelestarian kesenian musik gamelan lokal..."
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsIndicatorFormOpen(false);
                  setEditingIndicator(null);
                }}
                className="py-1.5 px-3 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="submit"
                className="py-1.5 px-3 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer flex items-center gap-1"
              >
                <Check className="h-4 w-4" /> Simpan Indikator
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
