import { useState, useId, FormEvent, useRef, useEffect, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import { Student, Teacher, Category, Indicator, ScoreKey, KopSekolah } from '../types';
import { SCHOOL_CLASSES, DEFAULT_KOP } from '../data';
import { exportDatabaseBackupConfig, parseExcelDatabase, uploadExcelToGoogleDrive, encryptData, decryptData, addChangeLog, getChangeLogs, clearChangeLogs, deleteChangeLog, exportLocalJsonBackup, ChangeLog, formatProperName, runIntegrityCheck, IntegrityReport, fixIntegrity, exportAllStudentsToCsv, uploadZipSnapshotToGoogleDrive, downloadZipSnapshotLocally } from '../utils';
import { normalizeAllData, hasValidAcademicTitle } from '../normalization';
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
  Unlock,
  History,
  RotateCcw,
  SpellCheck,
  AlertCircle,
  Camera,
  Database,
  Cloud
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
  showFooterDate?: boolean;
  onUpdateShowFooterDate?: (value: boolean) => void;
  isHighContrast: boolean;
  setIsHighContrast: (value: boolean) => void;
  rowHeightMode: 'compact' | 'comfortable';
  setRowHeightMode: (value: 'compact' | 'comfortable') => void;
  paperSize: 'A4' | 'F4';
  onUpdatePaperSize: (size: 'A4' | 'F4') => void;
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
  showFooterDate = true,
  onUpdateShowFooterDate,
  isHighContrast,
  setIsHighContrast,
  rowHeightMode,
  setRowHeightMode,
  paperSize,
  onUpdatePaperSize,
}: DatabaseCrudProps) {
  const [activeSubTab, setActiveSubTab] = useState<'siswa' | 'guru' | 'indikator' | 'kop' | 'backup' | 'riwayat' | 'snapshot' | 'integritas'>('siswa');
  const [changeLogs, setChangeLogs] = useState<ChangeLog[]>([]);
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('ALL');
  const [logDateFilter, setLogDateFilter] = useState('ALL');
  
  const [isUploadingSnapshot, setIsUploadingSnapshot] = useState<string | null>(null);

  // States for Snapshot Manual & Yayasan Report
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [snapshots, setSnapshots] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('rapor_5nk_manual_snapshots');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });



  const [yayasanWaliFilter, setYayasanWaliFilter] = useState('');
  const [yayasanCabangFilter, setYayasanCabangFilter] = useState(kopSekolah.cabang || '');
  const [repairLogs, setRepairLogs] = useState<string[] | null>(null);

  const handleCreateSnapshot = () => {
    if (!snapshotLabel.trim()) {
      alert("Silahkan isi label snapshot terlebih dahulu!");
      return;
    }
    const newSnap = {
      id: 'snap_' + Date.now(),
      timestamp: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
      label: snapshotLabel.trim(),
      studentsCount: students.length,
      teachersCount: teachers.length,
      data: {
        students,
        teachers,
        categories,
        kopSekolah,
        classes
      }
    };
    const updated = [newSnap, ...snapshots];
    setSnapshots(updated);
    localStorage.setItem('rapor_5nk_manual_snapshots', JSON.stringify(updated));
    setSnapshotLabel('');
    addChangeLog(
      'SNAPSHOT BARU',
      `Membuat snapshot manual: "${newSnap.label}" dengan ${newSnap.studentsCount} siswa`
    );
    alert(`Snapshot "${newSnap.label}" berhasil dibuat secara lokal!`);
  };

  const handleExecuteProactiveRepair = () => {
    const res = fixIntegrity(students, teachers, categories, classes);
    onUpdateStudents(res.fixedStudents);
    onUpdateTeachers(res.fixedTeachers);
    onUpdateClasses(res.fixedClasses);
    setRepairLogs(res.repairLogs);
    addChangeLog(
      'PERBAIKI INTEGRITAS',
      `Menjalankan pembersihan integritas database: berhasil memproses tindakan perbaikan secara cerdas.`
    );
  };

  const handleRestoreSnapshot = (snap: any) => {
    const confirmRestore = window.confirm(`Apakah Anda yakin ingin memulihkan data Rapor ke snapshot "${snap.label}" yang dibuat pada ${snap.timestamp}?\n\nSemua data siswa, guru, kategori, kop surat, dan kelas saat ini akan ditimpa dengan data cadangan ini.\n\nTindakan ini tidak dapat dibatalkan!`);
    if (!confirmRestore) return;

    const d = snap.data;
    if (d.students) onUpdateStudents(d.students);
    if (d.teachers) onUpdateTeachers(d.teachers);
    if (d.categories) onUpdateCategories(d.categories);
    if (d.kopSekolah) onUpdateKopSekolah(d.kopSekolah);
    if (d.classes) onUpdateClasses(d.classes);

    addChangeLog(
      'SNAPSHOT RESTORE',
      `Memulihkan database dari snapshot: "${snap.label}"`
    );
    alert(`Data berhasil dipulihkan ke kondisi "${snap.label}"!`);
  };

  const handleDeleteSnapshot = (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus snapshot manual ini?')) return;
    const updated = snapshots.filter(s => s.id !== id);
    setSnapshots(updated);
    localStorage.setItem('rapor_5nk_manual_snapshots', JSON.stringify(updated));
  };

  const handleUploadSnapshotToDrive = async (snap: any) => {
    try {
      setIsUploadingSnapshot(snap.id);
      let token = await getAccessToken();
      if (!token) {
        await googleSignIn();
        token = await getAccessToken();
      }
      if (!token) {
        alert("Gagal masuk ke Google Account, tidak dapat mengunggah snapshot.");
        return;
      }
      
      const fileId = await uploadZipSnapshotToGoogleDrive(snap, token);
      alert(`Snapshot "${snap.label}" berhasil diunggah ke Google Drive (ID: ${fileId})`);
      addChangeLog(
        'UPLOAD SNAPSHOT',
        `Berhasil mengunggah snapshot "${snap.label}" ke Google Drive dalam bentuk ZIP (ID: ${fileId})`
      );
    } catch (e: any) {
      alert("Gagal mengunggah snapshot ke Google Drive: " + e.message);
    } finally {
      setIsUploadingSnapshot(null);
    }
  };

  const handleDownloadSnapshotLocally = async (snap: any) => {
    try {
      await downloadZipSnapshotLocally(snap);
      addChangeLog(
        'DOWNLOAD SNAPSHOT',
        `Berhasil mengunduh snapshot "${snap.label}" secara lokal dalam bentuk ZIP.`
      );
    } catch (e: any) {
      alert("Gagal mengunduh snapshot ZIP: " + e.message);
    }
  };

  const handleDownloadMissingDataReport = async () => {
    const report = runIntegrityCheck(students, teachers, categories, classes);
    
    const missingDataList = students.filter(s => {
       const hasMissingName = !s.name || s.name === '-';
       const hasMissingNis = !s.nis || s.nis === '-';
       const hasMissingKelas = !s.kelas || !classes.includes(s.kelas);
       const missingIndicatorsCount = categories.reduce((total, cat) => total + cat.indicators.length, 0) - Object.keys(s.grades).length;
       return hasMissingName || hasMissingNis || hasMissingKelas || missingIndicatorsCount > 0;
    });

    if (missingDataList.length === 0 && report.isValid) {
        alert("Semua data siswa sudah lengkap! Tidak ada yang perlu diunduh.");
        return;
    }

    const div = document.createElement('div');
    div.innerHTML = `
      <div style="font-family: sans-serif; padding: 20px; font-size: 12px; color: #1e293b;">
        <h2 style="text-align: center; color: #0f172a; margin-bottom: 5px;">Laporan Kekurangan Data Siswa</h2>
        <p style="text-align: center; color: #64748b; margin-top: 0; margin-bottom: 20px;">Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
        <table border="1" style="width: 100%; border-collapse: collapse; margin-top: 20px; border-color: #cbd5e1;">
          <tr style="background-color: #f8fafc;">
            <th style="padding: 10px; text-align: left;">NIS</th>
            <th style="padding: 10px; text-align: left;">Nama Siswa</th>
            <th style="padding: 10px; text-align: left;">Kelas</th>
            <th style="padding: 10px; text-align: left;">Rincian Kekurangan</th>
          </tr>
          ${missingDataList.map(s => {
             const missing = [];
             if (!s.name || s.name === '-') missing.push('Nama kosong/invalid');
             if (!s.nis || s.nis === '-') missing.push('NIS kosong/invalid');
             if (!s.kelas || !classes.includes(s.kelas)) missing.push('Kelas tidak valid atau kosong');
             const missingIndicatorsCount = categories.reduce((total, cat) => total + cat.indicators.length, 0) - Object.keys(s.grades).length;
             if (missingIndicatorsCount > 0) missing.push(`Kurang ${missingIndicatorsCount} nilai indikator`);
             
             return `
              <tr>
                <td style="padding: 8px;">${s.nis || '-'}</td>
                <td style="padding: 8px; font-weight: bold;">${s.name || '-'}</td>
                <td style="padding: 8px;">${s.kelas || '-'}</td>
                <td style="padding: 8px; color: #dc2626;">${missing.join(', ')}</td>
              </tr>
             `;
          }).join('')}
        </table>
        
        <div style="margin-top: 30px; padding: 15px; border: 1px solid #cbd5e1; background-color: #f1f5f9; border-radius: 8px;">
            <h3 style="margin-top:0; color: #0f172a;">Ringkasan Integritas Data Sistem</h3>
            <ul style="margin-bottom: 0;">
                <li>Total Siswa: ${students.length}</li>
                <li>Siswa dengan kekurangan data: ${missingDataList.length}</li>
                <li>Status Validitas Referensi (Kelas/Guru/Nilai): ${report.isValid ? 'Valid' : 'Tidak Valid (Ada Relasi Rusak)'}</li>
            </ul>
        </div>
      </div>
    `;
    
    try {
        const html2pdf = (await import('html2pdf.js')).default;
        await html2pdf().set({
            margin: 15,
            filename: `Laporan_Kekurangan_Data_${new Date().getTime()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).from(div).save();
        addChangeLog('EKSPOR', 'Mengunduh Laporan Kekurangan Data Siswa dalam format PDF');
    } catch(e) {
        console.error(e);
        alert('Gagal membuat PDF. Coba kembali.');
    }
  };

  const handleExportYayasan = () => {
    let filtered = [...students];
    if (yayasanWaliFilter) {
      const teacher = teachers.find(t => t.name === yayasanWaliFilter);
      if (teacher) {
        filtered = filtered.filter(s => s.kelas === teacher.classAssigned);
      } else {
        filtered = [];
      }
    }

    if (filtered.length === 0) {
      alert("Tidak ada data siswa yang cocok dengan filter wali kelas yang dipilih.");
      return;
    }

    const wb = XLSX.utils.book_new();
    
    const totalSiswa = filtered.length;
    const lakiLaki = filtered.filter(s => s.gender === 'L').length;
    const perempuan = filtered.filter(s => s.gender === 'P').length;
    const lengkap = filtered.filter(s => s.completed).length;
    const belumLengkap = totalSiswa - lengkap;
    const persenLengkap = Math.round((lengkap / totalSiswa) * 100);

    const ringkasanRows = [
      ['LAPORAN KOORDINASI & SINKRONISASI RAPOR YAYASAN'],
      ['YAYASAN', kopSekolah.yayasan.toUpperCase()],
      ['CABANG/SUB-CABANG', yayasanCabangFilter.toUpperCase() || kopSekolah.cabang.toUpperCase()],
      ['KOORDINATOR', kopSekolah.koordinator.toUpperCase()],
      ['NAMA SEKOLAH', kopSekolah.namaSekolah.toUpperCase()],
      ['WALI KELAS FILTER', yayasanWaliFilter || 'SEMUA WALI KELAS'],
      ['TANGGAL EKSPOR', new Date().toLocaleString('id-ID')],
      [],
      ['METRIK UTAMA', 'NILAI'],
      ['Total Siswa Terfilter', totalSiswa],
      ['Jumlah Siswa Laki-Laki', lakiLaki],
      ['Jumlah Siswa Perempuan', perempuan],
      ['Status Rapor Lengkap (Selesai)', lengkap],
      ['Status Rapor Belum Lengkap', belumLengkap],
      ['Persentase Penyelesaian (%)', `${persenLengkap}%`],
      [],
      ['Tanda Tangan Pelapor', '', '', 'Mengetahui Yayasan'],
      [],
      [],
      [yayasanWaliFilter || 'Wali Kelas', '', '', 'Pengurus Yayasan']
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(ringkasanRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan_Laporan');

    const detailRows = filtered.map((s, idx) => ({
      'No': idx + 1,
      'NIS': s.nis,
      'Nama Siswa': s.name,
      'Kelas': s.kelas,
      'Jenis Kelamin': s.gender === 'L' ? 'Laki-Laki' : 'Perempuan',
      'Status Rapor': s.completed ? 'LENGKAP' : 'BELUM SELESAI',
      'Kesimpulan': s.kesimpulan || '',
      'Catatan Wali': s.catatanWali || ''
    }));
    const wsDetail = XLSX.utils.json_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detail_Siswa');

    const filename = `Laporan_Yayasan_${(yayasanCabangFilter || 'Cabang').replace(/\s+/g, '_')}_${(yayasanWaliFilter || 'Semua_Wali').replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, filename);

    addChangeLog(
      'EKSPOR YAYASAN',
      `Ekspor laporan yayasan untuk Cabang: ${yayasanCabangFilter || 'Semua'} & Wali: ${yayasanWaliFilter || 'Semua'}. Total: ${totalSiswa} siswa`
    );
    alert(`Laporan yayasan berhasil diekspor ke file "${filename}"!`);
  };

  // Sync change logs
  useEffect(() => {
    const loadLogs = () => {
      setChangeLogs(getChangeLogs());
    };
    loadLogs();
    window.addEventListener('rapor_change_logs_updated', loadLogs);
    return () => {
      window.removeEventListener('rapor_change_logs_updated', loadLogs);
    };
  }, []);

  const [siswaSearch, setSiswaSearch] = useState('');
  const [guruSearch, setGuruSearch] = useState('');
  
  // Custom states for class additions
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  // Password-based Encrypted JSON backup controls
  const [backupPassword, setBackupPassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // Daily Backup
  useEffect(() => {
    const lastBackupTime = localStorage.getItem('rapor_last_backup_time');
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    if (!lastBackupTime || now - parseInt(lastBackupTime) > TWENTY_FOUR_HOURS) {
      // Quietly record backup timestamp to avoid unexpected popups
      localStorage.setItem('rapor_last_backup_time', now.toString());
      console.log('Automated daily background backup checkpoint registered.');
    }
  }, []);

  // Kop Sekolah Edit State
  const [editKop, setEditKop] = useState<KopSekolah>(kopSekolah);
  useEffect(() => {
    setEditKop(kopSekolah);
  }, [kopSekolah]);
  const [printMargins, setPrintMargins] = useState(() => {
    const saved = localStorage.getItem('rapor_5nk_print_margins');
    return saved ? JSON.parse(saved) : { top: 12, bottom: 12, left: 15, right: 15 };
  });

  const updatePrintMargins = (newMargins: { top: number, bottom: number, left: number, right: number }) => {
    setPrintMargins(newMargins);
    localStorage.setItem('rapor_5nk_print_margins', JSON.stringify(newMargins));
  };
    
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

  // Close modals on Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSiswaFormOpen(false);
        setIsGuruFormOpen(false);
        setIsIndicatorFormOpen(false);
        setIsAddClassModalOpen(false);
        setIsCsvMappingOpen(false);
        setEditingSiswa(null);
        setEditingGuru(null);
        setEditingIndicator(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const [currentCatIdForInd, setCurrentCatIdForInd] = useState('');
  const [newIndText, setNewIndText] = useState('');
  const [newIndId, setNewIndId] = useState('');

  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // ----------------- SISWA CRUD OPERATIONS -----------------
  const filteredStudentsByClass = students.filter(s => s.kelas === selectedClass && 
    (s.name.toLowerCase().includes(siswaSearch.toLowerCase()) || s.nis.includes(siswaSearch))
  );

  const handleSelectAllStudentsInCurrentView = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudentIds(new Set(filteredStudentsByClass.map(s => s.id)));
    } else {
      setSelectedStudentIds(new Set());
    }
  };

  const handleSelectStudent = (id: string, e?: ChangeEvent<HTMLInputElement>) => {
    e?.stopPropagation();
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  const handleBulkDeleteStudents = () => {
    if (selectedStudentIds.size === 0) return;
    if (window.confirm(`Anda yakin ingin menghapus ${selectedStudentIds.size} siswa terpilih dari database? Tindakan ini permanen.`)) {
      onUpdateStudents(students.filter(s => !selectedStudentIds.has(s.id)));
      addChangeLog('HAPUS_SISWA', `Menghapus massal ${selectedStudentIds.size} siswa dari database`);
      setSelectedStudentIds(new Set());
    }
  };

  const handleBatchNormalizeStudents = () => {
    if (window.confirm(`Anda yakin ingin merapikan penulisan nama (huruf kapital) bagi seluruh siswa di kelas ${selectedClass}?`)) {
      const normalizedData = normalizeAllData(students, teachers);
      
      const nextStudents = students.map(s => {
        if (s.kelas === selectedClass) {
          const found = normalizedData.students.find((n: any) => n.id === s.id);
          return found ? found : s;
        }
        return s;
      });
      onUpdateStudents(nextStudents);
      addChangeLog('EDIT_SISWA', `Normalisasi penulisan nama massal untuk kelas ${selectedClass}`);
      alert('Penulisan nama seluruh siswa di kelas pemilih berhasil dirapikan!');
    }
  };

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
      catatanOrangTua: 'Alhamdulillah, kami pantau terus perkembangan anak. Terima kasih bimbingan bapak/ibu Guru.'
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

    // 🛡   Integritas Data: NIS wajib diisi
    const normalizedNis = (newSiswa.nis || '').trim();
    
    // 🛡 Validasi duplikat NIS
    if (normalizedNis && normalizedNis !== '-') {
      const isDuplicate = students.some(s => s.nis === normalizedNis && (!editingSiswa || s.id !== editingSiswa.id));
      if (isDuplicate) {
        alert(`Gagal menyimpan data! NIS "${normalizedNis}" sudah terdaftar pada siswa lain di database.\nSetiap murid harus memiliki NIS unik.`);
        return;
      }
    }

    // 🛡 Validasi relasi Kelas
    if (newSiswa.kelas && !classes.includes(newSiswa.kelas)) {
      alert(`Gagal menyimpan data! Kelas "${newSiswa.kelas}" tidak ditemukan di database. Pastikan kelas telah didaftarkan.`);
      return;
    }

    if (editingSiswa) {
      // Update existing
      const updated = students.map(s => {
        if (s.id === editingSiswa.id) {
          return {
            ...s,
            name: formatProperName(newSiswa.name!),
            nis: newSiswa.nis!,
            kelas: newSiswa.kelas!,
            gender: newSiswa.gender!,
            kesimpulan: newSiswa.kesimpulan || '',
            catatanWali: newSiswa.catatanWali || '',
            catatanOrangTua: newSiswa.catatanOrangTua || ''
          };
        }
        return s;
      });
      onUpdateStudents(updated);
      addChangeLog('EDIT_SISWA', `Memperbarui profil/data siswa "${newSiswa.name}" (NIS: ${newSiswa.nis}, Kelas: ${newSiswa.kelas})`);
    } else {
      // Create new
      const nextId = `STUDENT_${String(students.length + 1).padStart(3, '0')}`;
      const fresh: Student = {
        id: nextId,
        name: formatProperName(newSiswa.name!),
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
      addChangeLog('TAMBAH_SISWA', `Menambahkan siswa baru "${newSiswa.name}" (NIS: ${newSiswa.nis}) ke kelas ${newSiswa.kelas}`);
    }
    setIsSiswaFormOpen(false);
    setEditingSiswa(null);
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'siswa' | 'guru' | 'indikator', id: string, name: string, parentId?: string } | null>(null);

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    const { type, id, name, parentId } = deleteConfirm;
    
    if (type === 'siswa') {
      onUpdateStudents(students.filter(s => s.id !== id));
      addChangeLog('HAPUS_SISWA', `Menghapus siswa "${name}" (ID: ${id}) dari database`);
    } else if (type === 'guru') {
      onUpdateTeachers(teachers.filter(t => t.id !== id));
      addChangeLog('HAPUS_GURU', `Menghapus guru/staf "${name}" dari database`);
    } else if (type === 'indikator') {
      onUpdateCategories(categories.map(c => {
        if (c.id === parentId) {
          return { ...c, indicators: c.indicators.filter(ind => ind.id !== id) };
        }
        return c;
      }));
      // Clean up score records from all students
      const cleanedStudents = students.map(s => {
        const nextGrades = { ...s.grades };
        delete nextGrades[id];
        return { ...s, grades: nextGrades };
      });
      onUpdateStudents(cleanedStudents);
      addChangeLog('HAPUS_INDIKATOR', `Menghapus indikator: "${name}"`);
    }
    
    setDeleteConfirm(null);
  };

  const handleDeleteSiswa = (id: string, name: string) => {
    setDeleteConfirm({ type: 'siswa', id, name });
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
    addChangeLog('TAMBAH_KELAS', `Menambahkan kelas baru "${trimmed}"`);
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
    
    // 🛡 Validasi duplikat NIP
    if (cleanedNip && cleanedNip !== '-') {
      const isDuplicate = teachers.some(t => t.nip?.replace(/\s+/g, '') === cleanedNip && (!editingGuru || t.id !== editingGuru.id));
      if (isDuplicate) {
        alert(`Gagal menyimpan data! NIP "${cleanedNip}" sudah digunakan oleh guru lain di database.\nSetiap NIP harus bersifat unik.`);
        return;
      }
    }

    // 🛡️ Validasi Duplikasi Wali Kelas / Guru Kelas: Cegah jika kelas tersebut sudah ditugaskan ke guru lain
    if (newGuru.classAssigned) {
      const existingTeacherWithClass = teachers.find(
        t => t.classAssigned === newGuru.classAssigned && (!editingGuru || t.id !== editingGuru.id)
      );
      if (existingTeacherWithClass) {
        alert(
          `[VALIDASI GAGAL] Kelas "${newGuru.classAssigned}" sudah terisi!\nWali kelas / Guru kelas untuk kelas ini sudah ditugaskan kepada: "${existingTeacherWithClass.name}".\n\nSilakan hapus atau ubah penugasan kelas pada guru tersebut terlebih dahulu sebelum menugaskannya kepada guru ini.`
        );
        return;
      }
    }

    if (editingGuru) {
      // Update
      const updated = teachers.map(t => {
        if (t.id === editingGuru.id) {
          return {
            ...t,
            name: formatProperName(newGuru.name!),
            nip: newGuru.nip ? newGuru.nip.trim() : '',
            role: newGuru.role!,
            classAssigned: newGuru.classAssigned || undefined,
            signatureUrl: newGuru.signatureUrl
          };
        }
        return t;
      });
      onUpdateTeachers(updated);
      addChangeLog('EDIT_GURU', `Memperbarui data guru "${newGuru.name}" (${newGuru.role})`);
    } else {
      // Create
      const nextId = `TEACHER_${String(teachers.length + 1).padStart(3, '0')}`;
      const fresh: Teacher = {
        id: nextId,
        name: formatProperName(newGuru.name!),
        nip: newGuru.nip ? newGuru.nip.trim() : '',
        role: newGuru.role!,
            classAssigned: newGuru.classAssigned || undefined,
            signatureUrl: newGuru.signatureUrl
      };
      onUpdateTeachers([...teachers, fresh]);
      addChangeLog('TAMBAH_GURU', `Menambahkan guru baru "${newGuru.name}" (${newGuru.role})`);
    }
    setIsGuruFormOpen(false);
    setEditingGuru(null);
  };

  const handleDeleteGuru = (id: string, name: string) => {
    setDeleteConfirm({ type: 'guru', id, name });
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
    setNewIndId(suggestedId);
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
    setNewIndId(ind.id);
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
    const targetId = newIndId.trim().toUpperCase().replace(/\s+/g, '');

    if (!targetId) {
      alert('[VALIDASI ERROR] ID Indikator tidak boleh kosong!');
      return;
    }

    // Check if edits or adding new
    const isNew = !categories.flatMap(c => c.indicators).some(i => i.id === ind.id);

    // 🛡️ Data Integrity: Validate that ID is not duplicate across ALL categories if it's a new indicator
    if (isNew) {
      const allExistingIds = categories.flatMap(c => c.indicators.map(i => i.id.toUpperCase()));
      if (allExistingIds.includes(targetId)) {
        alert(`[VALIDASI ERROR] ID Indikator "${targetId}" sudah digunakan!\nSilakan gunakan ID lain agar tidak duplikat.`);
        return;
      }
    }

    const updatedCategories = categories.map(cat => {
      if (cat.id === catId) {
        if (isNew) {
          return {
            ...cat,
            indicators: [...cat.indicators, { id: targetId, text: newIndText }]
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
    addChangeLog(
      isNew ? 'TAMBAH_INDIKATOR' : 'EDIT_INDIKATOR', 
      isNew 
        ? `Menambahkan indikator perilaku baru "${newIndText}" dengan ID ${targetId} ke kategori ${catId}` 
        : `Mengubah indikator perilaku "${ind.id}" menjadi "${newIndText}"`
    );
    setIsIndicatorFormOpen(false);
    setEditingIndicator(null);
  };

  const handleDeleteIndicator = (catId: string, indId: string, text: string) => {
    setDeleteConfirm({ type: 'indikator', id: indId, name: text, parentId: catId });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // States for CSV Parsing / Column Mapping Modal
  const [isCsvMappingOpen, setIsCsvMappingOpen] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvColumnMapping, setCsvColumnMapping] = useState({ nameIdx: -1, nisIdx: -1, classIdx: -1, genderIdx: -1 });
  const [csvFileName, setCsvFileName] = useState('');

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
      
      // Normalize immediately upon import
      const { students: normalizedStudents, teachers: normalizedTeachers } = normalizeAllData(data.students || [], data.teachers || []);
      
      // 🛡️ Enforce NIS Duplicate & Format Integrity Checks during Impor
      let validStudents = normalizedStudents;
      let validTeachers = normalizedTeachers;

      if (validStudents.length > 0) {
        const missingNis: string[] = [];
        
        validStudents = validStudents.map((s, idx) => {
          const nis = (s.nis || '').trim();
          if (!nis || nis === 'undefined' || nis === 'null') {
            missingNis.push(s.name);
            // Auto generation of sequential NIS
            const fallbackNis = `99${idx}${String(Math.floor(100 + Math.random() * 900))}`;
            s.nis = fallbackNis;
          }
          return s;
        });

        if (missingNis.length > 0) {
          alert(`NOTIFIKASI IMPOR (NIS KOSONG):\n\nAda ${missingNis.length} siswa dengan NIS kosong di file Excel Anda:\n\n${missingNis.slice(0, 5).join('\n')}${missingNis.length > 5 ? `\n...dan ${missingNis.length - 5} lainnya` : ''}\n\nSesuai pengaturan sistem baru, data siswa ini TETAP DIIMPOR ke database sekolah dengan dilengkapkan nomor NIS otomatis sementara agar data tersimpan lengkap dan tidak hilang!`);
        }
      }

      if (validTeachers.length > 0) {
        const invalidNip: string[] = [];
        validTeachers.forEach(t => {
          const cleanedNip = (t.nip || '').trim().replace(/\s+/g, '');
          if (cleanedNip && cleanedNip !== '-' && !/^\d{18}$/.test(cleanedNip)) {
            invalidNip.push(`${t.name} (NIP: ${t.nip})`);
            t.nip = ''; // Auto repair to empty format
          }
        });

        if (invalidNip.length > 0) {
          alert(`PERBAIKAN FORMAT OTOMATIS (NIP GURU):\nDitemukan ${invalidNip.length} guru dengan format NIP tidak valid (harus persis 18 digit angka):\n\n${invalidNip.slice(0, 5).join('\n')}${invalidNip.length > 5 ? '\n...dan sisa lainnya' : ''}\n\nSistem secara otomatis mengosongkan nilai tersebut agar dapat tersimpan dengan aman.`);
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
      addChangeLog('IMPORT_EXCEL', `Mengimpor database dari file Excel "${file.name}" (${validStudents.length} siswa, ${validTeachers.length} guru)`);
      alert('Impor database berhasil diload dari Excel dan divalidasi dengan aman!');
    } catch (error) {
      console.error(error);
      alert('Gagal mengimpor database, pastikan format excel sesuai dengan hasil export.');
    }
    
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Helper to parse CSV text into string arrays
  const parseCSVToRows = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentValue = '';
    
    // Detect delimiter: comma or semicolon
    let delimiter = ',';
    const firstLine = text.split('\n')[0] || '';
    if (firstLine.includes(';')) {
      delimiter = ';';
    } else if (firstLine.includes('\t')) {
      delimiter = '\t';
    }

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentValue += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        row.push(currentValue.trim());
        currentValue = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentValue.trim());
        if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
          lines.push(row);
        }
        row = [];
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    if (currentValue || row.length > 0) {
      row.push(currentValue.trim());
      lines.push(row);
    }
    return lines;
  };

  const handleImportCsvAction = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) {
          alert('File CSV kosong atau gagal dibaca.');
          return;
        }

        const rows = parseCSVToRows(text);
        if (rows.length < 2) {
          alert('Format CSV tidak valid atau baris data terlalu sedikit (harus memiliki baris header dan minimal 1 data siswa).');
          return;
        }

        const headers = rows[0];
        setCsvHeaders(headers);
        setCsvRows(rows.slice(1));
        setCsvFileName(file.name);

        // Auto guessing the columns mapping based on common keywords
        let nameIdx = -1;
        let nisIdx = -1;
        let classIdx = -1;
        let genderIdx = -1;

        headers.forEach((h, idx) => {
          const lowerH = h.toLowerCase();
          if (nameIdx === -1 && (lowerH.includes('nama') || lowerH.includes('name') || lowerH.includes('lengkap') || lowerH.includes('siswa'))) {
            nameIdx = idx;
          }
          if (nisIdx === -1 && (lowerH.includes('nis') || lowerH.includes('induk') || lowerH.includes('no_induk') || lowerH.includes('number'))) {
            nisIdx = idx;
          }
          if (classIdx === -1 && (lowerH.includes('kelas') || lowerH.includes('class') || lowerH.includes('grade') || lowerH.includes('tingkat'))) {
            classIdx = idx;
          }
          if (genderIdx === -1 && (lowerH.includes('gender') || lowerH.includes('kelamin') || lowerH.includes('l/p') || lowerH.includes('lp') || lowerH.includes('sex'))) {
            genderIdx = idx;
          }
        });

        // Set default mapping state
        setCsvColumnMapping({
          nameIdx: nameIdx !== -1 ? nameIdx : 0,
          nisIdx: nisIdx !== -1 ? nisIdx : (headers.length > 1 ? 1 : 0),
          classIdx: classIdx !== -1 ? classIdx : (headers.length > 2 ? 2 : 0),
          genderIdx: genderIdx !== -1 ? genderIdx : (headers.length > 3 ? 3 : 0),
        });

        setIsCsvMappingOpen(true);
      };
      reader.readAsText(file, 'UTF-8');
    } catch (err: any) {
      alert(`Gagal memproses file CSV: ${err.message}`);
    }
  };

  const handleConfirmImportCsv = () => {
    const { nameIdx, nisIdx, classIdx, genderIdx } = csvColumnMapping;
    if (nameIdx === -1) {
      alert('Anda wajib memetakan kolom "Nama Siswa" agar data bisa diimpor.');
      return;
    }

    try {
      const importedStudents: Student[] = [];
      const missingNisList: string[] = [];
      let autoNisCount = 0;

      csvRows.forEach((row, index) => {
        // Skip empty row
        if (row.length === 0 || (row.length === 1 && !row[0])) return;

        const rawName = row[nameIdx] || '';
        if (!rawName.trim()) return; // skip row with missing student name
        
        const normalizedName = formatProperName(rawName.trim());

        let rawNis = nisIdx !== -1 ? (row[nisIdx] || '').trim() : '';
        // If empty NIS, we still import! (izinkan dan tetap upload database apabila ada yang notifikasi NIS kosong)
        if (!rawNis || rawNis === 'undefined' || rawNis === 'null') {
          missingNisList.push(normalizedName);
          // Auto generate sequential NIS
          rawNis = `99${index}${String(Math.floor(100 + Math.random() * 900))}`;
          autoNisCount++;
        }

        const rawClass = classIdx !== -1 ? (row[classIdx] || '').trim() : selectedClass;
        
        let rawGender = genderIdx !== -1 ? (row[genderIdx] || '').trim().toUpperCase() : 'L';
        if (rawGender.includes('P') || rawGender.includes('FEMALE') || rawGender.includes('WANITA') || rawGender.includes('PEREMPUAN')) {
          rawGender = 'P';
        } else {
          rawGender = 'L'; // default / male
        }

        importedStudents.push({
          id: `STU_CSV_${Date.now()}_${index}`,
          name: normalizedName,
          nis: rawNis,
          kelas: rawClass || selectedClass,
          gender: rawGender as 'L' | 'P',
          semester: 'Semester II (Genap)',
          grades: {},
          kesimpulan: 'Siswa menunjukkan antusiasme yang luar biasa dan tekad kuat untuk terus berprestasi. Perkembangan moral dan akademik berjalan seimbang serta berkembang ideal.',
          catatanWali: 'Uraian motivasi bagimu agar tangkas belajar di semester berikutnya! Tingkatkan terus prestasimu!',
          catatanOrangTua: 'Alhamdulillah, kami pantau terus perkembangan anak. Terima kasih bimbingan bapak/ibu Guru.',
          completed: false
        });
      });

      if (importedStudents.length === 0) {
        alert('Tidak ada siswa yang diimpor. Periksa kembali struktur file CSV.');
        return;
      }

      // Merge / overwrite or extend students database safely
      const currentStudents = [...students];
      let overwriteCount = 0;
      let newCount = 0;

      importedStudents.forEach(newStu => {
        const existIdx = currentStudents.findIndex(s => s.nis === newStu.nis);
        if (existIdx !== -1) {
          // Keep grades of existing if possible, just update info
          currentStudents[existIdx] = {
            ...newStu,
            grades: currentStudents[existIdx].grades, // preserve grades of existing student
            completed: currentStudents[existIdx].completed
          };
          overwriteCount++;
        } else {
          currentStudents.push(newStu);
          newCount++;
        }
      });

      onUpdateStudents(currentStudents);
      setIsCsvMappingOpen(false);

      addChangeLog('IMPORT_CSV', `Mengimpor ${importedStudents.length} siswa baru dari file CSV "${csvFileName}"`);

      // Notification
      let notifMsg = `CSV BERHASIL DIIMPOR!\n\nBerhasil membaca ${importedStudents.length} baris siswa dari CSV.\n- Siswa Baru: ${newCount}\n- Diperbarui (NIS Cocok): ${overwriteCount}\n `;
      if (missingNisList.length > 0) {
        notifMsg += `\n\n⚠️ NOTIFIKASI NIS KOSONG:\nAda ${missingNisList.length} siswa diimpor dengan NIS kosong. NIS mereka di-generate otomatis demi integritas sistem:\n${missingNisList.slice(0, 5).join('\n')}${missingNisList.length > 5 ? `\n...dan ${missingNisList.length - 5} lainnya` : ''}`;
      }

      alert(notifMsg);

      // Reset file input
      if (csvFileInputRef.current) csvFileInputRef.current.value = '';
    } catch (err: any) {
      alert(`Gagal mengimpor data CSV: ${err.message}`);
    }
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
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col h-full overflow-hidden"
    >
      <input 
        type="file" 
        accept=".xlsx, .xls" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleImportDatabaseAction} 
      />
      <input 
        type="file" 
        accept=".csv" 
        className="hidden" 
        ref={csvFileInputRef} 
        onChange={handleImportCsvAction} 
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
            👩‍🏫 Manajemen Data Guru & Wali Kelas
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
          <button
            onClick={() => setActiveSubTab('riwayat')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer select-none border transition-colors ${
              activeSubTab === 'riwayat' 
                ? 'bg-white text-slate-800 border-slate-200 shadow-xs' 
                : 'text-slate-500 hover:bg-slate-200/50 border-transparent'
            }`}
          >
            ⏱️ Riwayat Perubahan
          </button>
          <button
            onClick={() => setActiveSubTab('snapshot')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer select-none border transition-colors ${
              activeSubTab === 'snapshot' 
                ? 'bg-white text-slate-800 border-slate-200 shadow-xs' 
                : 'text-slate-500 hover:bg-slate-200/50 border-transparent'
            }`}
          >
            📸 Snapshot Manual
          </button>
          <button
            onClick={() => setActiveSubTab('integritas')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer select-none border transition-colors ${
              activeSubTab === 'integritas' 
                ? 'bg-white text-slate-800 border-slate-200 shadow-xs' 
                : 'text-slate-500 hover:bg-slate-200/50 border-transparent'
            }`}
          >
            🔍 Cek Integritas Data
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
          
          <span className="text-[10px] font-bold text-slate-400 mr-1 hidden sm:inline">IMPOR DATA:</span>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-[11px] font-bold bg-white border border-slate-300 text-slate-700 px-2   py-1.5 rounded-lg hover:bg-slate-100 transition-colors shadow-xs cursor-pointer"
            title="Impor database massal dari Excel (.xlsx)"
          >
            <Upload className="h-3 w-3" /> Impor Excel
          </button>

          <button 
            onClick={() => csvFileInputRef.current?.click()}
            className="flex items-center gap-1 text-[11px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors shadow-xs cursor-pointer"
            title="Impor daftar siswa massal dari file CSV (.csv)"
          >
            <Upload className="h-3 w-3 text-emerald-600" /> Impor CSV
          </button>
          
          <div className="hidden sm:block w-px h-4 bg-slate-300 mx-1"></div>

          <span className="text-[10px] font-bold text-slate-400 mr-1 hidden sm:inline">BACKUP:</span>

           <button 
            onClick={handleExportDatabase}
            className="flex items-center gap-1 text-[11px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors shadow-xs cursor-pointer"
            title="Download Master database rekap dalam format Excel"
          >
            <Download className="h-3 w-3" /> Backup Lokal
          </button>
          
          <button 
            onClick={() => exportAllStudentsToCsv(students, categories)}
            className="flex items-center gap-1 text-[11px] font-bold bg-teal-50 border border-teal-200 text-teal-850 px-2.5 py-1.5 rounded-lg hover:bg-teal-100 transition-colors shadow-xs cursor-pointer"
            title="Download rekap data mentah seluruh siswa ke format CSV untuk aplikasi pihak ketiga"
          >
            <Download className="h-3 w-3 text-teal-600" /> Ekspor CSV
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
          
          {/* INFO GRAPHIC / GUIDE FOR SISWA */}
          <div className="mx-4 mt-3 bg-gradient-to-r from-indigo-50/70 to-blue-50/40 border border-indigo-100 rounded-xl p-3 flex gap-3 items-start no-print text-xs text-indigo-950 leading-relaxed shadow-2xs">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <span className="font-extrabold text-indigo-950 block text-[11px] uppercase tracking-wider">💡 PANDUAN MANAJEMEN SISWA KELAS {selectedClass}</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1.5 font-medium text-slate-600 text-[11px]">
                <div>
                  <span className="font-bold text-indigo-800 block">1. TAMBAH / EDIT DATA ✏️</span>
                  Klik <strong className="text-indigo-950">"Tambah Siswa"</strong> untuk murid tunggal. Untuk mengubah data (NIS, Nama, L/P), silakan klik tombol edit di sebelah kanan baris siswa bersangkutan.
                </div>
                <div>
                  <span className="font-bold text-indigo-800 block">2. RAPIKAN NAMA ⚡</span>
                  Gunakan tombol <strong className="text-indigo-950">"Batch Normalization"</strong> untuk mengoreksi penulisan nama massal menjadi format huruf kapital kata depan yang formal secara otomatis.
                </div>
                <div>
                  <span className="font-bold text-indigo-800 block">3. HAPUS MASSAL 🗑️</span>
                  Centang nama siswa pada tabel, lalu klik <strong className="text-indigo-950">"Hapus Terpilih"</strong> untuk membersihkan data beberapa siswa sekaligus dengan cepat.
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50 border-b border-slate-100 p-2 flex items-center gap-3 px-4 no-print text-xs justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="select-all-students"
                checked={selectedStudentIds.size === filteredStudentsByClass.length && filteredStudentsByClass.length > 0}
                onChange={handleSelectAllStudentsInCurrentView}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="select-all-students" className="font-semibold text-slate-600 cursor-pointer select-none">
                Pilih Semua ({selectedStudentIds.size}/{filteredStudentsByClass.length})
              </label>
            </div>

            <div className="flex items-center gap-2 opacity-100 transition-opacity">
              <button
                onClick={handleBatchNormalizeStudents}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-3 py-1 rounded-md text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Rapikan penulisan nama (huruf kapital) bagi semua siswa kelas ini"
              >
                <SpellCheck className="h-3.5 w-3.5" /> Batch Normalization
              </button>

              {selectedStudentIds.size > 0 && (
                <button
                  onClick={handleBulkDeleteStudents}
                  className="bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold px-3 py-1 rounded-md text-[11px] flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Hapus Terpilih ({selectedStudentIds.size})
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto max-h-[450px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-10 text-center"></th>
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
                    <tr 
                      key={s.id} 
                      className={`transition-colors cursor-pointer ${selectedStudentIds.has(s.id) ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-slate-50'}`}
                      onClick={() => handleSelectStudent(s.id)}
                    >
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.has(s.id)}
                          onChange={(e) => handleSelectStudent(s.id, e)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
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
                    <td colSpan={8} className="p-10 text-center text-slate-400 italic">
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
                Manajemen Data Guru & Wali Kelas Rapor
              </h4>
              <p className="text-[11px] text-slate-400">Tambah, ubah, atau hapus data NIP, Nama Guru, jabatan, dan alokasi kelas secara langsung agar lebih terorganisir</p>
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
          
          {/* INFO GRAPHIC / GUIDE FOR GURU */}
          <div className="mx-4 mt-3 bg-gradient-to-r from-emerald-50/70 to-teal-50/40 border border-emerald-100 rounded-xl p-3 flex gap-3 items-start no-print text-xs text-emerald-950 leading-relaxed shadow-2xs">
            <div className="bg-emerald-600 text-white p-1.5 rounded-lg shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <span className="font-extrabold text-emerald-950 block text-[11px] uppercase tracking-wider">💡 PANDUAN MANAJEMEN GURU & STAF</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1.5 font-medium text-slate-600 text-[11px]">
                <div>
                  <span className="font-bold text-emerald-800 block">1. ROLE WALI KELAS 👩‍🏫</span>
                  Guru yang memegang peran <strong className="text-emerald-950">"Wali Kelas"</strong> wajib diisi kolom alokasi kelasnya (misal: "X-1") agar sinkron dengan daftar murid yang mereka ampu.
                </div>
                <div>
                  <span className="font-bold text-emerald-800 block">2. INFORMASI NIP 📝</span>
                  Pastikan NIP diisi dengan benar karena NIP guru akan secara otomatis ditarik dan dicetak pada bagian tanda tangan lembar Rapor cetak siswa.
                </div>
                <div>
                  <span className="font-bold text-emerald-800 block">3. FILTER & CARI 🔍</span>
                  Gunakan kolom pencarian di sebelah kanan atas untuk memfilter daftar guru berdasarkan Nama atau NIP secara seketika ketika database semakin membesar.
                </div>
              </div>
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
          
          {/* INFO GRAPHIC / GUIDE FOR INDIKATOR */}
          <div className="mb-6 bg-gradient-to-r from-amber-50/70 to-orange-50/40 border border-amber-200 rounded-xl p-3 flex gap-3 items-start no-print text-xs text-amber-950 leading-relaxed shadow-2xs max-w-4xl">
            <div className="bg-amber-600 text-white p-1.5 rounded-lg shrink-0">
              <Award className="h-4 w-4" />
            </div>
            <div>
              <span className="font-extrabold text-amber-950 block text-[11px] uppercase tracking-wider">💡 PANDUAN PENGATURAN RUBRIK KARAKTER 5NK</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1.5 font-medium text-slate-600 text-[11px]">
                <div>
                  <span className="font-bold text-amber-800 block">1. PILAR KARAKTER (KARTIKA) 🌟</span>
                  Terdapat 5 Nilai Utama (Cinta Tanah Air, Disiplin, Berbudi Luhur, Cerdas, Terampil). Masing-masing memiliki sub-indikator tersendiri untuk dinilai di Rapor.
                </div>
                <div>
                  <span className="font-bold text-amber-800 block">2. MENYESUAIKAN KALIMAT ✍️</span>
                  Klik tombol ✏️ di sebelah kanan baris sub-indikator untuk mengubah kalimat deskripsi agar sesuai dengan indikator pencapaian kurikulum terbaru.
                </div>
                <div>
                  <span className="font-bold text-amber-800 block">3. NILAI YANG DIDUKUNG 📊</span>
                  Setiap indikator akan dinilai menggunakan predikat standar: <strong className="text-amber-950">BSB</strong> (Berkembang Sangat Baik), <strong className="text-amber-950">BHD</strong> (Berkembang), <strong className="text-amber-950">MB</strong> (Mulai Berkembang), atau <strong className="text-amber-950">BB</strong> (Belum Berkembang).
                </div>
              </div>
            </div>
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
          
          {/* INFO GRAPHIC / GUIDE FOR KOP */}
          <div className="mb-6 bg-gradient-to-r from-blue-50/70 to-indigo-50/40 border border-blue-200 rounded-xl p-3 flex gap-3 items-start no-print text-xs text-blue-950 leading-relaxed shadow-2xs max-w-2xl">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg shrink-0">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <span className="font-extrabold text-blue-955 block text-[11px] uppercase tracking-wider">💡 PANDUAN PENGATURAN PROFIL & KOP SEKOLAH</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1.5 font-medium text-slate-600 text-[11px]">
                <div>
                  <span className="font-bold text-blue-800 block">1. IDENTITAS SEKOLAH 🏢</span>
                  Masukkan nama yayasan, nama sekolah, kota koordinator pelaksana, dan alamat lengkap untuk kop hasil cetak rapor resmi.
                </div>
                <div>
                  <span className="font-bold text-blue-800 block">2. TANDA TANGAN DIGITAL ✍️</span>
                  Sediakan URL gambar tanda tangan transparan untuk Wali Kelas, Kepala Sekolah, dan Orang Tua agar langsung tersemat di berkas PDF.
                </div>
                <div>
                  <span className="font-bold text-blue-800 block">3. LOGO SEKOLAH 🎨</span>
                  Tempelkan URL gambar logo sekolah (format PNG transparan direkomendasikan) agar terpasang secara simetris di sisi kiri kop surat.
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            onUpdateKopSekolah(editKop);
            addChangeLog('EDIT_KOP', `Mengubah profil sekolah / kop surat mendasar menjadi "${editKop.namaSekolah}"`);
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
                  placeholder="Contoh: KOREM 084"
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
                  placeholder="Contoh: IV BRAWIJAYA"
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
                  placeholder="Contoh: SMA KARTIKA IV-3 SURABAYA"
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
                placeholder="Contoh: Jl. Brawijaya No.38, Karah, Kec. Jambangan, Kota Surabaya, Jawa Timur 60232"
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

              <div className="flex flex-col gap-1.5 text-xs sm:col-span-2">
                <label className="font-bold text-slate-500 uppercase tracking-wider">Logo Sekolah (Opsional)</label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    {editKop.logoUrl && (
                      <img src={editKop.logoUrl} alt="Logo" className="w-14 h-14 object-contain bg-white rounded border border-slate-200 shadow-sm" />
                    )}
                    <div className="flex-1 flex flex-col gap-2">
                      <input
                        type="url"
                        placeholder="Tempelkan URL gambar logo di sini (https://...)"
                        value={editKop.logoUrl?.startsWith('data:') ? '' : editKop.logoUrl || ''}
                        onChange={(e) => setEditKop({ ...editKop, logoUrl: e.target.value })}
                        className="bg-white border border-slate-300 rounded-lg p-2.5 font-sans"
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold px-1 text-[10px] uppercase">ATAU UNGGAH FILE:</span>
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
                            }
                          }}
                          className="flex-1 bg-white border border-slate-300 rounded-lg p-1.5 font-mono text-[11px] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                        />
                      </div>
                    </div>
                    {editKop.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setEditKop({ ...editKop, logoUrl: '' })}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-none"
                        title="Hapus Logo"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Template Catatan */}
              <div className="flex flex-col gap-1.5 text-xs sm:col-span-2 border-t border-slate-200 pt-4 mt-2">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-xs">Template Catatan (Pisahkan dengan koma)</label>
                <textarea
                  value={editKop.templateNotes?.join(', ') || ''}
                  onChange={(e) => setEditKop({ ...editKop, templateNotes: e.target.value.split(',').map(s => s.trim()) })}
                  rows={3}
                  placeholder="Contoh: Sangat Baik, Perlu Bimbingan, Pertahankan Prestasi"
                  className="bg-white border border-slate-300 rounded-lg p-2.5 font-sans"
                />
              </div>

              {/* Tanda Tangan Digital Guru / Orang Tua */}
              <div className="flex flex-col gap-1.5 text-xs sm:col-span-2 border-t border-slate-200 pt-4 mt-2">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-xs">Tanda Tangan Digital (Opsional)</label>
                <p className="text-slate-400 text-[11px] mb-3">Unggah foto tanda tangan digital guru (wali kelas) dan orang tua untuk ditampilkan secara otomatis di format Cetak Rapor PDF.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tanda Tangan Guru */}
                  <div className="bg-white p-4 border border-slate-200 rounded-lg flex flex-col gap-2">
                    <span className="font-bold text-slate-600 block mb-1">Tanda Tangan Guru / Wali Kelas</span>
                    <div className="flex items-center gap-3">
                      {editKop.signatureTeacherUrl ? (
                        <div className="relative">
                          <img src={editKop.signatureTeacherUrl} alt="Tanda Tangan Guru" className="w-20 h-16 object-contain bg-slate-50 rounded border border-slate-200" />
                          <button
                            type="button"
                            onClick={() => setEditKop({ ...editKop, signatureTeacherUrl: '' })}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center shadow-md hover:scale-105 transition-transform font-bold text-[10px] cursor-pointer"
                            title="Hapus"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-16 bg-slate-100 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 font-mono text-[9px] text-center px-1">KOSONG</div>
                      )}
                      <div className="flex-1 flex flex-col gap-1.5">
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditKop({ ...editKop, signatureTeacherUrl: reader.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-[10px] file:py-0.5 file:px-2 file:bg-emerald-50 file:text-emerald-700 file:border-0 file:rounded file:text-[10px] file:font-semibold"
                        />
                        <span className="text-[10px] text-slate-400 block">PNG transparan direkomendasikan.</span>
                      </div>
                    </div>
                  </div>

                  
                  {/* Tanda Tangan Kepala Sekolah */}
                  <div className="bg-white p-4 border border-slate-200 rounded-lg flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-600 block">Tanda Tangan Kepala Sekolah</span>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editKop.enableSignatureHeadmaster ?? false}
                          onChange={(e) => setEditKop({ ...editKop, enableSignatureHeadmaster: e.target.checked })}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                        />
                        <span className="text-[10px] font-bold text-slate-500">Tampilkan di Rapor</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      {editKop.signatureHeadmasterUrl ? (
                        <div className="relative">
                          <img src={editKop.signatureHeadmasterUrl} alt="Tanda Tangan Kepala Sekolah" className="w-20 h-16 object-contain bg-slate-50 rounded border border-slate-200" />
                          <button
                            type="button"
                            onClick={() => setEditKop({ ...editKop, signatureHeadmasterUrl: '' })}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center shadow-md hover:scale-105 transition-transform font-bold text-[10px] cursor-pointer"
                            title="Hapus"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-16 bg-slate-100 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 font-mono text-[9px] text-center px-1">KOSONG</div>
                      )}
                      <div className="flex-1 flex flex-col gap-1.5">
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditKop({ ...editKop, signatureHeadmasterUrl: reader.result as string });
                              };
                               reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-[10px] file:py-0.5 file:px-2 file:bg-emerald-50 file:text-emerald-700 file:border-0 file:rounded file:text-[10px] file:font-semibold"
                        />
                        <span className="text-[10px] text-slate-400 block">PNG transparan direkomendasikan.</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-600">Nama Kepala Sekolah</label>
                        <input
                          type="text"
                          value={editKop.namaKepalaSekolah || ''}
                          onChange={(e) => setEditKop({ ...editKop, namaKepalaSekolah: e.target.value })}
                          className="border border-slate-300 rounded px-2 py-1 text-xs focus:ring-emerald-500 focus:border-emerald-500 bg-white w-full"
                          placeholder="Contoh: Budi Santoso, S.Pd., M.Pd."
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-slate-600">NIP Kepala Sekolah (Opsional)</label>
                        <input
                          type="text"
                          value={editKop.nipKepalaSekolah || ''}
                          onChange={(e) => setEditKop({ ...editKop, nipKepalaSekolah: e.target.value })}
                          className="border border-slate-300 rounded px-2 py-1 text-xs focus:ring-emerald-500 focus:border-emerald-500 bg-white w-full"
                          placeholder="Contoh: 19800101 200501 1 001"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tanda Tangan Orang Tua */}
                  <div className="bg-white p-4 border border-slate-200 rounded-lg flex flex-col gap-2">
                    <span className="font-bold text-slate-600 block mb-1">Tanda Tangan Orang Tua / Wali</span>
                    <div className="flex items-center gap-3">
                      {editKop.signatureParentUrl ? (
                        <div className="relative">
                          <img src={editKop.signatureParentUrl} alt="Tanda Tangan Orang Tua" className="w-20 h-16 object-contain bg-slate-50 rounded border border-slate-200" />
                          <button
                            type="button"
                            onClick={() => setEditKop({ ...editKop, signatureParentUrl: '' })}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center shadow-md hover:scale-105 transition-transform font-bold text-[10px] cursor-pointer"
                            title="Hapus"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-16 bg-slate-100 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 font-mono text-[9px] text-center px-1">KOSONG</div>
                      )}
                      <div className="flex-1 flex flex-col gap-1.5">
                        <input
                          type="file"
                          accept="image/png, image/jpeg, image/jpg"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditKop({ ...editKop, signatureParentUrl: reader.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-[10px] file:py-0.5 file:px-2 file:bg-emerald-50 file:text-emerald-700 file:border-0 file:rounded file:text-[10px] file:font-semibold"
                        />
                        <span className="text-[10px] text-slate-400 block">PNG transparan direkomendasikan.</span>
                      </div>
                    </div>
                  </div>

                  {/* Tanda Tangan Orang Tua */}
                  <div className="bg-white p-4 border border-slate-200 rounded-lg flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-600 block">Tanda Tangan Orang Tua / Wali</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {editKop.signatureParentUrl ? (
                        <div className="relative">
                          <img src={editKop.signatureParentUrl} alt="Tanda Tangan Orang Tua" className="w-20 h-16 object-contain bg-slate-50 rounded border border-slate-200" />
                          <button
                            type="button"
                            onClick={() => setEditKop({ ...editKop, signatureParentUrl: '' })}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center shadow-md hover:scale-105 transition-transform font-bold text-[10px] cursor-pointer"
                            title="Hapus"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-16 bg-slate-50 border border-dashed border-slate-300 rounded flex items-center justify-center text-[9px] text-slate-400 font-medium">
                          Belum ada
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/png, image/jpeg"
                          className="block w-full text-xs text-slate-500
                            file:mr-3 file:py-1.5 file:px-3
                            file:rounded-md file:border-0
                            file:text-xs file:font-semibold
                            file:bg-slate-100 file:text-slate-700
                            hover:file:bg-slate-200 cursor-pointer"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 500000) {
                                alert("Ukuran gambar terlalu besar. Maksimal 500KB untuk menjaga ukuran database.");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditKop({ ...editKop, signatureParentUrl: reader.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <span className="text-[10px] text-slate-400 block">PNG transparan direkomendasikan.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Page Numbering Options */}
            <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <h5 className="font-bold text-slate-700 text-xs">Penomoran Halaman Otomatis</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Tampilkan nomor halaman otomatis (Page X of Y) di sudut bawah halaman rapor.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={editKop.showPageNumbering ?? true}
                  onChange={(e) => setEditKop({ ...editKop, showPageNumbering: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* High Contrast Theme Toggle */}
            <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <h5 className="font-bold text-slate-700 text-xs">Tema High Contrast</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Meningkatkan keterbacaan teks dan tabel untuk kenyamanan visual.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isHighContrast}
                  onChange={(e) => setIsHighContrast(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Row Height Mode */}
            <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <h5 className="font-bold text-slate-700 text-xs">Jarak Baris Grid (Row Height)</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Pilih mode tampilan tabel di area input nilai utama.</p>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setRowHeightMode('compact')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${rowHeightMode === 'compact' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Compact
                </button>
                <button
                  onClick={() => setRowHeightMode('comfortable')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${rowHeightMode === 'comfortable' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Comfortable
                </button>
              </div>
            </div>

            {/* Forced Print Orientation */}
            <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <h5 className="font-bold text-slate-700 text-xs">Orientasi Cetak Rapor</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Paksa tata letak cetak/PDF menggunakan mode Portrait atau Landscape.</p>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => setEditKop({ ...editKop, forcedOrientation: 'auto' })}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${(!editKop.forcedOrientation || editKop.forcedOrientation === 'auto') ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Otomatis
                </button>
                <button
                  type="button"
                  onClick={() => setEditKop({ ...editKop, forcedOrientation: 'portrait' })}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${editKop.forcedOrientation === 'portrait' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Portrait
                </button>
                <button
                  type="button"
                  onClick={() => setEditKop({ ...editKop, forcedOrientation: 'landscape' })}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${editKop.forcedOrientation === 'landscape' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Landscape
                </button>
              </div>
            </div>

            {/* Custom Footer Text */}
            <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl">
              <h5 className="font-bold text-slate-700 text-xs mb-2">Teks Footer Kustom</h5>
              <p className="text-[11px] text-slate-400 mb-3">Teks ini akan muncul di bagian bawah setiap lembar rapor yang dicetak.</p>
              <textarea
                value={editKop.customFooterText || ''}
                onChange={(e) => setEditKop({...editKop, customFooterText: e.target.value})}
                placeholder="Contoh: Dokumen ini diterbitkan secara elektronik..."
                className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-xs rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 p-3 h-20 outline-none transition-all resize-none"
              />
            </div>

            {/* Footer Date Display Toggle */}
            <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <h5 className="font-bold text-slate-700 text-xs">Tanggal Otomatis di Footer</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Tampilkan tanggal cetak otomatis (Dicetak: DD MMMM YYYY) di sudut bawah halaman rapor.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={editKop.enableAutoDate ?? true}
                  onChange={(e) => setEditKop({...editKop, enableAutoDate: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Paper Size Setting */}
            <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <h5 className="font-bold text-slate-700 text-xs">Ukuran Kertas Cetak Fisik</h5>
                <p className="text-[11px] text-slate-400 mt-0.5">Mengubah proporsi dan dimensi kertas pada komponen cetak untuk PDF dan pencetakan fisik agar tata letak tidak terpotong.</p>
              </div>
              <select
                value={paperSize}
                onChange={(e) => {
                  const val = e.target.value as 'A4' | 'F4';
                  onUpdatePaperSize(val);
                }}
                className="bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="F4">F4 / Folio (215 × 330 mm)</option>
              </select>
            </div>

            <div className="mt-6 p-4 bg-white border border-slate-200 rounded-xl">
              <h5 className="font-bold text-slate-700 text-xs mb-3">Penyesuaian Margin Cetak (mm)</h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['top', 'bottom', 'left', 'right'].map((margin) => (
                  <div key={margin} className="flex flex-col gap-1 text-xs">
                    <label className="font-bold text-slate-500 capitalize">{margin}</label>
                    <input
                      type="number"
                      value={printMargins[margin as keyof typeof printMargins]}
                      onChange={(e) => updatePrintMargins({ ...printMargins, [margin]: parseInt(e.target.value) || 0 })}
                      className="bg-slate-50 border border-slate-300 rounded-lg p-2"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-2 text-right">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-2 shadow-xs cursor-pointer inline-flex"
              >
                <Save className="h-4 w-4" /> Simpan Profil Sekolah & Margin
              </button>
            </div>
          </form>
        </div>
      )}

      {/* -------------------- SUBTAB 5: BACKUP & ENKRIPSI -------------------- */}
      {activeSubTab === 'backup' && (
        <div className="flex-1 overflow-y-auto p-6 max-h-[500px]">
          {/* INFO GRAPHIC / GUIDE FOR BACKUP & SECURITY */}
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-indigo-600 text-white p-3 rounded-xl shadow-md shrink-0">
                <Lock className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h5 className="font-extrabold text-indigo-950 text-xs uppercase tracking-wider">Keamanan & Panduan Backup Sistem Rapor 5NK</h5>
                <p className="text-xs text-indigo-850 leading-relaxed max-w-3xl mt-1">
                  Database Rapor 5NK tersimpan seutuhnya dalam memori internal browser Anda secara luring. Untuk menjaga agar kerja keras Anda tidak hilang akibat terhapusnya cache browser, biasakan melakukan pencadangan secara berkala.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-[11px] text-indigo-900 font-semibold">
                  <div className="bg-white/70 p-2.5 rounded-xl border border-indigo-200/50">
                    <span className="text-indigo-850 block font-black mb-0.5">🔐 BACKUP TERENKRIPSI</span>
                    Sandi rahasia mengunci berkas JSON agar data pribadi murid aman dari pihak yang tidak bertanggung jawab.
                  </div>
                  <div className="bg-white/70 p-2.5 rounded-xl border border-indigo-200/50">
                    <span className="text-indigo-850 block font-black mb-0.5">📂 REKAP CSV MENTAH</span>
                    Ekspor dalam format Comma-Separated (.csv) agar mudah diolah di Excel, Google Sheets, atau aplikasi Dapodik.
                  </div>
                  <div className="bg-white/70 p-2.5 rounded-xl border border-indigo-200/50">
                    <span className="text-indigo-850 block font-black mb-0.5">⚡ RESTORASI INSTAN</span>
                    Cukup unggah file backup JSON Anda dan masukkan sandi pemulihan untuk memulihkan seluruh sistem seketika.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Lock className="h-4 w-4 text-indigo-600" />
              Keamanan Data Offline & Multi-Format Backup
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">Guru dapat mengunduh seluruh data aplikasi (Siswa, Guru, Nilai, Kategori) dalam format terenkripsi atau data rekap mentah (.csv) untuk keperluan pengolahan data eksternal.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl">
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
                <button
                  onClick={() => {
                    if (window.confirm("Apakah Anda yakin ingin melakukan normalisasi massal pada seluruh data nama guru dan siswa? Sisa spasi dan format gelar akan diperbaiki secara otomatis.")) {
                      const { students: normalizedStudents, teachers: normalizedTeachers } = normalizeAllData(students, teachers);
                      onUpdateStudents(normalizedStudents);
                      onUpdateTeachers(normalizedTeachers);
                      addChangeLog('NORMALISASI_MASSAL', 'Melakukan normalisasi massal pada seluruh nama guru dan siswa');
                      alert('Data berhasil dinormalisasi!');
                    }
                  }}
                  className="w-full py-2 mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Normalisasi Massal Data
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
                        const normalizedStudents = parsed.students.map((s: any) => ({...s, name: formatProperName(s.name)}));
                        const normalizedTeachers = parsed.teachers.map((t: any) => ({...t, name: formatProperName(t.name)}));
                        
                        onUpdateStudents(normalizedStudents);
                        onUpdateTeachers(normalizedTeachers);
                        onUpdateCategories(parsed.categories);
                        if (parsed.kopSekolah) {
                          onUpdateKopSekolah(parsed.kopSekolah);
                        }
                        addChangeLog('RESTORE_DATABASE', `Memulihkan database secara penuh dari file cadangan JSON`);
                        
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

            {/* CARD 3: EXPORT RAW CSV */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-teal-50 p-1.5 rounded-lg border border-teal-200">
                    <Download className="h-4 w-4 text-teal-700" />
                  </div>
                  <h5 className="font-bold text-slate-700 text-xs font-black uppercase">Ekspor Rekap CSV Mentah</h5>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                  Unduh rekapitulasi data mentah seluruh siswa dari semua kelas dalam format <strong>CSV (Comma-Separated Values)</strong> yang terstandar. Sangat kompatibel untuk diintegrasikan dengan aplikasi pihak ketiga seperti sistem dapodik, spreadsheet eksternal, atau analisis nilai yayasan.
                </p>
                <div className="p-2.5 bg-teal-50/50 border border-teal-100 rounded-lg text-[10px] text-teal-850 font-bold mb-4">
                  📌 Format ini menggunakan pemisah koma (,) dan dilengkapi penanda UTF-8 BOM untuk kompatibilitas penuh saat dibuka di Microsoft Excel maupun Google Sheets.
                </div>
              </div>

              <div>
                <button
                  onClick={() => exportAllStudentsToCsv(students, categories)}
                  className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                >
                  <Download className="h-3.5 w-3.5" /> Ekspor Seluruh Siswa (.csv)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- SUBTAB 6: RIWAYAT PERUBAHAN -------------------- */}
      {activeSubTab === 'riwayat' && (
        <div className="flex-1 overflow-y-auto p-6 max-h-[500px]">
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-600 animate-pulse" />
                Riwayat Perubahan Data (Change History Logs)
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">Sistem mencatat log waktu dan rincian perubahan data untuk pelacakan kesalahan input nilai secara tidak sengaja.</p>
            </div>
            {changeLogs.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm('Apakah Anda yakin ingin menghapus seluruh log riwayat perubahan? Tindakan ini tidak dapat dibatalkan.')) {
                    clearChangeLogs();
                    alert('Asal log riwayat perubahan berhasil dikosongkan!');
                  }
                }}
                className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-3 py-1.5 rounded-lg text-[11px] cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Hapus Semua Riwayat
              </button>
            )}
          </div>

          <div className="mb-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Cari kata kunci riwayat atau jenis perubahan..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-300 rounded-lg bg-white placeholder-slate-400 focus:outline-hidden"
              />
              <Search className="absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
            </div>
            <select
              value={logActionFilter}
              onChange={(e) => setLogActionFilter(e.target.value)}
              className="px-3 py-2.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden"
            >
              <option value="ALL">Semua Aksi</option>
              <option value="TAMBAH">Tambah (Create)</option>
              <option value="EDIT">Ubah (Update)</option>
              <option value="HAPUS">Hapus (Delete)</option>
            </select>
            <select
              value={logDateFilter}
              onChange={(e) => setLogDateFilter(e.target.value)}
              className="px-3 py-2.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden"
            >
              <option value="ALL">Semua Waktu</option>
              <option value="TODAY">Hari Ini</option>
              <option value="WEEK">7 Hari Terakhir</option>
              <option value="MONTH">30 Hari Terakhir</option>
            </select>
          </div>

          {changeLogs.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
              <History className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-xs text-slate-500 font-semibold">Belum Ada Riwayat Perubahan Terdeteksi</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Semua entri tambahan siswa, hapus, profil, atau input nilai akan tercatat otomatis di sini.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-[350px] overflow-y-auto shadow-inner">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">
                  <tr>
                    <th className="px-4 py-3">Waktu Transaksi (WIB)</th>
                    <th className="px-4 py-3">Operator</th>
                    <th className="px-4 py-3">Jenis Kegiatan</th>
                    <th className="px-4 py-3">Rincian Perubahan Data</th>
                    <th className="px-4 py-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {changeLogs
                    .filter(log => {
                      let matchesAction = true;
                      if (logActionFilter !== 'ALL') {
                        matchesAction = log.type.includes(logActionFilter);
                      }
                      
                      let matchesDate = true;
                      if (logDateFilter !== 'ALL') {
                        // Very simple date comparison assuming "DD/MM/YYYY, HH:mm:ss" format roughly
                        const logDate = new Date(log.timestamp.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1'));
                        const now = new Date();
                        const diffTime = Math.abs(now.getTime() - logDate.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (logDateFilter === 'TODAY') matchesDate = diffDays <= 1;
                        if (logDateFilter === 'WEEK') matchesDate = diffDays <= 7;
                        if (logDateFilter === 'MONTH') matchesDate = diffDays <= 30;
                      }

                      let matchesSearch = true;
                      if (logSearchQuery) {
                        const query = logSearchQuery.toLowerCase();
                        matchesSearch = (
                          log.type.toLowerCase().includes(query) ||
                          log.description.toLowerCase().includes(query) ||
                          log.timestamp.toLowerCase().includes(query) ||
                          (log.operator && log.operator.toLowerCase().includes(query))
                        );
                      }
                      
                      return matchesAction && matchesDate && matchesSearch;
                    })
                    .map((log) => {
                      let badgeColor = "bg-slate-100 text-slate-700 border-slate-200";
                      if (log.type.includes('TAMBAH')) badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
                      else if (log.type.includes('HAPUS')) badgeColor = "bg-rose-50 text-rose-700 border-rose-200";
                      else if (log.type.includes('EDIT')) badgeColor = "bg-indigo-50 text-indigo-700 border-indigo-200";
                      else if (log.type.includes('NILAI') || log.type.includes('KOSONGKAN') || log.type.includes('BULK')) badgeColor = "bg-amber-50 text-amber-700 border-amber-200";
                      else if (log.type.includes('RESTORE') || log.type.includes('RESET')) badgeColor = "bg-purple-50 text-purple-700 border-purple-200";

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/55 transition-colors">
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                          <td className="px-4 py-3 text-slate-700 font-bold whitespace-nowrap">{log.operator || 'Pengguna Lokal (Offline)'}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${badgeColor}`}>
                              {log.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600 break-words font-medium">{log.description}</td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <button
                              onClick={() => {
                                if (confirm('Apakah Anda yakin ingin menghapus log perubahan ini?')) {
                                  deleteChangeLog(log.id);
                                  setChangeLogs(getChangeLogs());
                                }
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100 transition-colors cursor-pointer inline-flex items-center justify-center"
                              title="Hapus riwayat ini"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* -------------------- SUBTAB 7: SNAPSHOT MANUAL & EKSPOR YAYASAN -------------------- */}
      {activeSubTab === 'snapshot' && (
        <div className="flex-1 overflow-y-auto p-6 max-h-[500px]">
          {/* INFOGRAFIS PANDUAN SNAPSHOT MANUAL */}
          <div className="mb-6 bg-gradient-to-r from-teal-50 to-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-emerald-600 text-white p-3 rounded-xl shadow-md shrink-0">
                <Camera className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h5 className="font-extrabold text-emerald-950 text-xs uppercase tracking-wider">Panduan Snapshot Manual (Cadangan Titik Waktu Seketika)</h5>
                <p className="text-xs text-emerald-800 leading-relaxed max-w-3xl mt-1">
                  Fitur <strong>Snapshot</strong> bertindak seperti mesin waktu lokal untuk seluruh database Rapor 5NK Anda. Sistem menyimpan "titik pemulihan" aman di dalam memori luring browser Anda secara instan tanpa membutuhkan koneksi internet.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-[11px] text-emerald-900 font-semibold">
                  <div className="bg-white/70 p-2.5 rounded-xl border border-emerald-200/50">
                    <span className="text-emerald-700 block font-black mb-0.5">1. AMBIL CAPTURE 📸</span>
                    Ketik label penanda (contoh: "Sebelum Generate Deskripsi AI") lalu klik tombol Ambil Snapshot.
                  </div>
                  <div className="bg-white/70 p-2.5 rounded-xl border border-emerald-200/50">
                    <span className="text-emerald-700 block font-black mb-0.5">2. AMAN BEREKSPERIMEN 🧪</span>
                    Silakan melakukan edit massal, impor data excel baru, atau uji coba ulasan AI dengan ketenangan penuh.
                  </div>
                  <div className="bg-white/70 p-2.5 rounded-xl border border-emerald-200/50">
                    <span className="text-emerald-700 block font-black mb-0.5">3. PULIHKAN SEKETIKA ⏱️</span>
                    Jika terjadi kesalahan entri data, cukup klik tombol "Pulihkan" untuk mengembalikan database seperti semula.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Kiri: Buat Snapshot Baru */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-emerald-800 mb-2">📸 Buat Backup Point (Snapshot)</h4>
                <p className="text-xs text-slate-400 mb-4">Buat salinan data (Siswa, Guru, Kop) saat ini ke dalam memori browser lokal. Amankan konfigurasi sebelum melakukan edit massal.</p>
                
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Label / Nama Snapshot</label>
                    <input
                      type="text"
                      placeholder="Contoh: Sebelum AI generate deskripsi"
                      value={snapshotLabel}
                      onChange={(e) => setSnapshotLabel(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white text-slate-700 transition-all placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    onClick={handleCreateSnapshot}
                    className="w-full bg-emerald-700 hover:bg-emerald-600 font-bold px-4 py-2.5 rounded-xl text-xs text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 animate-pulse"
                  >
                    <Save className="h-4 w-4" /> Ambil Snapshot Data
                  </button>
                </div>
              </div>

              {/* Ekspor Laporan Yayasan */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-indigo-800 mb-2">🏢 Laporan Koordinasi Yayasan</h4>
                <p className="text-xs text-slate-400 mb-4">Saring data siswa berdasarkan wali kelas atau sub-cabang sekolah secara otomatis untuk diekspor ke Excel koordinasi yayasan.</p>
                
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Filter Wali Kelas</label>
                    <select
                      value={yayasanWaliFilter}
                      onChange={(e) => setYayasanWaliFilter(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-700 transition-all cursor-pointer"
                    >
                      <option value="">-- Semua Wali Kelas --</option>
                      {teachers.filter(t => t.role === 'Wali Kelas').map(t => (
                        <option key={t.id} value={t.name}>{t.name} (Kelas {t.classAssigned || '-'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 block mb-1">Sub-Cabang Sekolah</label>
                    <input
                      type="text"
                      placeholder="Masukkan nama cabang pelaporan"
                      value={yayasanCabangFilter}
                      onChange={(e) => setYayasanCabangFilter(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-700 transition-all placeholder:text-slate-400"
                    />
                  </div>

                  <button
                    onClick={handleExportYayasan}
                    className="w-full bg-indigo-700 hover:bg-indigo-600 font-bold px-4 py-2.5 rounded-xl text-xs text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Download className="h-4 w-4" /> Unduh Laporan Yayasan (.xlsx)
                  </button>
                </div>
              </div>
            </div>

            {/* Kanan: Daftar Snapshot yang Tersedia */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col min-h-[300px]">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                📜 Daftar Backup Points lokal ({snapshots.length})
              </h4>
              <p className="text-xs text-slate-400 mb-4">Pulihkan data kapan saja ke kondisi di bawah jika terjadi kesalahan entri data massal.</p>

              {snapshots.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                  <div className="text-slate-300 font-black text-2xl mb-1">Belum Ada Snapshot</div>
                  <p className="text-xs text-slate-400 max-w-xs">Snapshot yang Anda ambil akan muncul di sini untuk dipulihkan secara instan.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                  {snapshots.map((snap) => (
                    <div
                      key={snap.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4 hover:border-emerald-300 hover:bg-slate-50/50 transition-all animate-in fade-in duration-200"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-black text-xs text-slate-800 truncate uppercase">{snap.label}</span>
                          <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded-full font-mono whitespace-nowrap">
                            {snap.timestamp}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold">
                          Kandungan: <span className="text-slate-600">{snap.studentsCount} Siswa</span>, <span className="text-slate-600">{snap.teachersCount} Wali Kelas</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-none">
                        <button
                          onClick={() => handleRestoreSnapshot(snap)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold px-2.5 py-1.5 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                          title="Restore data ke snapshot ini"
                          disabled={isUploadingSnapshot === snap.id}
                        >
                          <RotateCcw className="h-3 w-3" /> Pulihkan
                        </button>
                        <button
                          onClick={() => handleUploadSnapshotToDrive(snap)}
                          className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold px-2.5 py-1.5 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                          title="Upload ZIP ke Google Drive"
                          disabled={isUploadingSnapshot === snap.id}
                        >
                          {isUploadingSnapshot === snap.id ? (
                            <div className="flex items-center gap-1">
                              <span className="h-3 w-3 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></span>
                              Mengunggah...
                            </div>
                          ) : (
                            <><Cloud className="h-3 w-3" /> Drive</>
                          )}
                        </button>
                        <button
                          onClick={() => handleDownloadSnapshotLocally(snap)}
                          className="bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold px-2.5 py-1.5 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
                          title="Unduh backup snapshot ZIP secara lokal"
                          disabled={isUploadingSnapshot === snap.id}
                        >
                          <Download className="h-3 w-3" /> Unduh ZIP
                        </button>
                        <button
                          onClick={() => handleDeleteSnapshot(snap.id)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-200 transition-all cursor-pointer active:scale-95"
                          title="Hapus snapshot ini"
                          disabled={isUploadingSnapshot === snap.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* -------------------- SUBTAB 8: CEK INTEGRITAS DATA -------------------- */}
      {activeSubTab === 'integritas' && (() => {
        const report = runIntegrityCheck(students, teachers, categories, classes);
        return (
          <div className="flex-1 overflow-y-auto p-6 max-h-[500px]">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-6">
              
              {/* Header Tab */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider text-emerald-800 mb-1 flex items-center gap-2">
                    🔍 Cek & Bersihkan Integritas Database Rapor
                  </h4>
                  <p className="text-xs text-slate-400">
                    Sistem mendeteksi, menormalkan, dan menyambungkan kembali hubungan data yang terputus antara tabel Siswa, Wali Kelas, dan indikator penilaian secara otomatis.
                  </p>
                </div>

                <div className="flex-none flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleDownloadMissingDataReport}
                    className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer border border-slate-300"
                  >
                    <Download className="h-4 w-4" /> Unduh PDF Kekurangan Data
                  </button>
                  <button
                    onClick={handleExecuteProactiveRepair}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    ⚡ Jalankan Pembersihan
                  </button>
                </div>
              </div>

              {/* PANDUAN INFOGRAFIS UNTUK GURU */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex flex-col gap-2">
                  <div className="text-emerald-700 text-xs font-bold flex items-center gap-1.5">
                    💡 Cara Kerja Relasi Data
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Setiap murid merujuk ke suatu <strong>Nama Kelas</strong>. Supaya tanda tangan wali kelas muncul otomatis di lembar cetak, nama kelas murid harus cocok persis dengan kelas yang diampu guru Wali Kelas.
                  </p>
                </div>
                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex flex-col gap-2">
                  <div className="text-blue-700 text-xs font-bold flex items-center gap-1.5">
                    ⚙️ Apa yang Diperbaiki?
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Fitur perbaikan otomatis akan <strong>menormalkan ejaan kelas</strong>, menugaskan wali kelas kosong untuk murid tanpa wali, membuat guru wali kelas bayangan (placeholder) jika belum ada, serta membersihkan nilai sampah.
                  </p>
                </div>
                <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 flex flex-col gap-2">
                  <div className="text-purple-700 text-xs font-bold flex items-center gap-1.5">
                    🛡️ Keamanan Snapshot
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Kami merekomendasikan guru membuat <strong>Snapshot Manual</strong> di tab sebelah sebelum melakukan operasi pembersihan massal, sebagai titik restorasi instan jika ada kesalahan pengerjaan.
                  </p>
                </div>
              </div>

              {/* Hasil Eksekusi Perbaikan Terakhir */}
              {repairLogs && (
                <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5 text-emerald-800">
                      🛠️ Hasil Pembersihan Database Terakhir
                    </h5>
                    <button 
                      onClick={() => setRepairLogs(null)} 
                      className="text-[10px] text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                    >
                      Sembunyikan Log
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-[150px] overflow-y-auto bg-white border border-slate-200/80 p-3 rounded-xl font-mono text-[10px] text-slate-600">
                    {repairLogs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                        <span className="text-emerald-500 flex-none">[SUCCESS]</span>
                        <span>{log}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Ringkasan */}
              {report.isValid ? (
                <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex items-start gap-4">
                  <div className="bg-emerald-500 text-white p-2 rounded-xl flex-none">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-emerald-800 text-xs uppercase tracking-wider mb-1">✓ Database 100% Sempurna & Konsisten!</h5>
                    <p className="text-xs text-emerald-600 font-semibold leading-relaxed">
                      Luar biasa! Tidak ditemukan ID referensi terputus, semua murid memiliki Wali Kelas yang sah, dan semua skor penilaian memetakan ke indikator karakter 5NK yang valid di dalam sistem.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex items-start gap-4">
                  <div className="bg-amber-500 text-white p-2 rounded-xl flex-none">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-extrabold text-amber-800 text-xs uppercase tracking-wider mb-1">⚠️ Ditemukan Masalah Konsistensi Data ({report.brokenStudentClasses.length + report.brokenGradeIndicators.length + report.unassignedClasses.length} konflik)</h5>
                    <p className="text-xs text-amber-700 leading-relaxed font-semibold mb-2">
                      Daftar rujukan di bawah ini terputus. Anda bisa memperbaikinya satu per satu atau klik tombol perbaikan otomatis di kanan atas untuk menyelesaikannya dalam 1 detik.
                    </p>
                  </div>
                </div>
              )}

              {/* Detail Konflik */}
              {!report.isValid && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* 1. Siswa tanpa Wali Kelas */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <h6 className="font-bold text-slate-700 text-xs uppercase tracking-wide mb-3 flex items-center gap-1.5 text-slate-800">
                      🧑‍🎓 Kelas Siswa Terputus ({report.brokenStudentClasses.length})
                    </h6>
                    {report.brokenStudentClasses.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Tidak ada masalah kelas siswa.</p>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {report.brokenStudentClasses.map((item, idx) => (
                          <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-xl text-[11px] leading-relaxed">
                            <p className="font-extrabold text-slate-800">{item.studentName}</p>
                            <p className="text-slate-400 font-mono text-[10px]">ID: {item.studentId}</p>
                            <div className="mt-1 flex items-center justify-between">
                              <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded-md">
                                Kelas: {item.class}
                              </span>
                              <span className="text-[9px] text-slate-400 font-semibold italic">Wali Kelas Hilang</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. Indikator Terputus */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <h6 className="font-bold text-slate-700 text-xs uppercase tracking-wide mb-3 flex items-center gap-1.5 text-slate-800">
                      📝 Indikator Nilai Terputus ({report.brokenGradeIndicators.length})
                    </h6>
                    {report.brokenGradeIndicators.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Tidak ada indikator nilai terputus.</p>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {report.brokenGradeIndicators.map((item, idx) => (
                          <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-xl text-[11px] leading-relaxed">
                            <p className="font-extrabold text-slate-800">{item.studentName}</p>
                            <p className="text-slate-400 font-mono text-[10px]">Indikator ID: <strong className="text-rose-600 font-mono">{item.indicatorId}</strong></p>
                            <p className="text-[10px] text-slate-400 leading-snug mt-1 italic">Indikator tidak ada di Kategori 5NK.</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3. Kelas Tanpa Wali Kelas */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <h6 className="font-bold text-slate-700 text-xs uppercase tracking-wide mb-3 flex items-center gap-1.5 text-slate-800">
                      🏢 Kelas Tanpa Wali Kelas ({report.unassignedClasses.length})
                    </h6>
                    {report.unassignedClasses.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">Semua kelas memiliki Wali Kelas.</p>
                    ) : (
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {report.unassignedClasses.map((cls, idx) => (
                          <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-xl text-[11px] flex items-center justify-between">
                            <span className="font-extrabold text-slate-800">Kelas {cls}</span>
                            <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2 py-0.5 rounded-lg">
                              Belum Ditugaskan
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })()}

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
                <span className="text-[10px] text-emerald-600 block flex items-center gap-1">
                   <Check className="h-3 w-3" /> Penyesuaian huruf besar/kecil otomatis
                </span>
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
                <label className="font-bold text-slate-500">
                  Nama Guru Lengkap beserta Gelar {!hasValidAcademicTitle(newGuru.name || '') && <span className="text-amber-600 ml-1 text-[10px]">(Perlu gelar?)</span>}
                </label>
                <input
                  type="text"
                  required
                  value={newGuru.name || ''}
                  onChange={(e) => setNewGuru({ ...newGuru, name: e.target.value })}
                  placeholder="Contoh: Drs. H. Bambang Susilo, M.Pd."
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium"
                />
                {!hasValidAcademicTitle(newGuru.name || '') && (
                  <p className="text-[10px] text-amber-600 bg-amber-50 rounded p-1">
                    ⚠️ Nama mungkin kurang gelar akademik (Contoh: S.Pd, M.Pd, Dr.)
                  </p>
                )}
                <span className="text-[10px] text-emerald-600 block flex items-center gap-1">
                   <Check className="h-3 w-3" /> Gelar (S.Pd., M.Pd. dsb) disesuaikan otomatis
                </span>
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

              <div className="flex flex-col gap-1 border-t border-slate-100 pt-3">
                <label className="font-bold text-slate-500">Tanda Tangan Digital (Opsional)</label>
                <div className="flex items-center gap-3">
                  {newGuru.signatureUrl ? (
                    <div className="relative">
                      <img src={newGuru.signatureUrl} alt="Tanda Tangan Guru" className="w-16 h-12 object-contain bg-slate-50 rounded border border-slate-200" />
                      <button
                        type="button"
                        onClick={() => setNewGuru({ ...newGuru, signatureUrl: undefined })}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full h-4 w-4 flex items-center justify-center shadow-md font-bold text-[10px]"
                        title="Hapus"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-12 bg-slate-100 border border-dashed border-slate-300 rounded flex items-center justify-center text-slate-400 font-mono text-[8px] text-center">KOSONG</div>
                  )}
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setNewGuru({ ...newGuru, signatureUrl: ev.target?.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="text-[10px] w-full"
                  />
                </div>
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
                  : 'Tambah Indikator Baru'}
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

              {/* ID Indikator Input */}
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-slate-500">
                  {categories.flatMap(c => c.indicators).some(i => i.id === editingIndicator.ind.id)
                    ? 'ID Indikator (Tidak Dapat Diubah)'
                    : 'ID Indikator (Harus Unik)'}
                </label>
                <input
                  type="text"
                  required
                  disabled={categories.flatMap(c => c.indicators).some(i => i.id === editingIndicator.ind.id)}
                  value={newIndId}
                  onChange={(e) => setNewIndId(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                  placeholder="Contoh: CTA4"
                  className={`border border-slate-200 rounded-lg p-2.5 font-mono text-xs uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                    categories.flatMap(c => c.indicators).some(i => i.id === editingIndicator.ind.id)
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-slate-50 text-slate-800'
                  }`}
                />
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

      {/* ----------------- POPUP MODAL CSV MAPPING ----------------- */}
      {isCsvMappingOpen && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-300 shadow-2xl p-6 max-w-md w-full flex flex-col gap-4 animate-in slide-in-from-bottom duration-200">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <span className="text-lg">📋</span> Pemetaan Kolom File CSV Siswa
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                File: {csvFileName} ({csvRows.length} baris data terdeteksi)
              </p>
            </div>

            <div className="text-[11px] text-slate-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5 leading-relaxed font-sans">
              <strong className="text-amber-800">Petunjuk Pemetaan:</strong> Cocokkan kolom dari file CSV Anda dengan atribut data siswa. Siswa dengan NIS kosong akan tetap diimpor dengan diisi NIS otomatis oleh sistem.
            </div>

            <div className="flex flex-col gap-3 text-xs font-sans">
              
              {/* Nama mapping */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-600 flex justify-between">
                  <span>Nama Siswa <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Wajib diisi</span>
                </label>
                <select
                  value={csvColumnMapping.nameIdx}
                  onChange={(e) => setCsvColumnMapping({ ...csvColumnMapping, nameIdx: Number(e.target.value) })}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={-1}>-- Pilih Kolom Nama --</option>
                  {csvHeaders.map((h, i) => (
                    <option key={i} value={i}>Kolom {i+1}: {h}</option>
                  ))}
                </select>
              </div>

              {/* NIS mapping */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-600">Nomor Induk Siswa (NIS)</label>
                <select
                  value={csvColumnMapping.nisIdx}
                  onChange={(e) => setCsvColumnMapping({ ...csvColumnMapping, nisIdx: Number(e.target.value) })}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={-1}>-- Pilih Kolom NIS (Bisa Kosong) --</option>
                  {csvHeaders.map((h, i) => (
                    <option key={i} value={i}>Kolom {i+1}: {h}</option>
                  ))}
                </select>
              </div>

              {/* Kelas mapping */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-600">Kelas</label>
                <select
                  value={csvColumnMapping.classIdx}
                  onChange={(e) => setCsvColumnMapping({ ...csvColumnMapping, classIdx: Number(e.target.value) })}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={-1}>-- Gunakan {selectedClass} (Default) --</option>
                  {csvHeaders.map((h, i) => (
                    <option key={i} value={i}>Kolom {i+1}: {h}</option>
                  ))}
                </select>
              </div>

              {/* Gender mapping */}
              <div className="flex flex-col gap-1">
                <label className="font-bold text-slate-600">Jenis Kelamin / Gender</label>
                <select
                  value={csvColumnMapping.genderIdx}
                  onChange={(e) => setCsvColumnMapping({ ...csvColumnMapping, genderIdx: Number(e.target.value) })}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium focus:ring-1 focus:ring-emerald-500"
                >
                  <option value={-1}>-- Default Laki-Laki (L) --</option>
                  {csvHeaders.map((h, i) => (
                    <option key={i} value={i}>Kolom {i+1}: {h}</option>
                  ))}
                </select>
              </div>

            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsCsvMappingOpen(false);
                  if (csvFileInputRef.current) csvFileInputRef.current.value = '';
                }}
                className="py-1.5 px-3 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={handleConfirmImportCsv}
                className="py-1.5 px-4 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer flex items-center gap-1"
              >
                <Check className="h-4 w-4" /> Mulai Impor Siswa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- CONFIRM DELETE MODAL ----------------- */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="p-2 bg-rose-100 rounded-full">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">Konfirmasi Hapus</h3>
            </div>
            
            <p className="text-sm text-slate-600 mb-6">
              Apakah Anda yakin ingin menghapus {deleteConfirm.type} <span className="font-semibold">"{deleteConfirm.name}"</span>? 
              {deleteConfirm.type === 'indikator' && (
                <span className="block mt-2 font-semibold text-rose-600">
                  WASPADA: Menghapus indikator akan menghapus kaitan nilai indikator ini di seluruh rapor siswa!
                </span>
              )}
              <span className="block mt-2">Tindakan ini tidak dapat dibatalkan.</span>
            </p>
            
            <div className="flex justify-end gap-2 mt-auto">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="py-2 px-4 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="py-2 px-4 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 cursor-pointer flex items-center gap-1 transition-colors"
              >
                Ya, Hapus {deleteConfirm.type}
              </button>
            </div>
          </div>
        </div>
      )}

    </motion.div>
  );
}
