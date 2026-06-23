import { useState, useMemo } from 'react';
import { Student, Category, ScoreKey, scoreOptions, KopSekolah } from '../types';
import { exportClassToExcel } from '../utils';
import html2pdf from 'html2pdf.js';
import D3CriteriaDistributionChart from './D3CriteriaDistributionChart';
import { 
  BarChart4, 
  Search, 
  Users, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Award,
  BookOpen,
  PieChart,
  Flame,
  Grid3X3,
  Info,
  Activity,
  Sparkles,
  FileText,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart as RechartsPieChart,
  Pie,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';

const getNumericScore = (score: string | undefined): number => {
  if (!score) return 0;
  switch (score) {
    case 'BSB': return 4;
    case 'B': return 3;
    case 'MB': return 2;
    case 'BB': return 1;
    default: return 0;
  }
};

const getScoreLabelFromValue = (value: number): string => {
  if (value >= 3.5) return 'BSB (Sangat Baik)';
  if (value >= 2.5) return 'B (Berkembang)';
  if (value >= 1.5) return 'MB (Mulai Berkembang)';
  if (value > 0) return 'BB (Belum Berkembang)';
  return 'Belum Dinilai';
};

interface GradeRecapProps {
  students: Student[];
  categories: Category[];
  selectedClass: string;
  onSelectStudent: (student: Student) => void;
  onDownloadAllClassPdf?: () => void;
  isGeneratingBatchPdf?: boolean;
  activeWaliKelasName?: string;
  activeWaliKelasNip?: string;
  kopSekolah?: KopSekolah;
}

export default function GradeRecap({
  students,
  categories,
  selectedClass,
  onSelectStudent,
  onDownloadAllClassPdf,
  isGeneratingBatchPdf = false,
  activeWaliKelasName = '',
  activeWaliKelasNip = '',
  kopSekolah,
}: GradeRecapProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [chartViewMode, setChartViewMode] = useState<'indicators' | 'students'>('indicators');
  const [selectedRadarStudentId, setSelectedRadarStudentId] = useState<string>('');
  const [isPrintingRecap, setIsPrintingRecap] = useState(false);
  const [isGeneratingRecapPdf, setIsGeneratingRecapPdf] = useState(false);

  const handleDownloadHomeroomExcel = () => {
    exportClassToExcel(students, selectedClass, activeWaliKelasName || 'Wali Kelas', categories);
  };

  const totalIndicatorsCount = useMemo(() => {
    return categories.reduce((total, cat) => total + (cat.indicators?.length || 0), 0);
  }, [categories]);

  const getStudentMetrics = (stud: Student) => {
    const gradesObj = stud.grades || {};
    // Calculate filled based on existence in student's grades of value in ['BSB', 'B', 'MB', 'BB']
    const filledCount = Object.keys(gradesObj).filter(k => {
      const val = gradesObj[k];
      return val && ['BSB', 'B', 'MB', 'BB'].includes(val);
    }).length;
    
    let bsb = 0, b = 0, mb = 0, bb = 0;
    Object.values(gradesObj).forEach(val => {
      if (val === 'BSB') bsb++;
      else if (val === 'B') b++;
      else if (val === 'MB') mb++;
      else if (val === 'BB') bb++;
    });
    
    const completionPercent = totalIndicatorsCount > 0 ? Math.round((filledCount / totalIndicatorsCount) * 100) : 0;
    const isCompleted = filledCount === totalIndicatorsCount && !!stud.kesimpulan && !!stud.catatanWali;
    
    return {
      filledCount,
      pendingCount: Math.max(0, totalIndicatorsCount - filledCount),
      bsb,
      b,
      mb,
      bb,
      completionPercent,
      isCompleted,
      isKesimpulanFilled: !!stud.kesimpulan && stud.kesimpulan.trim().length > 0,
      isCatatanWaliFilled: !!stud.catatanWali && stud.catatanWali.trim().length > 0
    };
  };

  const handleDownloadCompletionReportPDF = async () => {
    setIsGeneratingRecapPdf(true);
    setIsPrintingRecap(true);
    
    // Give time to render the hidden DOM element
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const element = document.getElementById('completion-status-report-pdf-content');
    if (!element) {
      alert("Gagal memproses elemen cetak untuk ringkasan laporan!");
      setIsGeneratingRecapPdf(false);
      setIsPrintingRecap(false);
      return;
    }

    try {
      const opt = {
        margin: [8, 10, 8, 10], // top, left, bottom, right in mm
        filename: `Ringkasan_Laporan_5NK_Kelas_${selectedClass}.pdf`,
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: {
          scale: 2.2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };

      await html2pdf().set(opt as any).from(element).save();
    } catch (err) {
      console.error("Gagal mengekspor Ringkasan Rapor Yayasan:", err);
      alert("Terjadi kesalahan teknis saat mengekspor PDF.");
    } finally {
      setIsGeneratingRecapPdf(false);
      setIsPrintingRecap(false);
    }
  };

  // Resolve current active student for the radar chart representation
  const radarStudent = useMemo(() => {
    if (!students || students.length === 0) return null;
    const found = students.find(s => s.id === selectedRadarStudentId);
    return found || students[0];
  }, [students, selectedRadarStudentId]);

  const radarChartData = useMemo(() => {
    if (!radarStudent || categories.length === 0) return [];

    return categories.map(cat => {
      const indIds = cat.indicators.map(i => i.id);
      
      // Calculate active student average in this category
      let studentSum = 0;
      let studentFilledCount = 0;
      indIds.forEach(id => {
        const score = radarStudent.grades[id];
        if (score) {
          studentFilledCount++;
          studentSum += getNumericScore(score);
        }
      });
      const studentAvg = studentFilledCount > 0 ? parseFloat((studentSum / studentFilledCount).toFixed(2)) : 0;

      // Calculate class average in this category
      let classSum = 0;
      let classFilledCount = 0;
      students.forEach(st => {
        indIds.forEach(id => {
          const score = st.grades[id];
          if (score) {
            classFilledCount++;
            classSum += getNumericScore(score);
          }
        });
      });
      const classAvg = classFilledCount > 0 ? parseFloat((classSum / classFilledCount).toFixed(2)) : 0;

      return {
        subject: cat.id, // short ID for polar axes e.g. "N1", "N2"
        categoryName: cat.name,
        'Nilai Siswa': studentAvg,
        'Rata-rata Kelas': classAvg,
        fullMark: 4
      };
    });
  }, [students, categories, radarStudent]);

  // Heatmap interactive states
  const [selectedHeatmapCategory, setSelectedHeatmapCategory] = useState<string>('ALL');
  const [selectedCell, setSelectedCell] = useState<{ studentId: string; indicatorId: string; score: string; studentName: string; indicatorText: string; categoryName: string } | null>(null);

  // Flat indicators list
  const allIndicators = useMemo(() => {
    return categories.flatMap(cat => 
      cat.indicators.map(ind => ({
        categoryId: cat.id,
        categoryName: cat.name,
        ...ind
      }))
    );
  }, [categories]);

  // Heatmap Indicators based on category filter
  const heatmapIndicators = useMemo(() => {
    if (selectedHeatmapCategory === 'ALL') return allIndicators;
    return allIndicators.filter(ind => ind.categoryId === selectedHeatmapCategory);
  }, [allIndicators, selectedHeatmapCategory]);

  // Calculation engine to find Top topics that need re-teaching (based on MB + BB score rates)
  const hardestIndicators = useMemo(() => {
    if (students.length === 0) return [];
    
    const results = allIndicators.map(ind => {
      let bbCount = 0;
      let mbCount = 0;
      let bCount = 0;
      let bsbCount = 0;
      let totalFilled = 0;
      
      students.forEach(st => {
        const score = st.grades[ind.id];
        if (score) {
          totalFilled++;
          if (score === 'BB') bbCount++;
          else if (score === 'MB') mbCount++;
          else if (score === 'B') bCount++;
          else if (score === 'BSB') bsbCount++;
        }
      });
      
      const difficultyCount = bbCount + mbCount;
      const difficultyRate = totalFilled > 0 ? Math.round((difficultyCount / totalFilled) * 100) : 0;
      const bbRate = totalFilled > 0 ? Math.round((bbCount / totalFilled) * 100) : 0;
      const mbRate = totalFilled > 0 ? Math.round((mbCount / totalFilled) * 100) : 0;
      
      return {
        ...ind,
        bbCount,
        mbCount,
        difficultyCount,
        difficultyRate,
        bbRate,
        mbRate,
        totalFilled,
        bsbCount,
        bCount
      };
    });
    
    // Sort descending by difficulty rate (BB + MB percentage). If tie, by absolute count.
    return results
      .filter(r => r.totalFilled > 0)
      .sort((a, b) => b.difficultyRate - a.difficultyRate || b.difficultyCount - a.difficultyCount)
      .slice(0, 3);
  }, [students, allIndicators]);

  const allIndicatorIds = useMemo(() => allIndicators.map(i => i.id), [allIndicators]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalStudents = students.length;
    if (totalStudents === 0) return { completed: 0, percentage: 0, bsbCount: 0, bCount: 0, mbCount: 0, bbCount: 0, totalScores: 0 };
    
    let completed = 0;
    let bsbCount = 0;
    let bCount = 0;
    let mbCount = 0;
    let bbCount = 0;
    let totalScores = 0;

    students.forEach(st => {
      // Calculate completion based on active indicators
      const scoredCount = Object.keys(st.grades).filter(id => allIndicatorIds.includes(id)).length;
      const isComplete = scoredCount === allIndicatorIds.length;
      if (isComplete) completed++;

      // Count scores
      allIndicatorIds.forEach(id => {
        const score = st.grades[id];
        if (score) {
          totalScores++;
          if (score === 'BSB') bsbCount++;
          else if (score === 'B') bCount++;
          else if (score === 'MB') mbCount++;
          else if (score === 'BB') bbCount++;
        }
      });
    });

    const percentage = Math.round((completed / totalStudents) * 100);

    return {
      completed,
      percentage,
      bsbCount,
      bCount,
      mbCount,
      bbCount,
      totalScores
    };
  }, [students, allIndicatorIds]);

  // Indicator-level analysis
  const indicatorStats = useMemo(() => {
    return allIndicators.map(ind => {
      let bsb = 0;
      let b = 0;
      let mb = 0;
      let bb = 0;
      let filled = 0;

      students.forEach(st => {
        const score = st.grades[ind.id];
        if (score) {
          filled++;
          if (score === 'BSB') bsb++;
          else if (score === 'B') b++;
          else if (score === 'MB') mb++;
          else if (score === 'BB') bb++;
        }
      });

      const total = students.length;
      return {
        id: ind.id,
        text: ind.text,
        categoryName: ind.categoryName,
        bsb: total > 0 ? Math.round((bsb / total) * 100) : 0,
        b: total > 0 ? Math.round((b / total) * 100) : 0,
        mb: total > 0 ? Math.round((mb / total) * 100) : 0,
        bb: total > 0 ? Math.round((bb / total) * 100) : 0,
        filled: total > 0 ? Math.round((filled / total) * 100) : 0,
        unfilled: total > 0 ? total - filled : 0
      };
    });
  }, [students, allIndicators]);

  // Data for Chart 1: Global distribution
  const chartDataGlobal = useMemo(() => {
    return [
      { name: 'BSB', value: stats.bsbCount, label: 'Sangat Baik', color: '#10b981' },
      { name: 'BSH / B', value: stats.bCount, label: 'BSH (Berkembang Sesuai Harapan)', color: '#3b82f6' },
      { name: 'MB', value: stats.mbCount, label: 'Mulai Berkembang', color: '#f59e0b' },
      { name: 'BB', value: stats.bbCount, label: 'Belum Berkembang', color: '#ef4444' }
    ];
  }, [stats]);

  // Data for Chart 2: Category distribution comparison
  const chartDataCategories = useMemo(() => {
    return categories.map(cat => {
      const indIds = cat.indicators.map(i => i.id);
      let bsb = 0, b = 0, mb = 0, bb = 0;
      students.forEach(st => {
        indIds.forEach(id => {
          const score = st.grades[id];
          if (score) {
            if (score === 'BSB') bsb++;
            else if (score === 'B') b++;
            else if (score === 'MB') mb++;
            else if (score === 'BB') bb++;
          }
        });
      });
      return {
        name: cat.name.length > 20 ? `${cat.name.substring(0, 16)}...` : cat.name,
        fullName: cat.name,
        'BSB': bsb,
        'BSH': b,
        'MB': mb,
        'BB': bb,
      };
    });
  }, [students, categories]);

  // Data for Chart 3: Stacked Bar - Indicator-level student distribution percentage
  const chartDataIndicatorsStacked = useMemo(() => {
    return indicatorStats.map(stat => ({
      name: stat.id,
      label: stat.text.length > 40 ? `${stat.text.substring(0, 40)}...` : stat.text,
      fullText: stat.text,
      categoryName: stat.categoryName,
      'BSB': stat.bsb,
      'BSH': stat.b,
      'MB': stat.mb,
      'BB': stat.bb
    }));
  }, [indicatorStats]);

  // Data for Chart 4: Stacked Bar - Student-level score distribution percentage
  const chartDataStudentsStacked = useMemo(() => {
    return students.map(st => {
      let bsb = 0, b = 0, mb = 0, bb = 0;
      allIndicatorIds.forEach(id => {
        const score = st.grades[id];
        if (score === 'BSB') bsb++;
        else if (score === 'B') b++;
        else if (score === 'MB') mb++;
        else if (score === 'BB') bb++;
      });
      
      const totalScored = bsb + b + mb + bb || 1;
      
      return {
        name: st.name.length > 15 ? `${st.name.substring(0, 15)}...` : st.name,
        fullName: st.name,
        'BSB': Math.round((bsb / totalScored) * 100),
        'BSH': Math.round((b / totalScored) * 100),
        'MB': Math.round((mb / totalScored) * 105) > 100 ? 100 : Math.round((mb / totalScored) * 100),
        'BB': Math.round((bb / totalScored) * 100),
      };
    });
  }, [students, allIndicatorIds]);

  // Filter study roster
  const filteredStudents = useMemo(() => {
    return students.filter(st => 
      st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.nis.includes(searchTerm)
    );
  }, [students, searchTerm]);

  const getScoreColorClass = (key: ScoreKey) => {
    switch (key) {
      case 'BSB': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MB': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'BB': return 'bg-rose-100 text-rose-800 border-rose-200';
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full overflow-y-auto pr-1">
      {/* Page Title & Class Batch Action Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 rounded-xl p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
        <div>
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <BarChart4 className="h-5 w-5" />
            Laporan Rekapitulasi & Analisis Nilai Kelas {selectedClass}
          </h2>
          <p className="text-xs text-emerald-100 mt-1">
            Analisis sebaran nilai perilaku 5-NK murid secara visual. Anda dapat melihat radar rata-rata kelas, peta panas (heatmap) nilai, serta mengunduh kompilasi PDF.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {onDownloadAllClassPdf && (
            <button
              onClick={onDownloadAllClassPdf}
              disabled={isGeneratingBatchPdf}
              className="flex items-center justify-center gap-2 bg-white text-emerald-800 font-bold px-4 py-2 sm:py-2.5 rounded-lg text-xs hover:bg-emerald-50 transition-all shadow-md transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shrink-0"
            >
              {isGeneratingBatchPdf ? (
                <>
                  <Loader2 className="h-4 w-4 text-emerald-800 animate-spin" />
                  <span>Mengekspor PDF Kelas...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 text-emerald-700" />
                  <span>Download PDF Seluruh Kelas</span>
                </>
              )}
            </button>
          )}

          {activeWaliKelasName && (
            <button
              onClick={handleDownloadHomeroomExcel}
              className="flex items-center justify-center gap-2 bg-emerald-750 text-white font-bold px-4 py-2 sm:py-2.5 rounded-lg text-xs hover:bg-emerald-800 transition-all shadow-md transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border border-emerald-600 shrink-0"
              title={`Unduh Salinan Rekap Excel khusus untuk Wali Kelas yang sedang aktif (${activeWaliKelasName})`}
            >
              <FileSpreadsheet className="h-4 w-4 text-white" />
              <span>Salinan Rekap Wali Kelas ({activeWaliKelasName.split(' ')[0]})</span>
            </button>
          )}

          <button
            onClick={handleDownloadCompletionReportPDF}
            disabled={isGeneratingRecapPdf}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold px-4 py-2 sm:py-2.5 rounded-lg text-xs hover:bg-indigo-700 transition-all shadow-md transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed shrink-0 border border-indigo-500"
            title="Download PDF Ringkasan Penyelesaian Rapor Kelas (1 Halaman A4 Landscape) untuk diserahkan ke pihak Yayasan / Kantor"
          >
            {isGeneratingRecapPdf ? (
              <>
                <Loader2 className="h-4 w-4 text-white animate-spin" />
                <span>Mengekspor Ringkasan...</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 text-indigo-200" />
                <span>PDF Ringkasan Yayasan</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 1. Header Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-4">
          <div className="bg-emerald-100 text-emerald-700 p-3 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Total Siswa</p>
            <h3 className="text-xl font-bold text-slate-800">{students.length} Orang</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Kelas {selectedClass}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-4">
          <div className="bg-indigo-100 text-indigo-700 p-3 rounded-lg">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-400 font-semibold uppercase">Selesai Dinilai</p>
            <h3 className="text-xl font-bold text-slate-800">
              {stats.completed} <span className="text-xs font-normal text-slate-400">/ {students.length}</span>
            </h3>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${stats.percentage}%` }}></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center gap-4">
          <div className="bg-amber-100 text-amber-700 p-3 rounded-lg">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-400 font-semibold uppercase">Persentase Pengisian</p>
            <h3 className="text-xl font-bold text-slate-800">{stats.percentage}%</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Kesiapan cetak rapor kelas</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-center">
          <p className="text-[11px] text-slate-400 font-bold uppercase mb-1.5">Sebaran Nilai Kelas</p>
          <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-bold">
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 py-1 rounded" title="Berkembang Sangat Baik">
              <div>BSB</div>
              <div className="text-[11px] mt-0.5 font-mono">{stats.bsbCount}</div>
            </div>
            <div className="bg-blue-50 text-blue-800 border border-blue-200 py-1 rounded" title="Berkembang">
              <div>B</div>
              <div className="text-[11px] mt-0.5 font-mono">{stats.bCount}</div>
            </div>
            <div className="bg-amber-50 text-amber-800 border border-amber-200 py-1 rounded" title="Mulai Berkembang">
              <div>MB</div>
              <div className="text-[11px] mt-0.5 font-mono">{stats.mbCount}</div>
            </div>
            <div className="bg-rose-50 text-rose-800 border border-rose-200 py-1 rounded" title="Belum Berkembang">
              <div>BB</div>
              <div className="text-[11px] mt-0.5 font-mono">{stats.bbCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 1.5. Radar Chart Capaian Siswa (5NK) */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
              <Activity className="h-4.5 w-4.5 text-indigo-600" />
              Grafik Radar Capaian Karakter Siswa (5NK Spider Chart)
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">
              Analisis perbandingan kekuatan 5 dimensi karakter siswa terhadap rata-rata pencapaian kelas
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <span className="text-[10.5px] font-bold text-slate-500">Pilih Siswa:</span>
            <select
              value={radarStudent?.id || ''}
              onChange={(e) => setSelectedRadarStudentId(e.target.value)}
              className="bg-white border border-slate-250 text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              {students.map(st => (
                <option key={st.id} value={st.id}>{st.name}</option>
              ))}
            </select>
          </div>
        </div>

        {students.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            {/* Radar representation */}
            <div className="lg:col-span-2 bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-center min-h-[300px]">
              <div className="h-[280px] w-full max-w-lg">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarChartData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      stroke="#475569" 
                      fontSize={11} 
                      fontWeight="bold" 
                      tick={({ payload, x, y, textAnchor, index }) => (
                        <g className="recharts-layer recharts-polar-angle-axis-tick">
                          <text
                            x={x}
                            y={y}
                            textAnchor={textAnchor}
                            fill="#334155"
                            fontSize="10px"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            <tspan x={x} dy="0">{payload.value}</tspan>
                            <tspan x={x} dy="12" fill="#94a3b8" fontSize="8px" fontWeight="normal">
                              {categories[index]?.name.substring(0, 15)}...
                            </tspan>
                          </text>
                        </g>
                      )}
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 4]} 
                      tickCount={5} 
                      stroke="#94a3b8" 
                      fontSize={9} 
                    />
                    <Radar 
                      name={radarStudent?.name || 'Siswa'} 
                      dataKey="Nilai Siswa" 
                      stroke="#4f46e5" 
                      fill="#818cf8" 
                      fillOpacity={0.35} 
                    />
                    <Radar 
                      name="Rata-rata Kelas" 
                      dataKey="Rata-rata Kelas" 
                      stroke="#10b981" 
                      fill="#34d399" 
                      fillOpacity={0.15} 
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(value: any, name: any, props: any) => {
                        const scoreVal = parseFloat(value);
                        return [`${scoreVal} / 4.0 (${getScoreLabelFromValue(scoreVal)})`, name];
                      }}
                      labelFormatter={(label, items) => {
                        if (items && items[0]) {
                          return <span className="font-extrabold text-slate-800">{items[0].payload.categoryName} ({label})</span>;
                        }
                        return label;
                      }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI-like Dynamic Analysis & Advice */}
            <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4.5 flex flex-col gap-4 self-stretch justify-between">
              <div>
                <span className="text-[9px] bg-indigo-100 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded font-extrabold uppercase tracking-wide inline-block mb-3">
                  Insight Inteligensi Evaluasi
                </span>
                <h5 className="font-bold text-slate-800 text-xs">
                  Analisis Profil Capaian: {radarStudent?.name}
                </h5>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed font-sans mt-0.5 mb-4">
                  Menganalisis keseimbangan perkembangan nilai spiritual, sosial, kognitif, dan kepemimpinan berdasar grafik 5NK.
                </p>

                {/* dynamic findings */}
                <div className="flex flex-col gap-3">
                  {radarChartData.map(d => {
                    const diff = d['Nilai Siswa'] - d['Rata-rata Kelas'];
                    const statusText = diff > 0.2 ? 'Di atas rata-rata kelas' : diff < -0.2 ? 'Perlu perhatian khusus' : 'Setara rata-rata kelas';
                    const textColor = diff > 0.2 ? 'text-emerald-600' : diff < -0.2 ? 'text-rose-600' : 'text-slate-600';
                    const bgCircle = diff > 0.2 ? 'bg-emerald-500' : diff < -0.2 ? 'bg-rose-500' : 'bg-slate-400';

                    return (
                      <div key={d.subject} className="flex justify-between items-center text-[11px] font-sans border-b border-dashed border-slate-200/60 pb-1.5 last:border-none last:pb-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${bgCircle}`}></span>
                          <span className="font-bold text-slate-705" title={d.categoryName}>{d.subject}</span>
                          <span className="text-slate-400 text-[9.5px]">({d.categoryName.substring(0, 16)}...)</span>
                        </div>
                        <span className={`font-semibold font-mono text-[10px] ${textColor}`}>
                          {d['Nilai Siswa']} (vs {d['Rata-rata Kelas']})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-200 flex gap-2">
                <Sparkles className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
                <div className="text-[10.5px] text-slate-500 font-sans leading-relaxed">
                  <span className="font-extrabold text-slate-700">Rekomendasi Rapor: </span>
                  {radarChartData.some(d => d['Nilai Siswa'] < 2.0) 
                    ? "Terdapat dimensi karakter siswa yang nilainya masih berada di tingkat Mulai atau Belum Berkembang. Utamakan perbaikan pilar bersangkutan sebelum mencetak rapor perkembangan final." 
                    : "Kurva perkembangan siswa sangat kokoh dan konsisten di seluruh aspek 5NK. Pola pembiasaan ini sangat layak diapresiasi dalam ulasan guru kelas."}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-14 text-center text-slate-400 italic text-[11px] bg-slate-50 border border-slate-100 rounded-xl">
            Belum ada data siswa untuk divisualisasikan.
          </div>
        )}
      </div>

      {/* 2. DASHBOARD VISUALISASI DISTRIBUSI NILAI INDIKATOR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        {/* CHART 1: COLUMN CHART - SEBARAN GLOBAL */}
        <div className="flex flex-col gap-4">
          <div>
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
              <PieChart className="h-4 w-4 text-indigo-600" />
              Grafik Distribusi Predikat Rapor Kelas
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">Beban akumulasi kriteria penilaian 5NK yang dicapai siswa</p>
          </div>

          <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-center min-h-[240px]">
            {stats.totalScores > 0 ? (
              <div className="h-[210px] w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={chartDataGlobal} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(value: any, name: any, props: any) => [`${value} entri (${Math.round((value / (stats.totalScores || 1)) * 100)}%)`, props.payload.label]}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {chartDataGlobal.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 italic text-[11px] py-10">
                Belum ada data skor yang terisi untuk memvisualisasikan grafik sebaran.
              </div>
            )}
          </div>
        </div>

        {/* CHART 2: STACKED HORIZONTAL BAR - KATEGORI PERFORMANCE */}
        <div className="flex flex-col gap-4">
          <div>
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
              <BarChart4 className="h-4 w-4 text-emerald-600" />
              Komparasi Performansi Karakter 5NK
            </h4>
            <p className="text-[10px] text-slate-400 font-medium font-sans">Analisis rata-rata sebaran capaian di 5 pilar karakter utama</p>
          </div>

          <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-center min-h-[240px]">
            {stats.totalScores > 0 ? (
              <div className="h-[210px] w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={chartDataCategories} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '11px' }} 
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }} />
                    <Bar dataKey="BSB" name="BSB" stackId="a" fill="#10b981" />
                    <Bar dataKey="BSH" name="BSH" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="MB" name="MB" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="BB" name="BB" stackId="a" fill="#ef4444" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 italic text-[11px] py-10">
                Belum ada data skor yang terisi untuk membandingkan performansi karakter.
              </div>
            )}
          </div>
        </div>

        {/* CHART 3: D3.JS HISTOGRAM DISTRIBUTION PANEL (NEW REQ) */}
        <div className="flex flex-col gap-4">
          <div>
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Sains Data & Tren Capaian (D3.js Grid)
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">Grafik interaktif D3.js sebaran kuantitatif nilai per kriteria</p>
          </div>

          <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-center min-h-[240px]">
            <D3CriteriaDistributionChart students={students} categories={categories} />
          </div>
        </div>
      </div>

      {/* 2.5 STACKED BAR CHART - PERCENTAGE DISTRIBUTION FOR CLASS */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
              <BarChart4 className="h-4 w-4 text-emerald-600" />
              Grafik Sebaran Tingkat Capaian Kelas (Stacked Bar Chart)
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">
              Persentase murid pada setiap tingkat pencapaian (BSB, BSH, MB, BB) untuk kelas yang aktif
            </p>
          </div>

          {/* Toggle View Mode */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg self-start sm:self-auto shrink-0 border border-slate-200">
            <button
              onClick={() => setChartViewMode('indicators')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                chartViewMode === 'indicators'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Per Indikator (% Siswa)
            </button>
            <button
              onClick={() => setChartViewMode('students')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                chartViewMode === 'students'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Per Siswa (% Nilai)
            </button>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-center min-h-[300px]">
          {stats.totalScores > 0 ? (
            <div className="w-full overflow-x-hidden">
              <div 
                style={{ 
                  height: chartViewMode === 'indicators' 
                    ? '440px' 
                    : `${Math.max(280, students.length * 30)}px` 
                }} 
                className="w-full pt-2"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    layout="vertical"
                    data={(chartViewMode === 'indicators' ? chartDataIndicatorsStacked : chartDataStudentsStacked) as any[]}
                    margin={{ top: 10, right: 25, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis 
                      type="number" 
                      domain={[0, 100]} 
                      tickFormatter={(val) => `${val}%`} 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      stroke="#64748b" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      width={65}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(value: any, name: any) => [`${value}%`, name === 'BSH' ? 'BSH (Berkembang Sesuai Harapan)' : name]}
                      labelFormatter={(label, items) => {
                        if (items && items[0]) {
                          const payload = items[0].payload;
                          if (chartViewMode === 'indicators') {
                            return (
                              <div className="font-bold flex flex-col gap-0.5 text-slate-800 max-w-xs whitespace-normal">
                                <span>{payload.name}: {payload.fullText}</span>
                                <span className="text-[10px] font-normal text-slate-400">Kategori: {payload.categoryName}</span>
                              </div>
                            );
                          } else {
                            return <span className="font-bold text-slate-800">{payload.fullName}</span>;
                          }
                        }
                        return label;
                      }}
                    />
                    <Legend 
                      iconType="circle" 
                      iconSize={8} 
                      wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} 
                      formatter={(value) => {
                        if (value === 'BSB') return 'BSB (Sangat Baik)';
                        if (value === 'BSH') return 'BSH (Berkembang)';
                        if (value === 'MB') return 'MB (Mulai Berkembang)';
                        if (value === 'BB') return 'BB (Belum Berkembang)';
                        return value;
                      }}
                    />
                    <Bar dataKey="BSB" stackId="a" fill="#10b981" />
                    <Bar dataKey="BSH" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="MB" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="BB" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 italic text-[11px] py-14">
              Belum ada data skor yang terisi untuk memvisualisasikan grafik sebaran tingkat capaian.
            </div>
          )}
        </div>
      </div>

      {/* 2.7 HEATMAP & DIFFICULTY IDENTIFICATION PANEL */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
              <Grid3X3 className="h-4.5 w-4.5 text-indigo-600" />
              Peta Panas (Heatmap) Diagnostik Kesulitan Belajar Murid
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">
              Matriks pencapaian murid per pilar penilaian. Klik tombol nilai untuk menginspeksi hambatan & rancangan bimbingan.
            </p>
          </div>

          {/* Filter Categories for heat matrix */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-150 p-1 rounded-lg border border-slate-200 self-start md:self-auto shrink-0">
            <button
              onClick={() => {
                setSelectedHeatmapCategory('ALL');
                setSelectedCell(null);
              }}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                selectedHeatmapCategory === 'ALL'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Semua Pilar
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedHeatmapCategory(cat.id);
                  setSelectedCell(null);
                }}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                  selectedHeatmapCategory === cat.id
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title={cat.name}
              >
                {cat.id}
              </button>
            ))}
          </div>
        </div>

        {/* Heatmap Grid Layout & Reteaching Panel Split */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Main Heatmap block (2 Cols on large screens) */}
          <div className="xl:col-span-2 flex flex-col gap-4">
            {stats.totalScores > 0 ? (
              <div className="flex flex-col gap-3">
                {/* Visual Legend */}
                <div className="flex flex-wrap items-center gap-3 bg-slate-50 border border-slate-100 rounded-lg p-2 text-[10px]">
                  <span className="font-bold text-[9px] text-slate-400 uppercase tracking-widest flex items-center gap-1 shrink-0">
                    <Info className="h-3.5 w-3.5 text-slate-400 animate-pulse" /> Legenda:
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-emerald-500 block"></span>
                    <span className="text-slate-500 font-bold">BSB (Sangat Baik)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-blue-500 block"></span>
                    <span className="text-slate-500 font-bold">BSH / B (Berkembang)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-amber-400 block"></span>
                    <span className="text-slate-500 font-bold">MB (Mulai Berkembang)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-rose-500 block"></span>
                    <span className="text-slate-500 font-bold">BB (Belum Berkembang)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-slate-200 block"></span>
                    <span className="text-slate-400 font-medium">Belum Dinilai</span>
                  </div>
                </div>

                {/* Heatmap Matrix Table Wrapper */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0 z-10">
                        <tr>
                          {/* Sticky leftmost column for Student names */}
                          <th className="p-3 bg-slate-50 border-r border-slate-200 text-center min-w-[140px] sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.01)]">
                            Nama Murid
                          </th>
                          {heatmapIndicators.map(ind => (
                            <th 
                              key={ind.id} 
                              className="p-3 text-center border-r border-slate-100 min-w-[56px] hover:bg-slate-100 transition-colors"
                              title={`${ind.id}: ${ind.text}`}
                            >
                              <div className="flex flex-col items-center justify-center cursor-help">
                                <span className="font-bold text-slate-700 font-mono text-[10px] uppercase">{ind.id}</span>
                                <span className="text-[8px] text-slate-400 uppercase font-black tracking-tight">{ind.categoryId}</span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {students.map((st) => (
                          <tr key={st.id} className="hover:bg-slate-50/50 group transition-colors">
                            {/* Sticky Leftmost Student Column */}
                            <td className="p-3 font-bold text-slate-800 text-[11px] bg-white group-hover:bg-slate-50/80 border-r border-slate-200 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.01)] truncate max-w-[140px]">
                              <div>{st.name}</div>
                              <div className="text-[8.5px] text-slate-400 font-mono font-normal">NIS: {st.nis}</div>
                            </td>
                            
                            {/* Heat cells */}
                            {heatmapIndicators.map(ind => {
                              const score = st.grades[ind.id];
                              let cellBg = 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-400';
                              let scoreLabel = '-';
                              
                              if (score === 'BSB') {
                                cellBg = 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600 text-white';
                                scoreLabel = 'BSB';
                              } else if (score === 'B') {
                                cellBg = 'bg-blue-500 hover:bg-blue-600 border-blue-600 text-white';
                                scoreLabel = 'BSH';
                              } else if (score === 'MB') {
                                cellBg = 'bg-amber-400 hover:bg-amber-500 border-amber-500 text-slate-950';
                                scoreLabel = 'MB';
                              } else if (score === 'BB') {
                                cellBg = 'bg-rose-500 hover:bg-rose-600 border-rose-600 text-white';
                                scoreLabel = 'BB';
                              }

                              const isSelected = selectedCell && selectedCell.studentId === st.id && selectedCell.indicatorId === ind.id;

                              return (
                                <td 
                                  key={ind.id} 
                                  className={`p-1.5 border-r border-slate-100 text-center transition-all ${
                                    isSelected ? 'bg-indigo-50/50 ring-2 ring-indigo-500/60 ring-inset scale-95' : ''
                                  }`}
                                >
                                  <button
                                    onClick={() => setSelectedCell({
                                      studentId: st.id,
                                      studentName: st.name,
                                      indicatorId: ind.id,
                                      indicatorText: ind.text,
                                      categoryName: ind.categoryName,
                                      score: score || 'BELUM_DINILAI'
                                    })}
                                    className={`w-11 h-7 rounded-md ${cellBg} flex items-center justify-center font-bold text-[9px] m-auto shadow-2xs border transition-all transform hover:scale-105 active:scale-95 cursor-pointer leading-none`}
                                    title={`${st.name} | ${ind.id}: ${scoreLabel}`}
                                  >
                                    {scoreLabel}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 italic text-[11px] py-14 bg-slate-50 border border-slate-100 rounded-xl">
                Belum ada data nilai pilar karakter murid untuk menghasilkan visualisasi heatmap.
              </div>
            )}
            
            {/* Interactive Cell Info Panel */}
            {selectedCell && (
              <div className="bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-indigo-200/60 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200 shadow-2xs">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[9px] bg-indigo-150 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded font-extrabold uppercase tracking-wide">
                      Detail Analisis Cell
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Indikator: {selectedCell.indicatorId}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      ({selectedCell.categoryName})
                    </span>
                  </div>
                  
                  <div className="text-slate-700 text-[11px] mt-1.5 font-medium leading-relaxed font-sans">
                     Murid <strong className="font-bold text-slate-900">{selectedCell.studentName}</strong> meraih tingkat predikat{' '}
                     {selectedCell.score === 'BELUM_DINILAI' ? (
                       <strong className="text-slate-500 font-extrabold bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Belum Dinilai</strong>
                     ) : (
                       <strong className={`px-1.5 py-0.5 rounded font-black border ${
                         selectedCell.score === 'BSB' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                         selectedCell.score === 'B' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                         selectedCell.score === 'MB' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                         'bg-rose-50 text-rose-800 border-rose-200'
                       }`}>
                         {selectedCell.score === 'B' ? 'BSH / B (Berkembang)' : selectedCell.score}
                       </strong>
                     )}{' '}
                     pada butir perilaku: &quot;<em className="text-slate-600 not-italic font-bold bg-white px-1.5 py-0.5 rounded border border-slate-100">{selectedCell.indicatorText}</em>&quot;.
                  </div>

                  {/* Smart Pedagogical Advice */}
                  <div className="mt-3 text-[10.5px] text-slate-500 flex gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-700">Rekomendasi Bimbingan: </span>
                      {selectedCell.score === 'BSB' && "Siswa menunjukkan pembiasaan perilaku yang sangat baik dan konsisten. Sangat disarankan untuk mendapuk siswa ini sebagai mentor sebaya (peer tutor) guna menginspirasi rekan sekelasnya."}
                      {selectedCell.score === 'B' && "Siswa telah mencapai standar perkembangan sosial-karakter yang diharapkan sesuai instrumen pembelajaran utama. Pertahankan konsistensi perilaku positif ini."}
                      {selectedCell.score === 'MB' && "Siswa mulai berkembang namun masih terkadang lalai atau butuh sedikit stimulus. Berikan apresiasi afirmasi setiap kali ada gestur pembiasaan yang baik di kelas."}
                      {selectedCell.score === 'BB' && "Siswa masih bersikap pasif atau belum membiasakan perilaku ini secara memadai. Rekomendasikan pendekatan mentoring subyektif khusus di jam santai atau laporkan ke guru BK."}
                      {selectedCell.score === 'BELUM_DINILAI' && "Skor masih kosong. Silakan masuk ke tab database siswa untuk melakukan penilaian di indikator bersangkutan guna melihat detail analisis taktis di panel ini."}
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedCell(null)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-550 rounded-lg text-[10px] font-bold cursor-pointer shrink-0 self-end md:self-center"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>

          {/* Right Side Board: Diagnostic & Re-teaching Suggestions */}
          <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4 flex flex-col gap-4">
            <div className="border-b border-slate-200/60 pb-3">
              <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                <Flame className="h-4 w-4 text-rose-500" />
                Daftar Topik Perlu Pengajaran Ulang
              </h5>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed font-sans mt-0.5">
                Butir perilaku dengan tingkat kesulitan tertinggi berdasarkan akumulasi predikat BB (Belum Berkembang) + MB (Mulai Berkembang) murid se-kelas.
              </p>
            </div>

            {hardestIndicators.length > 0 ? (
              <div className="flex flex-col gap-3.5">
                {hardestIndicators.map((ind, i) => {
                  const dangerColorClass = i === 0 ? 'text-rose-600 bg-rose-50 border-rose-200/60' : i === 1 ? 'text-amber-700 bg-amber-50 border-amber-200/60' : 'text-orange-700 bg-orange-50 border-orange-200/60';
                  
                  return (
                    <div key={ind.id} className="bg-white rounded-xl border border-slate-200 p-3.5 flex flex-col gap-2 shadow-2xs hover:border-slate-300 transition-all">
                      {/* Priority Tag & Stats */}
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className={`text-[8.5px] font-extrabold px-2 py-0.5 rounded border uppercase leading-none ${dangerColorClass}`}>
                            Prioritas {i + 1}
                          </span>
                          <span className="font-mono text-[9px] bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-400">
                            {ind.id}
                          </span>
                        </div>
                        <div className="text-[9.5px] font-bold text-rose-500 flex items-center gap-0.5">
                          Tingkat Kesulitan: {ind.difficultyRate}%
                        </div>
                      </div>

                      {/* Header details */}
                      <div className="mt-0.5">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block font-sans">
                          {ind.categoryName}
                        </span>
                        <p className="text-[11px] text-slate-600 font-semibold leading-relaxed mt-0.5 line-clamp-2" title={ind.text}>
                          &ldquo;{ind.text}&rdquo;
                        </p>
                      </div>

                      {/* Micro Bar distribution breakdown */}
                      <div className="flex items-center justify-between text-[9.5px] border-t border-slate-100 pt-2 font-mono text-slate-400">
                        <span>BB: <strong className="text-rose-500 font-bold">{ind.bbCount} siswa</strong></span>
                        <span>•</span>
                        <span>MB: <strong className="text-amber-500 font-bold">{ind.mbCount} siswa</strong></span>
                        <span>•</span>
                        <span>Isi: <strong className="text-slate-600 font-bold">{ind.totalFilled} Murid</strong></span>
                      </div>

                      {/* Explicit Practical Instruction Checklist */}
                      <div className="mt-1 bg-slate-50/50 rounded-lg p-2.5 border border-slate-100 text-[10px] leading-relaxed text-slate-500 font-sans">
                        <div className="font-bold text-slate-700 flex items-center gap-1 mb-1">
                          <Activity className="h-3 w-3 text-indigo-500" /> Strategi Re-teaching Rekomendasi:
                        </div>
                        {i === 0 && (
                          <div>
                            Sangat disarankan menyisipkan simulasi interaktif (permainan peran / diskusi kelompok) pada jam wali kelas terpadu untuk merangkul emosi empati sosial secara klasikal.
                          </div>
                        )}
                        {i === 1 && (
                          <div>
                            Gunakan visualisasi penegak pembiasaan di mading kelas. Libatkan siswa dengan poin perkembangan BSB untuk menjadi penjaga pembiasaan mandiri berpasangan.
                          </div>
                        )}
                        {i === 2 && (
                          <div>
                            Berikan buku saku atau checklist tantangan mingguan mandiri yang menyenangkan untuk memotivasi anak mengejar ketertinggalan pembiasaan positif di rumah.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-slate-400 italic text-[11px]">
                Seluruh indikator kelas telah berkembang dengan sempurna, atau belum ada entri data yang diinput ke aplikasi.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* 3. Main content split: Left list & Right analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Roster List with detailed completeness and marks */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                Matriks Sebaran Nilai Murid
              </h4>
              <p className="text-[11px] text-slate-400">Daftar siswa beserta statistik predikat nilai yang dicapai</p>
            </div>
            
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Murid..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 w-36 md:w-48"
              />
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 text-center w-12">No</th>
                  <th className="p-3">Siswa</th>
                  <th className="p-3 text-center">Kelengkapan</th>
                  <th className="p-3 text-center font-semibold text-emerald-600">BSB</th>
                  <th className="p-3 text-center font-semibold text-blue-600">B</th>
                  <th className="p-3 text-center font-semibold text-amber-600">MB</th>
                  <th className="p-3 text-center font-semibold text-rose-600">BB</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((st, idx) => {
                    // Count grades distribution for this student
                    let bsb = 0, b = 0, mb = 0, bb = 0, filled = 0;
                    allIndicatorIds.forEach(id => {
                      const score = st.grades[id];
                      if (score) {
                        filled++;
                        if (score === 'BSB') bsb++;
                        else if (score === 'B') b++;
                        else if (score === 'MB') mb++;
                        else if (score === 'BB') bb++;
                      }
                    });

                    const percentageVal = allIndicatorIds.length > 0 ? Math.round((filled / allIndicatorIds.length) * 100) : 0;
                    
                    return (
                      <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center font-mono text-slate-400 font-medium">{idx + 1}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-800 text-xs">{st.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">NIS: {st.nis}</p>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              percentageVal === 100 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {filled} / {allIndicatorIds.length} ({percentageVal}%)
                            </span>
                            <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${percentageVal === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                style={{ width: `${percentageVal}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-700 text-xs bg-emerald-50/10">{bsb || '-'}</td>
                        <td className="p-3 text-center font-mono font-bold text-blue-700 text-xs bg-blue-50/10">{b || '-'}</td>
                        <td className="p-3 text-center font-mono font-bold text-amber-700 text-xs bg-amber-50/10">{mb || '-'}</td>
                        <td className="p-3 text-center font-mono font-bold text-rose-700 text-xs bg-rose-50/10">{bb || '-'}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => onSelectStudent(st)}
                            className="bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 px-2.5 py-1 rounded text-[10px] font-semibold text-slate-700 transition-all cursor-pointer"
                          >
                            Pilih
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      Siswa tidak ditemukan untuk pencarian "{searchTerm}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column - Assessment Indicator Analysis */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <BarChart4 className="h-4 w-4 text-emerald-600" />
              Sintesis Capaian Indikator
            </h4>
            <p className="text-[11px] text-slate-400">Persentase predikat nilai tertinggi per butir pernyataan penilaian</p>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[500px] flex flex-col gap-4">
            {indicatorStats.map(ind => {
              // Find highest percentage among BSB, B, MB, BB
              const scoresArr = [
                { key: 'BSB', val: ind.bsb, color: 'bg-emerald-500' },
                { key: 'B', val: ind.b, color: 'bg-blue-500' },
                { key: 'MB', val: ind.mb, color: 'bg-amber-500' },
                { key: 'BB', val: ind.bb, color: 'bg-rose-500' }
              ];
              scoresArr.sort((a, b) => b.val - a.val);
              const topScore = scoresArr[0];

              return (
                <div key={ind.id} className="border-b border-slate-100 pb-3 flex flex-col gap-1.5 last:border-none">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold mr-1">
                        {ind.id}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium font-sans">
                        {ind.categoryName}
                      </span>
                    </div>
                    <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Isi: {ind.filled}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium leading-tight line-clamp-2" title={ind.text}>
                    {ind.text}
                  </p>

                  {/* Micro distribution bar */}
                  <div className="flex flex-col gap-1 mt-1">
                    <div className="flex justify-between text-[9px] text-slate-500 font-semibold">
                      <span>Predikat Dominan:</span>
                      <span className="font-bold text-slate-700">{topScore.key} ({topScore.val}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                      <div className="bg-emerald-500 h-full" style={{ width: `${ind.bsb}%` }} title={`BSB: ${ind.bsb}%`}></div>
                      <div className="bg-blue-500 h-full" style={{ width: `${ind.b}%` }} title={`B: ${ind.b}%`}></div>
                      <div className="bg-amber-500 h-full" style={{ width: `${ind.mb}%` }} title={`MB: ${ind.mb}%`}></div>
                      <div className="bg-rose-500 h-full" style={{ width: `${ind.bb}%` }} title={`BB: ${ind.bb}%`}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 4. HIDDEN CONTAINER SPECIFICALLY FORMATTED FOR THE LANDSCAPE RECAP PDF YAYASAN */}
      {isPrintingRecap && (
        <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '297mm' }}>
          <div id="completion-status-report-pdf-content" className="p-8 bg-white text-black font-sans box-border" style={{ width: '297mm', minHeight: '210mm' }}>
            {/* Kop Surat Sekolah */}
            {kopSekolah ? (
              <div className="flex items-center justify-between border-b-4 border-double border-slate-800 pb-3 mb-4">
                <div className="flex items-center gap-4">
                  {kopSekolah.logoUrl ? (
                    <img src={kopSekolah.logoUrl} className="h-14 w-14 object-contain" referrerPolicy="no-referrer" alt="Logo" />
                  ) : (
                    <div className="h-14 w-14 rounded bg-slate-100 border border-slate-300 flex items-center justify-center font-bold text-[9px] text-slate-400">LOGO</div>
                  )}
                  <div>
                    <h1 className="text-sm font-black uppercase text-slate-900 leading-tight tracking-wider">{kopSekolah.yayasan}</h1>
                    <p className="text-xs font-bold text-slate-700 leading-tight">YAYASAN / KOORDINATOR: KANWIL {kopSekolah.koordinator} CABANG {kopSekolah.cabang}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5 leading-none">{kopSekolah.alamat}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold bg-slate-900 text-white px-2 py-1 rounded">LAPORAN MONITORING</span>
                  <p className="text-[9px] text-slate-400 font-mono mt-1">TAHUN AJARAN: {kopSekolah.tahunAjaran}</p>
                </div>
              </div>
            ) : (
              <div className="text-center border-b pb-2 mb-4 font-bold text-sm tracking-wide">
                LAPORAN STATUS PENYELESAIAN PENILAIAN RAPOR KELAS {selectedClass}
              </div>
            )}

            {/* Document Title Header */}
            <div className="text-center mb-4">
              <h2 className="text-base font-black uppercase text-slate-950 tracking-wide">RINGKASAN STATUS PENYELESAIAN PENILAIAN RAPOR 5NK</h2>
              <div className="flex justify-center items-center gap-4 text-xs font-bold text-slate-600 mt-1 uppercase">
                <span>KELAS: <strong className="text-slate-900">{selectedClass}</strong></span>
                <span>•</span>
                <span>WALI KELAS: <strong className="text-slate-900">{activeWaliKelasName || 'GURU KELAS'}</strong></span>
                <span>•</span>
                <span>JUMLAH SISWA: <strong className="text-slate-900">{students.length} MURID</strong></span>
              </div>
            </div>

            {/* Compact Table */}
            <table className="w-full text-left border-collapse border border-slate-900 text-[10px]">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-950 uppercase text-[9px]">
                  <th className="border border-slate-950 p-2 text-center w-10">NO</th>
                  <th className="border border-slate-950 p-2">NAMA SISWA</th>
                  <th className="border border-slate-950 p-2 text-center w-20">NIS</th>
                  <th className="border border-slate-950 p-2 text-center w-10">L/P</th>
                  <th className="border border-slate-950 p-2 text-center w-28">PERSENTASE (%)</th>
                  <th className="border border-slate-950 p-2 text-center w-14 bg-emerald-50">BSB</th>
                  <th className="border border-slate-950 p-2 text-center w-14 bg-blue-50">B</th>
                  <th className="border border-slate-950 p-2 text-center w-14 bg-amber-50">MB</th>
                  <th className="border border-slate-950 p-2 text-center w-14 bg-rose-50">BB</th>
                  <th className="border border-slate-950 p-2 text-center w-20">KESIMPULAN</th>
                  <th className="border border-slate-950 p-2 text-center w-20">CATATAN WALI</th>
                  <th className="border border-slate-950 p-2 text-center w-24">STATUS AKHIR</th>
                </tr>
              </thead>
              <tbody>
                {students.map((st, idx) => {
                  const m = getStudentMetrics(st);
                  return (
                    <tr key={st.id} className="border-b border-slate-800 hover:bg-slate-50">
                      <td className="border border-slate-800 p-1.5 text-center font-mono">{idx + 1}</td>
                      <td className="border border-slate-800 p-1.5 font-bold uppercase">{st.name}</td>
                      <td className="border border-slate-800 p-1.5 text-center font-mono">{st.nis}</td>
                      <td className="border border-slate-800 p-1.5 text-center font-mono font-bold">{st.gender || 'L'}</td>
                      <td className="border border-slate-800 p-1.5 text-center font-mono">
                        <div className="flex items-center justify-between px-1">
                          <span className="font-bold">{m.completionPercent}%</span>
                          <span className="text-[9px] text-slate-500">({m.filledCount}/{totalIndicatorsCount})</span>
                        </div>
                      </td>
                      <td className="border border-slate-800 p-1.5 text-center font-mono bg-emerald-50/20 font-bold text-emerald-800">{m.bsb || '-'}</td>
                      <td className="border border-slate-800 p-1.5 text-center font-mono bg-blue-50/20 font-bold text-blue-800">{m.b || '-'}</td>
                      <td className="border border-slate-800 p-1.5 text-center font-mono bg-amber-50/20 font-bold text-amber-800">{m.mb || '-'}</td>
                      <td className="border border-slate-800 p-1.5 text-center font-mono bg-rose-50/20 font-bold text-rose-800">{m.bb || '-'}</td>
                      <td className="border border-slate-800 p-1.5 text-center font-bold">
                        <span className={m.isKesimpulanFilled ? 'text-emerald-700 font-bold text-[9px]' : 'text-rose-600 font-bold text-[9px]'}>
                          {m.isKesimpulanFilled ? 'ADA' : 'BELUM'}
                        </span>
                      </td>
                      <td className="border border-slate-800 p-1.5 text-center font-bold">
                        <span className={m.isCatatanWaliFilled ? 'text-emerald-700 font-bold text-[9px]' : 'text-rose-600 font-bold text-[9px]'}>
                          {m.isCatatanWaliFilled ? 'ADA' : 'BELUM'}
                        </span>
                      </td>
                      <td className="border border-slate-800 p-1.5 text-center">
                        <span className={`px-2 py-0.5 rounded-sm font-black uppercase text-[8px] tracking-wide ${
                          m.isCompleted 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {m.isCompleted ? 'LEMBAR LENGKAP' : 'BELUM SELESAI'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Class overview stats row */}
            <div className="grid grid-cols-3 gap-6 border-x border-b border-slate-900 bg-slate-50 p-2.5 text-[9px] font-bold text-slate-700 uppercase">
              <div>
                RATA-RATA KELENGKAPAN: <span className="font-extrabold text-slate-900 font-mono">
                  {students.length > 0 
                    ? Math.round(students.reduce((sum, s) => sum + getStudentMetrics(s).completionPercent, 0) / students.length)
                    : 0
                  }%
                </span>
              </div>
              <div className="text-center">
                RAPOR DINILAI LENGKAP: <span className="font-extrabold text-slate-900 font-mono">
                  {students.filter(s => getStudentMetrics(s).isCompleted).length} DARI {students.length} SISWA
                </span>
              </div>
              <div className="text-right">
                PERSENTASE KELULUSAN ADMINISTRATIF: <span className="font-extrabold text-slate-900 font-mono">
                  {students.length > 0
                    ? Math.round((students.filter(s => getStudentMetrics(s).isCompleted).length / students.length) * 100)
                    : 0
                  }%
                </span>
              </div>
            </div>

            {/* Signature Area block */}
            <div className="grid grid-cols-2 gap-10 mt-10 text-[10px] leading-tight font-medium">
              <div className="text-center">
                <p className="text-slate-500 italic">Dilaporkan Oleh,</p>
                <p className="font-bold uppercase mt-1">Wali Kelas {selectedClass}</p>
                <div className="h-16 flex items-center justify-center">
                  <div className="w-24 border-b border-dashed border-slate-400"></div>
                </div>
                <p className="font-bold underline text-slate-900">{activeWaliKelasName || '(Nama Wali Kelas)'}</p>
                {activeWaliKelasNip && activeWaliKelasNip !== '-' && activeWaliKelasNip.trim() !== '' ? (
                  <p className="text-[9px] text-slate-600 mt-0.5 font-mono">NIP. {activeWaliKelasNip}</p>
                ) : (
                  <p className="text-[8px] text-slate-400 mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                )}
              </div>
              <div className="text-center">
                <p className="text-slate-500 italic">Mengetahui & Menyetujui,</p>
                <p className="font-bold uppercase mt-1">Perwakilan Yayasan / Kepala Sekolah</p>
                <div className="h-16 flex items-center justify-center">
                  <div className="w-24 border-b border-dashed border-slate-400"></div>
                </div>
                <p className="font-bold text-slate-900">....................................................................</p>
                <p className="text-[8px] text-slate-400 mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
              </div>
            </div>
            
            {/* Generation Date footer */}
            <div className="text-[9px] text-slate-400 font-mono mt-8 text-right border-t pt-2 border-slate-200">
              Dicetak otomatis via Sistem Rapor 5NK pada: {new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB • Lembar Pemantauan Yayasan
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
