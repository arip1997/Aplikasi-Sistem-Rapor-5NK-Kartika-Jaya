import { useState, useEffect, useMemo, useRef } from 'react';
import { flushSync, createPortal } from 'react-dom';
import JSZip from 'jszip';
import { Student, Teacher, Category, KopSekolah, scoreOptions } from '../types';
import { formatProperName } from '../utils';
import { Printer, Download, Eye, FileSpreadsheet, ArrowLeft, Heart, Award, Sparkles, FileText, Loader2, Archive, Search, Wrench, Sliders, Check, Layers, Cloud, AlertTriangle } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { uploadFileToDrive, getOrCreateFolder } from '../lib/drive.ts';
import { googleSignIn, getAccessToken, initAuth } from '../firebase.ts';

interface RaporCetakProps {
  student: Student;
  allClassStudents?: Student[];
  categories: Category[];
  kopSekolah: KopSekolah;
  waliKelasName: string;
  waliKelasNip?: string;
  onBack: () => void;
  onDownloadExcel: () => void;
  teachers?: Teacher[];
  onMarkAsPrinted?: (studentIds: string[]) => void;
  autoTriggerBatchPdf?: boolean;
  autoPrintImmediately?: boolean;
  onResetAutoTrigger?: () => void;
  onAddExportLog?: (type: 'EXCEL' | 'PDF', description: string, fileName: string, studentCount: number) => void;
}

export default function RaporCetak({
  student,
  allClassStudents = [],
  categories,
  kopSekolah,
  waliKelasName,
  waliKelasNip,
  onBack,
  onDownloadExcel,
  teachers = [],
  onMarkAsPrinted,
  autoTriggerBatchPdf = false,
  autoPrintImmediately = false,
  onResetAutoTrigger,
  onAddExportLog,
}: RaporCetakProps) {
  
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const getWaliKelas = (stu: Student) => {
    if (teachers && teachers.length > 0) {
      const match = teachers.find(t => (t.classAssigned || '').trim().toUpperCase() === (stu.kelas || '').trim().toUpperCase());
      if (match) {
        return {
          name: formatProperName(match.name),
          nip: match.nip ? match.nip.trim() : ''
        };
      }
    }
    return {
      name: formatProperName(waliKelasName),
      nip: waliKelasNip ? waliKelasNip.trim() : ''
    };
  };
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [batchStudent, setBatchStudent] = useState<Student | null>(null);
  const [showSandboxNotice, setShowSandboxNotice] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [renderTrigger, setRenderTrigger] = useState(0);

  const [isSyncingAllToDrive, setIsSyncingAllToDrive] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    total: 0,
    current: 0,
    completed: 0,
    failed: 0,
    currentStudentName: '',
    folderName: '',
  });

  const [isGeneratingClassZip, setIsGeneratingClassZip] = useState(false);
  const [classZipStatus, setClassZipStatus] = useState({
    total: 0,
    current: 0,
    completed: 0,
    failed: 0,
    currentStudentName: '',
  });

  const [isGeneratingClassPdf, setIsGeneratingClassPdf] = useState(false);
  const [classPdfStatus, setClassPdfStatus] = useState({
    total: 0,
    current: 0,
    currentStudentName: '',
  });

  useEffect(() => {
    const unsub = initAuth();
    return () => unsub();
  }, []);
  
  // States for diagnostic layout inspection
  const [isDiagnosticMode, setIsDiagnosticMode] = useState(false);
  const [showMarginsGuide, setShowMarginsGuide] = useState(true);
  const [showGridRuler, setShowGridRuler] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPrintOptimizeEnabled, setIsPrintOptimizeEnabled] = useState(true);
  const [isLandscape, setIsLandscape] = useState(false);
  const [exportConfirmTarget, setExportConfirmTarget] = useState<'EXCEL'|'PDF_SELECTED'|'PDF_CLASS'|'ZIP_SELECTED'|'ZIP_CLASS'|null>(null);
  const [classPdfFormat, setClassPdfFormat] = useState<'COMBINED'|'SEPARATE'>('COMBINED');

  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isAutoFitPreview, setIsAutoFitPreview] = useState(true);
  const [containerWidth, setContainerWidth] = useState(820);
  const [isToolsExpandedMobile, setIsToolsExpandedMobile] = useState(false);

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const container = canvasContainerRef.current;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width || 820);
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const confirmAction = () => {
    switch (exportConfirmTarget) {
      case 'EXCEL': onDownloadExcel(); break;
      case 'PDF_SELECTED': handleDownloadPDF(); break;
      case 'PDF_CLASS': 
        if (classPdfFormat === 'COMBINED') {
          handleDownloadClassPDF();
        } else {
          handleDownloadClassZIP();
        }
        break;
      case 'ZIP_SELECTED': handleDownloadAllPDFs(); break;
      case 'ZIP_CLASS': handleDownloadClassZIP(); break;
    }
    setExportConfirmTarget(null);
  };

  useEffect(() => {
    if (isLandscape) {
      document.body.classList.add('print-landscape');
    } else {
      document.body.classList.remove('print-landscape');
    }
    return () => document.body.classList.remove('print-landscape');
  }, [isLandscape]);

  useEffect(() => {
    if (autoTriggerBatchPdf) {
      const timer = setTimeout(() => {
        handleDownloadClassPDF().finally(() => {
          onResetAutoTrigger?.();
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoTriggerBatchPdf]);

  // All class students from props or default to current student
  const classStudents = useMemo(() => {
    return allClassStudents && allClassStudents.length > 0 ? allClassStudents : [student];
  }, [allClassStudents, student]);

  const selectedClass = student.kelas;

  const printMargins = useMemo(() => {
    const saved = localStorage.getItem('rapor_5nk_print_margins');
    return saved ? JSON.parse(saved) : { top: 12, bottom: 12, left: 15, right: 15 };
  }, []);

  // Selected students representation inside the sidebar checkbox list
  const [selectedNisList, setSelectedNisList] = useState<string[]>([student.nis]);
  const [filterPrintedStatus, setFilterPrintedStatus] = useState<'all' | 'printed' | 'not_printed'>('all');
  // Currently displayed student in on-screen Mock Preview
  const [previewNis, setPreviewNis] = useState<string>(student.nis);

  // Computed state - memoized with shallow comparisons and optimized lookup
  const activeStudent = useMemo(() => {
    return classStudents.find(s => s.nis === previewNis) || student;
  }, [classStudents, previewNis, student]);

  const selectedStudents = useMemo(() => {
    const selectedSet = new Set(selectedNisList);
    return classStudents.filter(s => selectedSet.has(s.nis));
  }, [classStudents, selectedNisList]);

  // Synchronize state when the target student prop changes
  useEffect(() => {
    if (student) {
      setPreviewNis(student.nis);
      setSelectedNisList([student.nis]);
    }
  }, [student]);

  // If a ZIP download or Drive upload is in progress, we render just the 1 active batchStudent under loop.
  // Otherwise, we render all of the checked/selected students so they compile/print as a combined set.
  const pdfRenderStudents = useMemo(() => {
    if (isGeneratingClassPdf || isGeneratingAll || isUploadingToDrive || isSyncingAllToDrive || isGeneratingClassZip) {
      return batchStudent ? [batchStudent] : [];
    }
    return selectedStudents;
  }, [isGeneratingClassPdf, isGeneratingAll, isUploadingToDrive, isSyncingAllToDrive, isGeneratingClassZip, batchStudent, selectedStudents]);

  const filteredClassStudents = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    let result = classStudents;
    if (filterPrintedStatus === 'printed') result = result.filter(s => s.printStatus);
    if (filterPrintedStatus === 'not_printed') result = result.filter(s => !s.printStatus);
    if (!term) return result;
    return result.filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.nis.includes(term)
    );
  }, [classStudents, searchTerm, filterPrintedStatus]);

  const handleToggleStudent = (nis: string) => {
    setSelectedNisList(prev => {
      if (prev.includes(nis)) {
        if (prev.length === 1) return prev; // Keep at least one student checked
        return prev.filter(n => n !== nis);
      } else {
        return [...prev, nis];
      }
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNisList(filteredClassStudents.map(s => s.nis));
    } else {
      // Uncheck all except the currently active previewed student
      setSelectedNisList([activeStudent.nis]);
    }
  };
  
  const handlePrint = async () => {
    // Force a complete clean re-render of student data and flush updates synchronously
    flushSync(() => {
      setRenderTrigger(prev => prev + 1);
    });

    // Briefly halt execution to ensure browser layout styles parse cleanly
    await new Promise(resolve => setTimeout(resolve, 150));

    const originalTitle = document.title;
    try {
      if (selectedStudents.length === 1) {
        document.title = `Rapor_5NK_${selectedStudents[0].name.replace(/\s+/g, '_')}_${selectedStudents[0].nis}`;
      } else {
        document.title = `Rapor_5NK_Batch_${selectedClass}`;
      }
      
      const isIframe = window.self !== window.top;
      window.focus();
      window.print();
      
      if (isIframe) {
        setShowSandboxNotice(true);
      }
    } catch (err) {
      console.warn("Direct Print blocked by sandbox/browser security:", err);
      setShowSandboxNotice(true);
    } finally {
      setTimeout(() => {
        document.title = originalTitle;
      }, 500);
    }
  };



  const runDryRunAuditAndVerifyDom = (expectedStudentCount: number): boolean => {
    console.group("🔍 [PDF DRY-RUN AUDIT] Verifikasi DOM & CSS Nodes");
    const container = document.getElementById('rapor-pdf-content');
    if (!container) {
      console.error("❌ ERROR: Elemen penampung '#rapor-pdf-content' tidak ditemukan di DOM!");
      console.groupEnd();
      return false;
    }

    const studentGroups = container.querySelectorAll('.student-pdf-group');
    console.log(`[AUDIT] Jumlah group siswa ditemukan: ${studentGroups.length} (Ekspektasi: ${expectedStudentCount})`);

    if (studentGroups.length === 0) {
      console.error("❌ ERROR: Tidak ada '.student-pdf-group' yang ter-render!");
      console.groupEnd();
      return false;
    }

    if (studentGroups.length !== expectedStudentCount) {
      console.warn(`⚠️ WARNING: Jumlah kelompok siswa (${studentGroups.length}) tidak cocok dengan ekspektasi (${expectedStudentCount}). Mungkin render belum tuntas.`);
    }

    // Inspect each group for key layout requirements matching the official PDF target
    let passedAll = true;
    studentGroups.forEach((group, groupIdx) => {
      console.log(`--- Memeriksa Data Siswa #${groupIdx + 1} ---`);
      
      const printPages = group.querySelectorAll('.print-page');
      console.log(`[PAGE AUDIT] Halaman cetak ditemukan: ${printPages.length} (Target: 2 halaman per siswa)`);
      if (printPages.length !== 2) {
        console.error(`❌ ERROR: Siswa #${groupIdx + 1} harus memiliki tepat 2 '.print-page' halaman A4.`);
        passedAll = false;
      }

      printPages.forEach((page, pageIdx) => {
        const computed = window.getComputedStyle(page);
        const wVal = page.classList.contains('w-[210mm]') || computed.width.includes('210mm') || computed.width.includes('px');
        const hVal = page.classList.contains('h-[297mm]') || computed.height.includes('297mm') || computed.height.includes('px');
        console.log(`[PAGE #${pageIdx + 1} DIMENSIONS] CSS Classes: "${page.className}"`);
        console.log(`[PAGE #${pageIdx + 1} DIMENSIONS] Width Validated: ${wVal}, Height Validated: ${hVal}`);

        const tables = page.querySelectorAll('table');
        console.log(`[TABLE AUDIT] Tabel ditemukan pada Halaman #${pageIdx + 1}: ${tables.length}`);
        if (tables.length === 0) {
          console.error(`❌ ERROR: Halaman #${pageIdx + 1} tidak memiliki tabel penampung nilai!`);
          passedAll = false;
        }

        tables.forEach((table, tableIdx) => {
          const cells = table.querySelectorAll('th, td');
          console.log(` - Tabel #${tableIdx + 1} memiliki ${cells.length} sel header dan sel data.`);
          
          const firstCell = cells[0];
          if (firstCell) {
            const firstCellComputed = window.getComputedStyle(firstCell);
            const borderW = firstCellComputed.borderWidth || firstCellComputed.borderTopWidth || '0px';
            console.log(` - Ketebalan garis sel tabel: ${borderW}`);
          }
        });
        
        if (pageIdx === 0) {
          const headers = page.querySelectorAll('h1, h2');
          console.log(` - Jumlah Judul/Kop Sekolah ditemukan (h1/h2): ${headers.length}`);
          if (headers.length === 0) {
            console.error(`❌ ERROR: Judul Laporan atau Kop Sekolah tidak ditemukan di halaman pertama!`);
            passedAll = false;
          }
        }

        if (pageIdx === 1) {
          const notesAndSignatures = page.querySelectorAll('.grid');
          console.log(` - Kotak tanda tangan / catatan pendukung ditemukan: ${notesAndSignatures.length}`);
          const kesimpulanDiv = page.textContent?.includes('Kesimpulan Pencapaian 5NK');
          console.log(` - Teks kesimpulan hasil penilaian divalidasi: ${kesimpulanDiv ? 'TERSEDIA' : 'TIDAK TERDETEKSI'}`);
        }
      });
    });

    console.log(`[AUDIT HASIL] Status Uji Coba (Dry-Run Preview): ${passedAll ? '✅ MELEWATI VERIFIKASI (PASSED)' : '❌ GAGAL VERIFIKASI STATUS'}`);
    console.groupEnd();
    return passedAll;
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    const printSection = document.getElementById('rapor-print-section');
    const originalElement = document.getElementById('rapor-pdf-content');

    if (!originalElement) {
      console.error("[Cetak PDF Error] #rapor-pdf-content target selector element is missing from document DOM.");
      setIsGeneratingPdf(false);
      return;
    }

    const html2pdfFn = typeof html2pdf === 'function' ? html2pdf : (html2pdf as any).default;
    if (!html2pdfFn) {
      console.error("[Cetak PDF Error] html2pdf library function is not loaded in window scope.");
      setIsGeneratingPdf(false);
      return;
    }

    try {
      // Force a complete clean re-render of student data and flush updates
      flushSync(() => {
        setRenderTrigger(prev => prev + 1);
      });

      // Temporarily expand offscreen container dimensions to enable perfect dimensions calculations
      if (printSection) {
        printSection.style.setProperty('position', 'absolute', 'important');
        printSection.style.setProperty('left', '-9999px', 'important');
        printSection.style.setProperty('top', '0', 'important');
        printSection.style.setProperty('width', '210mm', 'important');
        printSection.style.setProperty('height', 'auto', 'important');
        printSection.style.setProperty('overflow', 'visible', 'important');
        printSection.style.setProperty('opacity', '1', 'important');
        printSection.style.setProperty('z-index', '99999', 'important');
      }

      // Allow DOM repaint
      await new Promise(resolve => setTimeout(resolve, 300));

      let filename = `Rapor_5NK_Batch_${selectedClass}.pdf`;
      if (selectedStudents.length === 1) {
        const s = selectedStudents[0];
        filename = `Rapor_5NK_${s.name.replace(/\s+/g, '_')}_${s.nis}.pdf`;
      } else {
        filename = `Rapor_5NK_Gabungan_${selectedStudents.length}_Siswa.pdf`;
      }

      console.log(`[PDF Generator] Starting jsPDF generation with filename: "${filename}"`);
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      let isFirstPage = true;
      const pages = originalElement.querySelectorAll('.print-page');
      for (let pIdx = 0; pIdx < pages.length; pIdx++) {
        const pageEl = pages[pIdx] as HTMLElement;
        const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        if (!isFirstPage) pdf.addPage('a4', 'portrait');
        isFirstPage = false;
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        
        // Release memory instantly
        canvas.width = 0;
        canvas.height = 0;
      }
      
      pdf.save(filename);
      console.log("[PDF] High Quality PDF exported successfully using jsPDF.");
      onAddExportLog?.(
        'PDF',
        `Cetak Rapor PDF (${selectedStudents.length === 1 ? selectedStudents[0].name : `${selectedStudents.length} Siswa Terpilih`})`,
        filename,
        selectedStudents.length
      );
      onMarkAsPrinted?.(selectedStudents.map(s => s.id));
    } catch (err) {
      console.error("[Cetak PDF Error] Failed to generate PDF:", err);
    } finally {
      if (printSection) {
        printSection.style.removeProperty('position');
        printSection.style.removeProperty('left');
        printSection.style.removeProperty('top');
        printSection.style.removeProperty('width');
        printSection.style.removeProperty('height');
        printSection.style.removeProperty('overflow');
        printSection.style.removeProperty('opacity');
        printSection.style.removeProperty('z-index');
      }
      setIsGeneratingPdf(false);
    }
  };

  const handleSaveToDrive = async () => {
    if (selectedStudents.length === 0) return;

    let token = await getAccessToken();
    if (!token) {
      try {
        const result = await googleSignIn();
        if (result) {
          token = result.accessToken;
        } else {
          return;
        }
      } catch (err) {
        console.error("Sign in for Drive failed:", err);
        alert("Gagal masuk ke Google. Tidak dapat menyimpan ke Drive.");
        return;
      }
    }

    if (!window.confirm(`Simpan dokumen Rapor untuk ${selectedStudents.length} siswa ke Google Drive Anda? Tindakan ini akan mengunggah file. Ini mungkin membutuhkan beberapa menit.`)) {
        return;
    }

    const html2pdfFn = typeof html2pdf === 'function' ? html2pdf : (html2pdf as any).default;
    if (!html2pdfFn) {
      console.error("[Cetak PDF Error] html2pdf library function is not loaded in window scope.");
      return;
    }

    setIsUploadingToDrive(true);
    const printSection = document.getElementById('rapor-print-section');

    try {
      // Temporarily expand offscreen container dimensions to enable perfect dimensions calculations
      if (printSection) {
        printSection.style.setProperty('position', 'absolute', 'important');
        printSection.style.setProperty('left', '-9999px', 'important');
        printSection.style.setProperty('top', '0', 'important');
        printSection.style.setProperty('width', '210mm', 'important');
        printSection.style.setProperty('height', 'auto', 'important');
        printSection.style.setProperty('overflow', 'visible', 'important');
        printSection.style.setProperty('opacity', '1', 'important');
        printSection.style.setProperty('z-index', '99999', 'important');
      }

      let uploadedCount = 0;
      console.log(`[Drive Engine] Starting generation of ${selectedStudents.length} student documents.`);

      for (const curStudent of selectedStudents) {
        flushSync(() => {
          setBatchStudent(curStudent);
          setRenderTrigger(prev => prev + 1);
        });

        await new Promise(resolve => setTimeout(resolve, 150));

        const originalElement = document.getElementById('rapor-pdf-content');
        if (!originalElement) {
          continue;
        }

        void originalElement.offsetHeight;
        await new Promise(resolve => setTimeout(resolve, 100));

        runDryRunAuditAndVerifyDom(1);

        let filename = `Rapor_5NK_${curStudent.name.replace(/\s+/g, '_')}_${curStudent.nis}.pdf`;
        
        // Using direct html2canvas + jsPDF to prevent worker crashes inside loop
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        let isFirstPage = true;
        const pages = originalElement.querySelectorAll('.print-page');
        for (let pIdx = 0; pIdx < pages.length; pIdx++) {
          const pageEl = pages[pIdx] as HTMLElement;
          const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, logging: false });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          
          if (!isFirstPage) pdf.addPage('a4', 'portrait');
          isFirstPage = false;
          pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
          
          // Release memory instantly
          canvas.width = 0;
          canvas.height = 0;
        }

        const pdfBlob = pdf.output('blob');
        
        if (pdfBlob && pdfBlob.size > 0) {
          await uploadFileToDrive(token, pdfBlob, filename);
          uploadedCount++;
          onMarkAsPrinted?.([curStudent.id]);
        }
      }

      flushSync(() => {
        setBatchStudent(null);
      });

      alert(`Berhasil menyimpan ${uploadedCount} dokumen ke Google Drive Anda.`);
    } catch (err) {
      console.error("Kesalahan Simpan ke Drive:", err);
      alert("Gagal menyimpan dokumen ke Google Drive. Mohon periksa kembali koneksi internet dan perizinan akun Anda.");
    } finally {
      if (printSection) {
        printSection.style.removeProperty('position');
        printSection.style.removeProperty('left');
        printSection.style.removeProperty('top');
        printSection.style.removeProperty('width');
        printSection.style.removeProperty('height');
        printSection.style.removeProperty('overflow');
        printSection.style.removeProperty('opacity');
        printSection.style.removeProperty('z-index');
      }
      setBatchStudent(null);
      setIsUploadingToDrive(false);
    }
  };

  const handleSyncAllToDrive = async () => {
    if (classStudents.length === 0) return;

    let token = await getAccessToken();
    if (!token) {
      try {
        const result = await googleSignIn();
        if (result) {
          token = result.accessToken;
        } else {
          return;
        }
      } catch (err) {
        console.error("Sign in for Drive failed:", err);
        alert("Gagal masuk ke Google. Tidak dapat melakukan sinkronisasi.");
        return;
      }
    }

    const targetFolderName = `Rapor Kelas ${selectedClass}`;
    const confirmed = window.confirm(
      `Sync to Google Drive:\n\nApakah Anda yakin ingin menyinkronkan seluruh rapor untuk ${classStudents.length} siswa di kelas ${selectedClass} ke Google Drive?\n\nFile akan disimpan dalam folder khusus bernama "${targetFolderName}". Proses ini berjalan di latar belakang.`
    );
    if (!confirmed) return;

    const html2pdfFn = typeof html2pdf === 'function' ? html2pdf : (html2pdf as any).default;
    if (!html2pdfFn) {
      console.error("[Cetak PDF Error] html2pdf library function is not loaded in window scope.");
      return;
    }

    setIsSyncingAllToDrive(true);
    setSyncStatus({
      total: classStudents.length,
      current: 0,
      completed: 0,
      failed: 0,
      currentStudentName: 'Mempersiapkan folder...',
      folderName: targetFolderName,
    });

    const printSection = document.getElementById('rapor-print-section');

    try {
      // Temporarily expand offscreen container dimensions to enable perfect dimensions calculations
      if (printSection) {
        printSection.style.setProperty('position', 'absolute', 'important');
        printSection.style.setProperty('left', '-9999px', 'important');
        printSection.style.setProperty('top', '0', 'important');
        printSection.style.setProperty('width', '210mm', 'important');
        printSection.style.setProperty('height', 'auto', 'important');
        printSection.style.setProperty('overflow', 'visible', 'important');
        printSection.style.setProperty('opacity', '1', 'important');
        printSection.style.setProperty('z-index', '99999', 'important');
      }

      // Create or locate the dedicated folder
      const folderId = await getOrCreateFolder(token, targetFolderName);

      // Auto-upload the comprehensive Excel report format to Google Drive as requested by user
      try {
        const XLSX = await import('xlsx');
        const rows: any[] = [];
        rows.push(['YAYASAN KARTIKA JAYA']);
        rows.push([`REKAPITULASI PENILAIAN 5NK KELAS ${selectedClass}`]);
        const schoolTeacher = teachers.find(t => (t.classAssigned || '').trim().toUpperCase() === (selectedClass || '').trim().toUpperCase());
        const resolvedWaliKelasName = schoolTeacher ? schoolTeacher.name : waliKelasName;
        rows.push([`Wali Kelas: ${resolvedWaliKelasName || '-'}`]);
        rows.push([]);
        
        const indicatorIds: string[] = [];
        const indicatorHeaders: string[] = [];
        
        categories.forEach(cat => {
          cat.indicators.forEach(ind => {
            indicatorIds.push(ind.id);
            indicatorHeaders.push(`${cat.id}: ${ind.text.substring(0, 30)}...`);
          });
        });

        const headers = ['No', 'NIS', 'Nama Siswa', 'L/P', ...indicatorHeaders, 'Kesimpulan', 'Catatan Wali'];
        rows.push(headers);

        classStudents.forEach((student, index) => {
          const studentRow = [
            index + 1,
            student.nis,
            student.name,
            student.gender,
            ...indicatorIds.map(id => student.grades[id] || '-'),
            student.kesimpulan,
            student.catatanWali
          ];
          rows.push(studentRow);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap_Kelas_${selectedClass}`);
        
        const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const excelBlob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const excelFilename = `Rekap_5NK_Kelas_${selectedClass}.xlsx`;
        
        await uploadFileToDrive(token, excelBlob, excelFilename, folderId);
        console.log(`[Sync Engine] Automatically updated overall excel: ${excelFilename}`);
      } catch (xlErr) {
        console.error("Gagal mengunggah laporan Excel ke Google Drive:", xlErr);
      }

      console.log(`[Sync Engine] Starting background sync of ${classStudents.length} student documents.`);

      for (let i = 0; i < classStudents.length; i++) {
        const curStudent = classStudents[i];
        
        setSyncStatus(prev => ({
          ...prev,
          current: i + 1,
          currentStudentName: curStudent.name,
        }));

        try {
          flushSync(() => {
            setBatchStudent(curStudent);
            setRenderTrigger(prev => prev + 1);
          });

          await new Promise(resolve => setTimeout(resolve, 150));

          const originalElement = document.getElementById('rapor-pdf-content');
          if (!originalElement) {
            throw new Error("Elemen rapor-pdf-content tidak ditemukan di DOM");
          }

          void originalElement.offsetHeight;
          await new Promise(resolve => setTimeout(resolve, 100));

          // Using direct html2canvas + jsPDF to prevent worker crashes inside background loop
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
          });

          let isFirstPage = true;
          const pages = originalElement.querySelectorAll('.print-page');
          for (let pIdx = 0; pIdx < pages.length; pIdx++) {
            const pageEl = pages[pIdx] as HTMLElement;
            const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            
            if (!isFirstPage) pdf.addPage('a4', 'portrait');
            isFirstPage = false;
            pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
            
            // Release memory instantly
            canvas.width = 0;
            canvas.height = 0;
          }

          const filename = `Rapor_5NK_${curStudent.name.replace(/\s+/g, '_')}_${curStudent.nis}.pdf`;
          const pdfBlob = pdf.output('blob');
          
          if (pdfBlob && pdfBlob.size > 0) {
            await uploadFileToDrive(token, pdfBlob, filename, folderId);
            setSyncStatus(prev => ({
              ...prev,
              completed: prev.completed + 1,
            }));
            onMarkAsPrinted?.([curStudent.id]);
          } else {
            throw new Error("Gagal membuat fail PDF");
          }
        } catch (itemErr) {
          console.error(`Gagal menyinkronkan siswa ${curStudent.name}:`, itemErr);
          setSyncStatus(prev => ({
            ...prev,
            failed: prev.failed + 1,
          }));
        }
      }

      console.log("[Sync Engine] Background sync completed.");
    } catch (err) {
      console.error("Kesalahan Sinkronisasi Latar Belakang:", err);
      alert("Terjadi kesalahan fatal dalam proses sinkronisasi Google Drive.");
    } finally {
      if (printSection) {
        printSection.style.removeProperty('position');
        printSection.style.removeProperty('left');
        printSection.style.removeProperty('top');
        printSection.style.removeProperty('width');
        printSection.style.removeProperty('height');
        printSection.style.removeProperty('overflow');
        printSection.style.removeProperty('opacity');
        printSection.style.removeProperty('z-index');
      }
      setBatchStudent(null);
    }
  };

  const handleDownloadClassZIP = async () => {
    if (classStudents.length === 0) return;
    
    const html2pdfFn = typeof html2pdf === 'function' ? html2pdf : (html2pdf as any).default;
    if (!html2pdfFn) {
      console.error("[Cetak Semua Error] html2pdf library function is not loaded in window scope.");
      return;
    }

    setIsGeneratingClassZip(true);
    setClassZipStatus({
      total: classStudents.length,
      current: 0,
      completed: 0,
      failed: 0,
      currentStudentName: 'Mempersiapkan dokumen...',
    });

    const printSection = document.getElementById('rapor-print-section');

    try {
      // Temporarily expand offscreen container dimensions to enable perfect dimensions calculations
      if (printSection) {
        printSection.style.setProperty('position', 'absolute', 'important');
        printSection.style.setProperty('left', '-9999px', 'important');
        printSection.style.setProperty('top', '0', 'important');
        printSection.style.setProperty('width', '210mm', 'important');
        printSection.style.setProperty('height', 'auto', 'important');
        printSection.style.setProperty('overflow', 'visible', 'important');
        printSection.style.setProperty('opacity', '1', 'important');
        printSection.style.setProperty('z-index', '99999', 'important');
      }

      const zip = new JSZip();
      const folderName = `Rapor_Kelas_${selectedClass}`;
      const folder = zip.folder(folderName);
      if (!folder) throw new Error("Failed to create ZIP folder");

      console.log(`[Batch Class ZIP Engine] Starting generation of ${classStudents.length} student documents.`);

      for (let i = 0; i < classStudents.length; i++) {
        const curStudent = classStudents[i];
        console.log(`[Batch Class ZIP Engine] Processing student: "${curStudent.name}" (${curStudent.nis})`);

        setClassZipStatus(prev => ({
          ...prev,
          current: i + 1,
          currentStudentName: curStudent.name,
        }));

        try {
          flushSync(() => {
            setBatchStudent(curStudent);
            setRenderTrigger(prev => prev + 1);
          });

          // Ensure React finishes rendering and DOM hydrates
          await new Promise(resolve => setTimeout(resolve, 150));

          const originalElement = document.getElementById('rapor-pdf-content');
          if (!originalElement) {
            console.error("[Cetak Semua Error] #rapor-pdf-content element is missing.");
            throw new Error(`Elemen rapor-pdf-content tidak ditemukan untuk ${curStudent.name}`);
          }

          // Force synchronous layout reflow
          void originalElement.offsetHeight;
          
          // Allow the browser to calculate complete styles
          await new Promise(resolve => setTimeout(resolve, 100));

          // Run live dry-run DOM verification check for 1 expected student group in batch focus mode
          const dryRunPassed = runDryRunAuditAndVerifyDom(1);
          if (!dryRunPassed) {
            console.warn(`[Batch Dry-Run Warning] Student "${curStudent.name}" failed complete pristine DOM audit verification.`);
          }

          const filename = `Rapor_5NK_${curStudent.name.replace(/\s+/g, '_')}_${curStudent.nis}.pdf`;
          
          // Generate Blob directly from the fully stable element using direct html2canvas + jsPDF to prevent worker crashes
          console.log(` - Generating jsPDF blob for ${curStudent.name}...`);
          
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
          });

          let isFirstPage = true;
          const pages = originalElement.querySelectorAll('.print-page');
          for (let pIdx = 0; pIdx < pages.length; pIdx++) {
            const pageEl = pages[pIdx] as HTMLElement;
            const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, logging: false });
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            
            if (!isFirstPage) pdf.addPage('a4', 'portrait');
            isFirstPage = false;
            pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
            
            // Release memory instantly
            canvas.width = 0;
            canvas.height = 0;
          }

          let pdfBlob: Blob | null = pdf.output('blob');
          
          if (pdfBlob && pdfBlob.size > 0) {
            console.log(` ✅ Blob generated successfully: ${pdfBlob.size} bytes. MIME: ${pdfBlob.type}`);
            folder.file(filename, pdfBlob);
            setClassZipStatus(prev => ({
              ...prev,
              completed: prev.completed + 1,
            }));
            onMarkAsPrinted?.([curStudent.id]);
          } else {
            console.error(` ❌ ERROR: Generated blob for "${curStudent.name}" is empty or failed!`);
            throw new Error(`Empty blob generated for student: ${curStudent.name}`);
          }

          // Force release blob memory reference and wipe temporary canvases from DOM
          pdfBlob = null;
          const canvases = document.querySelectorAll('canvas');
          canvases.forEach(canvas => canvas.remove());
        } catch (itemErr) {
          console.error(`Gagal membuat PDF untuk siswa ${curStudent.name}:`, itemErr);
          setClassZipStatus(prev => ({
            ...prev,
            failed: prev.failed + 1,
          }));
        }
      }

      // Restore UI back to normal Selected Student
      flushSync(() => {
        setBatchStudent(null);
      });

      console.log("[Batch Class ZIP Engine] Compiling ZIP archive...");
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      const downloadName = `${folderName}.zip`;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log("[Batch Class ZIP Engine] Batch class processing completed successfully and ZIP downloaded.");
      onAddExportLog?.('PDF', `Ekspor Arsip ZIP Massal (Seluruh Kelas ${selectedClass})`, downloadName, classStudents.length);

    } catch (err) {
      console.error("Kesalahan Unduh ZIP Seluruh Kelas:", err);
      alert("Kesalahan terjadi sewaktu mengekspor ZIP seluruh kelas. Silakan ulangi sesaat lagi.");
    } finally {
      if (printSection) {
        printSection.style.removeProperty('position');
        printSection.style.removeProperty('left');
        printSection.style.removeProperty('top');
        printSection.style.removeProperty('width');
        printSection.style.removeProperty('height');
        printSection.style.removeProperty('overflow');
        printSection.style.removeProperty('opacity');
        printSection.style.removeProperty('z-index');
      }
      setBatchStudent(null);
    }
  };

  const handleDownloadClassPDF = async () => {
    if (classStudents.length === 0) return;
    
    const printSection = document.getElementById('rapor-print-section');

    try {
      setIsGeneratingClassPdf(true);

      if (printSection) {
        printSection.style.setProperty('position', 'absolute', 'important');
        printSection.style.setProperty('left', '-9999px', 'important');
        printSection.style.setProperty('top', '0', 'important');
        printSection.style.setProperty('width', '210mm', 'important');
        printSection.style.setProperty('height', 'auto', 'important');
        printSection.style.setProperty('overflow', 'visible', 'important');
        printSection.style.setProperty('opacity', '1', 'important');
        printSection.style.setProperty('z-index', '99999', 'important');
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      let isFirstPage = true;

      for (let i = 0; i < classStudents.length; i++) {
        const curStudent = classStudents[i];
        
        flushSync(() => {
          setBatchStudent(curStudent);
          setClassPdfStatus({
            total: classStudents.length,
            current: i + 1,
            currentStudentName: curStudent.name,
          });
          setRenderTrigger(prev => prev + 1);
        });

        const originalElement = document.getElementById('rapor-pdf-content');
        if (!originalElement) continue;

        void originalElement.offsetHeight;
        
        // Wait for images and layouts to settle
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const pages = originalElement.querySelectorAll('.print-page');
        for (let pIdx = 0; pIdx < pages.length; pIdx++) {
          const pageEl = pages[pIdx] as HTMLElement;
          const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, logging: false });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          
          if (!isFirstPage) {
            pdf.addPage('a4', 'portrait');
          }
          isFirstPage = false;
          
          pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
          
          // Clear canvas memory immediately
          canvas.width = 0;
          canvas.height = 0;
        }
      }

      const filename = `Rapor_Massal_Kelas_${selectedClass}.pdf`;
      console.log(`[Class PDF Generator] Saving assembled jsPDF with filename: "${filename}"`);
      
      if (autoPrintImmediately) {
        pdf.autoPrint();
        const blobUrl = pdf.output('bloburl');
        window.open(blobUrl, '_blank');
        try {
          // Attempt to save as fallback
          pdf.save(filename);
        } catch (e) {}
      } else {
        pdf.save(filename);
      }
      
      console.log("[Class PDF Generator] Bulk class PDF downloaded successfully.");
      
      onAddExportLog?.('PDF', `Cetak Rapor PDF Massal Tergabung (Seluruh Kelas ${selectedClass})`, filename, classStudents.length);
      onMarkAsPrinted?.(classStudents.map(s => s.id));
      
    } catch (err) {
      console.error("Kesalahan Unduh PDF Massal Kelas:", err);
      alert("Gagal mengunduh rapor massal kelas. Silakan coba kembali.");
    } finally {
      setIsGeneratingClassPdf(false);
      flushSync(() => {
        setBatchStudent(null);
      });
      if (printSection) {
        printSection.style.removeProperty('position');
        printSection.style.removeProperty('left');
        printSection.style.removeProperty('top');
        printSection.style.removeProperty('width');
        printSection.style.removeProperty('height');
        printSection.style.removeProperty('overflow');
        printSection.style.removeProperty('opacity');
        printSection.style.removeProperty('z-index');
      }
    }
  };

  const handleDownloadAllPDFs = async () => {
    if (selectedStudents.length === 0) return;
    
    const html2pdfFn = typeof html2pdf === 'function' ? html2pdf : (html2pdf as any).default;
    if (!html2pdfFn) {
      console.error("[Cetak Semua Error] html2pdf library function is not loaded in window scope.");
      return;
    }

    setIsGeneratingAll(true);
    const printSection = document.getElementById('rapor-print-section');

    try {
      // Temporarily expand offscreen container dimensions to enable perfect dimensions calculations
      if (printSection) {
        printSection.style.setProperty('position', 'absolute', 'important');
        printSection.style.setProperty('left', '-9999px', 'important');
        printSection.style.setProperty('top', '0', 'important');
        printSection.style.setProperty('width', '210mm', 'important');
        printSection.style.setProperty('height', 'auto', 'important');
        printSection.style.setProperty('overflow', 'visible', 'important');
        printSection.style.setProperty('opacity', '1', 'important');
        printSection.style.setProperty('z-index', '99999', 'important');
      }

      const zip = new JSZip();
      const folderName = `Rapor_5NK_${selectedClass}`;
      const folder = zip.folder(folderName);
      if (!folder) throw new Error("Failed to create ZIP folder");

      console.log(`[Batch PDF Engine] Starting generation of ${selectedStudents.length} student documents.`);

      for (const curStudent of selectedStudents) {
        console.log(`[Batch PDF Engine] Processing student: "${curStudent.name}" (${curStudent.nis})`);
        
        flushSync(() => {
          setBatchStudent(curStudent);
          setRenderTrigger(prev => prev + 1);
        });

        // Ensure React finishes rendering and DOM hydrates
        await new Promise(resolve => setTimeout(resolve, 150));

        const originalElement = document.getElementById('rapor-pdf-content');
        if (!originalElement) {
          console.error("[Cetak Semua Error] #rapor-pdf-content element is missing.");
          continue;
        }

        // Force synchronous layout reflow
        void originalElement.offsetHeight;
        
        // Allow the browser to calculate complete styles
        await new Promise(resolve => setTimeout(resolve, 100));

        // Run live dry-run DOM verification check for 1 expected student group in batch focus mode
        const dryRunPassed = runDryRunAuditAndVerifyDom(1);
        if (!dryRunPassed) {
          console.warn(`[Batch Dry-Run Warning] Student "${curStudent.name}" failed complete pristine DOM audit verification.`);
        }

        const filename = `Rapor_5NK_${curStudent.name.replace(/\s+/g, '_')}_${curStudent.nis}.pdf`;
        
        // Generate Blob using direct html2canvas + jsPDF to prevent worker crashes
        console.log(` - Generating jsPDF blob for ${curStudent.name}...`);
        
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
          compress: true
        });

        let isFirstPage = true;
        const pages = originalElement.querySelectorAll('.print-page');
        for (let pIdx = 0; pIdx < pages.length; pIdx++) {
          const pageEl = pages[pIdx] as HTMLElement;
          const canvas = await html2canvas(pageEl, { scale: 2, useCORS: true, logging: false });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          
          if (!isFirstPage) pdf.addPage('a4', 'portrait');
          isFirstPage = false;
          pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
          
          // Release memory instantly
          canvas.width = 0;
          canvas.height = 0;
        }

        let pdfBlob: Blob | null = pdf.output('blob');
        
        if (pdfBlob && pdfBlob.size > 0) {
          console.log(` ✅ Blob generated successfully: ${pdfBlob.size} bytes. MIME: ${pdfBlob.type}`);
          folder.file(filename, pdfBlob);
        } else {
          console.error(` ❌ ERROR: Generated blob for "${curStudent.name}" is empty or failed!`);
          throw new Error(`Empty blob generated for student: ${curStudent.name}`);
        }

        // Release references and clear html2canvas layout canvas elements to reduce memory usage
        pdfBlob = null;
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => canvas.remove());
      }

      // Restore UI back to normal Selected Student
      flushSync(() => {
        setBatchStudent(null);
      });

      console.log("[Batch PDF Engine] Compiling ZIP archive...");
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      const downloadName = `${folderName}.zip`;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log("[Batch PDF Engine] Batch processing completed successfully and ZIP downloaded.");
      onAddExportLog?.('PDF', `Ekspor Arsip ZIP (${selectedStudents.length} Rapor Siswa Terpilih)`, downloadName, selectedStudents.length);

    } catch (err) {
      console.error("Kesalahan Unduh Semua PDF:", err);
      alert("Kesalahan terjadi sewaktu mengekspor seluruh PDF. Silakan ulangi sesaat lagi.");
    } finally {
      if (printSection) {
        printSection.style.removeProperty('position');
        printSection.style.removeProperty('left');
        printSection.style.removeProperty('top');
        printSection.style.removeProperty('width');
        printSection.style.removeProperty('height');
        printSection.style.removeProperty('overflow');
        printSection.style.removeProperty('opacity');
        printSection.style.removeProperty('z-index');
      }
      setBatchStudent(null);
      setIsGeneratingAll(false);
    }
  };

  // Kartika Jaya School Seal Representation from Google Drive (high precision overlay)
  const KartikaLogo = () => (
    <img
      src="https://lh3.googleusercontent.com/d/1SD7iCTF6AZsj54LY0KckHkgIS93wtzq3"
      alt="Logo Kartika"
      className="max-h-20 max-w-20 object-contain mx-auto"
      referrerPolicy="no-referrer"
      crossOrigin="anonymous"
    />
  );

  // Calculate auto-fit preview scaling factor and margin offset
  const baseWidth = 830;
  const scaleFactor = isAutoFitPreview && containerWidth && containerWidth < baseWidth 
    ? (containerWidth - 24) / 794 
    : zoomLevel;
  const totalHeight = 2245; // Approx unscaled height of 2 A4 pages simulated on screen (1122px each)
  const marginOffset = scaleFactor < 1 ? -totalHeight * (1 - scaleFactor) : 0;

  return (
    <div id="rapor-cetak-wrapper" className="flex flex-col gap-6">
      {/* EXPORT CONFIRM DIALOG */}
      {exportConfirmTarget && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-bold tracking-wide flex items-center gap-2">
                <Archive className="h-5 w-5" /> 
                Konfirmasi Ekspor Data
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm font-medium text-slate-700 leading-relaxed mb-4">
                Anda akan melakukan proses ekspor 
                {exportConfirmTarget === 'EXCEL' && <strong className="text-indigo-700 mx-1">Data Nilai ke Excel</strong>}
                {exportConfirmTarget === 'PDF_SELECTED' && <strong className="text-indigo-700 mx-1">Rapor PDF ({selectedStudents.length > 1 ? 'Massal Terpilih' : 'Tunggal'})</strong>}
                {exportConfirmTarget === 'PDF_CLASS' && <strong className="text-indigo-700 mx-1">Rapor PDF Massal (Seluruh Kelas)</strong>}
                {exportConfirmTarget === 'ZIP_SELECTED' && <strong className="text-indigo-700 mx-1">Arsip ZIP (Terpilih)</strong>}
                {exportConfirmTarget === 'ZIP_CLASS' && <strong className="text-indigo-700 mx-1">Arsip ZIP Massal (Seluruh Kelas)</strong>}
                berikut rinciannya:
              </p>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-2.5 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Kelas yang diproses:</span>
                  <span className="font-bold text-slate-800">{student.kelas}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500 font-medium">Jumlah Data Siswa:</span>
                  <span className="font-bold text-indigo-700 text-lg">
                    {exportConfirmTarget.includes('CLASS') || exportConfirmTarget === 'EXCEL' ? classStudents.length : selectedStudents.length} 
                    <span className="text-sm font-medium text-slate-600 ml-1">Siswa</span>
                  </span>
                </div>
              </div>

              {exportConfirmTarget === 'PDF_CLASS' && (
                <div className="border border-indigo-100 bg-indigo-50/40 p-4 rounded-xl mb-6">
                  <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider block mb-3">Pilihlah Format PDF Seluruh Kelas:</span>
                  <div className="flex flex-col gap-2.5">
                    <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 cursor-pointer transition-all select-none">
                      <input
                        type="radio"
                        name="classPdfFormat"
                        checked={classPdfFormat === 'COMBINED'}
                        onChange={() => setClassPdfFormat('COMBINED')}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Satu Dokumen PDF Gabungan</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5 leading-normal">Seluruh siswa digabungkan dalam satu berkas PDF tunggal berturut-turut.</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 cursor-pointer transition-all select-none">
                      <input
                        type="radio"
                        name="classPdfFormat"
                        checked={classPdfFormat === 'SEPARATE'}
                        onChange={() => setClassPdfFormat('SEPARATE')}
                        className="mt-0.5 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Berkas PDF Terpisah per Siswa (.ZIP)</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5 leading-normal">Rapor setiap siswa diunduh sebagai PDF terpisah dibungkus rapi dalam arsip ZIP.</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-2">
                <button
                  onClick={() => setExportConfirmTarget(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  onClick={confirmAction}
                  className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  Lanjutkan Ekspor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPrintOptimizeEnabled && (
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 0;
            }
          }
        `}} />
      )}
      {/* Action panel & toolbar */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-3 no-print">
        {/* Row 1: Back & Title */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Grid Excel
          </button>
          
          <button
            onClick={() => setIsToolsExpandedMobile(prev => !prev)}
            className="lg:hidden px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Sliders className="h-4 w-4 text-indigo-600" />
            <span>Alat & Ekspor Lainnya</span>
            <span className={`transition-transform duration-200 ${isToolsExpandedMobile ? 'rotate-180' : ''}`}>▼</span>
          </button>
        </div>

        {/* Row 2: Standard Quick Actions (Responsive Grid) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap gap-2.5">
          {/* 1. Cetak Langsung / Massal */}
          <button
            onClick={handlePrint}
            disabled={isGeneratingPdf || isGeneratingAll || isGeneratingClassZip || isUploadingToDrive || isSyncingAllToDrive || selectedStudents.length === 0}
            className={`px-3 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md hover:shadow-indigo-100/50 ${
              isGeneratingPdf || isGeneratingAll || isUploadingToDrive || isSyncingAllToDrive || isGeneratingClassZip ? 'opacity-50 cursor-allowed' : ''
            }`}
          >
            <Printer className="h-4 w-4" />
            <span className="truncate">{selectedStudents.length > 1 ? `Cetak Massal (${selectedStudents.length})` : 'Cetak Rapor'}</span>
          </button>

          {/* 2. Unduh PDF / Gabungan */}
          <button
            onClick={() => setExportConfirmTarget('PDF_SELECTED')}
            disabled={isGeneratingPdf || isGeneratingAll || isGeneratingClassZip || isUploadingToDrive || isSyncingAllToDrive || selectedStudents.length === 0}
            className={`px-3 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md hover:shadow-rose-100/50 ${isGeneratingPdf ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="truncate">Proses...</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                <span className="truncate">{selectedStudents.length > 1 ? `PDF Gabungan (${selectedStudents.length})` : 'Unduh PDF'}</span>
              </>
            )}
          </button>

          {/* 3. Excel Download */}
          <button
            onClick={() => setExportConfirmTarget('EXCEL')}
            className="px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-700" />
            <span className="truncate">Excel (.xlsx)</span>
          </button>

          {/* On Desktop, we show the rest inline. On Mobile, we hide them in the collapsible panel under row 2 */}
          <div className="hidden lg:flex lg:flex-wrap gap-2.5 items-center w-full lg:w-auto mt-2 lg:mt-0">
            {/* Auto-Fit Toggle Desktop */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1 bg-slate-50 border-r-0 rounded-l-lg hover:bg-slate-100 transition-colors">
              <button onClick={() => { setIsAutoFitPreview(false); setZoomLevel(prev => Math.max(0.5, prev - 0.1)); }} className="text-slate-500 hover:text-indigo-600 font-extrabold cursor-pointer px-1">-</button>
              <span className="text-[10px] font-bold text-slate-700 w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => { setIsAutoFitPreview(false); setZoomLevel(prev => Math.min(2, prev + 0.1)); }} className="text-slate-500 hover:text-indigo-600 font-extrabold cursor-pointer px-1">+</button>
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white border border-slate-200 px-3 py-1.5 rounded-r-lg border-l hover:bg-slate-50 transition-colors mr-2">
              <input
                type="checkbox"
                checked={isAutoFitPreview}
                onChange={(e) => {
                  setIsAutoFitPreview(e.target.checked);
                  if (e.target.checked) setZoomLevel(1);
                }}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-505 h-3.5 w-3.5 cursor-pointer"
              />
              <span className="text-[10px] font-extrabold text-slate-700">Autofit Preview</span>
            </label>

            {/* Margin Guide Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors mr-2">
              <input
                type="checkbox"
                checked={showMarginsGuide}
                onChange={(e) => setShowMarginsGuide(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-505 h-3.5 w-3.5 cursor-pointer"
              />
              <span className="text-[10px] font-extrabold text-slate-700">Margin Guide</span>
            </label>

            {/* Optimize Print checkbox */}
            <label className="flex items-center gap-1.5 cursor-pointer select-none bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={isPrintOptimizeEnabled}
                onChange={(e) => setIsPrintOptimizeEnabled(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-505 h-3.5 w-3.5 cursor-pointer"
              />
              <span className="text-[10px] font-extrabold text-slate-700">Optimize Print (A4)</span>
            </label>

            {/* Diagnostic Mode */}
            <button
              onClick={() => setIsDiagnosticMode(prev => !prev)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-all border ${
                isDiagnosticMode
                  ? 'bg-amber-600 border-amber-700 text-white hover:bg-amber-700'
                  : 'bg-white border-slate-200 text-amber-700 hover:bg-amber-50'
              }`}
              title="Audit tata letak PDF 1:1"
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Diagnostic</span>
            </button>

            {/* ZIP Selected */}
            <button
              onClick={() => setExportConfirmTarget('ZIP_SELECTED')}
              disabled={isGeneratingPdf || isGeneratingAll || isGeneratingClassZip || isUploadingToDrive || isSyncingAllToDrive || selectedStudents.length === 0}
              className="px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Archive className="h-3.5 w-3.5" />
              <span>ZIP Terpilih ({selectedStudents.length})</span>
            </button>

            {/* ZIP Class */}
            <button
              onClick={() => setExportConfirmTarget('ZIP_CLASS')}
              disabled={isGeneratingPdf || isGeneratingAll || isGeneratingClassZip || isUploadingToDrive || isSyncingAllToDrive || classStudents.length === 0}
              className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Archive className="h-3.5 w-3.5" />
              <span>Ekspor ZIP Kelas</span>
            </button>

            {/* Class PDF Combined */}
            <button
              onClick={() => setExportConfirmTarget('PDF_CLASS')}
              disabled={isGeneratingClassPdf || isGeneratingPdf || isGeneratingAll || isGeneratingClassZip || isUploadingToDrive || isSyncingAllToDrive || classStudents.length === 0}
              className="px-3 py-1.5 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>PDF Kelas</span>
            </button>

            {/* Save single to GDrive */}
            <button
              onClick={handleSaveToDrive}
              disabled={isUploadingToDrive || isGeneratingPdf || isGeneratingAll || isGeneratingClassZip || isSyncingAllToDrive || selectedStudents.length === 0}
              className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Cloud className="h-3.5 w-3.5" />
              <span>Ke Drive</span>
            </button>

            {/* Sync all class to GDrive */}
            <button
              onClick={handleSyncAllToDrive}
              disabled={isSyncingAllToDrive || isUploadingToDrive || isGeneratingPdf || isGeneratingAll || isGeneratingClassZip || classStudents.length === 0}
              className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <Cloud className="h-3.5 w-3.5" />
              <span>Sync Drive</span>
            </button>
          </div>
        </div>

        {/* Collapsible secondary panel for mobile */}
        {isToolsExpandedMobile && (
          <div className="lg:hidden p-3.5 bg-white border border-slate-200 rounded-xl flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200 mt-1">
            <span className="text-[10px] font-bold text-slate-400 border-b border-slate-100 pb-1.5 uppercase block">⚙️ Opsi Penyesuaian & Format Lainnya</span>
            
            {/* Toggles */}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 border border-slate-200 p-2 rounded-lg hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={isAutoFitPreview}
                  onChange={(e) => setIsAutoFitPreview(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">Autofit Preview</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none bg-slate-50 border border-slate-200 p-2 rounded-lg hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={isPrintOptimizeEnabled}
                  onChange={(e) => setIsPrintOptimizeEnabled(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700">Optimize Print (A4)</span>
              </label>
            </div>

            {/* System operations Buttons Grid */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                onClick={() => {
                  setIsDiagnosticMode(prev => !prev);
                  setIsToolsExpandedMobile(false);
                }}
                className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 ${
                  isDiagnosticMode 
                    ? 'bg-amber-600 border-amber-700 text-white' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>Mode Diagnostik</span>
              </button>

              <button
                onClick={() => {
                  setExportConfirmTarget('ZIP_SELECTED');
                  setIsToolsExpandedMobile(false);
                }}
                disabled={isGeneratingPdf || isGeneratingAll || isGeneratingClassZip || isUploadingToDrive || isSyncingAllToDrive || selectedStudents.length === 0}
                className="p-2.5 rounded-lg bg-amber-605 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>ZIP Terpilih ({selectedStudents.length})</span>
              </button>

              <button
                onClick={() => {
                  setExportConfirmTarget('ZIP_CLASS');
                  setIsToolsExpandedMobile(false);
                }}
                disabled={isGeneratingPdf || isGeneratingAll || isGeneratingClassZip || isUploadingToDrive || isSyncingAllToDrive || classStudents.length === 0}
                className="p-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Ekspor ZIP Kelas</span>
              </button>

              <button
                onClick={() => {
                  setExportConfirmTarget('PDF_CLASS');
                  setIsToolsExpandedMobile(false);
                }}
                disabled={isGeneratingClassPdf || isGeneratingPdf || isGeneratingAll || isGeneratingClassZip || isUploadingToDrive || isSyncingAllToDrive || classStudents.length === 0}
                className="p-2.5 rounded-lg bg-violet-650 hover:bg-violet-750 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>PDF Kelas</span>
              </button>

              <button
                onClick={() => {
                  handleSaveToDrive();
                  setIsToolsExpandedMobile(false);
                }}
                disabled={isUploadingToDrive || isGeneratingPdf || isGeneratingAll || isGeneratingClassZip || isSyncingAllToDrive || selectedStudents.length === 0}
                className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Cloud className="h-3.5 w-3.5" />
                <span>Simpan ke Drive</span>
              </button>

              <button
                onClick={() => {
                  handleSyncAllToDrive();
                  setIsToolsExpandedMobile(false);
                }}
                disabled={isSyncingAllToDrive || isUploadingToDrive || isGeneratingPdf || isGeneratingAll || isGeneratingClassZip || classStudents.length === 0}
                className="p-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Cloud className="h-3.5 w-3.5" />
                <span>Sync to GDrive</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Visual notice */}
      <div className="p-4 bg-amber-50/80 border border-amber-200 text-amber-800 text-xs rounded-xl flex flex-col gap-2 no-print leading-relaxed">
        <div className="flex items-start gap-2.5">
          <Sparkles className="h-4.5 w-4.5 text-amber-600 flex-none mt-0.5" />
          <div>
            <p className="font-bold">Informasi Pratinjau & Cetak:</p>
            <p className="mt-0.5 text-slate-700">Tampilan di bawah ini adalah <b>Print Preview (Pratinjau Cetak)</b> siswa aktif yang dirancang presisi 1:1 sesuai standar form Yayasan Kartika Jaya. Anda dapat memilih beberapa siswa dari panel list di sebelah kiri untuk unduh PDF gabungan atau cetak massal.</p>
          </div>
        </div>
        <div className="pl-7 pr-4 py-1.5 border-t border-amber-200/50 flex flex-col gap-1 text-[10.5px] text-amber-900 bg-amber-50/30 rounded-lg">
          <p className="font-semibold text-amber-850">💡 Tips Penting Cetak Langsung:</p>
          <p className="text-slate-650">Apabila tombol <strong className="text-indigo-800">Cetak</strong> menampilkan halaman kosong atau tidak merespon di dalam editor, klik tombol <strong className="text-teal-800">"Buka di Tab Baru"</strong> di sudut kanan atas untuk membuka aplikasi secara mandiri lalu cetak dengan lancar.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start no-print">
        {/* STUDENT SELECTION SIDEBAR */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col gap-3 h-fit lg:sticky lg:top-6 selection:bg-transparent">
          {/* Mobile Collapse Header toggle */}
          <div className="flex items-center justify-between pb-1 lg:pb-3 lg:border-b lg:border-slate-100">
            <div className="flex flex-col gap-1">
              <h3 className="font-bold text-slate-800 text-xs tracking-tight flex items-center gap-1.5 justify-start">
                <Award className="h-4 w-4 text-indigo-600 flex-none" />
                Daftar Siswa Kelas {selectedClass}
              </h3>
              <p className="text-[10px] text-slate-500 leading-normal hidden lg:block">
                Pilih satu atau beberapa siswa untuk pratinjau, cetak massal, atau ekspor gabungan.
              </p>
              {/* Active preview name display widget details on mobile */}
              <div className="lg:hidden text-[10px] text-indigo-800 bg-indigo-55/65 border border-indigo-100/50 px-2 py-0.5 rounded-md font-bold mt-1 max-w-[180px] sm:max-w-xs truncate">
                Siswa: {classStudents.find(cs => cs.nis === previewNis)?.name || '-'}
              </div>
            </div>
            
            <button
              onClick={() => setIsSidebarOpenMobile(prev => !prev)}
              className="lg:hidden px-3 py-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>{isSidebarOpenMobile ? 'Sembunyikan' : 'Pilih Siswa'}</span>
              <span className={`text-[9px] transition-transform duration-200 ${isSidebarOpenMobile ? 'rotate-180' : ''}`}>▼</span>
            </button>
          </div>

          <div className={`${isSidebarOpenMobile ? 'flex' : 'hidden lg:flex'} flex-col gap-3.5`}>
            {/* Filter print status */}
            <div className="flex bg-slate-200 p-0.5 rounded-lg border border-slate-300">
              <button
                onClick={() => setFilterPrintedStatus('all')}
                className={`flex-1 px-2 py-1.5 text-[10px] sm:text-xs font-semibold rounded-md transition-colors ${filterPrintedStatus === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Semua
              </button>
              <button
                onClick={() => setFilterPrintedStatus('not_printed')}
                className={`flex-1 px-2 py-1.5 text-[10px] sm:text-xs font-semibold rounded-md transition-colors ${filterPrintedStatus === 'not_printed' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Belum
              </button>
              <button
                onClick={() => setFilterPrintedStatus('printed')}
                className={`flex-1 px-2 py-1.5 text-[10px] sm:text-xs font-semibold rounded-md transition-colors ${filterPrintedStatus === 'printed' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Dicetak
              </button>
            </div>

            {/* Search bar */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama / NIS..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white text-slate-700 transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Selection stats & Select All */}
            <div className="flex items-center justify-between py-1 bg-slate-50 px-2 rounded-lg border border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer select-none py-1 flex-1">
                <input
                  type="checkbox"
                  checked={filteredClassStudents.length > 0 && filteredClassStudents.every(s => selectedNisList.includes(s.nis))}
                  ref={(el) => {
                    if (el) {
                      const someSelected = filteredClassStudents.some(s => selectedNisList.includes(s.nis));
                      const allSelected = filteredClassStudents.every(s => selectedNisList.includes(s.nis));
                      el.indeterminate = someSelected && !allSelected;
                    }
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border border-slate-300 text-indigo-600 focus:ring-indigo-550 h-3.5 w-3.5 cursor-pointer accent-indigo-600"
                />
                <span className="text-[11px] font-bold text-slate-700">Pilih Semua</span>
              </label>
              <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md flex-none">
                {selectedNisList.length} / {classStudents.length}
              </span>
            </div>

            {/* Students Scroll List */}
            <div className="flex flex-col gap-1 max-h-[300px] lg:max-h-[500px] overflow-y-auto pr-1">
              {filteredClassStudents.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-medium">
                  Siswa tidak ditemukan
                </div>
              ) : (
                filteredClassStudents.map((s) => {
                  const isChecked = selectedNisList.includes(s.nis);
                  const isActivePreview = s.nis === previewNis;
                  return (
                    <div
                      key={s.nis}
                      onClick={() => {
                        setPreviewNis(s.nis);
                        if (selectedNisList.length === 1 || !selectedNisList.includes(s.nis)) {
                          setSelectedNisList([s.nis]);
                        }
                      }}
                      className={`group w-full flex items-center justify-between p-2 rounded-xl border transition-all text-left cursor-pointer ${
                        isActivePreview
                          ? 'bg-indigo-50 border-indigo-200'
                          : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div 
                          onClick={(e) => {
                            e.stopPropagation(); // Avoid changing preview when clicking checkbox
                            handleToggleStudent(s.nis);
                          }}
                          className="flex items-center justify-center p-0.5"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="rounded border border-slate-300 text-indigo-600 focus:ring-indigo-550 h-3.5 w-3.5 cursor-pointer accent-indigo-605"
                          />
                        </div>
                        <div className="min-w-0 pr-1 flex-1">
                          <p className={`text-[11px] font-bold truncate flex items-center gap-1.5 ${
                            isActivePreview ? 'text-indigo-900' : 'text-slate-800'
                          }`}>
                            {s.name}
                            {s.printStatus && (
                              <span title="Berhasil Dicetak / Diunduh" className="flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-full p-0.5">
                                <Check className="w-3 h-3" />
                              </span>
                            )}
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                            NIS. {s.nis}
                          </p>
                        </div>
                      </div>
                      
                      {isActivePreview && (
                        <span className="text-[8px] font-bold text-indigo-605 bg-indigo-100/50 px-1 py-0.5 rounded flex-none uppercase tracking-wider scale-90">
                          Aktif
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* PREVIEW CONTAINER */}
        <div className="lg:col-span-3 flex flex-col gap-6 w-full">
          {isDiagnosticMode ? (
            <div className="flex flex-col gap-6 w-full">
              {/* DIAGNOSTIC PANEL HEADER */}
              <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-2xl flex flex-col gap-3 shadow-sm text-slate-800 no-print">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
                    <h4 className="font-bold text-amber-900 text-[10px] tracking-wider uppercase font-sans">
                      Panel Kontrol Diagnostik & Auditing Tata Letak (A4 Standard)
                    </h4>
                  </div>
                  <button 
                    onClick={() => setIsDiagnosticMode(false)}
                    className="text-[10px] font-bold text-amber-800 hover:text-amber-950 underline px-2 py-0.5 rounded transition-colors"
                  >
                    Kembali ke Tampilan Normal
                  </button>
                </div>
                
                <p className="text-[10.5px] text-amber-800 leading-relaxed font-sans mt-0.5 font-medium">
                  Tampilan di bawah ini memicu <strong>Layout Rendering 1:1</strong> yang tepat dikonsumsi oleh penyaji PDF (<code>html2pdf.js</code>). Di sini, Anda dapat meninjau pemisahan halaman (<em>page-break</em>), batas pemisah tabel, ukuran margin fisik, dan letak tanda tangan guru/orang tua secara presisi.
                </p>

                <div className="flex flex-wrap gap-4 pt-2 border-t border-amber-200/60 flex-row text-[10.5px] text-amber-900">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showMarginsGuide}
                      onChange={(e) => setShowMarginsGuide(e.target.checked)}
                      className="rounded border-amber-400 text-amber-700 focus:ring-amber-500 h-4 w-4 cursor-pointer accent-amber-700"
                    />
                    <span className="font-bold flex items-center gap-1">
                      <Sliders className="h-3.5 w-3.5 text-amber-700" /> Garis Panduan Batas Margin (12mm x 15mm)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showGridRuler}
                      onChange={(e) => setShowGridRuler(e.target.checked)}
                      className="rounded border-amber-400 text-amber-700 focus:ring-amber-500 h-4 w-4 cursor-pointer accent-amber-700"
                    />
                    <span className="font-bold flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-amber-700" /> Tampilkan Kisi Grid Ruler (Milimeter)
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isLandscape}
                      onChange={(e) => setIsLandscape(e.target.checked)}
                      className="rounded border-amber-400 text-amber-700 focus:ring-amber-500 h-4 w-4 cursor-pointer accent-amber-700"
                    />
                    <span className="font-bold flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5 text-amber-700" /> Orientasi Print Landscape
                    </span>
                  </label>
                </div>
              </div>

              {/* SIMULATED WORKBENCH CANVAS */}
              <div 
                ref={canvasContainerRef}
                className="bg-slate-700/90 p-4 sm:p-8 rounded-2xl border border-slate-600 shadow-inner overflow-x-auto overflow-y-hidden select-none no-print w-full flex justify-start sm:justify-center"
              >
                <div 
                  className={`simulate-print w-fit shrink-0 ${showMarginsGuide ? 'show-margins-guide' : ''} ${showGridRuler ? 'show-grid-ruler' : ''}`}
                  style={scaleFactor < 1 ? {
                    transform: `scale(${scaleFactor})`,
                    transformOrigin: 'top left',
                    width: '794px',
                    marginBottom: `${marginOffset}px`,
                    transition: 'transform 0.15s ease-out'
                  } : undefined}
                >
                  
                  {/* PRINT PAGE 1 SIMULATION */}
                  <div className="print-page relative">
                    <div>
                      {/* Header, title & info */}
                      <div className="avoid-break select-none">
                        <div className="flex items-start gap-4 mb-0.5">
                          <div className="h-20 w-20 flex flex-col justify-center items-center flex-none">
                            {kopSekolah.logoUrl ? (
                              <img src={kopSekolah.logoUrl} alt="Logo Sekolah" className="max-h-20 max-w-20 object-contain" referrerPolicy="no-referrer" crossOrigin={kopSekolah.logoUrl.startsWith('data:') ? undefined : 'anonymous'} />
                            ) : (
                              <div className="h-20 w-20 bg-neutral-100 flex items-center justify-center font-sans font-bold text-xs">LOGO</div>
                            )}
                          </div>
                          <div className="flex-1 flex flex-col justify-start">
                            <h1 className="font-bold text-[14pt] leading-tight font-sans text-black uppercase text-left">
                              {kopSekolah.yayasan}
                            </h1>
                            <p className="font-bold text-black mt-0.5 leading-tight uppercase text-[11pt] text-left">
                              KOORDINATOR <span className="mr-1">{kopSekolah.koordinator}</span> CABANG <span>{kopSekolah.cabang}</span>
                            </p>
                            <h2 className="font-bold text-[15pt] text-black mt-0.5 leading-tight uppercase text-left">
                              {kopSekolah.namaSekolah}
                            </h2>
                            <p className="text-[10pt] font-medium text-black mt-0.5 leading-tight text-left">
                              <span className="font-bold">Alamat:</span> {kopSekolah.alamat}
                            </p>
                          </div>
                        </div>

                        <hr className="border-t-[1.5px] border-black my-2" />

                        <div className="text-center mt-1.5 mb-2.5">
                          <h2 className="text-[12.5pt] font-bold tracking-wide uppercase text-black">
                            LAPORAN PERKEMBANGAN NILAI KARTIKA (5NK)
                          </h2>
                          <p className="text-[11pt] font-bold text-black mt-0.5 tracking-wide">
                            Tahun Ajaran {kopSekolah.tahunAjaran}
                          </p>
                        </div>
                      </div>

                      {/* Student metadata */}
                      <div className="grid grid-cols-2 gap-x-11 gap-y-0.5 text-[9pt] mb-2.5 font-medium avoid-break">
                        <div className="flex items-center">
                          <span className="w-24 font-bold flex-none text-left">NAMA</span>
                          <span className="mr-2 font-bold">:</span>
                          <span className="border-b border-black flex-1 font-bold text-slate-800 pb-0.5 text-left">{activeStudent.name}</span>
                        </div>
                        <div className="flex items-center text-[9pt]">
                          <span className="w-28 font-bold flex-none text-left">NOMOR INDUK</span>
                          <span className="mr-2 font-bold">:</span>
                          <span className="border-b border-black flex-1 font-mono font-bold text-slate-800 pb-0.5 text-left">{activeStudent.nis}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-24 font-bold flex-none text-left">KELAS</span>
                          <span className="mr-2 font-bold">:</span>
                          <span className="border-b border-black flex-1 font-bold text-slate-800 pb-0.5 text-left">{activeStudent.kelas}</span>
                        </div>
                        <div className="flex items-center">
                          <span className="w-28 font-bold flex-none text-left">SEMESTER</span>
                          <span className="mr-2 font-bold">:</span>
                          <span className="border-b border-black flex-1 font-bold text-slate-800 pb-0.5 text-left">{activeStudent.semester}</span>
                        </div>
                      </div>

                      {/* Table */}
                      <table className="w-full text-left text-[9pt] border border-black border-collapse font-sans leading-snug table-fixed avoid-break">
                        <colgroup>
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '41%' }} />
                          <col style={{ width: '11%' }} />
                          <col style={{ width: '11%' }} />
                          <col style={{ width: '11%' }} />
                          <col style={{ width: '11%' }} />
                        </colgroup>
                        <thead>
                          <tr className="bg-slate-100">
                            <th rowSpan={2} colSpan={1} className="border border-black p-1.5 font-bold text-center w-16 text-[9.5pt]">
                              5 Nilai Kartika
                            </th>
                            <th rowSpan={2} colSpan={1} className="border border-black p-1.5 font-bold text-center text-[9.5pt]">
                              Indikator
                            </th>
                            <th colSpan={4} className="border border-black p-1 text-center font-bold text-[9.5pt]">
                              Hasil Penilaian
                            </th>
                          </tr>
                          <tr className="bg-slate-50 text-[8px] font-medium leading-tight text-slate-600">
                            <th className="border border-black p-1 text-center font-bold text-black w-24">
                              Berkembang Sangat Baik
                              <span className="block font-normal text-[7px] mt-0.5 leading-tight">Konsisten menunjukkan perilaku sesuai indikator tanpa perlu diingatkan.</span>
                            </th>
                            <th className="border border-black p-1 text-center font-bold text-black w-24">
                              Berkembang
                              <span className="block font-normal text-[7px] mt-0.5 leading-tight">Menunjukkan perilaku sesuai indikator dengan sedikit arahan.</span>
                            </th>
                            <th className="border border-black p-1 text-center font-bold text-black w-24">
                              Mulai Berkembang
                              <span className="block font-normal text-[7px] mt-0.5 leading-tight">Perlu sering diingatkan untuk menunjukkan perilaku sesuai indikator.</span>
                            </th>
                            <th className="border border-black p-1 text-center font-bold text-black w-24">
                              Belum Berkembang
                              <span className="block font-normal text-[7px] mt-0.5 leading-tight">Memerlukan bimbingan intensif untuk menunjukkan perilaku sesuai indikator.</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Cinta Tanah Air */}
                          {categories.find(c => c.id === 'CTA')?.indicators.map((ind, i) => {
                            const activeScore = activeStudent.grades[ind.id];
                            return (
                              <tr key={ind.id}>
                                {i === 0 && (
                                  <td 
                                    rowSpan={3} 
                                    className="border border-black py-0.5 px-1.5 text-center font-bold bg-neutral-50/50 align-middle text-[9.5px] leading-tight font-sans text-black"
                                  >
                                    Cinta Tanah Air
                                  </td>
                                )}
                                <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px] text-left">
                                  {ind.text}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-emerald-700">
                                  {activeScore === 'BSB' ? '✔' : ''}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-blue-700">
                                  {activeScore === 'B' ? '✔' : ''}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-amber-700">
                                  {activeScore === 'MB' ? '✔' : ''}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-rose-700">
                                  {activeScore === 'BB' ? '✔' : ''}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Disiplin */}
                          {categories.find(c => c.id === 'DSP')?.indicators.map((ind, i) => {
                            const activeScore = activeStudent.grades[ind.id];
                            return (
                              <tr key={ind.id}>
                                {i === 0 && (
                                  <td 
                                    rowSpan={3} 
                                    className="border border-black py-0.5 px-1.5 text-center font-bold bg-neutral-50/50 align-middle text-[9.5px] leading-tight font-sans text-black"
                                  >
                                    Disiplin
                                  </td>
                                )}
                                <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px] text-left">
                                  {ind.text}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-emerald-700">
                                  {activeScore === 'BSB' ? '✔' : ''}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-blue-700">
                                  {activeScore === 'B' ? '✔' : ''}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-amber-700">
                                  {activeScore === 'MB' ? '✔' : ''}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-rose-700">
                                  {activeScore === 'BB' ? '✔' : ''}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Berbudi Luhur (3 indicators) */}
                          {categories.find(c => c.id === 'BBL')?.indicators.map((ind, i) => {
                            const activeScore = activeStudent.grades[ind.id];
                            return (
                              <tr key={ind.id}>
                                {i === 0 && (
                                  <td 
                                    rowSpan={3} 
                                    className="border border-black py-0.5 px-1.5 text-center font-bold bg-neutral-50/50 align-middle text-[9.5px] leading-tight font-sans text-black"
                                  >
                                    Berbudi Luhur
                                  </td>
                                )}
                                <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px] text-left">
                                  {ind.text}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-emerald-700">
                                  {activeScore === 'BSB' ? '✔' : ''}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-blue-700">
                                  {activeScore === 'B' ? '✔' : ''}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-amber-700">
                                  {activeScore === 'MB' ? '✔' : ''}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-rose-700">
                                  {activeScore === 'BB' ? '✔' : ''}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Cerdas (1st indicator only) */}
                          {(() => {
                            const certCat = categories.find(c => c.id === 'CRD');
                            if (!certCat || certCat.indicators.length === 0) return null;
                            const ind = certCat.indicators[0];
                            const activeScore = activeStudent.grades[ind.id];
                            return (
                              <tr key={ind.id}>
                                <td 
                                  className="border border-black py-0.5 px-1.5 text-center font-bold bg-neutral-50/50 align-middle text-[9.5px] leading-tight font-sans text-black"
                                >
                                  Cerdas
                                </td>
                                <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px] text-left">
                                  {ind.text}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-emerald-700">
                                  {activeScore === 'BSB' ? '✔' : ''}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-blue-700">
                                  {activeScore === 'B' ? '✔' : ''}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-amber-700">
                                  {activeScore === 'MB' ? '✔' : ''}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-rose-700">
                                  {activeScore === 'BB' ? '✔' : ''}
                                </td>
                              </tr>
                            );
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* PRINT PAGE 2 SIMULATION */}
                  <div className="print-page relative">
                    <div className="flex flex-col gap-4">
                      {/* Table continuation on Page 2 */}
                      <table className="w-full text-left text-[9pt] border border-black border-collapse font-sans leading-snug table-fixed avoid-break">
                        <colgroup>
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '41%' }} />
                          <col style={{ width: '11%' }} />
                          <col style={{ width: '11%' }} />
                          <col style={{ width: '11%' }} />
                          <col style={{ width: '11%' }} />
                        </colgroup>
                        <tbody>
                          {/* Cerdas (2nd and 3rd indicators) */}
                          {(() => {
                            const certCat = categories.find(c => c.id === 'CRD');
                            if (!certCat || certCat.indicators.length < 2) return null;
                            const remaining = certCat.indicators.slice(1);
                            return remaining.map((ind, idx) => {
                              const activeScore = activeStudent.grades[ind.id];
                              return (
                                <tr key={ind.id}>
                                  {idx === 0 && (
                                    <td 
                                      rowSpan={2} 
                                      className="border border-black py-0.5 px-1.5 bg-neutral-50/50 align-middle"
                                    ></td>
                                  )}
                                  <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px] text-left">
                                    {ind.text}
                                  </td>
                                  <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-emerald-700">
                                    {activeScore === 'BSB' ? '✔' : ''}
                                  </td>
                                  <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-blue-700">
                                    {activeScore === 'B' ? '✔' : ''}
                                  </td>
                                  <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-amber-700">
                                    {activeScore === 'MB' ? '✔' : ''}
                                  </td>
                                  <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-rose-700">
                                    {activeScore === 'BB' ? '✔' : ''}
                                  </td>
                                </tr>
                              );
                            });
                          })()}

                          {/* Terampil (3 indicators) */}
                          {categories.find(c => c.id === 'TRM')?.indicators.map((ind, i) => {
                            const activeScore = activeStudent.grades[ind.id];
                            return (
                              <tr key={ind.id}>
                                {i === 0 && (
                                  <td 
                                    rowSpan={3} 
                                    className="border border-black py-0.5 px-1.5 text-center font-bold bg-neutral-50/50 align-middle text-[9.5px] leading-tight font-sans text-black"
                                  >
                                    Terampil
                                  </td>
                                )}
                                <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px] text-left">
                                  {ind.text}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-emerald-700">
                                  {activeScore === 'BSB' ? '✔' : ''}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-blue-700">
                                  {activeScore === 'B' ? '✔' : ''}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-amber-700">
                                  {activeScore === 'MB' ? '✔' : ''}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-rose-700">
                                  {activeScore === 'BB' ? '✔' : ''}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Uraian Kesimpulan Pencapaian 5NK */}
                      <div className="border border-black avoid-break font-sans">
                        <div className="bg-neutral-100 border-b border-black p-1.5">
                          <p className="font-bold text-[9pt] text-black text-left">Uraian Kesimpulan Pencapaian 5NK :</p>
                        </div>
                        <div className="p-2.5 min-h-[85px] text-justify text-[9.5pt] text-slate-900 leading-relaxed font-sans font-medium">
                          {activeStudent.kesimpulan || 'Siswa menunjukkan antusiasme yang luar biasa dan tekad kuat untuk terus berprestasi. Perkembangan moral dan akademik berjalan seimbang serta berkembang ideal.'}
                        </div>
                      </div>

                      {/* Catatan Pendukung (Wali Kelas & Orang Tua) */}
                      <div className="grid grid-cols-2 border border-black divide-x divide-black border-collapse avoid-break">
                        {/* Wali Kelas Side */}
                        <div className="flex flex-col font-sans">
                          <div className="bg-neutral-100 border-b border-black p-1.5">
                            <p className="font-bold text-[9pt] text-black text-left">Catatan Wali Kelas:</p>
                          </div>
                          <div className="p-2.5 min-h-[85px] text-justify text-[9pt] text-slate-800 leading-relaxed font-sans">
                            {activeStudent.catatanWali || 'Teruskan perilaku budi luhur ini dan tingkatkan konsistensi waktu belajarnya.'}
                          </div>
                        </div>

                        {/* Orang Tua Side */}
                        <div className="flex flex-col font-sans">
                          <div className="bg-neutral-100 border-b border-black p-1.5">
                            <p className="font-bold text-[9pt] text-black text-left">Catatan Orang Tua/Wali:</p>
                          </div>
                          <div className="p-2.5 min-h-[85px] text-justify text-[9pt] text-slate-500 italic leading-relaxed font-sans whitespace-pre-wrap">
                            {activeStudent.catatanOrangTua !== undefined ? activeStudent.catatanOrangTua : 'Kami berkomitmen untuk terus membimbing anak di rumah sesuai arahan sekolah.'}
                          </div>
                        </div>
                      </div>

                      {/* Signatures block */}
                      <div className="mt-4 avoid-break font-sans">
                        <p className="text-[10.5pt] font-semibold text-black text-center mb-6 select-none">
                          Mengetahui,
                        </p>
                        <div className="grid grid-cols-2 gap-12 text-center text-sans">
                          {/* Orang Tua */}
                          <div className="flex flex-col items-center justify-between h-32 relative">
                            <p className="text-[10.5pt] text-black font-bold select-none">Orang Tua / Wali</p>
                            <div className="h-16 flex items-center justify-center relative w-full">
                              {kopSekolah.signatureParentUrl ? (
                                <img
                                  src={kopSekolah.signatureParentUrl}
                                  alt="Tanda Tangan Orang Tua"
                                  className="max-h-16 max-w-[180px] object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="h-4"></div>
                              )}
                            </div>
                            <div className="flex flex-col items-center w-full">
                              <div className="w-48 border-b-[1.5px] border-black pb-0.5"></div>
                              <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none">Tanda Tangan & Nama Terang</p>
                            </div>
                          </div>

                          {/* Guru Kelas */}
                          <div className="flex flex-col items-center justify-between h-32 relative">
                            <p className="text-[10.5pt] text-black font-bold">Guru Kelas / Wali Kelas</p>
                            <div className="h-16 flex items-center justify-center relative w-full">
                              {kopSekolah.signatureTeacherUrl ? (
                                <img
                                  src={kopSekolah.signatureTeacherUrl}
                                  alt="Tanda Tangan Guru"
                                  className="max-h-16 max-w-[180px] object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="h-4"></div>
                              )}
                            </div>
                            <div className="flex flex-col items-center w-full font-sans">
                              <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all underline underline-offset-4 decoration-[1.5px]">
                                {getWaliKelas(activeStudent).name || '____________________'}
                              </p>
                              {getWaliKelas(activeStudent).nip && getWaliKelas(activeStudent).nip.trim() !== '' && getWaliKelas(activeStudent).nip.trim() !== '-' ? (
                                <p className="text-[8.5pt] text-slate-700 font-mono mt-1 select-all">
                                  NIP. {getWaliKelas(activeStudent).nip}
                                </p>
                              ) : (
                                <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-neutral-100/50 p-4 md:p-6 rounded-2xl border border-slate-200/80 shadow-inner flex justify-start md:justify-center overflow-x-auto w-full no-print selection:bg-transparent">
        <div className="bg-white border border-slate-300 shadow-2xl p-[12mm_15mm] w-[210mm] min-h-[297mm] h-[297mm] max-h-[297mm] overflow-hidden box-border text-[11pt] text-black font-sans leading-relaxed flex flex-col justify-between">
          <div>
            {/* Header block with organization logo & info */}
            <div className="flex items-start gap-4 mb-1">
              <div className="h-24 w-24 flex flex-col justify-center items-center flex-none">
                {kopSekolah.logoUrl ? (
                  <img src={kopSekolah.logoUrl} alt="Logo Sekolah" className="max-h-24 max-w-24 object-contain" referrerPolicy="no-referrer" crossOrigin={kopSekolah.logoUrl.startsWith('data:') ? undefined : 'anonymous'} />
                ) : (
                  <KartikaLogo />
                )}
              </div>
              <div className="flex-1 flex flex-col justify-start">
                <h1 className="font-bold text-[14pt] leading-tight font-sans text-black uppercase">
                  {kopSekolah.yayasan}
                </h1>
                <p className="font-bold text-black mt-0.5 leading-tight uppercase text-[11pt]">
                  KOORDINATOR <span className="mr-1">{kopSekolah.koordinator}</span> CABANG <span>{kopSekolah.cabang}</span>
                </p>
                <h2 className="font-bold text-[15pt] text-black mt-0.5 leading-tight uppercase">
                  {kopSekolah.namaSekolah}
                </h2>
                <p className="text-[10pt] font-medium text-black mt-0.5 leading-tight">
                  <span className="font-bold">Alamat:</span> {kopSekolah.alamat}
                </p>
              </div>
            </div>

            <hr className="border-t-[1.5px] border-black my-2.5" />

            {/* Document Title */}
            <div className="text-center mt-3 mb-4">
              <h2 className="text-[13pt] font-bold tracking-wide uppercase text-black">
                LAPORAN PERKEMBANGAN NILAI KARTIKA (5NK)
              </h2>
              <p className="text-[11.5pt] font-bold text-black mt-0.5 tracking-wide">
                Tahun Ajaran {kopSekolah.tahunAjaran}
              </p>
            </div>

            {/* Student metadata tables */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-1.5 text-[9.5pt] mb-5 font-medium">
              <div className="flex items-center">
                <span className="w-[70px] font-bold flex-none">NAMA</span>
                <span className="mr-2 font-bold">:</span>
                <span className="border-b border-black flex-1 font-bold text-slate-800 pb-0.5">{activeStudent.name}</span>
              </div>
              <div className="flex items-center">
                <span className="w-[110px] font-bold flex-none">NOMOR INDUK</span>
                <span className="mr-2 font-bold">:</span>
                <span className="border-b border-black flex-1 font-mono font-bold text-slate-800 pb-0.5">{activeStudent.nis}</span>
              </div>
              <div className="flex items-center">
                <span className="w-[70px] font-bold flex-none">KELAS</span>
                <span className="mr-2 font-bold">:</span>
                <span className="border-b border-black flex-1 font-bold text-slate-800 pb-0.5">{activeStudent.kelas}</span>
              </div>
              <div className="flex items-center">
                <span className="w-[110px] font-bold flex-none">SEMESTER</span>
                <span className="mr-2 font-bold">:</span>
                <span className="border-b border-black flex-1 font-bold text-slate-800 pb-0.5">{activeStudent.semester}</span>
              </div>
            </div>

            {/* The core 5NK indicators evaluation table */}
            <table className="w-full text-left text-[9pt] border border-black border-collapse font-sans leading-snug table-fixed">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '41%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
              </colgroup>
              <thead>
                <tr className="bg-slate-100">
                  <th rowSpan={2} colSpan={1} className="border border-black p-1.5 font-bold text-center w-16 text-[9.5pt]">
                    5 Nilai Kartika
                  </th>
                  <th rowSpan={2} colSpan={1} className="border border-black p-1.5 font-bold text-center text-[9.5pt]">
                    Indikator
                  </th>
                  <th colSpan={4} className="border border-black p-1 text-center font-bold text-[9.5pt]">
                    Hasil Penilaian
                  </th>
                </tr>
                <tr className="bg-slate-50 text-[8px] font-medium leading-tight text-slate-600">
                  <th className="border border-black p-1 text-center font-bold text-black w-24">
                    Berkembang Sangat Baik
                    <span className="block font-normal text-[7px] mt-0.5 leading-tight">Konsisten menunjukkan perilaku sesuai indikator tanpa perlu diingatkan.</span>
                  </th>
                  <th className="border border-black p-1 text-center font-bold text-black w-24">
                    Berkembang
                    <span className="block font-normal text-[7px] mt-0.5 leading-tight">Menunjukkan perilaku sesuai indikator dengan sedikit arahan.</span>
                  </th>
                  <th className="border border-black p-1 text-center font-bold text-black w-24">
                    Mulai Berkembang
                    <span className="block font-normal text-[7px] mt-0.5 leading-tight">Perlu sering diingatkan untuk menunjukkan perilaku sesuai indikator.</span>
                  </th>
                  <th className="border border-black p-1 text-center font-bold text-black w-24">
                    Belum Berkembang
                    <span className="block font-normal text-[7px] mt-0.5 leading-tight">Memerlukan bimbingan intensif untuk menunjukkan perilaku sesuai indikator.</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Cinta Tanah Air (3 indicators) */}
                {categories.find(c => c.id === 'CTA')?.indicators.map((ind, i) => {
                  const activeScore = activeStudent.grades[ind.id];
                  return (
                    <tr key={ind.id} className="hover:bg-slate-50/40">
                      {i === 0 && (
                        <td 
                          rowSpan={3} 
                          className="border border-black py-1 px-1.5 text-center font-bold bg-neutral-50/50 align-middle text-[10.5px] leading-tight font-sans text-black"
                        >
                          Cinta Tanah Air
                        </td>
                      )}
                      <td className="border border-black py-1 px-2 text-black leading-tight font-sans font-medium text-[10.5px]">
                        {ind.text}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-emerald-700">
                        {activeScore === 'BSB' ? '✔' : ''}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-blue-700">
                        {activeScore === 'B' ? '✔' : ''}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-amber-700">
                        {activeScore === 'MB' ? '✔' : ''}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-rose-700">
                        {activeScore === 'BB' ? '✔' : ''}
                      </td>
                    </tr>
                  );
                })}

                {/* Disiplin (3 indicators) */}
                {categories.find(c => c.id === 'DSP')?.indicators.map((ind, i) => {
                  const activeScore = activeStudent.grades[ind.id];
                  return (
                    <tr key={ind.id} className="hover:bg-slate-50/40">
                      {i === 0 && (
                        <td 
                          rowSpan={3} 
                          className="border border-black py-1 px-1.5 text-center font-bold bg-neutral-50/50 align-middle text-[10.5px] leading-tight font-sans text-black"
                        >
                          Disiplin
                        </td>
                      )}
                      <td className="border border-black py-1 px-2 text-black leading-tight font-sans font-medium text-[10.5px]">
                        {ind.text}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-emerald-700">
                        {activeScore === 'BSB' ? '✔' : ''}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-blue-700">
                        {activeScore === 'B' ? '✔' : ''}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-amber-700">
                        {activeScore === 'MB' ? '✔' : ''}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-rose-700">
                        {activeScore === 'BB' ? '✔' : ''}
                      </td>
                    </tr>
                  );
                })}

                {/* Berbudi Luhur (3 indicators) */}
                {categories.find(c => c.id === 'BBL')?.indicators.map((ind, i) => {
                  const activeScore = activeStudent.grades[ind.id];
                  return (
                    <tr key={ind.id} className="hover:bg-slate-50/40">
                      {i === 0 && (
                        <td 
                          rowSpan={3} 
                          className="border border-black py-1 px-1.5 text-center font-bold bg-neutral-50/50 align-middle text-[10.5px] leading-tight font-sans text-black"
                        >
                          Berbudi Luhur
                        </td>
                      )}
                      <td className="border border-black py-1 px-2 text-black leading-tight font-sans font-medium text-[10.5px]">
                        {ind.text}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-emerald-700">
                        {activeScore === 'BSB' ? '✔' : ''}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-blue-700">
                        {activeScore === 'B' ? '✔' : ''}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-amber-700">
                        {activeScore === 'MB' ? '✔' : ''}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-rose-700">
                        {activeScore === 'BB' ? '✔' : ''}
                      </td>
                    </tr>
                  );
                })}

                {/* Cerdas (1st indicator only) */}
                {(() => {
                  const certCat = categories.find(c => c.id === 'CRD');
                  if (!certCat || certCat.indicators.length === 0) return null;
                  const ind = certCat.indicators[0];
                  const activeScore = activeStudent.grades[ind.id];
                  return (
                    <tr key={ind.id} className="hover:bg-slate-50/40">
                      <td 
                        className="border border-black py-1 px-1.5 text-center font-bold bg-neutral-50/50 align-middle text-[10.5px] leading-tight font-sans text-black"
                      >
                        Cerdas
                      </td>
                      <td className="border border-black py-1 px-2 text-black leading-tight font-sans font-medium text-[10.5px]">
                        {ind.text}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-emerald-700">
                        {activeScore === 'BSB' ? '✔' : ''}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-blue-700">
                        {activeScore === 'B' ? '✔' : ''}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-amber-700">
                        {activeScore === 'MB' ? '✔' : ''}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-rose-700">
                        {activeScore === 'BB' ? '✔' : ''}
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- PAGE 2 MOCK PREVIEW --- */}
      <div className="bg-neutral-100/50 p-4 md:p-6 rounded-2xl border border-slate-200/80 shadow-inner flex justify-start md:justify-center overflow-x-auto w-full no-print">
        <div className="bg-white border border-slate-300 shadow-2xl p-[12mm_15mm] w-[210mm] min-h-[297mm] h-[297mm] max-h-[297mm] overflow-hidden box-border text-[11pt] text-black font-sans leading-relaxed flex flex-col justify-between">
          <div className="flex flex-col gap-4">
            {/* Table continuation on screen Page 2 */}
            <table className="w-full text-left text-[9pt] border border-black border-collapse font-sans leading-snug table-fixed">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '41%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
              </colgroup>
              <tbody>
                {/* Cerdas (2nd and 3rd indicators) */}
                {(() => {
                  const certCat = categories.find(c => c.id === 'CRD');
                  if (!certCat || certCat.indicators.length < 2) return null;
                  const remaining = certCat.indicators.slice(1);
                  return remaining.map((ind, idx) => {
                    const activeScore = activeStudent.grades[ind.id];
                    return (
                      <tr key={ind.id} className="hover:bg-slate-50/40">
                        {idx === 0 && (
                          <td 
                            rowSpan={2} 
                            className="border border-black py-1 px-1.5 bg-neutral-50/50 align-middle"
                          ></td>
                        )}
                        <td className="border border-black py-1 px-2 text-black leading-tight font-sans font-medium text-[10.5px]">
                          {ind.text}
                        </td>
                        <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-emerald-700">
                          {activeScore === 'BSB' ? '✔' : ''}
                        </td>
                        <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-blue-700">
                          {activeScore === 'B' ? '✔' : ''}
                        </td>
                        <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-amber-700">
                          {activeScore === 'MB' ? '✔' : ''}
                        </td>
                        <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-rose-700">
                          {activeScore === 'BB' ? '✔' : ''}
                        </td>
                      </tr>
                    );
                  });
                })()}

                {/* Terampil (3 indicators) */}
                {categories.find(c => c.id === 'TRM')?.indicators.map((ind, i) => {
                  const activeScore = activeStudent.grades[ind.id];
                  return (
                    <tr key={ind.id} className="hover:bg-slate-50/40">
                      {i === 0 && (
                        <td 
                          rowSpan={3} 
                          className="border border-black py-1 px-1.5 text-center font-bold bg-neutral-50/50 align-middle text-[10.5px] leading-tight font-sans text-black"
                        >
                          Terampil
                        </td>
                      )}
                      <td className="border border-black py-1 px-2 text-black leading-tight font-sans font-medium text-[10.5px]">
                        {ind.text}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-emerald-700">
                        {activeScore === 'BSB' ? '✔' : ''}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-blue-700">
                        {activeScore === 'B' ? '✔' : ''}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-amber-700">
                        {activeScore === 'MB' ? '✔' : ''}
                      </td>
                      <td className="border border-black text-center align-middle font-bold text-base p-0.5 text-rose-700">
                        {activeScore === 'BB' ? '✔' : ''}
                      </td>
                    </tr>
                  );
                })}

                {/* Uraian Kesimpulan Row (Collapsed under Terampil) */}
                <tr>
                  <td 
                    className="border border-black p-2 font-bold bg-white text-left font-sans text-[8.5pt] align-top"
                    colSpan={1}
                  >
                    Uraian Kesimpulan Pencapaian 5NK :
                  </td>
                  <td 
                    className="border border-black p-2.5 min-h-[85px] text-justify text-[9pt] text-slate-900 leading-normal font-sans"
                    colSpan={5}
                  >
                    {activeStudent.kesimpulan || 'Siswa menunjukkan antusiasme yang luar biasa dan tekad kuat untuk terus berprestasi. Perkembangan moral dan akademik berjalan seimbang serta berkembang ideal.'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Catatan Pendukung (Wali Kelas & Orang Tua) - Collapsed border-t-0 immediately below the table */}
            <div className="grid grid-cols-2 border border-black border-t-0 divide-x divide-black border-collapse -mt-4">
              {/* Wali Kelas Side */}
              <div className="flex flex-col">
                <div className="bg-white border-b border-black p-1.5">
                  <p className="font-bold text-[9pt] text-black text-left">Catatan Wali Kelas:</p>
                </div>
                <div className="p-2.5 min-h-[85px] text-justify text-[9pt] text-slate-800 leading-relaxed font-sans">
                  {activeStudent.catatanWali || 'Teruskan perilaku budi luhur ini dan tingkatkan konsistensi waktu belajarnya.'}
                </div>
              </div>

              {/* Orang Tua Side */}
              <div className="flex flex-col">
                <div className="bg-white border-b border-black p-1.5">
                  <p className="font-bold text-[9pt] text-black text-left">Catatan Orang Tua/Wali:</p>
                </div>
                <div className="p-2.5 min-h-[85px] text-justify text-[9pt] text-slate-500 italic leading-relaxed font-sans whitespace-pre-wrap">
                  {activeStudent.catatanOrangTua !== undefined ? activeStudent.catatanOrangTua : 'Kami berkomitmen untuk terus membimbing anak di rumah sesuai arahan sekolah.'}
                </div>
              </div>
            </div>

            {/* Signatures block */}
            <div className="mt-4">
              <p className="text-[10.5pt] font-semibold text-black text-center mb-6 select-none">
                Mengetahui,
              </p>
              <div className="grid grid-cols-2 gap-12 text-center">
                {/* Orang Tua */}
                <div className="flex flex-col items-center justify-between h-32 relative">
                  <p className="text-[10.5pt] text-black font-bold select-none">Orang Tua / Wali</p>
                  <div className="h-16 flex items-center justify-center relative w-full">
                    {kopSekolah.signatureParentUrl ? (
                      <img
                        src={kopSekolah.signatureParentUrl}
                        alt="Tanda Tangan Orang Tua"
                        className="max-h-16 max-w-[180px] object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-4"></div>
                    )}
                  </div>
                  <div className="flex flex-col items-center w-full">
                    <div className="w-48 border-b-[1.5px] border-black pb-0.5"></div>
                    <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none">Tanda Tangan & Nama Terang</p>
                  </div>
                </div>

                {/* Guru Kelas */}
                <div className="flex flex-col items-center justify-between h-32 relative">
                  <p className="text-[10.5pt] text-black font-bold">Guru Kelas / Wali Kelas</p>
                  <div className="h-16 flex items-center justify-center relative w-full">
                    {kopSekolah.signatureTeacherUrl ? (
                      <img
                        src={kopSekolah.signatureTeacherUrl}
                        alt="Tanda Tangan Guru"
                        className="max-h-16 max-w-[180px] object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-4"></div>
                    )}
                  </div>
                  <div className="flex flex-col items-center w-full">
                    <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all underline underline-offset-4 decoration-[1.5px]">
                      {getWaliKelas(activeStudent).name || '____________________'}
                    </p>
                    {getWaliKelas(activeStudent).nip && getWaliKelas(activeStudent).nip.trim() !== '' && getWaliKelas(activeStudent).nip.trim() !== '-' ? (
                      <p className="text-[8.5pt] text-slate-700 font-mono mt-1 select-all">
                        NIP. {getWaliKelas(activeStudent).nip}
                      </p>
                    ) : (
                      <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
            </>
          )}

    </div> {/* closing lg:col-span-3 */}
  </div> {/* closing grid */}

  {/* ========================================= PRINT-ONLY SECTION ========================================= */}
      {/* This renders inside an offscreen absolute container with true layout size (height and width not collapsed to 0) on screen.
          This guarantees that getComputedStyle and html2canvas can capture the complete, pristine layout with no clipping or blank pages.
          During native printing, the container acts as standard static document flow to render the A4 pages perfectly. */}
      {createPortal(
        <div id="rapor-print-section">
          <div id="rapor-pdf-content" key={renderTrigger} className="bg-white text-black">
            {pdfRenderStudents && pdfRenderStudents.length > 0 ? pdfRenderStudents.map((selSt) => (
              <div key={selSt.nis} className="student-pdf-group">
                {/* PRINT PAGE 1 */}
                <div className="print-page w-[210mm] h-[297mm] max-h-[297mm] overflow-visible p-[12mm_15mm] box-border text-[11pt] leading-relaxed flex flex-col justify-between">
                  <div>
                    {/* Header, title & info wrapped with avoid-break */}
                    <div className="avoid-break select-none">
                      {/* Header block with organization logo & info */}
                      <div className="flex items-start gap-4 mb-0.5">
                        <div className="h-20 w-20 flex flex-col justify-center items-center flex-none">
                          {kopSekolah.logoUrl ? (
                            <img src={kopSekolah.logoUrl} alt="Logo Sekolah" className="max-h-20 max-w-20 object-contain" referrerPolicy="no-referrer" crossOrigin={kopSekolah.logoUrl.startsWith('data:') ? undefined : 'anonymous'} />
                          ) : (
                            <KartikaLogo />
                          )}
                        </div>
                        <div className="flex-1 flex flex-col justify-start">
                          <h1 className="font-bold text-[14pt] leading-tight font-sans text-black uppercase">
                            {kopSekolah.yayasan}
                          </h1>
                          <p className="font-bold text-black mt-0.5 leading-tight uppercase text-[11pt]">
                            KOORDINATOR <span className="mr-1">{kopSekolah.koordinator}</span> CABANG <span>{kopSekolah.cabang}</span>
                          </p>
                          <h2 className="font-bold text-[15pt] text-black mt-0.5 leading-tight uppercase">
                            {kopSekolah.namaSekolah}
                          </h2>
                          <p className="text-[10pt] font-medium text-black mt-0.5 leading-tight">
                            <span className="font-bold">Alamat:</span> {kopSekolah.alamat}
                          </p>
                        </div>
                      </div>

                      <hr className="border-t-[1.5px] border-black my-2" />

                      {/* Document Title */}
                      <div className="text-center mt-1.5 mb-2.5">
                        <h2 className="text-[12.5pt] font-bold tracking-wide uppercase text-black">
                          LAPORAN PERKEMBANGAN NILAI KARTIKA (5NK)
                        </h2>
                        <p className="text-[11pt] font-bold text-black mt-0.5 tracking-wide">
                          Tahun Ajaran {kopSekolah.tahunAjaran}
                        </p>
                      </div>
                    </div>

                    {/* Student metadata tables */}
                    <div className="grid grid-cols-2 gap-x-11 gap-y-0.5 text-[9pt] mb-2.5 font-medium avoid-break">
                      <div className="flex items-center">
                        <span className="w-[70px] font-bold flex-none">NAMA</span>
                        <span className="mr-2 font-bold">:</span>
                        <span className="border-b border-black flex-1 font-bold text-slate-800 pb-0.5">{formatProperName(selSt.name)}</span>
                      </div>
                      <div className="flex items-center text-[9pt]">
                        <span className="w-[110px] font-bold flex-none">NOMOR INDUK</span>
                        <span className="mr-2 font-bold">:</span>
                        <span className="border-b border-black flex-1 font-mono font-bold text-slate-800 pb-0.5">{selSt.nis}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-[70px] font-bold flex-none">KELAS</span>
                        <span className="mr-2 font-bold">:</span>
                        <span className="border-b border-black flex-1 font-bold text-slate-800 pb-0.5">{selSt.kelas}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-[110px] font-bold flex-none">SEMESTER</span>
                        <span className="mr-2 font-bold">:</span>
                        <span className="border-b border-black flex-1 font-bold text-slate-800 pb-0.5">{selSt.semester}</span>
                      </div>
                    </div>

                    {/* Table */}
                    <table className="w-full text-left text-[9pt] border border-black border-collapse font-sans leading-snug table-fixed avoid-break">
                      <colgroup>
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '41%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '11%' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-slate-100">
                          <th rowSpan={2} colSpan={1} className="border border-black p-1.5 font-bold text-center w-16 text-[9.5pt]">
                            5 Nilai Kartika
                          </th>
                          <th rowSpan={2} colSpan={1} className="border border-black p-1.5 font-bold text-center text-[9.5pt]">
                            Indikator
                          </th>
                          <th colSpan={4} className="border border-black p-1 text-center font-bold text-[9.5pt]">
                            Hasil Penilaian
                          </th>
                        </tr>
                        <tr className="bg-slate-50 text-[8px] font-medium leading-tight text-slate-600">
                          <th className="border border-black p-1 text-center font-bold text-black w-24">
                            Berkembang Sangat Baik
                            <span className="block font-normal text-[7px] mt-0.5 leading-tight">Konsisten menunjukkan perilaku sesuai indikator tanpa perlu diingatkan.</span>
                          </th>
                          <th className="border border-black p-1 text-center font-bold text-black w-24">
                            Berkembang
                            <span className="block font-normal text-[7px] mt-0.5 leading-tight">Menunjukkan perilaku sesuai indikator dengan sedikit arahan.</span>
                          </th>
                          <th className="border border-black p-1 text-center font-bold text-black w-24">
                            Mulai Berkembang
                            <span className="block font-normal text-[7px] mt-0.5 leading-tight">Perlu sering diingatkan untuk menunjukkan perilaku sesuai indikator.</span>
                          </th>
                          <th className="border border-black p-1 text-center font-bold text-black w-24">
                            Belum Berkembang
                            <span className="block font-normal text-[7px] mt-0.5 leading-tight">Memerlukan bimbingan intensif untuk menunjukkan perilaku sesuai indikator.</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Cinta Tanah Air (3 indicators) */}
                        {categories.find(c => c.id === 'CTA')?.indicators.map((ind, i) => {
                          const activeScore = selSt.grades[ind.id];
                          return (
                            <tr key={ind.id}>
                              {i === 0 && (
                                <td 
                                  rowSpan={3} 
                                  className="border border-black py-0.5 px-1.5 text-center font-bold bg-neutral-50/50 align-middle text-[9.5px] leading-tight font-sans text-black"
                                >
                                  Cinta Tanah Air
                                </td>
                              )}
                              <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px]">
                                {ind.text}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-emerald-700">
                                {activeScore === 'BSB' ? '✔' : ''}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-blue-700">
                                {activeScore === 'B' ? '✔' : ''}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-amber-700">
                                {activeScore === 'MB' ? '✔' : ''}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-rose-700">
                                {activeScore === 'BB' ? '✔' : ''}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Disiplin (3 indicators) */}
                        {categories.find(c => c.id === 'DSP')?.indicators.map((ind, i) => {
                          const activeScore = selSt.grades[ind.id];
                          return (
                            <tr key={ind.id}>
                              {i === 0 && (
                                <td 
                                  rowSpan={3} 
                                  className="border border-black py-0.5 px-1.5 text-center font-bold bg-neutral-50/50 align-middle text-[9.5px] leading-tight font-sans text-black"
                                >
                                  Disiplin
                                </td>
                              )}
                              <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px]">
                                {ind.text}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-emerald-700">
                                {activeScore === 'BSB' ? '✔' : ''}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-blue-700">
                                {activeScore === 'B' ? '✔' : ''}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-amber-700">
                                {activeScore === 'MB' ? '✔' : ''}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-rose-700">
                                {activeScore === 'BB' ? '✔' : ''}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Berbudi Luhur (3 indicators) */}
                        {categories.find(c => c.id === 'BBL')?.indicators.map((ind, i) => {
                          const activeScore = selSt.grades[ind.id];
                          return (
                            <tr key={ind.id}>
                              {i === 0 && (
                                <td 
                                  rowSpan={3} 
                                  className="border border-black py-0.5 px-1.5 text-center font-bold bg-neutral-50/50 align-middle text-[9.5px] leading-tight font-sans text-black"
                                >
                                  Berbudi Luhur
                                </td>
                              )}
                              <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px]">
                                {ind.text}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-emerald-700">
                                {activeScore === 'BSB' ? '✔' : ''}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-blue-700">
                                {activeScore === 'B' ? '✔' : ''}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-amber-700">
                                {activeScore === 'MB' ? '✔' : ''}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-rose-700">
                                {activeScore === 'BB' ? '✔' : ''}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Cerdas (1st indicator only) */}
                        {(() => {
                          const certCat = categories.find(c => c.id === 'CRD');
                          if (!certCat || certCat.indicators.length === 0) return null;
                          const ind = certCat.indicators[0];
                          const activeScore = selSt.grades[ind.id];
                          return (
                            <tr key={ind.id}>
                              <td 
                                className="border border-black py-0.5 px-1.5 text-center font-bold bg-neutral-50/50 align-middle text-[9.5px] leading-tight font-sans text-black"
                              >
                                Cerdas
                              </td>
                              <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px]">
                                {ind.text}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-emerald-700">
                                {activeScore === 'BSB' ? '✔' : ''}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-blue-700">
                                {activeScore === 'B' ? '✔' : ''}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-amber-700">
                                {activeScore === 'MB' ? '✔' : ''}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-rose-700">
                                {activeScore === 'BB' ? '✔' : ''}
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* PRINT PAGE 2 */}
                <div className="print-page w-[210mm] h-[297mm] max-h-[297mm] overflow-visible p-[12mm_15mm] box-border text-[11pt] leading-relaxed flex flex-col justify-between">
                  <div className="flex flex-col gap-4">
                    {/* Table continuation on Page 2 */}
                    <table className="w-full text-left text-[9pt] border border-black border-collapse font-sans leading-snug table-fixed avoid-break">
                      <colgroup>
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '41%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '11%' }} />
                      </colgroup>
                      <tbody>
                        {/* Cerdas (2nd and 3rd indicators) */}
                        {(() => {
                          const certCat = categories.find(c => c.id === 'CRD');
                          if (!certCat || certCat.indicators.length < 2) return null;
                          const remaining = certCat.indicators.slice(1);
                          return remaining.map((ind, idx) => {
                            const activeScore = selSt.grades[ind.id];
                            return (
                              <tr key={ind.id}>
                                {idx === 0 && (
                                  <td 
                                    rowSpan={2} 
                                    className="border border-black py-0.5 px-1.5 bg-neutral-50/50 align-middle"
                                  ></td>
                                )}
                                <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px]">
                                  {ind.text}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-emerald-700">
                                  {activeScore === 'BSB' ? '✔' : ''}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-blue-700">
                                  {activeScore === 'B' ? '✔' : ''}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-amber-700">
                                  {activeScore === 'MB' ? '✔' : ''}
                                </td>
                                <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-rose-700">
                                  {activeScore === 'BB' ? '✔' : ''}
                                </td>
                              </tr>
                            );
                          });
                        })()}

                        {/* Terampil (3 indicators) */}
                        {categories.find(c => c.id === 'TRM')?.indicators.map((ind, i) => {
                          const activeScore = selSt.grades[ind.id];
                          return (
                            <tr key={ind.id}>
                              {i === 0 && (
                                <td 
                                  rowSpan={3} 
                                  className="border border-black py-0.5 px-1.5 text-center font-bold bg-neutral-50/50 align-middle text-[9.5px] leading-tight font-sans text-black"
                                >
                                  Terampil
                                </td>
                              )}
                              <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px]">
                                {ind.text}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-emerald-700">
                                {activeScore === 'BSB' ? '✔' : ''}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-blue-700">
                                {activeScore === 'B' ? '✔' : ''}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-amber-700">
                                {activeScore === 'MB' ? '✔' : ''}
                              </td>
                              <td className="border border-black text-center align-middle font-bold text-[11pt] p-0 text-rose-700">
                                {activeScore === 'BB' ? '✔' : ''}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Uraian Kesimpulan Row (Collapsed under Terampil) */}
                        <tr>
                          <td 
                            className="border border-black p-1.5 font-bold bg-white text-left font-sans text-[8.5pt] align-top"
                            colSpan={1}
                          >
                            Uraian Kesimpulan Pencapaian 5NK :
                          </td>
                          <td 
                            className="border border-black p-2 min-h-[85px] text-justify text-[9pt] text-slate-900 leading-relaxed font-sans font-medium"
                            colSpan={5}
                          >
                            {selSt.kesimpulan || 'Siswa menunjukkan antusiasme yang luar biasa dan tekad kuat untuk terus berprestasi. Perkembangan moral dan akademik berjalan seimbang serta berkembang ideal.'}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Catatan Pendukung (Wali Kelas & Orang Tua) - Collapsed border-t-0 immediately below the table */}
                    <div className="grid grid-cols-2 border border-black border-t-0 divide-x divide-black border-collapse avoid-break -mt-4">
                      {/* Wali Kelas Side */}
                      <div className="flex flex-col">
                        <div className="bg-white border-b border-black p-1.5">
                          <p className="font-bold text-[9pt] text-black text-left">Catatan Wali Kelas:</p>
                        </div>
                        <div className="p-2.5 min-h-[85px] text-justify text-[9pt] text-slate-800 leading-relaxed font-sans">
                          {selSt.catatanWali || 'Teruskan perilaku budi luhur ini dan tingkatkan konsistensi waktu belajarnya.'}
                        </div>
                      </div>

                      {/* Orang Tua Side */}
                      <div className="flex flex-col">
                        <div className="bg-white border-b border-black p-1.5">
                          <p className="font-bold text-[9pt] text-black text-left">Catatan Orang Tua/Wali:</p>
                        </div>
                        <div className="p-2.5 min-h-[85px] text-justify text-[9pt] text-slate-500 italic leading-relaxed font-sans whitespace-pre-wrap">
                          {selSt.catatanOrangTua !== undefined ? selSt.catatanOrangTua : 'Kami berkomitmen untuk terus membimbing anak di rumah sesuai arahan sekolah.'}
                        </div>
                      </div>
                    </div>

                    {/* Signatures block */}
                    <div className="mt-4 avoid-break">
                      <p className="text-[10.5pt] font-semibold text-black text-center mb-6 select-none">
                        Mengetahui,
                      </p>
                      <div className="grid grid-cols-2 gap-12 text-center">
                        {/* Orang Tua */}
                        <div className="flex flex-col items-center justify-between h-32 relative">
                          <p className="text-[10.5pt] text-black font-bold select-none">Orang Tua / Wali</p>
                          <div className="h-16 flex items-center justify-center relative w-full">
                            {kopSekolah.signatureParentUrl ? (
                              <img
                                src={kopSekolah.signatureParentUrl}
                                alt="Tanda Tangan Orang Tua"
                                className="max-h-16 max-w-[180px] object-contain"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="h-4"></div>
                            )}
                          </div>
                          <div className="flex flex-col items-center w-full">
                            <div className="w-48 border-b-[1.5px] border-black pb-0.5"></div>
                            <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none">Tanda Tangan & Nama Terang</p>
                          </div>
                        </div>

                        {/* Guru Kelas */}
                        <div className="flex flex-col items-center justify-between h-32 relative">
                          <p className="text-[10.5pt] text-black font-bold">Guru Kelas / Wali Kelas</p>
                          <div className="h-16 flex items-center justify-center relative w-full">
                            {kopSekolah.signatureTeacherUrl ? (
                              <img
                                src={kopSekolah.signatureTeacherUrl}
                                alt="Tanda Tangan Guru"
                                className="max-h-16 max-w-[180px] object-contain"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="h-4"></div>
                            )}
                          </div>
                          <div className="flex flex-col items-center w-full font-sans">
                            <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all underline underline-offset-4 decoration-[1.5px]">
                              {getWaliKelas(selSt).name || '____________________'}
                            </p>
                            {getWaliKelas(selSt).nip && getWaliKelas(selSt).nip.trim() !== '' && getWaliKelas(selSt).nip.trim() !== '-' ? (
                              <p className="text-[8.5pt] text-slate-700 font-mono mt-1 select-all">
                                NIP. {getWaliKelas(selSt).nip}
                              </p>
                            ) : (
                              <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="w-[210mm] h-[297mm] flex flex-col gap-2 items-center justify-center font-bold text-slate-400 bg-slate-50 italic">
                <AlertTriangle className="h-10 w-10 text-slate-300" />
                <p>Data murid gagal dimuat atau kosong.</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* SANDBOX SECURITY NOTICE MODAL */}
      {showSandboxNotice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999999] animate-in fade-in duration-200 no-print">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-4">
                <Printer className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-2">
                Kontrol Cetak Terproteksi
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-5">
                Tombol <span className="font-semibold text-indigo-600">Cetak Langsung</span> berhasil ditekan! Namun, respons cetak browser dibatasi oleh pengaman Iframe jika aplikasi dijalankan di panel pratinjau.
              </p>
              <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3 border border-slate-100 leading-relaxed mb-6">
                Silakan ketuk tombol <span className="font-semibold text-slate-700">"Buka di Tab Baru"</span> di pojok layar utama untuk cetak printer langsung, atau unduh berkas melalui tombol <span className="font-semibold text-emerald-600">"Unduh PDF"</span> yang selalu aktif di halaman ini.
              </p>
              
              <button
                onClick={() => setShowSandboxNotice(false)}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md hover:shadow-indigo-100"
              >
                Paham & Tutup Pesan
              </button>
            </div>
          </div>
        </div>
      )}

      {isSyncingAllToDrive && (
        <div className="fixed bottom-6 right-6 w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 z-50 flex flex-col gap-3 transition-all duration-300 transform scale-100 no-print animate-in fade-in slide-in-from-bottom-4 animate-duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Sinkronisasi Google Drive
              </h4>
            </div>
            {syncStatus.current === syncStatus.total && (
              <button 
                onClick={() => setIsSyncingAllToDrive(false)}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md font-bold transition-all cursor-pointer border border-slate-200"
              >
                Tutup
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Folder Tujuan</p>
            <p className="text-xs font-semibold text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-150 inline-flex items-center gap-2">
              <Cloud className="h-3.5 w-3.5 text-teal-600" />
              {syncStatus.folderName || 'Mempersiapkan folder...'}
            </p>
          </div>

          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-600">
              <span className="truncate max-w-[200px]">
                {syncStatus.current === syncStatus.total ? '✓ Semua Selesai!' : `Siswa: ${syncStatus.currentStudentName}`}
              </span>
              <span>
                {syncStatus.current} / {syncStatus.total}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-150">
              <div 
                className="bg-teal-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${syncStatus.total > 0 ? (syncStatus.current / syncStatus.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1 text-center">
            <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100">
              <p className="text-[9px] font-bold text-emerald-500 uppercase">Berhasil</p>
              <p className="text-sm font-bold text-emerald-700">{syncStatus.completed}</p>
            </div>
            <div className="bg-rose-50 rounded-lg p-2 border border-rose-100">
              <p className="text-[9px] font-bold text-rose-500 uppercase">Gagal</p>
              <p className="text-sm font-bold text-rose-700">{syncStatus.failed}</p>
            </div>
          </div>
          
          {syncStatus.current === syncStatus.total && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 text-[10.5px] text-slate-600 leading-normal flex flex-col gap-1.5 animate-in fade-in animate-duration-300">
              <p className="font-bold text-slate-705 font-semibold">✓ Sinkronisasi Selesai!</p>
              <p>Rapor siswa telah berhasil diunggah ke Google Drive Anda pada folder <strong>{syncStatus.folderName}</strong>. Anda dapat memeriksanya langsung di Google Drive Anda.</p>
            </div>
          )}
        </div>
      )}

      {isGeneratingClassZip && (
        <div className="fixed bottom-6 right-6 w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl p-5 z-50 flex flex-col gap-3 transition-all duration-300 transform scale-100 no-print animate-in fade-in slide-in-from-bottom-4 animate-duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Pembuatan ZIP Satu Kelas
              </h4>
            </div>
            {classZipStatus.current === classZipStatus.total && (
              <button 
                onClick={() => setIsGeneratingClassZip(false)}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-md font-bold transition-all cursor-pointer border border-slate-200"
              >
                Tutup
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-600">
              <span className="truncate max-w-[200px]">
                {classZipStatus.current === classZipStatus.total ? '✓ Selesai Mengunduh!' : `Siswa: ${classZipStatus.currentStudentName}`}
              </span>
              <span>
                {classZipStatus.current} / {classZipStatus.total}
              </span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-150">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${classZipStatus.total > 0 ? (classZipStatus.current / classZipStatus.total) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-1 text-center">
            <div className="bg-emerald-50 rounded-lg p-2 border border-emerald-100">
              <p className="text-[9px] font-bold text-emerald-500 uppercase">Berhasil</p>
              <p className="text-sm font-bold text-emerald-700">{classZipStatus.completed}</p>
            </div>
            <div className="bg-rose-50 rounded-lg p-2 border border-rose-100">
              <p className="text-[9px] font-bold text-rose-500 uppercase">Gagal</p>
              <p className="text-sm font-bold text-rose-700">{classZipStatus.failed}</p>
            </div>
          </div>
          
          {classZipStatus.current === classZipStatus.total && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 text-[10.5px] text-slate-600 leading-normal flex flex-col gap-1.5 animate-in fade-in animate-duration-300">
              <p className="font-bold text-emerald-800">✓ Proses ZIP Selesai!</p>
              <p>Rapor untuk seluruh siswa kelas <strong>{selectedClass}</strong> telah berhasil diekspor sebagai dokumen PDF individual dan dikemas ke dalam satu arsip ZIP.</p>
            </div>
          )}
        </div>
      )}

      {isGeneratingClassPdf && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99999] flex flex-col items-center justify-center p-4 no-print animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 max-w-md w-full flex flex-col items-center text-center gap-4 animate-in zoom-in-95 duration-200">
            <div className="h-16 w-16 bg-violet-50 text-violet-600 rounded-full flex items-center justify-center mb-2">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            
            <div>
              <h4 className="font-bold text-slate-800 text-lg mb-1">
                Menyusun Laporan PDF Massal
              </h4>
              <p className="text-sm text-slate-500">
                Memproses {classPdfStatus.total} siswa menjadi satu fail PDF...
              </p>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-3 mb-1 overflow-hidden relative">
              <div 
                className="bg-violet-600 h-3 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${(classPdfStatus.current / (classPdfStatus.total || 1)) * 100}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between w-full text-xs font-bold text-slate-500">
              <span>{Math.round((classPdfStatus.current / (classPdfStatus.total || 1)) * 100)}%</span>
              <span>{classPdfStatus.current} dari {classPdfStatus.total} selesai</span>
            </div>

            <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-3 w-full text-left">
              <p className="font-mono text-[10px] text-slate-500 uppercase tracking-wider mb-1">Sedang memproses:</p>
              <p className="font-bold text-violet-700 text-sm truncate">{classPdfStatus.currentStudentName}</p>
            </div>
            
            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              * Jangan memuat ulang atau menutup halaman ini sampai proses otomatis selesai.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MATHEMATICAL OKLCH TO sRGB CONVERSION
// ==========================================
function parseOklchColor(val: string): string | null {
  if (!val || typeof val !== 'string') return null;
  const match = val.match(/oklch\(([^)]+)\)/i);
  if (!match) return null;
  
  const contents = match[1].trim();
  const parts = contents.split(/[\s/]+/);
  if (parts.length < 3) return null;
  
  const lStr = parts[0];
  const cStr = parts[1];
  const hStr = parts[2];
  const aStr = parts[3] || '1';
  
  const l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
  const c = cStr.endsWith('%') ? parseFloat(cStr) / 100 : parseFloat(cStr);
  const h = parseFloat(hStr);
  
  let alpha = 1;
  if (aStr) {
    alpha = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
  }
  
  if (isNaN(l) || isNaN(c) || isNaN(h)) return null;
  
  return oklchToRgb(l, c, h, alpha);
}

function parseOklabColor(val: string): string | null {
  if (!val || typeof val !== 'string') return null;
  const match = val.match(/oklab\(([^)]+)\)/i);
  if (!match) return null;
  
  const contents = match[1].trim();
  const parts = contents.split(/[\s/]+/);
  if (parts.length < 3) return null;
  
  const lStr = parts[0];
  const aStr = parts[1];
  const bStr = parts[2];
  const alphaStr = parts[3] || '1';
  
  const l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
  const a = parseFloat(aStr);
  const b = parseFloat(bStr);
  
  let alpha = 1;
  if (alphaStr) {
    alpha = alphaStr.endsWith('%') ? parseFloat(alphaStr) / 100 : parseFloat(alphaStr);
  }
  if (isNaN(l) || isNaN(a) || isNaN(b)) return null;
  
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;
  
  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;
  
  const x = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const y = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const z = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;
  
  const r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const g = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
  const b_val = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
  
  const gamma = (c_val: number): number => {
    return c_val <= 0.0031308 ? 12.92 * c_val : 1.055 * Math.pow(c_val, 1 / 2.4) - 0.055;
  };
  
  const red = Math.round(Math.max(0, Math.min(1, gamma(r))) * 255);
  const green = Math.round(Math.max(0, Math.min(1, gamma(g))) * 255);
  const blue = Math.round(Math.max(0, Math.min(1, gamma(b_val))) * 255);
  
  return alpha === 1 
    ? `rgb(${red}, ${green}, ${blue})` 
    : `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function oklchToRgb(l: number, c: number, h: number, alpha: number = 1): string {
  // Convert h from degrees to radians
  const hRad = (h * Math.PI) / 180;
  
  // OKLCH to OKLAB
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  
  // OKLAB to LMS
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;
  
  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;
  
  // LMS to XYZ
  const x = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const y = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const z = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;
  
  // XYZ to RGB (linear)
  const r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const g = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
  const b_val = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
  
  // Gamma correction to sRGB
  const gamma = (c_val: number): number => {
    return c_val <= 0.0031308 ? 12.92 * c_val : 1.055 * Math.pow(c_val, 1 / 2.4) - 0.055;
  };
  
  const red = Math.round(Math.max(0, Math.min(1, gamma(r))) * 255);
  const green = Math.round(Math.max(0, Math.min(1, gamma(g))) * 255);
  const blue = Math.round(Math.max(0, Math.min(1, gamma(b_val))) * 255);
  
  return alpha === 1 
    ? `rgb(${red}, ${green}, ${blue})` 
    : `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

// Converts OKLCH definitions inside CSS to standard colors
function convertOklchCss(css: string): string {
  return css.replace(/oklch\(([^)]+)\)/gi, (_, contents: string) => {
    try {
      const parts = contents.trim().split(/[\s/]+/);
      if (parts.length < 3) return 'rgb(240, 240, 240)';
      
      const lStr = parts[0];
      const cStr = parts[1];
      const hStr = parts[2];
      const aStr = parts[3] || '1';
      
      const l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
      const c = cStr.endsWith('%') ? parseFloat(cStr) / 100 : parseFloat(cStr);
      const h = parseFloat(hStr);
      
      let alpha = 1;
      if (aStr) {
        alpha = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
      }
      
      if (isNaN(l) || isNaN(c) || isNaN(h)) return 'rgb(240, 240, 240)';
      
      return oklchToRgb(l, c, h, alpha);
    } catch (e) {
      return 'rgb(240, 240, 240)';
    }
  });
}

