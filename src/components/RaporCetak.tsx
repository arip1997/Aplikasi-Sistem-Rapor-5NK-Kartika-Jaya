import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { flushSync, createPortal } from 'react-dom';
import JSZip from 'jszip';
import { QRCodeSVG } from 'qrcode.react';
import { Student, Category, KopSekolah, scoreOptions } from '../types';
import { Printer, Download, Eye, FileSpreadsheet, ArrowLeft, Heart, Award, Sparkles, FileText, Loader2, Archive, Search, Wrench, Sliders, Check, Layers, Cloud } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { uploadFileToDrive } from '../lib/drive.ts';
import { googleSignIn, getAccessToken, initAuth } from '../firebase.ts';
import ClassSelectorDropdown from './ClassSelectorDropdown';

const EMPTY_SIGNATURE = "\u00A0".repeat(28);
const EMPTY_SIGNATURE_PARENT = "\u00A0".repeat(45);

interface RaporCetakProps {
  student: Student;
  allClassStudents?: Student[];
  categories: Category[];
  kopSekolah: KopSekolah;
  waliKelasName: string;
  waliKelasNip?: string;
  waliKelasSignatureUrl?: string;
  onBack: () => void;
  onDownloadExcel: () => void;
  initialBatchNisList?: string[];
  onAddExportLog?: (type: string, action: string, file: string, count: number) => void;
  teachers?: any[];
  onMarkAsPrinted?: (studentIds: any[]) => void;
  onResetPrintStatus?: () => void;
  autoTriggerBatchPdf?: boolean;
  autoPrintImmediately?: boolean;
  onResetAutoTrigger?: () => void;
  classes?: string[];
  selectedClass?: string;
  onClassChange?: (cls: string) => void;
  showFooterDate?: boolean;
  onUpdateShowFooterDate?: (value: boolean) => void;
  onForceSync?: () => Promise<void>;
}

export default function RaporCetak({
  student,
  allClassStudents = [],
  categories,
  kopSekolah,
  waliKelasName,
  waliKelasNip,
  waliKelasSignatureUrl,
  onBack,
  onDownloadExcel,
  initialBatchNisList = [],
  onAddExportLog,
  teachers = [],
  onMarkAsPrinted,
  onResetPrintStatus,
  autoTriggerBatchPdf = false,
  autoPrintImmediately = false,
  onResetAutoTrigger,
  classes = [],
  selectedClass = '',
  onClassChange,
  showFooterDate = true,
  onUpdateShowFooterDate,
  onForceSync,
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
  
  // Custom margin settings for PDF / Print
  const [showMarginSettings, setShowMarginSettings] = useState(false);
  const [marginTop, setMarginTop] = useState(12);
  const [marginBottom, setMarginBottom] = useState(12);
  const [marginLeft, setMarginLeft] = useState(15);
  const [marginRight, setMarginRight] = useState(15);
  const [showAutoTimeFooter, setShowAutoTimeFooter] = useState(showFooterDate);

  useEffect(() => {
    setShowAutoTimeFooter(showFooterDate);
  }, [showFooterDate]);

  const pageMargin = {
    top: marginTop,
    bottom: marginBottom,
    left: marginLeft,
    right: marginRight
  };

  // All class students from props or default to current student
  const classStudents = allClassStudents && allClassStudents.length > 0 ? allClassStudents : [student];
  // Selected students representation inside the sidebar checkbox list
  const [selectedNisList, setSelectedNisList] = useState<string[]>([student.nis]);
  // Currently displayed student in on-screen Mock Preview
  const [previewNis, setPreviewNis] = useState<string>(student.nis);

  const totalIndicators = categories.reduce((sum, cat) => sum + cat.indicators.length, 0);
  
  const getInitialLandscape = () => {
    if (kopSekolah.forcedOrientation === 'portrait') return false;
    if (kopSekolah.forcedOrientation === 'landscape') return true;
    return totalIndicators > 6;
  };

  const [isLandscape, setIsLandscape] = useState(getInitialLandscape());

  useEffect(() => {
    if (kopSekolah.forcedOrientation === 'portrait') {
      setIsLandscape(false);
    } else if (kopSekolah.forcedOrientation === 'landscape') {
      setIsLandscape(true);
    } else {
      setIsLandscape(totalIndicators > 6);
    }
  }, [totalIndicators, kopSekolah.forcedOrientation]);

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
      const timer = setTimeout(async () => {
        try {
          if (autoPrintImmediately) {
            await handlePrint();
          } else {
            await handleBatchPrint();
          }
        } catch (err) {
          console.error("Auto batch action failed:", err);
        } finally {
          onResetAutoTrigger?.();
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [autoTriggerBatchPdf, autoPrintImmediately]);

  const isStudentValid = (s: any): s is Student => {
    if (!s || typeof s !== 'object') return false;
    if (s.name === undefined || s.name === null || String(s.name).trim() === "") return false;
    if (s.nis === undefined || s.nis === null || String(s.nis).trim() === "") return false;
    if (s.grades === undefined || s.grades === null || typeof s.grades !== 'object') return false;
    return true;
  };

  // Computed state
  let activeStudent = classStudents.find(s => s.nis === previewNis) || student;
  if (!isStudentValid(activeStudent)) {
    const firstValid = classStudents.find(isStudentValid);
    if (firstValid) {
      activeStudent = firstValid;
    }
  }
  const selectedStudents = classStudents.filter(s => selectedNisList.includes(s.nis) && isStudentValid(s));

  // If a ZIP download or Google Drive save is in progress, we render just the 1 active batchStudent under loop.
  // Otherwise, we render all of the checked/selected students so they compile/print as a combined set.
  const pdfRenderStudents = (isGeneratingAll || isUploadingToDrive)
    ? (batchStudent && isStudentValid(batchStudent) ? [batchStudent] : [])
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
      
      if (isLandscape) {
        document.body.classList.add('print-landscape');
      } else {
        document.body.classList.remove('print-landscape');
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
      document.body.classList.remove('print-landscape');
      setTimeout(() => {
        document.title = originalTitle;
      }, 500);
    }
  };

  const getHtml2PdfOpt = (targetStudent: Student, originalElement: HTMLElement) => {
    const colorCache = new Map<string, string>();

    const toSafeRgb = (val: string, fallback: string = 'transparent') => {
      if (!val || typeof val !== 'string') return val;
      if (colorCache.has(val)) return colorCache.get(val)!;
      
      const trimmed = val.trim();
      if (trimmed.includes('oklch')) {
        const parsed = parseOklchColor(trimmed);
        if (parsed) {
          colorCache.set(val, parsed);
          return parsed;
        }
      }
      if (trimmed.includes('oklab')) {
        const parsed = parseOklabColor(trimmed);
        if (parsed) {
          colorCache.set(val, parsed);
          return parsed;
        } else {
          return 'rgb(0, 0, 0)';
        }
      }
      if (trimmed.includes('color-mix')) {
        const nestedOklch = trimmed.match(/oklch\(([^)]+)\)/i);
        if (nestedOklch) {
          const parsed = parseOklchColor(nestedOklch[0]);
          if (parsed) {
            if (trimmed.includes('transparent') || trimmed.includes('rgba(0,0,0,0)')) {
              const matchRgb = parsed.match(/\d+,\s*\d+,\s*\d+/);
              if (matchRgb) {
                const alphaVal = trimmed.includes('0.') ? trimmed.match(/0\.\d+/)?.[0] || '0.15' : '0.15';
                const adjusted = `rgba(${matchRgb[0]}, ${alphaVal})`;
                colorCache.set(val, adjusted);
                return adjusted;
              }
            }
            colorCache.set(val, parsed);
            return parsed;
          }
        }
        const nestedOklab = trimmed.match(/oklab\(([^)]+)\)/i);
        if (nestedOklab) {
          const parsed = parseOklabColor(nestedOklab[0]);
          if (parsed) {
            colorCache.set(val, parsed);
            return parsed;
          } else {
            return 'rgb(0, 0, 0)';
          }
        }
      }
      
      if (!trimmed.includes('oklch') && !trimmed.includes('oklab') && !trimmed.includes('color-mix')) {
        return trimmed;
      }
      
      if (trimmed.includes('0.4') || trimmed.includes('0.96')) return 'rgb(241, 245, 249)';
      if (trimmed.includes('0.5') || trimmed.includes('0.98')) return 'rgb(248, 250, 252)';
      return fallback;
    };

    return {
      margin:       0,
      filename:     `Rapor_5NK_${targetStudent.name.replace(/\s+/g, '_')}_${targetStudent.nis}.pdf`,
      image:        { type: 'jpeg', quality: 0.95 },
      pagebreak:    { mode: ['css', 'legacy'], avoid: ['.avoid-break'] },
      html2canvas:  { 
        scale: 2.2, 
        useCORS: true, 
        imageTimeout: 10000,
        letterRendering: true, 
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1200,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc: Document) => {
          injectPrintStyles(clonedDoc, isLandscape, pageMargin);
          if (clonedDoc.defaultView) {
            const origClonedGcs = clonedDoc.defaultView.getComputedStyle;
            
            // Inject dynamic page numbers
            const allPrintPages = clonedDoc.querySelectorAll('.print-page');
            allPrintPages.forEach((page, idx) => {
              const pageNumSpan = page.querySelector('.page-number-display');
              if (pageNumSpan) {
                pageNumSpan.textContent = `Halaman ${idx + 1} dari ${allPrintPages.length}`;
              }
            });

            clonedDoc.defaultView.getComputedStyle = function(el, pseudo) {
              let style;
              try {
                style = origClonedGcs.call(clonedDoc.defaultView, el, pseudo);
              } catch (e) {
                try {
                  style = window.getComputedStyle(el, pseudo);
                } catch (e2) {
                  return {} as CSSStyleDeclaration;
                }
              }
              return new Proxy(style, {
                get(target, prop) {
                  let val;
                  try {
                    val = Reflect.get(target, prop);
                  } catch (e) {
                    return undefined;
                  }
                  if (prop === 'getPropertyValue') {
                    return function(key: string) {
                      try {
                        const v = target.getPropertyValue(key);
                        if (v && typeof v === 'string' && (v.includes('oklch') || v.includes('oklab') || v.includes('color-mix'))) {
                          return toSafeRgb(v);
                        }
                        return v;
                      } catch (e) {
                        return '';
                      }
                    };
                  }
                  if (typeof val === 'function') {
                    return val.bind(target);
                  }
                  if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('color-mix'))) {
                    return toSafeRgb(val);
                  }
                  return val;
                }
              });
            };
          }
          const clonedPrintSection = clonedDoc.getElementById('rapor-print-section');
          if (clonedPrintSection) {
            clonedPrintSection.style.setProperty('position', 'static', 'important');
            clonedPrintSection.style.setProperty('left', '0', 'important');
            clonedPrintSection.style.setProperty('top', '0', 'important');
            clonedPrintSection.style.setProperty('width', isLandscape ? '297mm' : '210mm', 'important');
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

            // Build map of original elements by data-layout-id
            const origMap = new Map<string, HTMLElement>();
            if (originalElement) {
              const rootId = originalElement.getAttribute('data-layout-id');
              if (rootId) origMap.set(rootId, originalElement);
              originalElement.querySelectorAll('[data-layout-id]').forEach(el => {
                const id = el.getAttribute('data-layout-id');
                if (id) origMap.set(id, el as HTMLElement);
              });
            }

            // Sync color styles for the target and all its descendants that have data-layout-id
            const syncElementColors = (cloneEl: HTMLElement) => {
              const id = cloneEl.getAttribute('data-layout-id');
              if (id) {
                const origEl = origMap.get(id);
                if (origEl) {
                  try {
                    const computed = window.getComputedStyle(origEl);
                    cloneEl.style.color = toSafeRgb(computed.color, 'rgb(0, 0, 0)');
                    cloneEl.style.backgroundColor = toSafeRgb(computed.backgroundColor, 'transparent');
                    
                    ['Top', 'Right', 'Bottom', 'Left'].forEach(pos => {
                      const bc = computed.getPropertyValue(`border-${pos.toLowerCase()}-color`);
                      if (bc) {
                        cloneEl.style.setProperty(`border-${pos.toLowerCase()}-color`, toSafeRgb(bc, 'rgb(0, 0, 0)'));
                      }
                    });

                    // Copy SVG fill and stroke
                    const fill = computed.getPropertyValue('fill');
                    if (fill && fill !== 'none') {
                      cloneEl.style.setProperty('fill', toSafeRgb(fill, 'currentColor'));
                    }
                    const stroke = computed.getPropertyValue('stroke');
                    if (stroke && stroke !== 'none') {
                      cloneEl.style.setProperty('stroke', toSafeRgb(stroke, 'currentColor'));
                    }
                  } catch (e) {}
                }
              }
            };

            // Process clonedTarget and all its matching descendants
            syncElementColors(clonedTarget);
            clonedTarget.querySelectorAll('[data-layout-id]').forEach(el => {
              syncElementColors(el as HTMLElement);
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
                styleTag.innerHTML = convertOklabCss(convertOklchCss(styleTag.innerHTML));
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
      jsPDF:        { unit: 'mm', format: 'a4', orientation: isLandscape ? 'landscape' : 'portrait' }
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

  const generatePdfWithTimeout = (html2pdfFn: any, element: HTMLElement, opt: any, timeoutMs = 60000): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout: Pembuatan PDF melebihi ${timeoutMs / 1000} detik. Gambar atau font eksternal mungkin lambat dimuat.`));
      }, timeoutMs);

      html2pdfFn().set(opt).from(element).output('blob')
        .then((blob: Blob) => {
          clearTimeout(timer);
          resolve(blob);
        })
        .catch((err: any) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };

  const savePdfWithTimeout = (html2pdfFn: any, element: HTMLElement, opt: any, timeoutMs = 60000): Promise<void> => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout: Unduh PDF melebihi ${timeoutMs / 1000} detik.`));
      }, timeoutMs);

      html2pdfFn().set(opt).from(element).save()
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch((err: any) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };

  const handleDownloadPDF = async () => {
    if (onForceSync) {
      try {
        await onForceSync();
      } catch (syncErr) {
        console.warn("[Sync Warning before PDF] Force sync failed, proceeding with local data:", syncErr);
      }
    }
    applyGlobalStyleOverrides(isLandscape);
    const html2pdfFn = typeof html2pdf === 'function' ? html2pdf : (html2pdf as any).default;
    if (!html2pdfFn) {
      console.error("[Cetak PDF Error] html2pdf library function is not loaded in window scope.");
      return;
    }

    setIsGeneratingPdf(true);

    try {
      setRenderTrigger(prev => prev + 1);
      // Wait for React to process state and paint
      await new Promise(resolve => setTimeout(resolve, 350));

      const originalElement = document.getElementById('rapor-pdf-content');
      if (!originalElement) {
        console.error("[Cetak PDF Error] #rapor-pdf-content target selector element is missing from document DOM.");
        return;
      }

      // Tag original elements with data-layout-id for reliable onclone mapping
      let idCounter = 1;
      originalElement.setAttribute('data-layout-id', String(idCounter++));
      const origDescendants = originalElement.querySelectorAll('*');
      origDescendants.forEach(el => {
        el.setAttribute('data-layout-id', String(idCounter++));
      });

      try {
        // Force immediate layout reflow
        void originalElement.offsetHeight;
        await new Promise(resolve => setTimeout(resolve, 150));

        // Run live dry-run DOM verification check with deep audits
        const dryRunPassed = runDryRunAuditAndVerifyDom(selectedStudents.length);
        if (!dryRunPassed) {
          console.warn("[Dry-Run Warning] Detasemen validasi DOM menemukan ketidakcocokan visual; melanjutkan regenerasi paksa.");
        }

        let defaultFilename = `Rapor_5NK_Batch_${selectedClass}.pdf`;
        if (selectedStudents.length === 1) {
          const s = selectedStudents[0];
          defaultFilename = `Rapor_5NK_${s.name.replace(/\s+/g, '_')}_${s.nis}.pdf`;
        }

        const inputFilename = window.prompt("Masukkan nama file untuk unduhan PDF:", defaultFilename.replace('.pdf', ''));
        if (inputFilename === null) {
          return;
        }

        const filename = inputFilename.trim() 
          ? (inputFilename.toLowerCase().endsWith('.pdf') ? inputFilename.trim() : `${inputFilename.trim()}.pdf`)
          : defaultFilename;

        console.log(`[PDF Generator] Starting iframe-based html2pdf with filename: "${filename}"`);
        await generatePdfIframe(isLandscape, originalElement, filename, true, { top: 10, bottom: 10, left: 10, right: 10 });
        console.log("[PDF Generator] File generated via iframe and download triggered successfully.");

        if (onMarkAsPrinted && selectedStudents.length > 0) {
          onMarkAsPrinted(selectedStudents.map(s => s.id));
        }
        if (onAddExportLog && selectedStudents.length > 0) {
          onAddExportLog(
            'PDF',
            `Export ke PDF untuk ${selectedStudents.length} siswa`,
            filename,
            selectedStudents.length
          );
        }
      } finally {
        // Clean up data-layout-id
        originalElement.removeAttribute('data-layout-id');
        origDescendants.forEach(el => {
          el.removeAttribute('data-layout-id');
        });
      }
    } catch (err) {
      console.error("Kesalahan Unduh PDF:", err);
      alert(`Terjadi kesalahan saat mengunduh PDF: ${err instanceof Error ? err.message : 'Silakan coba lagi.'}`);
    } finally {
      restoreGlobalStyleOverrides();
      setIsGeneratingPdf(false);
    }
  };

  const handleSaveToDrive = async () => {
    if (onForceSync) {
      try {
        await onForceSync();
      } catch (syncErr) {
        console.warn("[Sync Warning before Drive] Force sync failed, proceeding with local data:", syncErr);
      }
    }
    applyGlobalStyleOverrides(isLandscape);
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

    const validStudents = selectedStudents.filter(isStudentValid);
    if (validStudents.length === 0) {
      alert("Peringatan: Tidak ada data siswa dengan struktur yang valid untuk diunggah ke Google Drive.");
      return;
    }

    if (!window.confirm(`Simpan dokumen Rapor untuk ${validStudents.length} siswa ke Google Drive Anda? Tindakan ini akan mengunggah file. Ini mungkin membutuhkan beberapa menit.`)) {
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
      console.log(`[Drive Engine] Starting generation of ${validStudents.length} student documents.`);

      for (const curStudent of validStudents) {
        try {
          // Clear previous state first to force clear DOM
          setBatchStudent(null);
          await new Promise(resolve => setTimeout(resolve, 100));

          setBatchStudent(curStudent);
          setRenderTrigger(prev => prev + 1);

          // Now wait for the DOM to reflect the correct student
          let isRendered = false;
          for (let checkAttempts = 0; checkAttempts < 30; checkAttempts++) {
            const originalElement = document.getElementById('rapor-pdf-content');
            if (originalElement) {
              const html = originalElement.innerHTML || "";
              if (html.includes(curStudent.nis)) {
                isRendered = true;
                break;
              }
            }
            await new Promise(resolve => setTimeout(resolve, 150));
          }

          if (!isRendered) {
            console.warn(`[Drive Engine] Timeout waiting for student ${curStudent.name} DOM render.`);
          }

          const originalElement = document.getElementById('rapor-pdf-content');
          if (!originalElement) {
            console.error(`[Drive Engine Error] #rapor-pdf-content element is missing for ${curStudent.name}.`);
            continue;
          }

          // Tag original elements with data-layout-id for reliable onclone mapping
          let idCounter = 1;
          originalElement.setAttribute('data-layout-id', String(idCounter++));
          const origDescendants = originalElement.querySelectorAll('*');
          origDescendants.forEach(el => {
            el.setAttribute('data-layout-id', String(idCounter++));
          });

          try {
            void originalElement.offsetHeight;
            await new Promise(resolve => setTimeout(resolve, 150));

            runDryRunAuditAndVerifyDom(1);

            const cleanStudentName = curStudent.name.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
            const filename = `Rapor_5NK_${cleanStudentName}_${curStudent.nis}.pdf`;

            console.log(` - Generating iframe-based pdf blob for ${curStudent.name}...`);
            const pdfBlob = await generatePdfIframe(isLandscape, originalElement, filename, false, { top: 10, bottom: 10, left: 10, right: 10 }) as Blob;
            
            if (pdfBlob && pdfBlob.size > 0) {
              await uploadFileToDrive(token, pdfBlob, filename);
              uploadedCount++;
            } else {
              console.error(`[Drive Engine Error] Generated blob for "${curStudent.name}" is empty or failed!`);
            }
          } finally {
            // Clean up data-layout-id
            originalElement.removeAttribute('data-layout-id');
            origDescendants.forEach(el => {
              el.removeAttribute('data-layout-id');
            });
          }
        } catch (studentErr) {
          console.error(`[Drive Engine Failure Skipped] Gagal memproses siswa "${curStudent.name}":`, studentErr);
        }
      }

      setBatchStudent(null);
      alert(`Berhasil menyimpan ${uploadedCount} dokumen ke Google Drive Anda.`);
    } catch (err) {
      console.error("Kesalahan Simpan ke Drive:", err);
      alert("Gagal menyimpan dokumen ke Google Drive. Mohon periksa kembali koneksi internet dan perizinan akun Anda.");
    } finally {
      setBatchStudent(null);
      restoreGlobalStyleOverrides();
      setIsUploadingToDrive(false);
    }
  };

  const handleBatchPrint = async () => {
    if (onForceSync) {
      try {
        await onForceSync();
      } catch (syncErr) {
        console.warn("[Sync Warning before Batch Print] Force sync failed, proceeding with local data:", syncErr);
      }
    }

    if (!selectedStudents || selectedStudents.length === 0) {
      alert("Peringatan: Tidak ada siswa yang dipilih untuk diunduh. Pastikan panjang array siswa tidak kosong sebelum memulai proses kompresi ZIP.");
      return;
    }

    // Validasi struktur data objek students untuk mencegah render error
    const validStudents = selectedStudents.filter(student => {
      const isValid = student && typeof student === 'object' && student.nis && student.name && student.grades;
      if (!isValid) {
        console.warn(`[Batch Validation Warning] Skipping invalid student object:`, student);
      }
      return isValid;
    });

    if (validStudents.length === 0) {
      alert("Peringatan: Tidak ada data siswa dengan struktur yang valid untuk diekspor ke PDF.");
      return;
    }

    applyGlobalStyleOverrides(isLandscape);
    
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

      console.log(`[Batch PDF Engine] Starting generation of ${validStudents.length} student documents.`);

      for (const curStudent of validStudents) {
        try {
          console.log(`[Batch PDF Engine] Processing student: "${curStudent.name}" (${curStudent.nis})`);
          
          // Clear previous state first to force clear DOM
          setBatchStudent(null);
          await new Promise(resolve => setTimeout(resolve, 100));

          setBatchStudent(curStudent);
          setRenderTrigger(prev => prev + 1);

          // Now wait for the DOM to reflect the correct student
          let isRendered = false;
          for (let checkAttempts = 0; checkAttempts < 30; checkAttempts++) {
            const originalElement = document.getElementById('rapor-pdf-content');
            if (originalElement) {
              const html = originalElement.innerHTML || "";
              if (html.includes(curStudent.nis)) {
                isRendered = true;
                break;
              }
            }
            await new Promise(resolve => setTimeout(resolve, 150));
          }

          if (!isRendered) {
            console.warn(`[Batch PDF Engine] Timeout waiting for student ${curStudent.name} DOM render.`);
          }

          const originalElement = document.getElementById('rapor-pdf-content');
          if (!originalElement) {
            console.error(`[Batch PDF Error] #rapor-pdf-content element is missing for ${curStudent.name}.`);
            continue;
          }

          // Tag original elements with data-layout-id for reliable onclone mapping
          let idCounter = 1;
          originalElement.setAttribute('data-layout-id', String(idCounter++));
          const origDescendants = originalElement.querySelectorAll('*');
          origDescendants.forEach(el => {
            el.setAttribute('data-layout-id', String(idCounter++));
          });

          try {
            // Force synchronous layout reflow
            void originalElement.offsetHeight;
            
            // Allow the browser to calculate complete styles
            await new Promise(resolve => setTimeout(resolve, 150));

            // Run live dry-run DOM verification check for 1 expected student group in batch focus mode
            const dryRunPassed = runDryRunAuditAndVerifyDom(1);
            if (!dryRunPassed) {
              console.warn(`[Batch Dry-Run Warning] Student "${curStudent.name}" failed complete pristine DOM audit verification.`);
            }

            const cleanStudentName = curStudent.name.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_');
            const safeFilename = `Rapor_${cleanStudentName}_${curStudent.nis}.pdf`;
            
            // Generate Blob directly from the iframe element
            console.log(` - Generating iframe-based pdf blob for ${curStudent.name}...`);
            const pdfBlob = await generatePdfIframe(isLandscape, originalElement, safeFilename, false, { top: 10, bottom: 10, left: 10, right: 10 }) as Blob;
            
            if (pdfBlob && pdfBlob.size > 0) {
              console.log(` ✅ Blob generated successfully: ${pdfBlob.size} bytes. MIME: ${pdfBlob.type}`);
              folder.file(safeFilename, pdfBlob);
            } else {
              console.error(` ❌ ERROR: Generated blob for "${curStudent.name}" is empty or failed!`);
            }
          } finally {
            // Clean up data-layout-id
            originalElement.removeAttribute('data-layout-id');
            origDescendants.forEach(el => {
              el.removeAttribute('data-layout-id');
            });
          }
        } catch (studentErr) {
          console.error(`[Batch Failure Skipped] Gagal memproses siswa "${curStudent.name}":`, studentErr);
        }
      }

      // Restore UI back to normal Selected Student
      setBatchStudent(null);

      console.log("[Batch PDF Engine] Compiling ZIP archive...");
      const fileKeys = Object.keys(folder.files).filter(k => !k.endsWith('/'));
      const fileCount = fileKeys.length;
      if (fileCount === 0) {
        throw new Error("Tidak ada berkas PDF yang berhasil dibuat. Tidak dapat mengompres ZIP yang kosong.");
      }
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

      // Mark all successfully zipped students as printed
      if (onMarkAsPrinted && validStudents.length > 0) {
        onMarkAsPrinted(validStudents.map(s => s.id));
      }
      if (onAddExportLog && validStudents.length > 0) {
        onAddExportLog(
          'PDF',
          `Unduh ZIP Rapor kelas ${selectedClass} berisi ${validStudents.length} siswa`,
          `${folderName}.zip`,
          validStudents.length
        );
      }

    } catch (err) {
      console.error("Kesalahan Unduh Semua PDF:", err);
      alert(`Terjadi kesalahan saat menyusun ZIP: ${err instanceof Error ? err.message : 'Silakan coba lagi.'}`);
    } finally {
      setBatchStudent(null);
      restoreGlobalStyleOverrides();
      setIsGeneratingAll(false);
    }
  };

  const exportToZipAndPdf = handleBatchPrint;

  // Kartika Jaya School Seal Image Representation
  const KartikaLogo = () => (
    <img 
      src="https://lh3.googleusercontent.com/d/1S7UuyDpIDDTxOCqb1aOa1JNtmMQggUEC" 
      className="h-20 w-20 flex-none object-contain mx-auto" 
      referrerPolicy="no-referrer" 
      crossOrigin="anonymous" 
      alt="Logo Sekolah" 
    />
  );

  const renderKopLogo = (sizeClass = "h-20 w-20") => {
    const logoSrc = kopSekolah.logoUrl || "https://lh3.googleusercontent.com/d/1S7UuyDpIDDTxOCqb1aOa1JNtmMQggUEC";
    return (
      <img 
        src={logoSrc} 
        alt="Logo Sekolah" 
        className={`${sizeClass} object-contain`} 
        referrerPolicy="no-referrer" 
        crossOrigin="anonymous" 
      />
    );
  };

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
          {/* Opsi Orientasi Kertas (Portrait / Landscape) */}
          <div className="flex bg-slate-100 border border-slate-200 p-0.5 rounded-lg items-center">
            <button
              onClick={() => setIsLandscape(false)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                !isLandscape 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800'
              }`}
              title="Gunakan Tata Letak Tegak (Portrait)"
            >
              <span>📄</span>
              <span>Portrait</span>
            </button>
            <button
              onClick={() => setIsLandscape(true)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                isLandscape 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-800'
              }`}
              title="Gunakan Tata Letak Mendatar (Landscape)"
            >
              <span className="rotate-90 inline-block">📄</span>
              <span>Landscape</span>
            </button>
          </div>

          <button
            onClick={() => setShowMarginSettings(true)}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
            title="Konfigurasi Margin Kertas"
          >
            <Sliders className="h-4 w-4" /> Margin
          </button>
          
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
            onClick={handleBatchPrint}
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
                <Download className="h-4 w-4" />
                <span>Export ke PDF</span>
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
        {/* Margin Settings Modal */}
        <AnimatePresence>
          {showMarginSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800 text-sm">Konfigurasi Margin Cetak (mm)</h3>
                  <button onClick={() => setShowMarginSettings(false)} className="text-slate-400 hover:text-slate-600">
                    ✕
                  </button>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Atas (Top)</label>
                    <input type="number" value={marginTop} onChange={e => setMarginTop(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bawah (Bottom)</label>
                    <input type="number" value={marginBottom} onChange={e => setMarginBottom(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Kiri (Left)</label>
                    <input type="number" value={marginLeft} onChange={e => setMarginLeft(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Kanan (Right)</label>
                    <input type="number" value={marginRight} onChange={e => setMarginRight(Number(e.target.value))} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div className="col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Tampilkan Waktu Otomatis di Footer</span>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={showAutoTimeFooter} 
                        onChange={e => {
                          setShowAutoTimeFooter(e.target.checked);
                          onUpdateShowFooterDate?.(e.target.checked);
                        }} 
                        className="sr-only peer" 
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                  <button onClick={() => { setMarginTop(12); setMarginBottom(12); setMarginLeft(15); setMarginRight(15); }} className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">
                    Reset Default
                  </button>
                  <button onClick={() => setShowMarginSettings(false)} className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
                    Terapkan
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-800 text-xs tracking-tight flex items-center gap-2">
                      <Award className="h-4 w-4 text-indigo-600 flex-none" />
                      Daftar Siswa
                    </h3>
                    <div className="flex items-center gap-1">
                      {classes.length > 0 && onClassChange && (
                        <ClassSelectorDropdown
                          classes={classes}
                          selectedClass={selectedClass}
                          onChange={onClassChange}
                          disabled={false}
                        />
                      )}
                      <button 
                        onClick={onResetPrintStatus}
                        className="text-[10px] bg-amber-100 text-amber-800 hover:bg-amber-200 px-2 py-1 rounded-md font-bold"
                        title="Reset Status Cetak Masal"
                      >
                        Reset Massal
                      </button>
                    </div>
                  </div>
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
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={activeStudent.nis}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className={`simulate-print w-fit ${showMarginsGuide ? 'show-margins-guide' : ''} ${showGridRuler ? 'show-grid-ruler' : ''}`}
                  >
                  
                  {/* PRINT PAGE 1 SIMULATION */}
                  <div className="print-page relative group"
                       style={{ padding: `${pageMargin.top}mm ${pageMargin.right}mm ${pageMargin.bottom}mm ${pageMargin.left}mm` }}>
                    <div className="flex flex-col h-full w-full justify-between">
                      {/* Header, title & info */}
                      <div className="avoid-break select-none relative">
                        <div className="flex items-start gap-4 mb-0.5">
                          <div className="h-20 w-20 flex flex-col justify-center items-center flex-none">
                            {renderKopLogo("max-h-20 max-w-20")}
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
                      <table className="w-full text-left text-[9pt] border border-black border-collapse font-sans leading-snug avoid-break">
                        <colgroup>
                          <col style={{ width: '15%' }} />
                          <col style={{ width: 'auto', maxWidth: '350px' }} />
                          <col style={{ width: '11%' }} />
                          <col style={{ width: '11%' }} />
                          <col style={{ width: '11%' }} />
                          <col style={{ width: '11%' }} />
                        </colgroup>
                        <thead>
                          <tr   className="avoid-break bg-slate-100">
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
                          <tr   className="avoid-break bg-slate-50 text-[8px] font-medium leading-tight text-slate-600">
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
                            const activeScore = activeStudent.grades[ind.id] || 'B';
                            return (
                              <tr className="avoid-break" key={ind.id}>
                                {i === 0 && (
                                  <td 
                                    rowSpan={3} className="border border-black py-0.5 px-1.5 text-center font-bold bg-[#f9fafb] align-middle text-[9.5px] leading-tight font-sans text-black" style={{ wordBreak: 'break-word' }}
                                  >
                                    Cinta Tanah Air
                                  </td>
                                )}
                                <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px] text-left" style={{ wordBreak: 'break-word' }}>
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
                              <tr className="avoid-break" key={ind.id}>
                                {i === 0 && (
                                  <td 
                                    rowSpan={3} className="border border-black py-0.5 px-1.5 text-center font-bold bg-[#f9fafb] align-middle text-[9.5px] leading-tight font-sans text-black" style={{ wordBreak: 'break-word' }}
                                  >
                                    Disiplin
                                  </td>
                                )}
                                <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px] text-left" style={{ wordBreak: 'break-word' }}>
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
                              <tr className="avoid-break" key={ind.id}>
                                {i === 0 && (
                                  <td 
                                    rowSpan={3} className="border border-black py-0.5 px-1.5 text-center font-bold bg-[#f9fafb] align-middle text-[9.5px] leading-tight font-sans text-black" style={{ wordBreak: 'break-word' }}
                                  >
                                    Berbudi Luhur
                                  </td>
                                )}
                                <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px] text-left" style={{ wordBreak: 'break-word' }}>
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
                              <tr className="avoid-break" key={ind.id}>
                                <td 
                                  className="border border-black py-0.5 px-1.5 text-center font-bold bg-[#f9fafb] align-middle text-[9.5px] leading-tight font-sans text-black"
                                >
                                  Cerdas
                                </td>
                                <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px] text-left" style={{ wordBreak: 'break-word' }}>
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
                    {/* Page Numbering & Date */}
                    <div className="absolute bottom-[8mm] left-[15mm] right-[15mm] flex justify-between items-center text-[8.5pt] font-mono font-bold text-slate-700 print:text-black select-none pointer-events-none">
                      <div className="flex flex-col gap-0.5">
                        {kopSekolah.customFooterText && <span>{kopSekolah.customFooterText}</span>}
                        {(kopSekolah.enableAutoDate ?? true) && <span>Dicetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                      </div>
                      {(kopSekolah.showPageNumbering ?? true) && (
                        <span>Halaman 1 dari 2</span>
                      )}
                    </div>
                  </div>

                  {/* PRINT PAGE 2 SIMULATION */}
                  <div className="print-page relative group"
                       style={{ padding: `${pageMargin.top}mm ${pageMargin.right}mm ${pageMargin.bottom}mm ${pageMargin.left}mm` }}>
                    <div className="flex flex-col h-full w-full justify-between gap-4">
                      <div className="flex flex-col gap-4">
                        {/* Table continuation on Page 2 */}
                        <table className="w-full text-left text-[9pt] border border-black border-collapse font-sans leading-snug avoid-break">
                          <colgroup>
                            <col style={{ width: '15%' }} />
                            <col style={{ width: 'auto', maxWidth: '350px' }} />
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
                                  <tr className="avoid-break" key={ind.id}>
                                    {idx === 0 && (
                                      <td 
                                        rowSpan={2} className="border border-black py-0.5 px-1.5 bg-[#f9fafb] align-middle" style={{ wordBreak: 'break-word' }}
                                      ></td>
                                    )}
                                    <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px] text-left" style={{ wordBreak: 'break-word' }}>
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
                                <tr className="avoid-break" key={ind.id}>
                                  {i === 0 && (
                                    <td 
                                      rowSpan={3} className="border border-black py-0.5 px-1.5 text-center font-bold bg-[#f9fafb] align-middle text-[9.5px] leading-tight font-sans text-black" style={{ wordBreak: 'break-word' }}
                                    >
                                      Terampil
                                    </td>
                                  )}
                                  <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px] text-left" style={{ wordBreak: 'break-word' }}>
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
                        <table className="w-full border-collapse relative z-10 bg-white table-fixed avoid-break" style={{ borderCollapse: 'collapse', border: '1px solid black', marginTop: '-1px' }}>
                          <tbody>
                            <tr className="avoid-break">
                              <td className="w-1/2 p-0 align-top h-full" style={{ border: '1px solid black' }}>
                                <div className="bg-white p-1.5 font-bold text-[9pt] text-black text-left" style={{ borderBottom: '1px solid black' }}>Catatan Wali Kelas :</div>
                                <div className="p-2.5 min-h-[85px] text-justify text-[9pt] text-black leading-relaxed font-sans">{activeStudent.catatanWali || ''}</div>
                              </td>
                              <td className="w-1/2 p-0 align-top h-full" style={{ border: '1px solid black' }}>
                                <div className="bg-white p-1.5 font-bold text-[9pt] text-black text-left" style={{ borderBottom: '1px solid black' }}>Catatan Orang Tua/Wali :</div>
                                <div className="p-2.5 min-h-[85px] text-justify text-[9pt] text-black leading-relaxed font-sans">{activeStudent.catatanOrangTua || ''}</div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Signatures block */}
                      <div className="mt-auto pt-4 avoid-break font-sans">
                        <p className="text-[10.5pt] font-semibold text-black text-center mb-4 select-none">
                          Mengetahui,
                        </p>
                        {kopSekolah.enableSignatureHeadmaster ? (
                          <div className="signature-container grid-cols-3 gap-6 text-center items-start relative z-10">
                            {/* Orang Tua */}
                            <div className="flex flex-col items-center justify-between h-32 relative">
                              <p className="text-[10pt] font-bold text-center mb-1">Wali Murid</p>
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
                              <div className="flex flex-col items-center w-full font-sans h-[1.2cm] justify-start">
                                <p id="tanda-tangan-wali-murid" className="font-bold text-black text-[10.5pt] text-center leading-tight select-none inline-block w-fit px-2 min-w-[5.0cm] border-b border-black pb-0.5 whitespace-nowrap min-h-[20px]">
                                  {EMPTY_SIGNATURE_PARENT}
                                </p>
                                <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none whitespace-nowrap">Tanda Tangan & Nama Terang</p>
                              </div>
                            </div>

                            {/* Kepala Sekolah (Middle, shifted down) */}
                            <div className="flex flex-col items-center justify-between h-32 relative mt-[4cm]">
                              <p className="text-[10pt] font-bold text-center mb-1">Kepala Sekolah</p>
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
                              <div className="flex flex-col items-center w-full font-sans h-[1.2cm] justify-start">
                                <p id="tanda-tangan-kepala-sekolah" data-label="Kepala Sekolah" className="font-bold text-black text-[10.5pt] text-center leading-tight select-all inline-block w-fit max-w-full px-2 border-b border-black pb-0.5 whitespace-normal break-words min-h-[20px]" style={{ fontSize: (kopSekolah.namaKepalaSekolah?.length || 0) > 30 ? '9pt' : '10.5pt' }}>
                                  {kopSekolah.namaKepalaSekolah || EMPTY_SIGNATURE}
                                </p>
                                {kopSekolah.nipKepalaSekolah ? (
                                  <p className="text-[8.5pt] text-slate-700 font-mono mt-0.5 select-all whitespace-nowrap">
                                    NIP. {kopSekolah.nipKepalaSekolah}
                                  </p>
                                ) : (
                                  <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none whitespace-nowrap">Tanda Tangan & Nama Terang</p>
                                )}
                              </div>
                            </div>

                            {/* Guru Kelas */}
                            <div className="flex flex-col items-center justify-between h-32 relative">
                              <p className="text-[10pt] font-bold text-center mb-1">Guru Kelas</p>
                              <div className="h-16 flex items-center justify-center relative w-full">
                                {(waliKelasSignatureUrl || kopSekolah.signatureTeacherUrl) ? (
                                  <img
                                    src={(waliKelasSignatureUrl || kopSekolah.signatureTeacherUrl)}
                                    alt="Tanda Tangan Guru"
                                    className="max-h-16 max-w-[140px] object-contain"
                                    referrerPolicy="no-referrer" crossOrigin="anonymous"
                                  />
                                ) : (
                                  <div className="h-4"></div>
                                )}
                              </div>
                              <div className="flex flex-col items-center w-full font-sans h-[1.2cm] justify-start">
                                <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all inline-block w-fit px-2  border-b border-black pb-0.5 whitespace-nowrap min-h-[20px]">
                                  {waliKelasName || EMPTY_SIGNATURE}
                                </p>
                                {waliKelasNip ? (
                                  <p className="text-[8.5pt] text-slate-700 font-mono mt-0.5 select-all whitespace-nowrap">
                                    NIP. {waliKelasNip}
                                  </p>
                                ) : (
                                  <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none whitespace-nowrap">Tanda Tangan & Nama Terang</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="signature-container grid-cols-2 gap-12 text-center text-sans relative z-10">
                            {/* Orang Tua */}
                            <div className="flex flex-col items-center justify-between h-32 relative">
                              <p className="text-[10pt] font-bold text-center mb-1">Wali Murid</p>
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
                              <div className="flex flex-col items-center w-full font-sans h-[1.2cm] justify-start">
                                <p id="tanda-tangan-wali-murid" className="font-bold text-black text-[10.5pt] text-center leading-tight select-none inline-block w-fit px-2 min-w-[5.0cm] border-b border-black pb-0.5 whitespace-nowrap min-h-[20px]">
                                  {EMPTY_SIGNATURE_PARENT}
                                </p>
                                <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none whitespace-nowrap">Tanda Tangan & Nama Terang</p>
                              </div>
                            </div>

                            {/* Guru Kelas */}
                            <div className="flex flex-col items-center justify-between h-32 relative">
                              <p className="text-[10pt] font-bold text-center mb-1">Guru Kelas</p>
                              <div className="h-16 flex items-center justify-center relative w-full">
                                {(waliKelasSignatureUrl || kopSekolah.signatureTeacherUrl) ? (
                                  <img
                                    src={(waliKelasSignatureUrl || kopSekolah.signatureTeacherUrl)}
                                    alt="Tanda Tangan Guru"
                                    className="max-h-16 max-w-[140px] object-contain"
                                    referrerPolicy="no-referrer" crossOrigin="anonymous"
                                  />
                                ) : (
                                  <div className="h-4"></div>
                                )}
                              </div>
                              <div className="flex flex-col items-center w-full font-sans h-[1.2cm] justify-start">
                                <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all inline-block w-fit px-2  border-b border-black pb-0.5 whitespace-nowrap min-h-[20px]">
                                  {waliKelasName || EMPTY_SIGNATURE}
                                </p>
                                {waliKelasNip ? (
                                  <p className="text-[8.5pt] text-slate-700 font-mono mt-0.5 select-all whitespace-nowrap">
                                    NIP. {waliKelasNip}
                                  </p>
                                ) : (
                                  <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none whitespace-nowrap">Tanda Tangan & Nama Terang</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Page Numbering & Date */}
                    <div className="absolute bottom-[8mm] left-[15mm] right-[15mm] flex justify-between items-center text-[8.5pt] font-mono font-bold text-slate-700 print:text-black select-none pointer-events-none">
                      <div className="flex flex-col gap-0.5">
                        {kopSekolah.customFooterText && <span>{kopSekolah.customFooterText}</span>}
                        {(kopSekolah.enableAutoDate ?? true) && <span>Dicetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                      </div>
                      {(kopSekolah.showPageNumbering ?? true) && (
                        <span>Halaman 2 dari 2</span>
                      )}
                    </div>
                  </div>

                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          ) : (
            <>
              <div className="bg-neutral-100/50 p-6 xl:p-12 rounded-2xl border border-slate-200/80 shadow-inner flex justify-center no-print selection:bg-transparent">
        <div className="bg-white border border-slate-300 shadow-2xl w-[210mm] min-h-[297mm] h-[297mm] max-h-[297mm] overflow-hidden box-border text-[11pt] text-black font-sans leading-relaxed flex flex-col justify-between"
             style={{ padding: `${pageMargin.top}mm ${pageMargin.right}mm ${pageMargin.bottom}mm ${pageMargin.left}mm` }}>
          <div>
            {/* Header block with organization logo & info */}
            <div className="flex items-start gap-4 mb-1">
              <div className="h-24 w-24 flex flex-col justify-center items-center flex-none">
                {renderKopLogo("max-h-24 max-w-24")}
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
            <table className="w-full text-left text-[9pt] border border-black border-collapse font-sans leading-snug">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: 'auto', maxWidth: '350px' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
              </colgroup>
              <thead>
                <tr   className="avoid-break bg-slate-100">
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
                <tr   className="avoid-break bg-slate-50 text-[8px] font-medium leading-tight text-slate-600">
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
                  const activeScore = activeStudent.grades[ind.id] || 'B';
                  return (
                    <tr  key={ind.id}  className="avoid-break hover:bg-slate-50/40">
                      {i === 0 && (
                        <td 
                          rowSpan={3} 
                          className="border border-black py-1 px-1.5 text-center font-bold bg-[#f9fafb] align-middle text-[10.5px] leading-tight font-sans text-black"
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
                    <tr  key={ind.id}  className="avoid-break hover:bg-slate-50/40">
                      {i === 0 && (
                        <td 
                          rowSpan={3} 
                          className="border border-black py-1 px-1.5 text-center font-bold bg-[#f9fafb] align-middle text-[10.5px] leading-tight font-sans text-black"
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
                    <tr  key={ind.id}  className="avoid-break hover:bg-slate-50/40">
                      {i === 0 && (
                        <td 
                          rowSpan={3} 
                          className="border border-black py-1 px-1.5 text-center font-bold bg-[#f9fafb] align-middle text-[10.5px] leading-tight font-sans text-black"
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
                    <tr  key={ind.id}  className="avoid-break hover:bg-slate-50/40">
                      <td 
                        className="border border-black py-1 px-1.5 text-center font-bold bg-[#f9fafb] align-middle text-[10.5px] leading-tight font-sans text-black"
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
        <div className="bg-white border border-slate-300 shadow-2xl w-[210mm] min-h-[297mm] h-[297mm] max-h-[297mm] overflow-hidden box-border text-[11pt] text-black font-sans leading-relaxed flex flex-col justify-between"
             style={{ padding: `${pageMargin.top}mm ${pageMargin.right}mm ${pageMargin.bottom}mm ${pageMargin.left}mm` }}>
          <div className="flex flex-col gap-4">
            {/* Table continuation on screen Page 2 */}
            <table className="w-full text-left text-[9pt] border border-black border-collapse font-sans leading-snug">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: 'auto', maxWidth: '350px' }} />
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
                      <tr  key={ind.id}  className="avoid-break hover:bg-slate-50/40">
                        {idx === 0 && (
                          <td 
                            rowSpan={2} 
                            className="border border-black py-1 px-1.5 bg-[#f9fafb] align-middle"
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
                    <tr  key={ind.id}  className="avoid-break hover:bg-slate-50/40">
                      {i === 0 && (
                        <td 
                          rowSpan={3} 
                          className="border border-black py-1 px-1.5 text-center font-bold bg-[#f9fafb] align-middle text-[10.5px] leading-tight font-sans text-black"
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
                <tr className="avoid-break">
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
            <table className="w-full border-collapse relative z-10 bg-white table-fixed avoid-break" style={{ borderCollapse: 'collapse', border: '1px solid black', marginTop: '-1px' }}>
              <tbody>
                <tr className="avoid-break">
                  <td className="w-1/2 p-0 align-top h-full" style={{ border: '1px solid black' }}>
                    <div className="bg-white p-1.5 font-bold text-[9pt] text-black text-left" style={{ borderBottom: '1px solid black' }}>Catatan Wali Kelas :</div>
                    <div className="p-2.5 min-h-[85px] text-justify text-[9pt] text-black leading-relaxed font-sans">{activeStudent.catatanWali || ''}</div>
                  </td>
                  <td className="w-1/2 p-0 align-top h-full" style={{ border: '1px solid black' }}>
                    <div className="bg-white p-1.5 font-bold text-[9pt] text-black text-left" style={{ borderBottom: '1px solid black' }}>Catatan Orang Tua/Wali :</div>
                    <div className="p-2.5 min-h-[85px] text-justify text-[9pt] text-black leading-relaxed font-sans">{activeStudent.catatanOrangTua || ''}</div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Signatures block */}
                      <div className="mt-auto pt-4">
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
                    <div className="flex flex-col items-center w-full font-sans h-[1.2cm] justify-start">
                                <p id="tanda-tangan-wali-murid" className="font-bold text-black text-[10.5pt] text-center leading-tight select-none inline-block w-fit px-2 min-w-[5.0cm] border-b border-black pb-0.5 whitespace-nowrap min-h-[20px]">
                                  {EMPTY_SIGNATURE_PARENT}
                                </p>
                                <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none whitespace-nowrap">Tanda Tangan & Nama Terang</p>
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
                    <div className="flex flex-col items-center w-full font-sans h-[1.2cm] justify-start">
                                <p id="tanda-tangan-kepala-sekolah" className="font-bold text-black text-[10.5pt] text-center leading-tight select-all inline-block w-fit max-w-full px-2 border-b border-black pb-0.5 whitespace-normal break-words min-h-[20px]" style={{ fontSize: (kopSekolah.namaKepalaSekolah?.length || 0) > 30 ? '9pt' : '10.5pt' }}>
                                  {kopSekolah.namaKepalaSekolah || EMPTY_SIGNATURE}
                                </p>
                                {kopSekolah.nipKepalaSekolah ? (
                                  <p className="text-[8.5pt] text-slate-700 font-mono mt-0.5 select-all whitespace-nowrap">
                                    NIP. {kopSekolah.nipKepalaSekolah}
                                  </p>
                                ) : (
                                  <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none whitespace-nowrap">Tanda Tangan & Nama Terang</p>
                                )}
                              </div>
                  </div>

                  {/* Guru Kelas */}
                  <div className="flex flex-col items-center justify-between h-32 relative">
                    <p className="text-[10.5pt] text-black font-bold">Guru Kelas / Wali Kelas</p>
                    <div className="h-16 flex items-center justify-center relative w-full">
                      {(waliKelasSignatureUrl || kopSekolah.signatureTeacherUrl) ? (
                        <img
                          src={(waliKelasSignatureUrl || kopSekolah.signatureTeacherUrl)}
                          alt="Tanda Tangan Guru"
                          className="max-h-16 max-w-[140px] object-contain"
                          referrerPolicy="no-referrer" crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="h-4"></div>
                      )}
                    </div>
                    <div className="flex flex-col items-center w-full font-sans h-[1.2cm] justify-start">
                                <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all inline-block w-fit px-2  border-b border-black pb-0.5 whitespace-nowrap min-h-[20px]">
                                  {waliKelasName || EMPTY_SIGNATURE}
                                </p>
                                {waliKelasNip ? (
                                  <p className="text-[8.5pt] text-slate-700 font-mono mt-0.5 select-all whitespace-nowrap">
                                    NIP. {waliKelasNip}
                                  </p>
                                ) : (
                                  <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none whitespace-nowrap">Tanda Tangan & Nama Terang</p>
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
                    <div className="flex flex-col items-center w-full font-sans h-[1.2cm] justify-start">
                                <p id="tanda-tangan-wali-murid" className="font-bold text-black text-[10.5pt] text-center leading-tight select-none inline-block w-fit px-2 min-w-[5.0cm] border-b border-black pb-0.5 whitespace-nowrap min-h-[20px]">
                                  {EMPTY_SIGNATURE_PARENT}
                                </p>
                                <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none whitespace-nowrap">Tanda Tangan & Nama Terang</p>
                              </div>
                  </div>

                  {/* Guru Kelas */}
                  <div className="flex flex-col items-center justify-between h-32 relative">
                    <p className="text-[10.5pt] text-black font-bold">Guru Kelas / Wali Kelas</p>
                    <div className="h-16 flex items-center justify-center relative w-full">
                      {(waliKelasSignatureUrl || kopSekolah.signatureTeacherUrl) ? (
                        <img
                          src={(waliKelasSignatureUrl || kopSekolah.signatureTeacherUrl)}
                          alt="Tanda Tangan Guru"
                          className="max-h-16 max-w-[140px] object-contain"
                          referrerPolicy="no-referrer" crossOrigin="anonymous"
                        />
                      ) : (
                        <div className="h-4"></div>
                      )}
                    </div>
                    <div className="flex flex-col items-center w-full font-sans h-[1.2cm] justify-start">
                                <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all inline-block w-fit px-2  border-b border-black pb-0.5 whitespace-nowrap min-h-[20px]">
                                  {waliKelasName || EMPTY_SIGNATURE}
                                </p>
                                {waliKelasNip ? (
                                  <p className="text-[8.5pt] text-slate-700 font-mono mt-0.5 select-all whitespace-nowrap">
                                    NIP. {waliKelasNip}
                                  </p>
                                ) : (
                                  <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none whitespace-nowrap">Tanda Tangan & Nama Terang</p>
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
        <div id="rapor-print-section" className={isLandscape ? 'print-landscape' : ''}>
          <div id="rapor-pdf-content" key={renderTrigger} className="bg-white text-black">
            {pdfRenderStudents.map((selSt) => (
              <div key={selSt.nis} className="student-pdf-group">
                {/* PRINT PAGE 1 */}
                <div className={`print-page relative overflow-visible box-border text-[11pt] leading-relaxed flex flex-col justify-between group ${isLandscape ? 'w-[297mm] min-h-[210mm]' : 'w-[210mm] min-h-[297mm]'}`}
                     style={{ padding: `${pageMargin.top}mm ${pageMargin.right}mm ${pageMargin.bottom}mm ${pageMargin.left}mm` }}>
                  <div className="flex flex-col h-full w-full justify-between">
                    {/* Header, title & info wrapped with avoid-break */}
                    <div className="avoid-break select-none relative">
                      {/* Header block with organization logo & info */}
                      <div className="flex items-start gap-4 mb-0.5">
                        <div className="h-20 w-20 flex flex-col justify-center items-center flex-none">
                          {renderKopLogo("max-h-20 max-w-20")}
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
                    <table className="w-full text-left text-[9pt] border border-black border-collapse font-sans leading-snug avoid-break">
                      <colgroup>
                        <col style={{ width: '15%' }} />
                        <col style={{ width: 'auto', maxWidth: '350px' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '11%' }} />
                        <col style={{ width: '11%' }} />
                      </colgroup>
                      <thead>
                        <tr   className="avoid-break bg-slate-100">
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
                        <tr   className="avoid-break bg-slate-50 text-[8px] font-medium leading-tight text-slate-600">
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
                          const activeScore = selSt.grades[ind.id] || 'B';
                          return (
                            <tr className="avoid-break" key={ind.id}>
                              {i === 0 && (
                                <td 
                                  rowSpan={3} className="border border-black py-0.5 px-1.5 text-center font-bold bg-[#f9fafb] align-middle text-[9.5px] leading-tight font-sans text-black" style={{ wordBreak: 'break-word' }}
                                >
                                  Cinta Tanah Air
                                </td>
                              )}
                              <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px]" style={{ wordBreak: 'break-word' }}>
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
                            <tr className="avoid-break" key={ind.id}>
                              {i === 0 && (
                                <td 
                                  rowSpan={3} className="border border-black py-0.5 px-1.5 text-center font-bold bg-[#f9fafb] align-middle text-[9.5px] leading-tight font-sans text-black" style={{ wordBreak: 'break-word' }}
                                >
                                  Disiplin
                                </td>
                              )}
                              <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px]" style={{ wordBreak: 'break-word' }}>
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
                            <tr className="avoid-break" key={ind.id}>
                              {i === 0 && (
                                <td 
                                  rowSpan={3} className="border border-black py-0.5 px-1.5 text-center font-bold bg-[#f9fafb] align-middle text-[9.5px] leading-tight font-sans text-black" style={{ wordBreak: 'break-word' }}
                                >
                                  Berbudi Luhur
                                </td>
                              )}
                              <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px]" style={{ wordBreak: 'break-word' }}>
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
                            <tr className="avoid-break" key={ind.id}>
                              <td 
                                className="border border-black py-0.5 px-1.5 text-center font-bold bg-[#f9fafb] align-middle text-[9.5px] leading-tight font-sans text-black"
                              >
                                Cerdas
                              </td>
                              <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px]" style={{ wordBreak: 'break-word' }}>
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
                  {/* Page Numbering & Date */}
                  <div className="absolute bottom-[8mm] left-[15mm] right-[15mm] flex justify-between items-center text-[8.5pt] font-mono font-bold text-slate-700 print:text-black select-none pointer-events-none">
                    <div className="flex flex-col gap-0.5">
                      {kopSekolah.customFooterText && <span>{kopSekolah.customFooterText}</span>}
                      {(kopSekolah.enableAutoDate ?? true) && <span>Dicetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                    </div>
                    {(kopSekolah.showPageNumbering ?? true) && (
                      <span className="page-number-display">Halaman 1 dari 2</span>
                    )}
                  </div>
                </div>

                {/* PRINT PAGE 2 */}
                <div className={`print-page relative overflow-visible box-border text-[11pt] leading-relaxed flex flex-col justify-between group ${isLandscape ? 'w-[297mm] min-h-[210mm]' : 'w-[210mm] min-h-[297mm]'}`}
                     style={{ padding: `${pageMargin.top}mm ${pageMargin.right}mm ${pageMargin.bottom}mm ${pageMargin.left}mm` }}>
                  <div className="flex flex-col h-full w-full justify-between gap-4">
                    <div className="flex flex-col gap-4">
                      {/* Table continuation on Page 2 */}
                    <table className="w-full text-left text-[9pt] border border-black border-collapse font-sans leading-snug avoid-break">
                      <colgroup>
                        <col style={{ width: '15%' }} />
                        <col style={{ width: 'auto', maxWidth: '350px' }} />
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
                              <tr className="avoid-break" key={ind.id}>
                                {idx === 0 && (
                                  <td 
                                    rowSpan={2} className="border border-black py-0.5 px-1.5 bg-[#f9fafb] align-middle" style={{ wordBreak: 'break-word' }}
                                  ></td>
                                )}
                                <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px]" style={{ wordBreak: 'break-word' }}>
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
                            <tr className="avoid-break" key={ind.id}>
                              {i === 0 && (
                                <td 
                                  rowSpan={3} className="border border-black py-0.5 px-1.5 text-center font-bold bg-[#f9fafb] align-middle text-[9.5px] leading-tight font-sans text-black" style={{ wordBreak: 'break-word' }}
                                >
                                  Terampil
                                </td>
                              )}
                              <td className="border border-black py-0.5 px-1.5 text-black leading-normal font-sans font-medium text-[9.5px]" style={{ wordBreak: 'break-word' }}>
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
                        <tr className="avoid-break">
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
                    <table className="w-full border-collapse relative z-10 bg-white table-fixed avoid-break" style={{ borderCollapse: 'collapse', border: '1px solid black', marginTop: '-1px' }}>
                      <tbody>
                        <tr className="avoid-break">
                          <td className="w-1/2 p-0 align-top h-full" style={{ border: '1px solid black' }}>
                            <div className="bg-white p-1.5 font-bold text-[9pt] text-black text-left" style={{ borderBottom: '1px solid black' }}>Catatan Wali Kelas :</div>
                            <div className="p-2.5 min-h-[85px] text-justify text-[9pt] text-black leading-relaxed font-sans">{selSt.catatanWali || ''}</div>
                          </td>
                          <td className="w-1/2 p-0 align-top h-full" style={{ border: '1px solid black' }}>
                            <div className="bg-white p-1.5 font-bold text-[9pt] text-black text-left" style={{ borderBottom: '1px solid black' }}>Catatan Orang Tua/Wali :</div>
                            <div className="p-2.5 min-h-[85px] text-justify text-[9pt] text-black leading-relaxed font-sans">{selSt.catatanOrangTua || ''}</div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                    </div>

                    {/* Signatures block */}
                    <div className="mt-auto pt-4 avoid-break font-sans signature-container">
                      <p className="text-[10.5pt] font-semibold text-black text-center col-span-full mb-2 select-none">
                        Mengetahui,
                      </p>
                      {kopSekolah.enableSignatureHeadmaster ? (
                        <div className="grid grid-cols-3 gap-6 text-center items-start relative z-10 w-full col-span-full">
                          {/* Orang Tua */}
                          <div className="flex flex-col items-center justify-between h-32 relative">
                            <p className="text-[10px] font-bold text-black mb-1 select-none">Wali Murid</p>
                            <div className="h-16 flex items-center justify-center relative w-full">
                              {kopSekolah.signatureParentUrl ? (
                                <img
                                  src={kopSekolah.signatureParentUrl}
                                  alt="Tanda Tangan Orang Tua"
                                  className="max-h-16 max-w-[140px] object-contain opacity-80"
                                  referrerPolicy="no-referrer" crossOrigin="anonymous"
                                />
                              ) : (
                                <div className="h-4"></div>
                              )}
                            </div>
                            <div className="flex flex-col items-center w-full font-sans h-[1.2cm] justify-start mt-2">
                                <p id="tanda-tangan-wali-murid" className="font-bold text-black text-[10.5pt] text-center leading-tight select-none inline-block w-fit px-2 min-w-[5.0cm] border-b border-black pb-0.5 whitespace-nowrap min-h-[20px]">&nbsp;</p>
                                <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none whitespace-nowrap">Tanda Tangan & Nama Terang</p>
                              </div>
                          </div>

                          {/* Kepala Sekolah (Middle, shifted down) */}
                          <div className="flex flex-col items-center justify-between h-32 relative mt-[4cm]">
                            <p className="text-[10px] font-bold text-black mb-1">Kepala Sekolah</p>
                            <div className="h-16 flex items-center justify-center relative w-full">
                              {kopSekolah.signatureHeadmasterUrl ? (
                                <img
                                  src={kopSekolah.signatureHeadmasterUrl}
                                  alt="Tanda Tangan Kepala Sekolah"
                                  className="max-h-16 max-w-[140px] object-contain opacity-80"
                                  referrerPolicy="no-referrer" crossOrigin="anonymous"
                                />
                              ) : (
                                <div className="h-4"></div>
                              )}
                            </div>
                            <div className="flex flex-col items-center w-full font-sans h-[1.2cm] justify-start mt-2">
                                <p id="tanda-tangan-kepala-sekolah" className="font-bold text-black text-[10.5pt] text-center leading-tight select-all inline-block w-fit max-w-full px-2 border-b border-black pb-0.5 whitespace-normal break-words min-h-[20px]" data-label="Kepala Sekolah" style={{ fontSize: (kopSekolah.namaKepalaSekolah?.length || 0) > 30 ? '9pt' : '10.5pt' }}>
                                  {kopSekolah.namaKepalaSekolah || EMPTY_SIGNATURE}
                                </p>
                                {kopSekolah.nipKepalaSekolah ? (
                                  <p className="text-[8.5pt] text-slate-700 font-mono mt-0.5 select-all whitespace-nowrap">
                                    NIP. {kopSekolah.nipKepalaSekolah}
                                  </p>
                                ) : (
                                  <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none whitespace-nowrap">Tanda Tangan & Nama Terang</p>
                                )}
                              </div>
                          </div>

                          {/* Guru Kelas */}
                          <div className="flex flex-col items-center justify-between h-32 relative">
                            <p className="text-[10px] font-bold text-black mb-1">Guru Kelas</p>
                            <div className="h-16 flex items-center justify-center relative w-full">
                              {(waliKelasSignatureUrl || kopSekolah.signatureTeacherUrl) ? (
                                <img
                                  src={(waliKelasSignatureUrl || kopSekolah.signatureTeacherUrl)}
                                  alt="Tanda Tangan Guru"
                                  className="max-h-16 max-w-[140px] object-contain opacity-80"
                                  referrerPolicy="no-referrer" crossOrigin="anonymous"
                                />
                              ) : (
                                <div className="h-4"></div>
                              )}
                            </div>
                            <div className="flex flex-col items-center w-full font-sans h-[1.2cm] justify-start mt-2">
                                <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all inline-block w-fit px-2  border-b border-black pb-0.5 whitespace-nowrap min-h-[20px]">
                                  {waliKelasName || EMPTY_SIGNATURE}
                                </p>
                                {waliKelasNip ? (
                                  <p className="text-[8.5pt] text-slate-700 font-mono mt-0.5 select-all whitespace-nowrap">
                                    NIP. {waliKelasNip}
                                  </p>
                                ) : (
                                  <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none whitespace-nowrap">Tanda Tangan & Nama Terang</p>
                                )}
                              </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-12 text-center text-sans relative z-10 w-full col-span-full">
                          {/* Orang Tua */}
                          <div className="flex flex-col items-center justify-between h-32 relative">
                            <p className="text-[10px] font-bold text-black mb-1 select-none">Wali Murid</p>
                            <div className="h-16 flex items-center justify-center relative w-full">
                              {kopSekolah.signatureParentUrl ? (
                                <img
                                  src={kopSekolah.signatureParentUrl}
                                  alt="Tanda Tangan Orang Tua"
                                  className="max-h-16 max-w-[180px] object-contain opacity-80"
                                  referrerPolicy="no-referrer" crossOrigin="anonymous"
                                />
                              ) : (
                                <div className="h-4"></div>
                              )}
                            </div>
                            <div className="flex flex-col items-center w-full font-sans h-[1.2cm] justify-start mt-2">
                                <p id="tanda-tangan-wali-murid" className="font-bold text-black text-[10.5pt] text-center leading-tight select-none inline-block w-fit px-2 min-w-[5.0cm] border-b border-black pb-0.5 whitespace-nowrap min-h-[20px]">&nbsp;</p>
                                <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none whitespace-nowrap">Tanda Tangan & Nama Terang</p>
                              </div>
                          </div>

                          {/* Guru Kelas */}
                          <div className="flex flex-col items-center justify-between h-32 relative">
                            <p className="text-[10px] font-bold text-black mb-1">Guru Kelas</p>
                            <div className="h-16 flex items-center justify-center relative w-full">
                              {(waliKelasSignatureUrl || kopSekolah.signatureTeacherUrl) ? (
                                <img
                                  src={(waliKelasSignatureUrl || kopSekolah.signatureTeacherUrl)}
                                  alt="Tanda Tangan Guru"
                                  className="max-h-16 max-w-[140px] object-contain opacity-80"
                                  referrerPolicy="no-referrer" crossOrigin="anonymous"
                                />
                              ) : (
                                <div className="h-4"></div>
                              )}
                            </div>
                            <div className="flex flex-col items-center w-full font-sans h-[1.2cm] justify-start mt-2">
                                <p className="font-bold text-black text-[10.5pt] text-center leading-tight select-all inline-block w-fit px-2  border-b border-black pb-0.5 whitespace-nowrap min-h-[20px]">
                                  {waliKelasName || EMPTY_SIGNATURE}
                                </p>
                                {waliKelasNip ? (
                                  <p className="text-[8.5pt] text-slate-700 font-mono mt-0.5 select-all whitespace-nowrap">
                                    NIP. {waliKelasNip}
                                  </p>
                                ) : (
                                  <p className="text-[8pt] text-slate-500 font-sans mt-1 italic select-none whitespace-nowrap">Tanda Tangan & Nama Terang</p>
                                )}
                              </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Page Numbering & Date */}
                  <div className="absolute bottom-[8mm] left-[15mm] right-[15mm] flex justify-between items-center text-[8.5pt] font-mono font-bold text-slate-700 print:text-black select-none pointer-events-none">
                    <div className="flex flex-col gap-0.5">
                      {kopSekolah.customFooterText && <span>{kopSekolah.customFooterText}</span>}
                      {(kopSekolah.enableAutoDate ?? true) && <span>Dicetak: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                    </div>
                    {(kopSekolah.showPageNumbering ?? true) && (
                      <span className="page-number-display">Halaman 2 dari 2</span>
                    )}
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
      <style>{`
        @media print {
          @page {
            size: A4 ${isLandscape ? 'landscape' : 'portrait'} !important;
            margin: 0 !important;
          }
          .print-page {
            padding: ${pageMargin.top}mm ${pageMargin.right}mm ${pageMargin.bottom}mm ${pageMargin.left}mm !important;
          }
        }
      `}</style>
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
  
  const toHex = (c: number) => c.toString(16).padStart(2, '0');
  
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
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


// Color safe proxy helpers
let globalStyleOverridesCount = 0;
let originalWindowGetComputedStyle = null;

const colorCache = new Map();

function toSafeRgb(val, fallback = 'transparent') {
  if (!val || typeof val !== 'string') return val;
  if (colorCache.has(val)) return colorCache.get(val);
  
  const trimmed = val.trim();
  if (trimmed.includes('oklch')) {
    const parsed = parseOklchColor(trimmed);
    if (parsed) {
      colorCache.set(val, parsed);
      return parsed;
    }
  }
  if (trimmed.includes('oklab')) {
    const parsed = parseOklabColor(trimmed);
    if (parsed) {
      colorCache.set(val, parsed);
      return parsed;
    }
  }
  if (trimmed.includes('color-mix')) {
    const nestedOklch = trimmed.match(/oklch\(([^)]+)\)/i);
    if (nestedOklch) {
      const parsed = parseOklchColor(nestedOklch[0]);
      if (parsed) {
        if (trimmed.includes('transparent') || trimmed.includes('rgba(0,0,0,0)')) {
          const matchRgb = parsed.match(/\d+,\s*\d+,\s*\d+/);
          if (matchRgb) {
            const alphaVal = trimmed.includes('0.') ? trimmed.match(/0\.\d+/)?.[0] || '0.15' : '0.15';
            const adjusted = "rgba(" + matchRgb[0] + ", " + alphaVal + ")";
            colorCache.set(val, adjusted);
            return adjusted;
          }
        }
        colorCache.set(val, parsed);
        return parsed;
      }
    }
    const nestedOklab = trimmed.match(/oklab\(([^)]+)\)/i);
    if (nestedOklab) {
      const parsed = parseOklabColor(nestedOklab[0]);
      if (parsed) {
        colorCache.set(val, parsed);
        return parsed;
      }
    }
  }
  
  if (!trimmed.includes('oklch') && !trimmed.includes('oklab') && !trimmed.includes('color-mix')) {
    return trimmed;
  }
  
  if (trimmed.includes('0.4') || trimmed.includes('0.96')) return 'rgb(241, 245, 249)';
  if (trimmed.includes('0.5') || trimmed.includes('0.98')) return 'rgb(248, 250, 252)';
  return fallback;
}

function loadIndexCssSynchronously(): string {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/src/index.css', false); // false means synchronous
    xhr.send(null);
    if (xhr.status === 200) {
      return xhr.responseText;
    }
  } catch (err) {
    console.warn('[loadIndexCssSynchronously] Gagal memuat index.css secara sinkron:', err);
  }
  return '';
}

function applyStrictPrintMargins(
  clonedDoc: Document,
  isLandscape: boolean,
  pageMargin: { top: number; bottom: number; left: number; right: number } = { top: 10, bottom: 10, left: 10, right: 10 }
) {
  try {
    const totalWidthMm = isLandscape ? 297 : 210;
    const totalHeightMm = isLandscape ? 210 : 297;

    const contentWidthMm = totalWidthMm - pageMargin.left - pageMargin.right;
    const contentHeightMm = totalHeightMm - pageMargin.top - pageMargin.bottom;

    const styleTag = clonedDoc.createElement('style');
    styleTag.innerHTML = `
      @page {
        size: A4 ${isLandscape ? 'landscape' : 'portrait'} !important;
        margin: ${pageMargin.top}mm ${pageMargin.right}mm ${pageMargin.bottom}mm ${pageMargin.left}mm !important;
      }
      body {
        margin: 0 !important;
        padding: 0 !important;
        background-color: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
      }
      #rapor-print-section, #rapor-pdf-content {
        display: block !important;
        position: static !important;
        width: ${contentWidthMm}mm !important;
        height: auto !important;
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .print-page {
        box-sizing: border-box !important;
        width: ${contentWidthMm}mm !important;
        height: ${contentHeightMm}mm !important;
        background-color: #ffffff !important;
        page-break-after: always !important;
        page-break-inside: avoid !important;
        position: relative !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    `;
    clonedDoc.head.appendChild(styleTag);
    console.log(`[applyStrictPrintMargins] Dynamically set content size to 10mm margins: ${contentWidthMm}mm x ${contentHeightMm}mm`);
  } catch (err) {
    console.error("[applyStrictPrintMargins] Error:", err);
  }
}

function injectPrintStyles(clonedDoc: Document, isLandscape: boolean, pageMargin?: { top: number; bottom: number; left: number; right: number }) {
  try {
    // 1. Load index.css synchronously to guarantee fonts, margins, and borders
    const indexCss = loadIndexCssSynchronously();
    if (indexCss) {
      const styleTag = clonedDoc.createElement('style');
      styleTag.innerHTML = convertOklabCss(convertOklchCss(indexCss));
      clonedDoc.head.appendChild(styleTag);
    }

    // 2. Copy all parent stylesheets and style tags
    document.querySelectorAll('style').forEach((origStyle) => {
      const clonedStyle = clonedDoc.createElement('style');
      clonedStyle.innerHTML = convertOklabCss(convertOklchCss(origStyle.innerHTML));
      clonedDoc.head.appendChild(clonedStyle);
    });

    document.querySelectorAll('link[rel="stylesheet"]').forEach((origLink) => {
      const clonedLink = clonedDoc.createElement('link');
      clonedLink.rel = 'stylesheet';
      clonedLink.href = (origLink as HTMLLinkElement).href;
      clonedDoc.head.appendChild(clonedLink);
    });

    // 3. Inject strict A4 margins based on the content width calculation
    applyStrictPrintMargins(clonedDoc, isLandscape, pageMargin);

    // 4. Inject explicit table, border, and color styles
    const explicitStyle = clonedDoc.createElement('style');
    explicitStyle.innerHTML = `
      :root {
        --color-slate-50: #f8fafc;
        --color-slate-100: #f1f5f9;
        --color-slate-200: #e2e8f0;
        --color-slate-300: #cbd5e1;
        --color-slate-400: #94a3b8;
        --color-slate-500: #64748b;
        --color-slate-600: #475569;
        --color-slate-700: #334155;
        --color-slate-800: #1e293b;
        --color-slate-900: #0f172a;
        --color-indigo-600: #4f46e5;
        --color-emerald-600: #059669;
        --color-rose-600: #e11d48;
      }

      /* Ensure precise table borders and margins for PDF output */
      table {
        border-collapse: collapse !important;
        width: 100% !important;
        table-layout: auto !important;
        word-wrap: break-word !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        border-spacing: 0 !important;
        margin-top: 4px !important;
        margin-bottom: 4px !important;
        page-break-inside: auto !important;
        border: 1px solid #000000 !important;
      }
      tr {
        page-break-inside: avoid !important;
        page-break-after: auto !important;
      }
      thead { display: table-header-group !important; }
      tfoot { display: table-footer-group !important; }
      
      th, td {
        border: 1px solid #000000 !important;
        padding: 4px 6px !important;
        box-sizing: border-box !important;
        vertical-align: top !important;
      }
      
      /* Avoid border cutoff on page breaks */
      tr td, tr th {
        border-bottom: 1px solid #000000 !important;
      }

      .text-slate-500, .text-slate-600, .text-slate-700, .text-slate-800, .text-slate-900 {
        color: #000000 !important;
      }
      .border-slate-200, .border-slate-300, .border-slate-400 {
        border-color: #000000 !important;
      }
      @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 100 900;
        font-display: swap;
        src: url('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf') format('truetype');
      }
    `;
    clonedDoc.head.appendChild(explicitStyle);
  } catch (err) {
    console.error("[injectPrintStyles] Error loading stylesheets synchronously:", err);
  }
}

async function generatePdfIframe(
  isLandscape: boolean,
  originalElement: HTMLElement,
  filename: string,
  isDownload: boolean,
  pageMargin = { top: 10, bottom: 10, left: 10, right: 10 }
): Promise<Blob | void> {
  const html2pdfFn = typeof html2pdf === 'function' ? html2pdf : (html2pdf as any).default;
  if (!html2pdfFn) {
    throw new Error("html2pdf library is not loaded in window scope.");
  }

  // Create temporary iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = isLandscape ? '297mm' : '210mm';
  iframe.style.height = isLandscape ? '210mm' : '297mm';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error("Gagal mengakses dokumen di dalam iframe.");
    }

    // Get HTML content
    const htmlContent = originalElement.innerHTML;

    // Write HTML structure into the iframe
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body>
          <div id="rapor-pdf-content">
            ${htmlContent}
          </div>
        </body>
      </html>
    `);
    iframeDoc.close();

    // Call injectPrintStyles to load index.css synchronously and handle all margins & styling
    injectPrintStyles(iframeDoc, isLandscape, pageMargin);

    // Override styles inside the iframe to ensure perfect 1-to-1 canvas compilation of A4 sheet
    const pdfStyle = iframeDoc.createElement('style');
    pdfStyle.innerHTML = `
      @page {
        size: A4 ${isLandscape ? 'landscape' : 'portrait'} !important;
        margin: 0 !important;
      }
      #rapor-pdf-content {
        width: ${isLandscape ? 297 : 210}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        background-color: #ffffff !important;
      }
      .print-page {
        width: ${isLandscape ? 297 : 210}mm !important;
        height: ${isLandscape ? 210 : 297}mm !important;
        padding: ${pageMargin.top}mm ${pageMargin.right}mm ${pageMargin.bottom}mm ${pageMargin.left}mm !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        page-break-after: always !important;
        page-break-inside: avoid !important;
        position: relative !important;
        overflow: hidden !important;
        background-color: #ffffff !important;
      }
    `;
    iframeDoc.head.appendChild(pdfStyle);

    // Update page numbers inside iframe Doc
    const allPrintPages = iframeDoc.querySelectorAll('.print-page');
    allPrintPages.forEach((page, idx) => {
      const pageNumSpan = page.querySelector('.page-number-display');
      if (pageNumSpan) {
        pageNumSpan.textContent = `Halaman ${idx + 1} dari ${allPrintPages.length}`;
      }
    });

    // Wait for fonts & images to render
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
      if (iframe.contentWindow) {
        await (iframe.contentWindow as any).document.fonts?.ready;
      }
    } catch (e) {
      console.warn("Fonts ready promise timed out or failed:", e);
    }

    const iframeElement = iframeDoc.getElementById('rapor-pdf-content');
    if (!iframeElement) {
      throw new Error("Gagal menemukan elemen target di dalam iframe.");
    }

    // Configure html2pdf options with strict 10mm margins
    const opt = {
      margin:       0, // strict 0 margin to let the A4 page's internal padding handle margins perfectly
      filename:     filename,
      image:        { type: 'jpeg', quality: 0.98 },
      pagebreak:    { mode: ['css', 'legacy'], avoid: ['.avoid-break'] },
      html2canvas:  {
        scale: 2.2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        backgroundColor: '#ffffff'
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: isLandscape ? 'landscape' : 'portrait' }
    };

    if (isDownload) {
      await html2pdfFn().set(opt).from(iframeElement).save();
    } else {
      const blob = await html2pdfFn().set(opt).from(iframeElement).output('blob');
      return blob;
    }
  } finally {
    // Always cleanup iframe
    try {
      iframe.remove();
    } catch (e) {
      console.warn("Error cleaning up iframe:", e);
    }
  }
}

let overrideStyleTag: HTMLStyleElement | null = null;

function applyGlobalStyleOverrides(isLandscape = false) {
  if (globalStyleOverridesCount === 0) {
    try {
      overrideStyleTag = document.createElement('style');
      overrideStyleTag.innerHTML = `
        #rapor-print-section {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: ${isLandscape ? '297mm' : '210mm'} !important;
          height: auto !important;
          z-index: -99999 !important;
          opacity: 0.01 !important;
          pointer-events: none !important;
          transform: none !important;
        }
      `;
      document.head.appendChild(overrideStyleTag);
    } catch (styleErr) {
      console.error("Failed to inject print section temporary viewport style overrides:", styleErr);
    }

    originalWindowGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = function(el, pseudo) {
      let style;
      try {
        style = originalWindowGetComputedStyle.call(window, el, pseudo);
      } catch (e) {
        try {
          style = originalWindowGetComputedStyle(el, pseudo);
        } catch (e2) {
          return {} as CSSStyleDeclaration;
        }
      }
      return new Proxy(style, {
        get(target, prop) {
          let val;
          try {
            val = Reflect.get(target, prop);
          } catch (e) {
            return undefined;
          }
          if (prop === 'getPropertyValue') {
            return function(key: string) {
              try {
                const v = target.getPropertyValue(key);
                if (v && typeof v === 'string' && (v.includes('oklch') || v.includes('oklab') || v.includes('color-mix'))) {
                  return toSafeRgb(v);
                }
                return v;
              } catch (e) {
                return '';
              }
            };
          }
          if (typeof val === 'function') {
            return val.bind(target);
          }
          if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('color-mix'))) {
            return toSafeRgb(val);
          }
          return val;
        }
      });
    };
  }
  globalStyleOverridesCount++;
}

function restoreGlobalStyleOverrides() {
  globalStyleOverridesCount--;
  if (globalStyleOverridesCount === 0) {
    if (overrideStyleTag) {
      try {
        overrideStyleTag.remove();
      } catch (e) {}
      overrideStyleTag = null;
    }
    if (originalWindowGetComputedStyle) {
      window.getComputedStyle = originalWindowGetComputedStyle;
      originalWindowGetComputedStyle = null;
    }
  }
}

function convertOklabCss(css) {
  return css.replace(/oklab\(([^)]+)\)/gi, (_, contents) => {
    try {
      const parts = contents.trim().split(/[\s/]+/);
      if (parts.length < 3) return 'rgb(240, 240, 240)';
      
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
      
      if (isNaN(l) || isNaN(a) || isNaN(b)) return 'rgb(240, 240, 240)';
      
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
      
      const gamma = (c_val) => {
        return c_val <= 0.0031308 ? 12.92 * c_val : 1.055 * Math.pow(c_val, 1 / 2.4) - 0.055;
      };
      
      const red = Math.round(Math.max(0, Math.min(1, gamma(r))) * 255);
      const green = Math.round(Math.max(0, Math.min(1, gamma(g))) * 255);
      const blue = Math.round(Math.max(0, Math.min(1, gamma(b_val))) * 255);
      
      return alpha === 1 
        ? "rgb(" + red + ", " + green + ", " + blue + ")" 
        : "rgba(" + red + ", " + green + ", " + blue + ", " + alpha + ")";
    } catch (e) {
      return 'rgb(240, 240, 240)';
    }
  });
}
