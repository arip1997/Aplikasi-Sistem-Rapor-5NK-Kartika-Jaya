import { useState, useId } from 'react';
import { Student, Category, ScoreKey, scoreOptions } from '../types';
import { ChevronDown, Search, Check, AlertCircle, Sparkles, Filter, FileSpreadsheet, RotateCcw } from 'lucide-react';

interface ExcelGridProps {
  students: Student[];
  categories: Category[];
  selectedClass: string;
  onUpdateStudentGrades: (studentId: string, grades: Record<string, ScoreKey>) => void;
  onUpdateComments: (studentId: string, kesimpulan: string, Notes: string) => void;
  onSelectStudent: (student: Student) => void;
  selectedStudent: Student | null;
}

export default function ExcelGrid({
  students,
  categories,
  selectedClass,
  onUpdateStudentGrades,
  onUpdateComments,
  onSelectStudent,
  selectedStudent,
}: ExcelGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCell, setActiveCell] = useState<{ studentId: string; indicatorId: string } | null>(null);
  const [filterCompleted, setFilterCompleted] = useState<'all' | 'completed' | 'pending'>('all');
  
  const searchInputId = useId();

  // Extract list of all indicators flattened for easy table mapping
  const allIndicators = categories.flatMap(cat => 
    cat.indicators.map(ind => ({
      categoryId: cat.id,
      categoryName: cat.name,
      ...ind
    }))
  );

  // Filter students
  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.nis.includes(searchTerm);
    const matchesCompleted = filterCompleted === 'all' ? true :
                            filterCompleted === 'completed' ? student.completed : !student.completed;
    return matchesSearch && matchesCompleted;
  });

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

  const handleScoreSelect = (student: Student, indicatorId: string, score: ScoreKey) => {
    const nextGrades = { ...student.grades, [indicatorId]: score };
    
    // Auto-compute completed status (all 15 indicators scored)
    onUpdateStudentGrades(student.id, nextGrades);
    setActiveCell(null);
  };

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
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              id={searchInputId}
              type="text"
              placeholder="Cari Murid / NIS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44 md:w-56"
            />
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
      <div className="bg-white border-b border-slate-200 px-3 py-1.5 flex items-center gap-2 text-xs font-mono text-slate-600 no-print">
        <div className="bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold border border-slate-200 selection:bg-transparent">
          {activeCell ? `FX: ${allIndicators.find(i => i.id === activeCell.indicatorId)?.id}` : 'INFO'}
        </div>
        <div className="text-slate-300 font-bold flex-none text-[10px]">|</div>
        <div className="flex-1 truncate pl-1 text-[11px] text-slate-600 flex items-center gap-1.5">
          {activeCell ? (
            <>
              <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
              <span className="font-semibold text-slate-800">{getActiveCellDescription()}</span>
            </>
          ) : (
            <span className="text-slate-400 italic">Klik pada kotak penilaian murid untuk memicu menu pop-up input nilai</span>
          )}
        </div>
      </div>

      {/* 3. Grid Table Container */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full border-separate border-spacing-0 text-left">
          {/* Header Rows */}
          <thead className="sticky top-0 bg-slate-100 z-10 text-xs text-slate-700 selection:bg-transparent shadow-xs">
            {/* Category row */}
            <tr>
              <th className="bg-slate-200 border-r border-b border-slate-300 p-2 text-center font-bold sticky left-0 z-20 min-w-[50px]">No</th>
              <th className="bg-slate-200 border-r border-b border-slate-300 p-2 sticky left-[50px] z-20 min-w-[140px]">NIS / Siswa</th>
              
              {categories.map((cat, idx) => {
                const colors = ['bg-emerald-50', 'bg-blue-50', 'bg-purple-50', 'bg-amber-50', 'bg-rose-50'];
                const bgClass = colors[idx % colors.length];
                return (
                  <th key={cat.id} className={`${bgClass} border-r border-b border-slate-300 px-2 py-1.5 font-bold text-center`} colSpan={cat.indicators.length}>
                    {cat.name}
                  </th>
                );
              })}
            </tr>
            {/* Indicator row */}
            <tr className="text-[10px] text-slate-500 font-mono bg-slate-50">
              <th className="border-r border-b border-slate-300 text-center sticky left-0 bg-slate-50 z-20">-</th>
              <th className="border-r border-b border-slate-300 px-2 py-1 sticky left-[50px] bg-slate-50 z-20">NIS & Nama</th>
              
              {categories.map((cat, idx) => {
                const textColors = ['text-emerald-700', 'text-blue-700', 'text-purple-700', 'text-amber-700', 'text-rose-700'];
                const hoverColors = ['hover:bg-emerald-100', 'hover:bg-blue-100', 'hover:bg-purple-100', 'hover:bg-amber-100', 'hover:bg-rose-100'];
                const tClass = textColors[idx % textColors.length];
                const hClass = hoverColors[idx % hoverColors.length];
                
                return cat.indicators.map((ind) => (
                  <th key={ind.id} title={ind.text} className={`border-r border-b border-slate-300 px-1 text-center font-bold ${tClass} cursor-help ${hClass}`}>
                    {ind.id}
                  </th>
                ));
              })}
            </tr>
          </thead>

          {/* Student Grid Roster */}
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((stud, idx) => {
                const isSelected = selectedStudent?.id === stud.id;
                
                return (
                  <tr 
                    key={stud.id} 
                    className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-emerald-50/40' : ''}`}
                  >
                    {/* Index Count Column */}
                    <td className="border-r border-b border-slate-200 text-center text-slate-400 font-mono select-none p-2 sticky left-0 bg-white z-5 font-medium">
                      {idx + 1}
                    </td>

                    {/* Student Name Key Column */}
                    <td className={`border-r border-b border-slate-200 p-2 sticky left-[50px] bg-white z-5 font-semibold min-w-[200px] truncate`}>
                      <button 
                        onClick={() => onSelectStudent(stud)}
                        className="text-left hover:text-emerald-700 hover:underline flex items-center justify-between w-full"
                      >
                        <div className="truncate">
                          <p className="text-slate-800 font-semibold text-[11px] leading-tight truncate">{stud.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">NIS: {stud.nis}</p>
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
                            <span className={`inline-block px-1.5 py-1 text-[10px] rounded-md border font-semibold select-none ${getScoreColorClass(score)}`}>
                              {score}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300 font-bold animate-pulse italic">-</span>
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
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={17} className="text-center py-10 bg-slate-50 text-slate-400 italic">
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
