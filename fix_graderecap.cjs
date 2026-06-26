const fs = require('fs');
let content = fs.readFileSync('./src/components/GradeRecap.tsx', 'utf-8');

content = content.replace("import html2pdf from 'html2pdf.js';", "import html2canvas from 'html2canvas';\nimport { jsPDF } from 'jspdf';");

const oldCode = `    try {
      const opt = {
        margin: [8, 10, 8, 10], // top, left, bottom, right in mm
        filename: \`Ringkasan_Laporan_5NK_Kelas_\${selectedClass}.pdf\`,
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
    } finally {`;

const newCode = `    try {
      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Calculate margins (e.g. 10mm margins)
      const margin = 10;
      const contentWidth = pdfWidth - (margin * 2);
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgRatio = imgProps.width / imgProps.height;
      
      let finalWidth = contentWidth;
      let finalHeight = contentWidth / imgRatio;
      
      if (finalHeight > (pdfHeight - margin * 2)) {
          finalHeight = pdfHeight - margin * 2;
          finalWidth = finalHeight * imgRatio;
      }
      
      // Center the image
      const xOffset = margin + (contentWidth - finalWidth) / 2;
      const yOffset = margin;

      pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight);
      pdf.save(\`Ringkasan_Laporan_5NK_Kelas_\${selectedClass}.pdf\`);
      
      // Cleanup memory
      canvas.width = 0;
      canvas.height = 0;
      canvas.remove();
      
    } catch (err) {
      console.error("Gagal mengekspor Ringkasan Rapor Yayasan:", err);
      alert("Terjadi kesalahan teknis saat mengekspor PDF.");
    } finally {`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('./src/components/GradeRecap.tsx', content, 'utf-8');
console.log('Fixed GradeRecap.tsx');
