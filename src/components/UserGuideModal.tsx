import { useState, useEffect } from 'react';
import { X, CheckCircle2, Compass, BookOpen, Heart, Info, ArrowRight, Printer, Save, FileSpreadsheet, Wand2 } from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserGuideModal({ isOpen, onClose }: UserGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'panduan' | 'faq'>('panduan');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-300 no-print">
      <div className="bg-slate-50 border border-slate-200 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden relative font-sans">
        
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-indigo-900 text-white p-5 md:px-8 md:py-6 flex justify-between items-center flex-none relative overflow-hidden border-b border-emerald-900">
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-white/10 p-2.5 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner flex items-center justify-center">
              <Compass className="h-6 w-6 text-emerald-300 animate-spin-slow" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black tracking-tight flex items-center gap-2">
                Panduan Penggunaan Rapor 5NK
              </h2>
              <p className="text-emerald-100/90 text-[11px] md:text-xs font-semibold mt-0.5 max-w-md md:max-w-xl truncate leading-relaxed">
                Cara menggunakan fitur, input nilai, dan cetak rapor dengan mudah.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="relative z-10 text-emerald-100 hover:text-white bg-white/10 hover:bg-white/20 p-2.5 rounded-full transition-all cursor-pointer shadow-sm hover:shadow active:scale-95"
            title="Tutup Panduan"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Inner Tabs Menu */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-8 flex flex-row items-center gap-2 flex-none py-3">
          <button
            onClick={() => setActiveTab('panduan')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 border ${
              activeTab === 'panduan'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm'
                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <BookOpen className="h-4 w-4" /> Panduan Lengkap
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer flex items-center gap-2 border ${
              activeTab === 'faq'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm'
                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <Info className="h-4 w-4" /> Tanya Jawab (FAQ)
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto flex-1 bg-slate-50 p-5 md:p-8">
          
          {activeTab === 'panduan' && (
            <div className="max-w-3xl mx-auto flex flex-col gap-8 animate-in fade-in duration-350">
              
              {/* Langkah 1 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                  <span className="bg-indigo-100 text-indigo-700 h-8 w-8 rounded-full flex items-center justify-center font-black text-sm">1</span>
                  Menambahkan Siswa & Memilih Kelas
                </h3>
                <div className="pl-10 text-slate-600 text-sm leading-relaxed space-y-2">
                  <p>Langkah pertama adalah memastikan Anda berada di kelas yang benar dan data siswa sudah lengkap.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Gunakan <strong>Dropdown Kelas</strong> di bagian atas (navbar) untuk berpindah antar kelas.</li>
                    <li>Untuk menambah siswa baru, buka tab <strong>Database CRUD</strong>, pilih tab "Siswa", lalu klik "Tambah Siswa".</li>
                    <li>Anda juga bisa melakukan <strong>Impor Massal</strong> dari file Excel di tab Database CRUD untuk mempercepat pengisian data.</li>
                  </ul>
                </div>
              </div>

              {/* Langkah 2 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-700 h-8 w-8 rounded-full flex items-center justify-center font-black text-sm">2</span>
                  Mengisi Nilai Karakter (5NK)
                </h3>
                <div className="pl-10 text-slate-600 text-sm leading-relaxed space-y-2">
                  <p>Input nilai bisa dilakukan melalui dua cara: Tabel Excel (Grid) atau Form per Siswa.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Tab Rekap Nilai (Grid):</strong> Klik pada kotak kosong di bawah nama siswa untuk memberikan predikat (BSB / BSH / MB / BB). Judul kolom akan tetap terlihat saat Anda scroll ke bawah.</li>
                    <li><strong>Panel Makro Kanan:</strong> Gunakan panel ini untuk mengisi nilai seluruh siswa dalam satu kelas sekaligus secara otomatis (Misal: Set semua nilai ke BSH).</li>
                  </ul>
                </div>
              </div>

              {/* Langkah 3 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-purple-500"></div>
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                  <span className="bg-purple-100 text-purple-700 h-8 w-8 rounded-full flex items-center justify-center font-black text-sm">3</span>
                  Generate Ulasan Otomatis dengan AI Gemini
                </h3>
                <div className="pl-10 text-slate-600 text-sm leading-relaxed space-y-2">
                  <p>Hemat waktu Anda dengan menggunakan kecerdasan buatan untuk menyusun deskripsi perkembangan anak.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Buka panel kanan (Macro), lalu klik tombol <strong>Generate Laporan Otomatis (AI)</strong>.</li>
                    <li>AI akan membaca nilai siswa dan merangkai kata-kata apresiasi serta saran pengembangan yang positif.</li>
                    <li>Anda selalu bisa mengubah teks hasil buatan AI tersebut sebelum dicetak.</li>
                  </ul>
                </div>
              </div>

              {/* Langkah 4 */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-3 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-rose-500"></div>
                <h3 className="font-black text-slate-800 text-lg flex items-center gap-2">
                  <span className="bg-rose-100 text-rose-700 h-8 w-8 rounded-full flex items-center justify-center font-black text-sm">4</span>
                  Mencetak dan Mengekspor PDF Rapor
                </h3>
                <div className="pl-10 text-slate-600 text-sm leading-relaxed space-y-2">
                  <p>Fitur cetak dirancang secara khusus untuk menghasilkan dokumen PDF A4 siap edar.</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Buka tab <strong>Cetak Rapor</strong>. Di sidebar kiri, Anda bisa memilih siswa mana saja yang ingin dicetak.</li>
                    <li>Pilih tombol <strong>Simpan Sebagai PDF</strong> untuk mengunduh dokumen satuan.</li>
                    <li>Gunakan tombol <strong>Cetak Massal (Semua Siswa)</strong> jika Anda ingin mengunduh rapor 1 kelas sekaligus ke dalam bentuk file ZIP atau mencetaknya langsung.</li>
                  </ul>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'faq' && (
            <div className="max-w-3xl mx-auto flex flex-col gap-4 animate-in fade-in duration-350">
              
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-slate-800 text-sm mb-2">Q: Bagaimana cara backup / menyelamatkan data nilai saya?</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Aplikasi ini menyimpan data secara lokal di browser Anda. Sangat disarankan untuk masuk ke tab <strong>Database CRUD</strong>, lalu masuk ke bagian <strong>Backup & Enkripsi</strong> untuk mendownload file cadangan <code className="bg-slate-100 px-1 rounded">.json</code> agar data Anda tidak hilang saat menghapus cache browser.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-slate-800 text-sm mb-2">Q: Apakah saya bisa merubah Kop Surat (Nama Kepala Sekolah / Identitas Sekolah)?</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Bisa. Masuk ke tab <strong>Database CRUD</strong>, lalu pilih sub-tab <strong>Profil & Kop Surat</strong>. Anda dapat mengedit identitas sekolah, nama kepala sekolah, NIP, serta tanggal cetak rapor yang akan diaplikasikan ke semua dokumen cetak secara otomatis.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h4 className="font-bold text-slate-800 text-sm mb-2">Q: Saat ekspor PDF gabungan 1 kelas, prosesnya berhenti atau gagal. Apa solusinya?</h4>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Mencetak banyak siswa sekaligus memakan banyak memori perangkat. Solusinya:
                  1) Pastikan Anda tidak membuka tab browser lain yang berat. 
                  2) Coba gunakan opsi unduhan terpisah (.ZIP) daripada PDF Gabungan. 
                  3) Atau cetak rapor secara manual dengan memilih sebagian murid agar memori tidak penuh.
                </p>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
