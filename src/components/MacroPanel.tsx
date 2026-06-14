import { useState } from 'react';
import { Student, Category, ScoreKey, scoreOptions } from '../types';
import { Sparkles, CheckSquare, RefreshCw, BarChart4, Cpu, Play, Check, AlertTriangle, HelpCircle } from 'lucide-react';

interface MacroPanelProps {
  selectedStudent: Student | null;
  students: Student[];
  categories: Category[];
  selectedClass: string;
  onUpdateFullClassScores: (score: ScoreKey) => void;
  onUpdateStudentGrades: (studentId: string, grades: Record<string, ScoreKey>) => void;
  onUpdateComments: (studentId: string, kesimpulan: string, Notes: string) => void;
  onRefreshData: () => void;
  waliKelasName: string;
}

export default function MacroPanel({
  selectedStudent,
  students,
  categories,
  selectedClass,
  onUpdateFullClassScores,
  onUpdateStudentGrades,
  onUpdateComments,
  onRefreshData,
  waliKelasName,
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
    <div id="macro-panel" className="flex flex-col gap-5 no-print bg-white p-5 rounded-xl border border-slate-200 shadow-sm h-full overflow-y-auto">
      <div>
        <h3 className="text-xs font-bold text-slate-400 font-mono tracking-wider uppercase mb-1">
          Excel VBA Macro Controller
        </h3>
        <h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-emerald-600 animate-pulse" /> Panel Otomasi Cerdas
        </h4>
        <p className="text-xs text-slate-500 mt-1">Esekusi fungsi otomatis (Macro VBA) untuk mempermudah dan mempercepat penyusunan rapor.</p>
      </div>

      {/* MACRO 1: AI SUGGESTION FOR SELECTED STUDENT */}
      <div className="border border-indigo-100 bg-indigo-50/40 p-4 rounded-xl flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></span>
              <h5 className="text-xs font-bold text-indigo-900 uppercase tracking-wide">Macro 1: Gemini AI Commenter</h5>
            </div>
            <p className="text-xs text-indigo-700/80 mt-1 dark:text-indigo-800">
              Analisis nilai 5NK secara menyeluruh dan buat kesimpulan rapor otomatis menggunakan AI.
            </p>
          </div>
          <Sparkles className="h-5 w-5 text-indigo-500 flex-none" />
        </div>

        {selectedStudent ? (
          <div className="bg-white border border-indigo-100 rounded-lg p-2.5 mt-1 text-xs">
            <p className="text-slate-400 font-bold mb-1 font-mono text-[9px]">Siswa Terpilih:</p>
            <p className="font-bold text-slate-800 truncate">{selectedStudent.name}</p>
            
            <button
              onClick={runAiCommentGenerator}
              disabled={runningMacro !== null}
              className={`mt-2 w-full py-2 px-3 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition-all ${
                runningMacro === 'AI_GENERATOR' 
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-100 ring-2 ring-indigo-500/50'
              }`}
            >
              <Play className="h-3 w-3 fill-white" />
              {runningMacro === 'AI_GENERATOR' ? 'Menjalankan Macro AI...' : 'Jalankan Macro AI'}
            </button>
            {aiError && (
              <p className="text-[10px] text-amber-600 mt-1 leading-normal italic flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 flex-none mt-0.5" />
                {aiError}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-4 bg-slate-100 rounded-lg text-xs text-slate-400 italic">
            Silakan pilih murid terlebih dahulu di grid Excel
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
    </div>
  );
}
