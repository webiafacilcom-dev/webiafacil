import fs from "fs-extra";
import path from "path";
import AdmZip from "adm-zip";
import archiver from "archiver";
import { spawn } from "child_process";
import { v4 as uuidv4 } from "uuid";

export type ProjectType = "static" | "precompiled" | "react-vite" | "unknown";

export interface ConversionJob {
  id: string;
  status: "pending" | "extracting" | "analyzing" | "installing" | "building" | "packaging" | "completed" | "error";
  logs: string[];
  error?: string;
  downloadUrl?: string;
  workDir: string;
}

export async function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  onLog: (data: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { 
      cwd, 
      shell: true,
      env: { ...process.env, NODE_ENV: "production" }
    });

    child.stdout.on("data", (data) => onLog(data.toString()));
    child.stderr.on("data", (data) => onLog(data.toString()));

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with exit code ${code}`));
    });

    child.on("error", (err) => reject(err));
  });
}

export async function detectProjectType(dir: string): Promise<ProjectType> {
  const items = await fs.readdir(dir);

  if (items.includes("package.json")) {
    const pkg = await fs.readJson(path.join(dir, "package.json"));
    if (pkg.devDependencies?.vite || pkg.dependencies?.vite || pkg.scripts?.build?.includes("vite")) {
      return "react-vite";
    }
  }

  if (items.includes("index.html") && (items.includes("dist") || items.includes("build") || items.includes("out"))) {
    return "precompiled";
  }

  if (items.includes("index.html")) {
    return "static";
  }

  return "unknown";
}

export async function prepareCPanelProject(distDir: string): Promise<void> {
  // 1. Create .htaccess for SPA routing
  const htaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>`;
  await fs.writeFile(path.join(distDir, ".htaccess"), htaccess);

  // 2. Create README-INSTALACION.txt
  const readme = `INSTRUCCIONES DE INSTALACIÓN EN CPANEL
====================================

1. Sube el contenido de este archivo ZIP a la carpeta 'public_html' de tu cPanel.
2. Asegúrate de que el archivo .htaccess esté presente.
3. Si usas un subdominio o una carpeta secundaria, es posible que debas ajustar el 'RewriteBase' en el archivo .htaccess.

Tu sitio web está optimizado para funcionar correctamente en servidores Apache con mod_rewrite habilitado.

Generado por WebIA Fácil.`;
  await fs.writeFile(path.join(distDir, "README-INSTALACION.txt"), readme);
}

export async function createZip(sourceDir: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    archive.on("error", (err) => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, false);
    archive.finalize();
  });
}

export async function convertProject(
  job: ConversionJob,
  zipPath: string,
  updateJob: (update: Partial<ConversionJob>) => void
) {
  const log = (msg: string) => {
    job.logs.push(msg.trim());
    updateJob({ logs: [...job.logs] });
  };

  try {
    const extractDir = path.join(job.workDir, "extracted");
    await fs.ensureDir(extractDir);

    updateJob({ status: "extracting" });
    log("Extrayendo archivos...");
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractDir, true);

    // Find the real root (sometimes zips have a nested folder)
    let projectRoot = extractDir;
    const topLevelItems = await fs.readdir(extractDir);
    if (topLevelItems.length === 1 && (await fs.stat(path.join(extractDir, topLevelItems[0]))).isDirectory()) {
      projectRoot = path.join(extractDir, topLevelItems[0]);
    }

    updateJob({ status: "analyzing" });
    log("Analizando estructura del proyecto...");
    const type = await detectProjectType(projectRoot);
    log(`Tipo de proyecto detectado: ${type.toUpperCase()}`);
    log(`Directorio raíz: ${projectRoot}`);

    let distPath = projectRoot;

    if (type === "react-vite") {
      updateJob({ status: "installing" });
      log("Instalando dependencias (npm install)... (esto puede tardar unos minutos)");
      try {
        await runCommand("npm", ["install", "--no-audit", "--no-fund"], projectRoot, log);
      } catch (err: any) {
        log(`Advertencia npm install: ${err.message}`);
        log("Intentando continuar con el build a pesar del error de instalación...");
      }

      updateJob({ status: "building" });
      log("Compilando proyecto para producción...");
      try {
        // We force base=./ to ensure relative paths work in cPanel subfolders
        await runCommand("npm", ["run", "build", "--", "--base=./"], projectRoot, log);
      } catch (err: any) {
        log(`Error crítico en build: ${err.message}`);
        throw err;
      }
      
      distPath = path.join(projectRoot, "dist");
      if (!(await fs.pathExists(distPath))) {
        log("Error: No se encontró la carpeta 'dist' después del build.");
        throw new Error("No se encontró la carpeta 'dist' tras la compilación.");
      }
    } else if (type === "precompiled") {
      const folders = ["dist", "build", "out"];
      for (const f of folders) {
        if (await fs.pathExists(path.join(projectRoot, f))) {
          distPath = path.join(projectRoot, f);
          break;
        }
      }
    }

    updateJob({ status: "packaging" });
    log("Preparando archivos para cPanel...");
    await prepareCPanelProject(distPath);

    const finalZipPath = path.join(job.workDir, "sitio-cpanel-listo.zip");
    log("Creando paquete final...");
    await createZip(distPath, finalZipPath);

    // Cleanup extracted files to save space, keeping only the final ZIP
    await fs.remove(extractDir).catch(() => {});

    updateJob({ 
      status: "completed", 
      downloadUrl: `/api/download/${job.id}` 
    });
    log("¡Conversión finalizada con éxito!");

  } catch (error: any) {
    log(`ERROR: ${error.message}`);
    updateJob({ status: "error", error: error.message });
  } finally {
    // Cleanup the uploaded zip
    await fs.remove(zipPath).catch(() => {});
  }
}
