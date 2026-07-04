import { useState } from 'react';
import { 
  X, 
  Compass, 
  BookOpen, 
  Info, 
  ArrowRight, 
  Printer, 
  Save, 
  FileSpreadsheet, 
  Wand2, 
  Search, 
  HelpCircle, 
  MessageSquare, 
  Keyboard, 
  ShieldAlert, 
  FileText,
  MousePointer,
  Sparkles,
  Layers,
  CheckCircle2
} from 'lucide-react';

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
      a: "Data Anda tersimpan secara aman di browser lokal Anda secara otomatis. Untuk proteksi ekstra, masuk ke menu 'Kelola Database' (ikon gir di baris tab) -> pilih tab 'Backup & Enkripsi'. Di sana Anda dapat mengunduh database dalam format murni .json atau terenkripsi dengan password khusus untuk dipindahkan ke komputer lain."
    },
    {
      q: "Apakah data saya otomatis disinkronkan ke cloud?",
      a: "Ya! Jika Anda terhubung dengan akun sekolah Anda (setelah login Firebase / Google di menu Kelola Database), sistem akan otomatis mengunggah perubahan ke Firestore dan Cloud SQL dalam bentuk antrean sinkronisasi atomik di latar belakang sehingga data Anda aman dari resiko kehilangan perangkat."
    },
    {
      q: "Apa fungsi fitur 'Snapshot Manual'?",
      a: "Snapshot Manual adalah backup poin instan di dalam browser. Jika Anda hendak mengimpor data besar atau bereksperimen dengan AI, buatlah snapshot terlebih dahulu. Jika terjadi kesalahan input masal, Anda dapat memulihkannya ke waktu presisi tersebut dalam hitungan milidetik."
    },
    {
      q: "Bagaimana cara menyusun Kop Surat Sekolah?",
      a: "Masuk ke menu 'Kelola Database' -> pilih tab 'Profil & Kop Surat'. Anda bisa menyesuaikan Nama Yayasan, Cabang Koordinator, Nama Sekolah, Identitas Kepala Sekolah, NIP, Logo Sekolah, serta tanggal tanda tangan rapor."
    },
    {
      q: "Hasil cetak PDF terpotong, bagaimana solusinya?",
      a: "Gunakan peramban Google Chrome atau Microsoft Edge untuk hasil optimal. Di menu cetak browser, pastikan ukuran kertas diatur ke A4 (atau F4 sesuai pilihan), margin diatur ke 'None' atau 'Default', skala 100% (Normal), dan centang opsi 'Background graphics' agar garis tabel tercetak sempurna."
    },
    {
      q: "Apa arti dari predikat BSB, BSH, MB, dan BB?",
      a: "Singkatan tersebut mengacu pada tingkat capaian karakter siswa: BSB (Berkembang Sangat Baik), BSH (Berkembang Sesuai Harapan), MB (Mulai Berkembang), dan BB (Belum Berkembang)."
    }
  ];

  const filteredFaqs = faqs.filter(f => 
    f.q.toLowerCase().includes(faqSearch.toLowerCase()) || 
    f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300 no-print">
      <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden relative font-sans">
        
        {/* Premium Stylish Header */}
        <div className="bg-slate-900 text-white p-6 md:px-8 md:py-6 flex justify-between items-center flex-none border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="bg-emerald-500/15 p-2.5 rounded-2xl border border-emerald-500/20 flex items-center justify-center">
              <Compass className="h-6 w-6 text-emerald-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base md:text-xl font-extrabold tracking-tight">
                Pusat Bantuan & Panduan Guru Rapor 5NK
              </h2>
              <p className="text-slate-400 text-xs font-medium mt-0.5">
                Solusi cepat, petunjuk pengisian, dan panduan optimalisasi Rapor Karakter 5 Nilai Kartika.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-all cursor-pointer border border-slate-700/60"
            title="Tutup Panduan"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-2.5 flex flex-wrap gap-2 items-center justify-between flex-none">
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveTab('panduan')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
                activeTab === 'panduan'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" /> Panduan Penggunaan
            </button>
            <button
              onClick={() => setActiveTab('faq')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
                activeTab === 'faq'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <HelpCircle className="h-3.5 w-3.5" /> Tanya Jawab (FAQ)
            </button>
            <button
              onClick={() => setActiveTab('hub')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
                activeTab === 'hub'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Hubungi Bantuan Cepat
            </button>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-3 py-1 rounded-full font-mono uppercase tracking-wider hidden sm:inline-block">
            Panduan Lengkap Aplikasi
          </span>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto flex-1 bg-white p-6 md:p-8">
          
          {/* TAB 1: PANDUAN PENGGUNAAN */}
          {activeTab === 'panduan' && (
            <div className="max-w-3xl mx-auto flex flex-col gap-8 animate-in fade-in duration-200">
              
              {/* Introduction Card */}
              <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl">
                <h3 className="text-emerald-950 font-extrabold text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                  Selamat Datang di Portal Rapor 5NK SMAKAPATGA
                </h3>
                <p className="text-slate-600 text-xs mt-1.5 leading-relaxed">
                  Sistem ini dirancang secara khusus untuk membantu Bapak/Ibu guru dalam merangkum, mengevaluasi, menyusun deskripsi perkembangan berbasis kecerdasan buatan (AI), serta mencetak lembar Laporan Nilai Kartika (5NK) siswa secara profesional dan presisi.
                </p>
              </div>

              {/* Workflow Section */}
              <div>
                <h4 className="text-slate-900 font-extrabold text-xs uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-slate-500" />
                  Alur Kerja Pengisian Rapor (4 Langkah Praktis)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Langkah 1 */}
                  <div className="bg-slate-50 hover:bg-slate-50/50 border border-slate-100 hover:border-slate-200 rounded-2xl p-5 transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center justify-center font-mono">1</span>
                      <FileSpreadsheet className="h-4 w-4 text-slate-400" />
                    </div>
                    <h5 className="font-extrabold text-slate-800 text-sm">Persiapan & Kelola Database</h5>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Buka menu <strong>Kelola Database</strong> (ikon roda gigi) untuk menyesuaikan data profil sekolah, identitas kepala sekolah, tanggal tanda tangan, serta data murid sekelas (impor dari Excel/CSV atau edit langsung).
                    </p>
                  </div>

                  {/* Langkah 2 */}
                  <div className="bg-slate-50 hover:bg-slate-50/50 border border-slate-100 hover:border-slate-200 rounded-2xl p-5 transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="h-6 w-6 rounded-lg bg-indigo-100 text-indigo-800 text-xs font-extrabold flex items-center justify-center font-mono">2</span>
                      <MousePointer className="h-4 w-4 text-indigo-400" />
                    </div>
                    <h5 className="font-extrabold text-slate-800 text-sm">Input Nilai Karakter di Grid Cepat</h5>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Gunakan menu <strong>Grid Cepat</strong> untuk memberikan predikat (BSB / BSH / MB / BB) untuk setiap siswa. Berpindah kolom/baris menggunakan tombol arah panah keyboard layaknya Microsoft Excel asli.
                    </p>
                  </div>

                  {/* Langkah 3 */}
                  <div className="bg-slate-50 hover:bg-slate-50/50 border border-slate-100 hover:border-slate-200 rounded-2xl p-5 transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="h-6 w-6 rounded-lg bg-amber-100 text-amber-800 text-xs font-extrabold flex items-center justify-center font-mono">3</span>
                      <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                    </div>
                    <h5 className="font-extrabold text-slate-800 text-sm">Form Penilaian & Template Catatan</h5>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Buka <strong>Form Penilaian</strong> untuk siswa terkait. Gunakan tombol AI untuk menyusun kesimpulan teks secara otomatis, atau klik dropdown <strong>Template Cepat</strong> untuk menyisipkan motivasi instan buatan Anda sendiri.
                    </p>
                  </div>

                  {/* Langkah 4 */}
                  <div className="bg-slate-50 hover:bg-slate-50/50 border border-slate-100 hover:border-slate-200 rounded-2xl p-5 transition-all flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="h-6 w-6 rounded-lg bg-blue-100 text-blue-800 text-xs font-extrabold flex items-center justify-center font-mono">4</span>
                      <Printer className="h-4 w-4 text-blue-500" />
                    </div>
                    <h5 className="font-extrabold text-slate-800 text-sm">Cetak Rapor & PDF Presisi 1:1</h5>
                    <p className="text-slate-500 text-xs leading-relaxed">
                      Masuk ke menu <strong>Cetak Rapor</strong>. Anda dapat melakukan pratinjau A4/F4, mengatur margin, serta mendownload file PDF gabungan secara instan atau melakukan pencetakan langsung ke printer tanpa distorsi tata letak.
                    </p>
                  </div>

                </div>
              </div>

              {/* Advanced Tips Bento */}
              <div className="border border-slate-150 rounded-2xl overflow-hidden">
                <div className="bg-slate-900 text-white px-5 py-3 text-xs font-bold flex items-center gap-2">
                  <Keyboard className="h-4 w-4 text-emerald-400" />
                  <span>Fitur Unggulan & Pintasan Pintar (Shortcut)</span>
                </div>
                <div className="divide-y divide-slate-100 p-1 bg-slate-50 text-xs">
                  
                  <div className="p-4 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center hover:bg-slate-100/50 transition-colors group cursor-help" title="Gunakan Alt + 1/2/3 untuk pindah tab cepat, dan Ctrl + Enter untuk simpan perubahan form.">
                    <div>
                      <p className="font-bold text-slate-800 flex items-center gap-1.5">
                        Pintasan Navigasi Cepat <Info className="h-3 w-3 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                      </p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Berpindah tab dan menyimpan form penilaian secara efisien tanpa mouse.</p>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <kbd className="bg-white border border-slate-200 px-2 py-0.5 rounded shadow-xs font-mono text-[10px] font-bold text-slate-700 group-hover:border-emerald-300 group-hover:text-emerald-700 transition-colors">Alt + 1 / 2 / 3</kbd>
                      <kbd className="bg-white border border-slate-200 px-2 py-0.5 rounded shadow-xs font-mono text-[10px] font-bold text-slate-700 group-hover:border-emerald-300 group-hover:text-emerald-700 transition-colors">Ctrl + Enter</kbd>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center hover:bg-slate-100/50 transition-colors group cursor-help" title="Tekan Ctrl+J dari mana saja untuk memutar antar tab (Siswa, Grid, Cetak) dengan instan.">
                    <div>
                      <p className="font-bold text-slate-800 flex items-center gap-1.5">
                        Pindah Tab Layar Pintar <Info className="h-3 w-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Siklus berputar melintasi tab (Siswa, Rapor, Cetak, dll) secara instan.</p>
                    </div>
                    <kbd className="bg-white border border-slate-200 px-2 py-0.5 rounded shadow-xs font-mono text-[10px] font-bold text-slate-700 group-hover:border-blue-300 group-hover:text-blue-700 transition-colors">Ctrl + J</kbd>
                  </div>

                  <div className="p-4 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center hover:bg-slate-100/50 transition-colors group cursor-help" title="Tekan Ctrl+K kapan saja untuk memunculkan kotak pencarian super cepat yang melayang di layar.">
                    <div>
                      <p className="font-bold text-slate-800 flex items-center gap-1.5">
                        Pencarian Siswa Global <Info className="h-3 w-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                      </p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Memunculkan kotak pencarian instan dari layar mana pun.</p>
                    </div>
                    <kbd className="bg-white border border-slate-200 px-2 py-0.5 rounded shadow-xs font-mono text-[10px] font-bold text-slate-700 group-hover:border-indigo-300 group-hover:text-indigo-700 transition-colors">Ctrl + K</kbd>
                  </div>

                  <div className="p-4 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center hover:bg-slate-100/50 transition-colors group cursor-help" title="Tekan Ctrl+S untuk memaksa sinkronisasi/penyimpanan ke server.">
                    <div>
                      <p className="font-bold text-slate-800 flex items-center gap-1.5">
                        Simpan & Sinkronisasi <Info className="h-3 w-3 text-slate-400 group-hover:text-amber-500 transition-colors" />
                      </p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Memaksa aplikasi untuk menyinkronkan data dengan database cloud/lokal seketika.</p>
                    </div>
                    <kbd className="bg-white border border-slate-200 px-2 py-0.5 rounded shadow-xs font-mono text-[10px] font-bold text-slate-700 group-hover:border-amber-300 group-hover:text-amber-700 transition-colors">Ctrl + S</kbd>
                  </div>

                  <div className="p-4 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
                    <div>
                      <p className="font-bold text-slate-800">Template Motivasi Mandiri</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Simpan kalimat motivasi yang sering Anda ketik ke daftar template cepat.</p>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 font-extrabold px-2 py-1 rounded-md border border-emerald-100">Simpan otomatis di LocalStorage</span>
                  </div>

                  <div className="p-4 flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
                    <div>
                      <p className="font-bold text-slate-800">Snapshot Pengaman (Instan Rollback)</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Amankan data nilai kelas Anda sebelum merombak data murid skala besar.</p>
                    </div>
                    <span className="text-[10px] bg-indigo-50 text-indigo-800 font-extrabold px-2 py-1 rounded-md border border-indigo-100">Zero-Delay Recovery</span>
                  </div>

                </div>
              </div>

              {/* Print Guidelines */}
              <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 text-xs text-amber-900 flex flex-col gap-2">
                <h4 className="font-extrabold text-sm flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  PENTING: Konfigurasi Cetak Agar Rapi & Presisi
                </h4>
                <p className="leading-relaxed">
                  Agar hasil cetak fisik kertas atau ekspor file PDF 100% rapi dan tidak berantakan (halaman meluber, tabel terpotong, background menghilang):
                </p>
                <ul className="list-disc pl-5 space-y-1.5 font-medium mt-1">
                  <li>Pilihlah ukuran kertas yang sesuai di aplikasi (<strong>A4</strong> atau <strong>F4</strong>) sebelum mengunduh atau mencetak.</li>
                  <li>Pada jendela dialog cetak browser (Chrome/Edge), atur <strong>Margin</strong> ke <strong>None (Tanpa Margin)</strong> atau <strong>Default</strong>.</li>
                  <li>Pastikan Anda selalu mencentang kotak <strong>Background Graphics (Grafik Latar Belakang)</strong> agar arsir warna tabel tercetak jelas.</li>
                  <li>Setel tingkat <strong>Skala (Scale)</strong> ke <strong>100% / Default</strong> (Jangan diubah-ubah agar tata letak tetap presisi 1:1).</li>
                </ul>
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
                    <p className="text-[10px] text-slate-400 font-bold uppercase">ADMIN RAPOR 5NK</p>
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
