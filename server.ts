import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Initialize Gemini safely
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. AI comments will use fallback rules.");
      // We will handle requests of missing key gracefully down in the route
    }
    geminiClient = new GoogleGenAI({
      apiKey: key || 'MOCK_KEY',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiClient;
}

// REST API endpoint for generating AI Rapor comments
app.post('/api/generate-comments', async (req, res) => {
  try {
    const { studentName, gender, grades, className, waliKelasName } = req.body;

    if (!studentName || !grades) {
      res.status(400).json({ error: 'Missing studentName or grades' });
      return;
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'MY_GEMINI_API_KEY') {
      // Fallback generator when API Key is missing or default placeholder
      console.log("Using local rule-based comment generator (no active Gemini Key)");
      const fallbackResult = generateLocalComments(studentName, gender, grades);
      res.json(fallbackResult);
      return;
    }

    const ai = getGeminiClient();
    
    // Create detailed descriptions of the grades for the model context
    const gradeDetails = Object.entries(grades)
      .map(([ind, score]) => {
        const scoreLabel = score === 'BSB' ? 'Berkembang Sangat Baik (Konsisten, mandiri, tanpa diingatkan)' :
                           score === 'B' ? 'Berkembang (Bagus dengan sedikit arahan)' :
                           score === 'MB' ? 'Mulai Berkembang (Perlu diingatkan)' :
                           'Belum Berkembang (Membutuhkan bimbingan intensif)';
        return `- Indikator ${ind}: ${scoreLabel}`;
      })
      .join('\n');

    const prompt = `
Anda adalah sistem asisten Wali Kelas profesional di sekolah Kartika (SMA/SMK).
Tugas Anda adalah menulis laporan perkembangan nilai untuk murid berikut:
Nama Murid: ${studentName}
Jenis Kelamin: ${gender === 'L' ? 'Laki-laki' : 'Perempuan'}
Kelas: ${className || 'Umum'}
Nama Wali Kelas: ${waliKelasName || 'Guru Kelas'}

Berikut adalah tingkat penilaian murid pada indikator Laporan Perkembangan Nilai Kartika (5NK):
Nilai 5NK terdiri dari: Cinta Tanah Air (CTA), Disiplin (DSP), Berbudi Luhur (BBL), Cerdas (CRD), Terampil (TRM).

Nilai dan Kategori Murid ini:
${gradeDetails}

Tolong hasilkan dua (2) paragraf ringkas dalam format JSON dengan kunci "kesimpulan" dan "catatanWali".
Menggunakan Bahasa Indonesia yang sopan, ramah, profesional, mendukung, dan membangkitkan semangat belajar murid.

Skema JSON yang harus dikembalikan:
{
 "kesimpulan": "(Tulis uraian kesimpulan pencapaian 5NK murid ini. Analisis kelebihan utamanya dan berikan saran halus untuk bagian yang masih 'Mulai Berkembang' atau 'Belum Berkembang' jika ada. Maksimal 3 kalimat.)",
 "catatanWali": "(Tulis catatan bimbingan Wali Kelas yang suportif, kekinian, memotivasi murid, serta memberi aspirasi tinggi untuk masa depan mereka. Maksimal 2 kalimat.)"
}

Kembalikan HANYA teks JSON murni tanpa menyertakan blok kode markdown seperti \`\`\`json ... \`\`\`. Teks harus valid JSON agar bisa langsung di-parse dengan JSON.parse().
`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const responseText = response.text || '';
    try {
      const parsed = JSON.parse(responseText.trim());
      res.json({
        kesimpulan: parsed.kesimpulan,
        catatanWali: parsed.catatanWali,
        aiUsed: true
      });
    } catch (parseError) {
      console.error("AI returned invalid JSON, fell back to cleaning up string:", responseText);
      // Fallback clean parsing if the model added code fences despite prompt
      let cleanText = responseText.replace(/```json/gi, '').replace(/```/gi, '').trim();
      try {
        const parsedClean = JSON.parse(cleanText);
        res.json({
          kesimpulan: parsedClean.kesimpulan,
          catatanWali: parsedClean.catatanWali,
          aiUsed: true
        });
      } catch (finalError) {
        // Ultimate fallback
        const local = generateLocalComments(studentName, gender, grades);
        res.json({
          ...local,
          parseError: true,
          aiUsed: false
        });
      }
    }
  } catch (error: any) {
    console.error('Error generating AI comments:', error);
    res.status(500).json({ error: error.message || 'Error occurred during AI generation' });
  }
});

// Helper for local rule-based generation (very high-quality fallback)
function generateLocalComments(name: string, gender: string, grades: Record<string, string>) {
  const p = gender === 'L' ? 'ia' : 'ia';
  
  // Count counts of each grade
  const scores = Object.values(grades);
  const bsbCount = scores.filter(s => s === 'BSB').length;
  const bCount = scores.filter(s => s === 'B').length;
  const mbCount = scores.filter(s => s === 'MB').length;

  let kesimpulan = '';
  let catatanWali = '';

  if (bsbCount > 10) {
    kesimpulan = `${name} menunjukkan kepribadian luar biasa sebagai murid Kartika yang sangat cemerlang. Seluruh indikator nilai 5NK (Cinta Tanah Air, Disiplin, Berbudi Luhur, Cerdas, Terampil) terpenuhi dan berkembang secara konsisten di atas rata-rata kelompok belajarnya.`;
    catatanWali = `Sangat bangga atas dedikasi dan kepemimpinan yang ditunjukkan oleh ${name}. Teruslah menginspirasi teman-teman sekelas dan raihlah cita-cita setinggi langit!`;
  } else if (bsbCount + bCount >= 10) {
    const suggestions: string[] = [];
    if (grades['DSP1'] === 'MB' || grades['DSP2'] === 'MB' || grades['DSP3'] === 'MB') suggestions.push('manajemen waktu');
    if (grades['TRM1'] === 'MB' || grades['TRM2'] === 'MB' || grades['TRM3'] === 'MB') suggestions.push('keterampilan adaptasi praktis');
    
    const suggestionText = suggestions.length > 0 
      ? `dengan sedikit dorongan ekstra untuk meningkatkan ${suggestions.join(' dan ')}`
      : 'serta menyeimbangkan keterampilan akademis dengan pembiasaan karakter luhur';

    kesimpulan = `Perkembangan nilai Kartika (5NK) pada ${name} berjalan dengan sangat baik dan ideal. Hampir seluruh aspek karakter moral maupun intelektual telah berkembang matang, ${suggestionText}.`;
    catatanWali = `Kerja keras yang luar biasa, ${name}! Pertahankan kepribadian positif ini dan jangan ragu untuk terus mengeksplorasi potensi kreatifmu di masa depan.`;
  } else {
    kesimpulan = `${name} menunjukkan kemauan yang baik untuk terus belajar dan membimbing dirinya. Beberapa aspek kepribadian 5NK seperti Disiplin dan Cinta Tanah Air sudah berkembang, namun diperlukan bimbingan aktif yang berkelanjutan demi pembiasaan karakter yang lebih stabil.`;
    catatanWali = `Ibu/Bapak yakin ${name} memiliki potensi besar yang terpendam. Fokuslah meningkatkan motivasi diri, kurangi menunda pekerjaan, dan raih kesuksesan bersama!`;
  }

  return { kesimpulan, catatanWali, aiUsed: false };
}

// Serve static assets and bind Vite in non-production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Under production, server.cjs is located inside dist/
    // so __dirname is exactly the absolute path to the dist/ directory.
    const distPath = __dirname;
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rapor 5NK console server is bootloaded on http://localhost:${PORT}`);
  });
}

startServer();
