import express from "express";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import path from "path";
import fs from "fs-extra";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { convertProject, ConversionJob } from "./src/server/converterService.js";

const app = express();
const PORT = 3000;

// Configuración de límites y CORS
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Directorios de trabajo
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const OUTPUTS_DIR = path.join(process.cwd(), "outputs");
const TEMP_DIR = path.join(process.cwd(), "temp");

// Asegurar que los directorios existan
await fs.ensureDir(UPLOADS_DIR);
await fs.ensureDir(OUTPUTS_DIR);
await fs.ensureDir(TEMP_DIR);

// Configuración de Multer
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// Almacenamiento de trabajos en memoria (para simplicidad)
const jobs = new Map<string, ConversionJob>();

// Rutas de API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/convert", upload.single("projectZip"), async (req, res) => {
  console.log("Recibida petición /api/convert");
  if (!req.file) {
    console.warn("Intento de conversión sin archivo");
    return res.status(400).json({ error: "No se subió ningún archivo ZIP." });
  }

  const jobId = uuidv4();
  console.log(`Iniciando trabajo ${jobId} para el archivo ${req.file.originalname}`);
  const workDir = path.join(TEMP_DIR, jobId);
  await fs.ensureDir(workDir);

  const job: ConversionJob = {
    id: jobId,
    status: "pending",
    logs: ["Archivo recibido: " + req.file.originalname],
    workDir
  };

  jobs.set(jobId, job);

  // Iniciar la conversión en segundo plano
  convertProject(job, req.file.path, (update) => {
    const currentJob = jobs.get(jobId);
    if (currentJob) {
      Object.assign(currentJob, update);
      jobs.set(jobId, currentJob);
    }
  }).catch(err => {
    console.error(`Error crítico en conversión de trabajo ${jobId}:`, err);
    const failedJob = jobs.get(jobId);
    if (failedJob) {
       failedJob.status = "error";
       failedJob.error = err.message;
       failedJob.logs.push(`ERROR CRÍTICO: ${err.message}`);
       jobs.set(jobId, failedJob);
    }
  });

  res.json({ jobId });
});

app.get("/api/job/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: "Trabajo no encontrado" });
  }
  res.json(job);
});

app.get("/api/download/:id", async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || job.status !== "completed") {
    return res.status(404).json({ error: "Archivo no listo o trabajo no encontrado" });
  }

  const zipPath = path.join(job.workDir, "sitio-cpanel-listo.zip");
  if (await fs.pathExists(zipPath)) {
    res.download(zipPath, "sitio-cpanel-listo.zip");
  } else {
    res.status(404).json({ error: "El archivo ZIP final no existe en el servidor" });
  }
});

// Compatibilidad con rutas anteriores /svc/ (opcional, pero las mantendré unidas si es posible)
app.get("/svc/job/:id", (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "No encontrado" });
  res.json(job);
});
app.get("/svc/download/:id", async (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job || job.status !== "completed") return res.status(404).json({ error: "No listo" });
    const zipPath = path.join(job.workDir, "sitio-cpanel-listo.zip");
    res.download(zipPath, "sitio-cpanel-listo.zip");
});

// Middleware de Vite y fallback de SPA
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor Full-Stack WebIA PRO en http://localhost:${PORT}`);
  });
}

startServer();
