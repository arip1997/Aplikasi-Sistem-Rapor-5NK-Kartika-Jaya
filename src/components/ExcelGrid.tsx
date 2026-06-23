import { useState, useId, useEffect, useRef, useMemo } from 'react';
import { Student, Category, ScoreKey, scoreOptions } from '../types';
import { ChevronDown, Search, Check, AlertCircle, Sparkles, Filter, FileSpreadsheet, RotateCcw, AlertTriangle, RefreshCw, Printer } from 'lucide-react';
import { formatProperName } from '../utils';

interface ExcelGridProps {
  students: Student[];
  categories: Category[];
  selectedClass: string;
  onUpdateStudentGrades: (studentId: string, grades: Record<string, ScoreKey>) => void;
  onUpdateComments: (studentId: string, kesimpulan: string, Notes: string) => void;
  onSelectStudent: (student: Student) => void;
  selectedStudent: Student | null;
  dirtyCells?: Record<string, boolean>;
  aiModifiedStudentIds?: string[];
}

export default function ExcelGrid({
  students,
  categories,
  selectedClass,
  onUpdateStudentGrades,
  onUpdateComments,
  onSelectStudent,
  selectedStudent,
  dirtyCells = {},
  aiModifiedStudentIds = [],
}: ExcelGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchNis, setSearchNis] = useState('');
  const [activeCell, setActiveCell] = useState<{ studentId: string; indicatorId: string } | null>(null);
  const [filterCompleted, setFilterCompleted] = useState<'all' | 'completed' | 'pending'>('all');
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(true);
  const [checkedStudentIds, setCheckedStudentIds] = useState<Record<string, boolean>>({});
  
  const searchInputId = useId();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  const handleSelectAll = (checked: boolean) => {
    const nextChecked: Record<string, boolean> = {};
    if (checked) {
      filteredStudents.forEach(s => {
        nextChecked[s.id] = true;
      });
    }
    setCheckedStudentIds(nextChecked);
  };

  const handleToggleCheck = (studentId: string) => {
    setCheckedStudentIds(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const applyBulkGrades = (score: ScoreKey) => {
    if (!activeCell) {
      alert("Pilih sel indikator terlebih dahulu di grid Excel!");
      return;
    }
    const targetStudentIds = Object.keys(checkedStudentIds).filter(id => checkedStudentIds[id]);
    if (targetStudentIds.length === 0) {
      alert("Silakan pilih minimal satu siswa dengan mencentang kotak di baris nama siswa!");
      return;
    }
    
    if (confirm(`Apakah Anda yakin ingin mengisi nilai "${score}" untuk Indikator ${activeCell.indicatorId} pada ${targetStudentIds.length} siswa terpilih?`)) {
      targetStudentIds.forEach(id => {
        const stud = students.find(s => s.id === id);
        if (stud) {
          const nextGrades = { ...stud.grades, [activeCell.indicatorId]: score };
          onUpdateStudentGrades(id, nextGrades);
        }
      });
      alert(`Berhasil memperbarui nilai untuk ${targetStudentIds.length} siswa secara massal!`);
    }
  };

  const applyBulkCommentsCopy = () => {
    if (!selectedStudent) {
      alert("Pilih siswa sumber (klik nama siswa di tabel) yang ingin disalin catatan/kesimpulannya!");
      return;
    }
    const targetStudentIds = Object.keys(checkedStudentIds).filter(id => checkedStudentIds[id]);
    if (targetStudentIds.length === 0) {
      alert("Silakan pilih minimal satu siswa dengan mencentang kotak di baris nama siswa!");
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menyalin Uraian Kesimpulan, Catatan Wali Kelas, dan Catatan Orang Tua dari "${selectedStudent.name}" ke ${targetStudentIds.length} siswa terpilih?`)) {
      targetStudentIds.forEach(id => {
        if (id === selectedStudent.id) return; // Skip self
        onUpdateComments(id, selectedStudent.kesimpulan || '', selectedStudent.catatanWali || '');
      });
      alert(`Berhasil menyalin seluruh catatan dari "${selectedStudent.name}" ke ${targetStudentIds.length} siswa secara massal!`);
    }
  };

  const applyBulkGradesCopy = () => {
    if (!selectedStudent) {
      alert("Pilih siswa sumber (klik nama siswa di tabel) yang ingin disalin nilai-nilainya!");
      return;
    }
    const targetStudentIds = Object.keys(checkedStudentIds).filter(id => checkedStudentIds[id]);
    if (targetStudentIds.length === 0) {
      alert("Silakan pilih minimal satu siswa dengan mencentang kotak di baris nama siswa!");
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menyalin seluruh aspek penilaian dari "${selectedStudent.name}" ke ${targetStudentIds.length} siswa terpilih?`)) {
      targetStudentIds.forEach(id => {
        if (id === selectedStudent.id) return; // Skip self
        onUpdateStudentGrades(id, { ...selectedStudent.grades });
      });
      alert(`Berhasil menyalin seluruh nilai dari "${selectedStudent.name}" ke ${targetStudentIds.length} siswa secara massal!`);
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      setScrollTop(el.scrollTop);
    };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height || 600);
      }
    });

    el.addEventListener('scroll', handleScroll, { passive: true });
    resizeObserver.observe(el);

    // Initial values
    setScrollTop(el.scrollTop);
    setContainerHeight(el.clientHeight || 600);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, []);

  // Extract list of all indicators flattened for easy table mapping
  const allIndicators = useMemo(() => categories.flatMap(cat => 
    cat.indicators.map(ind => ({
      categoryId: cat.id,
      categoryName: cat.name,
      ...ind
    }))
  ), [categories]);

  // Filter students
  const filteredStudents = useMemo(() => students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesNis = student.nis.includes(searchNis);
    const matchesCompleted = filterCompleted === 'all' ? true :
                            filterCompleted === 'completed' ? student.completed : !student.completed;
    return matchesSearch && matchesNis && matchesCompleted;
  }), [students, searchTerm, searchNis, filterCompleted]);

  const rowHeight = 48;
  const overscan = 10;

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(
    filteredStudents.length - 1,
    Math.floor((scrollTop + containerHeight) / rowHeight) + overscan
  );

  const visibleStudents = filteredStudents.slice(startIndex, endIndex + 1);

  const topSpacerHeight = startIndex * rowHeight;
  const bottomSpacerHeight = Math.max(0, (filteredStudents.length - 1 - endIndex) * rowHeight);

  // Auto-scroll scrollContainer to keep navigate active cells in viewport
  useEffect(() => {
    if (!activeCell || !scrollContainerRef.current) return;
    const studentIdx = filteredStudents.findIndex(s => s.id === activeCell.studentId);
    if (studentIdx === -1) return;

    const targetTop = studentIdx * rowHeight;
    const scrollContainer = scrollContainerRef.current;
    const currentScrollTop = scrollContainer.scrollTop;
    const viewportHeight = containerHeight;

    // We leave safety margins for sticky header rows (approx 70px)
    const headerOffset = 70;

    if (targetTop < currentScrollTop + headerOffset) {
      scrollContainer.scrollTop = targetTop - headerOffset;
    } else if (targetTop + rowHeight > currentScrollTop + viewportHeight) {
      scrollContainer.scrollTop = targetTop + rowHeight - viewportHeight;
    }
  }, [activeCell, containerHeight, filteredStudents]);

  const getScoreColorClass = (key: ScoreKey) => {
    switch (key) {
      case 'BSB': return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium';
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'MB': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'BB': return 'bg-rose-100 text-rose-800 border-rose-300 font-medium';
    }
  };

  const handleCellClick = (studentId: string, indicatorId: string) => {
    setActiveCell({ studentId, indicatorId });
    const stud = students.find(s => s.id === studentId);
    if (stud) {
      onSelectStudent(stud);
    }
  };

  const handleScoreSelect = (student: Student, indicatorId: string, score: ScoreKey, keepActive = false) => {
    // 🛡️ Data Validation Layer: Ensure input strictly matches 5NK scale ('BSB', 'B', 'MB', 'BB')
    const validScores: ScoreKey[] = ['BSB', 'B', 'MB', 'BB'];
    if (!validScores.includes(score)) {
      alert(`[VALIDASI ERROR] Nilai "${score}" tidak valid!\nNilai harus salah satu dari: BSB, B, MB, BB.`);
      return;
    }

    const nextGrades = { ...student.grades, [indicatorId]: score };
    
    // Auto-compute completed status (all 15 indicators scored)
    onUpdateStudentGrades(student.id, nextGrades);
    if (!keepActive) {
      setActiveCell(null);
    }
  };

  useEffect(() => {
    if (!activeCell) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in search input
      if (document.activeElement?.tagName === 'INPUT') {
        const activeId = document.activeElement.id;
        if (activeId === searchInputId || activeId === 'search-nis-input') return;
      }

      const stud = students.find(s => s.id === activeCell.studentId);
      if (!stud) return;

      const studentIndex = filteredStudents.findIndex(s => s.id === activeCell.studentId);
      const indicatorIndex = allIndicators.findIndex(i => i.id === activeCell.indicatorId);

      // Handle Ctrl+D shortcut to copy cell value from the cell directly above
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (studentIndex > 0) {
          const prevStudent = filteredStudents[studentIndex - 1];
          const upperValue = prevStudent.grades[activeCell.indicatorId];
          if (upperValue) {
            handleScoreSelect(stud, activeCell.indicatorId, upperValue, true);
          } else {
            const nextGrades = { ...stud.grades };
            delete nextGrades[activeCell.indicatorId];
            onUpdateStudentGrades(stud.id, nextGrades);
          }
        }
        return;
      }

      // Handle shortcuts for filling grades
      const key = e.key.toLowerCase();
      if (key === '1' || key === 's') {
        e.preventDefault();
        handleScoreSelect(stud, activeCell.indicatorId, 'BSB', true);
      } else if (key === '2' || key === 'b') {
        e.preventDefault();
        handleScoreSelect(stud, activeCell.indicatorId, 'B', true);
      } else if (key === '3' || key === 'm') {
        e.preventDefault();
        handleScoreSelect(stud, activeCell.indicatorId, 'MB', true);
      } else if (key === '4' || key === 'k') {
        e.preventDefault();
        handleScoreSelect(stud, activeCell.indicatorId, 'BB', true);
      } else if (key === '0' || key === 'backspace' || key === 'delete') {
        e.preventDefault();
        const nextGrades = { ...stud.grades };
        delete nextGrades[activeCell.indicatorId];
        onUpdateStudentGrades(stud.id, nextGrades);
      }
      
      // Handle cell movement / navigation (arrows)
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (studentIndex > 0) {
          const nextStudentId = filteredStudents[studentIndex - 1].id;
          handleCellClick(nextStudentId, activeCell.indicatorId);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (studentIndex < filteredStudents.length - 1) {
          const nextStudentId = filteredStudents[studentIndex + 1].id;
          handleCellClick(nextStudentId, activeCell.indicatorId);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (indicatorIndex > 0) {
          const nextIndicatorId = allIndicators[indicatorIndex - 1].id;
          handleCellClick(activeCell.studentId, nextIndicatorId);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (indicatorIndex < allIndicators.length - 1) {
          const nextIndicatorId = allIndicators[indicatorIndex + 1].id;
          handleCellClick(activeCell.studentId, nextIndicatorId);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setActiveCell(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeCell, filteredStudents, allIndicators, students]);

  // Get active cell value for formulas bar
  const getActiveCellDescription = () => {
    if (!activeCell || !selectedStudent) return 'Pilih salah satu sel penilaian di grid Excel untuk mengedit nilai';
    const ind = allIndicators.find(i => i.id === activeCell.indicatorId);
    const currentScore = selectedStudent.grades[activeCell.indicatorId] || '-';
    const scoreOpt = scoreOptions.find(o => o.key === currentScore);
    return `Sel Aktif: [${selectedStudent.name}] -> Indikator ${ind?.id} (${ind?.text.substring(0, 45)}...): Nilai Aktif = ${currentScore} (${scoreOpt?.label || 'Belum Diisi'})`;
  };

  return (
    <div id="excel-grid-container" className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
      {/* 1. Spread Sheet Top Bar / Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-3 flex flex-wrap gap-3 items-center justify-between no-print">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 text-white p-1.5 rounded">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div>
            <h2 id="sheet-title" className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
              Lembar Kerja: Kelas {selectedClass} 
              <span className="text-xs font-normal text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                {filteredStudents.length} Murid
              </span>
            </h2>
            <p className="text-xs text-slate-400">Gunakan sel untuk mengubah nilai indikator 5NK secara live</p>
          </div>
        </div>

        {/* Filters and search */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => {
              setIsBulkEditMode(!isBulkEditMode);
              setCheckedStudentIds({});
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              isBulkEditMode
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                : 'bg-white border-slate-300 text-indigo-700 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isBulkEditMode ? 'Nonaktifkan Edit Massal' : 'Mode Edit Massal'}
          </button>

          {/* Edit Fokus toggle */}
          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
              isFocusMode
                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
            title="Menggelapkan baris murid lain saat sedang mengisi nilai agar lebih fokus dan menghindari salah input"
          >
            <span className="text-sm">🎯</span>
            <span>{isFocusMode ? 'Edit Fokus: Aktif' : 'Edit Fokus: Pasif'}</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="relative" title="Cari berdasarkan nama siswa">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                id={searchInputId}
                type="text"
                placeholder="Cari Nama Murid..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-32 md:w-44"
              />
            </div>

            <div className="relative" title="Filter langsung berdasarkan NIS">
              <Filter className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-indigo-400" />
              <input
                id="search-nis-input"
                type="text"
                placeholder="Saring NIS..."
                value={searchNis}
                onChange={(e) => setSearchNis(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-indigo-200 text-indigo-900 font-semibold rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 w-28 md:w-36 placeholder-indigo-300"
              />
            </div>
          </div>

          <div className="flex bg-slate-200 p-0.5 rounded-lg border border-slate-300">
            <button
              onClick={() => setFilterCompleted('all')}
              className={`px-2 py-1 text-[10px] md:text-xs font-medium rounded-md transition-colors ${filterCompleted === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterCompleted('completed')}
              className={`px-2 py-1 text-[10px] md:text-xs font-medium rounded-md transition-colors ${filterCompleted === 'completed' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Selesai
            </button>
            <button
              onClick={() => setFilterCompleted('pending')}
              className={`px-2 py-1 text-[10px] md:text-xs font-medium rounded-md transition-colors ${filterCompleted === 'pending' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Belum
            </button>
          </div>
        </div>
      </div>

      {/* 2. Excel Formulabar / Formula Input simulation */}
      <div className="bg-white border-b border-slate-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-600 no-print">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold border border-slate-200 selection:bg-transparent">
            {activeCell ? `FX: ${allIndicators.find(i => i.id === activeCell.indicatorId)?.id}` : 'INFO'}
          </div>
          <div className="text-slate-300 font-bold flex-none text-[10px]">|</div>
          <div className="flex-1 truncate pl-1 text-[11px] text-slate-600 flex items-center gap-1.5">
            {activeCell ? (
              <>
                <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse animate-duration-1000" />
                <span className="font-semibold text-slate-800 truncate">{getActiveCellDescription()}</span>
              </>
            ) : (
              <span className="text-slate-400 italic">Klik pada kotak penilaian murid untuk memicu menu pop-up input nilai</span>
            )}
          </div>
        </div>
        
        <div className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md flex items-center gap-2 font-sans select-none ml-auto shrink-0 md:flex">
          <span className="font-bold text-slate-700">⌨️ Pintasan Keyboard:</span>
          <span><kbd className="bg-white border border-slate-300 px-1 rounded shadow-xs text-slate-800 font-mono font-bold">1</kbd>/<kbd className="bg-white border border-slate-300 px-1 rounded shadow-xs text-slate-800 font-mono font-bold">S</kbd> Sangat Baik (BSB)</span>
          <span><kbd className="bg-white border border-slate-300 px-1 rounded shadow-xs text-slate-800 font-mono font-bold">2</kbd>/<kbd className="bg-white border border-slate-300 px-1 rounded shadow-xs text-slate-800 font-mono font-bold">B</kbd> Berkembang (B)</span>
          <span><kbd className="bg-white border border-slate-300 px-1 rounded shadow-xs text-slate-800 font-mono font-bold">3</kbd>/<kbd className="bg-white border border-slate-300 px-1 rounded shadow-xs text-slate-800 font-mono font-bold">M</kbd> Mulai (MB)</span>
          <span><kbd className="bg-white border border-slate-300 px-1 rounded shadow-xs text-slate-800 font-mono font-bold">4</kbd>/<kbd className="bg-white border border-slate-300 px-1 rounded shadow-xs text-slate-800 font-mono font-bold">K</kbd> Belum (BB)</span>
          <span><kbd className="bg-white border border-slate-300 px-1 rounded shadow-xs text-slate-800 font-mono font-bold">0</kbd>/<kbd className="bg-white border border-slate-300 px-1 rounded shadow-xs text-slate-800 font-mono font-bold">←</kbd> Hapus</span>
          <span className="text-slate-300">|</span>
          <span className="text-[9px] text-slate-400 font-medium">Navigasi: <kbd className="font-mono">↑</kbd><kbd className="font-mono">↓</kbd><kbd className="font-mono">←</kbd><kbd className="font-mono">→</kbd></span>
        </div>
      </div>

      {/* 2.5 Bulk Edit Toolbar */}
      {isBulkEditMode && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 p-3 flex flex-wrap gap-3 items-center justify-between animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 text-xs text-indigo-900 font-bold">
            <span className="bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full text-[10px]">
              {Object.values(checkedStudentIds).filter(Boolean).length} / {filteredStudents.length} Siswa Terpilih
            </span>
            <span className="text-indigo-800">🛠️ Mode Edit Massal Aktif</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Check/Uncheck All */}
            <button
              onClick={() => {
                const someChecked = Object.values(checkedStudentIds).filter(Boolean).length > 0;
                handleSelectAll(!someChecked);
              }}
              className="px-2.5 py-1.5 text-[11px] font-semibold bg-white border border-indigo-200 text-indigo-700 rounded hover:bg-indigo-100 cursor-pointer transition-colors"
            >
              {Object.values(checkedStudentIds).filter(Boolean).length > 0 ? 'Batal Pilih Semua' : 'Pilih Semua Siswa'}
            </button>

            {/* Apply Grade Action */}
            {activeCell && (
              <div className="flex items-center gap-1.5 bg-white border border-indigo-200 p-1 rounded-md">
                <span className="text-[10px] text-slate-500 font-sans px-1 font-semibold">Terapkan [{activeCell.indicatorId}] :</span>
                {(['BSB', 'B', 'MB', 'BB'] as ScoreKey[]).map(sc => (
                  <button
                    key={sc}
                    onClick={() => applyBulkGrades(sc)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${getScoreColorClass(sc)} hover:opacity-80`}
                  >
                    {sc}
                  </button>
                ))}
              </div>
            )}

            {/* Copy Actions from selectedStudent */}
            {selectedStudent && (
              <div className="flex items-center gap-2">
                <button
                  onClick={applyBulkGradesCopy}
                  className="px-2.5 py-1.5 text-[11px] font-bold bg-white border border-indigo-200 text-indigo-700 rounded hover:bg-slate-100 cursor-pointer transition-colors flex items-center gap-1"
                  title={`Salin seluruh aspek penilaian dari ${selectedStudent.name} ke siswa terpilih`}
                >
                  📋 Salin Semua Nilai dari {selectedStudent.name.split(' ')[0]}
                </button>
                <button
                  onClick={applyBulkCommentsCopy}
                  className="px-2.5 py-1.5 text-[11px] font-bold bg-white border border-indigo-200 text-indigo-700 rounded hover:bg-slate-100 cursor-pointer transition-colors flex items-center gap-1"
                  title={`Salin kesimpulan dan catatan dari ${selectedStudent.name} ke siswa terpilih`}
                >
                  📝 Salin Catatan {selectedStudent.name.split(' ')[0]}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Grid Table Container */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto relative">
        <table className="w-full border-separate border-spacing-0 text-left">
          {/* Header Rows */}
          <thead className="sticky top-0 bg-slate-100 z-10 text-xs text-slate-700 selection:bg-transparent shadow-xs">
            {/* Category row */}
            <tr className="h-[38px]">
              <th className="bg-slate-200 border-r border-b border-slate-300 p-2 text-center font-bold sticky top-0 left-0 z-30 min-w-[55px]">
                {isBulkEditMode ? (
                  <input
                    type="checkbox"
                    checked={filteredStudents.length > 0 && Object.values(checkedStudentIds).filter(Boolean).length === filteredStudents.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded text-indigo-650 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer mx-auto block"
                    title="Pilih semua siswa"
                  />
                ) : (
                  'No'
                )}
              </th>
              <th className="bg-slate-200 border-r border-b border-slate-300 p-2 sticky top-0 left-[55px] z-30 min-w-[140px]">NIS / Siswa</th>
              
              {categories.map((cat, idx) => {
                const colors = ['bg-emerald-50', 'bg-blue-50', 'bg-purple-50', 'bg-amber-50', 'bg-rose-50'];
                const bgClass = colors[idx % colors.length];
                return (
                  <th key={cat.id} className={`${bgClass} border-r border-b border-slate-300 px-2 py-1.5 font-bold text-center sticky top-0 z-10`} colSpan={cat.indicators.length}>
                    {cat.name}
                  </th>
                );
              })}
            </tr>
            {/* Indicator row */}
            <tr className="text-[10px] text-slate-500 font-mono bg-slate-50 h-[32px]">
              <th className="border-r border-b border-slate-300 text-center sticky top-[38px] left-0 bg-slate-50 z-30 min-w-[55px]">-</th>
              <th className="border-r border-b border-slate-300 px-2 py-1 sticky top-[38px] left-[55px] bg-slate-50 z-30">NIS & Nama</th>
              
              {categories.map((cat, idx) => {
                const textColors = ['text-emerald-700', 'text-blue-700', 'text-purple-700', 'text-amber-700', 'text-rose-700'];
                const hoverColors = ['hover:bg-emerald-100', 'hover:bg-blue-100', 'hover:bg-purple-100', 'hover:bg-amber-100', 'hover:bg-rose-100'];
                const tClass = textColors[idx % textColors.length];
                const hClass = hoverColors[idx % hoverColors.length];
                
                return cat.indicators.map((ind) => (
                  <th key={ind.id} title={ind.text} className={`border-r border-b border-slate-300 px-1 text-center font-bold ${tClass} cursor-help ${hClass} sticky top-[38px] z-10`}>
                    {ind.id}
                  </th>
                ));
              })}
            </tr>
          </thead>

          {/* Student Grid Roster */}
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredStudents.length > 0 ? (
              <>
                {topSpacerHeight > 0 && (
                  <tr style={{ height: `${topSpacerHeight}px` }}>
                    <td colSpan={2 + allIndicators.length} style={{ padding: 0 }} />
                  </tr>
                )}
                {visibleStudents.map((stud) => {
                  const idx = filteredStudents.findIndex(s => s.id === stud.id);
                  const isSelected = selectedStudent?.id === stud.id;
                  const hasAiBadge = aiModifiedStudentIds.includes(stud.id);
                  
                  const isEditingThisStudent = activeCell && activeCell.studentId === stud.id;
                  const currentlyEditingAnyone = activeCell !== null;
                  
                  let rowDimClass = '';
                  if (isFocusMode && currentlyEditingAnyone) {
                    if (isEditingThisStudent) {
                      rowDimClass = 'ring-2 ring-emerald-500/40 bg-emerald-50/40 z-10 transition-all duration-300 relative';
                    } else {
                      rowDimClass = 'opacity-20 grayscale-[40%] transition-all duration-300 hover:opacity-50 cursor-pointer';
                    }
                  }
                  
                  return (
                    <tr 
                      key={stud.id} 
                      className={`hover:bg-slate-50 transition-all duration-300 ${isSelected && !currentlyEditingAnyone ? 'bg-emerald-50/20' : ''} ${rowDimClass}`}
                    >
                      {/* Index / Checkbox Column */}
                      <td className="border-r border-b border-slate-200 text-center font-mono p-2 sticky left-0 bg-white z-5 font-medium min-w-[55px]">
                        {isBulkEditMode ? (
                          <input
                            type="checkbox"
                            checked={!!checkedStudentIds[stud.id]}
                            onChange={() => handleToggleCheck(stud.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer mx-auto block"
                          />
                        ) : (
                          <span className="text-slate-400 select-none">{idx + 1}</span>
                        )}
                      </td>

                      {/* Student Name Key Column */}
                      <td className={`border-r border-b border-slate-200 p-2 sticky left-[55px] bg-white z-5 font-semibold min-w-[200px] truncate`}>
                        <button 
                          onClick={() => onSelectStudent(stud)}
                          className="text-left hover:text-emerald-700 hover:underline flex items-center justify-between w-full"
                        >
                          <div className="truncate flex items-center gap-1.5">
                            <div>
                              <p className="text-slate-800 font-semibold text-[11px] leading-tight flex items-center flex-wrap gap-1">
                                <span className="truncate">{stud.name}</span>
                                {stud.name !== formatProperName(stud.name) && (
                                  <span title={`Format rekomendasi: ${formatProperName(stud.name)}`}>
                                    <AlertTriangle className="h-3 w-3 text-amber-500 inline shrink-0" />
                                  </span>
                                )}
                                {hasAiBadge && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8.5px] font-extrabold bg-indigo-100 text-indigo-700 border border-indigo-200/50 uppercase tracking-wider shrink-0 scale-95" title="Ulasan Rapor Telah Direduksi / Digenerasi via AI">
                                    <Sparkles className="h-2.5 w-2.5 text-indigo-500 animate-pulse" /> AI
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">NIS: {stud.nis}</p>
                            </div>
                          </div>
                          {stud.completed ? (
                            <span className="flex-none ml-2 text-emerald-600 bg-emerald-50 p-0.5 rounded-full" title="Rapor Selesai Dinilai">
                              <Check className="h-3 w-3" />
                            </span>
                          ) : (
                            <span className="flex-none ml-2 text-slate-400" title="Belum Lengkap">
                              <AlertCircle className="h-3.5 w-3.5" />
                            </span>
                          )}
                          {stud.printStatus && (
                            <span className="flex-none ml-1 text-indigo-600 bg-indigo-50 p-0.5 rounded-full" title="Telah Dicetak">
                              <Printer className="h-3 w-3" />
                            </span>
                          )}
                        </button>
                      </td>

                      {/* CTA Cells */}
                      {allIndicators.map(ind => {
                        const score: ScoreKey = stud.grades[ind.id];
                        const isCellSelected = activeCell?.studentId === stud.id && activeCell?.indicatorId === ind.id;
                        
                        return (
                          <td 
                            key={ind.id} 
                            onClick={() => handleCellClick(stud.id, ind.id)}
                            className={`border-r border-b border-slate-200 p-1 text-center font-mono cursor-pointer relative transition-all ${
                              isCellSelected ? 'ring-2 ring-emerald-500 z-10 bg-emerald-50' : ''
                            }`}
                          >
                            {score ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className={`inline-block px-1.5 py-1 text-[10px] rounded-md border font-semibold select-none ${getScoreColorClass(score)}`}>
                                  {score}
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[10px] text-slate-300 font-bold animate-pulse italic">-</span>
                              </div>
                            )}

                            {/* Quick Edit Popup on Active selection */}
                            {isCellSelected && (
                              <div className="absolute left-1/2 bottom-2 max-h-0 bg-transparent z-40 transform -translate-x-1/2">
                                <div className="bg-white rounded-lg shadow-xl border border-slate-300 py-1.5 px-1 flex flex-col gap-1 w-44 text-left translate-y-[-100%] animate-in fade-in duration-100">
                                  <div className="px-2 pb-1 border-b border-slate-100 mb-1">
                                    <p className="text-[9px] text-slate-400 font-bold font-sans">PILIH NILAI [{ind.id}]</p>
                                  </div>
                                  {scoreOptions.map((opt) => (
                                    <button
                                      key={opt.key}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleScoreSelect(stud, ind.id, opt.key);
                                      }}
                                      className="p-1 hover:bg-slate-50 rounded flex items-center gap-1.5 justify-between text-slate-700 transition-colors w-full text-[10px]"
                                    >
                                      <div className="flex items-center gap-1.5">
                                        <span className={`inline-block w-6 py-0.5 text-center text-[9px] font-bold rounded ${getScoreColorClass(opt.key)}`}>
                                          {opt.key}
                                        </span>
                                        <span className="font-sans text-[10px] truncate">{opt.label.split(' ')[0]}</span>
                                      </div>
                                      {score === opt.key && <Check className="h-3 w-3 text-emerald-600 flex-none" />}
                                    </button>
                                  ))}
                                  {score && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const nextGrades = { ...stud.grades };
                                        delete nextGrades[ind.id];
                                        onUpdateStudentGrades(stud.id, nextGrades);
                                        setActiveCell(null);
                                      }}
                                      className="mt-1 border-t border-slate-150 pt-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded flex items-center gap-1 text-[9px] justify-center transition-colors font-bold w-full"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                      Batal Nilai Sel Ini
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {bottomSpacerHeight > 0 && (
                  <tr style={{ height: `${bottomSpacerHeight}px` }}>
                    <td colSpan={2 + allIndicators.length} style={{ padding: 0 }} />
                  </tr>
                )}
              </>
            ) : (
              <tr>
                <td colSpan={2 + allIndicators.length} className="text-center py-10 bg-slate-50 text-slate-400 italic">
                  Data murid tidak ditemukan. Sila periksa kata kunci pencarian Anda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Excel Workbook Sheet Tabs Bar */}
      <div className="bg-slate-100 border-t border-slate-200 px-3 py-1 flex items-center justify-between text-[11px] text-slate-600 font-sans select-none no-print">
        <div className="flex items-center gap-0.5">
          <button className="bg-white border-x border-t border-slate-300 px-3 py-1.5 font-semibold text-emerald-800 flex items-center gap-1.5 rounded-t shadow-xs">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span>
            Sheet1 (Rapor 5NK Roster)
          </button>
          <span className="text-slate-400 mx-1">|</span>
          <button className="text-slate-400 hover:text-slate-600 px-2.5 py-1">
            + Tambah Sheet
          </button>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          Ready | CAPS LOCK OFF | ZOOM 100%
        </div>
      </div>
    </div>
  );
}
