import { useState, useMemo } from 'react';
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
  X
} from 'lucide-react';

interface EvaluationFormProps {
  students: Student[];
  categories: Category[];
  selectedStudentId: string;
  onSelectStudentId: (id: string) => void;
  onUpdateStudent: (student: Student) => void;
  onViewReport: () => void;
}

export default function EvaluationForm({
  students,
  categories,
  selectedStudentId,
  onSelectStudentId,
  onUpdateStudent,
  onViewReport,
}: EvaluationFormProps) {
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [studentSearch, setStudentSearch] = useState('');

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

  const activeCategory = categories[activeCategoryIndex];

  const handleScoreChange = (indicatorId: string, score: ScoreKey) => {
    if (!student) return;
    const nextGrades = { ...student.grades, [indicatorId]: score };
    
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
    const finalCatatanOrangTua = `Terima kasih bapak/ibu Wali Kelas atas laporannya. Kami sekeluarga berkomitmen penuh membimbingnya di luar sekolah.`;

    onUpdateStudent({
      ...student,
      kesimpulan: finalKesimpulan,
      catatanWali: finalCatatanWali,
      catatanOrangTua: finalCatatanOrangTua
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
          <div className="flex items-center gap-3 text-xs w-full md:w-auto justify-end">
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
          <div className="w-full md:w-56 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-2 overflow-y-auto shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Aspek Penilaian</span>
            {categories.map((cat, idx) => {
              // Count completed indicators in this category
              const catInds = cat.indicators.map(i => i.id);
              const doneCount = catInds.filter(id => student.grades[id]).length;
              const isCatCompleted = doneCount === catInds.length;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryIndex(idx)}
                  className={`w-full py-2 px-3 text-left rounded-lg text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                    activeCategoryIndex === idx 
                      ? 'bg-emerald-600 text-white' 
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  <span className="truncate">{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeCategoryIndex === idx
                      ? 'bg-emerald-700 text-white'
                      : isCatCompleted 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-slate-200 text-slate-600'
                  }`}>
                    {doneCount} / {catInds.length}
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => setActiveCategoryIndex(categories.length)}
              className={`w-full py-2 px-3 text-left rounded-lg text-xs font-bold flex items-center justify-between transition-colors cursor-pointer mt-4 ${
                activeCategoryIndex === categories.length 
                  ? 'bg-emerald-600 text-white' 
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Masukan Deskripsi/Catatan
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeCategoryIndex === categories.length
                  ? 'bg-emerald-700 text-white'
                  : (student.kesimpulan && student.catatanWali) 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-slate-200 text-slate-600'
              }`}>
                {(student.kesimpulan && student.catatanWali) ? '✓' : '...'}
              </span>
            </button>
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
                    
                    return (
                      <div key={ind.id} className="border border-slate-200 rounded-xl p-4 flex flex-col gap-3 selection:bg-transparent">
                        <div className="flex items-start gap-2">
                          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded mt-0.5">
                            {ind.id}
                          </span>
                          <p className="text-xs font-semibold text-slate-700 leading-relaxed">
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
                      rows={4}
                      placeholder="Tulis uraian kesimpulan perilaku siswa..."
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
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
                      rows={3}
                      placeholder="Uraian motivasi bagi perkembangan siswa..."
                      className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-sans leading-relaxed focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Catatan Orang Tua */}
                  <div className="flex flex-col gap-1.5 text-xs">
                    <label htmlFor="form-catatan-ortu" className="font-bold text-slate-600 text-[11px] uppercase tracking-wider">Catatan Orang Tua/Wali:</label>
                    <textarea
                      id="form-catatan-ortu"
                      value={student.catatanOrangTua || ''}
                      onChange={(e) => handleCommentChange('catatanOrangTua', e.target.value)}
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
                <button
                  onClick={() => setActiveCategoryIndex(prev => prev + 1)}
                  className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  Aspek Berikutnya <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={onViewReport}
                  className="py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-100 transform active:translate-y-px transition-all"
                >
                  <UserCheck className="h-4 w-4" /> Simpan & Lihat Pratinjau Rapor
                </button>
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
