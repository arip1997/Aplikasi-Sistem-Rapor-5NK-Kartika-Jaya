import { useState, useMemo, useEffect } from 'react';
import { Student, Category, ScoreKey, scoreOptions } from '../types';
import { 
  Sparkles, 
  CheckCircle, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  FileText, 
  Trash2,
  Lock,
  UserCheck,
  Search,
  X,
  RotateCcw
} from 'lucide-react';

interface EvaluationFormProps {
  students: Student[];
  categories: Category[];
  selectedStudentId: string;
  onSelectStudentId: (id: string) => void;
  onUpdateStudent: (student: Student) => void;
  onViewReport: () => void;
  onClearStudentGrades: (studentId: string) => void;
  onClearClassGrades: () => void;
  selectedClass?: string;
  isGeneratingHiddenPdf?: boolean;
  onExportPdfPerSiswa?: (studentId: string) => void;
  triggerAlert?: (type: 'success' | 'info' | 'error', message: string) => void;
}

export default function EvaluationForm({
  students,
  categories,
  selectedStudentId,
  onSelectStudentId,
  onUpdateStudent,
  onViewReport,
  onClearStudentGrades,
  onClearClassGrades,
  selectedClass = '',
  isGeneratingHiddenPdf = false,
  onExportPdfPerSiswa,
  triggerAlert
}: EvaluationFormProps) {
  
  // Override native alert to use the beautiful global alert system if available
  const alert = (message: string) => {
    if (triggerAlert) {
      // Determine type based on message content
      const msg = message.toLowerCase();
      let type: 'success' | 'info' | 'error' = 'info';
      if (msg.includes('berhasil') || msg.includes('sukses')) type = 'success';
      if (msg.includes('gagal') || msg.includes('error') || msg.includes('salah')) type = 'error';
      triggerAlert(type, message);
    } else {
      window.alert(message);
    }
  };

  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [studentSearch, setStudentSearch] = useState('');
  const [showResetStudentConfirm, setShowResetStudentConfirm] = useState(false);
  const [showResetClassConfirm, setShowResetClassConfirm] = useState(false);

  // Focus Tracker for active Indicator card keyboard operations
  const [focusedIndicatorId, setFocusedIndicatorId] = useState<string | null>(null);

  // State and persistence for teacher note templates
  const [customTemplates, setCustomTemplates] = useState<{ kesimpulan: string[]; catatanWali: string[] }>(() => {
    try {
      const saved = localStorage.getItem('rapor_5nk_custom_templates');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return {
      kesimpulan: [
        "Ananda menunjukkan keteladanan luar biasa dalam sikap nasionalisme, kemandirian, dan kedisiplinan beribadah sehari-hari.",
        "Sangat aktif berpartisipasi dalam kegiatan sosial, menunjukkan budi pekerti luhur serta toleransi yang kuat terhadap perbedaan.",
        "Mengembangkan keterampilan kolaboratif yang hebat, kreatif dalam memecahkan masalah, serta ulet menyelesaikan tugas-tugas kelompok.",
        "Menunjukkan kemajuan yang sangat pesat dalam kedisiplinan belajar serta kepedulian sosial di lingkungan sekolah.",
        "Selalu bersikap sopan, mengedepankan etika komunikasi digital yang baik, serta menghargai pendapat orang lain."
      ],
      catatanWali: [
        "Pertahankan prestasi hebat ini! Teruslah menginspirasi teman-teman di sekitarmu dengan kerendahan hatimu.",
        "Bapak/Ibu guru sangat bangga dengan perkembangan belajarmu. Teruslah asah potensimu tanpa ragu!",
        "Semangat belajarmu adalah kunci kesuksesanmu. Terus berjuang dan jangan mudah menyerah, raih mimpi-mimpimu!",
        "Tingkatkan terus keaktifanmu dalam diskusi kelas. Kamu memiliki potensi besar untuk menjadi pemimpin masa depan.",
        "Kedisiplinan dan kesantunanmu adalah modal berharga. Tetap rendah hati dan bersahaja dalam bergaul."
      ]
    };
  });

  const handleSaveAsTemplate = (type: 'kesimpulan' | 'catatanWali', text: string) => {
    if (!text || !text.trim()) {
      alert("Teks untuk template tidak boleh kosong!");
      return;
    }
    const cleanText = text.trim();
    if (customTemplates[type].includes(cleanText)) {
      alert("Template serupa sudah ada dalam daftar.");
      return;
    }
    const nextTemplates = {
      ...customTemplates,
      [type]: [...customTemplates[type], cleanText]
    };
    setCustomTemplates(nextTemplates);
    localStorage.setItem('rapor_5nk_custom_templates', JSON.stringify(nextTemplates));
    alert("✓ Berhasil menyimpan teks ini sebagai template baru!");
  };

  const handleDeleteTemplate = (type: 'kesimpulan' | 'catatanWali', indexToDelete: number) => {
    const list = customTemplates[type].filter((_, i) => i !== indexToDelete);
    const nextTemplates = {
      ...customTemplates,
      [type]: list
    };
    setCustomTemplates(nextTemplates);
    localStorage.setItem('rapor_5nk_custom_templates', JSON.stringify(nextTemplates));
  };

  // Sync focus when active category changes
  const activeCategory = categories[activeCategoryIndex];

  useMemo(() => {
    if (activeCategory && activeCategory.indicators.length > 0) {
      const activeIds = activeCategory.indicators.map(i => i.id);
      if (!focusedIndicatorId || !activeIds.includes(focusedIndicatorId)) {
        setFocusedIndicatorId(activeCategory.indicators[0].id);
      }
    } else {
      setFocusedIndicatorId(null);
    }
  }, [activeCategoryIndex, activeCategory]);

  // Filter students based on search string
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const query = studentSearch.toLowerCase();
    return students.filter(st => 
      st.name.toLowerCase().includes(query) || 
      st.nis.includes(query)
    );
  }, [students, studentSearch]);

  // Find selected student
  const student = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  // Flattened active indicators
  const allIndicators = useMemo(() => {
    return categories.flatMap(cat => cat.indicators.map(ind => ({ catId: cat.id, ...ind })));
  }, [categories]);

  const allIndicatorIds = useMemo(() => allIndicators.map(i => i.id), [allIndicators]);

  // Scores completed status
  const currentProgress = useMemo(() => {
    if (!student) return { completedCount: 0, percentage: 0 };
    const completedCount = Object.keys(student.grades).filter(id => allIndicatorIds.includes(id)).length;
    const percentage = allIndicatorIds.length > 0 ? Math.round((completedCount / allIndicatorIds.length) * 100) : 0;
    return { completedCount, percentage };
  }, [student, allIndicatorIds]);

  // Keyboard shortcut listener effect
  useEffect(() => {
    if (!student || activeCategoryIndex >= categories.length || !activeCategory) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside text fields (search input, or comment textareas)
      const tagName = document.activeElement?.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
        return;
      }

      const activeIds = activeCategory.indicators.map(i => i.id);
      let currentFocusId = focusedIndicatorId;
      if (!currentFocusId || !activeIds.includes(currentFocusId)) {
        if (activeCategory.indicators.length > 0) {
          currentFocusId = activeCategory.indicators[0].id;
        } else {
          return;
        }
      }

      const currentIndex = activeCategory.indicators.findIndex(i => i.id === currentFocusId);
      const key = e.key.toLowerCase();

      // Helpers to change score and optionally move next
      const applyScoreAndMoveNext = (score: ScoreKey) => {
        handleScoreChange(currentFocusId!, score);
        
        // Auto-scroll / move to next indicator
        if (currentIndex < activeCategory.indicators.length - 1) {
          setFocusedIndicatorId(activeCategory.indicators[currentIndex + 1].id);
        } else {
          // If last indicator of category, move to next category!
          if (activeCategoryIndex < categories.length - 1) {
            setActiveCategoryIndex(prev => prev + 1);
          } else {
            // Move to comments index
            setActiveCategoryIndex(categories.length);
          }
        }
      };

      if (key === '1' || key === 's') {
        e.preventDefault();
        applyScoreAndMoveNext('BSB');
      } else if (key === '2' || key === 'b') {
        e.preventDefault();
        applyScoreAndMoveNext('B');
      } else if (key === '3' || key === 'm') {
        e.preventDefault();
        applyScoreAndMoveNext('MB');
      } else if (key === '4' || key === 'k') {
        e.preventDefault();
        applyScoreAndMoveNext('BB');
      } else if (key === '0' || key === 'backspace' || key === 'delete') {
        e.preventDefault();
        const nextGrades = { ...student.grades };
        delete nextGrades[currentFocusId!];
        
        const scoredCount = Object.keys(nextGrades).filter(id => allIndicatorIds.includes(id)).length;
        const isCompleted = scoredCount === allIndicatorIds.length;
        
        onUpdateStudent({
          ...student,
          grades: nextGrades,
          completed: isCompleted
        });
      }
      
      // Focus Navigation
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentIndex > 0) {
          setFocusedIndicatorId(activeCategory.indicators[currentIndex - 1].id);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentIndex < activeCategory.indicators.length - 1) {
          setFocusedIndicatorId(activeCategory.indicators[currentIndex + 1].id);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        // Go to previous category tab
        if (activeCategoryIndex > 0) {
          setActiveCategoryIndex(prev => prev - 1);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        // Go to next category tab
        if (activeCategoryIndex < categories.length) {
          setActiveCategoryIndex(prev => prev + 1);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [student, activeCategoryIndex, focusedIndicatorId, activeCategory, categories, allIndicatorIds]);

  const handleScoreChange = (indicatorId: string, score: ScoreKey) => {
    if (!student) return;
    
    // 🛡️ Data Validation Layer: Ensure score is strictly within the allowed 5NK scale
    const validScores: ScoreKey[] = ['BSB', 'B', 'MB', 'BB'];
    if (!validScores.includes(score)) {
      alert(`[VALIDASI ERROR] Nilai "${score}" tidak valid!\nNilai harus salah satu dari: BSB, B, MB, BB.`);
      return;
    }

    const nextGrades = { ...student.grades };
    if (nextGrades[indicatorId] === score) {
      delete nextGrades[indicatorId];
    } else {
      nextGrades[indicatorId] = score;
    }
    
    // Compute completeness
    const scoredCount = Object.keys(nextGrades).filter(id => allIndicatorIds.includes(id)).length;
    const isCompleted = scoredCount === allIndicatorIds.length;

    onUpdateStudent({
      ...student,
      grades: nextGrades,
      completed: isCompleted
    });
  };

  const handleCommentChange = (field: 'kesimpulan' | 'catatanWali' | 'catatanOrangTua', value: string) => {
    if (!student) return;
    onUpdateStudent({
      ...student,
      [field]: value
    });
  };

  // Helper to pre-populate comments using dynamic rules based on their score
  const handleAutoGenerateComments = () => {
    if (!student) return;

    const mainStrengths: string[] = [];
    const areasToImprove: string[] = [];

    // Analyze CTA
    if (student.grades['CTA1'] === 'BSB' || student.grades['CTA2'] === 'BSB') {
      mainStrengths.push('kepedulian nasionalisme');
    }
    // Analyze DSP
    if (student.grades['DSP1'] === 'BSB' || student.grades['DSP2'] === 'BSB') {
      mainStrengths.push('kedisiplinan belajar yang tinggi');
    }
    // Analyze BBL
    if (student.grades['BBL1'] === 'BSB' || student.grades['BBL3'] === 'BSB') {
      mainStrengths.push('budi luhur serta toleransi sosial');
    }
    // Analyze CRD
    if (student.grades['CRD1'] === 'BSB' || student.grades['CRD2'] === 'BSB') {
      mainStrengths.push('pemecahan masalah secara cerdas');
    }
    // Analyze TRM
    if (student.grades['TRM1'] === 'BSB' || student.grades['TRM2'] === 'BSB') {
      mainStrengths.push('kemandirian berwirausaha dan terampil berkarya');
    }

    // Minor improvements
    if (student.grades['DSP3'] === 'MB' || student.grades['DSP3'] === 'BB') {
      areasToImprove.push('keaktifan belajar mandiri');
    }
    if (student.grades['BBL2'] === 'MB' || student.grades['BBL2'] === 'BB') {
      areasToImprove.push('pemeliharaan etika komunikasi digital');
    }
    if (student.grades['TRM2'] === 'MB' || student.grades['TRM2'] === 'BB') {
      areasToImprove.push('kemampuan beradaptasi pada perubahan baru');
    }

    const strengthText = mainStrengths.length > 0 
      ? `Ananda ${student.name} memancarkan perkembangan teladan khususnya dalam hal ${mainStrengths.join(', ')}.`
      : `${student.name} menunjukkan perkembangan karakter 5NK yang mumpuni serta harmonis di berbagai bidang pelajaran.`;

    const improvementText = areasToImprove.length > 0
      ? `Diharapkan adanya pendampingan lebih lanjut guna menumbuhkan asilasi ${areasToImprove.join(' dan ')}.`
      : 'Pertahankan orisinalitas keluhuran budi pekerti yang baik ini di lingkungan mana pun.';

    const finalKesimpulan = `${strengthText} Secara menyeluruh, nilai-nilai pembentuk kepribadian Pancasila (Cinta Tanah Air, Disiplin, Berbudi Luhur, Cerdas, Terampil) tercerna sangat baik. ${improvementText}`;
    const finalCatatanWali = `Prestasi budi pekerti yang luar biasa! Teruskan semangat belajar ini, gapailah cita-citamu dengan kegigihan.`;

    onUpdateStudent({
      ...student,
      kesimpulan: finalKesimpulan,
      catatanWali: finalCatatanWali
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs flex flex-col h-full overflow-hidden">
      {/* 1. Selector Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-3">
            <label htmlFor="eval-student-select" className="text-xs font-bold text-slate-500 uppercase flex-none">Pilih Murid:</label>
            <select
              id="eval-student-select"
              value={selectedStudentId}
              onChange={(e) => onSelectStudentId(e.target.value)}
              className="flex-1 md:flex-initial min-w-[200px] border border-slate-200 bg-white rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">-- Pilih Siswa --</option>
              {filteredStudents.map(st => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.nis}) {st.completed ? '✓' : '⚠️'}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 sm:w-48">
            <input
              type="text"
              placeholder="Cari nama / NIS..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            {studentSearch && (
              <button 
                type="button"
                onClick={() => setStudentSearch('')} 
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {student && (
          <div className="flex flex-wrap items-center gap-3 text-xs w-full md:w-auto justify-end">
            <div className="hidden lg:flex items-center gap-2 text-[10px] text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md shadow-xs select-none">
              <span className="font-bold text-slate-700">⌨️ Pintasan Wizard:</span>
              <span><kbd className="bg-slate-50 border border-slate-300 px-1 rounded font-mono font-bold text-slate-800">1</kbd>/<kbd className="bg-slate-50 border border-slate-200 px-1 rounded font-mono font-bold text-slate-800">S</kbd> Sangat Baik</span>
              <span><kbd className="bg-slate-50 border border-slate-300 px-1 rounded font-mono font-bold text-slate-800">2</kbd>/<kbd className="bg-slate-50 border border-slate-200 px-1 rounded font-mono font-bold text-slate-800">B</kbd> Berkembang</span>
              <span><kbd className="bg-slate-50 border border-slate-300 px-1 rounded font-mono font-bold text-slate-800">3</kbd>/<kbd className="bg-slate-50 border border-slate-200 px-1 rounded font-mono font-bold text-slate-800">M</kbd> Mulai</span>
              <span><kbd className="bg-slate-50 border border-slate-300 px-1 rounded font-mono font-bold text-slate-800">4</kbd>/<kbd className="bg-slate-50 border border-slate-200 px-1 rounded font-mono font-bold text-slate-800">K</kbd> Belum</span>
              <span className="text-slate-300">|</span>
              <span>Navigasi: <kbd className="font-mono font-bold">↑</kbd><kbd className="font-mono font-bold">↓</kbd> Pindah Aspek</span>
            </div>
            
            <span className="text-slate-400 font-medium">Status Pengisian Rapor:</span>
            <span className={`px-2.5 py-1 rounded-full font-bold font-mono ${
              currentProgress.percentage === 100 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              {currentProgress.completedCount} / {allIndicatorIds.length} ({currentProgress.percentage}%)
            </span>
          </div>
        )}
      </div>

      {student ? (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Active Wizard Navigation on Left (For medium screens and larger) */}
          <div className="w-full md:w-56 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-3 sm:p-4 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto shrink-0 select-none">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2 hidden md:block">Aspek Penilaian</span>
            {categories.map((cat, idx) => {
              // Count completed indicators in this category
              const catInds = cat.indicators.map(i => i.id);
              const doneCount = catInds.filter(id => student.grades[id]).length;
              const isCatCompleted = doneCount === catInds.length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryIndex(idx)}
                  className={`shrink-0 md:shrink-1 w-auto min-w-[140px] md:w-full py-2 px-3 text-left rounded-lg text-xs font-bold flex items-center justify-between transition-colors cursor-pointer gap-2 ${
                    activeCategoryIndex === idx 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'text-slate-600 bg-white md:bg-transparent border border-slate-200 md:border-transparent hover:bg-slate-200/60'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-2xs ${
                    activeCategoryIndex === idx
                      ? 'bg-emerald-700 text-white'
                      : isCatCompleted 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-slate-200 text-slate-600'
                  }`}>
                    {doneCount}/{catInds.length}
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => setActiveCategoryIndex(categories.length)}
              className={`shrink-0 md:shrink-1 w-auto min-w-[160px] md:w-full py-2 px-3 text-left rounded-lg text-xs font-bold flex items-center justify-between transition-colors cursor-pointer md:mt-4 gap-2 ${
                activeCategoryIndex === categories.length 
                  ? 'bg-emerald-600 text-white shadow-xs' 
                  : 'text-slate-600 bg-white md:bg-transparent border border-slate-200 md:border-transparent hover:bg-slate-200/60'
              }`}
            >
              <span className="flex items-center gap-1.5 truncate">
                <FileText className="h-3.5 w-3.5 flex-none" />
                <span className="truncate">Deskripsi/Catatan</span>
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-2xs ${
                activeCategoryIndex === categories.length
                  ? 'bg-emerald-700 text-white'
                  : (student.kesimpulan && student.catatanWali) 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-slate-200 text-slate-600'
              }`}>
                {(student.kesimpulan && student.catatanWali) ? '✓' : '...'}
              </span>
            </button>

            {/* Reset / Batal Nilai Section */}
            <div className="hidden md:flex mt-8 pt-4 border-t border-slate-200 flex-col gap-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">
                Batal/Reset Nilai
              </span>
              
              {/* Reset Siswa Terpilih (Satu Murid) */}
              {showResetStudentConfirm ? (
                <div className="bg-rose-50 p-2 border border-rose-200 rounded-lg text-center animate-in zoom-in-95 duration-100">
                  <p className="text-[10px] text-rose-800 font-semibold mb-1.5 leading-snug">
                    Hapus semua predikat {student.name}?
                  </p>
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onClearStudentGrades(student.id);
                        setShowResetStudentConfirm(false);
                      }}
                      className="py-1 px-2.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded cursor-pointer transition-colors"
                    >
                      Ya, Hapus
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetStudentConfirm(false)}
                      className="py-1 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-semibold rounded cursor-pointer transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowResetStudentConfirm(true);
                    setShowResetClassConfirm(false);
                  }}
                  className="w-full py-2 px-3 bg-white hover:bg-rose-50/50 text-rose-600 border border-rose-200 hover:border-rose-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Batal Nilai Murid Ini
                </button>
              )}

              {/* Reset Nilai Masal Satu Kelas */}
              {showResetClassConfirm ? (
                <div className="bg-red-50 p-2.5 border border-red-200 rounded-lg text-center animate-in zoom-in-95 duration-100">
                  <p className="text-[10px] text-red-800 font-bold mb-1.5 leading-relaxed">
                    ⚠️ Hapus nilai SELURUH siswa kelas {selectedClass}?
                  </p>
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onClearClassGrades();
                        setShowResetClassConfirm(false);
                      }}
                      className="py-1 px-2.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded cursor-pointer transition-colors"
                    >
                      Ya, Hapus Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetClassConfirm(false)}
                      className="py-1 px-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-semibold rounded cursor-pointer transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowResetClassConfirm(true);
                    setShowResetStudentConfirm(false);
                  }}
                  className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Batal Nilai Masal Kelas
                </button>
              )}
            </div>
          </div>

          {/* Active Wizard Form Pane on Right */}
          <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-between h-full bg-white">
            
            {activeCategoryIndex < categories.length ? (
              /* CATEGORY ASSESSMENTS */
              <div className="flex flex-col gap-6">
                <div>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 uppercase tracking-widest px-2.5 py-1 rounded-full">
                    Kategori: {activeCategory.name}
                  </span>
                  <h3 className="text-lg font-bold text-slate-800 mt-2 font-display">Penilaian Aspek {activeCategory.name}</h3>
                  <p className="text-xs text-slate-400">Silakan beri predikat berdasarkan rubrik di bawah ini untuk menilai perkembangan murid</p>
                </div>

                <div className="flex flex-col gap-6">
                  {activeCategory.indicators.map((ind, indIdx) => {
                    const currentVal = student.grades[ind.id];
                    const isCardFocused = focusedIndicatorId === ind.id;
                    
                    return (
                      <div 
                        key={ind.id} 
                        onClick={() => setFocusedIndicatorId(ind.id)}
                        className={`transition-all duration-150 border rounded-xl p-4 flex flex-col gap-3 selection:bg-transparent cursor-pointer ${
                          isCardFocused 
                            ? 'border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/20' 
                            : 'border-slate-200 bg-white hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded mt-0.5 ${
                            isCardFocused ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {ind.id}
                          </span>
                          <p className={`text-xs font-semibold leading-relaxed ${isCardFocused ? 'text-slate-900 font-bold' : 'text-slate-700'}`}>
                            {ind.text}
                          </p>
                        </div>

                        {/* Interactive Grade Card Option Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                          {scoreOptions.map(opt => {
                            const isChosen = currentVal === opt.key;
                            return (
                              <button
                                key={opt.key}
                                onClick={() => handleScoreChange(ind.id, opt.key)}
                                className={`p-2.5 text-center border rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 cursor-pointer select-none ${
                                  isChosen 
                                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-200' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <span>{opt.key}</span>
                                <span className={`text-[9px] font-normal leading-normal truncate max-w-full ${
                                  isChosen ? 'text-indigo-100' : 'text-slate-400'
                                }`}>
                                  {opt.label.split(' ').slice(0, 2).join(' ')}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Description rubric box */}
                        {currentVal && (
                          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-[11px] text-slate-500 leading-relaxed flex items-start gap-2 select-none">
                            <HelpCircle className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-none" />
                            <div>
                              <span className="font-bold text-slate-700">Skor {currentVal}: </span>
                              <span>{scoreOptions.find(o => o.key === currentVal)?.description}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* COMMENTS & NOTATIONS */
              <div className="flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold border border-indigo-200 uppercase tracking-widest px-2.5 py-1 rounded-full">
                      Lembar Catatan & Deskripsi
                    </span>
                    <h3 className="text-lg font-bold text-slate-800 mt-2 font-display">Uraian Kesimpulan & Catatan Guru</h3>
                    <p className="text-xs text-slate-400">Teks ini akan dicetak langsung pada halaman 2 format Rapor 5NK</p>
                  </div>

                  <button
                    onClick={handleAutoGenerateComments}
                    className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-800 flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Generate teks otomatis berdasarkan akumulasi nilai murid"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    Bantu Susun Deskripsi (AI)
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Uraian kesimpulan */}
                  <div className="flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <label htmlFor="form-kesimpulan" className="font-bold text-slate-600 text-[11px] uppercase tracking-wider">Uraian Kesimpulan Pencapaian 5NK (Wajib):</label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {student.kesimpulan?.length || 0} Karakter
                      </span>
                    </div>
                    <textarea
                      id="form-kesimpulan"
                      value={student.kesimpulan || ''}
                      onChange={(e) => handleCommentChange('kesimpulan', e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                          e.preventDefault();
                          onViewReport();
                        }
                      }}
                      rows={4}
                      placeholder="Tulis uraian kesimpulan perilaku siswa..."
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />

                    {/* Template Catatan Cepat - Uraian Kesimpulan */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-1 bg-emerald-50/30 p-2 rounded-lg border border-emerald-100/60 text-[11px]">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase">💡 Template Cepat:</span>
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              handleCommentChange('kesimpulan', val);
                              e.target.value = ''; // Reset select
                            }
                          }}
                          className="bg-white border border-slate-200 rounded text-[10px] py-1 px-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[200px] sm:max-w-[320px] truncate"
                        >
                          <option value="">-- Pilih Template Kesimpulan --</option>
                          {customTemplates.kesimpulan.map((tpl, i) => (
                            <option key={i} value={tpl}>
                              {i + 1}. {tpl.length > 60 ? `${tpl.slice(0, 60)}...` : tpl}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveAsTemplate('kesimpulan', student.kesimpulan || '')}
                          className="text-[10px] text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                          title="Simpan ulasan di atas sebagai template baru Anda"
                        >
                          💾 Simpan Ulasan Ini
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const ans = prompt(`Ketik nomor template yang ingin dihapus (1 - ${customTemplates.kesimpulan.length}):`);
                            if (ans) {
                              const num = parseInt(ans);
                              if (num >= 1 && num <= customTemplates.kesimpulan.length) {
                                handleDeleteTemplate('kesimpulan', num - 1);
                                alert("✓ Template kesimpulan berhasil dihapus.");
                              } else {
                                alert("Nomor template tidak valid.");
                              }
                            }
                          }}
                          className="text-[10px] text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                        >
                          🗑️ Hapus
                        </button>
                      </div>
                    </div>
                  </div>
 
                  {/* Catatan wali kelas */}
                  <div className="flex flex-col gap-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <label htmlFor="form-catatan-wali" className="font-bold text-slate-600 text-[11px] uppercase tracking-wider">Catatan Wali Kelas:</label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {student.catatanWali?.length || 0} Karakter
                      </span>
                    </div>
                    <textarea
                      id="form-catatan-wali"
                      value={student.catatanWali || ''}
                      onChange={(e) => handleCommentChange('catatanWali', e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                          e.preventDefault();
                          onViewReport();
                        }
                      }}
                      rows={3}
                      placeholder="Uraian motivasi bagi perkembangan siswa..."
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />

                    {/* Template Catatan Cepat - Catatan Wali Kelas */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mt-1 bg-emerald-50/30 p-2 rounded-lg border border-emerald-100/60 text-[11px]">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase">💡 Template Cepat:</span>
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              handleCommentChange('catatanWali', val);
                              e.target.value = ''; // Reset select
                            }
                          }}
                          className="bg-white border border-slate-200 rounded text-[10px] py-1 px-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[200px] sm:max-w-[320px] truncate"
                        >
                          <option value="">-- Pilih Template Motivasi --</option>
                          {customTemplates.catatanWali.map((tpl, i) => (
                            <option key={i} value={tpl}>
                              {i + 1}. {tpl.length > 60 ? `${tpl.slice(0, 60)}...` : tpl}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveAsTemplate('catatanWali', student.catatanWali || '')}
                          className="text-[10px] text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                          title="Simpan catatan motivasi di atas sebagai template baru Anda"
                        >
                          💾 Simpan Catatan Ini
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const ans = prompt(`Ketik nomor template yang ingin dihapus (1 - ${customTemplates.catatanWali.length}):`);
                            if (ans) {
                              const num = parseInt(ans);
                              if (num >= 1 && num <= customTemplates.catatanWali.length) {
                                handleDeleteTemplate('catatanWali', num - 1);
                                alert("✓ Template catatan wali berhasil dihapus.");
                              } else {
                                alert("Nomor template tidak valid.");
                              }
                            }
                          }}
                          className="text-[10px] text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                        >
                          🗑️ Hapus
                        </button>
                      </div>
                    </div>
                  </div>


                  {/* Catatan Orang Tua */}
                  <div className="flex flex-col gap-1.5 text-xs">
                    <label htmlFor="form-catatan-ortu" className="font-bold text-slate-600 text-[11px] uppercase tracking-wider">Catatan Orang Tua/Wali:</label>
                    <textarea
                      id="form-catatan-ortu"
                      value={student.catatanOrangTua || ''}
                      onChange={(e) => handleCommentChange('catatanOrangTua', e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                          e.preventDefault();
                          onViewReport();
                        }
                      }}
                      rows={2}
                      placeholder="Masukan tanggapan, respon, atau komitmen orang tua..."
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Form Steps Navigation Control */}
            <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-100 no-print">
              <button
                disabled={activeCategoryIndex === 0}
                onClick={() => setActiveCategoryIndex(prev => prev - 1)}
                className="py-1.5 px-3 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 flex items-center gap-1 text-slate-600 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" /> Aspek Sebelumnya
              </button>

              {activeCategoryIndex < categories.length ? (
                <div className="flex gap-2">
                  {onExportPdfPerSiswa && student && (
                    <button
                      onClick={() => onExportPdfPerSiswa(student.id)}
                      disabled={isGeneratingHiddenPdf}
                      className={`py-1.5 px-4 ${isGeneratingHiddenPdf ? 'bg-rose-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700'} text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-sm`}
                    >
                      <FileText className="h-4 w-4" /> 
                      {isGeneratingHiddenPdf ? 'Menyimpan PDF...' : 'Ekspor PDF Siswa Ini'}
                    </button>
                  )}
                  <button
                    onClick={() => setActiveCategoryIndex(prev => prev + 1)}
                    className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    Aspek Berikutnya <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  {onExportPdfPerSiswa && student && (
                    <button
                      onClick={() => onExportPdfPerSiswa(student.id)}
                      disabled={isGeneratingHiddenPdf}
                      className={`py-2 px-4 ${isGeneratingHiddenPdf ? 'bg-rose-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700'} text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-md shadow-rose-100`}
                    >
                      <FileText className="h-4 w-4" />
                      {isGeneratingHiddenPdf ? 'Menyimpan PDF...' : 'Ekspor PDF'}
                    </button>
                  )}
                  <button
                    onClick={onViewReport}
                    className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 transform active:translate-y-px transition-all"
                  >
                    <UserCheck className="h-4 w-4" /> Simpan & Lihat Pratinjau Rapor
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 italic gap-2 h-64">
          <HelpCircle className="h-10 w-10 text-slate-300 stroke-1" />
          <p>Silakan pilih murid pada menu dropdown di atas terlebih dahulu untuk memulai formulir penilaian rincian rapor.</p>
        </div>
      )}
    </div>
  );
}
