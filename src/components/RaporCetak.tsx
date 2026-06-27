import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { flushSync, createPortal } from 'react-dom';
import JSZip from 'jszip';
import { Student, Category, KopSekolah, scoreOptions } from '../types';
import { Printer, Download, Eye, FileSpreadsheet, ArrowLeft, Heart, Award, Sparkles, FileText, Loader2, Archive, Search, Wrench, Sliders, Check, Layers, Cloud } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { uploadFileToDrive } from '../lib/drive.ts';
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
  initialBatchNisList?: string[];
  onAddExportLog?: (type: string, action: string, file: string, count: number) => void;
  teachers?: any[];
  onMarkAsPrinted?: (studentIds: any[]) => void;
  autoTriggerBatchPdf?: boolean;
  autoPrintImmediately?: boolean;
  onResetAutoTrigger?: () => void;
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
  initialBatchNisList = [],
  onAddExportLog,
  teachers = [],
  onMarkAsPrinted,
  autoTriggerBatchPdf = false,
  autoPrintImmediately = false,
  onResetAutoTrigger,
}: RaporCetakProps) {
  
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [batchStudent, setBatchStudent] = useState<Student | null>(null);
  const [showSandboxNotice, setShowSandboxNotice] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [renderTrigger, setRenderTrigger] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const unsub = initAuth();
    return () => unsub();
  }, []);
  
  // States for diagnostic layout inspection
  const [isDiagnosticMode, setIsDiagnosticMode] = useState(false);
  const [showMarginsGuide, setShowMarginsGuide] = useState(true);
  const [showGridRuler, setShowGridRuler] = useState(false);

  // All class students from props or default to current student
  const classStudents = allClassStudents && allClassStudents.length > 0 ? allClassStudents : [student];
  const selectedClass = student.kelas;

  // Selected students representation inside the sidebar checkbox list
  const [selectedNisList, setSelectedNisList] = useState<string[]>([student.nis]);
  // Currently displayed student in on-screen Mock Preview
  const [previewNis, setPreviewNis] = useState<string>(student.nis);

  // Sync the selected list and preview when initialBatchNisList or autoTriggerBatchPdf changes
  useEffect(() => {
    if (initialBatchNisList && initialBatchNisList.length > 0) {
      setSelectedNisList(initialBatchNisList);
      setPreviewNis(initialBatchNisList[0]);
    } else if (autoTriggerBatchPdf) {
      const allNis = classStudents.map(s => s.nis);
      setSelectedNisList(allNis);
      if (allNis.length > 0) {
        setPreviewNis(allNis[0]);
      }
    } else {
      setSelectedNisList([student.nis]);
      setPreviewNis(student.nis);
    }
  }, [initialBatchNisList, autoTriggerBatchPdf, student.nis]);

  // Automatically trigger PDF download or Print when autoTriggerBatchPdf is active
  useEffect(() => {
    if (autoTriggerBatchPdf) {
      const timer = setTimeout(() => {
        if (autoPrintImmediately) {
          handlePrint();
        } else {
          handleDownloadAllPDFs();
        }
        onResetAutoTrigger?.();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [autoTriggerBatchPdf, autoPrintImmediately]);

  // Computed state
  const activeStudent = classStudents.find(s => s.nis === previewNis) || student;
  const selectedStudents = classStudents.filter(s => selectedNisList.includes(s.nis));

  // If a ZIP download is in progress, we render just the 1 active batchStudent under loop.
  // Otherwise, we render all of the checked/selected students so they compile/print as a combined set.
  const pdfRenderStudents = isGeneratingAll
    ? (batchStudent ? [batchStudent] : [])
    : selectedStudents;

  const filteredClassStudents = classStudents.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nis.includes(searchTerm)
  );

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

  const getHtml2PdfOpt = (targetStudent: Student, originalElement: HTMLElement) => {
    return {
      margin:       0,
      filename:     `Rapor_5NK_${targetStudent.name.replace(/\s+/g, '_')}_${targetStudent.nis}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
        scale: 2, 
        useCORS: true, 
        letterRendering: true, 
        logging: false,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc: Document) => {
          const clonedPrintSection = clonedDoc.getElementById('rapor-print-section');
          if (clonedPrintSection) {
            clonedPrintSection.style.setProperty('position', 'static', 'important');
            clonedPrintSection.style.setProperty('left', '0', 'important');
            clonedPrintSection.style.setProperty('top', '0', 'important');
            clonedPrintSection.style.setProperty('width', '210mm', 'important');
            clonedPrintSection.style.setProperty('height', 'auto', 'important');
            clonedPrintSection.style.setProperty('overflow', 'visible', 'important');
            clonedPrintSection.style.setProperty('z-index', 'auto', 'important');
            clonedPrintSection.style.setProperty('opacity', '1', 'important');
            clonedPrintSection.style.setProperty('display', 'block', 'important');
            clonedPrintSection.style.setProperty('visibility', 'visible', 'important');
          }
          const clonedTarget = clonedDoc.getElementById('rapor-pdf-content');
          if (clonedTarget) {
            clonedTarget.classList.remove('print-only', 'hidden');
            clonedTarget.style.display = 'block';
            clonedTarget.style.position = 'static';
            clonedTarget.style.visibility = 'visible';
            clonedTarget.style.opacity = '1';
            
            const colorCache = new Map<string, string>();
            let ctx: CanvasRenderingContext2D | null = null;
            
            const toSafeRgb = (val: string, fallback: string = 'transparent') => {
              if (!val || typeof val !== 'string') return val;
              if (colorCache.has(val)) return colorCache.get(val)!;
              
              if (val.includes('oklch')) {
                const parsed = parseOklchColor(val);
                if (parsed) {
                  colorCache.set(val, parsed);
                  return parsed;
                }
              }
              if (val.includes('oklab')) {
                const parsed = parseOklabColor(val);
                if (parsed) {
                  colorCache.set(val, parsed);
                  return parsed;
                }
              }
              if (val.includes('color-mix')) {
                const nestedOklch = val.match(/oklch\(([^)]+)\)/i);
                if (nestedOklch) {
                  const parsed = parseOklchColor(nestedOklch[0]);
                  if (parsed) {
                    if (val.includes('transparent') || val.includes('rgba(0,0,0,0)')) {
                      // fallback clean replacement
                      const matchRgb = parsed.match(/\d+,\s*\d+,\s*\d+/);
                      if (matchRgb) {
                        const alphaVal = val.includes('0.') ? val.match(/0\.\d+/)?.[0] || '0.15' : '0.15';
                        const adjusted = `rgba(${matchRgb[0]}, ${alphaVal})`;
                        colorCache.set(val, adjusted);
                        return adjusted;
                      }
                    }
                    colorCache.set(val, parsed);
                    return parsed;
                  }
                }
                const nestedOklab = val.match(/oklab\(([^)]+)\)/i);
                if (nestedOklab) {
                  const parsed = parseOklabColor(nestedOklab[0]);
                  if (parsed) {
                    colorCache.set(val, parsed);
                    return parsed;
                  }
                }
              }
              
              // Only run canvas parsing of colors if they are not already parsed and contain oklch/oklab
              if (!val.includes('oklch') && !val.includes('oklab') && !val.includes('color-mix')) {
                return val;
              }
              
              try {
                if (!ctx) {
                  const canvas = document.createElement('canvas');
                  canvas.width = 1;
                  canvas.height = 1;
                  ctx = canvas.getContext('2d', { willReadFrequently: true });
                }
                
                if (ctx) {
                  ctx.clearRect(0, 0, 1, 1);
                  ctx.fillStyle = val;
                  ctx.fillRect(0, 0, 1, 1);
                  const data = ctx.getImageData(0, 0, 1, 1).data;
                  if (data[3] === 0) {
                    colorCache.set(val, 'transparent');
                    return 'transparent';
                  }
                  
                  const rgbStr = `rgba(${data[0]}, ${data[1]}, ${data[2]}, ${data[3] / 255})`;
                  colorCache.set(val, rgbStr);
                  return rgbStr;
                }
              } catch (e) {}
              
              if (val.includes('0.4') || val.includes('0.96')) return 'rgb(241, 245, 249)';
              if (val.includes('0.5') || val.includes('0.98')) return 'rgb(248, 250, 252)';
              return fallback;
            };

            const origNodes = Array.from(originalElement.querySelectorAll('[class*="bg-"], [class*="text-"], [class*="border-"], svg, path')) as HTMLElement[];
            const cloneNodes = Array.from(clonedTarget.querySelectorAll('[class*="bg-"], [class*="text-"], [class*="border-"], svg, path')) as HTMLElement[];
            
            origNodes.forEach((orig, idx) => {
              try {
                const cloneEl = cloneNodes[idx];
                if (!cloneEl) return;
                const computed = window.getComputedStyle(orig);
                
                // Copy ONLY color properties to keep html2canvas oklch-safe,
                // while leaving layout parameters (width, height, flex, margins, padding, line heights)
                // to be governed perfectly by our template CSS rules!
                cloneEl.style.color = toSafeRgb(computed.color, 'rgb(0, 0, 0)');
                cloneEl.style.backgroundColor = toSafeRgb(computed.backgroundColor, 'transparent');
                
                ['top', 'right', 'bottom', 'left'].forEach(pos => {
                  try {
                    const bc = computed.getPropertyValue(`border-${pos}-color`);
                    if (bc) {
                      cloneEl.style.setProperty(`border-${pos}-color`, toSafeRgb(bc, 'rgb(0, 0, 0)'));
                    }
                  } catch (e) {}
                });
              } catch (err) {}
            });

            try {
              const rootComputed = window.getComputedStyle(originalElement);
              clonedTarget.style.color = toSafeRgb(rootComputed.color, 'rgb(0,0,0)');
              clonedTarget.style.backgroundColor = toSafeRgb(rootComputed.backgroundColor, 'rgb(255,255,255)');
            } catch (err) {}
          }

          // Clean & sanitize style tags and elements inside the cloned content without deleting CSS files which ruins tailwind
          try {
            const styleElements = Array.from(clonedDoc.querySelectorAll('style'));
            styleElements.forEach(styleTag => {
              try {
                styleTag.innerHTML = convertOklchCss(styleTag.innerHTML)
                  .replace(/oklab\([^)]+\)/gi, 'rgba(0,0,0,0.1)')
                  .replace(/color-mix\([^)]+\)/gi, 'rgba(0,0,0,0.1)');
              } catch (e) {}
            });

            // Strip script tags to avoid background evaluation in cloned iframe
            const scriptElements = Array.from(clonedDoc.querySelectorAll('script'));
            scriptElements.forEach(el => el.remove());
          } catch (err) {
            console.error("Failed to sanitize cloned layout stylesheets:", err);
          }
        }
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'] }
    };
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
    const html2pdfFn = typeof html2pdf === 'function' ? html2pdf : (html2pdf as any).default;
    if (!html2pdfFn) {
      console.error("[Cetak PDF Error] html2pdf library function is not loaded in window scope.");
      return;
    }

    setIsGeneratingPdf(true);

    try {
      // Force a complete clean re-render of student data and flush updates synchronously
      flushSync(() => {
        setRenderTrigger(prev => prev + 1);
      });

      const originalElement = document.getElementById('rapor-pdf-content');
      if (!originalElement) {
        console.error("[Cetak PDF Error] #rapor-pdf-content target selector element is missing from document DOM.");
        return;
      }

      // Force immediate layout reflow
      void originalElement.offsetHeight;
      
      // Let the browser paint
      await new Promise(resolve => setTimeout(resolve, 150));

      // Run live dry-run DOM verification check with deep audits
      const dryRunPassed = runDryRunAuditAndVerifyDom(selectedStudents.length);
      if (!dryRunPassed) {
        console.warn("[Dry-Run Warning] Detasemen validasi DOM menemukan ketidakcocokan visual; melanjutkan regenerasi paksa.");
      }

      let filename = `Rapor_5NK_Batch_${selectedClass}.pdf`;
      if (selectedStudents.length === 1) {
        const s = selectedStudents[0];
        filename = `Rapor_5NK_${s.name.replace(/\s+/g, '_')}_${s.nis}.pdf`;
      }

      const baseOpt = getHtml2PdfOpt(selectedStudents[0] || student, originalElement);
      const opt = {
        ...baseOpt,
        filename: filename
      };

      console.log(`[PDF Generator] Starting html2pdf with filename: "${filename}"`);
      await html2pdfFn().set(opt).from(originalElement).save();
      console.log("[PDF Generator] File generated and download triggered successfully.");
    } catch (err) {
      console.error("Kesalahan Unduh PDF:", err);
    } finally {
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

    try {
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

        const baseOpt = getHtml2PdfOpt(curStudent, originalElement);
        let filename = `Rapor_5NK_${curStudent.name.replace(/\s+/g, '_')}_${curStudent.nis}.pdf`;
        
        const opt = {
          ...baseOpt,
          filename
        };

        const pdfBlob = await html2pdfFn().set(opt).from(originalElement).output('blob');
        
        if (pdfBlob && pdfBlob.size > 0) {
          await uploadFileToDrive(token, pdfBlob, filename);
          uploadedCount++;
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
      setBatchStudent(null);
      setIsUploadingToDrive(false);
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

    try {
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

        const opt = getHtml2PdfOpt(curStudent, originalElement);
        
        // Generate Blob directly from the fully stable element
        console.log(` - Generating html2pdf blob for ${curStudent.name}...`);
        const pdfBlob = await html2pdfFn().set(opt).from(originalElement).output('blob');
        
        if (pdfBlob && pdfBlob.size > 0) {
          console.log(` ✅ Blob generated successfully: ${pdfBlob.size} bytes. MIME: ${pdfBlob.type}`);
          folder.file(opt.filename, pdfBlob);
        } else {
          console.error(` ❌ ERROR: Generated blob for "${curStudent.name}" is empty or failed!`);
          throw new Error(`Empty blob generated for student: ${curStudent.name}`);
        }
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
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log("[Batch PDF Engine] Batch processing completed successfully and ZIP downloaded.");

    } catch (err) {
      console.error("Kesalahan Unduh Semua PDF:", err);
    } finally {
      setBatchStudent(null);
      setIsGeneratingAll(false);
    }
  };

  // Kartika Jaya School Seal SVG Representation
  const KartikaLogo = () => (
    <svg width="80" height="80" viewBox="0 0 100 100" className="h-20 w-20 flex-none text-emerald-700 mx-auto" aria-hidden="true">
      {/* Outer shield/crest */}
      <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" fill="#15803d" stroke="#facc15" strokeWidth="2.5" />
      {/* Inner crest */}
      <polygon points="50,12 82,28 82,72 50,88 18,72 18,28" fill="#16a34a" />
      {/* Star */}
      <polygon points="50,15 58,35 78,35 62,48 68,68 50,55 32,68 38,48 22,35 42,35" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
      {/* Shield circle */}
      <circle cx="50" cy="50" r="14" fill="#ffffff" stroke="#1e3a8a" strokeWidth="1.5" />
      {/* Book symbol lines */}
      <path d="M42,48 C46,51 50,47 50,47 C50,47 54,51 58,48 M42,52 C46,55 50,51 50,51 C50,51 54,55 58,52" stroke="#ea580c" strokeWidth="1.5" fill="none" />
      {/* Laurel leaves branches at bottom */}
      <path d="M22,60 Q30,85 50,82 Q70,85 78,60" stroke="#facc15" strokeWidth="2.5" fill="none" />
      {/* Banner */}
      <path d="M12,70 L30,75 L50,72 L70,75 L88,70 L84,78 L50,78 L16,78 Z" fill="#b91c1c" stroke="#facc15" strokeWidth="1" />
      <text x="50" y="76" fill="#ffffff" fontSize="5" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">KARTIKA JAYA</text>
    </svg>
  );

  return (
    <div id="rapor-cetak-wrapper" className="flex flex-col gap-6">
      {/* Action panel & toolbar */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-wrap gap-3 items-center justify-between no-print">
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Grid Excel
          </button>

          <button
            onClick={() => setIsSidebarOpen(prev => !prev)}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
            title={isSidebarOpen ? "Sembunyikan Daftar Siswa" : "Tampilkan Daftar Siswa"}
          >
            <Sliders className={`h-4 w-4 ${isSidebarOpen ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>{isSidebarOpen ? 'Tutup Daftar Siswa' : 'Daftar Siswa'}</span>
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsDiagnosticMode(prev => !prev)}
            className={`px-4 py-2 text-xs font-bold rounded-lg flex items-center gap-2 cursor-pointer transition-all border transform hover:-translate-y-0.5 active:translate-y-0 ${
              isDiagnosticMode
                ? 'bg-amber-600 border-amber-700 text-white shadow-md hover:bg-amber-700 shadow-amber-100/50'
                : 'bg-white border-slate-200 text-amber-700 hover:text-amber-800 hover:bg-amber-50 shadow-xs'
            }`}
            title="Aktifkan Mode Diagnostik untuk meninjau tata letak PDF secara presisi 1:1"
          >
            <Wrench className="h-4 w-4" />
            <span>{isDiagnosticMode ? 'Tutup Diagnostik' : 'Mode Diagnostik'}</span>
          </button>

          <button
            onClick={onDownloadExcel}
            className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx)
          </button>
          
          <button
            onClick={handleDownloadAllPDFs}
            disabled={isGeneratingPdf || isGeneratingAll || isUploadingToDrive || selectedStudents.length === 0}
            className={`px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center gap-2 cursor-pointer transition-all shadow-md hover:shadow-amber-100 transform hover:-translate-y-0.5 active:translate-y-0 min-w-36 justify-center ${isGeneratingAll ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isGeneratingAll ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" />
                <span>Unduh ZIP ({selectedStudents.length})</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadPDF}
            disabled={isGeneratingPdf || isGeneratingAll || isUploadingToDrive || selectedStudents.length === 0}
            className={`px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-2 cursor-pointer transition-all shadow-md hover:shadow-rose-100 transform hover:-translate-y-0.5 active:translate-y-0 ${isGeneratingPdf ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Mengekspor...</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                <span>{selectedStudents.length > 1 ? `Unduh Gabungan PDF (${selectedStudents.length})` : 'Unduh PDF'}</span>
              </>
            )}
          </button>

          <button
            onClick={handleSaveToDrive}
            disabled={isUploadingToDrive || isGeneratingPdf || isGeneratingAll || selectedStudents.length === 0}
            className={`px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 cursor-pointer transition-all shadow-md hover:shadow-blue-100 transform hover:-translate-y-0.5 active:translate-y-0 ${isUploadingToDrive ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isUploadingToDrive ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menyimpan ke Drive...</span>
              </>
            ) : (
              <>
                <Cloud className="h-4 w-4" />
                <span>Simpan ke Drive</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            disabled={isGeneratingPdf || isGeneratingAll || isUploadingToDrive || selectedStudents.length === 0}
            className={`px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 cursor-pointer transition-all shadow-md hover:shadow-indigo-100 transform hover:-translate-y-0.5 active:translate-y-0 ${isGeneratingPdf || isGeneratingAll || isUploadingToDrive ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Printer className="h-4 w-4" /> {selectedStudents.length > 1 ? `Cetak Massal (${selectedStudents.length})` : 'Cetak Langsung'}
          </button>
        </div>
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
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0, x: -35, width: 0 }}
              animate={{ opacity: 1, x: 0, width: "100%" }}
              exit={{ opacity: 0, x: -35, width: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-1 overflow-hidden"
            >
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col gap-4 h-fit lg:sticky lg:top-6 selection:bg-transparent min-w-[240px]">
                <div className="flex flex-col gap-1 pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-xs tracking-tight flex items-center gap-2">
              <Award className="h-4 w-4 text-indigo-600 flex-none" />
              Daftar Siswa Kelas {selectedClass}
            </h3>
            <p className="text-[10px] text-slate-500 leading-normal">
              Pilih satu atau beberapa siswa untuk pratinjau, cetak massal, atau ekspor gabungan.
            </p>
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
                className="rounded border border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer accent-indigo-600"
              />
              <span className="text-[11px] font-bold text-slate-700">Pilih Semua</span>
            </label>
            <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md flex-none">
              {selectedNisList.length} / {classStudents.length}
            </span>
          </div>

          {/* Students Scroll List */}
          <div className="flex flex-col gap-1 max-h-[500px] overflow-y-auto pr-1">
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
                    onClick={() => setPreviewNis(s.nis)}
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
                          className="rounded border border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer accent-indigo-600"
                        />
                      </div>
                      <div className="min-w-0 pr-1 flex-1">
                        <p className={`text-[11px] font-bold uppercase truncate ${
                          isActivePreview ? 'text-indigo-900' : 'text-slate-800'
                        }`}>
                          {s.name}
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                          NIS. {s.nis}
                        </p>
                      </div>
                    </div>
                    
                    {isActivePreview && (
                      <span className="text-[8px] font-bold text-indigo-600 bg-indigo-100/50 px-1 py-0.5 rounded flex-none uppercase tracking-wider scale-90">
                        Aktif
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PREVIEW CONTAINER */}
        <div className={`flex flex-col gap-6 w-full ${isSidebarOpen ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
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
                </div>
              </div>

              {/* SIMULATED WORKBENCH CANVAS */}
              <div className="bg-slate-700/90 p-8 rounded-2xl border border-slate-600 shadow-inner flex flex-col items-center gap-8 overflow-x-auto select-none no-print">
                <div className={`simulate-print w-fit ${showMarginsGuide ? 'show-margins-guide' : ''} ${showGridRuler ? 'show-grid-ruler' : ''}`}>
                  
                  {/* PRINT PAGE 1 SIMULATION */}
                  <div className="print-page relative">
                    <div>
                      {/* Header, title & info */}
                      <div className="avoid-break select-none">
                        <div className="flex items-start gap-4 mb-0.5">
                          <div className="h-20 w-20 flex flex-col justify-center items-center flex-none">
                            {kopSekolah.logoUrl ? (
                              <img src={kopSekolah.logoUrl} alt="Logo Sekolah" className="max-h-20 max-w-20 object-contain" referrerPolicy="no-referrer" />
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
                          <span className="border-b border-black flex-1 font-bold text-slate-800 pb-0.5 uppercase text-left">{activeStudent.name}</span>
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
                      <table className="w-full table-fixed text-left text-[9pt] border border-black border-collapse font-sans leading-snug avoid-break">
                        <colgroup>
                          <col style={{ width: '15%' }} />
                          <col style={{ width: '41%' }} />
                          <col style={{ width: '11%' }} />
                          <col style={{ width: '11%' }} />
                          <col style={{ width: '11%' }} />
                          <col style={{ width: '11%' }} />
                        </colgroup>
                        <thead>
                          <tr style={{ backgroundColor: '#f1f5f9' }}>
                            <th rowSpan={2} colSpan={1} className="border border-black p-1.5 font-bold text-center text-[9.5pt] text-black">
                              5 Nilai Kartika
                            </th>
                            <th rowSpan={2} colSpan={1} className="border border-black p-1.5 font-bold text-center text-[9.5pt] text-black">
                              Indikator
                            </th>
                            <th colSpan={4} className="border border-black p-1 text-center font-bold text-[9.5pt] text-black">
                              Hasil Penilaian
                            </th>
                          </tr>
                          <tr style={{ backgroundColor: '#f8fafc' }} className="text-[8px] font-medium leading-tight text-black">
                            <th className="border border-black p-1 text-center font-bold text-black">
                              Berkembang Sangat Baik
                              <span className="block font-normal text-[7px] mt-0.5 leading-tight text-slate-700">Konsisten menunjukkan perilaku sesuai indikator tanpa perlu diingatkan.</span>
                            </th>
                            <th className="border border-black p-1 text-center font-bold text-black">
                              Berkembang
                              <span className="block font-normal text-[7px] mt-0.5 leading-tight text-slate-700">Menunjukkan perilaku sesuai indikator dengan sedikit arahan.</span>
                            </th>
                            <th className="border border-black p-1 text-center font-bold text-black">
                              Mulai Berkembang
                              <span className="block font-normal text-[7px] mt-0.5 leading-tight text-slate-700">Perlu sering diingatkan untuk menunjukkan perilaku sesuai indikator.</span>
                            </th>
                            <th className="border border-black p-1 text-center font-bold text-black">
                              Belum Berkembang
                              <span className="block font-normal text-[7px] mt-0.5 leading-tight text-slate-700">Memerlukan bimbingan intensif untuk menunjukkan perilaku sesuai indikator.</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Cinta Tanah Air */}
                          {categories.find(c => c.id === 'CTA')?.indicators.map((ind, i) => {
                            const activeScore = activeStudent.grades[ind.id] || 'B';
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
                            const activeScore = activeStudent.grades[ind.id] || 'B';
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
                            const activeScore = activeStudent.grades[ind.id] || 'B';
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
                            const activeScore = activeStudent.grades[ind.id] || 'B';
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
                      <table className="w-full table-fixed text-left text-[9pt] border border-black border-collapse font-sans leading-snug avoid-break">
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
                              const activeScore = activeStudent.grades[ind.id] || 'B';
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
                            const activeScore = activeStudent.grades[ind.id] || 'B';
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
                            <p className="font-bold text-[9pt] text-black text-left">Catatan Wali Kelas :</p>
                          </div>
                          <div className="p-2.5 min-h-[85px] text-justify text-[9pt] text-slate-800 leading-relaxed font-sans">
                            {activeStudent.catatanWali || 'Teruskan perilaku budi luhur ini dan tingkatkan konsistensi waktu belajarnya.'}
                          </div>
                        </div>

                        {/* Orang Tua Side */}
                        <div className="flex flex-col font-sans">
                          <div className="bg-neutral-100 border-b border-black p-1.5">
                            <p className="font-bold text-[9pt] text-black text-left">Catatan Orang Tua/Wali :</p>
                          </div>
                          <div className="p-2.5 min-h-[85px] text-justify text-[9pt] text-slate-500 italic leading-relaxed font-sans">
                            {activeStudent.catatanOrangTua}
                          </div>
                        </div>
                      </div>

                      {/* Signatures block */}
                      <div className="mt-4 avoid-break font-sans">
                        <p className="text-[10.5pt] font-semibold text-black text-center mb-4 select-none">
                          Mengetahui,
                        </p>
                        {kopSekolah.enableSignatureHeadmaster ? (
                          <div className="grid grid-cols-3 gap-6 text-center items-start relative z-10">
                            {/* Orang Tua */}
                            <div className="flex flex-col items-center justify-between h-32 relative">
                              <p className="text-[10.5pt] text-black font-bold select-none">Orang Tua / Wali</p>
                              <div className="h-16 flex items-center justify-center relative w-full">
                                {kopSekolah.signatureParentUrl ? (
                                  <img
                                    src={kopSekolah.signatureParentUrl}
                                    alt="Tanda Tangan Orang Tua"
                                    className="max-h-16 max-w-[140px] object-contain"
                                    referrerPolicy="no-referrer" crossOrigin="anonymous"
                                  />
                                ) : (
                                  <div className="h-4"></div>
                                )}
                              </div>
                              <div className="flex flex-col items-center w-full">
                                <div className="w-36 border-b-2 border-black pb-0.5"></div>
                                <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none">Tanda Tangan & Nama Terang</p>
                              </div>
                            </div>

                            {/* Kepala Sekolah (Middle, shifted down) */}
                            <div className="flex flex-col items-center justify-between h-32 relative mt-[4cm]">
                              <p className="text-[10.5pt] text-black font-bold">Kepala Sekolah</p>
                              <div className="h-16 flex items-center justify-center relative w-full">
                                {kopSekolah.signatureHeadmasterUrl ? (
                                  <img
                                    src={kopSekolah.signatureHeadmasterUrl}
                                    alt="Tanda Tangan Kepala Sekolah"
                                    className="max-h-16 max-w-[140px] object-contain"
                                    referrerPolicy="no-referrer" crossOrigin="anonymous"
                                  />
                                ) : (
                                  <div className="h-4"></div>
                                )}
                              </div>
                              <div className="flex flex-col items-center min-w-[160px]">
                                <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all underline underline-offset-4 decoration-[1.5px] whitespace-nowrap">
                                  {kopSekolah.namaKepalaSekolah || '____________________'}
                                </p>
                                {kopSekolah.nipKepalaSekolah ? (
                                  <p className="text-[8.5pt] text-slate-700 font-mono mt-1 select-all">
                                    NIP. {kopSekolah.nipKepalaSekolah}
                                  </p>
                                ) : (
                                  <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                                )}
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
                                    className="max-h-16 max-w-[140px] object-contain"
                                    referrerPolicy="no-referrer" crossOrigin="anonymous"
                                  />
                                ) : (
                                  <div className="h-4"></div>
                                )}
                              </div>
                              <div className="flex flex-col items-center w-full font-sans">
                                <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all underline underline-offset-4 decoration-[1.5px] whitespace-nowrap">
                                  {waliKelasName || '____________________'}
                                </p>
                                {waliKelasNip ? (
                                  <p className="text-[8.5pt] text-slate-700 font-mono mt-1 select-all">
                                    NIP. {waliKelasNip}
                                  </p>
                                ) : (
                                  <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-12 text-center text-sans relative z-10">
                            {/* Orang Tua */}
                            <div className="flex flex-col items-center justify-between h-32 relative">
                              <p className="text-[10.5pt] text-black font-bold select-none">Orang Tua / Wali</p>
                              <div className="h-16 flex items-center justify-center relative w-full">
                                {kopSekolah.signatureParentUrl ? (
                                  <img
                                    src={kopSekolah.signatureParentUrl}
                                    alt="Tanda Tangan Orang Tua"
                                    className="max-h-16 max-w-[180px] object-contain"
                                    referrerPolicy="no-referrer" crossOrigin="anonymous"
                                  />
                                ) : (
                                  <div className="h-4"></div>
                                )}
                              </div>
                              <div className="flex flex-col items-center w-full">
                                <div className="w-48 border-b-2 border-black pb-0.5"></div>
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
                                    className="max-h-16 max-w-[140px] object-contain"
                                    referrerPolicy="no-referrer" crossOrigin="anonymous"
                                  />
                                ) : (
                                  <div className="h-4"></div>
                                )}
                              </div>
                              <div className="flex flex-col items-center w-full font-sans">
                                <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all underline underline-offset-4 decoration-[1.5px] whitespace-nowrap">
                                  {waliKelasName || '____________________'}
                                </p>
                                {waliKelasNip ? (
                                  <p className="text-[8.5pt] text-slate-700 font-mono mt-1 select-all">
                                    NIP. {waliKelasNip}
                                  </p>
                                ) : (
                                  <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-neutral-100/50 p-6 xl:p-12 rounded-2xl border border-slate-200/80 shadow-inner flex justify-center no-print selection:bg-transparent">
        <div className="bg-white border border-slate-300 shadow-2xl p-[12mm_15mm] w-[210mm] min-h-[297mm] h-[297mm] max-h-[297mm] overflow-hidden box-border text-[11pt] text-black font-sans leading-relaxed flex flex-col justify-between">
          <div>
            {/* Header block with organization logo & info */}
            <div className="flex items-start gap-4 mb-1">
              <div className="h-24 w-24 flex flex-col justify-center items-center flex-none">
                {kopSekolah.logoUrl ? (
                  <img src={kopSekolah.logoUrl} alt="Logo Sekolah" className="max-h-24 max-w-24 object-contain" referrerPolicy="no-referrer" />
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
                <span className="border-b border-black flex-1 font-bold text-slate-800 pb-0.5 uppercase">{activeStudent.name}</span>
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
            <table className="w-full table-fixed text-left text-[9pt] border border-black border-collapse font-sans leading-snug">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '41%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
              </colgroup>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9' }}>
                  <th rowSpan={2} colSpan={1} className="border border-black p-1.5 font-bold text-center text-[9.5pt] text-black">
                    5 Nilai Kartika
                  </th>
                  <th rowSpan={2} colSpan={1} className="border border-black p-1.5 font-bold text-center text-[9.5pt] text-black">
                    Indikator
                  </th>
                  <th colSpan={4} className="border border-black p-1 text-center font-bold text-[9.5pt] text-black">
                    Hasil Penilaian
                  </th>
                </tr>
                <tr style={{ backgroundColor: '#f8fafc' }} className="text-[8px] font-medium leading-tight text-black">
                  <th className="border border-black p-1 text-center font-bold text-black">
                    Berkembang Sangat Baik
                    <span className="block font-normal text-[7px] mt-0.5 leading-tight text-slate-700">Konsisten menunjukkan perilaku sesuai indikator tanpa perlu diingatkan.</span>
                  </th>
                  <th className="border border-black p-1 text-center font-bold text-black">
                    Berkembang
                    <span className="block font-normal text-[7px] mt-0.5 leading-tight text-slate-700">Menunjukkan perilaku sesuai indikator dengan sedikit arahan.</span>
                  </th>
                  <th className="border border-black p-1 text-center font-bold text-black">
                    Mulai Berkembang
                    <span className="block font-normal text-[7px] mt-0.5 leading-tight text-slate-700">Perlu sering diingatkan untuk menunjukkan perilaku sesuai indikator.</span>
                  </th>
                  <th className="border border-black p-1 text-center font-bold text-black">
                    Belum Berkembang
                    <span className="block font-normal text-[7px] mt-0.5 leading-tight text-slate-700">Memerlukan bimbingan intensif untuk menunjukkan perilaku sesuai indikator.</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Cinta Tanah Air (3 indicators) */}
                {categories.find(c => c.id === 'CTA')?.indicators.map((ind, i) => {
                  const activeScore = activeStudent.grades[ind.id] || 'B';
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
                  const activeScore = activeStudent.grades[ind.id] || 'B';
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
                  const activeScore = activeStudent.grades[ind.id] || 'B';
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
                  const activeScore = activeStudent.grades[ind.id] || 'B';
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
      <div className="bg-neutral-100/50 p-6 xl:p-12 rounded-2xl border border-slate-200/80 shadow-inner flex justify-center no-print">
        <div className="bg-white border border-slate-300 shadow-2xl p-[12mm_15mm] w-[210mm] min-h-[297mm] h-[297mm] max-h-[297mm] overflow-hidden box-border text-[11pt] text-black font-sans leading-relaxed flex flex-col justify-between">
          <div className="flex flex-col gap-4">
            {/* Table continuation on screen Page 2 */}
            <table className="w-full table-fixed text-left text-[9pt] border border-black border-collapse font-sans leading-snug">
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
                    const activeScore = activeStudent.grades[ind.id] || 'B';
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
                  const activeScore = activeStudent.grades[ind.id] || 'B';
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
                  <p className="font-bold text-[9pt] text-black text-left">Catatan Wali Kelas :</p>
                </div>
                <div className="p-2.5 min-h-[85px] text-justify text-[9pt] text-slate-800 leading-relaxed font-sans">
                  {activeStudent.catatanWali || 'Teruskan perilaku budi luhur ini dan tingkatkan konsistensi waktu belajarnya.'}
                </div>
              </div>

              {/* Orang Tua Side */}
              <div className="flex flex-col">
                <div className="bg-white border-b border-black p-1.5">
                  <p className="font-bold text-[9pt] text-black text-left">Catatan Orang Tua/Wali :</p>
                </div>
                <div className="p-2.5 min-h-[85px] text-justify text-[9pt] text-slate-500 italic leading-relaxed font-sans">
                  {activeStudent.catatanOrangTua}
                </div>
              </div>
            </div>

            {/* Signatures block */}
            <div className="mt-4">
              <p className="text-[10.5pt] font-semibold text-black text-center mb-4 select-none">
                Mengetahui,
              </p>
              {kopSekolah.enableSignatureHeadmaster ? (
                <div className="grid grid-cols-3 gap-6 text-center items-start relative z-10">
                  {/* Orang Tua */}
                  <div className="flex flex-col items-center justify-between h-32 relative">
                    <p className="text-[10.5pt] text-black font-bold select-none">Orang Tua / Wali</p>
                    <div className="h-16 flex items-center justify-center relative w-full">
                      {kopSekolah.signatureParentUrl ? (
                        <img
                          src={kopSekolah.signatureParentUrl}
                          alt="Tanda Tangan Orang Tua"
                          className="max-h-16 max-w-[140px] object-contain"
                          referrerPolicy="no-referrer" crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="h-4"></div>
                      )}
                    </div>
                    <div className="flex flex-col items-center w-full">
                      <div className="w-36 border-b-2 border-black pb-0.5"></div>
                      <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none">Tanda Tangan & Nama Terang</p>
                    </div>
                  </div>

                  {/* Kepala Sekolah (Middle, shifted down) */}
                  <div className="flex flex-col items-center justify-between h-32 relative mt-[4cm]">
                    <p className="text-[10.5pt] text-black font-bold">Kepala Sekolah</p>
                    <div className="h-16 flex items-center justify-center relative w-full">
                      {kopSekolah.signatureHeadmasterUrl ? (
                        <img
                          src={kopSekolah.signatureHeadmasterUrl}
                          alt="Tanda Tangan Kepala Sekolah"
                          className="max-h-16 max-w-[140px] object-contain"
                          referrerPolicy="no-referrer" crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="h-4"></div>
                      )}
                    </div>
                    <div className="flex flex-col items-center min-w-[160px]">
                      <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all underline underline-offset-4 decoration-[1.5px] whitespace-nowrap">
                        {kopSekolah.namaKepalaSekolah || '____________________'}
                      </p>
                      {kopSekolah.nipKepalaSekolah ? (
                        <p className="text-[8.5pt] text-slate-700 font-mono mt-1 select-all">
                          NIP. {kopSekolah.nipKepalaSekolah}
                        </p>
                      ) : (
                        <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                      )}
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
                          className="max-h-16 max-w-[140px] object-contain"
                          referrerPolicy="no-referrer" crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="h-4"></div>
                      )}
                    </div>
                    <div className="flex flex-col items-center w-full font-sans">
                      <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all underline underline-offset-4 decoration-[1.5px] whitespace-nowrap">
                        {waliKelasName || '____________________'}
                      </p>
                      {waliKelasNip ? (
                        <p className="text-[8.5pt] text-slate-700 font-mono mt-1 select-all">
                          NIP. {waliKelasNip}
                        </p>
                      ) : (
                        <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-12 text-center text-sans relative z-10">
                  {/* Orang Tua */}
                  <div className="flex flex-col items-center justify-between h-32 relative">
                    <p className="text-[10.5pt] text-black font-bold select-none">Orang Tua / Wali</p>
                    <div className="h-16 flex items-center justify-center relative w-full">
                      {kopSekolah.signatureParentUrl ? (
                        <img
                          src={kopSekolah.signatureParentUrl}
                          alt="Tanda Tangan Orang Tua"
                          className="max-h-16 max-w-[180px] object-contain"
                          referrerPolicy="no-referrer" crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="h-4"></div>
                      )}
                    </div>
                    <div className="flex flex-col items-center w-full">
                      <div className="w-48 border-b-2 border-black pb-0.5"></div>
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
                          className="max-h-16 max-w-[140px] object-contain"
                          referrerPolicy="no-referrer" crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="h-4"></div>
                      )}
                    </div>
                    <div className="flex flex-col items-center w-full font-sans">
                      <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all underline underline-offset-4 decoration-[1.5px] whitespace-nowrap">
                        {waliKelasName || '____________________'}
                      </p>
                      {waliKelasNip ? (
                        <p className="text-[8.5pt] text-slate-700 font-mono mt-1 select-all">
                          NIP. {waliKelasNip}
                        </p>
                      ) : (
                        <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
            {pdfRenderStudents.map((selSt) => (
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
                            <img src={kopSekolah.logoUrl} alt="Logo Sekolah" className="max-h-20 max-w-20 object-contain" referrerPolicy="no-referrer" />
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
                        <span className="border-b border-black flex-1 font-bold text-slate-800 pb-0.5 uppercase">{selSt.name}</span>
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
                    <table className="w-full table-fixed text-left text-[9pt] border border-black border-collapse font-sans leading-snug avoid-break">
                      <colgroup>
                        <col style={{ width: '15%' }} />
                        <col style={{ width: '41%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '11%' }} />
                      </colgroup>
                      <thead>
                        <tr style={{ backgroundColor: '#f1f5f9' }}>
                          <th rowSpan={2} colSpan={1} className="border border-black p-1.5 font-bold text-center text-[9.5pt] text-black">
                            5 Nilai Kartika
                          </th>
                          <th rowSpan={2} colSpan={1} className="border border-black p-1.5 font-bold text-center text-[9.5pt] text-black">
                            Indikator
                          </th>
                          <th colSpan={4} className="border border-black p-1 text-center font-bold text-[9.5pt] text-black">
                            Hasil Penilaian
                          </th>
                        </tr>
                        <tr style={{ backgroundColor: '#f8fafc' }} className="text-[8px] font-medium leading-tight text-black">
                          <th className="border border-black p-1 text-center font-bold text-black">
                            Berkembang Sangat Baik
                            <span className="block font-normal text-[7px] mt-0.5 leading-tight text-slate-700">Konsisten menunjukkan perilaku sesuai indikator tanpa perlu diingatkan.</span>
                          </th>
                          <th className="border border-black p-1 text-center font-bold text-black">
                            Berkembang
                            <span className="block font-normal text-[7px] mt-0.5 leading-tight text-slate-700">Menunjukkan perilaku sesuai indikator dengan sedikit arahan.</span>
                          </th>
                          <th className="border border-black p-1 text-center font-bold text-black">
                            Mulai Berkembang
                            <span className="block font-normal text-[7px] mt-0.5 leading-tight text-slate-700">Perlu sering diingatkan untuk menunjukkan perilaku sesuai indikator.</span>
                          </th>
                          <th className="border border-black p-1 text-center font-bold text-black">
                            Belum Berkembang
                            <span className="block font-normal text-[7px] mt-0.5 leading-tight text-slate-700">Memerlukan bimbingan intensif untuk menunjukkan perilaku sesuai indikator.</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Cinta Tanah Air (3 indicators) */}
                        {categories.find(c => c.id === 'CTA')?.indicators.map((ind, i) => {
                          const activeScore = selSt.grades[ind.id] || 'B';
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
                          const activeScore = selSt.grades[ind.id] || 'B';
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
                          const activeScore = selSt.grades[ind.id] || 'B';
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
                          const activeScore = selSt.grades[ind.id] || 'B';
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
                    <table className="w-full table-fixed text-left text-[9pt] border border-black border-collapse font-sans leading-snug avoid-break">
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
                            const activeScore = selSt.grades[ind.id] || 'B';
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
                          const activeScore = selSt.grades[ind.id] || 'B';
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
                          <p className="font-bold text-[9pt] text-black text-left">Catatan Wali Kelas :</p>
                        </div>
                        <div className="p-2.5 min-h-[85px] text-justify text-[9pt] text-slate-800 leading-relaxed font-sans">
                          {selSt.catatanWali || 'Teruskan perilaku budi luhur ini dan tingkatkan konsistensi waktu belajarnya.'}
                        </div>
                      </div>

                      {/* Orang Tua Side */}
                      <div className="flex flex-col">
                        <div className="bg-white border-b border-black p-1.5">
                          <p className="font-bold text-[9pt] text-black text-left">Catatan Orang Tua/Wali :</p>
                        </div>
                        <div className="p-2.5 min-h-[85px] text-justify text-[9pt] text-slate-500 italic leading-relaxed font-sans">
                          {selSt.catatanOrangTua}
                        </div>
                      </div>
                    </div>

                    {/* Signatures block */}
                    <div className="mt-4 avoid-break font-sans">
                      <p className="text-[10.5pt] font-semibold text-black text-center mb-4 select-none">
                        Mengetahui,
                      </p>
                      {kopSekolah.enableSignatureHeadmaster ? (
                        <div className="grid grid-cols-3 gap-6 text-center items-start relative z-10">
                          {/* Orang Tua */}
                          <div className="flex flex-col items-center justify-between h-32 relative">
                            <p className="text-[10.5pt] text-black font-bold select-none">Orang Tua / Wali</p>
                            <div className="h-16 flex items-center justify-center relative w-full">
                              {kopSekolah.signatureParentUrl ? (
                                <img
                                  src={kopSekolah.signatureParentUrl}
                                  alt="Tanda Tangan Orang Tua"
                                  className="max-h-16 max-w-[140px] object-contain"
                                  referrerPolicy="no-referrer" crossOrigin="anonymous"
                                />
                              ) : (
                                <div className="h-4"></div>
                              )}
                            </div>
                            <div className="flex flex-col items-center w-full">
                              <div className="w-36 border-b-2 border-black pb-0.5"></div>
                              <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none">Tanda Tangan & Nama Terang</p>
                            </div>
                          </div>

                          {/* Kepala Sekolah (Middle, shifted down) */}
                          <div className="flex flex-col items-center justify-between h-32 relative mt-[4cm]">
                            <p className="text-[10.5pt] text-black font-bold">Kepala Sekolah</p>
                            <div className="h-16 flex items-center justify-center relative w-full">
                              {kopSekolah.signatureHeadmasterUrl ? (
                                <img
                                  src={kopSekolah.signatureHeadmasterUrl}
                                  alt="Tanda Tangan Kepala Sekolah"
                                  className="max-h-16 max-w-[140px] object-contain"
                                  referrerPolicy="no-referrer" crossOrigin="anonymous"
                                />
                              ) : (
                                <div className="h-4"></div>
                              )}
                            </div>
                            <div className="flex flex-col items-center min-w-[160px]">
                              <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all underline underline-offset-4 decoration-[1.5px] whitespace-nowrap">
                                {kopSekolah.namaKepalaSekolah || '____________________'}
                              </p>
                              {kopSekolah.nipKepalaSekolah ? (
                                <p className="text-[8.5pt] text-slate-700 font-mono mt-1 select-all">
                                  NIP. {kopSekolah.nipKepalaSekolah}
                                </p>
                              ) : (
                                <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                              )}
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
                                  className="max-h-16 max-w-[140px] object-contain"
                                  referrerPolicy="no-referrer" crossOrigin="anonymous"
                                />
                              ) : (
                                <div className="h-4"></div>
                              )}
                            </div>
                            <div className="flex flex-col items-center w-full font-sans">
                              <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all underline underline-offset-4 decoration-[1.5px] whitespace-nowrap">
                                {waliKelasName || '____________________'}
                              </p>
                              {waliKelasNip ? (
                                <p className="text-[8.5pt] text-slate-700 font-mono mt-1 select-all">
                                  NIP. {waliKelasNip}
                                </p>
                              ) : (
                                <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-12 text-center text-sans relative z-10">
                          {/* Orang Tua */}
                          <div className="flex flex-col items-center justify-between h-32 relative">
                            <p className="text-[10.5pt] text-black font-bold select-none">Orang Tua / Wali</p>
                            <div className="h-16 flex items-center justify-center relative w-full">
                              {kopSekolah.signatureParentUrl ? (
                                <img
                                  src={kopSekolah.signatureParentUrl}
                                  alt="Tanda Tangan Orang Tua"
                                  className="max-h-16 max-w-[180px] object-contain"
                                  referrerPolicy="no-referrer" crossOrigin="anonymous"
                                />
                              ) : (
                                <div className="h-4"></div>
                              )}
                            </div>
                            <div className="flex flex-col items-center w-full">
                              <div className="w-48 border-b-2 border-black pb-0.5"></div>
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
                                  className="max-h-16 max-w-[140px] object-contain"
                                  referrerPolicy="no-referrer" crossOrigin="anonymous"
                                />
                              ) : (
                                <div className="h-4"></div>
                              )}
                            </div>
                            <div className="flex flex-col items-center w-full font-sans">
                              <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all underline underline-offset-4 decoration-[1.5px] whitespace-nowrap">
                                {waliKelasName || '____________________'}
                              </p>
                              {waliKelasNip ? (
                                <p className="text-[8.5pt] text-slate-700 font-mono mt-1 select-all">
                                  NIP. {waliKelasNip}
                                </p>
                              ) : (
                                <p className="text-[8pt] text-slate-500 font-sans mt-0.5 italic select-none">Tanda Tangan & Nama Terang</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
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

