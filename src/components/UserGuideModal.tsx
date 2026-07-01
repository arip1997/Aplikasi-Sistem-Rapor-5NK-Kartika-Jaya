import { useState } from 'react';
import { X, Compass, BookOpen, Info, ArrowRight, Printer, Save, FileSpreadsheet, Wand2, Search, HelpCircle, MessageSquare } from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserGuideModal({ isOpen, onClose }: UserGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'panduan' | 'faq' | 'hub'>('panduan');
  const [faqSearch, setFaqSearch] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const faqs = [
    {
      q: "Bagaimana cara mencadangkan (backup) nilai siswa?",
      a: "Data Anda tersimpan secara aman di browser lokal. Untuk proteksi ekstra, masuk ke menu 'Kelola Database' (ikon gir di baris tab) -> pilih tab 'Backup & Enkripsi'. Di sana Anda dapat mengunduh database dalam format murni .json atau terenkripsi dengan password khusus."
    },
    {
      q: "Apakah data saya otomatis disinkronkan ke cloud?",
      a: "Ya! Jika Anda terhubung dengan akun sekolah Anda (setelah login Firebase / Google di menu Kelola Database), sistem akan otomatis mengunggah perubahan ke Firestore dan Cloud SQL dalam bentuk antrean sinkronisasi atomik latar belakang."
    },
    {
      q: "Apa fungsi fitur 'Snapshot Manual'?",
      a: "Snapshot Manual adalah backup poin instan di dalam browser. Jika Anda hendak mengimpor data besar atau bereksperimen dengan AI, buatlah snapshot terlebih dahulu. Jika terjadi kesalahan input masal, Anda dapat memulihkannya ke waktu presisi tersebut dalam hitungan milidetik."
    },
    {
      q: "Bagaimana cara menyusun Kop Surat Sekolah?",
      a: "Masuk ke menu 'Kelola Database' -> pilih tab 'Profil & Kop Surat'. Anda bisa menyesuaikan Nama Yayasan, Cabang Koordinator, Nama Sekolah, Identitas Kepala Sekolah, NIP, serta tanggal tanda tangan rapor."
    },
    {
      q: "Hasil cetak PDF terpotong, bagaimana solusinya?",
      a: "Gunakan peramban Google Chrome atau Microsoft Edge untuk hasil optimal. Di menu cetak browser, pastikan ukuran kertas diatur ke A4, margin diatur ke 'None' atau 'Default', dan centang opsi 'Background graphics' agar garis tabel tercetak sempurna."
    }
  ];

  const filteredFaqs = faqs.filter(f => 
    f.q.toLowerCase().includes(faqSearch.toLowerCase()) || 
    f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300 no-print">
      <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden relative font-sans">
        
        {/* Sleek Minimalist Header */}
        <div className="bg-slate-900 text-white p-5 md:px-8 md:py-6 flex justify-between items-center flex-none border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/25 flex items-center justify-center">
              <Compass className="h-5 w-5 text-emerald-400 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-extrabold tracking-tight">
                Pusat Bantuan & Panduan Guru
              </h2>
              <p className="text-slate-400 text-xs font-medium mt-0.5">
                Solusi cepat, petunjuk pengisian, dan tips optimalisasi Rapor 5NK.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-all cursor-pointer"
            title="Tutup Panduan"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-2 flex flex-wrap gap-2 items-center justify-between flex-none">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('panduan')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
                activeTab === 'panduan'
                  ? 'bg-white text-slate-900 border-slate-200 shadow-xs'
                  : 'text-slate-500 border-transparent hover:text-slate-800'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" /> Panduan Penggunaan
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
                activeTab === 'faq'
                  ? 'bg-white text-slate-900 border-slate-200 shadow-xs'
                  : 'text-slate-500 border-transparent hover:text-slate-800'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" /> Tanya Jawab (FAQ)
            </button>
            <button
              onClick={() => setActiveTab('hub')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
                activeTab === 'hub'
                  ? 'bg-white text-slate-900 border-slate-200 shadow-xs'
                  : 'text-slate-500 border-transparent hover:text-slate-800'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Hubungi Bantuan Cepat
            </button>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-1 rounded-full font-mono uppercase tracking-wide">
            RAPOR KARTIKA JAYA 5NK
          </span>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto flex-1 bg-white p-6 md:p-8">
          
          {/* TAB 1: PANDUAN PENGGUNAAN */}
          {activeTab === 'panduan' && (
            <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-in fade-in duration-200">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Langkah 1 */}
                <div className="bg-slate-50 hover:bg-slate-50/50 border border-slate-100 hover:border-slate-200 rounded-2xl p-5 transition-all flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center justify-center font-mono">1</span>
                    <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Pilih Kelas & Siswa</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Berpindah kelas di dropdown subbar kelas. Untuk penambahan murid, hapus, atau edit identitas, gunakan menu <strong>Kelola Database</strong> di tab utama.
                  </p>
                </div>

                {/* Langkah 2 */}
                <div className="bg-slate-50 hover:bg-slate-50/50 border border-slate-100 hover:border-slate-200 rounded-2xl p-5 transition-all flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="h-6 w-6 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-extrabold flex items-center justify-center font-mono">2</span>
                    <Wand2 className="h-4 w-4 text-indigo-400 animate-pulse" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Input Nilai & Deskripsi AI</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Beri predikat karakter (BSB / BSH / MB / BB) di menu <strong>Rekap Nilai</strong>. Di panel samping, pakai <strong>AI Generator</strong> untuk men-draft kata-kata ulasan otomatis.
                  </p>
                </div>

                {/* Langkah 3 */}
                <div className="bg-slate-50 hover:bg-slate-50/50 border border-slate-100 hover:border-slate-200 rounded-2xl p-5 transition-all flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="h-6 w-6 rounded-lg bg-amber-100 text-amber-800 text-xs font-extrabold flex items-center justify-center font-mono">3</span>
                    <Save className="h-4 w-4 text-amber-500" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Backup Latar Belakang</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Aplikasi merekam perubahan ke memori lokal secara otomatis. Disarankan membuat <strong>Snapshot Manual</strong> di tab database sebelum merombak nilai murid sekelas.
                  </p>
                </div>

                {/* Langkah 4 */}
                <div className="bg-slate-50 hover:bg-slate-50/50 border border-slate-100 hover:border-slate-200 rounded-2xl p-5 transition-all flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="h-6 w-6 rounded-lg bg-blue-100 text-blue-800 text-xs font-extrabold flex items-center justify-center font-mono">4</span>
                    <Printer className="h-4 w-4 text-blue-500" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Cetak Rapor Massal</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">
                    Gunakan tab <strong>Cetak Rapor</strong> untuk meninjau pratinjau A4, mencetak langsung, atau mengunduh arsip ZIP berisi PDF individu siswa secara mandiri.
                  </p>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: TANYA JAWAB (FAQ) */}
          {activeTab === 'faq' && (
            <div className="max-w-2xl mx-auto flex flex-col gap-4 animate-in fade-in duration-200">
              
              {/* Search Bar */}
              <div className="relative mb-2">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari pertanyaan bantuan..."
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-slate-400 focus:bg-white text-slate-700 transition-all placeholder:text-slate-400"
                />
              </div>

              {filteredFaqs.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-400 font-medium">Pertanyaan tidak ditemukan.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {filteredFaqs.map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div 
                        key={idx}
                        className="border border-slate-100 rounded-xl bg-slate-50 overflow-hidden transition-all"
                      >
                        <button
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="w-full text-left p-4 flex justify-between items-center gap-3 hover:bg-slate-100/50 transition-colors cursor-pointer"
                        >
                          <span className="font-extrabold text-slate-800 text-xs">{faq.q}</span>
                          <ArrowRight className={`h-3 w-3 text-slate-400 transition-transform duration-200 flex-none ${isOpen ? 'rotate-90 text-slate-800' : ''}`} />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 pt-1 border-t border-slate-100 text-slate-600 text-xs leading-relaxed animate-in slide-in-from-top-1 duration-150">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 3: HUBUNGI BANTUAN CEPAT */}
          {activeTab === 'hub' && (
            <div className="max-w-md mx-auto flex flex-col items-center justify-center text-center p-6 bg-slate-50 border border-slate-100 rounded-3xl animate-in scale-in duration-200">
              <div className="bg-emerald-500 text-slate-950 p-3.5 rounded-full mb-4 shadow-md">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-base mb-1">Butuh Bantuan Lebih Lanjut?</h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed mb-6">
                Hubungi tim pengembang atau administrator sekolah untuk mendapatkan bantuan teknis, perbaikan data, atau lisensi sistem.
              </p>

              <div className="w-full space-y-2 text-left mb-4">
                <div className="p-3 bg-white border border-slate-150 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Email Pengembang</p>
                    <p className="text-xs font-extrabold text-slate-800">smakartikasby@gmail.com</p>
                  </div>
                  <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md">Standby 24/7</span>
                </div>
                <div className="p-3 bg-white border border-slate-150 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Admin Operator</p>
                    <p className="text-xs font-extrabold text-slate-800">+62 895-3666-08358</p>
                  </div>
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-md">Jam Kerja</span>
                </div>
              </div>

              <p className="text-[9px] text-slate-400 font-medium">Sistem Konsol Rapor Karakter 5NK v1.2 © SMAKAPATGA.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
