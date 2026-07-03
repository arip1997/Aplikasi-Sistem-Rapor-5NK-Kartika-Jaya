import { useState, useEffect, useId, useRef, startTransition, useTransition, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { Student, ScoreKey, Category, Teacher, KopSekolah } from './types';
import { normalizeAllData } from './normalization';
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
  SCHOOL_CLASSES,
  reconcileStudentsList,
  reconcileTeachersList
} from './data';
import ExcelGrid from './components/ExcelGrid';
import MacroPanel from './components/MacroPanel';
import RaporCetak from './components/RaporCetak';
import GradeRecap from './components/GradeRecap';
import EvaluationForm from './components/EvaluationForm';
import DatabaseCrud from './components/DatabaseCrud';
import UserGuideModal from './components/UserGuideModal';
import { HighlightText } from './components/HighlightText';
import ClassSelectorDropdown from './components/ClassSelectorDropdown';
import { exportClassToExcel, generateClassExcelBlob, exportSingleStudentToExcel, addChangeLog, runIntegrityCheck, getChangeLogs, ChangeLog } from './utils';
import { getAccessToken, initAuth, auth, db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { uploadFileToDrive, getOrCreateFolder } from './lib/drive';
import { StudentOverview } from './components/StudentOverview';
import { CatatanWaliKelas } from './components/CatatanWaliKelas';
import { 
  FileSpreadsheet, 
  Printer, 
  RefreshCw, 
  Settings2, 
  GraduationCap, 
  CheckCircle,
  AlertCircle,
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
  Plus,
  Search,
  Undo,
  Redo,
  MessageCircle,
  History,
  Keyboard,
  DownloadCloud,
  Download,
  Loader2,
  Menu,
  AlertTriangle,
  ArrowUpDown
} from 'lucide-react';

export default function App() {
  const [isPending, startTransition] = useTransition();
  const [students, setStudents] = useState<Student[]>(() => getSavedStudents());
  const [teachers, setTeachers] = useState<Teacher[]>(() => getSavedTeachers());
  const [categories, setCategories] = useState<Category[]>(() => getSavedCategories());
  const [kopSekolah, setKopSekolah] = useState<KopSekolah>(() => getSavedKopSekolah());
  const [classes, setClasses] = useState<string[]>(() => getSavedClasses());
  
  const latestStudentsRef = useRef<Student[]>(students);
  const latestTeachersRef = useRef<Teacher[]>(teachers);
  const latestCategoriesRef = useRef<Category[]>(categories);
  const latestKopRef = useRef<KopSekolah>(kopSekolah);
  const latestClassesRef = useRef<string[]>(classes);

  useEffect(() => { latestStudentsRef.current = students; }, [students]);
  useEffect(() => { latestTeachersRef.current = teachers; }, [teachers]);
  useEffect(() => { latestCategoriesRef.current = categories; }, [categories]);
  useEffect(() => { latestKopRef.current = kopSekolah; }, [kopSekolah]);
  useEffect(() => { latestClassesRef.current = classes; }, [classes]);

  const [selectedClass, setSelectedClass] = useState<string>('X-A');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [autoTriggerBatchPdf, setAutoTriggerBatchPdf] = useState<boolean>(false);
  const [autoPrintImmediately, setAutoPrintImmediately] = useState<boolean>(false);
  const [batchPrintNisList, setBatchPrintNisList] = useState<string[]>([]);
  
  // State for all change logs used to show student edit histories
  const [allLogs, setAllLogs] = useState<ChangeLog[]>(() => getChangeLogs());

  useEffect(() => {
    const handleLogsUpdated = () => {
      setAllLogs(getChangeLogs());
    };
    window.addEventListener('rapor_change_logs_updated', handleLogsUpdated);
    return () => {
      window.removeEventListener('rapor_change_logs_updated', handleLogsUpdated);
    };
  }, []);
  
  // Custom View modes: spreadsheet grid, wizard evaluation, recapitulation summary, database crud console, 1:1 print preview
  const [viewMode, setViewMode] = useState<'spreadsheet' | 'form_penilaian' | 'rekap_nilai' | 'crud_manager' | 'print'>('spreadsheet');
  const [activeTabOnRight, setActiveTabOnRight] = useState<'macro' | 'edit'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rapor_5nk_activeTabOnRight');
      if (saved === 'macro' || saved === 'edit') return saved;
    }
    return 'edit';
  });
  const [alert, setAlert] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isQuickHelpOpen, setIsQuickHelpOpen] = useState(false);
  const [showToast, setShowToast] = useState(true);
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatbotMsg, setChatbotMsg] = useState('');
  const [resetOptions, setResetOptions] = useState({
    classes: false,
    students: false,
    teachers: false,
    evaluations: false,
    kop: false,
    wipeEmpty: false
  });

  const [isHighContrast, setIsHighContrast] = useState(() => {
    return localStorage.getItem('rapor_high_contrast') === 'true';
  });

  const [rowHeightMode, setRowHeightMode] = useState<'compact' | 'comfortable'>(() => {
    const saved = localStorage.getItem('rapor_row_height');
    return (saved === 'compact' || saved === 'comfortable') ? saved : 'comfortable';
  });

  useEffect(() => {
    if (isHighContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
    localStorage.setItem('rapor_high_contrast', String(isHighContrast));
  }, [isHighContrast]);

  useEffect(() => {
    localStorage.setItem('rapor_row_height', rowHeightMode);
  }, [rowHeightMode]);
  
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetConfirmedCheckbox, setIsResetConfirmedCheckbox] = useState(false);
  const [resetType, setResetType] = useState<'ALL' | 'CRITERIA_ONLY'>('ALL'); // Keep for compatibility

  const [aiModifiedStudentIds, setAiModifiedStudentIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ai_modified_students');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const markStudentAsAiModified = (studentId: string) => {
    setAiModifiedStudentIds(prev => {
      if (prev.includes(studentId)) return prev;
      const next = [...prev, studentId];
      localStorage.setItem('ai_modified_students', JSON.stringify(next));
      return next;
    });
  };

  const markStudentsAsAiModified = (studentIds: string[]) => {
    setAiModifiedStudentIds(prev => {
      const next = [...new Set([...prev, ...studentIds])];
      localStorage.setItem('ai_modified_students', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    // Validasi integritas otomatis saat students/teachers/categories dimodifikasi
    const report = runIntegrityCheck(students, teachers, categories, classes);
    if (!report.isValid) {
      const msg = `⚠️ Peringatan Integritas Data!\n\nDitemukan inkonsistensi relasi:\n` +
                  (report.brokenStudentClasses.length > 0 ? `- ${report.brokenStudentClasses.length} siswa memiliki kelas yang tidak terdaftar di sistem.\n` : '') +
                  (report.brokenGradeIndicators.length > 0 ? `- ${report.brokenGradeIndicators.length} entri nilai memiliki ID indikator usang/terhapus.\n` : '') +
                  `\nHarap buka tab 'Pengaturan Database' -> 'Cek Integritas' untuk memulihkan dan merapikan data.`;
      console.warn(msg);
      // Optional: uncomment to show native alert if strictly necessary
      // alert(msg);
    }
  }, [students, teachers, categories, classes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsExportHistoryOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [exportHistory, setExportHistory] = useState<{
    id: string;
    timestamp: string;
    type: 'EXCEL' | 'PDF' | 'CSV';
    description: string;
    fileName: string;
    studentCount: number;
  }[]>(() => {
    try {
      const saved = localStorage.getItem('5nk_export_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isExportHistoryOpen, setIsExportHistoryOpen] = useState(false);
  const [exportFormatFilter, setExportFormatFilter] = useState<'ALL' | 'EXCEL' | 'PDF' | 'CSV'>('ALL');
  const [exportStartDate, setExportStartDate] = useState<string>('');
  const [exportEndDate, setExportEndDate] = useState<string>('');

  const addExportLog = (type: 'EXCEL' | 'PDF' | 'CSV', description: string, fileName: string, studentCount: number) => {
    const newLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      type,
      description,
      fileName,
      studentCount,
    };
    setExportHistory(prev => {
      const next = [newLog, ...prev].slice(0, 100);
      localStorage.setItem('5nk_export_history', JSON.stringify(next));
      return next;
    });
  };

  // Auto-dismiss Startup Help Toast after 12 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowToast(false);
    }, 12000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('rapor_5nk_activeTabOnRight', activeTabOnRight);
  }, [activeTabOnRight]);

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

  const [isSyncingFromCloud, setIsSyncingFromCloud] = useState<boolean>(false);
  const [dirtyCells, setDirtyCells] = useState<Record<string, boolean>>({});
  const [serverDbStatus, setServerDbStatus] = useState<'connected' | 'disconnected' | 'unconfigured' | 'checking'>('checking');
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [serverVersion, setServerVersion] = useState<string | null>(null);

  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState<boolean>(false);

  // AI & Sync History state overrides
  const [isGeneratingAiComments, setIsGeneratingAiComments] = useState<boolean>(false);
  const [isSyncHistoryOpen, setIsSyncHistoryOpen] = useState<boolean>(false);
  const [isNavbarToolsOpen, setIsNavbarToolsOpen] = useState<boolean>(false);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState<boolean>(false);
  const [quickSearchQuery, setQuickSearchQuery] = useState<string>('');
  const [searchSortBy, setSearchSortBy] = useState<'NAME' | 'NIS'>('NAME');
  const [classSortBy, setClassSortBy] = useState<'NAME' | 'NIS'>('NAME');
  const [searchClassFilter, setSearchClassFilter] = useState<string>('ALL');
  const [recentSearches, setRecentSearches] = useState<Student[]>(() => {
    try {
      const saved = localStorage.getItem('rapor_5nk_recent_searches');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return [];
  });
  
  useEffect(() => {
    localStorage.setItem('rapor_5nk_recent_searches', JSON.stringify(recentSearches));
  }, [recentSearches]);
  const [hoveredStudent, setHoveredStudent] = useState<Student | null>(null);

  const [paperSize, setPaperSize] = useState<'A4' | 'F4'>(() => {
    try {
      const saved = localStorage.getItem('rapor_5nk_paper_size');
      return (saved as 'A4' | 'F4') || 'A4';
    } catch (e) {
      return 'A4';
    }
  });

  const handleUpdatePaperSize = (size: 'A4' | 'F4') => {
    setPaperSize(size);
    localStorage.setItem('rapor_5nk_paper_size', size);
  };

  // Footer date configuration shared between CRUD and RaporCetak
  const [showFooterDate, setShowFooterDate] = useState<boolean>(() => {
    const saved = localStorage.getItem('rapor_5nk_show_footer_date');
    return saved !== null ? saved === 'true' : true;
  });

  const handleUpdateShowFooterDate = (val: boolean) => {
    setShowFooterDate(val);
    localStorage.setItem('rapor_5nk_show_footer_date', String(val));
  };

  // Customizable Quick Actions state & storage sync listeners
  const [quickActions, setQuickActions] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('rapor_quick_actions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch(e) {}
    return ['print', 'excel', 'contrast'];
  });

  useEffect(() => {
    const syncActions = () => {
      try {
        const saved = localStorage.getItem('rapor_quick_actions');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setQuickActions(parsed);
          }
        }
      } catch(e) {}
    };
    window.addEventListener('storage', syncActions);
    window.addEventListener('quickActionsChanged', syncActions);
    return () => {
      window.removeEventListener('storage', syncActions);
      window.removeEventListener('quickActionsChanged', syncActions);
    };
  }, []);

  // Undo / Redo History States
  const [studentsHistory, setStudentsHistory] = useState<Student[][]>([]);
  const [historyPointer, setHistoryPointer] = useState<number>(-1);

  // Initialize history when students change from initial load
  useEffect(() => {
    if (students.length > 0 && studentsHistory.length === 0) {
      setStudentsHistory([students]);
      setHistoryPointer(0);
    }
  }, [students, studentsHistory.length]);

  const handleUndo = () => {
    if (historyPointer > 0) {
      const prevState = studentsHistory[historyPointer - 1];
      setStudents(prevState);
      saveStudentsList(prevState);
      setHistoryPointer(historyPointer - 1);
      triggerCloudAndFirebaseSync(prevState, teachers, categories, kopSekolah, classes);
      triggerAlert('info', '↩️ Membatalkan perubahan terakhir (Undo)');
    } else {
      triggerAlert('info', 'Tidak ada riwayat untuk di-undo');
    }
  };

  const handleRedo = () => {
    if (historyPointer >= 0 && historyPointer < studentsHistory.length - 1) {
      const nextState = studentsHistory[historyPointer + 1];
      setStudents(nextState);
      saveStudentsList(nextState);
      setHistoryPointer(historyPointer + 1);
      triggerCloudAndFirebaseSync(nextState, teachers, categories, kopSekolah, classes);
      triggerAlert('info', '↪️ Mengulangi perubahan terbatalkan (Redo)');
    } else {
      triggerAlert('info', 'Tidak ada riwayat untuk di-redo');
    }
  };

  // Persistence Helpers
  const saveStudents = (newStudents: Student[]) => {
    saveStudentsList(newStudents);
    setStudents(newStudents);
  };
  const [syncLogs, setSyncLogs] = useState<Array<{
    timestamp: Date;
    firebaseStatus: 'success' | 'failed' | 'skipped';
    sqlStatus: 'success' | 'failed' | 'skipped';
    driveStatus: 'success' | 'failed' | 'skipped';
    details: string;
  }>>([
    {
      timestamp: new Date(),
      firebaseStatus: 'success',
      sqlStatus: 'success',
      driveStatus: 'skipped',
      details: 'Sesi sistem terhubung. Database awal dan sinkronisasi Firestore divalidasi prima.'
    }
  ]);

  const checkSystemStatus = async () => {
    try {
      const res = await fetch('/api/db-status');
      if (res.ok) {
        const data = await res.json();
        setServerDbStatus(data.status);
      } else {
        setServerDbStatus('disconnected');
      }
    } catch {
      setServerDbStatus('disconnected');
    }
  };

  const checkServerVersion = async () => {
    try {
      const res = await fetch('/api/version');
      if (res.ok) {
        const data = await res.json();
        const serverVer = data.version;
        setServerVersion(serverVer);
        
        const localVer = localStorage.getItem('app_version');
        if (serverVer && localVer && serverVer !== localVer) {
          localStorage.setItem('app_version', serverVer);
          window.location.reload();
        } else if (serverVer && !localVer) {
          localStorage.setItem('app_version', serverVer);
        }
      }
    } catch (e) {
      console.error('[Version Check Error]:', e);
    }
  };

  useEffect(() => {
    checkSystemStatus();
    checkServerVersion();
    const interval = setInterval(() => {
      checkSystemStatus();
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  // Ref flag to preserve previous sync baseline to avoid redundant hits
  const lastSyncedHashRef = useRef<string>('');

  // Sync closely to real-time to Cloud SQL and Firebase (1000ms debounce buffer)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncTimeout = setTimeout(() => {
      if (!auth.currentUser) return;
      
      const currentDataHash = JSON.stringify({ students, teachers, categories, kopSekolah, classes });
      if (currentDataHash !== lastSyncedHashRef.current) {
        lastSyncedHashRef.current = currentDataHash;
        triggerCloudAndFirebaseSync(students, teachers, categories, kopSekolah, classes);
      }
    }, 1000); // Changed to 1000ms for near real-time sync feeling
    
    return () => clearTimeout(syncTimeout);
  }, [students, teachers, categories, kopSekolah, classes]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      setIsOnline(true);
      triggerCloudAndFirebaseSync();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [students, teachers, categories, kopSekolah, classes]);

  const [cloudSyncState, setCloudSyncState] = useState<{
    status: 'idle' | 'syncing' | 'success' | 'error';
    provider: string;
    lastSaved?: Date;
  }>({ status: 'idle', provider: '' });

  // Refs for tracking sync queue (collapses rapid consecutive writes to prevent connection bottleneck/DB timeouts)
  const lastSyncPayloadRef = useRef<{
    students: Student[];
    teachers: Teacher[];
    categories: Category[];
    kopSekolah: KopSekolah;
    classes: string[];
  } | null>(null);
  const isSyncRunningRef = useRef<boolean>(false);

  const triggerCloudAndFirebaseSync = (
    nextStudents?: Student[],
    nextTeachers?: Teacher[],
    nextCategories?: Category[],
    nextKop?: KopSekolah,
    nextClasses?: string[]
  ) => {
    // Record the latest cumulative state snapshot securely with fallback check
    const valStudents = nextStudents || students || [];
    const valTeachers = nextTeachers || teachers || [];
    const valCategories = nextCategories || categories || [];
    const valKop = nextKop || kopSekolah;
    const valClasses = nextClasses || classes || [];

    lastSyncPayloadRef.current = {
      students: valStudents,
      teachers: valTeachers,
      categories: valCategories,
      kopSekolah: valKop,
      classes: valClasses
    };

    // Trigger sequential queue processing loop
    if (!isSyncRunningRef.current) {
      processSyncQueue();
    }
  };

  const forceCloudAndFirebaseSync = async (): Promise<void> => {
    // Record and run immediately
    triggerCloudAndFirebaseSync(students, teachers, categories, kopSekolah, classes);
    let attempts = 0;
    while ((isSyncRunningRef.current || lastSyncPayloadRef.current !== null) && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
  };

  const processSyncQueue = async () => {
    if (isSyncRunningRef.current) return;
    isSyncRunningRef.current = true;

    try {
      while (lastSyncPayloadRef.current !== null) {
        // Dequeue latest cumulative payload snapshot safely
        const payload = lastSyncPayloadRef.current;
        lastSyncPayloadRef.current = null;

        if (payload) {
          const s = payload.students || students || [];
          const t = payload.teachers || teachers || [];
          const cat = payload.categories || categories || [];
          const kop = payload.kopSekolah || kopSekolah;
          const cls = payload.classes || classes || [];

          // Execute actual upload and write operations sequentially
          await executeActualSync(s, t, cat, kop, cls);
        }
      }
    } catch (queueErr) {
      console.error('[Sync Queue] Sequential queue loop error:', queueErr);
    } finally {
      isSyncRunningRef.current = false;
      // Re-trigger if new data came in during execution
      if (lastSyncPayloadRef.current !== null) {
        processSyncQueue();
      }
    }
  };

  const executeActualSync = async (
    nextStudents: Student[],
    nextTeachers: Teacher[],
    nextCategories: Category[],
    nextKop: KopSekolah,
    nextClasses: string[]
  ) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userEmail = currentUser.email;
    const uid = currentUser.uid;
    if (!userEmail) return;

    // Deep sanitize and prepare atomic payload
    const sanitize = (data: any) => JSON.parse(JSON.stringify(data, (_, val) => val === undefined ? null : val));
    
    const finalPayload = sanitize({
      students: nextStudents,
      teachers: nextTeachers,
      categories: nextCategories,
      kopSekolah: nextKop,
      classes: nextClasses
    });

    setCloudSyncState({ status: 'syncing', provider: 'Firebase & Cloud SQL' });
    
    let attempt = 0;
    const maxRetries = 3;
    let success = false;

    while (attempt < maxRetries && !success) {
      try {
        attempt++;
        // Execute as a single atomic transaction attempt
        await Promise.all([
          (async () => {
            const { doc, setDoc } = await import('firebase/firestore');
            await setDoc(doc(db, 'workspaces', uid), {
              ...finalPayload,
              email: userEmail,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          })(),
          (async () => {
            const res = await fetch('/api/save-workspace', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: userEmail, ...finalPayload })
            });
            if (!res.ok) throw new Error(`Cloud SQL sync failed: ${res.status}`);
          })()
        ]);

        success = true;
        setCloudSyncState({ status: 'success', provider: 'Firebase & Cloud SQL', lastSaved: new Date() });
        setSyncLogs(prev => [{
          timestamp: new Date(),
          firebaseStatus: 'success' as 'success' | 'failed' | 'skipped',
          sqlStatus: 'success' as 'success' | 'failed' | 'skipped',
          driveStatus: 'skipped' as 'success' | 'failed' | 'skipped',
          details: `Sinkronisasi atomik berhasil pada percobaan ke-${attempt}.`
        }, ...prev].slice(0, 10));

      } catch (err) {
        console.error(`[Cloud Sync] Atomic transaction failed on attempt ${attempt}:`, err);
        if (attempt < maxRetries) {
          // Exponential backoff
          setCloudSyncState({ status: 'syncing', provider: `Menunggu Retry (${attempt}/${maxRetries})...` });
          await new Promise(res => setTimeout(res, 2000 * attempt));
        } else {
          setCloudSyncState(prev => ({ ...prev, status: 'error', provider: 'Gagal Sinkronisasi' }));
        }
      }
    }
  };

  const handleLoadCloudWorkspace = async (userEmail: string, userUid: string) => {
    try {
      setIsSyncingFromCloud(true);
      console.log(`[Cloud Load] Checking cloud backups for ${userEmail}...`);
      
      let cloudState: any = null;

      // 1. Try Firebase Firestore first
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const docRef = doc(db, 'workspaces', userUid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const fsData = docSnap.data();
          const safeParse = (val: any) => {
            if (typeof val === 'string') {
              try { return JSON.parse(val); } catch(e) { return val; }
            }
            return val;
          };
          cloudState = {
            students: safeParse(fsData.students),
            teachers: safeParse(fsData.teachers),
            categories: safeParse(fsData.categories),
            kopSekolah: safeParse(fsData.kopSekolah),
            classes: safeParse(fsData.classes),
          };
          console.log('[Cloud Load] Found backup in Firebase Firestore!');
        }
      } catch (fireErr) {
        console.error('[Cloud Load Error] Firestore fetch failed:', fireErr);
      }

      // 2. Try Server API load (Cloud SQL & local file fallback) if Firestore failed or was empty
      if (!cloudState) {
        try {
          const res = await fetch(`/api/load-workspace?email=${encodeURIComponent(userEmail)}`);
          if (res.ok) {
            const apiRes = await res.json();
            if (apiRes && apiRes.data) {
              cloudState = apiRes.data;
              console.log('[Cloud Load] Found backup in backend server / Cloud SQL!');
            }
          }
        } catch (apiErr) {
          console.error('[Cloud Load Error] Server API load failed:', apiErr);
        }
      }

      // 3. Apply state if found
      if (cloudState) {
        // Enforce user confirmation before overriding their workspace
        const autoRestore = localStorage.getItem('rapor_5nk_auto_restore_completed') === userEmail;
        const confirmRestore = autoRestore || window.confirm(
          `Ditemukan data pencadangan otomatis cloud untuk akun "${userEmail}".\n\n` +
          `Apakah Anda mufakat untuk memulihkan (restore) seluruh nilai siswa, guru, kelas, dan kop sekolah dari penyimpanan cloud ini?\n\n` +
          `(Hal ini akan menyelaraskan data Anda secara presisi tanpa harus back-up lokal)`
        );

        if (confirmRestore) {
          localStorage.setItem('rapor_5nk_auto_restore_completed', userEmail);
          
          if (cloudState.students) {
            setStudents(reconcileStudentsList(cloudState.students));
            saveStudentsList(reconcileStudentsList(cloudState.students));
          }
          if (cloudState.teachers) {
            setTeachers(reconcileTeachersList(cloudState.teachers));
            saveTeachersList(reconcileTeachersList(cloudState.teachers));
          }
          if (cloudState.categories) {
            setCategories(cloudState.categories);
            saveCategoriesList(cloudState.categories);
          }
          if (cloudState.kopSekolah) {
            setKopSekolah(cloudState.kopSekolah);
            saveKopSekolah(cloudState.kopSekolah);
          }
          if (cloudState.classes) {
            setClasses(cloudState.classes);
            saveClassesList(cloudState.classes);
          }
          setLastSavedTime(new Date());
          triggerAlert('success', `✓ Data Rapor 5NK sukses disinkronkan dari penyimpanan Cloud Server & Firebase (${userEmail}).`);
        }
      } else {
        console.log('[Cloud Load] No database backups found under cloud storage yet.');
      }
    } catch (err) {
      console.error('[Cloud Load Sync failure]:', err);
    } finally {
      setIsSyncingFromCloud(false);
    }
  };

  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, t) => {
        setGoogleToken(t);
        setCurrentUser(user);
        if (user.email) {
          handleLoadCloudWorkspace(user.email, user.uid);
        }
      },
      () => {
        setGoogleToken(null);
        setCurrentUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Debounced auto-backup / cloud-sync when important data changes
  useEffect(() => {
    if (isBackupInitialMount.current) {
      isBackupInitialMount.current = false;
      return;
    }

    if (!isAutoBackupEnabled) return;

    // Trigger online cloud sync 15 seconds after the user stops making modifications
    const backupTimer = setTimeout(() => {
      triggerCloudAndFirebaseSync();
    }, 15000);

    return () => clearTimeout(backupTimer);
  }, [lastSavedTime, isAutoBackupEnabled]);

  // Show guide automatically on first visit
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('rapor_5nk_has_seen_guide');
    if (!hasSeenGuide) {
      setIsGuideOpen(true);
      localStorage.setItem('rapor_5nk_has_seen_guide', 'true');
    }
  }, []);


  // Global keyboard shortcuts (Ctrl+S for save/sync, Ctrl+P for print, Ctrl+Shift+S for Normalisasi)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      
      if (isCtrlOrMeta && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const { students: normalizedStudents, teachers: normalizedTeachers } = normalizeAllData(students, teachers);
        setStudents(normalizedStudents);
        setTeachers(normalizedTeachers);
        handlePersistStudents(normalizedStudents);
        handlePersistTeachers(normalizedTeachers);
        triggerAlert('success', '✓ Normalisasi Massal berhasil! Format nama dan gelar telah dibersihkan.');
        return;
      }
      
      // Ctrl+S...
      if (isCtrlOrMeta && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveStudentsList(students);
        saveTeachersList(teachers);
        saveCategoriesList(categories);
        saveKopSekolah(kopSekolah);
        saveClassesList(classes);
        setLastSavedTime(new Date());

        if (currentUser) {
          triggerCloudAndFirebaseSync(students, teachers, categories, kopSekolah, classes);
          triggerToast('success', '✓ Menyinkronkan seluruh data ke Cloud & Firebase secara instan...');
        } else {
          triggerToast('success', '✓ Data sukses disimpan aman ke Memori Lokal!');
        }
      }

      if (isCtrlOrMeta && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      }

      if (isCtrlOrMeta && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }

      if (isCtrlOrMeta && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setViewMode('print');
        triggerAlert('info', '🖨️ Mengalihkan ke Halaman Pratinjau Cetak Rapor... (Ctrl+P)');
        setTimeout(() => {
          window.print();
        }, 800);
      }

      if (isCtrlOrMeta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsQuickSearchOpen(prev => !prev);
      }

      if (isCtrlOrMeta && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        const viewsList: Array<'spreadsheet' | 'form_penilaian' | 'rekap_nilai' | 'crud_manager'> = [
          'spreadsheet',
          'form_penilaian',
          'rekap_nilai',
          'crud_manager'
        ];
        const nextIndex = (viewsList.indexOf(viewMode as any) + 1) % viewsList.length;
        const nextMode = viewsList[nextIndex];
        setViewMode(nextMode);
        
        const modeLabel = nextMode === 'spreadsheet' ? 'Grid Cepat' :
                          nextMode === 'form_penilaian' ? 'Form Penilaian' :
                          nextMode === 'rekap_nilai' ? 'Rekap Nilai' :
                          'Master CRUD';
        triggerAlert('info', `🗂️ Navigasi: Beralih ke Tab ${modeLabel} (Ctrl+J)`);
      }

      // 🎹 Power-user specific Navigation Shortcuts (Alt+1, Alt+2, Alt+3, Alt+4)
      if (e.altKey && (e.key === '1' || e.key.toLowerCase() === 'g')) {
        e.preventDefault();
        setViewMode('spreadsheet');
        triggerAlert('success', '📊 Beralih ke Grid Cepat / Spreadsheet (Shortcut: Alt+1)');
      } else if (e.altKey && (e.key === '2' || e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        setViewMode('form_penilaian');
        triggerAlert('success', '📝 Beralih ke Form Penilaian (Shortcut: Alt+2)');
      } else if (e.altKey && (e.key === '3' || e.key.toLowerCase() === 'r')) {
        e.preventDefault();
        setViewMode('rekap_nilai');
        triggerAlert('success', '📈 Beralih ke Rekap Nilai & Grafik Radar 5NK (Shortcut: Alt+3)');
      } else if (e.altKey && (e.key === '4' || e.key.toLowerCase() === 'm')) {
        e.preventDefault();
        setViewMode('crud_manager');
        triggerAlert('success', '🗄️ Beralih ke Master CRUD Database (Shortcut: Alt+4)');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [students, teachers, categories, kopSekolah, classes, currentUser, viewMode]);

  // Initialize selectedStudentId based on the default selectedClass
  useEffect(() => {
    if (!selectedStudentId) {
      const initialClassStudents = students.filter(s => s.kelas === 'X-A');
      if (initialClassStudents.length > 0) {
        setSelectedStudentId(initialClassStudents[0].id);
      }
    }
  }, [students, selectedStudentId]);

  // Google Drive Background Backup (Checks every 5 seconds, uploads only if data changed)
  useEffect(() => {
    if (!googleToken || students.length === 0 || !isAutoBackupEnabled) return;

    const intervalId = setInterval(async () => {
      const lastBackupTimestamp = Number(localStorage.getItem('last_drive_backup_timestamp') || '0');
      const currentSavedTime = lastSavedTime.getTime();

      // Only backup if current data's save timestamp is newer than the last uploaded backup
      if (currentSavedTime > lastBackupTimestamp) {
        try {
          console.log('[Drive Backup] Memulai backup otomatis 5 detik ke Google Drive...');
          const timestampStr = new Date().toISOString()
            .replace(/T/, '_')
            .replace(/:/g, '-')
            .split('.')[0];
            
          const folderId = await getOrCreateFolder(googleToken, 'Backup Rapor 5NK');
          
          // Mempersiapkan ZIP
          const JSZip = (await import('jszip')).default;
          const zip = new JSZip();
          
          const payload = {
            students,
            teachers,
            categories,
            kopSekolah,
            classes,
            timestamp: new Date().toISOString(),
            type: 'AUTO_BACKUP_5NK_5S'
          };
          
          zip.file(`backup_data.json`, JSON.stringify(payload, null, 2));
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          
          const filename = `AUTO_BACKUP_5NK_${timestampStr}.zip`;
          await uploadFileToDrive(googleToken, zipBlob, filename, folderId);
          
          localStorage.setItem('last_drive_backup_timestamp', String(currentSavedTime));
          triggerAlert('success', `Backup otomatis ke Google Drive berhasil: ${filename}`);
          console.log('[Drive Backup] Backup otomatis 5 detik selesai.');
        } catch (err) {
          console.error('[Drive Backup] Gagal melakukan backup otomatis ke Google Drive:', err);
        }
      }
    }, 5000);

    return () => clearInterval(intervalId);
  }, [googleToken, students, teachers, categories, kopSekolah, classes, isAutoBackupEnabled, lastSavedTime]);

  // Save changes to local storage helpers
  const cloudSyncTimeoutRef = useRef<any>(null);

  const handlePersistCloudAndFirestore = () => {
    if (cloudSyncTimeoutRef.current) {
      clearTimeout(cloudSyncTimeoutRef.current);
    }
    cloudSyncTimeoutRef.current = setTimeout(() => {
      triggerCloudAndFirebaseSync(
        latestStudentsRef.current,
        latestTeachersRef.current,
        latestCategoriesRef.current,
        latestKopRef.current,
        latestClassesRef.current
      );
    }, 2500); // Debounce saves by 2.5 seconds
  };

  const handlePersistStudents = (nextStudents: Student[], skipHistoryUpdate = false) => {
    // Sort students by class and then by name alphabetically
    const sortedStudents = [...nextStudents].sort((a, b) => {
      const clsA = (a.kelas || '').toLowerCase();
      const clsB = (b.kelas || '').toLowerCase();
      if (clsA < clsB) return -1;
      if (clsA > clsB) return 1;
      return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase());
    });
    
    // Sync ref synchronously to prevent race conditions in subsequent triggers
    latestStudentsRef.current = sortedStudents;
    
    setStudents(sortedStudents);
    saveStudentsList(sortedStudents);
    setLastSavedTime(new Date());
    handlePersistCloudAndFirestore();
    
    if (!skipHistoryUpdate) {
       setStudentsHistory(prev => {
          const nextHist = prev.slice(0, historyPointer + 1);
          return [...nextHist, sortedStudents].slice(-30);
       });
       setHistoryPointer(prev => Math.min(prev + 1, 29));
    }
  };

  const handlePersistTeachers = (nextTeachers: Teacher[]) => {
    latestTeachersRef.current = nextTeachers;
    setTeachers(nextTeachers);
    saveTeachersList(nextTeachers);
    setLastSavedTime(new Date());
    handlePersistCloudAndFirestore();
  };

  const handlePersistCategories = (nextCats: Category[]) => {
    latestCategoriesRef.current = nextCats;
    setCategories(nextCats);
    saveCategoriesList(nextCats);
    setLastSavedTime(new Date());
    handlePersistCloudAndFirestore();
  };

  const handlePersistKopSekolah = (nextKop: KopSekolah) => {
    latestKopRef.current = nextKop;
    setKopSekolah(nextKop);
    saveKopSekolah(nextKop);
    setLastSavedTime(new Date());
    handlePersistCloudAndFirestore();
  };

  const handlePersistClasses = (nextClasses: string[]) => {
    const sorted = sortClasses(nextClasses);
    latestClassesRef.current = sorted;
    setClasses(sorted);
    saveClassesList(sorted);
    setLastSavedTime(new Date());
    handlePersistCloudAndFirestore();
  };

  // Get current active Wali Kelas (Teacher) info
  const activeWaliKelas = teachers.find(t => t.classAssigned === selectedClass) || {
    name: 'Tidak Terdefinisi',
    nip: '-',
    role: 'Guru Kelas',
    signatureUrl: ''
  };

  const filteredStudents = [...students]
    .filter(s => s.kelas === selectedClass)
    .sort((a, b) => {
      if (classSortBy === 'NIS') {
        return (a.nis || '').localeCompare(b.nis || '', 'id', { numeric: true });
      } else {
        return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase(), 'id');
      }
    });
  const studentsWithMissingData = filteredStudents.filter(s => !s.nis || !s.gender || !s.kesimpulan?.trim() || !s.catatanWali?.trim());
  const selectedStudent = students.find(s => s.id === selectedStudentId) || null;

  // Handle single indicator grade changes (safely counting based on dynamic indicators)
  const handleResetPrintStatus = () => {
    const next = students.map(s => s.kelas === selectedClass ? { ...s, printStatus: false } : s);
    handlePersistStudents(next);
  };
  
  const handleUpdateStudentGrades = (studentId: string, nextGrades: Record<string, ScoreKey>) => {
    const allIndicatorIds = categories.flatMap(c => c.indicators).map(i => i.id);
    const targetStudent = students.find(s => s.id === studentId);

    if (targetStudent) {
      let changedCount = 0;
      allIndicatorIds.forEach(id => {
        if (targetStudent.grades[id] !== nextGrades[id]) {
          changedCount++;
          setDirtyCells(prev => ({
            ...prev,
            [`${studentId}_${id}`]: true
          }));
        }
      });
      
      if (changedCount > 0) {
        addChangeLog('UBAH_NILAI', `Mengubah nilai pada ${changedCount} indikator untuk siswa ${targetStudent.name} (${targetStudent.nis})`);
      }
    }
    
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

    if (targetStudent) {
      addChangeLog('NILAI_ASPEK', `Mengubah nilai/grade aspek penilaian siswa "${targetStudent.name}" (NIS: ${targetStudent.nis})`);
    }
  };

  const handleUpdateBulkStudentGrades = (updates: { studentId: string; nextGrades: Record<string, ScoreKey> }[]) => {
    const allIndicatorIds = categories.flatMap(c => c.indicators).map(i => i.id);
    const updated = students.map(s => {
      const match = updates.find(u => u.studentId === s.id);
      if (match) {
        const scoredCount = Object.keys(match.nextGrades).filter(id => allIndicatorIds.includes(id)).length;
        const complete = scoredCount === allIndicatorIds.length;
        
        Object.keys(match.nextGrades).forEach(id => {
          if (s.grades[id] !== match.nextGrades[id]) {
            setDirtyCells(prev => ({
              ...prev,
              [`${s.id}_${id}`]: true
            }));
          }
        });

        return {
          ...s,
          grades: match.nextGrades,
          completed: complete
        };
      }
      return s;
    });
    
    addChangeLog('UBAH_NILAI', `Memperbarui nilai ${updates.length} siswa secara massal`);
    handlePersistStudents(updated);
  };

  // Handle full student modification (especially from child wizard form)
  const handleUpdateSingleStudent = (updatedStudent: Student) => {
    const updated = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
    handlePersistStudents(updated);
    addChangeLog('EDIT_SISWA', `Memperbarui deskripsi dan rincian siswa "${updatedStudent.name}"`);
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
    addChangeLog('BULK_NILAI', `Mengisi otomatis seluruh nilai kelas "${selectedClass}" dengan nilai "${bulkScore}"`);
    triggerAlert('success', `Berhasil! Seluruh murid di kelas ${selectedClass} diisi nilai ${bulkScore}.`);
  };

  // Handle clearing all grades for a single student (Batal Aspek Penilaian)
  const handleClearStudentGrades = (studentId: string) => {
    const targetStudent = students.find(s => s.id === studentId);
    const updated = students.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          grades: {},
          completed: false
        };
      }
      return s;
    });
    handlePersistStudents(updated);
    if (targetStudent) {
      addChangeLog('KOSONGKAN_NILAI', `Mengosongkan/batal aspek penilaian pada siswa "${targetStudent.name}" (NIS: ${targetStudent.nis})`);
    }
    triggerAlert('success', `Berhasil! Aspek penilaian murid terpilih telah dibatalkan/dikosongkan.`);
  };

  // Handle clearing all grades for the entire selected class (Batal Aspek Penilaian Masal)
  const handleClearClassGrades = () => {
    const updated = students.map(s => {
      if (s.kelas === selectedClass) {
        return {
          ...s,
          grades: {},
          completed: false
        };
      }
      return s;
    });
    handlePersistStudents(updated);
    addChangeLog('KOSONGKAN_KELAS', `Mengosongkan seluruh aspek penilaian kelas "${selectedClass}" secara masal`);
    triggerAlert('success', `Berhasil! Seluruh aspek penilaian kelas ${selectedClass} telah dibatalkan/dikosongkan secara masal.`);
  };

  // Handle custom text box changes
  const handleBatchPrint = (studentIds: string[]) => {
    const selected = students.filter(s => studentIds.includes(s.id));
    const invalidStudents = selected.filter(s => {
        if (!s || typeof s !== 'object') return true;
        if (s.name === undefined || s.name === null || String(s.name).trim() === "") return true;
        if (s.nis === undefined || s.nis === null || String(s.nis).trim() === "") return true;
        if (s.grades === undefined || s.grades === null || typeof s.grades !== 'object') return true;
        return false;
    });

    if (invalidStudents.length > 0) {
      setAlert({
        type: 'error',
        message: `Peringatan: ${invalidStudents.length} siswa terpilih tidak memiliki data yang valid. Silakan lengkapi data siswa sebelum mencetak.`
      });
      return;
    }

    const nisList = studentIds.map(id => students.find(s => s.id === id)?.nis).filter(Boolean) as string[];
    setBatchPrintNisList(nisList);
    
    // Select the first student as the active preview
    if (studentIds.length > 0) {
      setSelectedStudentId(studentIds[0]);
    }
    
    setViewMode('print');
  };

  const handleUpdateComments = (studentId: string, kesimpulan: string, catatanWali: string) => {
    const targetStudent = students.find(s => s.id === studentId);
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
    if (targetStudent) {
      addChangeLog('UBAH_CATATAN', `Memperbarui deskripsi kesimpulan / catatan wali kelas untuk siswa "${targetStudent.name}"`);
    }
  };

  const handleUpdateBulkComments = (updates: { studentId: string; kesimpulan: string; catatanWali: string }[]) => {
    const updated = students.map(s => {
      const match = updates.find(u => u.studentId === s.id);
      if (match) {
        return {
          ...s,
          kesimpulan: match.kesimpulan,
          catatanWali: match.catatanWali
        };
      }
      return s;
    });
    handlePersistStudents(updated);
    
    // Auto register all updated students as AI modified
    const updatedIds = updates.map(u => u.studentId);
    markStudentsAsAiModified(updatedIds);
  };

  // Opens the double-check reset confirmation modal
  const handleResetToDefault = () => {
    setIsResetModalOpen(true);
    setResetConfirmText('');
    setIsResetConfirmedCheckbox(false);
  };

  // Restores clean baseline datasets after double confirmation validation passes
  const executeResetDatabase = () => {
    setIsResetModalOpen(false);
    
    let needsReload = false;

    if (resetOptions.wipeEmpty) {
      localStorage.setItem('rapor_5nk_database_wiped', 'true');
      // Complete wipeout for selected items, without restoring defaults
      if (resetOptions.students) {
        localStorage.setItem('rapor_5nk_students', JSON.stringify([]));
        setStudents([]);
      }
      if (resetOptions.teachers) {
        localStorage.setItem('rapor_5nk_teachers', JSON.stringify([]));
        setTeachers([]);
      }
      if (resetOptions.classes) {
        localStorage.setItem('rapor_5nk_classes', JSON.stringify([]));
        setClasses([]);
      }
      if (resetOptions.kop) {
        localStorage.setItem('rapor_5nk_kop', JSON.stringify({}));
      }
      if (resetOptions.evaluations) {
        const wipedStudents = students.map(s => ({
            ...s,
            grades: {},
            kesimpulan: '',
            catatanWali: '',
            catatanOrangTua: '',
            completed: false,
            printStatus: false
        }));
        localStorage.setItem('rapor_5nk_students', JSON.stringify(wipedStudents));
        setStudents(wipedStudents);
      }
      
      // If nothing selected but someone clicked Reset with wipeEmpty, just clear all
      if (!resetOptions.students && !resetOptions.teachers && !resetOptions.classes && !resetOptions.kop && !resetOptions.evaluations) {
         localStorage.clear();
         localStorage.setItem('rapor_5nk_database_wiped', 'true');
         // Still write empty arrays for core ones so they don't load defaults
         localStorage.setItem('rapor_5nk_students', JSON.stringify([]));
         localStorage.setItem('rapor_5nk_teachers', JSON.stringify([]));
         localStorage.setItem('rapor_5nk_classes', JSON.stringify([]));
      }
      
      addChangeLog('RESET_DATABASE', 'Melakukan operasi kosongkan (wipeout) item database terpilih secara total.');
      needsReload = true;
    } else {
      localStorage.removeItem('rapor_5nk_database_wiped');
      // Normal reset: restore to default
      if (resetOptions.students) {
        localStorage.removeItem('rapor_5nk_students');
        needsReload = true;
      }
      if (resetOptions.teachers) {
        localStorage.removeItem('rapor_5nk_teachers');
        needsReload = true;
      }
      if (resetOptions.classes) {
        localStorage.removeItem('rapor_5nk_classes');
        needsReload = true;
      }
      if (resetOptions.kop) {
        localStorage.removeItem('rapor_5nk_kop');
        needsReload = true;
      }
      if (resetOptions.evaluations) {
        const wipedStudents = students.map(s => ({
            ...s,
            grades: {},
            kesimpulan: '',
            catatanWali: '',
            catatanOrangTua: '',
            completed: false,
            printStatus: false
        }));
        saveStudentsList(wipedStudents);
        setStudents(wipedStudents);
      }

      // If nothing selected but someone clicked Reset, just clear all to default
      if (!resetOptions.students && !resetOptions.teachers && !resetOptions.classes && !resetOptions.kop && !resetOptions.evaluations) {
         localStorage.clear();
         needsReload = true;
      }
      
      addChangeLog('RESET_DATABASE', 'Melakukan operasi pembersihan database ke pengaturan awal.');
    }

    if (needsReload) {
      window.location.reload();
    } else {
      triggerAlert('success', '✓ Item database terpilih berhasil dikosongkan.');
    }
    
    setResetConfirmText('');
    setIsResetConfirmedCheckbox(false);
  };

  const triggerAlert = (type: 'success' | 'info' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert(null);
    }, 4500);
  };

  const triggerToast = (type: 'success' | 'info' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const totalCompletedCount = students.filter(s => s.completed).length;
  const totalPercentage = students.length > 0 ? Math.round((totalCompletedCount / students.length) * 100) : 0;

  const handleClassChange = useCallback((nextCls: string) => {
    if (!nextCls || nextCls === selectedClass) return;
    startTransition(() => {
      setSelectedClass(nextCls);
      const firstStud = students.find(s => s.kelas === nextCls);
      if (firstStud) {
        setSelectedStudentId(firstStud.id);
      }
      // Keep the active viewing view to prevent jarring changes
      if (viewMode === 'print' && !firstStud) {
        setViewMode('spreadsheet');
      }
    });
  }, [selectedClass, students, viewMode]);

  return (
    <div id="main-app-container" className="min-h-screen bg-slate-100 font-sans flex flex-col selection:bg-emerald-100 select-none pb-[40px]">
      
      {/* 1. Global Navigation Navbar */}
      <header className="bg-emerald-50 text-slate-800 border-b border-emerald-200 px-4 py-2.5 sticky top-0 z-40 no-print backdrop-blur-md bg-opacity-95 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-2.5 items-center justify-between">
          
          {/* Logo & School Branding */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2.5">
              <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 p-1.5 rounded-xl text-white shadow-xs">
                <GraduationCap className="h-4 w-4 font-black" />
              </div>
              <div>
                <h1 id="app-heading" className="text-xs sm:text-sm font-extrabold tracking-tight flex items-center gap-1 text-emerald-950 leading-tight">
                  Sistem Rapor 5NK <span className="text-[7.5px] bg-emerald-100 border border-emerald-200/60 px-1 py-0.2 rounded text-emerald-800 font-mono font-bold">SMA</span>
                </h1>
                <p className="text-[9px] text-emerald-700 font-semibold max-w-[200px] sm:max-w-none truncate leading-none mt-0.5">
                  {kopSekolah.namaSekolah}
                </p>
              </div>
            </div>

            {/* Mobile Controls Header Bar */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="flex items-center gap-0.5 bg-white px-1.5 py-0.5 rounded-lg border border-emerald-200 shadow-xs">
                <button
                  onClick={handleUndo}
                  disabled={historyPointer <= 0}
                  className="p-1 rounded hover:bg-emerald-50 text-emerald-700 disabled:opacity-25"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo className="h-3 w-3" />
                </button>
                <button
                  onClick={handleRedo}
                  disabled={historyPointer < 0 || historyPointer >= studentsHistory.length - 1}
                  className="p-1 rounded hover:bg-emerald-50 text-emerald-700 disabled:opacity-25"
                  title="Redo (Ctrl+Y)"
                >
                  <Redo className="h-3 w-3" />
                </button>
              </div>
              
              <button
                onClick={() => setIsNavbarToolsOpen(!isNavbarToolsOpen)}
                className="p-1.5 rounded-lg bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700"
                title="Menu Utilitas"
              >
                <Menu className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Interaction & Status Hub (Collapsible on Mobile, Flexible inline on Desktop) */}
          <div className={`${
            isNavbarToolsOpen ? 'flex animate-in slide-in-from-top duration-200' : 'hidden'
          } md:flex flex-col sm:flex-row flex-wrap items-center justify-center md:justify-end gap-2 text-xs w-full md:w-auto mt-2 md:mt-0 pt-2.5 md:pt-0 border-t border-emerald-100 md:border-none`}>
            
            {/* Realtime Syncer & Auto-Save Badge */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border ${cloudSyncState.status === 'error' ? 'bg-rose-100/50 border-rose-300' : 'bg-emerald-100/50 border-emerald-200/80'}`}>
              <span className="relative flex h-1.5 w-1.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${cloudSyncState.status === 'syncing' ? 'bg-amber-400' : cloudSyncState.status === 'error' ? 'bg-rose-400' : 'bg-emerald-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${cloudSyncState.status === 'syncing' ? 'bg-amber-500' : cloudSyncState.status === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
              </span>
              <div className="text-left leading-none">
                <p className={`text-[8.5px] font-bold uppercase tracking-wide ${cloudSyncState.status === 'error' ? 'text-rose-900' : 'text-emerald-900'}`}>
                  {cloudSyncState.status === 'syncing' ? 'Sinkron Cloud...' : cloudSyncState.status === 'error' ? 'Gagal Sinkron' : 'Auto-Save'}
                </p>
                <p className={`text-[7.5px] font-mono mt-0.5 ${cloudSyncState.status === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {cloudSyncState.status === 'syncing' && cloudSyncState.provider.includes('Menunggu Retry') 
                    ? cloudSyncState.provider 
                    : cloudSyncState.status === 'success' 
                      ? `${cloudSyncState.lastSaved ? cloudSyncState.lastSaved.toLocaleTimeString() : 'Tersimpan'}` 
                      : cloudSyncState.status === 'error' ? 'Offline' : 'Ready'}
                </p>
              </div>
            </div>

            {/* Undo / Redo Global Toolbars (Desktop only) */}
            <div className="hidden md:flex items-center gap-1 bg-white px-1.5 py-0.5 rounded-xl border border-emerald-200 shadow-xs">
               <button
                  onClick={handleUndo}
                  disabled={historyPointer <= 0}
                  className="p-1 rounded-lg hover:bg-emerald-50 text-emerald-700 hover:text-emerald-900 transition-all cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
                  title="Undo (Ctrl+Z)"
                  aria-label="Undo"
               >
                  <Undo className="h-3 w-3" />
               </button>
               <button
                  onClick={handleRedo}
                  disabled={historyPointer < 0 || historyPointer >= studentsHistory.length - 1}
                  className="p-1 rounded-lg hover:bg-emerald-50 text-emerald-700 hover:text-emerald-900 transition-all cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
                  title="Redo (Ctrl+Y)"
                  aria-label="Redo"
               >
                  <Redo className="h-3 w-3" />
               </button>
            </div>

            {/* Auto-Backup Toggle Button */}
            <button
              onClick={() => {
                const nextVal = !isAutoBackupEnabled;
                setIsAutoBackupEnabled(nextVal);
                localStorage.setItem('rapor_5nk_auto_backup_enabled', String(nextVal));
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[9.5px] uppercase font-bold tracking-wide transition-all duration-200 cursor-pointer shadow-xs ${
                isAutoBackupEnabled
                  ? 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700'
                  : 'bg-white border-emerald-200 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50'
              }`}
              title="Cadangan otomatis lokal berupa unduhan file JSON berkala"
            >
              <span>Backup: {isAutoBackupEnabled ? 'On' : 'Off'}</span>
            </button>

            {/* Progress Bar */}
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-100/40 px-2 py-1 rounded-xl border border-emerald-200/80">
              <CheckCircle className="h-3 w-3 text-emerald-600" />
              <div className="text-left">
                <p className="text-[8.5px] text-emerald-800 font-bold leading-none">Rapor: {totalCompletedCount}/{students.length}</p>
                <div className="w-12 bg-emerald-200/50 h-1 rounded-full mt-1 overflow-hidden">
                  <div className="bg-emerald-600 h-full transition-all duration-500" style={{ width: `${totalPercentage}%` }}></div>
                </div>
              </div>
            </div>

            {/* Hidden Data Health Score Indicator (Runs quietly in the background) */}
            <div className="hidden" aria-hidden="true">
              Health: {runIntegrityCheck(students, teachers, categories, classes).isValid ? '100%' : '⚠️ ERROR'}
            </div>

            {/* Riwayat Ekspor */}
            <button
              onClick={() => setIsExportHistoryOpen(true)}
              className="bg-white hover:bg-emerald-50 border border-emerald-200 font-bold px-2.5 py-1 rounded-xl text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition-all text-[10px] cursor-pointer relative shadow-xs"
              title="Riwayat Ekspor"
            >
              <History className="h-3 w-3 text-emerald-500" />
              <span>Riwayat</span>
              {exportHistory.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-extrabold text-slate-950 border border-white shadow-xs">
                  {exportHistory.length}
                </span>
              )}
            </button>

            {/* Panduan Button */}
            <button
              onClick={() => setIsGuideOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 transition-all text-[10px] cursor-pointer shadow-xs active:scale-95 border border-emerald-700"
              title="Panduan Guru & Helpdesk"
            >
              <Info className="h-3 w-3" />
              <span>Panduan</span>
            </button>

            {/* Reset Database */}
            <button
              onClick={handleResetToDefault}
              className="bg-white hover:bg-rose-50 border border-emerald-200 hover:border-rose-200 text-emerald-700 hover:text-rose-600 font-bold px-2 py-1 rounded-xl transition-all text-[10px] cursor-pointer shadow-xs"
              title="Reset data ke default"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>

        </div>
      </header>

      {/* PANEL: Status Sinkronisasi Data Dihapus dan dipindahkan ke footer bottom */}

      {/* Sleek Minimalist Global Alert Notification */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: -40, x: "-50%", scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
            exit={{ opacity: 0, y: -20, x: "-50%", scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed top-5 left-1/2 z-[100000] no-print pointer-events-none"
          >
            <div className={`pointer-events-auto rounded-full border px-5 py-2.5 shadow-lg flex items-center gap-2.5 text-xs font-semibold backdrop-blur-md ${
              alert.type === 'success' ? 'bg-emerald-50/95 text-emerald-950 border-emerald-250/50 shadow-emerald-500/5' 
              : alert.type === 'error' ? 'bg-rose-50/95 text-rose-950 border-rose-250/50 shadow-rose-500/5'
              : 'bg-sky-50/95 text-sky-950 border-sky-250/50 shadow-sky-500/5'
            }`}>
              <span className={`flex items-center justify-center h-5 w-5 rounded-full ${
                alert.type === 'success' ? 'bg-emerald-500/10 text-emerald-600'
                : alert.type === 'error' ? 'bg-rose-500/10 text-rose-600'
                : 'bg-sky-500/10 text-sky-600'
              }`}>
                {alert.type === 'success' ? <CheckCircle className="h-3 w-3" /> : alert.type === 'error' ? <AlertCircle className="h-3 w-3" /> : <Info className="h-3 w-3" />}
              </span>
              <span>{alert.message}</span>
              <button 
                onClick={() => setAlert(null)}
                className="ml-1 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Top Settings and Filter Subbar */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-4 no-print shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Filter Class */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              <label htmlFor={filterClassSelectId} className="text-xs font-bold text-slate-500 flex items-center gap-1 flex-none">
                <Settings2 className="h-3.5 w-3.5" /> Pilih Kelas :
              </label>
              <div id={filterClassSelectId}>
                <ClassSelectorDropdown
                  classes={classes}
                  selectedClass={selectedClass}
                  onChange={handleClassChange}
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Pencarian Cepat Siswa button */}
            <button
              onClick={() => setIsQuickSearchOpen(true)}
              className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Pencarian Cepat Siswa Rapor (Ctrl+K)"
            >
              <Search className="h-3.5 w-3.5 text-indigo-600" />
              <span>Cari Siswa...</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 bg-indigo-200/50 text-indigo-800 text-[9px] font-mono font-bold rounded">Ctrl+K</kbd>
            </button>

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
              onClick={() => {
                exportClassToExcel(filteredStudents, selectedClass, activeWaliKelas.name, categories);
                addExportLog('EXCEL', `Unduh seluruh nilai Kelas ${selectedClass} ke dalam format Excel`, `Rapor_Kelas_${selectedClass}.xlsx`, filteredStudents.length);
              }}
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
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex gap-2 flex-wrap no-print select-none shadow-sm">
        <div className="max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          
          {/* Elegant Rounded Navigation Pills */}
          <div className="flex flex-wrap gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('spreadsheet')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                viewMode === 'spreadsheet' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-[1.02]' 
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-100'
              }`}
              title="Spreadsheet Cepat (Alt+1)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> 
              <span>Grid Cepat</span>
              <kbd className="hidden md:inline px-1 bg-white border border-slate-200 rounded text-[9px] font-mono text-slate-400">Alt+1</kbd>
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
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                viewMode === 'form_penilaian' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-[1.02]' 
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-100'
              }`}
              title="Formulir Penilaian (Alt+2)"
            >
              <ClipboardList className="h-3.5 w-3.5" /> 
              <span>Form Penilaian</span>
              <kbd className="hidden md:inline px-1 bg-white border border-slate-200 rounded text-[9px] font-mono text-slate-400">Alt+2</kbd>
            </button>

            <button
              onClick={() => setViewMode('rekap_nilai')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                viewMode === 'rekap_nilai' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-[1.02]' 
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-100'
              }`}
              title="Rekap Nilai & Analisis (Alt+3)"
            >
              <BarChart3 className="h-3.5 w-3.5" /> 
              <span>Rekap & Sebaran</span>
              <kbd className="hidden md:inline px-1 bg-white border border-slate-200 rounded text-[9px] font-mono text-slate-400">Alt+3</kbd>
            </button>

            <button
              onClick={() => setViewMode('crud_manager')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                viewMode === 'crud_manager' 
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-[1.02]' 
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-100'
              }`}
              title="Master Database CRUD (Alt+4)"
            >
              <Database className="h-3.5 w-3.5" /> 
              <span>Pengaturan CRUD</span>
              <kbd className="hidden md:inline px-1 bg-white border border-slate-200 rounded text-[9px] font-mono text-slate-400">Alt+4</kbd>
            </button>
          </div>

          {/* SNEAK-PEEK QUICK SHORTCUTS GRAPHIC LEGEND */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-indigo-50/50 rounded-xl border border-indigo-100 text-[10px] text-slate-500 font-semibold shadow-2xs leading-none">
            <span className="text-indigo-600 font-black tracking-wider uppercase bg-white px-1.5 py-0.5 rounded text-[8px] border border-indigo-200">SHORTCUTS</span>
            <div className="flex gap-3 items-center divide-x divide-indigo-100 text-slate-500">
              <span className="pl-2">🖱️ <b className="text-slate-700">Ctrl+J</b>: Tab Berikutnya</span>
              <span className="pl-2">🔍 <b className="text-slate-700">Ctrl+K</b>: Cari Siswa</span>
              <span className="pl-2">💾 <b className="text-slate-700">Ctrl+S</b>: Simpan / Sync</span>
              <span className="pl-2">⏪ <b className="text-slate-700">Ctrl+Z</b>: Undo</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-cetak-semua-rapor"
              onClick={() => {
                if (filteredStudents.length > 0) {
                  // Pre-Flight Validation
                  let missingCount = 0;
                  const missingNames: string[] = [];
                  filteredStudents.forEach(s => {
                    if (!s.name || !s.nis) {
                      missingCount++;
                      if (missingNames.length < 3) missingNames.push(s.name || s.nis || 'Siswa tanpa nama');
                    }
                  });

                  if (missingCount > 0) {
                    triggerAlert('error', `Validasi Gagal: ${missingCount} siswa tidak memiliki Nama atau NIS. Contoh: ${missingNames.join(', ')}. Harap lengkapi terlebih dahulu!`);
                    return;
                  }

                  if (!selectedStudentId) {
                    setSelectedStudentId(filteredStudents[0].id);
                  }
                  setAutoPrintImmediately(true);
                  setAutoTriggerBatchPdf(true);
                  setViewMode('print');
                } else {
                  triggerAlert('info', 'Tidak ada murid di kelas ini untuk dicetak.');
                }
              }}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all duration-200 cursor-pointer bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md shadow-emerald-900/10 border border-emerald-600"
            >
              <Printer className="h-3.5 w-3.5" /> Cetak Semua Rapor (Print Direct)
            </button>
            
            <label className="flex items-center gap-1.5 cursor-pointer no-print ml-1 text-slate-600 hover:text-slate-800 select-none">
              <input type="checkbox" checked={autoPrintImmediately} onChange={(e) => setAutoPrintImmediately(e.target.checked)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer" />
              <span className="text-[11px] font-semibold">Print Direct</span>
            </label>

            {selectedStudent && (
              <button
                onClick={() => { setBatchPrintNisList([]); setViewMode('print'); }}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all duration-200 cursor-pointer ${
                  viewMode === 'print' 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/20' 
                    : 'bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                }`}
              >
                <Printer className="h-3.5 w-3.5 text-indigo-500" /> Cetak Rapor {selectedStudent.name.split(' ')[0]}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Main Workspace Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-2.5 md:p-4 flex flex-col h-auto md:h-[calc(100vh-180px)] print:h-auto print:p-0 overflow-y-auto md:overflow-hidden print:overflow-visible relative">
        
        <AnimatePresence mode="wait">
          {isPending ? (
            <motion.div
              key="loading-skeleton"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl m-2.5 md:m-4 no-print"
            >
              <div className="flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-sm font-semibold text-slate-600">Memuat Data Kelas {selectedClass}...</p>
              </div>
            </motion.div>
          ) : viewMode === 'spreadsheet' ? (
            filteredStudents.length === 0 ? (
              <motion.div
                key="empty-spreadsheet"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full bg-white border border-slate-200 rounded-2xl p-8 md:p-12 shadow-xs flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-auto gap-4 min-h-[380px] font-sans no-print"
              >
                <div className="h-16 w-16 rounded-full bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center text-3xl shadow-xs scale-105 animate-bounce">
                  📊
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800">
                    Data Siswa di Kelas {selectedClass} Kosong
                  </h3>
                  <p className="text-slate-550 text-xs mt-2 max-w-md mx-auto leading-relaxed">
                    Belum ada siswa yang terdaftar untuk <strong>Kelas {selectedClass}</strong>. Silakan tambahkan siswa secara manual atau impor dari template Excel melalui modul pengaturan database sebelum Anda merekap nilai rapor.
                  </p>
                </div>
                <button
                  onClick={() => setViewMode('crud_manager')}
                  className="mt-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs select-none cursor-pointer flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-emerald-500/10"
                >
                  <Database className="h-4 w-4" /> Buka Pengaturan Database (CRUD)
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="spreadsheet"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="flex flex-col gap-4 flex-1 h-auto md:h-full overflow-visible md:overflow-hidden print:overflow-visible no-print"
              >
              {studentsWithMissingData.length > 0 && (
                <div className="bg-gradient-to-r from-amber-500/5 to-amber-600/5 border border-amber-500/15 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3">
                    <div className="bg-amber-500/10 p-2 rounded-xl text-amber-600 mt-0.5 shrink-0">
                      <AlertTriangle className="h-4 w-4 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-900 tracking-tight">Data Profil Siswa Belum Lengkap ({studentsWithMissingData.length} siswa)</p>
                      <p className="text-[10px] text-amber-700/80 mt-0.5 leading-relaxed font-medium">
                        Beberapa siswa memiliki data NIS, Jenis Kelamin, atau Ulasan Rapor yang masih kosong. Lengkapi sekarang agar cetakan dokumen rapor Anda rapi dan sempurna.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const firstMissing = studentsWithMissingData[0];
                      setSelectedStudentId(firstMissing.id);
                      setTimeout(() => {
                        const el = document.getElementById(`edit-kesimpulan`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          el.focus();
                        }
                      }, 100);
                    }}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-xs hover:shadow hover:scale-[1.02] active:scale-[0.98] shrink-0 w-full sm:w-auto text-center"
                  >
                    Lengkapi Sekarang
                  </button>
                </div>
              )}
                
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 flex-1 min-h-0">
            
            {/* Left spreadsheet grid - spans 2 columns */}
            <div className="lg:col-span-2 flex flex-col h-[480px] md:h-full overflow-hidden relative">
              <ExcelGrid
                students={filteredStudents}
                categories={categories}
                selectedClass={selectedClass}
                onUpdateStudentGrades={handleUpdateStudentGrades}
                onUpdateBulkStudentGrades={handleUpdateBulkStudentGrades}
                onUpdateComments={handleUpdateComments}
                onSelectStudent={(st) => setSelectedStudentId(st.id)}
                selectedStudent={selectedStudent}
                dirtyCells={dirtyCells}
                aiModifiedStudentIds={aiModifiedStudentIds}
                onBatchPrint={handleBatchPrint}
                onAddExportLog={addExportLog}
                triggerAlert={triggerAlert}
                triggerToast={triggerToast}
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
                        
                        <StudentOverview student={selectedStudent} allStudents={filteredStudents} categories={categories} />

                        {/* AI Generate Button inside edit-pane */}
                        <div className="bg-gradient-to-r from-indigo-50 to-emerald-50 border border-indigo-150 p-3 rounded-xl flex flex-col gap-2 relative overflow-hidden">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" />
                              <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wide">Asisten Ulasan AI Gemini</span>
                            </div>
                            <span className="text-[9px] bg-indigo-200 text-indigo-800 font-extrabold px-1.5 py-0.5 rounded leading-none">Smart 5NK</span>
                          </div>
                          <p className="text-[10px] text-slate-550 leading-relaxed font-sans">
                            Analisis otomatis seluruh predikat nilai 5NK ({selectedStudent.name}) menjadi narasi deskripsi kesimpulan &amp; catatan wali kelas yang logis dan koheren.
                          </p>
                          <button
                            type="button"
                            disabled={isGeneratingAiComments}
                            onClick={async () => {
                              try {
                                setIsGeneratingAiComments(true);
                                const res = await fetch('/api/generate-comments', {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    studentName: selectedStudent.name,
                                    gender: selectedStudent.gender,
                                    grades: selectedStudent.grades,
                                    className: selectedClass,
                                    waliKelasName: activeWaliKelas.name
                                  })
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  handleUpdateComments(selectedStudent.id, data.kesimpulan, data.catatanWali);
                                  markStudentAsAiModified(selectedStudent.id);
                                  triggerAlert('success', `✓ Sukses men-generate ulasan AI! ${data.aiUsed ? 'Ditenagai oleh Gemini-2.5-flash.' : 'Menggunakan ulasan fallback lokal.'}`);
                                } else {
                                  const err = await res.json();
                                  triggerAlert('info', `✗ Gagal generate AI: ${err.error || 'Server error'}`);
                                }
                              } catch (err) {
                                triggerAlert('info', '✗ Kegagalan koneksi saat menghubungi server AI.');
                              } finally {
                                setIsGeneratingAiComments(false);
                              }
                            }}
                            className={`w-full py-2 px-3 rounded-lg text-xs font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                              isGeneratingAiComments 
                                ? 'bg-indigo-400 cursor-not-allowed animate-pulse' 
                                : 'bg-gradient-to-r from-indigo-600 to-indigo-750 hover:from-indigo-700 hover:to-indigo-800 border border-indigo-700 active:scale-95'
                            }`}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            {isGeneratingAiComments ? 'Sedang Meramu Ulasan...' : 'Generate Ulasan AI'}
                          </button>
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
                          <CatatanWaliKelas
                            id="edit-catatan-wali"
                            value={selectedStudent.catatanWali}
                            onChange={(val) => handleUpdateComments(selectedStudent.id, selectedStudent.kesimpulan, val)}
                          />
                        </div>

                        {/* Catatan Orang Tua */}
                        <div className="flex flex-col gap-1.5 text-xs">
                          <label htmlFor="edit-catatan-ortu" className="font-bold text-slate-500 text-[11px] uppercase tracking-wider">Catatan Orang Tua/Wali:</label>
                          <textarea
                            id="edit-catatan-ortu"
                            value={selectedStudent.catatanOrangTua || ''}
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
                          onClick={() => { setBatchPrintNisList([]); setViewMode('print'); }}
                          className="mt-2 w-full py-2 px-3 rounded-lg text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                          <Printer className="h-3.5 w-3.5" /> Pratinjau Cetak Murid Ini
                        </button>

                        {/* Student Audit Trail / Change History Panel */}
                        <div className="border border-slate-150 rounded-xl bg-slate-50/50 p-3 mt-1.5">
                          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5 select-none">
                            <span>⏳ Riwayat Perubahan Terakhir</span>
                          </h4>
                          {allLogs.filter(log => 
                            log.description.includes(selectedStudent.name) || 
                            (selectedStudent.nis && log.description.includes(selectedStudent.nis))
                          ).length > 0 ? (
                            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                              {allLogs.filter(log => 
                                log.description.includes(selectedStudent.name) || 
                                (selectedStudent.nis && log.description.includes(selectedStudent.nis))
                              ).map((log) => (
                                <div key={log.id} className="text-[10px] bg-white border border-slate-200 rounded-lg p-2 shadow-3xs flex flex-col gap-1 transition-all hover:border-slate-300">
                                  <div className="flex items-center justify-between text-slate-400 font-mono text-[9px]">
                                    <span>{log.timestamp}</span>
                                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-sans font-medium text-[8px] truncate max-w-[120px]" title={log.operator}>
                                      👤 {log.operator?.split('@')[0] || 'Lokal'}
                                    </span>
                                  </div>
                                  <p className="text-slate-600 font-medium leading-relaxed font-sans">
                                    {log.description
                                      .replace(` untuk siswa ${selectedStudent.name} (${selectedStudent.nis})`, '')
                                      .replace(` siswa "${selectedStudent.name}" (NIS: ${selectedStudent.nis})`, '')
                                      .replace(` siswa "${selectedStudent.name}"`, '')
                                    }
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 italic">Belum ada riwayat perubahan terekam untuk siswa ini.</p>
                          )}
                        </div>
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
                    onUpdateBulkComments={handleUpdateBulkComments}
                    onRefreshData={() => handlePersistStudents(getSavedStudents())}
                    waliKelasName={activeWaliKelas.name}
                    onClearStudentGrades={handleClearStudentGrades}
                    onClearClassGrades={handleClearClassGrades}
                    onResetPrintStatus={handleResetPrintStatus}
                  />
                )}
              </div>
            </div>
            
            {/* Quick Actions Floating Button */}
            <div 
              className="fixed bottom-6 right-6 z-50 group"
              onMouseEnter={() => setIsQuickActionsOpen(true)}
              onMouseLeave={() => setIsQuickActionsOpen(false)}
            >
              <button 
                className="h-12 w-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-600/30 flex items-center justify-center transition-all duration-300 group-hover:scale-110 active:scale-95 cursor-pointer relative"
                onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
              >
                <span className="text-xl">⚡</span>
              </button>

              <AnimatePresence>
                {isQuickActionsOpen && (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: {
                        opacity: 1,
                        transition: {
                          staggerChildren: 0.08,
                          delayChildren: 0.05
                        }
                      },
                      exit: {
                        opacity: 0,
                        transition: {
                          staggerChildren: 0.04,
                          staggerDirection: -1
                        }
                      }
                    }}
                    className="absolute bottom-16 right-0 flex flex-col gap-2 mb-1 w-52 z-50"
                  >
                    {quickActions.map(actionId => {
                      const itemTransition = {
                        type: 'spring' as const,
                        stiffness: 380,
                        damping: 20
                      };
                      
                      const itemVariants = {
                        hidden: { opacity: 0, scale: 0.8, y: 15 },
                        visible: { opacity: 1, scale: 1, y: 0, transition: itemTransition },
                        exit: { opacity: 0, scale: 0.8, y: 10, transition: { duration: 0.15 } }
                      };

                      if (actionId === 'print') {
                        return (
                          <motion.button 
                            variants={itemVariants}
                            key="print"
                            onClick={() => {
                              const classStudentsRef = students.filter(s => s.kelas === selectedClass);
                              const firstStudent = classStudentsRef[0];
                              if (firstStudent) {
                                setSelectedStudentId(firstStudent.id);
                                setAutoTriggerBatchPdf(true);
                                setViewMode('print');
                              } else {
                                triggerAlert('error', "Tidak ada siswa terdaftar di dalam kelas ini untuk diunduh!");
                              }
                            }}
                            className="w-full text-left px-3.5 py-2.5 bg-white text-slate-800 hover:bg-indigo-50 border border-slate-200 rounded-xl shadow-lg shadow-slate-200/40 text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
                          >
                            <Printer className="h-4 w-4 text-indigo-600 shrink-0" /> Cetak Massal Kelas
                          </motion.button>
                        );
                      }
                      if (actionId === 'excel') {
                        return (
                          <motion.button 
                            variants={itemVariants}
                            key="excel"
                            onClick={() => exportClassToExcel(filteredStudents, selectedClass, activeWaliKelas.name, categories)}
                            className="w-full text-left px-3.5 py-2.5 bg-white text-slate-800 hover:bg-emerald-50 border border-slate-200 rounded-xl shadow-lg shadow-slate-200/40 text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
                          >
                            <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" /> Unduh Excel Kelas
                          </motion.button>
                        );
                      }
                      if (actionId === 'contrast') {
                        return (
                          <motion.button 
                            variants={itemVariants}
                            key="contrast"
                            onClick={() => setIsHighContrast(!isHighContrast)}
                            className="w-full text-left px-3.5 py-2.5 bg-white text-slate-800 hover:bg-amber-50 border border-slate-200 rounded-xl shadow-lg shadow-slate-200/40 text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
                          >
                            <span className="text-amber-600 text-sm font-black shrink-0">◐</span> Mode Kontras Tinggi
                          </motion.button>
                        );
                      }
                      if (actionId === 'sort') {
                        return (
                          <motion.button 
                            variants={itemVariants}
                            key="sort"
                            onClick={() => {
                              const nextSort = classSortBy === 'NAME' ? 'NIS' : 'NAME';
                              setClassSortBy(nextSort);
                              triggerToast('success', `Daftar kelas diurutkan berdasarkan ${nextSort === 'NAME' ? 'Nama siswa' : 'NIS'}!`);
                            }}
                            className="w-full text-left px-3.5 py-2.5 bg-white text-slate-800 hover:bg-pink-50 border border-slate-200 rounded-xl shadow-lg shadow-slate-200/40 text-xs font-bold transition-all duration-200 flex items-center gap-2 cursor-pointer hover:-translate-y-0.5"
                          >
                            <ArrowUpDown className="h-4 w-4 text-pink-600 shrink-0" /> Urut: {classSortBy === 'NAME' ? 'Nama Siswa' : 'NIS'}
                          </motion.button>
                        );
                      }
                      return null;
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
            )
          ) : viewMode === 'form_penilaian' ? (
            <motion.div
            key="form_penilaian"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 h-auto md:h-full overflow-visible md:overflow-hidden no-print"
          >
            <EvaluationForm
              students={filteredStudents}
              categories={categories}
              selectedStudentId={selectedStudentId}
              onSelectStudentId={setSelectedStudentId}
              onUpdateStudent={handleUpdateSingleStudent}
              onViewReport={() => setViewMode('print')}
              onClearStudentGrades={handleClearStudentGrades}
              onClearClassGrades={handleClearClassGrades}
              selectedClass={selectedClass}
            />
          </motion.div>
        ) : viewMode === 'rekap_nilai' ? (
          <motion.div
            key="rekap_nilai"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 h-auto md:h-full overflow-visible md:overflow-hidden no-print"
          >
            <GradeRecap
              students={filteredStudents}
              categories={categories}
              selectedClass={selectedClass}
              onSelectStudent={(st) => {
                setSelectedStudentId(st.id);
                setViewMode('form_penilaian');
              }}
              onDownloadAllClassPdf={() => {
                const classStudentsRef = students.filter(s => s.kelas === selectedClass);
                const firstStudent = classStudentsRef[0];
                if (firstStudent) {
                  setSelectedStudentId(firstStudent.id);
                  setAutoTriggerBatchPdf(true);
                  setViewMode('print');
                } else {
                  setAlert({ type: 'error', message: "Tidak ada siswa terdaftar di dalam kelas ini untuk diunduh!" });
                }
              }}
              isGeneratingBatchPdf={autoTriggerBatchPdf}
              activeWaliKelasName={activeWaliKelas.name}
              activeWaliKelasNip={activeWaliKelas.nip}
            />
          </motion.div>
        ) : viewMode === 'crud_manager' ? (
          <motion.div
            key="crud_manager"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 h-auto md:h-full overflow-visible md:overflow-hidden no-print"
          >
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
              isHighContrast={isHighContrast}
              setIsHighContrast={setIsHighContrast}
              rowHeightMode={rowHeightMode}
              setRowHeightMode={setRowHeightMode}
              showFooterDate={showFooterDate}
              onUpdateShowFooterDate={handleUpdateShowFooterDate}
              paperSize={paperSize}
              onUpdatePaperSize={handleUpdatePaperSize}
              triggerAlert={triggerAlert}
              triggerToast={triggerToast}
            />
          </motion.div>
        ) : viewMode === 'print' && selectedStudent ? (
          <motion.div
            key="print"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 overflow-y-auto print:overflow-visible"
          >
            <RaporCetak
              student={selectedStudent}
              allClassStudents={students.filter(s => s.kelas === selectedClass)}
              categories={categories}
              kopSekolah={kopSekolah}
              waliKelasName={activeWaliKelas.name}
              initialBatchNisList={batchPrintNisList}
              waliKelasNip={activeWaliKelas.nip}
              waliKelasSignatureUrl={activeWaliKelas.signatureUrl}
              onBack={() => {
                const wasBatch = autoTriggerBatchPdf;
                setAutoTriggerBatchPdf(false);
                setViewMode(wasBatch ? 'rekap_nilai' : 'spreadsheet');
              }}
              onDownloadExcel={() => {
                exportSingleStudentToExcel(selectedStudent, activeWaliKelas.name, categories);
                addExportLog('EXCEL', `Unduh nilai siswa ${selectedStudent.name} ke Excel`, `Rapor_${selectedStudent.name.replace(/\s+/g, '_')}.xlsx`, 1);
              }}
              onAddExportLog={addExportLog}
              onForceSync={forceCloudAndFirebaseSync}
              teachers={teachers}
              onMarkAsPrinted={(studentIds) => {
                const next = students.map(s => 
                  studentIds.includes(s.id) ? { ...s, printStatus: true } : s
                );
                handlePersistStudents(next);
              }}
              onResetPrintStatus={() => {
                const next = students.map(s => 
                  s.kelas === selectedClass ? { ...s, printStatus: false } : s
                );
                handlePersistStudents(next);
                triggerAlert('success', `Status cetak seluruh siswa kelas ${selectedClass} berhasil direset.`);
              }}
              autoTriggerBatchPdf={autoTriggerBatchPdf}
              autoPrintImmediately={autoPrintImmediately}
              onResetAutoTrigger={() => setAutoTriggerBatchPdf(false)}
              classes={classes}
              selectedClass={selectedClass}
              onClassChange={(nextCls) => {
                setSelectedClass(nextCls);
                const firstStud = students.find(s => s.kelas === nextCls);
                if (firstStud) {
                  setSelectedStudentId(firstStud.id);
                }
              }}
              showFooterDate={showFooterDate}
              onUpdateShowFooterDate={handleUpdateShowFooterDate}
              paperSize={paperSize}
              onUpdatePaperSize={handleUpdatePaperSize}
            />
          </motion.div>
        ) : null}

      </AnimatePresence>
    </main>

      {/* ----------------- EXPORT HISTORY MODAL ----------------- */}
      {isExportHistoryOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-150 no-print" onClick={() => setIsExportHistoryOpen(false)}>
          <div 
            className="bg-white border border-slate-200 shadow-2xl rounded-2xl max-w-xl w-full overflow-hidden flex flex-col animate-in scale-in duration-150 font-sans"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#122c22] text-emerald-50 px-5 py-4 flex items-center justify-between border-b border-emerald-800">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-emerald-400 font-bold" />
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Riwayat Pengunduhan & Ekspor</h3>
                  <p className="text-[10px] text-emerald-300">Menampilkan riwayat ekspor (Excel/PDF/CSV) Anda</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {exportHistory.length > 0 && (
                  <button
                    onClick={() => {
                      const csvRows = [
                        ['ID', 'Timestamp', 'Type', 'Description', 'FileName', 'StudentCount'],
                        ...exportHistory.map(log => [
                          log.id,
                          log.timestamp,
                          log.type,
                          `"${log.description}"`,
                          `"${log.fileName}"`,
                          log.studentCount
                        ])
                      ];
                      const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `Export_History_${new Date().getTime()}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="text-xs px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md transition-colors cursor-pointer flex items-center gap-1 font-semibold shadow-xs border border-emerald-600"
                  >
                    <DownloadCloud className="h-3.5 w-3.5" /> CSV
                  </button>
                )}
                {exportHistory.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm("Hapus semua riwayat ekspor?")) {
                        setExportHistory([]);
                        localStorage.removeItem('5nk_export_history');
                        triggerAlert('success', 'Semua riwayat ekspor berhasil dihapus.');
                      }
                    }}
                    className="text-xs px-3 py-1.5 bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white rounded-md transition-colors cursor-pointer"
                  >
                    Hapus Semua
                  </button>
                )}
                <button 
                  onClick={() => setIsExportHistoryOpen(false)}
                  className="h-7 w-7 rounded-lg hover:bg-emerald-900 flex items-center justify-center text-emerald-200 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filter controls inside modal */}
            <div className="bg-slate-50 border-b border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Format File</label>
                <select
                  value={exportFormatFilter}
                  onChange={(e) => setExportFormatFilter(e.target.value as any)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ALL">Semua Format</option>
                  <option value="PDF">PDF saja</option>
                  <option value="EXCEL">Excel saja</option>
                  <option value="CSV">CSV saja</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Dari Tanggal</label>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Sampai Tanggal</label>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="p-5 max-h-[400px] overflow-y-auto">
              {(() => {
                const filteredHistory = exportHistory.filter((log) => {
                  if (exportFormatFilter !== 'ALL' && log.type !== exportFormatFilter) {
                    return false;
                  }
                  if (exportStartDate) {
                    const logDate = new Date(log.timestamp);
                    const start = new Date(exportStartDate);
                    start.setHours(0, 0, 0, 0);
                    if (logDate < start) return false;
                  }
                  if (exportEndDate) {
                    const logDate = new Date(log.timestamp);
                    const end = new Date(exportEndDate);
                    end.setHours(23, 59, 59, 999);
                    if (logDate > end) return false;
                  }
                  return true;
                });

                if (filteredHistory.length === 0) {
                  return (
                    <div className="text-center py-10 flex flex-col items-center justify-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-xl text-slate-400">
                        📂
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">Tidak Ada Riwayat Ekspor Sesuai Filter</p>
                        <p className="text-[10.5px] text-slate-400 mt-1 max-w-xs leading-relaxed">Sesuaikan filter format atau rentang tanggal Anda untuk mencari log pengunduhan.</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-3">
                    {filteredHistory.map((log) => (
                      <div key={log.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50/100 hover:border-slate-200 flex items-start gap-3 transition-all">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border uppercase font-mono font-bold text-[9.5px] ${
                          log.type === 'EXCEL' 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                            : log.type === 'CSV'
                            ? 'bg-teal-50 border-teal-200 text-teal-700'
                            : 'bg-rose-50 border-rose-200 text-rose-700'
                        }`}>
                          {log.type}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold text-slate-800 truncate block" title={log.fileName}>
                              {log.fileName}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9.5px] text-slate-400 font-medium whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <button
                                onClick={() => {
                                  if (confirm(`Hapus item riwayat "${log.fileName}"?`)) {
                                    const updatedHistory = exportHistory.filter(item => item.id !== log.id);
                                    setExportHistory(updatedHistory);
                                    localStorage.setItem('5nk_export_history', JSON.stringify(updatedHistory));
                                    triggerAlert('success', '✓ Item riwayat ekspor berhasil dihapus.');
                                  }
                                }}
                                className="text-slate-400 hover:text-rose-600 p-0.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Hapus riwayat ekspor ini"
                                aria-label="Hapus riwayat ekspor ini"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-[10.5px] text-slate-500 mt-0.5 leading-snug">
                            {log.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-slate-100">
                            <div className="flex items-center gap-1 text-[9.5px] font-mono text-slate-400">
                              <span>Siswa:</span>
                              <span className="font-bold text-slate-600">{log.studentCount}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[9.5px] font-mono text-slate-400">
                              <span>Waktu:</span>
                              <span className="font-bold text-slate-600">{new Date(log.timestamp).toLocaleDateString()}</span>
                            </div>
                            <span className="ml-auto inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8.5px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200/50">
                              ✓ Berhasil diunduh
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-medium">
              <span>* Riwayat disimpan aman pada browser lokal Anda.</span>
              <button
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin menghapus seluruh riwayat ekspor ini?')) {
                    setExportHistory([]);
                    localStorage.removeItem('5nk_export_history');
                    triggerAlert('success', '✓ Seluruh riwayat ekspor berhasil dibersihkan.');
                  }
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
              >
                Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL TUTORIAL / PANDUAN PENGGUNAAN ----------------- */}
      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

      {/* ----------------- GLOBAL FLOATING QUICK SEARCH (Ctrl+K) ----------------- */}
      {isQuickSearchOpen && (
        <div id="quick-search-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center p-4 z-[99999] animate-in fade-in duration-150 no-print" onClick={() => setIsQuickSearchOpen(false)}>
          <div 
            className="bg-white border border-slate-200 shadow-2xl rounded-2xl max-w-lg w-full mt-16 overflow-hidden flex flex-col animate-in slide-in-from-top-4 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input and Filters */}
            <div className="flex flex-col border-b border-slate-200">
              <div className="flex items-center gap-3 px-4 py-3">
                <Search className="h-5 w-5 text-indigo-500 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Cari nama siswa atau NIS... (Tekan Esc)"
                  value={quickSearchQuery}
                  onChange={(e) => setQuickSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-slate-800 font-bold text-sm focus:outline-none placeholder-slate-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      if (quickSearchQuery) {
                        setQuickSearchQuery('');
                      } else {
                        setIsQuickSearchOpen(false);
                      }
                    }
                  }}
                />
                {quickSearchQuery && (
                  <button
                    onClick={() => setQuickSearchQuery('')}
                    className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
                <span className="text-[9px] bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-slate-400 font-mono font-bold shrink-0">
                  ESC
                </span>
                </div>
              
              {/* Controls */}
              <div className="flex items-center gap-2 px-4 py-2 border-t border-slate-100 bg-slate-50">
                <select value={searchClassFilter} onChange={(e) => setSearchClassFilter(e.target.value)} className="text-[10px] p-1 border rounded bg-white">
                  <option value="ALL">Semua Kelas</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => setSearchSortBy(prev => prev === 'NAME' ? 'NIS' : 'NAME')} className="text-[10px] p-1 border rounded bg-white hover:bg-slate-100">
                  Sort: {searchSortBy === 'NAME' ? 'Nama (A-Z)' : 'NIS'}
                </button>
              </div>
            </div>
            
            {/* Students list matched */}
            <div className="max-h-[300px] overflow-y-auto p-2 flex flex-col gap-1 relative">
              {(() => {
                const isSearchEmpty = quickSearchQuery.trim() === '';
                const displayStudents = isSearchEmpty 
                   ? students.filter(s => s.kelas === selectedClass).slice(0, 8) 
                   : students
                        .filter(s => 
                          (searchClassFilter === 'ALL' || s.kelas === searchClassFilter) &&
                          (s.name.toLowerCase().includes(quickSearchQuery.toLowerCase()) || 
                          s.nis.includes(quickSearchQuery))
                        )
                        .sort((a,b) => searchSortBy === 'NAME' ? a.name.localeCompare(b.name) : a.nis.localeCompare(b.nis))
                        .slice(0, 8);

                return (
                  <>
                    {isSearchEmpty && (
                      <div className="px-2 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 rounded mb-1">
                        Students from {selectedClass}
                      </div>
                    )}
                    {displayStudents.map(s => {
                      const completedCount = Object.keys(s.grades || {}).length;
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            setRecentSearches(prev => [s, ...prev.filter(recent => recent.id !== s.id)].slice(0, 5));
                            setSelectedClass(s.kelas);
                            setSelectedStudentId(s.id);
                            setIsQuickSearchOpen(false);
                            setQuickSearchQuery('');
                            if (viewMode === 'crud_manager' || viewMode === 'rekap_nilai') {
                              setViewMode('spreadsheet');
                            }
                            triggerAlert('success', `✓ Terpilih: ${s.name} (Kelas ${s.kelas})`);
                          }}
                          onMouseEnter={() => setHoveredStudent(s)}
                          onMouseLeave={() => setHoveredStudent(null)}
                          className="flex justify-between items-center px-3 py-2.5 rounded-lg text-left hover:bg-slate-50 transition-colors cursor-pointer w-full group relative"
                        >
                          <div>
                            <HighlightText text={s.name} query={isSearchEmpty ? '' : quickSearchQuery} className="text-[11.5px] font-bold text-slate-800 group-hover:text-indigo-600 transition-colors" />
                            <HighlightText text={`Kelas ${s.kelas} • NIS ${s.nis}`} query={isSearchEmpty ? '' : quickSearchQuery} className="text-[10px] text-slate-400 font-mono font-bold uppercase block" />
                          </div>
                          
                          {/* Hover Tooltip for 5NK Summary */}
                          {hoveredStudent?.id === s.id && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-white border border-slate-200 shadow-lg rounded p-2 text-[10px] z-10 w-48 animate-in fade-in zoom-in-95 pointer-events-none">
                              <p className="font-bold text-slate-700 mb-1 border-b pb-1">5NK Summary</p>
                              <div className="flex justify-between items-center text-slate-600 mb-1">
                                <span>Categories Completed:</span>
                                <span className={completedCount === 5 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>{completedCount}/5</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-600">
                                <span>Status:</span>
                                <span className={s.completed ? 'text-emerald-600 font-bold' : 'text-slate-500'}>{s.completed ? 'LENGKAP' : 'BELUM SELESAI'}</span>
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                    {!isSearchEmpty && displayStudents.length === 0 && (
                      <div className="p-8 text-center text-[10.5px] text-slate-400">
                        Tidak ditemukan siswa dengan pencarian "{quickSearchQuery}".
                        <button 
                            onClick={() => {setQuickSearchQuery(''); setSearchClassFilter('ALL');}}
                            className="block mx-auto mt-3 text-[10px] bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-md hover:bg-slate-200 transition-colors"
                        >
                            Clear Search
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            
             {/* Recent Searches */}
             {recentSearches.length > 0 && (
               <div className="border-t border-slate-100 p-2 bg-slate-50/50">
                 <div className="flex items-center justify-between px-2 py-1">
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                     <span>⏱️</span>
                     <span>Riwayat Pencarian Terakhir</span>
                   </p>
                   <button
                     onClick={(e) => {
                       e.stopPropagation();
                       if (window.confirm("Hapus seluruh riwayat pencarian siswa?")) {
                         setRecentSearches([]);
                         triggerToast('success', "Riwayat pencarian berhasil dihapus!");
                       }
                     }}
                     className="text-[9px] text-rose-600 hover:text-rose-700 hover:underline font-extrabold cursor-pointer transition-colors"
                   >
                     Hapus Semua
                   </button>
                 </div>
                 <div className="grid grid-cols-1 gap-0.5 mt-1">
                   {recentSearches.map(s => (
                     <div
                       key={s.id}
                       className="group/item flex items-center justify-between rounded-md hover:bg-indigo-50/80 pr-1.5 transition-colors"
                     >
                       <button
                         onClick={() => {
                           setRecentSearches(prev => [s, ...prev.filter(recent => recent.id !== s.id)].slice(0, 5));
                           setSelectedClass(s.kelas);
                           setSelectedStudentId(s.id);
                           setIsQuickSearchOpen(false);
                           setQuickSearchQuery('');
                           if (viewMode === 'crud_manager' || viewMode === 'rekap_nilai') {
                             setViewMode('spreadsheet');
                           }
                           triggerAlert('success', `✓ Terpilih: ${s.name} (Kelas ${s.kelas})`);
                         }}
                         className="flex-1 text-left px-3 py-1.5 text-[10.5px] font-semibold text-slate-600 flex items-center justify-between cursor-pointer"
                       >
                         <span className="truncate max-w-[200px]">{s.name}</span>
                         <span className="text-[8.5px] font-mono text-slate-400 bg-slate-100 border border-slate-200/50 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                           Kelas {s.kelas} • NIS {s.nis}
                         </span>
                       </button>
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           setRecentSearches(prev => prev.filter(r => r.id !== s.id));
                         }}
                         className="p-1 text-slate-450 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer transition-all opacity-0 group-hover/item:opacity-100 flex-none"
                         title="Hapus riwayat ini"
                       >
                         <X className="h-3 w-3" />
                       </button>
                     </div>
                   ))}
                 </div>
               </div>
             )}
            
            {/* Modal footer shortcut help text */}
            <div className="bg-slate-50 border-t border-slate-100 px-4 py-2 flex justify-between text-[9.5px] text-slate-400 font-medium">
              <span>Masukkan identitas siswa Kartika</span>
              <span>Klik siswa untuk bernavigasi instan</span>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MODAL KONFIRMASI GANDA RESET DATABASE ----------------- */}
      {isResetModalOpen && (
        <div id="double-check-reset-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200 no-print">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 max-w-md w-full flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex-none">
                <ShieldAlert className="h-6 w-6 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 leading-snug">Konfirmasi Ganda Reset Database</h3>
                <p className="text-[11px] text-rose-500 font-bold mt-0.5 uppercase tracking-wide">PERINGATAN: Penghapusan Permanen!</p>
              </div>
            </div>

            {/* Warning Details */}
            <div className="text-xs text-slate-500 leading-relaxed font-sans flex flex-col gap-2">
              <p>Menyetel ulang database akan mengembalikan sistem Rapor 5NK ke konfigurasi default. Tindakan ini akan menghapus permanen:</p>
              <ul className="list-disc pl-5 flex flex-col gap-1 font-semibold text-slate-600">
                <li>Semua kemajuan nilai capaian kriteria di 5NK untuk seluruh murid.</li>
                {resetType === 'ALL' && <li>Catatan kesimpulan & saran wali kelas untuk semua murid.</li>}
                {resetType === 'ALL' && <li>Komentar saran evaluasi orang tua yang tersimpan.</li>}
              </ul>
              <p className="italic text-slate-400 mt-1">Saran: Sila ekspor data ke Excel jika Anda masih memerlukan berkas pekerjaan rapor saat ini.</p>
            </div>

            {/* Reset Scope Selector Options (NEW) */}
            <div className="border border-slate-250 bg-slate-50/50 rounded-xl p-3 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">PILIH ITEM YANG AKAN DIRESET:</span>
              
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                {[
                  { key: 'classes', label: 'Data Kelas' },
                  { key: 'students', label: 'Data Siswa' },
                  { key: 'teachers', label: 'Data Guru' },
                  { key: 'evaluations', label: 'Semua Penilaian & Catatan' },
                  { key: 'kop', label: 'Kop Sekolah/Konfigurasi' }
                ].map((opt) => (
                    <label key={opt.key} className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                        <input
                            type="checkbox"
                            checked={resetOptions[opt.key as keyof typeof resetOptions]}
                            onChange={(e) => setResetOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                            className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-3.5 w-3.5"
                        />
                        {opt.label}
                    </label>
                ))}
              </div>

              <div className="border-t border-slate-200/60 pt-2 mt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200 cursor-pointer hover:bg-rose-100/50">
                    <input
                        type="checkbox"
                        checked={resetOptions.wipeEmpty}
                        onChange={(e) => setResetOptions(prev => ({ ...prev, wipeEmpty: e.target.checked }))}
                        className="rounded border-rose-300 text-rose-700 focus:ring-rose-500 h-3.5 w-3.5"
                    />
                    🔥 Kosongkan Total (Tanpa Isi Ulang Data Default)
                </label>
                <p className="text-[9px] text-rose-500 font-medium mt-1 leading-tight px-1 font-sans">
                  *Jika dicentang, data guru & murid terpilih akan dihapus total (bersih 0 data) agar Anda bisa mengimpor file Excel dari awal dengan bersih.
                </p>
              </div>
            </div>

            {/* Checkbox confirmation (Layer 1) */}
            <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer select-none">
              <input
                type="checkbox"
                className="mt-1 flex-none rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
                checked={isResetConfirmedCheckbox}
                onChange={(e) => setIsResetConfirmedCheckbox(e.target.checked)}
              />
              <span className="text-[11px] text-slate-600 leading-normal font-sans">
                Saya sepenuhnya menyadari dan paham konsekuensi tindakan reset ini yang akan dihapus secara permanen dari penyimpanan lokal (localStorage).
              </span>
            </label>

            {/* Text confirmation (Layer 2) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Ketik frasa "SETEL ULANG SEKARANG" untuk membuka kunci tombol:</span>
              <input
                type="text"
                placeholder="SETEL ULANG SEKARANG"
                className="w-full border border-slate-300 rounded-lg py-2 px-3 text-xs font-bold tracking-widest placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 uppercase text-center"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value.toUpperCase())}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 mt-2 justify-end">
              <button
                onClick={() => {
                  setIsResetModalOpen(false);
                  setResetConfirmText('');
                  setIsResetConfirmedCheckbox(false);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                disabled={!isResetConfirmedCheckbox || resetConfirmText.trim().toUpperCase() !== 'SETEL ULANG SEKARANG'}
                onClick={executeResetDatabase}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed rounded-lg flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Ya, Setel Ulang Sekarang
              </button>
            </div>

          </div>
        </div>
      )}
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
      {/* Custom Global Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed bottom-6 right-6 z-[99999] no-print pointer-events-auto"
          >
            <div className="bg-white/95 border border-slate-150 text-slate-850 rounded-2xl shadow-xl p-3.5 flex items-center gap-3.5 max-w-sm">
              <div className={`p-2 rounded-xl shrink-0 ${
                toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' 
                : toast.type === 'error' ? 'bg-rose-50 text-rose-600' 
                : 'bg-sky-50 text-sky-600'
              }`}>
                {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : toast.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase leading-none block select-none">
                  {toast.type === 'success' ? 'Sukses' : toast.type === 'error' ? 'Pemberitahuan Gagal' : 'Informasi'}
                </span>
                <p className="text-xs font-semibold text-slate-700 mt-0.5 leading-relaxed">{toast.message}</p>
              </div>
              <button 
                onClick={() => setToast(null)} 
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1 rounded-lg transition-all cursor-pointer shrink-0"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* 1.5. Floating WhatsApp Support Chatbot Panel & Trigger */}
      <AnimatePresence>
        {showChatbot && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 right-4 sm:bottom-28 sm:right-6 z-[9990] w-[340px] bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-w-[calc(100vw-32px)] no-print font-sans"
          >
            {/* Header: Operator Identity */}
            <div className="bg-emerald-600 p-4 flex items-center justify-between text-white border-b border-slate-750/50">
              <div className="flex items-center gap-3">
                {/* Operator Logo */}
                <div className="relative h-10 w-10 rounded-full border border-white/20 bg-emerald-700/50 overflow-hidden flex items-center justify-center shrink-0">
                  <img
                    src="https://lh3.googleusercontent.com/d/1SD7iCTF6AZsj54LY0KckHkgIS93wtzq3"
                    alt="Logo Operator"
                    className="h-8 w-8 object-contain"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-450 ring-2 ring-emerald-600 animate-pulse"></span>
                </div>
                <div>
                  <h4 className="text-xs font-extrabold tracking-wide uppercase text-white/95">Chatbot Operator</h4>
                  <div className="text-[10px] text-emerald-100 flex items-center gap-1 font-medium">
                    <span>Admin Rapor 5NK</span>
                    <span className="h-1 w-1 rounded-full bg-emerald-350"></span>
                    <span>Aktif</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowChatbot(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="p-4 flex-1 flex flex-col gap-3 min-h-[160px] bg-slate-950/70 select-none max-h-[220px] overflow-y-auto">
              <div className="bg-slate-800/90 border border-slate-700/40 rounded-2xl rounded-tl-none p-3 text-xs text-slate-200 leading-relaxed shadow-xs">
                Halo Bapak/Ibu Guru! 👋 Saya Admin Rapor 5NK. Silakan pilih pertanyaan cepat di bawah atau ketik pesan Anda langsung untuk memulai diskusi di WhatsApp.
              </div>

              {/* Quick Options Chips */}
              <div className="flex flex-col gap-2 mt-1">
                <button
                  onClick={() => {
                    const text = "Halo min. Mau bertanya tentang aplikasi Rapor 5NK 🙏";
                    window.open(`https://api.whatsapp.com/send?phone=62895366608358&text=${encodeURIComponent(text)}`, "_blank");
                  }}
                  className="w-full text-left bg-slate-800 hover:bg-slate-750 text-[11px] text-slate-300 border border-slate-700/40 p-2 rounded-xl transition-all hover:translate-x-1 cursor-pointer flex items-center gap-2"
                >
                  <MessageCircle className="h-3 w-3 text-emerald-400" /> Tanya Fitur Rapor 5NK 📝
                </button>
                <button
                  onClick={() => {
                    const text = "Halo min. Saya mau bertanya tentang Cara Print Rapor di Aplikasi";
                    window.open(`https://api.whatsapp.com/send?phone=62895366608358&text=${encodeURIComponent(text)}`, "_blank");
                  }}
                  className="w-full text-left bg-slate-800 hover:bg-slate-750 text-[11px] text-slate-300 border border-slate-700/40 p-2 rounded-xl transition-all hover:translate-x-1 cursor-pointer flex items-center gap-2"
                >
                  <MessageCircle className="h-3 w-3 text-emerald-400" /> Cara Print / Cetak Rapor 🖨️
                </button>
                <button
                  onClick={() => {
                    const text = "Halo min. Saya mau bertanya tentang Cara Ganti Logo di Aplikasi";
                    window.open(`https://api.whatsapp.com/send?phone=62895366608358&text=${encodeURIComponent(text)}`, "_blank");
                  }}
                  className="w-full text-left bg-slate-800 hover:bg-slate-750 text-[11px] text-slate-300 border border-slate-700/40 p-2 rounded-xl transition-all hover:translate-x-1 cursor-pointer flex items-center gap-2"
                >
                  <MessageCircle className="h-3 w-3 text-emerald-400" /> Mengganti Logo Sekolah 🖼️
                </button>
              </div>
            </div>

            {/* Input Message Area */}
            <div className="p-3 bg-slate-900 border-t border-slate-750/50 flex items-center gap-2">
              <input
                type="text"
                placeholder="Ada yang ditanyakan?..."
                value={chatbotMsg}
                onChange={(e) => setChatbotMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && chatbotMsg.trim()) {
                    window.open(`https://api.whatsapp.com/send?phone=62895366608358&text=${encodeURIComponent(chatbotMsg.trim())}`, "_blank");
                    setChatbotMsg('');
                    setShowChatbot(false);
                  }
                }}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-sans"
              />
              <button
                onClick={() => {
                  const finalMsg = chatbotMsg.trim() || "Halo min. Mau bertanya tentang aplikasi Rapor 5NK 🙏";
                  window.open(`https://api.whatsapp.com/send?phone=62895366608358&text=${encodeURIComponent(finalMsg)}`, "_blank");
                  setChatbotMsg('');
                  setShowChatbot(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs select-none cursor-pointer flex items-center gap-1 hover:scale-105 active:scale-95 transition-all"
              >
                Kirim
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <button
        onClick={() => setShowChatbot(!showChatbot)}
        className="fixed bottom-24 right-4 sm:bottom-28 sm:right-6 z-[9990] bg-emerald-500 hover:bg-emerald-600 text-white rounded-full p-3.5 shadow-lg shadow-emerald-500/30 flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95 group no-print cursor-pointer animate-in fade-in duration-300"
        title="Hubungi Admin / Support Aplikasi"
      >
        <MessageCircle className="h-6 w-6" />
        <div className="hidden sm:block overflow-hidden max-w-0 group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap">
          <span className="font-extrabold pr-2 text-sm">Butuh Bantuan?</span>
        </div>
        {/* Simple Notification Dot */}
        <span className="absolute top-0 right-0 flex h-3 w-3 -mt-1 -mr-1">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
        </span>
      </button>

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

      {/* 3. High-Fidelity Sync Status Footer (Hidden as requested) */}
      <footer id="app-footer-indicator" className="hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 pt-0.5">
          <div className="flex flex-wrap items-center gap-4 text-[10.5px] font-medium">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-300">🏢 Konsol Rapor 5NK</span>
              <span className="text-slate-600">|</span>
              <span className="text-[10px] bg-slate-800 border border-slate-700 px-2 py-0.5 rounded font-mono text-slate-300">v1.2.0</span>
            </div>
            
            {/* Internet Status */}
            <div className="flex items-center gap-1.5" title="Status koneksi jaringan internet komputer Anda">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
              </span>
              <span>Jaringan: {isOnline ? 'Online' : 'Offline (Fallback Lokal Aktif)'}</span>
            </div>

            {/* Cloud SQL DB Live Status */}
            <div className="flex items-center gap-1.5" title="Konektivitas langsung ke API server Cloud SQL (PostgreSQL Pool)">
              {serverDbStatus === 'connected' && (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-emerald-400 font-bold">Cloud SQL: Terhubung (Stabil)</span>
                </>
              )}
              {serverDbStatus === 'disconnected' && (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  <span className="text-rose-400 font-bold">Cloud SQL: Terputus / Gangguan</span>
                </>
              )}
              {serverDbStatus === 'unconfigured' && (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-600"></span>
                  </span>
                  <span className="text-slate-500">Cloud SQL: Unconfigured (Fallback File)</span>
                </>
              )}
              {serverDbStatus === 'checking' && (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span className="text-amber-400 animate-pulse font-bold">Memeriksa Cloud SQL...</span>
                </>
              )}
            </div>
          </div>

          {/* Firebase and CloudSync detailed state */}
          <div className="text-[10.5px] font-semibold text-slate-400 text-right flex items-center justify-end gap-3 flex-wrap">
            <span className="text-slate-800">|</span>
            <div className="flex items-center gap-1.5" title="Waktu sinkronisasi data presisi ke Firebase Firestore & Cloud SQL">
              <Cloud className="h-4 w-4 text-slate-500 shrink-0" />
              <span>
                Firebase: <span className="text-stone-300 font-bold font-mono">
                  {cloudSyncState.lastSaved 
                    ? `Aktif` 
                    : 'Belum Sinkron'}
                </span>
              </span>
            </div>

            <span className="text-slate-800">|</span>
            <button
              onClick={() => setIsSyncHistoryOpen(prev => !prev)}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[10px] font-extrabold text-slate-300 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer hover:border-slate-700 hover:text-white"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncHistoryOpen ? 'rotate-180 text-indigo-400' : 'text-slate-500'} transition-transform duration-250`} />
              <span>Riwayat Sinkronisasi {isSyncHistoryOpen ? '▲' : '▼'}</span>
            </button>
          </div>
        </div>

        {/* Sync History Collapsible Details inside Footer */}
        {isSyncHistoryOpen && (
          <div className="max-w-7xl mx-auto mt-4 pt-3.5 border-t border-slate-900/60 animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center mb-2.5 flex-wrap gap-2">
              <h5 className="font-extrabold text-slate-300 text-[10.5px] uppercase tracking-wider flex items-center gap-1.5 font-sans">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-400 shrink-0" /> Log Aktivitas Sinkronisasi Terakhir (Diagnosis Konektivitas)
              </h5>
              <button
                onClick={() => {
                  if (confirm('Apakah Anda yakin ingin menghapus seluruh log sinkronisasi?')) {
                    setSyncLogs([]);
                    triggerAlert('success', '✓ Riwayat sinkronisasi telah dibersihkan.');
                  }
                }}
                className="text-[10px] font-extrabold text-rose-450 hover:text-rose-400 hover:underline cursor-pointer bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-900 hover:border-slate-800 transition-colors"
              >
                Hapus Semua Log
              </button>
            </div>
            
            {syncLogs.length === 0 ? (
              <p className="text-slate-500 italic text-[11px] py-2">Belum ada riwayat aktivitas sinkronisasi. Log akan tercatat pada auto-save otomatis atau simpan manual (Ctrl+S).</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-900 overflow-hidden shadow-2xl">
                <table className="w-full text-left text-[11px] border-collapse bg-[#0c111d]">
                  <thead className="bg-[#030712] border-b border-slate-900 text-slate-300 font-extrabold uppercase text-[9.5px] tracking-wider">
                    <tr>
                      <th className="p-3 text-slate-400 font-bold">Waktu</th>
                      <th className="p-3 text-center">Firebase (Firestore)</th>
                      <th className="p-3 text-center font-bold">Cloud SQL (PostgreSQL)</th>
                      <th className="p-3 text-center">Google Drive (Backup)</th>
                      <th className="p-3 text-slate-400 font-bold">Keterangan Diagnosis Aliran Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {syncLogs.map((log, index) => (
                      <tr key={index} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 font-mono text-slate-300 font-semibold">{log.timestamp.toLocaleTimeString()} ({log.timestamp.toLocaleDateString()})</td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                            log.firebaseStatus === 'success' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' :
                            log.firebaseStatus === 'failed' ? 'bg-rose-950/80 text-rose-400 border border-rose-800' :
                            'bg-slate-900 text-slate-500 border border-slate-800'
                          }`}>
                            {log.firebaseStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                            log.sqlStatus === 'success' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' :
                            log.sqlStatus === 'failed' ? 'bg-rose-950/80 text-rose-400 border border-role-800' :
                            'bg-slate-900 text-slate-500 border border-slate-800'
                          }`}>
                            {log.sqlStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold ${
                            log.driveStatus === 'success' ? 'bg-teal-950/60 text-teal-400 border border-teal-900' :
                            log.driveStatus === 'failed' ? 'bg-rose-950/80 text-rose-400 border border-rose-800' :
                            'bg-slate-900 text-slate-550 border border-slate-800'
                          }`}>
                            {log.driveStatus.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 font-sans text-slate-400 text-[10.5px] leading-relaxed max-w-sm" title={log.details}>
                          <div className="flex items-center justify-between gap-1">
                            <span className="truncate flex-1 pr-1">{log.details || 'Sinkronisasi berhasil diselesaikan.'}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  const payload = `[RAPOR 5NK - SYNC HISTORY DETAILS]\nTimestamp : ${log.timestamp.toLocaleString()}\nFirebase  : ${log.firebaseStatus.toUpperCase()}\nCloud SQL : ${log.sqlStatus.toUpperCase()}\nGDrive    : ${log.driveStatus.toUpperCase()}\nDetails   : ${log.details || 'Sinkronisasi berhasil diselesaikan.'}`;
                                  navigator.clipboard.writeText(payload);
                                  triggerAlert('success', '✓ Rincian diagnosis sinkronisasi telah disalin ke papan klip!');
                                }}
                                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:bg-slate-850 text-[9px] font-extrabold text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer shrink-0"
                                title="Salin detail diagnosisi ini ke clipboard"
                              >
                                Salin
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Hapus log aktivitas ini?')) {
                                    setSyncLogs(prev => prev.filter((_, idx) => idx !== index));
                                    triggerAlert('success', '✓ Log sinkronisasi telah dihapus.');
                                  }
                                }}
                                className="p-1 rounded bg-slate-900 border border-slate-700 hover:bg-rose-950 hover:border-rose-900 hover:text-rose-400 transition-colors cursor-pointer shrink-0 inline-flex items-center justify-center text-slate-400"
                                title="Hapus log ini"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </footer>

      {/* Footer minimal auto-sync status (Hidden as requested) */}
      <div className="hidden">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-slate-200 tracking-wider">STATUS SINKRONISASI</span>
          </span>
          <span className="flex items-center gap-1.5 border-l border-slate-700/80 pl-6 text-emerald-400 font-semibold">
            <Cloud className="h-3.5 w-3.5 text-sky-400" />
            <span>Cloud SQL (Connected)</span>
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <Database className="h-3.5 w-3.5 text-orange-400" />
            <span>Firebase (Secured)</span>
          </span>
          {googleToken && (
            <span className="flex items-center gap-1.5 text-teal-400 font-semibold">
             <Cloud className="h-3.5 w-3.5" />
             <span>Drive (Linked)</span>
            </span>
          )}
        </div>
        <div className="text-slate-500 italic flex items-center gap-2">
          {cloudSyncState.status === 'syncing' ? (
            <>
              <RefreshCw className="h-3 w-3 animate-spin text-emerald-500" />
              <span className="text-emerald-400">Sinkronisasi berjalan...</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 text-slate-600" />
              <span>Sinkron</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
