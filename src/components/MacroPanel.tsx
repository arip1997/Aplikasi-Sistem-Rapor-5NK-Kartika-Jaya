import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Student, Category, ScoreKey, scoreOptions } from '../types';
import { Sparkles, CheckSquare, RefreshCw, BarChart4, Cpu, Play, Check, AlertTriangle, HelpCircle, Users, StopCircle, Loader2, Trash2, RotateCcw, Printer } from 'lucide-react';

interface MacroPanelProps {
  selectedStudent: Student | null;
  students: Student[];
  categories: Category[];
  selectedClass: string;
  onUpdateFullClassScores: (score: ScoreKey) => void;
  onUpdateStudentGrades: (studentId: string, grades: Record<string, ScoreKey>) => void;
  onUpdateComments: (studentId: string, kesimpulan: string, Notes: string) => void;
  onUpdateBulkComments: (updates: { studentId: string; kesimpulan: string; catatanWali: string }[]) => void;
  onRefreshData: () => void;
  waliKelasName: string;
  onClearStudentGrades: (studentId: string) => void;
  onClearClassGrades: () => void;
  onResetPrintStatus: () => void;
}

export default function MacroPanel({
  selectedStudent,
  students,
  categories,
  selectedClass,
  onUpdateFullClassScores,
  onUpdateStudentGrades,
  onUpdateComments,
  onUpdateBulkComments,
  onRefreshData,
  waliKelasName,
  onClearStudentGrades,
  onClearClassGrades,
  onResetPrintStatus,
}: MacroPanelProps) {
  const [runningMacro, setRunningMacro] = useState<string | null>(null);
  const [integrityReport, setIntegrityReport] = useState<{
    scanned: number;
    incomplete: number;
    completed: number;
    emptyCells: number;
    details: string[];
  } | null>(null);

  const [bulkGrade, setBulkGrade] = useState<ScoreKey>('B');
  const [aiError, setAiError] = useState<string | null>(null);
  const [showClearClassConfirm, setShowClearClassConfirm] = useState(false);
  const [showClearStudentConfirm, setShowClearStudentConfirm] = useState(false);

  const [bulkAiState, setBulkAiState] = useState<{
    running: boolean;
    current: number;
    total: number;
    studentName: string;
    logs: string[];
    errors: number;
  } | null>(null);
  const bulkAbortRef = useRef<boolean>(false);

  // Macro 1b: Run Bulk/Class AI Comment Generator
  const runBulkClassAiGenerator = async () => {
    if (students.length === 0) return;
    setRunningMacro('BULK_AI_GENERATOR');
    bulkAbortRef.current = false;
    
    const total = students.length;
    const logs: string[] = ['Menghubungi asisten AI untuk memproses kelas ' + selectedClass + '...'];
    const updatesList: { studentId: string; kesimpulan: string; catatanWali: string }[] = [];
    
    setBulkAiState({
      running: true,
      current: 0,
      total,
      studentName: students[0].name,
      logs: [...logs],
      errors: 0,
    });

    let errorsCount = 0;
    
    for (let i = 0; i < total; i++) {
      if (bulkAbortRef.current) {
        logs.push('⚠️ Aksi dibatalkan oleh Pengguna.');
        setBulkAiState(prev => prev ? { ...prev, logs: [...logs] } : null);
        break;
      }
      
      const st = students[i];
      setBulkAiState(prev => prev ? { ...prev, current: i + 1, studentName: st.name } : null);
      logs.push(`⏳ Menganalisis skor & karakter [${i + 1}/${total}]: ${st.name}...`);
      setBulkAiState(prev => prev ? { ...prev, logs: [...logs] } : null);
      
      try {
        const response = await fetch('/api/generate-comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName: st.name,
            gender: st.gender,
            grades: st.grades,
            className: selectedClass,
            waliKelasName: waliKelasName,
          }),
        });

        if (!response.ok) throw new Error('Response error');
        const data = await response.json();
        
        updatesList.push({
          studentId: st.id,
          kesimpulan: data.kesimpulan,
          catatanWali: data.catatanWali,
        });
        
        // Push current set of updates atomically
        onUpdateBulkComments([...updatesList]);
        
        logs.push(`✅ Generasi sukses instan untuk ${st.name}`);
        setBulkAiState(prev => prev ? { ...prev, logs: [...logs] } : null);
        
        // Ensure student has full grade updates triggered
        onUpdateStudentGrades(st.id, { ...st.grades });
      } catch (err) {
        console.error(err);
        errorsCount++;
        
        // Fallback local rule-based generation
        const bsbCount = Object.values(st.grades).filter(s => s === 'BSB').length;
        let kesimpulan = '';
        let catatanWali = '';

        if (bsbCount > 10) {
          kesimpulan = `${st.name} menunjukkan kepribadian luar biasa sebagai murid Kartika yang sangat cemerlang. Seluruh indikator nilai 5NK berkembang secara konsisten di atas rata-rata kelompok belajarnya.`;
          catatanWali = `Sangat bangga atas dedikasi dan kepemimpinan yang ditunjukkan oleh ${st.name}. Teruslah menginspirasi teman-teman sekelas!`;
        } else {
          kesimpulan = `${st.name} berkembang dengan stabil dan harmonis di seluruh aspek 5NK (Cinta Tanah Air, Disiplin, Berbudi Luhur, Cerdas, Terampil). Selalu menunjukkan sikap kerja sama dan akhlak mulia.`;
          catatanWali = `Tingkatkan kedisiplinan belajar dan pertahankan semangat juangmu, bapak/ibu wali kelas selalu mendukung kesuksesanmu!`;
        }
        
        updatesList.push({
          studentId: st.id,
          kesimpulan,
          catatanWali,
        });
        
        onUpdateBulkComments([...updatesList]);
        
        logs.push(`ℹ️ Selesai: ${st.name} (Aturan Lokal Cadangan)`);
        setBulkAiState(prev => prev ? { ...prev, logs: [...logs], errors: errorsCount } : null);
        
        onUpdateStudentGrades(st.id, { ...st.grades });
      }
      
      // Delay to let user see progress nicely
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!bulkAbortRef.current) {
      logs.push(`🎉 Laporan rampung! Berhasil menghasilkan saran personal pengembangan karakter untuk seluruh murid.`);
      setBulkAiState(prev => prev ? { ...prev, logs: [...logs] } : null);
    }
    
    setTimeout(() => {
      setBulkAiState(null);
      setRunningMacro(null);
    }, 2000);
  };

  // Macro 1: Run Gemini AI Comment Generator
  const runAiCommentGenerator = async () => {
    if (!selectedStudent) return;
    setRunningMacro('AI_GENERATOR');
    setAiError(null);
    
    try {
      const response = await fetch('/api/generate-comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: selectedStudent.name,
          gender: selectedStudent.gender,
          grades: selectedStudent.grades,
          className: selectedClass,
          waliKelasName: waliKelasName,
        }),
      });

      if (!response.ok) throw new Error('gagal memanggil asisten AI');
      const data = await response.json();
      
      onUpdateComments(selectedStudent.id, data.kesimpulan, data.catatanWali);
      
      // Auto complete the student
      const updatedGrades = { ...selectedStudent.grades };
      onUpdateStudentGrades(selectedStudent.id, updatedGrades);
    } catch (err: any) {
      console.error(err);
      setAiError('Koneksi terputus atau API Key belum diset. Menggunakan generator aturan cadangan lokal.');
      
      // Fallback local rule-based generation
      const p = selectedStudent.gender === 'L' ? 'ia' : 'ia';
      const bsbCount = Object.values(selectedStudent.grades).filter(s => s === 'BSB').length;
      
      let kesimpulan = '';
      let catatanWali = '';

      if (bsbCount > 10) {
        kesimpulan = `${selectedStudent.name} menunjukkan kepribadian luar biasa sebagai murid Kartika yang sangat cemerlang. Seluruh indikator nilai 5NK berkembang secara konsisten di atas rata-rata kelompok belajarnya.`;
        catatanWali = `Sangat bangga atas dedikasi dan kepemimpinan yang ditunjukkan oleh ${selectedStudent.name}. Teruslah menginspirasi teman-teman sekelas!`;
      } else {
        kesimpulan = `${selectedStudent.name} berkembang dengan stabil dan harmonis di seluruh aspek 5NK (Cinta Tanah Air, Disiplin, Berbudi Luhur, Cerdas, Terampil). Selalu menunjukkan sikap kerja sama dan akhlak mulia.`;
        catatanWali = `Tingkatkan kedisiplinan belajar dan pertahankan semangat juangmu, bapak/ibu wali kelas selalu mendukung kesuksesanmu!`;
      }

      onUpdateComments(selectedStudent.id, kesimpulan, catatanWali);
    } finally {
      setTimeout(() => {
        setRunningMacro(null);
      }, 1000);
    }
  };

  // Macro 2: Run Sheet Integrity Audit
  const runIntegrityAudit = () => {
    setRunningMacro('INTEGRITY_AUDIT');
    setIntegrityReport(null);

    setTimeout(() => {
      let incomplete = 0;
      let completed = 0;
      let emptyCells = 0;
      const details: string[] = [];

      students.forEach(stud => {
        const totalIndicatorCount = categories.flatMap(c => c.indicators).length;
        const scoredCount = Object.keys(stud.grades).length;
        const missing = totalIndicatorCount - scoredCount;

        if (missing > 0) {
          incomplete++;
          emptyCells += missing;
          details.push(`${stud.name} (NIS: ${stud.nis}) - Kurang ${missing} indikator`);
        } else {
          completed++;
        }
      });

      setIntegrityReport({
        scanned: students.length,
        incomplete,
        completed,
        emptyCells,
        details,
      });
      setRunningMacro(null);
    }, 800);
  };

  // Macro 3: Run Bulk Grading
  const runBulkGradeMacro = () => {
    setRunningMacro('BULK_GRADE');
    setTimeout(() => {
      onUpdateFullClassScores(bulkGrade);
      setRunningMacro(null);
      // Auto run integrity check to clear report
      setIntegrityReport(null);
    }, 700);
  };

  // Calculate statistics for the active class selection
  const totalIndicators = categories.flatMap(c => c.indicators).length;
  const totalCells = students.length * totalIndicators;
  
  let totalBSB = 0, totalB = 0, totalMB = 0, totalBB = 0;
  students.forEach(st => {
    Object.values(st.grades).forEach(gr => {
      if (gr === 'BSB') totalBSB++;
      else if (gr === 'B') totalB++;
      else if (gr === 'MB') totalMB++;
      else if (gr === 'BB') totalBB++;
    });
  });

  const percentBSB = totalCells > 0 ? Math.round((totalBSB / totalCells) * 100) : 0;
  const percentB = totalCells > 0 ? Math.round((totalB / totalCells) * 100) : 0;
  const percentMB = totalCells > 0 ? Math.round((totalMB / totalCells) * 100) : 0;
  const percentBB = totalCells > 0 ? Math.round((totalBB / totalCells) * 100) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      id="macro-panel" 
      className="flex flex-col gap-5 no-print bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full overflow-y-auto"
    >
      {/* Ringkasan Data Kosong */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex flex-col gap-2">
        <h6 className="font-bold text-slate-700 flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Status Data Kelas
        </h6>
        <p className="text-slate-600">
          Jumlah siswa dengan data belum lengkap: <strong className="text-rose-600">{students.filter(s => Object.keys(s.grades).length < categories.flatMap(c => c.indicators).length).length}</strong>
        </p>
      </div>

      {/* MACRO 1: AI SUGGESTION & AUTOMATED GENERAL REPORT */}
      <div className="border border-indigo-100 bg-indigo-50/40 p-4 rounded-xl flex flex-col gap-3 animate-in fade-in duration-200">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span>
              <h5 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Macro 1: Gemini AI Commenter</h5>
            </div>
            <p className="text-xs text-indigo-700/80 mt-1 dark:text-indigo-800">
              Analisis tren nilai 5NK & buat deskripsi saran pengembangan karakter personal otomatis instan.
            </p>
          </div>
          <Sparkles className="h-5 w-5 text-indigo-500 flex-none animate-pulse" />
        </div>

        {bulkAiState && bulkAiState.running ? (
          /* Bulk AI Progress Monitor */
          <div className="bg-white border border-indigo-150 rounded-xl p-3 text-xs flex flex-col gap-3 shadow-sm animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between font-bold text-indigo-900">
              <span className="flex items-center gap-1.5 font-sans">
                <Loader2 className="h-3.5 w-3.5 text-indigo-600 animate-spin" />
                Saran Karakter Otomatis
              </span>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 font-mono px-2 py-0.5 rounded-full">
                {bulkAiState.current} / {bulkAiState.total} Murid
              </span>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500 font-medium">
                <span className="truncate max-w-[170px] inline-block">Mengolah: <strong className="text-slate-700">{bulkAiState.studentName}</strong></span>
                <span>{Math.round((bulkAiState.current / bulkAiState.total) * 100)}%</span>
              </div>
              <div className="h-2 w-full bg-indigo-105 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${(bulkAiState.current / bulkAiState.total) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Scrollable logs */}
            <div className="bg-slate-900 text-[10px] font-mono text-slate-300 p-2 rounded-lg max-h-24 overflow-y-auto flex flex-col gap-1 select-none">
              {bulkAiState.logs.map((log, lIdx) => (
                <div key={lIdx} className="leading-snug">{log}</div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  bulkAbortRef.current = true;
                }}
                className="py-1 px-2.5 text-[10px] text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-md font-semibold cursor-pointer transition-colors flex items-center gap-1"
              >
                <StopCircle className="h-3 w-3" /> Batalkan Proses
              </button>
            </div>
          </div>
        ) : (
          /* Normal Controls */
          <div className="flex flex-col gap-2.5">
        {/* Action 1: Selected Student AI */}
            <div className="bg-white border border-indigo-100 rounded-lg p-2.5 text-xs">
              <p className="text-slate-400 font-bold mb-1 font-mono text-[9px] uppercase">Pilihan 1: Murid Terpilih</p>
              {selectedStudent ? (
                <div>
                  <p className="font-bold text-slate-800 truncate">{selectedStudent.name}</p>
                  <button
                    onClick={runAiCommentGenerator}
                    disabled={runningMacro !== null}
                    className={`mt-2 w-full py-2 px-3 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      runningMacro === 'AI_GENERATOR' 
                        ? 'bg-indigo-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-100'
                    }`}
                  >
                    <Play className="h-3 w-3 fill-white animate-pulse" />
                    {runningMacro === 'AI_GENERATOR' ? 'Menjalankan...' : 'Jalankan AI Murid Aktif'}
                  </button>
                  <button
                    onClick={() => {
                        const incomplete = students.filter(s => Object.keys(s.grades).length < categories.flatMap(c => c.indicators).length);
                        console.log("Audit Penilaian: Siswa dengan data tidak lengkap", incomplete);
                        // Add highlighting logic here if UI supports it, for now logging
                        alert(`Audit Selesai: Terdapat ${incomplete.length} siswa dengan nilai tidak lengkap.`);
                    }}
                    className="mt-2 w-full py-2 px-3 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <AlertTriangle className="h-3 w-3" /> Audit Penilaian
                  </button>
                </div>
              ) : (
                <p className="text-slate-400 italic font-medium py-1">Pilih siswa di tabel untuk opsi ini.</p>
              )}
            </div>

            {/* Action 2: Bulk Class AI Generator */}
            <div className="bg-white border border-indigo-100 rounded-lg p-2.5 text-xs">
              <p className="text-slate-400 font-bold mb-1 font-mono text-[9px] uppercase font-bold">Pilihan 2: Otomatisasi Kelas</p>
              <p className="text-[11px] text-slate-600 font-sans leading-normal">
                Analisis tren nilai & simpan komentar personal untuk semua <strong>{students.length} murid</strong> kelas <strong>{selectedClass}</strong> secara otomatis.
              </p>
              <button
                onClick={runBulkClassAiGenerator}
                disabled={runningMacro !== null || students.length === 0}
                className={`mt-2.5 w-full py-2.5 px-3 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  runningMacro === 'BULK_AI_GENERATOR' 
                    ? 'bg-indigo-400 cursor-not-allowed'
                    : 'bg-indigo-800 hover:bg-slate-900 hover:shadow-indigo-100 shadow-sm'
                }`}
              >
                <Users className="h-3.5 w-3.5 animate-pulse" />
                Generate Laporan Otomatis (1 Kelas)
              </button>
            </div>

            {aiError && (
              <p className="text-[10px] text-amber-600 mt-0.5 leading-normal italic flex items-start gap-1 bg-amber-50 p-1.5 rounded border border-amber-100 font-medium font-sans">
                <AlertTriangle className="h-3 w-3 flex-none mt-0.5" />
                {aiError}
              </p>
            )}
          </div>
        )}
      </div>

      {/* MACRO 2: BULK GRADE FILL */}
      <div className="border border-emerald-100 bg-emerald-50/30 p-4 rounded-xl flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h5 className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Macro 2: Bulk Fill Roster</h5>
            <p className="text-xs text-emerald-700/80 mt-1">
              Isi semua nilai murid dalam kelas {selectedClass} secara instan dengan satu standar penilaian.
            </p>
          </div>
          <CheckSquare className="h-5 w-5 text-emerald-500 flex-none" />
        </div>

        <div className="bg-white border border-emerald-100 rounded-lg p-3 mt-1 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium font-sans">Pilih Standar Nilai:</span>
            <select
              title="Isi Nilai Roster"
              value={bulkGrade}
              onChange={(e) => setBulkGrade(e.target.value as ScoreKey)}
              className="border border-slate-200 bg-slate-50 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {scoreOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.key} - {opt.label.split(' ')[0]}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={runBulkGradeMacro}
            disabled={runningMacro !== null}
            className={`w-full py-2 px-3 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition-all ${
              runningMacro === 'BULK_GRADE'
                ? 'bg-emerald-400'
                : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-100 ring-2 ring-emerald-500/50'
            }`}
          >
            <RefreshCw className={`h-3 w-3 ${runningMacro === 'BULK_GRADE' ? 'animate-spin' : ''}`} />
            {runningMacro === 'BULK_GRADE' ? 'Mengisi Data...' : 'Isi Semua Nilai Roster'}
          </button>
        </div>
      </div>

      {/* MACRO 5: BATAL ASPEK PENILAIAN */}
      <div className="border border-rose-100 bg-rose-50/20 p-4 rounded-xl flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h5 className="text-xs font-bold text-rose-900 uppercase tracking-wide">Macro 5: Batal Aspek Penilaian</h5>
            <p className="text-xs text-rose-700/80 mt-1">
              Kosongkan predikat penilaian yang sudah terisi untuk pemformatan ulang data.
            </p>
          </div>
          <RotateCcw className="h-5 w-5 text-rose-500 flex-none" />
        </div>

        <div className="flex flex-col gap-2.5">
          {/* Action 1: Single student clear */}
          <div className="bg-white border border-rose-100 rounded-lg p-3 text-xs">
            <p className="text-slate-400 font-bold mb-1.5 font-mono text-[9px] uppercase">Pilihan 1: Murid Terpilih</p>
            {selectedStudent ? (
              <div>
                <p className="font-semibold text-slate-700 truncate mb-2">
                  Murid: <strong className="text-slate-800">{selectedStudent.name}</strong>
                </p>
                
                {showClearStudentConfirm ? (
                  <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-100 text-center animate-in zoom-in-95 duration-150">
                    <p className="text-[11px] text-rose-800 font-medium mb-2 leading-relaxed">
                      Yakin kosongkan semua nilai rapor {selectedStudent.name}?
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => {
                          onClearStudentGrades(selectedStudent.id);
                          setShowClearStudentConfirm(false);
                          setIntegrityReport(null);
                        }}
                        className="py-1 px-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                      >
                        Ya, Kosongkan
                      </button>
                      <button
                        onClick={() => setShowClearStudentConfirm(false)}
                        className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-semibold cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowClearStudentConfirm(true);
                      setShowClearClassConfirm(false);
                    }}
                    className="w-full py-2 px-3 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 hover:border-rose-300 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs animate-in duration-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Batal Nilai Murid Ini
                  </button>
                )}
              </div>
            ) : (
              <p className="text-slate-400 italic py-1">Pilih siswa di tabel untuk opsi ini.</p>
            )}
          </div>

          {/* Action 2: Mass class clear */}
          <div className="bg-white border border-rose-100 rounded-lg p-3 text-xs">
            <p className="text-slate-400 font-bold mb-1.5 font-mono text-[9px] uppercase">Pilihan 2: Otomatisasi Kelas (Masal)</p>
            <p className="text-[11px] text-slate-600 mb-2 leading-relaxed">
              Kosongkan seluruh nilai roster 5NK untuk <strong>{students.length} murid</strong> kelas <strong>{selectedClass}</strong> secara massal.
            </p>

            {showClearClassConfirm ? (
              <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-100 text-center animate-in zoom-in-95 duration-150">
                <p className="text-[11px] text-rose-800 font-bold mb-2 leading-relaxed">
                  ⚠️ PERINGATAN: Seluruh nilai murid kelas {selectedClass} akan dihapus permanen! Anda yakin?
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      onClearClassGrades();
                      setShowClearClassConfirm(false);
                      setIntegrityReport(null);
                    }}
                    className="py-1 px-3 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                  >
                    Ya, Kosongkan Semua
                  </button>
                  <button
                    onClick={() => setShowClearClassConfirm(false)}
                    className="py-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowClearClassConfirm(true);
                  setShowClearStudentConfirm(false);
                }}
                disabled={students.length === 0}
                className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Batal Nilai Masal Kelas ({selectedClass})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MACRO 3: INTEGRITY VERIFICATION */}
      <div className="border border-slate-100 p-4 rounded-xl flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Macro 3: Integrity Auditor</h5>
            <p className="text-xs text-slate-500 mt-1">
              Cek kelengkapan nilai siswa seketika untuk mendeteksi data rumpang atau terlewat.
            </p>
          </div>
          <AlertTriangle className="h-5 w-5 text-slate-400 flex-none" />
        </div>

        <button
          onClick={runIntegrityAudit}
          disabled={runningMacro !== null}
          className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition-all flex items-center justify-center gap-2"
        >
          {runningMacro === 'INTEGRITY_AUDIT' ? 'Memindai Rapor...' : 'Pindai Kelengkapan Data'}
        </button>

        {/* Audit Log Output */}
        {integrityReport && (
          <div className="bg-slate-50 rounded-lg p-3 text-xs flex flex-col gap-2 border border-slate-200">
            <h6 className="font-bold text-slate-700 flex items-center gap-1">
              Hasil Pindaian:
            </h6>
            <div className="my-1 border-y border-slate-100 py-1.5 grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-500">
              <p>Total Murid: <span className="text-slate-800 font-bold">{integrityReport.scanned}</span></p>
              <p>Belum Lengkap: <span className={`${integrityReport.incomplete > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600'}`}>{integrityReport.incomplete}</span></p>
              <p>Rincian Sel Kosong: <span className="text-slate-800 font-bold">{integrityReport.emptyCells}</span></p>
              <p>Progress: <span className="text-emerald-600 font-bold">{integrityReport.completed}/{integrityReport.scanned} Lunas</span></p>
            </div>
            {integrityReport.details.length > 0 ? (
              <div className="max-h-24 overflow-y-auto flex flex-col gap-1 pr-1 font-mono text-[9px] text-rose-500 bg-red-50/50 p-1.5 rounded border border-red-100">
                {integrityReport.details.map((det, i) => (
                  <p key={i}>● {det}</p>
                ))}
              </div>
            ) : (
              <p className="text-green-600 text-[11px] font-semibold flex items-center gap-1.5 bg-green-50 p-1.5 rounded border border-green-100">
                <Check className="h-3.5 w-3.5" /> 100% Sempurna! Data siap untuk dicetak dan diexport.
              </p>
            )}
          </div>
        )}
      </div>

      {/* MACRO 4: DISTRIBUTION MATRIX */}
      <div className="border border-slate-100 p-4 rounded-xl flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Analisis Persebaran Nilai</h5>
            <p className="text-xs text-slate-500 mt-1">Persentase distribusi penilaian indikator kelas {selectedClass}</p>
          </div>
          <BarChart4 className="h-5 w-5 text-slate-400 flex-none" />
        </div>

        <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-lg text-xs leading-normal font-sans border border-slate-200">
          {/* BSB */}
          <div>
            <div className="flex justify-between font-medium text-slate-600">
              <span>Berkembang Sangat Baik (BSB)</span>
              <span className="font-bold text-emerald-600">{percentBSB}%</span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${percentBSB}%` }}></div>
            </div>
          </div>

          {/* B */}
          <div>
            <div className="flex justify-between font-medium text-slate-600">
              <span>Berkembang (B)</span>
              <span className="font-bold text-blue-600">{percentB}%</span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${percentB}%` }}></div>
            </div>
          </div>

          {/* MB */}
          <div>
            <div className="flex justify-between font-medium text-slate-600">
              <span>Mulai Berkembang (MB)</span>
              <span className="font-bold text-amber-600">{percentMB}%</span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${percentMB}%` }}></div>
            </div>
          </div>

          {/* BB */}
          <div>
            <div className="flex justify-between font-medium text-slate-600">
              <span>Belum Berkembang (BB)</span>
              <span className="font-bold text-rose-600">{percentBB}%</span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-rose-500" style={{ width: `${percentBB}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
