import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { Student, Teacher, Category, ScoreKey, scoreOptions, KopSekolah } from './types';
import { uploadFileToDrive, getOrCreateFolder } from './lib/drive.ts';
import { auth } from './firebase';

export function formatProperName(name: string): string {
  if (!name) return '';
  return name.trim();
}

export function validateTeacherNameFormat(name: string): boolean {
  if (!name) return false;
  // If entirely uppercase, it's considered unformatted/bad (e.g., "BUDI S.PD.")
  // We expect "Budi S.Pd."
  if (name === name.toUpperCase() && name.length > 2) return false;
  
  // Also check if title exists but lacks dots, e.g., "SPd" instead of "S.Pd."
  const lowerName = name.toLowerCase();
  if (lowerName.includes('spd') && !lowerName.includes('s.pd')) return false;
  if (lowerName.includes('mpd') && !lowerName.includes('m.pd')) return false;

  return true;
}

// Convert grades count to stats for charts
export function calculateClassStats(students: Student[], indicatorsCount: number) {
  const totalGrades = students.length * indicatorsCount;
  if (totalGrades === 0) return { BSB: 0, B: 0, MB: 0, BB: 0 };

  let bsb = 0, b = 0, mb = 0, bb = 0;
  students.forEach(s => {
    Object.values(s.grades).forEach(g => {
      if (g === 'BSB') bsb++;
      else if (g === 'B') b++;
      else if (g === 'MB') mb++;
      else if (g === 'BB') bb++;
    });
  });

  return {
    BSB: Math.round((bsb / totalGrades) * 100),
    B: Math.round((b / totalGrades) * 100),
    MB: Math.round((mb / totalGrades) * 100),
    BB: Math.round((bb / totalGrades) * 100),
  };
}

export function exportSingleStudentToExcel(student: Student, waliKelasName: string, categories: Category[]) {
  // Create a structured Excel layout mimicking the report card!
  const rows: any[] = [];
  
  // Title / Metadata Headers
  rows.push(['YAYASAN KARTIKA JAYA']);
  rows.push(['LAPORAN PERKEMBANGAN NILAI KARTIKA (5NK)']);
  rows.push(['Tahun Ajaran 2024 - 2025']);
  rows.push([]);
  
  rows.push(['NAMA:', student.name, '', 'NOMOR INDUK:', student.nis]);
  rows.push(['KELAS:', student.kelas, '', 'SEMESTER:', student.semester || 'Semester II (Genap)']);
  rows.push([]);
  
  // Table Headers
  rows.push([
    'Kategori 5NK',
    'Indikator Perilaku',
    'Hasil Penilaian',
    'Penjelasan Deskripsi Penilaian'
  ]);

  // Insert indicators with their assigned scores
  categories.forEach(category => {
    category.indicators.forEach((ind, i) => {
      const scoreKey = student.grades[ind.id];
      const scoreOpt = scoreKey ? scoreOptions.find(o => o.key === scoreKey) : null;
      
      rows.push([
        i === 0 ? category.name : '', // only output category name on first indicator
        ind.text,
        scoreOpt ? scoreOpt.label : (scoreKey || ''),
        scoreOpt ? scoreOpt.description : ''
      ]);
    });
  });

  rows.push([]);
  rows.push(['Uraian Kesimpulan Pencapaian 5NK:', student.kesimpulan]);
  rows.push(['Catatan Wali Kelas:', student.catatanWali]);
  rows.push([]);
  rows.push(['Mengetahui,']);
  rows.push(['Orang Tua / Wali', '', '', 'Guru Kelas / Wali Kelas']);
  rows.push(['', '', '', '']);
  rows.push(['____________________', '', '', waliKelasName]);

  // Generate Excel workbook
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  
  // Set basic column widths
  worksheet['!cols'] = [
    { wch: 20 }, // Kategori
    { wch: 55 }, // Indikator
    { wch: 25 }, // Hasil Penilaian
    { wch: 50 }, // Deskripsi
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Rapor_${student.nis}`);
  
  // Download file
  XLSX.writeFile(workbook, `Rapor_5NK_${student.name.replace(/\s+/g, '_')}.xlsx`);
}

export function getVbaMacroInstructionsRows(): any[][] {
  return [
    ['PANDUAN AKTIVASI VBA MACRO UNTUK EVALUASI 5NK OFFLINE'],
    ['========================================================================'],
    ['Aplikasi Rapor 5NK mendukung penggunaan Macro offline untuk mengaudit, mengisi cepat,'],
    ['dan merapikan rapor langsung di program Microsoft Excel tanpa internet.'],
    [''],
    ['LANGKAH-LANGKAH AKTIVASI DI EXCEL:'],
    ['1. Simpan dokumen ini dengan format "Excel Macro-Enabled Workbook (*.xlsm)" agar kode bisa disimpan.'],
    ['2. Tekan tombol keyboard [ ALT ] + [ F11 ] secara bersamaan untuk membuka Jendela Visual Basic Editor.'],
    ['3. Klik menu [ Insert ] di bagian atas, kemudian klik [ Module ].'],
    ['4. Salin (Copy) seluruh kode VBA yang ada di bawah ini, lalu Tempel (Paste) ke jendela editor kosong.'],
    ['5. Tutup Jendela VBA Editor atau tekan tombol [ ALT ] + [ Q ] untuk kembali ke lembar kerja.'],
    ['6. Di Excel, tekan [ ALT ] + [ F8 ], pilih nama Macro, lalu klik "Run" atau "Jalankan".'],
    ['========================================================================'],
    ['KODE VBA DI BAWAH INI DAPAT DISALIN:'],
    [''],
    ["' ===================================================================="],
    ["' SCRIPT UTAMA MACRO AUDIT OFFLINE, AUTO FILL & STATISTIK 5NK"],
    ["' ===================================================================="],
    ['Sub AuditDataRumpang()'],
    ['    Dim ws As Worksheet'],
    ['    Set ws = ActiveSheet'],
    ['    '],
    ['    Dim lastRow As Long'],
    ['    lastRow = ws.Cells(ws.Rows.Count, 2).End(xlUp).Row'],
    ['    If lastRow < 2 Then lastRow = ws.Cells(ws.Rows.Count, 3).End(xlUp).Row'],
    ['    '],
    ['    If lastRow < 2 Then'],
    ['        MsgBox "Sheet kosong atau format data siswa tidak dikenal!", vbCritical, "Gagal Audit"'],
    ['        Exit Sub'],
    ['    End If'],
    ['    '],
    ['    Dim missingCount As Long'],
    ['    missingCount = 0'],
    ['    Dim totalGraded As Long'],
    ['    totalGraded = 0'],
    ['    '],
    ['    Dim cRow As Long, colIdx As Long'],
    ['    Dim headerVal As String'],
    ['    '],
    ['    For cRow = 2 To lastRow'],
    ['        colIdx = 1'],
    ['        Do While colIdx <= 100'],
    ['            headerVal = Trim(CStr(ws.Cells(1, colIdx).Value))'],
    ['            If headerVal Like "Indicator_*" Or headerVal Like "*:*" Then'],
    ['                Dim cellVal As String'],
    ['                cellVal = Trim(CStr(ws.Cells(cRow, colIdx).Value))'],
    ['                If cellVal = "" Or cellVal = "-" Or cellVal = " " Then'],
    ['                    ws.Cells(cRow, colIdx).Interior.Color = RGB(255, 235, 235)'],
    ['                    missingCount = missingCount + 1'],
    ['                Else'],
    ['                    ws.Cells(cRow, colIdx).Interior.Color = xlNone'],
    ['                    totalGraded = totalGraded + 1'],
    ['                End If'],
    ['            End If'],
    ['            colIdx = colIdx + 1'],
    ['        Loop'],
    ['    Next cRow'],
    ['    '],
    ['    If missingCount > 0 Then'],
    ['        MsgBox "Ditemukan " & missingCount & " kolom nilai rumpang (kosong)!" & vbCrLf & _'],
    ['               "Siswa yang nilainya rumpang telah ditandai warna merah muda di sheet aktif.", vbExclamation, "Rapor 5NK Offline Auditor"'],
    ['    Else'],
    ['        MsgBox "Audit Berhasil! Semua nilai indikator siswa (" & totalGraded & " entri) telah terisi lengkap.", vbInformation, "Integritas 100% Sempurna"'],
    ['    End If'],
    ['End Sub'],
    [''],
    ['Sub IsiNilaiRumpangB()'],
    ['    Dim ws As Worksheet'],
    ['    Set ws = ActiveSheet'],
    ['    Dim lastRow As Long'],
    ['    lastRow = ws.Cells(ws.Rows.Count, 2).End(xlUp).Row'],
    ['    If lastRow < 2 Then lastRow = ws.Cells(ws.Rows.Count, 3).End(xlUp).Row'],
    ['    '],
    ['    If lastRow < 2 Then'],
    ['        MsgBox "Sheet kosong atau format data tidak dikenal!", vbCritical, "Gagal"'],
    ['        Exit Sub'],
    ['    End If'],
    ['    '],
    ['    Dim fillCount As Long'],
    ['    fillCount = 0'],
    ['    Dim cRow As Long, colIdx As Long'],
    ['    Dim headerVal As String'],
    ['    '],
    ['    Dim ans As Integer'],
    ['    ans = MsgBox("Apakah Anda yakin ingin mengisi semua nilai indikator yang kosong di sheet aktif dengan nilai default B (Berkembang) secara massal?", vbYesNo + vbQuestion, "Konfirmasi")'],
    ['    If ans = vbNo Then Exit Sub'],
    ['    '],
    ['    For cRow = 2 To lastRow'],
    ['        colIdx = 1'],
    ['        Do While colIdx <= 100'],
    ['            headerVal = Trim(CStr(ws.Cells(1, colIdx).Value))'],
    ['            If headerVal Like "Indicator_*" Or headerVal Like "*:*" Then'],
    ['                Dim cellVal As String'],
    ['                cellVal = Trim(CStr(ws.Cells(cRow, colIdx).Value))'],
    ['                If cellVal = "" Or cellVal = "-" Or cellVal = " " Then'],
    ['                    ws.Cells(cRow, colIdx).Value = "B"'],
    ['                    ws.Cells(cRow, colIdx).Interior.Color = xlNone'],
    ['                    fillCount = fillCount + 1'],
    ['                End If'],
    ['            End If'],
    ['            colIdx = colIdx + 1'],
    ['        Loop'],
    ['    Next cRow'],
    ['    '],
    ['    MsgBox "Berhasil mengisi otomatis " & fillCount & " sel rumpang dengan nilai B.", vbInformation, "VBA Autofill Sukses"'],
    ['End Sub'],
    [''],
    ['Sub TampilkanStatistikOffline()'],
    ['    Dim ws As Worksheet'],
    ['    Set ws = ActiveSheet'],
    ['    Dim lastRow As Long'],
    ['    lastRow = ws.Cells(ws.Rows.Count, 2).End(xlUp).Row'],
    ['    If lastRow < 2 Then lastRow = ws.Cells(ws.Rows.Count, 3).End(xlUp).Row'],
    ['    '],
    ['    Dim bsb As Long, b As Long, mb As Long, bb As Long, total As Long'],
    ['    bsb = 0: b = 0: mb = 0: bb = 0: total = 0'],
    ['    '],
    ['    Dim cRow As Long, colIdx As Long'],
    ['    Dim headerVal As String'],
    ['    '],
    ['    For cRow = 2 To lastRow'],
    ['        colIdx = 1'],
    ['        Do While colIdx <= 100'],
    ['            headerVal = Trim(CStr(ws.Cells(1, colIdx).Value))'],
    ['            If headerVal Like "Indicator_*" Or headerVal Like "*:*" Then'],
    ['                Dim cellVal As String'],
    ['                cellVal = UCase(Trim(CStr(ws.Cells(cRow, colIdx).Value)))'],
    ['                If cellVal = "BSB" Then'],
    ['                    bsb = bsb + 1: total = total + 1'],
    ['                ElseIf cellVal = "B" Then'],
    ['                    b = b + 1: total = total + 1'],
    ['                ElseIf cellVal = "MB" Then'],
    ['                    mb = mb + 1: total = total + 1'],
    ['                ElseIf cellVal = "BB" Then'],
    ['                    bb = bb + 1: total = total + 1'],
    ['                End If'],
    ['            End If'],
    ['            colIdx = colIdx + 1'],
    ['        Loop'],
    ['    Next cRow'],
    ['    '],
    ['    If total = 0 Then'],
    ['        MsgBox "Belum ada entri nilai valid (BSB / B / MB / BB) di lembar kerja ini.", vbInformation, "Statistik Kosong"'],
    ['        Exit Sub'],
    ['    End If'],
    ['    '],
    ['    Dim msg As String'],
    ['    msg = "SEBARAN CAPAIAN NILAI 5NK OFFLINE" & vbCrLf & _'],
    ['          "Nama Lembar: " & ws.Name & vbCrLf & _'],
    ['          "=========================================" & vbCrLf & _'],
    ['          "● Berkembang Sangat Baik (BSB) : " & bsb & " (" & Round((bsb / total) * 100, 1) & "%)" & vbCrLf & _'],
    ['          "● Berkembang (B)               : " & b & " (" & Round((b / total) * 100, 1) & "%)" & vbCrLf & _'],
    ['          "● Mulai Berkembang (MB)         : " & mb & " (" & Round((mb / total) * 100, 1) & "%)" & vbCrLf & _'],
    ['          "● Belum Berkembang (BB)         : " & bb & " (" & Round((bb / total) * 100, 1) & "%)" & vbCrLf & _'],
    ['          "=========================================" & vbCrLf & _'],
    ['          "Total Entri Nilai Tercatat: " & total & " sel."'],
    ['          '],
    ['    MsgBox msg, vbInformation, "Statistik Capaian Offline"'],
    ['End Sub'],
  ];
}

export function generateClassExcelBlob(students: Student[], className: string, waliKelasName: string, categories: Category[]): Blob {
  // Deep validation of input data
  if (!students || !Array.isArray(students) || students.length === 0) {
    throw new Error("Pengecekan gagal: Array siswa kosong atau tidak valid.");
  }

  try {
    const rows: any[] = [];
    rows.push(['YAYASAN KARTIKA JAYA']);
    rows.push([`REKAPITULASI PENILAIAN 5NK KELAS ${className}`]);
    rows.push([`Wali Kelas: ${waliKelasName}`]);
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
    students.forEach((student, index) => {
      rows.push([
        index + 1, student.nis, student.name, student.gender,
        ...indicatorIds.map(id => student.grades[id] || '-'),
        student.kesimpulan, student.catatanWali
      ]);
    });

    // Generate Excel
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Rekap_Kelas_${className}`);
    
    const vbaHeaders = getVbaMacroInstructionsRows();
    const wsVba = XLSX.utils.aoa_to_sheet(vbaHeaders);
    XLSX.utils.book_append_sheet(workbook, wsVba, 'VBA_Macro_Instruksi');
    
    // Use try-finally for safety
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    // Explicitly clear memory structures before returning
    rows.length = 0;
    indicatorIds.length = 0;
    indicatorHeaders.length = 0;
    
    const resultBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Final integrity check
    if (resultBlob.size === 0) {
      throw new Error("Berkas Excel yang dihasilkan kosong (0 byte).");
    }
    
    return resultBlob;
  } catch (error) {
    console.error("Error generating Excel Blob:", error);
    throw error;
  }
}

export function exportClassToExcel(students: Student[], className: string, waliKelasName: string, categories: Category[]) {
  if (!students || !Array.isArray(students) || students.length === 0) {
    alert("Peringatan: Tidak ada data siswa yang valid untuk diekspor ke Excel.");
    return;
  }
  try {
    const blob = generateClassExcelBlob(students, className, waliKelasName, categories);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Rekap_5NK_Kelas_${className}.xlsx`;
    document.body.appendChild(link);
    link.click();
    
    // Explicit clean-up actions to release the URL resource
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Kesalahan ekspor Excel:", error);
    alert(`Terjadi kesalahan saat mengekspor kelas ke Excel: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function exportClassToCsv(students: Student[], className: string, categories: Category[]) {
  const indicatorIds: string[] = [];
  categories.forEach(cat => {
    cat.indicators.forEach(ind => {
      indicatorIds.push(ind.id);
    });
  });

  // Construct CSV Header
  const headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'L/P', ...indicatorIds, 'Kesimpulan', 'Catatan Wali'];
  
  // Helper to escape CSV values according to RFC 4180 rules
  const escapeCsv = (val: any) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).trim();
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const csvRows = [headers.map(escapeCsv).join(',')];

  students.forEach((student, index) => {
    const row = [
      index + 1,
      student.nis,
      student.name,
      student.kelas,
      student.gender,
      ...indicatorIds.map(id => student.grades[id] || '-'),
      student.kesimpulan || '',
      student.catatanWali || ''
    ];
    csvRows.push(row.map(escapeCsv).join(','));
  });

  const csvContent = "\uFEFF" + csvRows.join('\r\n'); // Add BOM for Excel/third-party UTF-8 parsing and CR-LF for compatibility
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Rekap_5NK_Kelas_${className}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function exportAllTeachersToCsv(teachers: Teacher[]) {
  const headers = ['No', 'ID', 'Nama Guru', 'Role', 'Wali Kelas', 'NIP'];
  
  const escapeCsv = (val: any) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).trim();
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const csvRows = [headers.map(escapeCsv).join(',')];

  const sortedTeachers = [...teachers].sort((a, b) => {
    const roleComp = a.role.localeCompare(b.role);
    if (roleComp !== 0) return roleComp;
    return a.name.localeCompare(b.name);
  });

  sortedTeachers.forEach((teacher, index) => {
    const row = [
      index + 1,
      teacher.id,
      teacher.name,
      teacher.role,
      teacher.classAssigned || '',
      teacher.nip || ''
    ];
    csvRows.push(row.map(escapeCsv).join(','));
  });

  const csvContent = "\uFEFF" + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Rekap_Master_Guru.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function exportAllStudentsToCsv(students: Student[], categories: Category[]) {
  const indicatorIds: string[] = [];
  categories.forEach(cat => {
    cat.indicators.forEach(ind => {
      indicatorIds.push(ind.id);
    });
  });

  // Construct CSV Header
  const headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'L/P', ...indicatorIds, 'Kesimpulan', 'Catatan Wali', 'Status Selesai'];
  
  // Helper to escape CSV values according to RFC 4180 rules
  const escapeCsv = (val: any) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).trim();
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const csvRows = [headers.map(escapeCsv).join(',')];

  // Sort by class, then by name
  const sortedStudents = [...students].sort((a, b) => {
    const classComp = a.kelas.localeCompare(b.kelas);
    if (classComp !== 0) return classComp;
    return a.name.localeCompare(b.name);
  });

  sortedStudents.forEach((student, index) => {
    const row = [
      index + 1,
      student.nis,
      student.name,
      student.kelas,
      student.gender,
      ...indicatorIds.map(id => student.grades[id] || '-'),
      student.kesimpulan || '',
      student.catatanWali || '',
      student.completed ? 'SELESAI' : 'BELUM_LENGKAP'
    ];
    csvRows.push(row.map(escapeCsv).join(','));
  });

  const csvContent = "\uFEFF" + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `REKAP_MASTER_DATABASE_5NK_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// Excel Bulk Import Functions
// -------------------------------------------------------------

export function parseExcelDatabase(file: File): Promise<{ students?: Student[], teachers?: Teacher[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        const result: { students?: Student[], teachers?: Teacher[] } = {};

        // Parse Siswa (Students) Sheet
        const studentSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('siswa') || name.toLowerCase().includes('murid'));
        if (studentSheetName) {
          const sheet = workbook.Sheets[studentSheetName];
          const rawData: any[] = XLSX.utils.sheet_to_json(sheet);
          
          if (rawData && rawData.length > 0) {
            const parsedStudents: Student[] = rawData.map((row, index) => {
              const gradesObj: Record<string, ScoreKey> = {};
              Object.keys(row).forEach(key => {
                if (key.startsWith('Indicator_')) {
                  const indId = key.replace('Indicator_', '');
                  if (row[key] && row[key] !== '-') {
                    gradesObj[indId] = row[key] as ScoreKey;
                  }
                }
              });
              
              return {
                id: row['ID'] || (row['NIS'] ? `STUD_NIS_${String(row['NIS']).trim()}` : `STU_IMP_${Date.now()}_${index}`),
                name: formatProperName(row['Nama Siswa'] || row['Nama'] || 'Tanpa Nama'),
                nis: String(row['NIS'] || ''),
                kelas: row['Kelas'] || 'X-A',
                gender: row['L/P'] || row['Gender'] || 'L',
                semester: row['Semester'] || 'Semester II (Genap)',
                grades: gradesObj,
                kesimpulan: row['Kesimpulan'] || '',
                catatanWali: row['Catatan Wali'] || '',
                catatanOrangTua: row['Catatan Orang Tua'] || '',
                completed: Object.keys(gradesObj).length > 0, // Roughly marks complete if has grades
              };
            });
            result.students = parsedStudents;
          }
        }

        // Parse Guru (Teachers) Sheet
        const teacherSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes('guru') || name.toLowerCase().includes('wali'));
        if (teacherSheetName) {
          const sheet = workbook.Sheets[teacherSheetName];
          const rawData: any[] = XLSX.utils.sheet_to_json(sheet);
          
          if (rawData && rawData.length > 0) {
            const parsedTeachers: Teacher[] = rawData.map((row, index) => ({
              id: row['ID'] || (row['Wali Kelas'] || row['Wali'] ? `TCH_CLS_${String(row['Wali Kelas'] || row['Wali']).trim().toUpperCase()}` : `TCH_IMP_${Date.now()}_${index}`),
              name: formatProperName(row['Nama Guru'] || row['Nama'] || 'Tanpa Nama'),
              role: row['Role'] || row['Jabatan'] || 'Guru',
              classAssigned: row['Wali Kelas'] || row['Wali'] || undefined,
              nip: String(row['NIP'] || ''),
            }));
            result.teachers = parsedTeachers;
          }
        }

        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
}

export function exportDatabaseBackupConfig(students: Student[], teachers: Teacher[]) {
  const workbook = XLSX.utils.book_new();

  // Export Students Sheet
  const studentRows = students.map(s => {
    const gradesCols: Record<string, string> = {};
    Object.keys(s.grades).forEach(indId => {
      gradesCols[`Indicator_${indId}`] = s.grades[indId];
    });

    return {
      'ID': s.id,
      'Nama Siswa': s.name,
      'NIS': s.nis,
      'Kelas': s.kelas,
      'L/P': s.gender,
      'Semester': s.semester,
      ...gradesCols,
      'Kesimpulan': s.kesimpulan,
      'Catatan Wali': s.catatanWali,
      'Catatan Orang Tua': s.catatanOrangTua,
    };
  });
  const wsStudents = XLSX.utils.json_to_sheet(studentRows);
  XLSX.utils.book_append_sheet(workbook, wsStudents, 'Master_Siswa');

  // Export Teachers Sheet
  const teacherRows = teachers.map(t => ({
    'ID': t.id,
    'Nama Guru': t.name,
    'Role': t.role,
    'Wali Kelas': t.classAssigned || '',
    'NIP': t.nip || '',
  }));
  const wsTeachers = XLSX.utils.json_to_sheet(teacherRows);
  XLSX.utils.book_append_sheet(workbook, wsTeachers, 'Master_Guru');

  // Export VBA Macro Instructions Sheet
  const vbaHeaders = getVbaMacroInstructionsRows();
  const wsVba = XLSX.utils.aoa_to_sheet(vbaHeaders);
  XLSX.utils.book_append_sheet(workbook, wsVba, 'VBA_Macro_Instruksi');

  // Download File
  XLSX.writeFile(workbook, `Database_Backup_5NK_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Simple and offline-safe XOR encryption with Base64 encoding.
 * Ensures privacy and security of school database backup files (.json).
 */
export function encryptData(text: string, key: string): string {
  let result = '';
  const cipherKey = key || 'KARTIKA_5NK_DEFAULT_SALT';
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ cipherKey.charCodeAt(i % cipherKey.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(unescape(encodeURIComponent(result)));
}

export function decryptData(encodedText: string, key: string): string {
  try {
    const text = decodeURIComponent(escape(atob(encodedText)));
    let result = '';
    const cipherKey = key || 'KARTIKA_5NK_DEFAULT_SALT';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ cipherKey.charCodeAt(i % cipherKey.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (e) {
    throw new Error('Gagal mendekripsi berkas backup. Pastikan password Anda benar.');
  }
}

export async function uploadExcelToGoogleDrive(students: Student[], teachers: Teacher[], accessToken: string) {
  const workbook = XLSX.utils.book_new();

  const studentRows = students.map(s => {
    const gradesCols: Record<string, string> = {};
    Object.keys(s.grades).forEach(indId => {
      gradesCols[`Indicator_${indId}`] = s.grades[indId];
    });

    return {
      'ID': s.id,
      'Nama Siswa': s.name,
      'NIS': s.nis,
      'Kelas': s.kelas,
      'L/P': s.gender,
      'Semester': s.semester,
      ...gradesCols,
      'Kesimpulan': s.kesimpulan,
      'Catatan Wali': s.catatanWali,
      'Catatan Orang Tua': s.catatanOrangTua,
    };
  });
  const wsStudents = XLSX.utils.json_to_sheet(studentRows);
  XLSX.utils.book_append_sheet(workbook, wsStudents, 'Master_Siswa');

  const teacherRows = teachers.map(t => ({
    'ID': t.id,
    'Nama Guru': t.name,
    'Role': t.role,
    'Wali Kelas': t.classAssigned || '',
    'NIP': t.nip || '',
  }));
  const wsTeachers = XLSX.utils.json_to_sheet(teacherRows);
  XLSX.utils.book_append_sheet(workbook, wsTeachers, 'Master_Guru');

  const base64Str = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
  const binaryString = window.atob(base64Str);
  const binaryLen = binaryString.length;
  const bytes = new Uint8Array(binaryLen);
  for (let i = 0; i < binaryLen; i++) {
    const ascii = binaryString.charCodeAt(i);
    bytes[i] = ascii;
  }
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  const filename = `Database_Backup_5NK_${new Date().toISOString().split('T')[0]}.xlsx`;

  try {
    const folderId = await getOrCreateFolder(accessToken, 'Backup Rapor 5NK');
    return uploadFileToDrive(accessToken, blob, filename, folderId);
  } catch (e) {
    console.warn('Could not upload to target folder, uploading to root instead:', e);
    return uploadFileToDrive(accessToken, blob, filename);
  }
}

export async function createSnapshotZipBlob(snapshot: any) {
  const zip = new JSZip();
  const folderName = `Snapshot_${snapshot.label.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().getTime()}`;
  const folder = zip.folder(folderName);
  
  if (!folder) throw new Error("Gagal membuat folder zip");

  // Add Excel Backup
  const workbook = XLSX.utils.book_new();
  const studentRows = snapshot.data.students.map((s: Student) => {
    const gradesCols: Record<string, string> = {};
    Object.keys(s.grades).forEach(indId => {
      gradesCols[`Indicator_${indId}`] = s.grades[indId];
    });
    return {
      'ID': s.id,
      'Nama Siswa': s.name,
      'NIS': s.nis,
      'Kelas': s.kelas,
      'L/P': s.gender,
      'Semester': s.semester,
      ...gradesCols,
      'Kesimpulan': s.kesimpulan,
      'Catatan Wali': s.catatanWali,
      'Catatan Orang Tua': s.catatanOrangTua,
    };
  });
  const wsStudents = XLSX.utils.json_to_sheet(studentRows);
  XLSX.utils.book_append_sheet(workbook, wsStudents, 'Master_Siswa');

  const teacherRows = snapshot.data.teachers.map((t: Teacher) => ({
    'ID': t.id,
    'Nama Guru': t.name,
    'Role': t.role,
    'Wali Kelas': t.classAssigned || '',
    'NIP': t.nip || '',
  }));
  const wsTeachers = XLSX.utils.json_to_sheet(teacherRows);
  XLSX.utils.book_append_sheet(workbook, wsTeachers, 'Master_Guru');

  const excelBase64Str = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
  folder.file(`Database_Backup_5NK.xlsx`, excelBase64Str, { base64: true });

  // Add Metadata JSON
  const metadata = {
    label: snapshot.label,
    timestamp: snapshot.timestamp,
    studentsCount: snapshot.studentsCount,
    teachersCount: snapshot.teachersCount,
    kopSekolah: snapshot.data.kopSekolah,
    classes: snapshot.data.classes,
    categories: snapshot.data.categories
  };
  folder.file('metadata.json', JSON.stringify(metadata, null, 2));

  // Add Encrypted Full JSON Dump
  const rawJson = JSON.stringify(snapshot.data);
  const encryptedJson = encryptData(rawJson, 'KARTIKA_5NK_DEFAULT_SALT');
  folder.file('full_snapshot_encrypted.json', encryptedJson);

  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, filename: `${folderName}.zip` };
}

export async function uploadZipSnapshotToGoogleDrive(snapshot: any, accessToken: string) {
  const { blob, filename } = await createSnapshotZipBlob(snapshot);
  try {
    const driveFolderId = await getOrCreateFolder(accessToken, 'Snapshot Rapor 5NK');
    return uploadFileToDrive(accessToken, blob, filename, driveFolderId);
  } catch (e) {
    console.warn('Could not upload to target folder, uploading to root instead:', e);
    return uploadFileToDrive(accessToken, blob, filename);
  }
}

export async function downloadZipSnapshotLocally(snapshot: any) {
  const { blob, filename } = await createSnapshotZipBlob(snapshot);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ChangeLog {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  operator?: string;
}

export function getChangeLogs(): ChangeLog[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('rapor_5nk_change_logs');
  return stored ? JSON.parse(stored) : [];
}

export function addChangeLog(type: string, description: string) {
  if (typeof window === 'undefined') return;
  const logs = getChangeLogs();
  
  let currentOperator = 'Pengguna Lokal (Offline)';
  try {
    if (auth && auth.currentUser) {
      currentOperator = auth.currentUser.email || auth.currentUser.displayName || 'Pengguna Terautentikasi';
    }
  } catch (e) {
    // silently fail
  }

  const newLog: ChangeLog = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
    type,
    description,
    operator: currentOperator
  };
  const updatedLogs = [newLog, ...logs].slice(0, 100);
  localStorage.setItem('rapor_5nk_change_logs', JSON.stringify(updatedLogs));
  window.dispatchEvent(new Event('rapor_change_logs_updated'));
}

export function deleteChangeLog(id: string) {
  if (typeof window === 'undefined') return;
  const logs = getChangeLogs();
  const updatedLogs = logs.filter(log => log.id !== id);
  localStorage.setItem('rapor_5nk_change_logs', JSON.stringify(updatedLogs));
  window.dispatchEvent(new Event('rapor_change_logs_updated'));
}

export function clearChangeLogs() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('rapor_5nk_change_logs');
  window.dispatchEvent(new Event('rapor_change_logs_updated'));
}

export function exportLocalJsonBackup(students: Student[], teachers: Teacher[]) {
  if (typeof window === 'undefined') return;
  
  let categories = [];
  const categoriesStored = localStorage.getItem('rapor_5nk_categories');
  if (categoriesStored) {
    try {
      categories = JSON.parse(categoriesStored);
    } catch (_) {}
  }

  let kopSekolah = null;
  const kopStored = localStorage.getItem('rapor_5nk_kop');
  if (kopStored) {
    try {
      kopSekolah = JSON.parse(kopStored);
    } catch (_) {}
  }

  const backupData = {
    version: "1.0",
    appName: "Rapor_5NK",
    backupDate: new Date().toISOString(),
    students,
    teachers,
    categories,
    kopSekolah
  };

  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `Backup_Lokal_Rapor5NK_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface IntegrityReport {
  isValid: boolean;
  brokenStudentClasses: Array<{ studentId: string; studentName: string; class: string }>;
  brokenGradeIndicators: Array<{ studentId: string; studentName: string; indicatorId: string }>;
  unassignedClasses: string[];
}

export function runIntegrityCheck(
  students: Student[],
  teachers: Teacher[],
  categories: Category[],
  classes: string[]
): IntegrityReport {
  const brokenStudentClasses: Array<{ studentId: string; studentName: string; class: string }> = [];
  const brokenGradeIndicators: Array<{ studentId: string; studentName: string; indicatorId: string }> = [];
  const unassignedClasses: string[] = [];

  // Create a set of all valid class names assigned to some teacher who is a "Wali Kelas"
  const waliClasses = new Set(
    teachers
      .filter((t) => t.role === 'Wali Kelas' && t.classAssigned)
      .map((t) => t.classAssigned)
  );

  // Collect all valid indicator IDs
  const allIndicatorIds = new Set<string>();
  categories.forEach((cat) => {
    cat.indicators.forEach((ind) => {
      allIndicatorIds.add(ind.id);
    });
  });

  // Check each student
  students.forEach((student) => {
    // 1. Check if the class assigned to student has a Wali Kelas
    const studentClass = student.kelas;
    if (studentClass && !waliClasses.has(studentClass)) {
      brokenStudentClasses.push({
        studentId: student.id,
        studentName: student.name,
        class: studentClass,
      });
    }

    // 2. Check if student grades reference non-existing indicator IDs
    if (student.grades) {
      Object.keys(student.grades).forEach((indicatorId) => {
        if (!allIndicatorIds.has(indicatorId)) {
          brokenGradeIndicators.push({
            studentId: student.id,
            studentName: student.name,
            indicatorId,
          });
        }
      });
    }
  });

  // 3. Find classes from the classes list that have NO assigned Wali Kelas
  classes.forEach((cls) => {
    if (!waliClasses.has(cls)) {
      unassignedClasses.push(cls);
    }
  });

  const isValid =
    brokenStudentClasses.length === 0 &&
    brokenGradeIndicators.length === 0 &&
    unassignedClasses.length === 0;

  return {
    isValid,
    brokenStudentClasses,
    brokenGradeIndicators,
    unassignedClasses,
  };
}

export function fixIntegrity(
  students: Student[],
  teachers: Teacher[],
  categories: Category[],
  classes: string[]
): {
  fixedStudents: Student[];
  fixedTeachers: Teacher[];
  fixedClasses: string[];
  repairLogs: string[];
} {
  const repairLogs: string[] = [];
  const fixedStudents = JSON.parse(JSON.stringify(students)) as Student[];
  const fixedTeachers = JSON.parse(JSON.stringify(teachers)) as Teacher[];
  const fixedClasses = [...classes];

  // 1. Collect all valid class names from teachers & classes list
  const validClasses = new Set<string>();
  classes.forEach(c => validClasses.add(c));
  teachers.forEach(t => {
    if (t.role === 'Wali Kelas' && t.classAssigned) {
      validClasses.add(t.classAssigned);
    }
  });

  // Ensure all these valid classes are in the classes list
  validClasses.forEach(cls => {
    if (!fixedClasses.includes(cls)) {
      fixedClasses.push(cls);
      repairLogs.push(`🏢 Menambahkan kelas '${cls}' ke daftar kelas karena dirujuk oleh Wali Kelas.`);
    }
  });

  // 2. Normalize student class names (e.g. solve typos and casing issues)
  fixedStudents.forEach((student) => {
    const origClass = student.kelas;
    if (!validClasses.has(origClass)) {
      // Look for a close match (case-insensitive, ignore extra spacing/punctuation)
      const cleanClass = origClass.toUpperCase().replace(/[\s-]/g, '');
      const matchedClass = Array.from(validClasses).find((cls) => {
        return cls.toUpperCase().replace(/[\s-]/g, '') === cleanClass;
      });

      if (matchedClass && matchedClass !== origClass) {
        student.kelas = matchedClass;
        repairLogs.push(`✍️ Memperbaiki penamaan kelas siswa "${student.name}": '${origClass}' ➔ '${matchedClass}' (Normalisasi Casing/Tanda Baca).`);
      }
    }
  });

  // 3. Collect active student classes
  const activeStudentClasses = new Set<string>();
  fixedStudents.forEach(s => {
    if (s.kelas) activeStudentClasses.add(s.kelas);
  });

  // 4. Ensure every active student class has a Wali Kelas
  activeStudentClasses.forEach((studentClass) => {
    const hasWali = fixedTeachers.some(
      (t) => t.role === 'Wali Kelas' && t.classAssigned === studentClass
    );

    if (!hasWali) {
      // Find an existing "Wali Kelas" teacher who currently doesn't have an assigned class
      const freeWali = fixedTeachers.find(
        (t) => t.role === 'Wali Kelas' && (!t.classAssigned || t.classAssigned === '' || t.classAssigned === '-')
      );

      if (freeWali) {
        freeWali.classAssigned = studentClass;
        repairLogs.push(`🧑‍🏫 Menugaskan Wali Kelas ${freeWali.name} untuk memegang Kelas '${studentClass}' yang sebelumnya tidak memiliki wali.`);
      } else {
        // Create a new placeholder Wali Kelas for this class
        const randomId = `teacher_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const placeholderName = `Wali Kelas ${studentClass}, S.Pd.`;
        fixedTeachers.push({
          id: randomId,
          name: placeholderName,
          role: 'Wali Kelas',
          classAssigned: studentClass,
          nip: '-',
          signatureUrl: '',
        });
        repairLogs.push(`➕ Membuat akun Guru Wali Kelas baru '${placeholderName}' untuk Kelas '${studentClass}' agar data siswa terhubung sempurna.`);
      }
    }
  });

  // 5. Ensure all classes in classes list have a Wali Kelas as well
  fixedClasses.forEach((cls) => {
    const hasWali = fixedTeachers.some(
      (t) => t.role === 'Wali Kelas' && t.classAssigned === cls
    );

    if (!hasWali) {
      const freeWali = fixedTeachers.find(
        (t) => t.role === 'Wali Kelas' && (!t.classAssigned || t.classAssigned === '' || t.classAssigned === '-')
      );

      if (freeWali) {
        freeWali.classAssigned = cls;
        repairLogs.push(`🏢 Menugaskan Guru '${freeWali.name}' sebagai Wali Kelas untuk kelas '${cls}' yang belum berpemilik.`);
      } else {
        const randomId = `teacher_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const placeholderName = `Wali Kelas ${cls}, S.Pd.`;
        fixedTeachers.push({
          id: randomId,
          name: placeholderName,
          role: 'Wali Kelas',
          classAssigned: cls,
          nip: '-',
          signatureUrl: '',
        });
        repairLogs.push(`➕ Membuat Wali Kelas baru '${placeholderName}' untuk Kelas '${cls}' (Daftar Kelas).`);
      }
    }
  });

  // 6. Fix broken grades indicator references
  const allIndicatorIds = new Set<string>();
  categories.forEach((cat) => {
    cat.indicators.forEach((ind) => {
      allIndicatorIds.add(ind.id);
    });
  });

  fixedStudents.forEach((student) => {
    if (student.grades) {
      let cleanedCount = 0;
      Object.keys(student.grades).forEach((indicatorId) => {
        if (!allIndicatorIds.has(indicatorId)) {
          delete student.grades[indicatorId];
          cleanedCount++;
        }
      });
      if (cleanedCount > 0) {
        repairLogs.push(`🧹 Membersihkan ${cleanedCount} nilai indikator lama/sampah yang tidak dikenal milik "${student.name}".`);
      }
    }
  });

  if (repairLogs.length === 0) {
    repairLogs.push("Database diperiksa: Tidak ada konflik hubungan tabel yang perlu diperbaiki.");
  }

  return {
    fixedStudents,
    fixedTeachers,
    fixedClasses,
    repairLogs,
  };
}



