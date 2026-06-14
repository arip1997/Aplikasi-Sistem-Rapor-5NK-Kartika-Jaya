import { useState, useEffect, useId, useRef } from 'react';
import { Student, ScoreKey, Category, Teacher, KopSekolah } from './types';
import { 
  getSavedStudents, 
  saveStudentsList, 
  getSavedTeachers, 
  saveTeachersList, 
  getSavedCategories, 
  saveCategoriesList,
  getSavedKopSekolah,
  saveKopSekolah, 
  getSavedClasses,
  saveClassesList,
  sortClasses,
  SCHOOL_CLASSES 
} from './data';
import ExcelGrid from './components/ExcelGrid';
import MacroPanel from './components/MacroPanel';
import RaporCetak from './components/RaporCetak';
import GradeRecap from './components/GradeRecap';
import EvaluationForm from './components/EvaluationForm';
import DatabaseCrud from './components/DatabaseCrud';
import UserGuideModal from './components/UserGuideModal';
import { exportClassToExcel, exportSingleStudentToExcel } from './utils';
import { getAccessToken, initAuth } from './firebase';
import { uploadFileToDrive, getOrCreateFolder } from './lib/drive';
import { 
  FileSpreadsheet, 
  Printer, 
  RefreshCw, 
  Settings2, 
  GraduationCap, 
  CheckCircle,
  FileText,
  User,
  Info,
  Database,
  BarChart3,
  ClipboardList,
  X,
  Users,
  Eye,
  ShieldAlert,
  Map,
  Wand2,
  ListChecks,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Cloud,
  Save,
  BookOpen,
  HelpCircle,
  ChevronDown,
  ListTodo,
  Plus
} from 'lucide-react';

export default function App() {
  const [students, setStudents] = useState<Student[]>(() => getSavedStudents());
  const [teachers, setTeachers] = useState<Teacher[]>(() => getSavedTeachers());
  const [categories, setCategories] = useState<Category[]>(() => getSavedCategories());
  const [kopSekolah, setKopSekolah] = useState<KopSekolah>(() => getSavedKopSekolah());
  const [classes, setClasses] = useState<string[]>(() => getSavedClasses());
  const [selectedClass, setSelectedClass] = useState<string>('X-A');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Custom View modes: spreadsheet grid, wizard evaluation, recapitulation summary, database crud console, 1:1 print preview
  const [viewMode, setViewMode] = useState<'spreadsheet' | 'form_penilaian' | 'rekap_nilai' | 'crud_manager' | 'print'>('spreadsheet');
  const [activeTabOnRight, setActiveTabOnRight] = useState<'macro' | 'edit'>('edit');
  const [alert, setAlert] = useState<{ type: 'success' | 'info'; message: string } | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isQuickHelpOpen, setIsQuickHelpOpen] = useState(false);
  const [showToast, setShowToast] = useState(true);

  // Auto-dismiss Startup Help Toast after 12 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowToast(false);
    }, 12000);
    return () => clearTimeout(timer);
  }, []);

  const filterClassSelectId = useId();
  const editGenderSelectId = useId();
  const [lastSavedTime, setLastSavedTime] = useState<Date>(new Date());

  // Auto-backup configuration state (default to true)
  const [isAutoBackupEnabled, setIsAutoBackupEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('rapor_5nk_auto_backup_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [showBackupAlert, setShowBackupAlert] = useState<boolean>(false);
  const [lastBackupFile, setLastBackupFile] = useState<string>('');
  const isBackupInitialMount = useRef(true);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [wasUploadedToDrive, setWasUploadedToDrive] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, t) => {
        setGoogleToken(t);
      },
      () => {
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Debounced auto-backup when important data changes
  useEffect(() => {
    if (isBackupInitialMount.current) {
      isBackupInitialMount.current = false;
      return;
    }

    if (!isAutoBackupEnabled) return;

    // Trigger backup download 15 seconds after the user stops making modifications
    const backupTimer = setTimeout(() => {
      try {
        const payload = {
          students,
          teachers,
          categories,
          kopSekolah,
          timestamp: new Date().toISOString(),
          type: 'AUTO_BACKUP_5NK'
        };
        const jsonString = JSON.stringify(payload, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const timestampStr = new Date().toISOString()
          .replace(/T/, '_')
          .replace(/:/g, '-')
          .split('.')[0];
        const filename = `AUTOBACKUP_5NK_Kelas_${selectedClass}_${timestampStr}.json`;
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setLastBackupFile(filename);
        setShowBackupAlert(true);

        // Upload to Google Drive if google synchronization is active
        getAccessToken().then(async (token) => {
          if (token) {
            try {
              const folderId = await getOrCreateFolder(token, 'Backup Rapor 5NK');
              await uploadFileToDrive(token, blob, filename, folderId);
              setWasUploadedToDrive(true);
            } catch (driveErr) {
              console.error('Auto backup to Google Drive failed:', driveErr);
              setWasUploadedToDrive(false);
            }
          } else {
            setWasUploadedToDrive(false);
          }
        }).catch((err) => {
          console.error('Failed to get access token for auto backup:', err);
          setWasUploadedToDrive(false);
        });
      } catch (err) {
        console.error('Pencadangan otomatis gagal:', err);
      }
    }, 15000);

    return () => clearTimeout(backupTimer);
  }, [lastSavedTime, isAutoBackupEnabled, selectedClass]);

  // Show guide automatically on first visit
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('rapor_5nk_has_seen_guide');
    if (!hasSeenGuide) {
      setIsGuideOpen(true);
      localStorage.setItem('rapor_5nk_has_seen_guide', 'true');
    }
  }, []);

  // Initialize selectedStudentId based on the default selectedClass
  useEffect(() => {
    if (!selectedStudentId) {
      const initialClassStudents = students.filter(s => s.kelas === 'X-A');
      if (initialClassStudents.length > 0) {
        setSelectedStudentId(initialClassStudents[0].id);
      }
    }
  }, [students, selectedStudentId]);

  // Save changes to local storage helpers
  const handlePersistStudents = (nextStudents: Student[]) => {
    setStudents(nextStudents);
    saveStudentsList(nextStudents);
    setLastSavedTime(new Date());
  };

  const handlePersistTeachers = (nextTeachers: Teacher[]) => {
    setTeachers(nextTeachers);
    saveTeachersList(nextTeachers);
    setLastSavedTime(new Date());
  };

  const handlePersistCategories = (nextCats: Category[]) => {
    setCategories(nextCats);
    saveCategoriesList(nextCats);
    setLastSavedTime(new Date());
  };

  const handlePersistKopSekolah = (nextKop: KopSekolah) => {
    setKopSekolah(nextKop);
    saveKopSekolah(nextKop);
    setLastSavedTime(new Date());
  };

  const handlePersistClasses = (nextClasses: string[]) => {
    const sorted = sortClasses(nextClasses);
    setClasses(sorted);
    saveClassesList(sorted);
    setLastSavedTime(new Date());
  };

  // Get current active Wali Kelas (Teacher) info
  const activeWaliKelas = teachers.find(t => t.classAssigned === selectedClass) || {
    name: 'Tidak Terdefinisi',
    nip: '-',
    role: 'Guru Kelas'
  };

  const filteredStudents = students.filter(s => s.kelas === selectedClass);
  const selectedStudent = students.find(s => s.id === selectedStudentId) || null;

  // Handle single indicator grade changes (safely counting based on dynamic indicators)
  const handleUpdateStudentGrades = (studentId: string, nextGrades: Record<string, ScoreKey>) => {
    const allIndicatorIds = categories.flatMap(c => c.indicators).map(i => i.id);
    const updated = students.map(s => {
      if (s.id === studentId) {
        // Evaluate completion (all active indicators must have a grade)
        const scoredCount = Object.keys(nextGrades).filter(id => allIndicatorIds.includes(id)).length;
        const complete = scoredCount === allIndicatorIds.length;

        return {
          ...s,
          grades: nextGrades,
          completed: complete
        };
      }
      return s;
    });
    handlePersistStudents(updated);
  };

  // Handle full student modification (especially from child wizard form)
  const handleUpdateSingleStudent = (updatedStudent: Student) => {
    const updated = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
    handlePersistStudents(updated);
  };

  // Handle bulk scores fill (VBA Macro 2)
  const handleUpdateFullClassScores = (bulkScore: ScoreKey) => {
    const allIndicators = categories.flatMap(c => c.indicators);
    const updated = students.map(s => {
      if (s.kelas === selectedClass) {
        const nextGrades: Record<string, ScoreKey> = {};
        allIndicators.forEach(ind => {
          nextGrades[ind.id] = bulkScore;
        });
        return {
          ...s,
          grades: nextGrades,
          completed: true
        };
      }
      return s;
    });
    handlePersistStudents(updated);
    triggerAlert('success', `Berhasil! Seluruh murid di kelas ${selectedClass} diisi nilai ${bulkScore}.`);
  };

  // Handle custom text box changes
  const handleUpdateComments = (studentId: string, kesimpulan: string, catatanWali: string) => {
    const updated = students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          kesimpulan,
          catatanWali
        };
      }
      return s;
    });
    handlePersistStudents(updated);
  };

  // Restores clean baseline datasets
  const handleResetToDefault = () => {
    if (window.confirm('Apakah Anda yakin ingin menyetel ulang database Rapor 5NK ke pengaturan awal? Semua perubahan kustom Anda akan hilang.')) {
      localStorage.removeItem('rapor_5nk_students');
      localStorage.removeItem('rapor_5nk_teachers');
      localStorage.removeItem('rapor_5nk_categories');
      
      const freshStudents = getSavedStudents();
      setStudents(freshStudents);

      const freshTeachers = getSavedTeachers();
      setTeachers(freshTeachers);

      const freshCats = getSavedCategories();
      setCategories(freshCats);
      
      const initialClassStudents = freshStudents.filter(s => s.kelas === selectedClass);
      if (initialClassStudents.length > 0) {
        setSelectedStudentId(initialClassStudents[0].id);
      }
      triggerAlert('info', 'Database Rapor 5NK berhasil disetel ulang ke default.');
    }
  };

  const triggerAlert = (type: 'success' | 'info', message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 4500);
  };

  const totalCompletedCount = students.filter(s => s.completed).length;
  const totalPercentage = students.length > 0 ? Math.round((totalCompletedCount / students.length) * 100) : 0;

  return (
    <div id="main-app-container" className="min-h-screen bg-slate-100 font-sans flex flex-col selection:bg-emerald-100 select-none">
      
      {/* 1. Global Navigation Navbar */}
      <header className="bg-emerald-800 text-white shadow-md border-b-4 border-emerald-950 px-4 py-3 sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg text-emerald-800 shadow-inner">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 id="app-heading" className="text-base md:text-lg font-bold font-display tracking-tight flex items-center gap-2">
                Sistem Konsol Rapor 5NK <span className="text-[10px] bg-emerald-900 border border-emerald-700 px-2.5 py-0.5 rounded-full font-mono">v1.2 - VBA Sim</span>
              </h1>
              <p className="text-[11px] text-emerald-100/85 uppercase">
                {kopSekolah.yayasan} KOORDINATOR {kopSekolah.koordinator} CABANG {kopSekolah.cabang} - {kopSekolah.namaSekolah}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            {/* Auto-Save Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 text-emerald-200/70" title={`Tersimpan otomatis ke memori lokal pada: ${lastSavedTime.toLocaleTimeString()}`}>
              <Cloud className="h-4 w-4" />
              <span className="text-[10px] uppercase tracking-wider font-bold">Auto-Save Aktif</span>
            </div>

            {/* Google Drive Status Indicator */}
            {googleToken ? (
              <div className="hidden lg:flex items-center gap-1.5 text-teal-300 bg-emerald-900/45 px-2.5 py-1 rounded-lg border border-teal-500/25 animate-pulse" title="Google Drive sinkronisasi aktif: Cadangan otomatis JSON diunggah secara real-time ke folder 'Backup Rapor 5NK'">
                <Cloud className="h-4 w-4 text-teal-400" />
                <span className="text-[10px] uppercase tracking-wider font-bold font-mono">Drive Terhubung</span>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-1.5 text-emerald-400/55 bg-emerald-950/20 px-2.5 py-1 rounded-lg border border-emerald-900/40" title="Google Drive belum terhubung untuk auto-backup. Masuk/Sign In di menu kelola Database.">
                <Cloud className="h-4 w-4 opacity-50" />
                <span className="text-[10px] uppercase tracking-wider font-bold font-mono">Drive Off</span>
              </div>
            )}

            {/* Auto-Backup Toggle */}
            <button
              onClick={() => {
                const nextVal = !isAutoBackupEnabled;
                setIsAutoBackupEnabled(nextVal);
                localStorage.setItem('rapor_5nk_auto_backup_enabled', String(nextVal));
              }}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] uppercase font-bold tracking-wider transition-all duration-200 cursor-pointer ${
                isAutoBackupEnabled
                  ? 'bg-emerald-900/60 border-amber-500/30 text-amber-300 hover:bg-emerald-900'
                  : 'bg-emerald-950/40 border-emerald-900 text-emerald-400/60 hover:text-emerald-300 hover:bg-emerald-900/20'
              }`}
              title={isAutoBackupEnabled ? "Cadangan otomatis menyala (data akan terunduh sebagai file JSON 15 detik setelah edit)" : "Pencadangan otomatis mati (klik untuk menyalakan)"}
            >
              <span className={`relative flex h-2 w-2 ${isAutoBackupEnabled ? 'inline-block' : 'hidden'}`}>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span>Backup Otomatis: {isAutoBackupEnabled ? 'Aktif' : 'Mati'}</span>
            </button>
            
            {/* Global Progress counters */}
            <div className="hidden sm:flex items-center gap-3 bg-emerald-900/60 py-1.5 px-3 rounded-lg border border-emerald-700/50">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <div>
                <p className="text-[10.5px] text-emerald-200 font-semibold font-mono leading-tight">Progress Total: {totalCompletedCount} / {students.length} Siswa</p>
                <div className="w-28 bg-emerald-950 h-1.5 rounded-full mt-1 overflow-hidden">
                  <div className="bg-emerald-400 h-full transition-all duration-500" style={{ width: `${totalPercentage}%` }}></div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsGuideOpen(true)}
              className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-600 font-semibold px-3 py-2 rounded-lg text-emerald-50 hover:text-white flex items-center gap-1.5 transition-all text-xs cursor-pointer shadow-xs"
              title="Panduan Lengkap Penggunaan"
            >
              <Info className="h-3.5 w-3.5" /> Panduan
            </button>

            <button
              onClick={handleResetToDefault}
              className="bg-emerald-900 hover:bg-emerald-950 border border-emerald-700 hover:border-emerald-600 font-semibold px-3 py-2 rounded-lg text-emerald-100 hover:text-white flex items-center gap-1.5 transition-all text-xs cursor-pointer"
              title="Setel Ulang Data Kelas ke Default"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reset DB
            </button>
          </div>
        </div>
      </header>

      {/* Alert banner */}
      {alert && (
        <div className={`p-4 font-semibold text-xs text-center border-b no-print animate-in slide-in-from-top duration-200 flex justify-center items-center gap-2 ${
          alert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-blue-50 text-blue-800 border-blue-200'
        }`}>
          <Info className="h-4 w-4 flex-none" />
          <span>{alert.message}</span>
        </div>
      )}

      {/* 2. Top Settings and Filter Subbar */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-4 no-print shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Filter Class */}
            <div className="flex items-center gap-1.5">
              <label htmlFor={filterClassSelectId} className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Settings2 className="h-3.5 w-3.5" /> Pilih Kelas :
              </label>
              <select
                id={filterClassSelectId}
                value={selectedClass}
                onChange={(e) => {
                  const nextCls = e.target.value;
                  setSelectedClass(nextCls);
                  const firstStud = students.find(s => s.kelas === nextCls);
                  if (firstStud) {
                    setSelectedStudentId(firstStud.id);
                  }
                  // Keep the active viewing view to prevent jarring changes
                  if (viewMode === 'print' && !firstStud) {
                    setViewMode('spreadsheet');
                  }
                }}
                className="border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
              >
                {classes.map(cls => (
                  <option key={cls} value={cls}>Kelas {cls}</option>
                ))}
              </select>
            </div>

            {/* Wali Kelas display label */}
            <div className="text-slate-300 font-medium">|</div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Wali Kelas:</span>
              <span className="font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 animate-in fade-in">
                {activeWaliKelas.name}
              </span>
              {activeWaliKelas.nip && activeWaliKelas.nip !== '-' && (
                <span className="text-slate-400 font-mono text-[10px]">
                  (NIP. {activeWaliKelas.nip})
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Excel Download complete roster */}
            <button
              onClick={() => exportClassToExcel(filteredStudents, selectedClass, activeWaliKelas.name, categories)}
              className="px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Download Master Recap Excel"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Download Roster .xlsx</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Primary View Mode Selection Panels (Sub navigation tabs deck) */}
      <div className="bg-white border-b border-slate-200 px-4 py-1.5 flex gap-1.5 flex-wrap no-print overflow-x-auto select-none">
        <div className="max-w-7xl mx-auto w-full flex flex-wrap gap-1 items-center">
          <button
            onClick={() => setViewMode('spreadsheet')}
            className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'spreadsheet' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" /> Lembar Konsol Grid & VBA
          </button>

          <button
            onClick={() => {
              if (filteredStudents.length > 0) {
                if (!selectedStudentId) {
                  setSelectedStudentId(filteredStudents[0].id);
                }
                setViewMode('form_penilaian');
              } else {
                triggerAlert('info', 'Harap isi murid di kelas ini terlebih dahulu.');
              }
            }}
            className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'form_penilaian' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <ClipboardList className="h-4 w-4" /> Formulir Penilaian Utama
          </button>

          <button
            onClick={() => setViewMode('rekap_nilai')}
            className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'rekap_nilai' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <BarChart3 className="h-4 w-4" /> Lembar Rekap Nilai & Sebaran
          </button>

          <button
            onClick={() => setViewMode('crud_manager')}
            className={`px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'crud_manager' 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <Database className="h-4 w-4" /> Pengaturan Database (CRUD)
          </button>

          {selectedStudent && (
            <button
              onClick={() => setViewMode('print')}
              className={`ml-auto px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'print' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-indigo-600 hover:bg-indigo-50 border border-indigo-100'
              }`}
            >
              <Printer className="h-4 w-4" /> Cetak Rapor {selectedStudent.name.split(' ')[0]}
            </button>
          )}
        </div>
      </div>

      {/* 4. Main Workspace Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-2.5 md:p-4 flex flex-col h-auto md:h-[calc(100vh-180px)] print:h-auto print:p-0 overflow-y-auto md:overflow-hidden print:overflow-visible">
        
        {/* TAB VIEW 1: EXCEL SHEET GRID WORKSPACE */}
        {viewMode === 'spreadsheet' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 flex-1 h-auto md:h-full overflow-visible md:overflow-hidden print:overflow-visible no-print">
            
            {/* Left spreadsheet grid - spans 2 columns */}
            <div className="lg:col-span-2 flex flex-col h-[480px] md:h-full overflow-hidden">
              <ExcelGrid
                students={filteredStudents}
                categories={categories}
                selectedClass={selectedClass}
                onUpdateStudentGrades={handleUpdateStudentGrades}
                onUpdateComments={handleUpdateComments}
                onSelectStudent={(st) => setSelectedStudentId(st.id)}
                selectedStudent={selectedStudent}
              />
            </div>

            {/* Right widgets with Tab panel (Edit detail & Macros) */}
            <div className="flex flex-col h-auto md:h-full overflow-visible md:overflow-hidden gap-4 mt-2 lg:mt-0">
              
              {/* Tab Selector buttons */}
              <div className="bg-slate-100 p-0.5 rounded-lg border border-slate-300 flex justify-between shrink-0">
                <button
                  onClick={() => setActiveTabOnRight('edit')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    activeTabOnRight === 'edit'
                      ? 'bg-white text-slate-800 shadow-xs border-b-2 border-emerald-600'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Form Input Rinci
                </button>
                <button
                  onClick={() => setActiveTabOnRight('macro')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                    activeTabOnRight === 'macro'
                      ? 'bg-white text-slate-800 shadow-xs border-b-2 border-emerald-600'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Modul Macro VBA
                </button>
              </div>

              {/* TAB CONTAINER CONTENT */}
              <div className="flex-1 overflow-visible md:overflow-hidden h-auto md:h-full">
                
                {/* SUBTAB 1: DETAILED EDITOR */}
                {activeTabOnRight === 'edit' && (
                  <div id="edit-pane" className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm h-full flex flex-col gap-4 overflow-y-auto">
                    
                    {selectedStudent ? (
                      <div className="flex flex-col gap-4">
                        <div>
                          <span className="text-[10px] bg-slate-100 border text-slate-500 font-mono font-bold px-2 py-0.5 rounded-full select-none">
                            NIS: {selectedStudent.nis}
                          </span>
                          <h3 className="text-sm font-bold text-slate-800 mt-1 select-all">{selectedStudent.name}</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5 font-sans">Mengedit form deskripsi penilaian secara manual</p>
                        </div>

                        {/* Gender selection */}
                        <div className="flex flex-col gap-1.5 text-xs">
                          <label htmlFor={editGenderSelectId} className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Jenis Kelamin</label>
                          <select
                            id={editGenderSelectId}
                            value={selectedStudent.gender}
                            onChange={(e) => {
                              const nextGender = e.target.value as 'L' | 'P';
                              const nextStud = students.map(s => s.id === selectedStudent.id ? { ...s, gender: nextGender } : s);
                              handlePersistStudents(nextStud);
                            }}
                            className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                          >
                            <option value="L">Laki-laki (L)</option>
                            <option value="P">Perempuan (P)</option>
                          </select>
                        </div>

                        {/* Uraian kesimpulan */}
                        <div className="flex flex-col gap-1.5 text-xs">
                          <div className="flex justify-between items-center">
                            <label htmlFor="edit-kesimpulan" className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Uraian Kesimpulan 5NK :</label>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {selectedStudent.kesimpulan?.length || 0} Karakter
                            </span>
                          </div>
                          <textarea
                            id="edit-kesimpulan"
                            value={selectedStudent.kesimpulan}
                            onChange={(e) => handleUpdateComments(selectedStudent.id, e.target.value, selectedStudent.catatanWali)}
                            rows={3}
                            placeholder="Tulis kesimpulan perilaku siswa..."
                            className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-sans text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Catatan wali kelas */}
                        <div className="flex flex-col gap-1.5 text-xs">
                          <div className="flex justify-between items-center">
                            <label htmlFor="edit-catatan-wali" className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Catatan Wali Kelas:</label>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {selectedStudent.catatanWali?.length || 0} Karakter
                            </span>
                          </div>
                          <textarea
                            id="edit-catatan-wali"
                            value={selectedStudent.catatanWali}
                            onChange={(e) => handleUpdateComments(selectedStudent.id, selectedStudent.kesimpulan, e.target.value)}
                            rows={3}
                            placeholder="Catatan motivasi yang mendorong semangat..."
                            className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-sans text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Catatan Orang Tua */}
                        <div className="flex flex-col gap-1.5 text-xs">
                          <label htmlFor="edit-catatan-ortu" className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Catatan Orang Tua/Wali:</label>
                          <textarea
                            id="edit-catatan-ortu"
                            value={selectedStudent.catatanOrangTua}
                            onChange={(e) => {
                              const nextStud = students.map(s => s.id === selectedStudent.id ? { ...s, catatanOrangTua: e.target.value } : s);
                              handlePersistStudents(nextStud);
                            }}
                            rows={2}
                            placeholder="Catatan tanggapan dari orang tua murid..."
                            className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-sans text-xs leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        {/* Action buttons */}
                        <button
                          onClick={() => setViewMode('print')}
                          className="mt-2 w-full py-2 px-3 rounded-lg text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                          <Printer className="h-3.5 w-3.5" /> Pratinjau Cetak Murid Ini
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-8 text-slate-400 text-xs italic gap-2 h-full">
                        <User className="h-10 w-10 text-slate-300 stroke-1" />
                        <p>Silakan pilih murid terlebih dahulu di grid Excel untuk mengedit data rincian rapor.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* SUBTAB 2: MACROS CONTROLLER */}
                {activeTabOnRight === 'macro' && (
                  <MacroPanel
                    selectedStudent={selectedStudent}
                    students={filteredStudents}
                    categories={categories}
                    selectedClass={selectedClass}
                    onUpdateFullClassScores={handleUpdateFullClassScores}
                    onUpdateStudentGrades={handleUpdateStudentGrades}
                    onUpdateComments={handleUpdateComments}
                    onRefreshData={() => handlePersistStudents(getSavedStudents())}
                    waliKelasName={activeWaliKelas.name}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB VIEW 2: FORM PENILAIAN WIZARD */}
        {viewMode === 'form_penilaian' && (
          <div className="flex-1 h-auto md:h-full overflow-visible md:overflow-hidden no-print">
            <EvaluationForm
              students={filteredStudents}
              categories={categories}
              selectedStudentId={selectedStudentId}
              onSelectStudentId={setSelectedStudentId}
              onUpdateStudent={handleUpdateSingleStudent}
              onViewReport={() => setViewMode('print')}
            />
          </div>
        )}

        {/* TAB VIEW 3: REKAP NILAI MATRIX */}
        {viewMode === 'rekap_nilai' && (
          <div className="flex-1 h-auto md:h-full overflow-visible md:overflow-hidden no-print">
            <GradeRecap
              students={filteredStudents}
              categories={categories}
              selectedClass={selectedClass}
              onSelectStudent={(st) => {
                setSelectedStudentId(st.id);
                setViewMode('form_penilaian');
              }}
            />
          </div>
        )}

        {/* TAB VIEW 4: MASTER ADMINISTRATIVE CRUD CONSOLE */}
        {viewMode === 'crud_manager' && (
          <div className="flex-1 h-auto md:h-full overflow-visible md:overflow-hidden no-print animate-in fade-in">
            <DatabaseCrud
              students={students}
              onUpdateStudents={handlePersistStudents}
              teachers={teachers}
              onUpdateTeachers={handlePersistTeachers}
              categories={categories}
              onUpdateCategories={handlePersistCategories}
              kopSekolah={kopSekolah}
              onUpdateKopSekolah={handlePersistKopSekolah}
              selectedClass={selectedClass}
              classes={classes}
              onUpdateClasses={handlePersistClasses}
            />
          </div>
        )}

        {/* TAB VIEW 5: PRINT PREVIEW REPORT */}
        {viewMode === 'print' && selectedStudent && (
          <div className="flex-1 overflow-y-auto print:overflow-visible">
            <RaporCetak
              student={selectedStudent}
              allClassStudents={students.filter(s => s.kelas === selectedClass)}
              categories={categories}
              kopSekolah={kopSekolah}
              waliKelasName={activeWaliKelas.name}
              waliKelasNip={activeWaliKelas.nip}
              onBack={() => setViewMode('spreadsheet')}
              onDownloadExcel={() => exportSingleStudentToExcel(selectedStudent, activeWaliKelas.name, categories)}
            />
          </div>
        )}

      </main>

      {/* ----------------- MODAL TUTORIAL / PANDUAN PENGGUNAAN ----------------- */}
      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      {/* ========================================= FLOATING HELP & NOTIFICATION DESK ========================================= */}
      {/* 1.5 Auto Backup Success Notification (Bottom-Left Toast) */}
      {showBackupAlert && (
        <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm z-[9999] bg-indigo-950/95 backdrop-blur-md border border-indigo-500/30 text-white rounded-2xl shadow-2xl p-4 flex gap-3 animate-in fade-in slide-in-from-bottom duration-300 no-print">
          <div className="bg-indigo-500/20 text-indigo-300 p-2 rounded-xl h-fit border border-indigo-500/20 flex-none font-sans font-bold">
            <Save className="h-5 w-5 animate-pulse text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="font-bold text-xs text-indigo-200 uppercase tracking-widest flex flex-wrap items-center gap-1.5">
              <span>⚡ Cadangan Otomatis</span>
              <span className="text-[8px] bg-emerald-500 text-white font-extrabold px-1 py-0.5 rounded leading-tight">SUKSES</span>
              {wasUploadedToDrive && (
                <span className="text-[8px] bg-teal-500 text-white font-extrabold px-1 py-0.5 rounded leading-tight flex items-center gap-0.5">
                  <Cloud className="h-2 w-2" /> GOOGLE DRIVE
                </span>
              )}
            </h5>
            {wasUploadedToDrive ? (
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed font-sans">
                Data rapor kelas <strong className="text-white font-bold">{selectedClass}</strong> berhasil dilokalisasi & <strong className="text-teal-300 font-bold">otomatis diunggah ke Google Drive</strong> pada folder <strong className="text-teal-200 font-bold">"Backup Rapor 5NK"</strong>!
              </p>
            ) : (
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed font-sans">
                Data rapor kelas <strong className="text-white font-bold">{selectedClass}</strong> berhasil diamankan! File cadangan lokal disimpan ke komputer Anda.
              </p>
            )}
            <div className="text-[9px] text-indigo-300/80 font-mono mt-1.5 w-full truncate" title={lastBackupFile}>
              {lastBackupFile}
            </div>
            <div className="flex justify-end gap-2 mt-2.5">
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
                  link.download = lastBackupFile || `Backup_Manual_Rapor_5NK.json`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  URL.revokeObjectURL(url);
                }}
                className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-2.5 py-1 rounded-lg cursor-pointer transition-colors shadow-xs"
              >
                Unduh Lagi
              </button>
              <button
                onClick={() => setShowBackupAlert(false)}
                className="text-[10px] text-slate-300 hover:text-white px-2 py-1 font-bold rounded cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 1. Startup Notification Toast Slide-In (Sleek Compact Bubble Form) */}
      {showToast && (
        <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 z-[9999] max-w-xs mx-auto sm:mx-0 bg-slate-900/95 backdrop-blur-md border border-slate-800 text-white rounded-xl shadow-xl p-3 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 no-print">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 flex-none">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1">
              💡 Panduan Tersedia
            </p>
          </div>
          <div className="flex items-center gap-1 flex-none">
            <button
              onClick={() => {
                setShowToast(false);
                setIsQuickHelpOpen(true);
              }}
              className="text-[10px] bg-emerald-600 hover:bg-emerald-500 font-extrabold text-white px-2 py-1 rounded cursor-pointer transition-colors"
            >
              Buka
            </button>
            <button
              onClick={() => setShowToast(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Floating Hub Badge Indicator */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9995] no-print">
        {isQuickHelpOpen ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-[calc(100vw-32px)] sm:w-80 md:w-[380px] p-4 md:p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-200 origin-bottom-right">
            {/* Header of Hub */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                  <HelpCircle className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-800 text-xs tracking-tight">Hub Panduan & Bantuan Cepat</h4>
                  <p className="text-[9.5px] text-slate-400 font-medium">Instruksi langsung pengerjaan Rapor 5NK</p>
                </div>
              </div>
              <button
                onClick={() => setIsQuickHelpOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content Tabs Inside Hub */}
            <div className="flex flex-col gap-3">
              <p className="text-[10px] text-slate-500 leading-normal">
                Silahkan pilih aspek pengoperasian yang ingin dipelajari:
              </p>
              
              {/* Accordion / Foldable Checklist Boxes */}
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                {/* Accordion 1: Cara Mengerjakan & Menilai */}
                <details className="group border border-slate-150 rounded-xl bg-slate-50/50 open:bg-white overflow-hidden transition-all duration-300">
                  <summary className="font-bold text-[10.5px] text-slate-700 p-2.5 flex justify-between items-center cursor-pointer list-none select-none hover:bg-slate-50">
                    <span className="flex items-center gap-2 text-indigo-700">
                      <ClipboardList className="h-3.5 w-3.5 flex-none" />
                      1. CARA MENGERJAKAN (NILAI & DESKRIPSI)
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="p-3 pt-0 text-slate-600 text-[10.5px] leading-relaxed flex flex-col gap-2 border-t border-slate-100/50 animate-in fade-in duration-200">
                    <div className="flex gap-2 items-start">
                      <span className="w-4 h-4 bg-indigo-100 text-indigo-700 rounded-full font-bold flex items-center justify-center text-[9px] mt-0.5 flex-none">1</span>
                      <p>Pilih <strong>Kelas</strong> di bilah atas, lalu pilih salah satu <strong>Siswa</strong> untuk diperiksa.</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="w-4 h-4 bg-indigo-100 text-indigo-700 rounded-full font-bold flex items-center justify-center text-[9px] mt-0.5 flex-none">2</span>
                      <p>Isi rincian nilai melalui <strong>Lembar Konsol Grid & VBA</strong> (klik cell di spreadsheet mini) untuk memperbarui skor.</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="w-4 h-4 bg-indigo-100 text-indigo-700 rounded-full font-bold flex items-center justify-center text-[9px] mt-0.5 flex-none">3</span>
                      <p>Gunakan tombol <strong>Gemini AI Ulasan</strong> untuk merumuskan deskripsi capaian cerdas murid berdasarkan skor indikator secara instan.</p>
                    </div>
                  </div>
                </details>

                {/* Accordion 2: Cara Mengatur Profil (Siswa, Kelas, Wali) */}
                <details className="group border border-slate-150 rounded-xl bg-slate-50/50 open:bg-white overflow-hidden transition-all duration-300">
                  <summary className="font-bold text-[10.5px] text-slate-700 p-2.5 flex justify-between items-center cursor-pointer list-none select-none hover:bg-slate-50">
                    <span className="flex items-center gap-2 text-emerald-700">
                      <Plus className="h-3.5 w-3.5 flex-none" />
                      2. CARA MENGISI (SISWA, KELAS & WALI)
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="p-3 pt-0 text-slate-600 text-[10.5px] leading-relaxed flex flex-col gap-2 border-t border-slate-100/50 animate-in fade-in duration-200">
                    <div className="flex gap-2 items-start">
                      <span className="w-4 h-4 bg-emerald-100 text-emerald-700 rounded-full font-bold flex items-center justify-center text-[9px] mt-0.5 flex-none">1</span>
                      <p>Akses <strong>Tab Pengaturan DB (CRUD)</strong> untuk mengontrol data dasar.</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="w-4 h-4 bg-emerald-100 text-emerald-700 rounded-full font-bold flex items-center justify-center text-[9px] mt-0.5 flex-none">2</span>
                      <p>Untuk menambahkan murid baru kelas aktif, klik tombol <strong>"Tambah Siswa Baru"</strong>.</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="w-4 h-4 bg-emerald-100 text-emerald-700 rounded-full font-bold flex items-center justify-center text-[9px] mt-0.5 flex-none">3</span>
                      <p>To meregistrasikan kelas baru, klik tombol <strong>"Tambah Kelas"</strong> di sampingnya. Masuukan nama (misal: XI-C).</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="w-4 h-4 bg-emerald-100 text-emerald-700 rounded-full font-bold flex items-center justify-center text-[9px] mt-0.5 flex-none">4</span>
                      <p>Gunakan tombol <strong>"Tambah Wali Kelas"</strong> untuk mengaitkan guru ke tingkat kelas terkait agar tanda tangan teraplikasikan.</p>
                    </div>
                  </div>
                </details>

                {/* Accordion 3: Cara Cetak & Upload Drive */}
                <details className="group border border-slate-150 rounded-xl bg-slate-50/50 open:bg-white overflow-hidden transition-all duration-300">
                  <summary className="font-bold text-[10.5px] text-slate-700 p-2.5 flex justify-between items-center cursor-pointer list-none select-none hover:bg-slate-50">
                    <span className="flex items-center gap-2 text-rose-700">
                      <Printer className="h-3.5 w-3.5 flex-none" />
                      3. CARA CETAK & EKSPOR (PDF, ZIP, DRIVE)
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="p-3 pt-0 text-slate-600 text-[10.5px] leading-relaxed flex flex-col gap-2 border-t border-slate-100/50 animate-in fade-in duration-200">
                    <div className="flex gap-2 items-start">
                      <span className="w-4 h-4 bg-rose-100 text-rose-700 rounded-full font-bold flex items-center justify-center text-[9px] mt-0.5 flex-none">1</span>
                      <p>Akses <strong>Tab Pratinjau Cetak Rapor</strong>.</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="w-4 h-4 bg-rose-100 text-rose-700 rounded-full font-bold flex items-center justify-center text-[9px] mt-0.5 flex-none">2</span>
                      <p>Pilih siswa-siswa yang datanya ingin dicetak dari daftar vertikal di sisi kiri.</p>
                    </div>
                    <div className="flex gap-2 items-start">
                      <span className="w-4 h-4 bg-rose-100 text-rose-700 rounded-full font-bold flex items-center justify-center text-[9px] mt-0.5 flex-none">3</span>
                      <p>Klik <strong>Cetak Langsung</strong> untuk printer kertas fisik, <strong>Unduh PDF</strong> untuk berkas PDF, atau <strong>Simpan ke Drive</strong> untuk mendeploy rapor ke awan.</p>
                    </div>
                  </div>
                </details>
              </div>
            </div>

            {/* Secondary actions */}
            <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px]">
              <button
                onClick={() => {
                  setIsQuickHelpOpen(false);
                  setIsGuideOpen(true);
                }}
                className="text-indigo-600 hover:text-indigo-700 font-extrabold flex items-center gap-1 cursor-pointer bg-transparent border-none"
              >
                Lihat Alur Infografis <ArrowRight className="h-3 w-3" />
              </button>
              <button
                onClick={() => setIsQuickHelpOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold bg-transparent border-none cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setIsQuickHelpOpen(true);
              setShowToast(false);
            }}
            className="group relative flex h-10 w-10 items-center justify-center bg-gradient-to-br from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-full shadow-lg transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer border border-emerald-500/10"
            title="Pusat Panduan & Bantuan Cepat"
            id="floating-help-btn"
          >
            <HelpCircle className="h-5 w-5 text-teal-50 group-hover:scale-110 transition-transform duration-200" />
            <span className="flex h-2 w-2 rounded-full bg-amber-400 absolute top-0.5 right-0.5 animate-ping" />
            <span className="flex h-2 w-2 rounded-full bg-amber-400 absolute top-0.5 right-0.5 border border-white" />
          </button>
        )}
      </div>
    </div>
  );
}
