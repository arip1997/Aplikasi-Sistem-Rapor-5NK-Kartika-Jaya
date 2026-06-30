import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import pg from 'pg';

dotenv.config();

const app = express();
const PORT = 3000;

// PostgreSQL database connection lazy initialized database pool
const { Pool } = pg;
let pgPool: any = null;
function getPgPool() {
  if (!pgPool) {
    pgPool = new Pool({
      host: process.env.SQL_HOST,
      port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT) : 5432,
      user: process.env.SQL_ADMIN_USER || process.env.SQL_USER,
      password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      ssl: process.env.SQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 10000,
      max: 10,
    });
    pgPool.on('error', (err: any) => {
      console.error('Unexpected error on Postgres database pool client:', err);
      pgPool = null; // Self-heal: purge dead or stale pool on error
    });
  }
  return pgPool;
}

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
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
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
    console.error('Error generating AI comments (API failure):', error.message || error);
    
    // Fallback gracefully on any error, especially rate limits (429)
    console.log("Falling back to local rule-based comment generator due to API error.");
    const local = generateLocalComments(studentName, gender, grades);
    res.json({
      ...local,
      aiError: error.message || 'API Error',
      aiUsed: false
    });
  }
});

// REST API endpoint for saving full workspace state to Postgres (Cloud SQL) / local file fallback
app.post('/api/save-workspace', async (req, res) => {
  try {
    const { email, students, teachers, categories, kopSekolah, classes } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Missing email' });
      return;
    }

    const payloadObj = { students, teachers, categories, kopSekolah, classes, email, updatedAt: new Date().toISOString() };
    const payloadStr = JSON.stringify(payloadObj);
    let savedToSql = false;

    // 1. Try Cloud SQL if configured
    if (process.env.SQL_HOST) {
      try {
        const pool = getPgPool();
        const client = await pool.connect();
        try {
          // Semi-auto create the schema table if it's not present yet
          await client.query(`
            CREATE TABLE IF NOT EXISTS rapor_workspaces (
              id SERIAL PRIMARY KEY,
              email VARCHAR(255) UNIQUE NOT NULL,
              payload TEXT NOT NULL,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `);
          await client.query(`
            INSERT INTO rapor_workspaces (email, payload, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT (email)
            DO UPDATE SET payload = $2, updated_at = CURRENT_TIMESTAMP
          `, [email, payloadStr]);
          savedToSql = true;
          console.log(`[SQL Sync] Saved workspace data for email: ${email}`);
        } finally {
          client.release();
        }
      } catch (sqlErr: any) {
        // Mute connection terminated error log since Firebase is our active robust backend
        if (sqlErr.message && !sqlErr.message.includes('Connection terminated')) {
           console.error('[SQL Sync Error] Failed to write in Postgres:', sqlErr.message || sqlErr);
        }
        pgPool = null; // Self-heal: purge pool on connection errors
      }
    }

    // 2. Always persist to server local storage file as standard or secure fallback
    try {
      const fallbackDir = path.join(process.cwd(), 'server_local_db');
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      const safeEmailFile = email.replace(/[^a-zA-Z0-9]/g, '_') + '.json';
      const fallbackPath = path.join(fallbackDir, safeEmailFile);
      fs.writeFileSync(fallbackPath, JSON.stringify(payloadObj, null, 2));
      console.log(`[File Sync] Backup saved successfully on backend server: ${safeEmailFile}`);
    } catch (fsErr: any) {
      console.error('[File Sync Error] Local file write failed:', fsErr.message || fsErr);
    }

    res.json({ status: 'ok', savedToSql, savedToFile: true });
  } catch (error: any) {
    console.error('Error saving workspace:', error);
    res.status(500).json({ error: error.message || 'Error saving workspace' });
  }
});

// REST API endpoint for loading workspace state
app.get('/api/load-workspace', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Missing email' });
      return;
    }

    let loadedPayload: any = null;
    let loadedFromSql = false;

    // 1. Try Cloud SQL first
    if (process.env.SQL_HOST) {
      try {
        const pool = getPgPool();
        const client = await pool.connect();
        try {
          const dbRes = await client.query('SELECT payload FROM rapor_workspaces WHERE email = $1', [email]);
          if (dbRes.rows && dbRes.rows.length > 0) {
            loadedPayload = JSON.parse(dbRes.rows[0].payload);
            loadedFromSql = true;
            console.log(`[SQL Sync] Loaded workspace from Cloud SQL database for email: ${email}`);
          }
        } finally {
          client.release();
        }
      } catch (sqlErr: any) {
        console.error('[SQL Sync Load Error] Cloud SQL read failed:', sqlErr.message || sqlErr);
        pgPool = null; // Self-heal: purge pool on connection errors
      }
    }

    // 2. Try Local File fallback
    if (!loadedPayload) {
      try {
        const fallbackDir = path.join(process.cwd(), 'server_local_db');
        const safeEmailFile = email.replace(/[^a-zA-Z0-9]/g, '_') + '.json';
        const fallbackPath = path.join(fallbackDir, safeEmailFile);
        if (fs.existsSync(fallbackPath)) {
          const fileContent = fs.readFileSync(fallbackPath, 'utf8');
          loadedPayload = JSON.parse(fileContent);
          console.log(`[File Sync] Loaded workspace from backup file on server: ${safeEmailFile}`);
        }
      } catch (fsErr: any) {
        console.error('[File Sync Load Error] Local file read failed:', fsErr.message || fsErr);
      }
    }

    if (loadedPayload) {
      res.json({ status: 'ok', data: loadedPayload, loadedFromSql });
    } else {
      res.status(404).json({ error: 'Workspace not found' });
    }
  } catch (error: any) {
    console.error('Error loading workspace:', error);
    res.status(500).json({ error: error.message || 'Error occurred during workspace load' });
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

// API endpoint to return the version from metadata.json
app.get('/api/version', (req, res) => {
  try {
    const metadataPath = path.join(process.cwd(), 'metadata.json');
    if (fs.existsSync(metadataPath)) {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      res.json({ version: metadata.version || '1.0.0' });
    } else {
      res.json({ version: '1.0.0' });
    }
  } catch (err) {
    console.error('[Version API Error] Failed to read metadata.json:', err);
    res.json({ version: '1.0.0' });
  }
});

// API endpoint to check the live status of the Cloud SQL PostgreSQL connection pool
app.get('/api/db-status', async (req, res) => {
  if (!process.env.SQL_HOST) {
    res.json({ status: 'unconfigured', message: 'Cloud SQL host is not configured in the environment.' });
    return;
  }
  try {
    const pool = getPgPool();
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      res.json({ status: 'connected', message: 'Koneksi Cloud SQL PostgreSQL sukses & stabil.' });
    } finally {
      client.release();
    }
  } catch (err: any) {
    // If the error is an unexpected termination, it's likely the db was stopped or quota exhausted.
    // Suppress console error to avoid noise, but return status disconnected.
    pgPool = null; // Self-heal: purge pool on status check failures
    res.json({ status: 'disconnected', message: 'Fitur Relasional Cloud SQL sedang standby (Fallback ke Firebase/Backend File aktif). ' + (err.message || '') });
  }
});

// Serve static assets and bind Vite in non-production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Dynamically resolve the dist folder path relative to process.cwd() 
    // or __dirname depending on execution environment (direct or compiled bundle)
    const distPath = __dirname.endsWith('dist') || __dirname.endsWith('dist/')
      ? __dirname
      : path.join(process.cwd(), 'dist');
      
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
