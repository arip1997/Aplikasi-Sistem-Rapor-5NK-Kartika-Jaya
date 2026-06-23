import { useState, useEffect } from 'react';
import { 
  X, Sparkles, Users, FileSpreadsheet, Cloud, CheckCircle2, 
  Database, Save, Map, BarChart3, Wand2, ListChecks, Info, 
  Lock, Settings, Flame, BookOpen, Heart, Compass, Activity, CheckCircle, Gift,
  ShieldAlert, FileText, Download, Printer, RefreshCw, Eye, Landmark, ArrowRight, Server, Check, Edit3
} from 'lucide-react';
import { scoreOptions, CATEGORIES_DATA } from '../types';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OnboardingTask {
  id: string;
  label: string;
  description: string;
  category: 'input' | 'process' | 'export';
}

const ONBOARDING_TASKS: OnboardingTask[] = [
  {
    id: 'select_class',
    label: 'Pilih Kelas & Analisis Daftar Siswa',
    description: 'Buka dropdown kelas di navbar atas untuk memuat daftar murid aktif secara dinamis.',
    category: 'input'
  },
  {
    id: 'input_score',
    label: 'Coba Input Nilai Siswa di Excel Grid',
    description: 'Double-click atau pilih sel pada tabel utama untuk mendaftarkan predikat capaian butir karakter siswa.',
    category: 'input'
  },
  {
    id: 'use_ai_comment',
    label: 'Gunakan AI Gemini untuk Menulis Ulasan Perilaku',
    description: 'Klik tombol AI Ulasan pada panel kanan (Modul Macro) guna menghasilkan deskripsi wali kelas secara instan.',
    category: 'process'
  },
  {
    id: 'view_heatmap',
    label: 'Periksa Peta Panas (Heatmap) Diagnostik',
    description: 'Masuk ke tab Rekap Nilai dan analisa indikator tersulit yang butuh strategi pengajaran ulang (re-teaching).',
    category: 'process'
  },
  {
    id: 'secure_backup',
    label: 'Ekspor File Backup Terenkripsi (.json)',
    description: 'Buka tab Database, masukkan kata sandi Anda dan download salinan file cadangan terenkripsi.',
    category: 'export'
  },
  {
    id: 'print_pdf',
    label: 'Buka Pratinjau Cetak & Download PDF Rapor',
    description: 'Masuk ke tab Cetak Rapor, pilih konfigurasi kop sekolah, and unduh PDF massal siap cetak.',
    category: 'export'
  }
];

export default function UserGuideModal({ isOpen, onClose }: UserGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'infographic' | 'detailed' | 'checklist' | 'rubric'>('infographic');
  const [checklist, setChecklist] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('rapor_5nk_onboarding_tasks');
    if (saved) {
      try { return JSON.parse(saved); } catch { return {}; }
    }
    return {};
  });
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null);

  // Save checklist state
  const handleToggleTask = (taskId: string) => {
    setChecklist(prev => {
      const next = { ...prev, [taskId]: !prev[taskId] };
      localStorage.setItem('rapor_5nk_onboarding_tasks', JSON.stringify(next));
      return next;
    });
  };

  const completedCount = ONBOARDING_TASKS.filter(task => checklist[task.id]).length;
  const progressPercent = Math.round((completedCount / ONBOARDING_TASKS.length) * 100);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300 no-print">
      <div className="bg-slate-50 border border-slate-200 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden zoom-in-95 relative font-sans">
        
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 text-white p-5 md:px-8 md:py-6 flex justify-between items-center flex-none relative overflow-hidden border-b border-emerald-900">
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-400 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-indigo-500 rounded-full blur-3xl"></div>
          </div>
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner flex items-center justify-center">
              <Compass className="h-6 w-6 text-emerald-300 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black tracking-tight flex items-center gap-2">
                Pusat Pembelajaran & Panduan Rapor 5NK 
                <span className="text-[9px] bg-amber-500 text-slate-950 font-extrabold px-1.5 py-0.5 rounded-full uppercase leading-none">v2.1 PRO</span>
              </h2>
              <p className="text-emerald-100/90 text-[11px] md:text-xs font-semibold mt-0.5 max-w-md md:max-w-xl truncate leading-relaxed">
                Panduan komprehensif pengerjaan nilai, pengoperasian AI Gemini, dan pencadangan aman digital.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="relative z-10 text-emerald-100 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all cursor-pointer shadow-sm hover:shadow active:scale-95"
            title="Tutup Panduan"
            id="btn-close-guide-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Inner Tabs Menu */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-8 flex flex-row items-center gap-1 overflow-x-auto scrollbar-none flex-none py-2.5">
          <button
            onClick={() => setActiveTab('infographic')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 border ${
              activeTab === 'infographic'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs'
                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Map className="h-3.5 w-3.5" /> 🗺️ Infografis Peta Fitur
          </button>
          <button
            onClick={() => setActiveTab('detailed')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 border ${
              activeTab === 'detailed'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs'
                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" /> 🛠️ Panduan Operasional Detail
          </button>
          <button
            onClick={() => setActiveTab('checklist')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 border relative ${
              activeTab === 'checklist'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs'
                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <ListChecks className="h-3.5 w-3.5" /> 🎓 Onboarding Checklist ({completedCount}/{ONBOARDING_TASKS.length})
            {progressPercent < 100 && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('rubric')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer flex items-center gap-2 border ${
              activeTab === 'rubric'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs'
                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Activity className="h-3.5 w-3.5" /> 📖 Rubrik Nilai & Kode Indikator
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto flex-1 bg-slate-100 p-5 md:p-8 custom-scrollbar">
          
          {/* ======================= TAB 1: WORKING FLOW INFOGRAPHIC ======================= */}
          {activeTab === 'infographic' && (
            <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in duration-350">
              
              <div className="text-center mb-4">
                <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight flex items-center justify-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-600" />
                  INFOGRAFIS PETA FITUR & ALUR KERJA RAPOR 5NK
                </h3>
                <p className="text-slate-500 text-xs mt-1.5 max-w-2xl mx-auto leading-relaxed">
                  Sistem manajemen penilaian karakter siswa Yayasan Kartika Jaya Koordinator Korem 084 Cabang IV Brawijaya - SMA Kartika IV-3 Surabaya.
                </p>
              </div>

              {/* Graphical Visual Schema / Interactive Poster */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden flex flex-col gap-8">
                
                {/* Background decorative grids */}
                <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none"></div>
                
                {/* Visual Header of Infographic */}
                <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                      <Landmark className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-slate-800 font-bold text-xs uppercase tracking-wider">Identitas Institusi Terarsip</h4>
                      <p className="text-[11px] text-slate-600 font-bold mt-0.5">YAYASAN KARTIKA JAYA CABANG IV BRAWIJAYA</p>
                      <p className="text-[10px] text-slate-500">SMA KARTIKA IV-3 SURABAYA (Jl. Brawijaya No.38)</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col gap-1 items-end w-full sm:w-auto">
                    <span className="text-[9px] bg-slate-200 text-slate-700 font-mono font-bold px-2 py-0.5 rounded border border-slate-300">
                      Target: Evaluasi Karakter 5 Pilar (5NK)
                    </span>
                    <span className="text-[9px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" /> Berkas Terakreditasi Nasional
                    </span>
                  </div>
                </div>

                {/* Grid Mapping out Modules */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                  
                  {/* Module 1: Excel Grid */}
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 flex flex-col justify-between transition-all hover:bg-indigo-50 hover:shadow-xs group">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-inner group-hover:scale-105 transition-transform">
                          <FileSpreadsheet className="h-4 w-4" />
                        </div>
                        <span className="text-[9px] bg-indigo-100 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">INPUT</span>
                      </div>
                      <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">1. Dual Sticky Header Grid</h5>
                      <p className="text-[10.5px] text-slate-500 mt-2 leading-relaxed">
                        Tabel penilaian modular se-kelas dengan <strong>Sticky Header Ganda</strong> (Baris Kategori 5NK & Kode Indikator). Judul kolom tetap terpaku saat guru melakukan scroll ke bawah melacak puluhan murid.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-indigo-100/50 flex flex-wrap gap-1">
                      <span className="text-[9px] bg-white text-indigo-705 px-1.5 py-0.5 rounded border border-indigo-200/50">Heatmap Real-time</span>
                      <span className="text-[9px] bg-white text-indigo-705 px-1.5 py-0.5 rounded border border-indigo-200/50">Fokus Detail Modal</span>
                    </div>
                  </div>

                  {/* Module 2: Macro VBA AI Controller */}
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 flex flex-col justify-between transition-all hover:bg-emerald-50 hover:shadow-xs group">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-inner group-hover:scale-105 transition-transform">
                          <Wand2 className="h-4 w-4 animate-pulse" />
                        </div>
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">PROCESS</span>
                      </div>
                      <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">2. VBA Macro AI Controller</h5>
                      <p className="text-[10.5px] text-slate-500 mt-2 leading-relaxed">
                        Ototmasi instan melalui menu Macro digital. Menyediakan <strong>Generate Laporan Otomatis Kelas (Bulk AI)</strong> untuk melacak & menulis saran pengembangan karakter siswa sekelas sekaligus secara cerdas berbasis data.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-emerald-100/50 flex flex-wrap gap-1">
                      <span className="text-[9px] bg-white text-emerald-705 px-1.5 py-0.5 rounded border border-emerald-200/50">Wali Kelas AI</span>
                      <span className="text-[9px] bg-white text-emerald-705 px-1.5 py-0.5 rounded border border-emerald-200/50">Log Monitor Real-time</span>
                    </div>
                  </div>

                  {/* Module 3: Database & Security Enkripsi */}
                  <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 flex flex-col justify-between transition-all hover:bg-amber-50 hover:shadow-xs group">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-amber-600 text-white rounded-xl shadow-inner group-hover:scale-105 transition-transform">
                          <Database className="h-4 w-4" />
                        </div>
                        <span className="text-[9px] bg-amber-100 text-amber-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">SECURITY</span>
                      </div>
                      <h5 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">3. Enkripsi & Reset DB Aman</h5>
                      <p className="text-[10.5px] text-slate-500 mt-2 leading-relaxed">
                        Data disimpan di LocalStorage & diamankan dengan enkripsi XOR custom sandi buatan guru. Dan untuk memproteksi data, kami memiliki <strong>Double-Check Syafeguard Reset Modal</strong> agar data tidak terhapus tidak sengaja.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-amber-100/50 flex flex-wrap gap-1">
                      <span className="text-[9px] bg-white text-amber-705 px-1.5 py-0.5 rounded border border-amber-200/50">Backup JSON</span>
                      <span className="text-[9px] bg-white text-amber-705 px-1.5 py-0.5 rounded border border-amber-200/50">Double-Check Safeguard</span>
                    </div>
                  </div>

                  {/* Module 4: Diagnosa Heatmap */}
                  <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-5 flex flex-col justify-between transition-all hover:bg-rose-50 hover:shadow-xs group">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-rose-600 text-white rounded-xl shadow-inner group-hover:scale-105 transition-transform">
                          <BarChart3 className="h-4 w-4" />
                        </div>
                        <span className="text-[9px] bg-rose-100 text-rose-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">ANALYTICS</span>
                      </div>
                      <h5 className="font-extrabold text-xs text-slate-805 uppercase tracking-wider">4. Diagnostik Butir Terlemah</h5>
                      <p className="text-[10.5px] text-slate-500 mt-2 leading-relaxed">
                        Evaluasi nilai terlemah siswa sekelas. Grafik visual dan warna heatmap memandu guru mendeteksi pilar mana (misal: Disiplin atau Terampil) yang memiliki persentase BB/MB terbanyak untuk re-teaching.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-rose-100/50 flex flex-wrap gap-1">
                      <span className="text-[9px] bg-white text-rose-705 px-1.5 py-0.5 rounded border border-rose-200/50">Visual Heatmap</span>
                      <span className="text-[9px] bg-white text-rose-705 px-1.5 py-0.5 rounded border border-rose-200/50">Sebaran Predikat</span>
                    </div>
                  </div>

                  {/* Module 5: Excel Impor Ekspor */}
                  <div className="bg-teal-50/50 border border-teal-100 rounded-2xl p-5 flex flex-col justify-between transition-all hover:bg-teal-50 hover:shadow-xs group">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-teal-600 text-white rounded-xl shadow-inner group-hover:scale-105 transition-transform">
                          <Cloud className="h-4 w-4" />
                        </div>
                        <span className="text-[9px] bg-teal-100 text-teal-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">EXCEL LINK</span>
                      </div>
                      <h5 className="font-extrabold text-xs text-slate-805 uppercase tracking-wider">5. Impor/Ekspor Excel (.xlsx)</h5>
                      <p className="text-[10.5px] text-slate-500 mt-2 leading-relaxed">
                        Kompatibilitas penuh dengan sistem offline Microsoft Excel. Guru dapat mengunduh seluruh database siswa beserta template nilai macro, mendistribusikannya secara offline, and me-restore kembali kapan saja.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-teal-100/50 flex flex-wrap gap-1">
                      <span className="text-[9px] bg-white text-teal-705 px-1.5 py-0.5 rounded border border-teal-200/50">Auto-Generasi XLSX</span>
                      <span className="text-[9px] bg-white text-teal-705 px-1.5 py-0.5 rounded border border-teal-200/50">Sistem Templating</span>
                    </div>
                  </div>

                  {/* Module 6: Cetak Rapor Digital */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between transition-all hover:bg-slate-100 hover:shadow-xs group">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-slate-700 text-white rounded-xl shadow-inner group-hover:scale-105 transition-transform">
                          <Printer className="h-4 w-4" />
                        </div>
                        <span className="text-[9px] bg-slate-200 text-slate-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">OUTPUT</span>
                      </div>
                      <h5 className="font-extrabold text-xs text-slate-805 uppercase tracking-wider">6. Dokumen PDF Nasional / Zip</h5>
                      <p className="text-[10.5px] text-slate-500 mt-2 leading-relaxed">
                        Cetak massal dokumen laporan karakter siswa dalam standar A4. Memiliki opsi kustomisasi titi mangsa, nama dinamis kepala sekolah, log tanda tangan, and opsi ekspor arsip ZIP secara aman.
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap gap-1">
                      <span className="text-[9px] bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-300/60">Layout A4 Resmi</span>
                      <span className="text-[9px] bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-300/60">Ekspor ZIP Massal</span>
                    </div>
                  </div>

                </div>

                {/* SIKLUS ALUR PENGGUNAAN BERMUTU - DIAGRAM FLOW */}
                <div className="border border-slate-200 bg-slate-50/50 rounded-2xl p-5 relative z-10 flex flex-col gap-4">
                  <h5 className="font-extrabold text-xs text-slate-805 uppercase tracking-wider text-center sm:text-left flex items-center justify-center sm:justify-start gap-1.5">
                    <Compass className="h-4 w-4 text-emerald-600" />
                    Bagan Alur Penggunaan Rapor (Siklus Berkelanjutan)
                  </h5>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    
                    {/* Langkah 1 */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-3xs">
                      <div className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">I</div>
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-800 uppercase block leading-tight">Konfigurasi Roster</span>
                        <span className="text-[9px] text-slate-400 font-medium">Impor siswa & atur profil Kop</span>
                      </div>
                    </div>

                    <div className="hidden md:flex justify-center text-slate-300">
                      <ArrowRight className="h-5 w-5" />
                    </div>

                    {/* Langkah 2 */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-3xs">
                      <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">II</div>
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-800 uppercase block leading-tight">Input Capaian 5NK</span>
                        <span className="text-[9px] text-slate-400 font-medium">Beri skor sel karakter murid</span>
                      </div>
                    </div>

                    <div className="hidden md:flex justify-center text-slate-300">
                      <ArrowRight className="h-5 w-5" />
                    </div>

                    {/* Langkah 3 */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-3xs">
                      <div className="h-7 w-7 rounded-lg bg-purple-100 text-purple-700 font-bold text-xs flex items-center justify-center shrink-0">III</div>
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-800 uppercase block leading-tight">Generate Deskripsi AI</span>
                        <span className="text-[9px] text-slate-400 font-medium">Komentar otomatis asisten AI</span>
                      </div>
                    </div>

                    <div className="hidden md:flex justify-center text-slate-300">
                      <ArrowRight className="h-5 w-5" />
                    </div>

                    {/* Langkah 4 */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-3xs">
                      <div className="h-7 w-7 rounded-lg bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center shrink-0">IV</div>
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-800 uppercase block leading-tight">Cetak & Backup</span>
                        <span className="text-[9px] text-slate-400 font-medium">Simpan dokumen & simpan berkas JSON</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* LEGEND/COLOR BADGE MEANING */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10 pt-2 text-[10px] text-slate-500 font-medium font-sans">
                  <div className="flex gap-2 items-center bg-emerald-50 rounded-lg p-2 border border-emerald-150 text-emerald-800">
                    <span className="h-4 w-7 rounded-md bg-emerald-600 block shrink-0 font-mono text-[9px] text-white flex items-center justify-center font-bold">BSB</span>
                    <span>Berkembang Sangat Baik (Nilai istimewa)</span>
                  </div>
                  <div className="flex gap-2 items-center bg-blue-50 rounded-lg p-2 border border-blue-150 text-blue-800">
                    <span className="h-4 w-7 rounded-md bg-blue-500 block shrink-0 font-mono text-[9px] text-white flex items-center justify-center font-bold">B</span>
                    <span>Berkembang Sesuai Harapan (Standar)</span>
                  </div>
                  <div className="flex gap-2 items-center bg-amber-50 rounded-lg p-2 border border-amber-150 text-amber-800">
                    <span className="h-4 w-7 rounded-md bg-amber-500 block shrink-0 font-mono text-[9px] text-white flex items-center justify-center font-bold">MB</span>
                    <span>Mulai Berkembang (Butuh sedikit dorongan)</span>
                  </div>
                  <div className="flex gap-2 items-center bg-rose-50 rounded-lg p-2 border border-rose-150 text-rose-800">
                    <span className="h-4 w-7 rounded-md bg-rose-500 block shrink-0 font-mono text-[9px] text-white flex items-center justify-center font-bold">BB</span>
                    <span>Belum Berkembang (Butuh bimbingan guru khusus)</span>
                  </div>
                </div>

              </div>
              
              {/* Informational Hero Banner */}
              <div className="bg-indigo-950 border border-indigo-500/30 rounded-2xl p-5 md:p-6 text-white flex flex-col md:flex-row items-center gap-5 mt-2 relative overflow-hidden">
                <div className="bg-indigo-500/20 p-4 rounded-full border border-indigo-500/20 text-indigo-300 shrink-0">
                  <Sparkles className="h-7 w-7 animate-pulse text-indigo-400" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h4 className="font-black text-xs uppercase tracking-widest text-indigo-300">Pencadangan Otomatis Cerdas Terintegrasi</h4>
                  <p className="text-slate-300 text-[11px] leading-relaxed mt-1 font-sans">
                     Aplikasi telah di-upgrade dengan sistem <strong>Auto-Backup JSON Cerdas</strong>. Setiap 15 detik setelah Anda menyelesaikan pengeditan nilai siswa (Waktu Simpan diperbarui), salinan file backup database local kelas akan diunduh secara otomatis. Anda tidak perlu khawatir kehilangan data akibat crash komputer demi keamanan total.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* ======================= TAB 2: DETAILED INSTRUCTIONS ======================= */}
          {activeTab === 'detailed' && (
            <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in duration-350">
              
              {/* Card Section 1 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col gap-4">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5 text-indigo-700">
                  <Users className="h-5 w-5" />
                  1. Pemilihan Kelas & Manajemen Data Roster (Siswa & Guru)
                </h4>
                <div className="text-[11px] text-slate-600 leading-relaxed font-sans flex flex-col gap-2.5">
                  <p>
                     Hal pertama yang harus dilakukan adalah memastikan kelas aktif Anda terpilih. Dropdown navbar dibatasi untuk menampilkan kelas paralel dan mendaftarkan wali kelas yang relevan secara dinamis.
                  </p>
                  <ul className="list-disc pl-5 flex flex-col gap-1.5 text-slate-500">
                    <li>
                      <strong className="text-slate-700">Menghubungkan Database Siswa Baru:</strong> Jika Anda memiliki murid mutasi baru masuk tengah semester, navigasikan ke tab <strong>Database CRUD</strong>, pilih subtab <em>Siswa</em>, pilih tombol tambah baru, dan lengkapi Nama, NIS, dan Kelas.
                    </li>
                    <li>
                      <strong className="text-slate-700">Impor Roster Massal dari Excel:</strong> Di tab <strong>Database CRUD</strong>, guru dapat mengunggah template file Excel (.xlsx) sekaligus untuk me-overwrite atau menggabungkan data seluruh murid kelas demi efisiensi tinggi tanpa ketik manual satu per satu.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Card Section 2 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col gap-4">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5 text-emerald-700">
                  <FileSpreadsheet className="h-5 w-5" />
                  2. Pengisian Lembar Nilai Karakter (Excel Grid & Form)
                </h4>
                <div className="text-[11px] text-slate-600 leading-relaxed font-sans flex flex-col gap-2.5">
                  <p>
                    Proses penginputan nilai dibuat modular dengan struktur spreadsheet desktop murni yang intuitif untuk memastikan kenyamanan maksimum.
                  </p>
                  <ul className="list-disc pl-5 flex flex-col gap-1.5 text-slate-500">
                    <li>
                      <strong className="text-slate-700">Sticky Header Ganda Pelindung Navigasi:</strong> Kami telah memasang fitur sticky header ganda. Judul kategori pilar 5NK dan ID butir akan tetap menempel di bagian teratas layar saat Anda menggulir ke bawah, melacak siswa nomor urut puluhan.
                    </li>
                    <li>
                      <strong className="text-slate-700">Mengisi Sel Grid secara Cepat:</strong> Cukup klik pada kotak sel indikator di bawah nama siswa, lalu pilih tombol predikat (BSB / BSH / MB / BB) untuk mendaftarkan nilai secara langsung.
                    </li>
                    <li>
                      <strong className="text-slate-700">Menggunakan Modul Makro (Pengisian Massal):</strong> Di sebelah kanan tabel utama, Anda dapat memanfaatkan panel <strong>Butir Penilaian (Macro)</strong> untuk merubah skor seluruh siswa dalam satu pilar/kriteria sekaligus (Misal: Melakukan reset semua bernilai Berkembang Sesuai Harapan / BSH sebagai nilai baseline).
                    </li>
                  </ul>
                </div>
              </div>

              {/* Card Section 3 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col gap-4">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5 text-purple-700">
                  <Wand2 className="h-5 w-5" />
                  3. Integrasi AI Gemini untuk Ulasan Wali Kelas Otomatis & Kelas Massal
                </h4>
                <div className="text-[11px] text-slate-600 leading-relaxed font-sans flex flex-col gap-2.5">
                  <p>
                    Kini guru tidak perlu lagi bersusah payah merangkai kalimat tanggapan perkembangan sosial-karakter anak secara manual yang memakan waktu berjam-jam.
                  </p>
                  <ul className="list-disc pl-5 flex flex-col gap-1.5 text-slate-500">
                    <li>
                      <strong className="text-slate-700">Analisis Otomatis Komparatif:</strong> Model AI Gemini SDK akan membaca riwayat skor predikat butir siswa (misal: pilar Cinta Tanah Air, Disiplin, dsb).
                    </li>
                    <li>
                      <strong className="text-slate-700">Macro Bulk AI Laporan Otomatis (1 Kelas):</strong> Guru dapat mengeksekusi otomatisasi kelas secara instan. Tekan tombol "Generate Laporan Otomatis" di Panel Makro untuk membiarkan AI menganalisis dan menulis narasi tanggapan unik untuk seluruh isi kelas dengan visual log monitor.
                    </li>
                    <li>
                      <strong className="text-slate-705 font-bold">Saran Konstruktif & Solutif:</strong> AI secara cerdas akan menyusun ulasan deskripsi wali kelas berupa apresiasi pencapaian terbaik anak, serta rekomendasi perbaikan bimbingan yang ramah berlandaskan nilai-nilai yang berkategori MB atau BB. Anda bebas mengedit hasil keluaran AI tersebut sebelum dicetak final.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Card Section 4: Keyboard Shortcuts */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col gap-4">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5 text-amber-700">
                  <span className="text-base">⌨️</span>
                  4. Tombol Pintasan Keyboard Global (Power-User Shortcuts)
                </h4>
                <div className="text-[11px] text-slate-600 leading-relaxed font-sans flex flex-col gap-2.5">
                  <p>
                    Tingkatkan efisiensi kerja Anda dengan tombol pintasan keyboard global yang dirancang khusus untuk mempercepat navigasi tanpa sentuhan mouse:
                  </p>
                  <table className="w-full text-left border-collapse border border-slate-200/60 rounded-xl overflow-hidden mt-1 text-[10.5px]">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="p-2 border-b border-slate-200 font-bold text-slate-705 w-32">Pintasan</th>
                        <th className="p-2 border-b border-slate-200 font-bold text-slate-705">Fungsi / Navigasi</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-2 border-b border-slate-150 font-mono font-bold text-amber-600"><kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded shadow-xs text-slate-800 text-[10px]">Alt</kbd> + <kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded shadow-xs text-slate-800 text-[10px]">1</kbd></td>
                        <td className="p-2 border-b border-slate-150">Arahkan langsung ke <strong className="text-slate-850">Grid Cepat / Spreadsheet</strong> penyuntingan nilai.</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-2 border-b border-slate-150 font-mono font-bold text-amber-600"><kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded shadow-xs text-slate-800 text-[10px]">Alt</kbd> + <kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded shadow-xs text-slate-800 text-[10px]">2</kbd></td>
                        <td className="p-2 border-b border-slate-150">Arahkan langsung ke <strong className="text-slate-850">Form Penilaian Karakter</strong> (Fokus Satu Siswa).</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-2 border-b border-slate-150 font-mono font-bold text-amber-600"><kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded shadow-xs text-slate-800 text-[10px]">Alt</kbd> + <kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded shadow-xs text-slate-800 text-[10px]">3</kbd></td>
                        <td className="p-2 border-b border-slate-150">Arahkan langsung ke <strong className="text-slate-850">Rekap Nilai Siswa</strong> & Diagram Radar Grafik.</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-2 border-b border-slate-150 font-mono font-bold text-amber-600"><kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded shadow-xs text-slate-800 text-[10px]">Alt</kbd> + <kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded shadow-xs text-slate-800 text-[10px]">4</kbd></td>
                        <td className="p-2 border-b border-slate-150">Arahkan langsung ke <strong className="text-slate-850">Master CRUD Database</strong> (Edit Siswa, Guru, Backup).</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-2 border-b border-slate-150 font-mono font-bold text-slate-600"><kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded shadow-xs text-slate-800 text-[10px]">Ctrl</kbd> + <kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded shadow-xs text-slate-800 text-[10px]">S</kbd></td>
                        <td className="p-2 border-b border-slate-150">Simpan instan ke memori lokal & sinkronkan otomatis ke Cloud Database Firebase.</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-2 border-b border-slate-150 font-mono font-bold text-slate-600"><kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded shadow-xs text-slate-800 text-[10px]">Ctrl</kbd> + <kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded shadow-xs text-slate-800 text-[10px]">P</kbd></td>
                        <td className="p-2 border-b border-slate-150">Buka Modul Pratinjau Cetak Rapor Cetak & cetak langsung se-kelas.</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-2 border-b border-slate-150 font-mono font-bold text-slate-600"><kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded shadow-xs text-slate-800 text-[10px]">Ctrl</kbd> + <kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded shadow-xs text-slate-800 text-[10px]">K</kbd></td>
                        <td className="p-2 border-b border-slate-150">Aktifkan kotak pencarian cepat (Quick Command Hub) terpadu di sistem.</td>
                      </tr>
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-2 border-b border-slate-150 font-mono font-bold text-slate-600"><kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded shadow-xs text-slate-800 text-[10px]">Ctrl</kbd> + <kbd className="bg-slate-100 border border-slate-300 px-1 py-0.5 rounded shadow-xs text-slate-800 text-[10px]">J</kbd></td>
                        <td className="p-2 border-b border-slate-150">Putar mundur (Siklus) menelusuri seluruh tab utama satu per satu.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Card Section 5 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col gap-4">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5 text-indigo-700">
                  <Sparkles className="h-5 w-5" />
                  5. Pertanyaan Umum (FAQ) Cara Pakai Aplikasi
                </h4>
                <div className="flex flex-col gap-2.5">
                  
                  {/* FAQ 1 */}
                  <div className="border border-slate-150 rounded-xl overflow-hidden">
                    <button 
                      onClick={() => setSelectedFaq(selectedFaq === 1 ? null : 1)}
                      className="w-full text-left bg-slate-50 p-3 flex justify-between items-center font-bold text-slate-700 text-[11px] cursor-pointer hover:bg-slate-100/70"
                    >
                      <span>❔ Mengapa Progress Bar Siswa Saya Tidak Penuh Berwarna Hijau?</span>
                      <span className="text-slate-400 font-mono text-[10px]">{selectedFaq === 1 ? '▲' : '▼'}</span>
                    </button>
                    {selectedFaq === 1 && (
                      <div className="p-3 bg-white text-[10.5px] text-slate-550 leading-relaxed font-sans border-t border-slate-100">
                        Sistem memantau kelengkapan isian secara ketat. Suatu murid dianggap selesai (100% lengkap) jika seluruh 15 indikator nilai pilar (CTA1-3, DSP1-3, BBL1-3, CRD1-3, TRM1-3) telah memiliki predikat terisi (BSB, B, MB, atau BB). Periksalah kembali sel grid nilai siswa Anda yang masih kosong (berwarna abu-abu redup).
                      </div>
                    )}
                  </div>

                  {/* FAQ 2 */}
                  <div className="border border-slate-150 rounded-xl overflow-hidden">
                    <button 
                      onClick={() => setSelectedFaq(selectedFaq === 2 ? null : 2)}
                      className="w-full text-left bg-slate-50 p-3 flex justify-between items-center font-bold text-slate-700 text-[11px] cursor-pointer hover:bg-slate-100/70"
                    >
                      <span>❔ Cara Melakukan Pemulihan (Restore) dari File Backup (.json)?</span>
                      <span className="text-slate-400 font-mono text-[10px]">{selectedFaq === 2 ? '▲' : '▼'}</span>
                    </button>
                    {selectedFaq === 2 && (
                      <div className="p-3 bg-white text-[10.5px] text-slate-550 leading-relaxed font-sans border-t border-slate-100">
                        Buka tab <strong>Database CRUD</strong>, masuk ke subtab <strong>🛡️ Backup & Enkripsi</strong>. Cari bagian <strong>Unggah & Restore Database</strong>, klik telusuri file untuk memilih berkas backup JSON Anda (baik hasil backup manual, otomatis, maupun terenkripsi). Input sandi enkripsi rahasia jika file tersebut terenkripsi, lalu tekan tombol restore data. Semua data di browser Anda akan diperbarui se-instan itu!
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* ======================= TAB 3: ONBOARDING INTERACTIVE CHECKLIST ======================= */}
          {activeTab === 'checklist' && (
            <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in duration-350">
              
              {/* Task Meter Header block */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-5 shadow-2xs">
                <div className="flex-1">
                  <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-tight flex items-center gap-1.5">
                    <ListChecks className="h-5 w-5 text-indigo-600 animate-bounce" />
                    Status Menyelesaikan Misi Pelatihan Rapor 5NK
                  </h4>
                  <p className="text-slate-400 text-[10.5px] mt-1 leading-relaxed max-w-lg font-sans">
                     Latih keterampilan digital Anda dengan mencentang tugas-tugas operasional di bawah yang telah berhasil anda pelajari secara mandiri di program simulasi web ini.
                  </p>
                  
                  {/* Progress Line */}
                  <div className="flex items-center gap-2.5 mt-3.5">
                    <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                      <div 
                        className="bg-indigo-600 h-full transition-all duration-500 rounded-full" 
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                    <span className="font-mono text-xs font-black text-indigo-700 shrink-0">
                      {progressPercent}% ({completedCount} / {ONBOARDING_TASKS.length})
                    </span>
                  </div>
                </div>

                {/* Achievement Medal Award popup */}
                {progressPercent === 100 ? (
                  <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-4 flex flex-col items-center text-center animate-in zoom-in-95 duration-300 max-w-xs shrink-0 relative">
                    <div className="absolute -top-3 -right-3 bg-amber-400 text-slate-900 text-[8px] font-extrabold px-2 py-0.5 rounded-full shadow-md animate-bounce">
                      REWARD
                    </div>
                    <Gift className="h-8 w-8 text-amber-500 mb-1" />
                    <span className="text-[11px] font-black text-emerald-800 uppercase tracking-widest block">Guru Teladan Digital</span>
                    <span className="text-[8.5px] text-emerald-600 font-bold block mt-0.5">Lencana Gelar Master Rapor 5NK</span>
                    <span className="text-[8px] bg-emerald-600 text-white font-mono px-2 py-0.5 rounded mt-2 uppercase font-extrabold leading-none">
                      ★ VERIFIED LENGKAP ★
                    </span>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center max-w-xs shrink-0 text-slate-400">
                    <Gift className="h-7 w-7 text-slate-300 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-tight block">Reward Terkunci</span>
                    <span className="text-[8.5px] mt-0.5 leading-tight text-slate-400 max-w-[140px]">Selesaikan semua checklist misi untuk membuka lencana penghargaan.</span>
                  </div>
                )}
              </div>

              {/* Grid tasks block split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ONBOARDING_TASKS.map(task => {
                  const isChecked = !!checklist[task.id];
                  const categoryColors = task.category === 'input' 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                    : task.category === 'process' 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-rose-50 border-rose-200 text-rose-700';

                  return (
                    <div 
                      key={task.id}
                      onClick={() => handleToggleTask(task.id)}
                      className={`bg-white border rounded-2xl p-4 flex gap-3 shadow-xs hover:border-slate-300 transition-all duration-200 cursor-pointer select-none group relative ${
                        isChecked ? 'border-indigo-200 bg-indigo-50/10' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex-none pt-0.5">
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                          isChecked 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'bg-slate-50 border-slate-300 group-hover:border-slate-400'
                        }`}>
                          {isChecked && <CheckCircle className="h-3.5 w-3.5" />}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-[11px] text-slate-800 group-hover:text-indigo-950 transition-colors">
                            {task.label}
                          </span>
                          <span className={`text-[7.5px] font-mono px-1.5 py-0.5 rounded border uppercase leading-none font-bold ${categoryColors}`}>
                            {task.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-sans mt-1">
                          {task.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* ======================= TAB 4: RUBRIC & CODE REFERENCES ======================= */}
          {activeTab === 'rubric' && (
            <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in duration-350">
              
              {/* Grading Rubric table card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col gap-4">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5 text-indigo-700">
                  <Activity className="h-5 w-5" />
                  Glosarium Arti & Kode Rubrik Kriteria Rapor Karakter
                </h4>
                
                <div className="overflow-x-auto border border-slate-150 rounded-xl bg-white mt-1">
                  <table className="w-full text-left border-collapse text-[10.5px] font-sans">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 font-sans">
                      <tr>
                        <th className="p-3 text-center w-16">Kode</th>
                        <th className="p-3 w-40">Predikat / Nilai</th>
                        <th className="p-3">Panduan / Definisi Penilaian Karakter</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600 font-sans">
                      {scoreOptions.map(opt => (
                        <tr key={opt.key} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 text-center font-mono font-black text-emerald-800 bg-slate-50/30">
                            {opt.key}
                          </td>
                          <td className="p-3 font-bold text-slate-800">
                            {opt.label === 'Berkembang Sesuai Harapan (BSH)' ? 'BSH / B (Berkembang)' : opt.label}
                          </td>
                          <td className="p-3 leading-relaxed">
                            {opt.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Category Indicator Code maps */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 flex flex-col gap-4">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5 text-indigo-700">
                  <BookOpen className="h-5 w-5" />
                  Hubungan Kode Butir Indikator (15 Kompetensi Inti)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CATEGORIES_DATA.map(cat => (
                    <div key={cat.id} className="border border-slate-150 rounded-xl p-3.5 bg-slate-50/40">
                      <div className="flex justify-between items-center border-b border-slate-150 pb-2 mb-2">
                        <span className="font-extrabold text-[11px] text-slate-800 uppercase tracking-wide">
                          {cat.name}
                        </span>
                        <span className="font-mono text-[9px] bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded font-black">
                          ID: {cat.id}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2.5">
                        {cat.indicators.map(ind => (
                          <div key={ind.id} className="flex gap-2">
                            <span className="font-mono text-[9px] bg-slate-200 font-extrabold text-slate-600 w-10 shrink-0 h-5 rounded flex items-center justify-center border border-slate-300 leading-none">
                              {ind.id}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium leading-relaxed font-sans">
                              {ind.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="bg-white border-t border-slate-200 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 flex-none">
          <div className="text-[10.5px] text-slate-400 font-medium flex items-center gap-1 text-center sm:text-left">
            <Heart className="h-4 w-4 text-rose-500 animate-pulse" />
            <span>Rapor 5NK didedikasikan untuk kenyamanan administrasi pengajaran guru Indonesia.</span>
          </div>
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs hover:shadow-md transform transition-transform hover:-translate-y-0.5 active:translate-y-0 text-xs cursor-pointer flex items-center gap-2 shrink-0 justify-center w-full sm:w-auto"
          >
            <CheckCircle2 className="h-4 w-4" /> Mulai Pengerjaan Rapor
          </button>
        </div>

      </div>
    </div>
  );
}
