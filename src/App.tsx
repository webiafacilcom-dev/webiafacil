import React, { useState, useEffect, useRef } from "react";
import { 
  UploadCloud, FileType, Terminal, Loader2, CheckCircle, AlertTriangle, 
  Download, FileArchive, LogOut, ChevronRight, Copy, ExternalLink, Server,
  LayoutDashboard, HardDrive, ShoppingBag, Users, HeadphonesIcon, MessageCircle, ShieldCheck, CreditCard,
  Menu, X, Lock, Mail, RefreshCw, Zap, Globe, Rocket, Key, ArrowRight
} from "lucide-react";
import { 
  auth, registerUser, loginUser, resetPassword, signInWithGoogle, signOut, db, 
  handleFirestoreError, OperationType 
} from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { UploadBox } from "./components/UploadBox";
import { ProgressSteps } from "./components/ProgressSteps";
import { DownloadBox } from "./components/DownloadBox";
import { motion, AnimatePresence } from "motion/react";

type JobStatus = "pending" | "extracting" | "analyzing" | "installing" | "building" | "packaging" | "completed" | "error";

interface Job {
  id: string;
  status: JobStatus;
  logs: string[];
  error?: string;
  downloadUrl?: string;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [viewState, setViewState] = useState<"landing" | "auth" | "dashboard">("landing");

  // Layout State
  const [activeTab, setActiveTab] = useState<"tutoriales" | "prompt-generator" | "converter" | "free-hosting" | "hosting" | "marketplace" | "afiliados">("prompt-generator");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Prompt Generator State ---
  const [userIdea, setUserIdea] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");

  // --- User Profile State ---
  const [userProfile, setUserProfile] = useState<{ 
    plan: string, 
    hosting?: { url: string; user: string; pass: string } 
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUserProfile(null);
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      setIsAuthLoading(false);
      
      if (currentUser) {
         setViewState("dashboard");
         const path = `users/${currentUser.uid}`;
         try {
           const docRef = doc(db, "users", currentUser.uid);
           const docSnap = await getDoc(docRef);
           if (docSnap.exists()) {
             setUserProfile({ plan: docSnap.data().plan || "free" });
           } else {
             setUserProfile({ plan: "free" });
           }
         } catch (e) {
           handleFirestoreError(e, OperationType.GET, path);
         }
      } else {
         setViewState(prev => prev === "auth" ? "auth" : "landing");
      }
    });
    return () => unsubscribe();
  }, []);

  // Auth State
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [expectedCaptcha, setExpectedCaptcha] = useState(0);
  const [captchaMath, setCaptchaMath] = useState("");

  const generateCaptcha = () => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setCaptchaMath(`¿Cuánto es ${a} + ${b}?`);
    setExpectedCaptcha(a + b);
    setCaptchaAnswer("");
  };

  useEffect(() => {
    if (!isAuthenticated) generateCaptcha();
  }, [isAuthenticated, authMode]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    
    // Captcha validation for login and register
    if (authMode !== "forgot") {
      if (parseInt(captchaAnswer) !== expectedCaptcha) {
        setAuthError("CAPTCHA incorrecto. Inténtalo de nuevo.");
        generateCaptcha();
        return;
      }
    }

    setAuthLoading(true);
    try {
      if (authMode === "login") {
        await loginUser(email, password);
      } else if (authMode === "register") {
        if (accessCode !== "IA2026") {
          setAuthError("Código de acceso inválido.");
          setAuthLoading(false);
          return;
        }
        await registerUser(email, password);
      } else if (authMode === "forgot") {
        await resetPassword(email);
        alert("Enlace de recuperación enviado. Revisa tu correo electrónico.");
        setAuthMode("login");
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
         setAuthError("Credenciales incorrectas o usuario no encontrado.");
      } else if (err.code === 'auth/email-already-in-use') {
         setAuthError("El correo electrónico ya está registrado.");
      } else if (err.code === 'auth/weak-password') {
         setAuthError("La contraseña debe tener al menos 6 caracteres.");
      } else {
         setAuthError(err.message || "Error de autenticación.");
      }
      generateCaptcha();
    }
    setAuthLoading(false);
  };

  const handleGoogleAuth = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      await signInWithGoogle();
      // onAuthStateChanged will handle normalization
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // Just stop loading
      } else {
        setAuthError(err.message || "Error al autenticar con Google");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // --- Converter State ---
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<"cpanel" | "wordpress">("cpanel");
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"options" | "free" | "paid">("options");
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);
  const [checkoutData, setCheckoutData] = useState({
    nombre: "",
    correo: user?.email || "",
    telefono: "",
    tipoDominio: "propio" as "propio" | "subdominio",
    dominioPropio: "",
    subdominioPrefix: "",
    subdominioSuffix: ".misitiowebpro.com",
    formaPago: "paypal" as "paypal" | "transferencia" | "link_pago"
  });

  // Poll for job status for the converter
  useEffect(() => {
    if (!jobId) return;
    if (job?.status === "completed" || job?.status === "error") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/job/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          setJob(data);
        }
      } catch (err) {
        console.error("Fallo obteniendo estado", err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [jobId, job?.status]);

  // Converter Handlers
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0];
      if (selectedFile.name.endsWith(".zip")) {
        setFile(selectedFile);
        resetState();
      } else {
        setUploadError("Por favor sube un archivo con extensión .zip");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.name.endsWith(".zip")) {
        setFile(selectedFile);
        resetState();
      } else {
        setUploadError("El archivo debe ser un .zip");
      }
    }
  };

  const resetState = () => {
    setJobId(null);
    setJob(null);
    setUploadError(null);
    setViewMode("options");
  };

  const startConversion = async () => {
    if (!file) return;
    setUploadError(null);
    const formData = new FormData();
    formData.append("projectZip", file);
    formData.append("format", format);

    try {
      formData.append("uid", user ? user.uid : "");
      formData.append("plan", userProfile ? userProfile.plan : "free");
      
      const res = await fetch("/api/convert", { method: "POST", body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `Error del servidor: ${res.status}` }));
        throw new Error(errData.error || "No se pudo iniciar el proceso");
      }
      const data = await res.json();
      setJobId(data.jobId);
    } catch (err: any) {
      setUploadError(err.message || "Uh oh! Hubo un problema al subir el archivo.");
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const handleGeneratePrompt = () => {
    const template = `Actúa como un experto senior en creación de sitios web, marketing digital, copywriting persuasivo, diseño UX/UI, SEO local y estrategia comercial para pequeñas y medianas empresas.

Voy a pegarte una reseña o descripción básica de una empresa. Tu trabajo es transformar esa información en una página web profesional, moderna, clara, persuasiva y orientada a generar contactos, ventas y confianza.

RESEÑA DE LA EMPRESA:
${userIdea}

OBJETIVO:
Crear una página web completa para esta empresa, tomando como base la información de la reseña. La web debe verse profesional, confiable y atractiva para clientes potenciales.

INSTRUCCIONES PRINCIPALES:

1. Analiza la reseña de la empresa y extrae:
- Nombre de la empresa
- Tipo de negocio
- Productos o servicios principales
- Público objetivo
- Ubicación
- Propuesta de valor
- Beneficios para el cliente
- Posibles llamados a la acción
- Palabras clave para SEO

2. Crea una estructura completa de página web con estas secciones:
- Encabezado principal
- Menú de navegación
- Hero section o primera pantalla de impacto
- Frase principal poderosa
- Subtítulo persuasivo
- Botón de WhatsApp o contacto
- Sección “Sobre nosotros”
- Sección de productos o servicios
- Sección de beneficios
- Sección de por qué elegir esta empresa
- Sección de clientes ideales
- Sección de ubicación o cobertura
- Sección de contacto
- Pie de página profesional

3. Redacta todos los textos de la página web con un tono:
- Profesional
- Cercano
- Comercial
- Confiable
- Claro
- Orientado a ventas
- Fácil de entender

4. Optimiza el contenido para SEO local:
- Usa palabras clave relacionadas con el negocio
- Incluye ubicación si aparece en la reseña
- Redacta un título SEO
- Redacta una meta descripción
- Sugiere palabras clave principales
- Sugiere textos para botones de acción

5. Propón un diseño visual:
- Colores recomendados
- Estilo de la página
- Tipo de imágenes que se deben usar
- Distribución de las secciones
- Estilo de botones
- Estilo del encabezado
- Estilo del pie de página

6. Crea también una versión en HTML completo, en un solo archivo, con:
- Diseño moderno
- Código limpio
- Responsive para celular
- Botones de WhatsApp
- Secciones bien organizadas
- Estilos CSS incluidos en el mismo archivo
- Textos ya insertados
- Espacios para cambiar teléfono, correo, dirección e imágenes

DATOS DE CONTACTO:
Si en la reseña no aparecen teléfono, correo, WhatsApp o dirección exacta, usa textos provisionales como:
- WhatsApp: [Agregar número]
- Correo: [Agregar correo]
- Dirección: [Agregar dirección]
- Sitio web: [Agregar dominio]

IMPORTANTE:
No inventes datos legales, certificaciones o promesas falsas. Si falta información, crea una versión profesional usando textos generales y deja los campos editables.

ENTREGABLE FINAL:
Quiero que me entregues:

1. Análisis breve de la empresa
2. Estructura recomendada de la página web
3. Textos completos por sección
4. Título SEO
5. Meta descripción
6. Palabras clave sugeridas
7. Recomendación visual del diseño
8. Código HTML completo en un solo archivo, listo para copiar, guardar como index.html y subir a un hosting o cPanel`;
    
    setGeneratedPrompt(template);
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt);
    alert("¡Prompt copiado al portapapeles!");
  };

  const downloadPrompt = () => {
    const element = document.createElement("a");
    const file = new Blob([generatedPrompt], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = "prompt_creacion_web.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const renderPromptGenerator = () => (
    <div className="w-full max-w-2xl mx-auto space-y-8 pb-20">
      <header className="text-center space-y-3">
        <div className="w-14 h-14 bg-[#fac900]/10 text-[#fac900] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Zap className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Generador de Prompts PRO</h1>
        <p className="text-slate-500 font-medium max-w-md mx-auto">
          Describe tu idea y crearemos el prompt perfecto para que la IA genere tu sitio web profesional.
        </p>
      </header>

      <div className="bg-white rounded-[32px] shadow-2xl shadow-blue-500/5 p-6 md:p-10 border border-slate-100 space-y-6">
        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block ml-1">Tu idea de negocio o sitio web</label>
          <textarea
            value={userIdea}
            onChange={(e) => setUserIdea(e.target.value)}
            placeholder="Ej: Una landing page para una pizzería artesanal que ofrece delivery en Madrid, con un estilo rústico y moderno..."
            className="w-full h-32 p-5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-[#fac900]/10 focus:border-[#fac900] outline-none transition-all placeholder:text-slate-300 font-medium text-slate-700 resize-none"
          />
        </div>

        <button
          onClick={handleGeneratePrompt}
          disabled={!userIdea || authLoading}
          className="w-full py-4 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-2xl font-black transition-all flex justify-center items-center gap-3 shadow-xl active:scale-[0.98] text-base"
        >
          {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          Generar Prompt Optimizado
        </button>

        <AnimatePresence>
          {generatedPrompt && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-6 border-t border-slate-50"
            >
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 flex flex-col items-center text-center space-y-4">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">¡Prompt Generado!</h3>
                  <p className="text-slate-500 text-xs font-medium">El prompt ha sido optimizado con ingeniería de instrucciones profesional.</p>
                </div>
                
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPrompt);
                    alert("¡Prompt copiado al portapapeles!");
                  }}
                  className="w-full mt-2 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-[.98]"
                >
                  <Copy className="w-5 h-5" />
                  Copiar Prompt para la IA
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  const renderConverter = () => (
    <div className={`w-full max-w-3xl mx-auto space-y-10 pb-20`}>
      <AnimatePresence mode="wait">
        {!jobId ? (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            <div className="text-center space-y-3 max-w-xl mx-auto">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Convierte tu proyecto IA en un <span className="text-blue-600">ZIP para cPanel</span>
              </h1>
              <p className="text-slate-500 text-base md:text-lg font-medium">
                Sube tu código React/Vite y nosotros nos encargamos del build y el empaquetado profesional.
              </p>
            </div>

            <div className="bg-white rounded-[32px] shadow-2xl shadow-blue-500/5 p-6 md:p-10 border border-slate-100 space-y-6">
              <UploadBox 
                onFileSelect={(f) => setFile(f)} 
                disabled={false} 
              />

              {uploadError && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p className="font-bold text-xs tracking-tight">{uploadError}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 items-center pt-2">
                <button 
                  onClick={startConversion} 
                  disabled={!file} 
                  className="w-full sm:w-auto flex-grow py-4 bg-slate-900 hover:bg-black disabled:opacity-50 text-white rounded-2xl font-black transition-all flex justify-center items-center gap-3 shadow-xl active:scale-[0.98] text-base lg:px-10"
                >
                  Procesar Proyecto PRO
                  <ArrowRight className="w-5 h-5" />
                </button>
                <div className="text-center sm:text-left shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Tecnología</span>
                  <div className="flex items-center gap-2">
                     <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">React</span>
                     <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Vite</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            {job?.status !== "completed" ? (
              <div className="bg-white rounded-[32px] shadow-2xl p-6 md:p-10 border border-slate-100 space-y-6 max-w-lg mx-auto">
                 <div className="text-center space-y-1">
                    <h2 className="text-xl font-black text-slate-900">Procesando Proyecto</h2>
                    <p className="text-slate-500 text-sm font-medium">Estamos preparando tu sitio web.</p>
                 </div>
                 
                 <ProgressSteps 
                   currentStatus={job?.status || "pending"} 
                   logs={job?.logs || []} 
                 />

                 {job?.status === "error" && (
                   <button 
                    onClick={() => { setJobId(null); setFile(null); }}
                    className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors"
                   >
                     Intentar de nuevo
                   </button>
                 )}
              </div>
            ) : (
              <DownloadBox 
                downloadUrl={job?.downloadUrl || `/api/download/${jobId}`} 
                onReset={() => { setJobId(null); setFile(null); setJob(null); }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (viewState === "landing") {
    return (
      <div className="min-h-screen bg-[#0b1727] bg-gradient-to-br from-[#0f3435] via-[#0b1727] to-[#070d18] flex flex-col font-sans">
        <header className="fixed top-0 inset-x-0 bg-[#0b1727]/80 backdrop-blur-md border-b border-[#1c2e3e] z-50">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#fac900] rounded-xl flex items-center justify-center text-gray-900 font-black text-lg shadow-lg shadow-[#fac900]/20">
                W<span className="text-gray-800">F</span>
              </div>
              <span className="font-black text-xl text-white tracking-tight">WebIA Fácil</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setViewState("auth")} 
                className="hidden sm:block text-slate-300 hover:text-white font-medium"
              >
                Iniciar sesión
              </button>
              <button 
                onClick={() => setViewState("auth")} 
                className="bg-[#fac900] hover:bg-[#ffb000] text-gray-900 px-6 py-2.5 rounded-xl font-bold transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
              >
                Comenzar Gratis
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 pt-32 pb-20">
          {/* Hero Section */}
          <section className="px-6 text-center max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#fac900]/30 text-[#fac900] font-medium text-sm mb-4">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fac900] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#fac900]"></span>
              </span>
              Prueba gratis una oportunidad al frente
            </div>
            
            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Crea tu sitio web fácil <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#fac900] to-emerald-400">sin experiencia previa</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Te mostramos en video práctico cómo puedes lanzar tu proyecto de negocio, emprendimiento, promover tu producto o servicio utilizando los poderosos recursos de la IA.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 max-w-4xl mx-auto w-full">
               <button 
                  onClick={() => setViewState("auth")} 
                  className="w-full sm:w-auto bg-[#fac900] hover:bg-[#ffb000] text-gray-900 px-8 py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 text-lg"
               >
                  Crea y Lanza tu proyecto
               </button>
               <button 
                  onClick={() => { setViewState("auth"); }} 
                  className="w-full sm:w-auto bg-[#0b1727] border border-[#1c2e3e] hover:border-[#fac900]/50 hover:bg-[#122e31] text-slate-300 hover:text-white px-8 py-4 rounded-xl font-bold transition-all shadow-sm text-lg"
               >
                  Ver tutorial
               </button>
            </div>
          </section>

          <section className="py-24 max-w-6xl mx-auto px-6 mt-16">
            <div className="grid md:grid-cols-2 gap-12 items-center">
               <div className="space-y-6">
                 <h2 className="text-4xl font-black text-white leading-tight">
                    ¿Sabías que contratar un desarrollador cuesta cientos o miles de dólares?
                 </h2>
                 <p className="text-lg text-slate-300 leading-relaxed">
                    Hacer un sitio web de la forma tradicional toma semanas, implica reuniones largas, altas cotizaciones y mantenimientos costosos.
                 </p>
                 <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                       <X className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                       <span className="text-slate-200 font-medium">Costos elevados de diseño y programación.</span>
                    </li>
                    <li className="flex items-start gap-3">
                       <X className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                       <span className="text-slate-200 font-medium">Semanas o meses de espera para ver resultados.</span>
                    </li>
                    <li className="flex items-start gap-3">
                       <X className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
                       <span className="text-slate-200 font-medium">Dependencia técnica para cualquier cambio básico.</span>
                    </li>
                 </ul>
               </div>
               <div className="bg-gradient-to-br from-[#122e31] to-[#0b1727] border border-[#1c2e3e] rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
                 <div className="relative z-10 space-y-8">
                   <h3 className="text-3xl font-black">Con IA, es otro mundo.</h3>
                   <div className="space-y-6 text-slate-200">
                     <p className="text-lg leading-relaxed font-medium">
                        Hoy en día, herramientas de IA generan el código e imágenes por ti. Solo necesitas saber cómo armarlo, y nosotros te lo hacemos <span className="font-bold underline decoration-[#fac900] text-white">sumamente fácil</span>.
                     </p>
                     <ul className="space-y-4">
                        <li className="flex items-center gap-3">
                           <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                           <span className="font-bold text-lg text-white">Lanzamiento en minutos.</span>
                        </li>
                        <li className="flex items-center gap-3">
                           <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                           <span className="font-bold text-lg text-white">Control total de tu negocio.</span>
                        </li>
                        <li className="flex items-center gap-3">
                           <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                           <span className="font-bold text-lg text-white">Fracción del costo (¡o gratis!).</span>
                        </li>
                     </ul>
                   </div>
                 </div>
                 <div className="absolute top-0 right-0 opacity-[0.03]">
                    <Server className="w-64 h-64 -mr-16 -mt-16 text-white" />
                 </div>
               </div>
            </div>
          </section>

          {/* How it works */}
          <section id="how-it-works" className="py-24 mt-16 border-t border-[#1c2e3e] bg-[#070d18]/50">
            <div className="max-w-5xl mx-auto px-6 text-center">
              <h2 className="text-4xl font-black text-white mb-16">Tres pasos simples</h2>
              <div className="grid md:grid-cols-3 gap-12 text-left">
                <div className="bg-[#0b1727] p-8 rounded-3xl shadow-sm border border-[#1c2e3e] relative">
                  <div className="w-12 h-12 bg-[#042628] text-emerald-400 rounded-2xl flex items-center justify-center font-black text-xl mb-6 shadow-[0_0_15px_rgba(52,211,153,0.1)]">1</div>
                  <h3 className="text-xl font-bold text-white mb-3">Describe tu idea de negocio</h3>
                  <p className="text-slate-400 leading-relaxed">Agrega todos los detalles de tus servicios, productos y la visión que tienes para tu proyecto en el prompt de la IA.</p>
                </div>
                <div className="bg-[#0b1727] p-8 rounded-3xl shadow-sm border border-[#1c2e3e] relative">
                  <div className="w-12 h-12 bg-[#042628] text-emerald-400 rounded-2xl flex items-center justify-center font-black text-xl mb-6 shadow-[0_0_15px_rgba(52,211,153,0.1)]">2</div>
                  <h3 className="text-xl font-bold text-white mb-3">Genera tu sitio web</h3>
                  <p className="text-slate-400 leading-relaxed">Haz que la IA genere tu sitio web impactante y ganador en cuestión de segundos y descarga el código fuente.</p>
                </div>
                <div className="bg-[#0b1727] p-8 rounded-3xl shadow-sm border border-[#1c2e3e] relative">
                  <div className="w-12 h-12 bg-[#042628] text-emerald-400 rounded-2xl flex items-center justify-center font-black text-xl mb-6 shadow-[0_0_15px_rgba(52,211,153,0.1)]">3</div>
                  <h3 className="text-xl font-bold text-white mb-3">Conecta y publica al mundo</h3>
                  <p className="text-slate-400 leading-relaxed">Sube tu proyecto a un hosting, conecta tu dominio y lanza tu negocio. Nosotros te brindamos el paso a paso.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-24 px-6 max-w-6xl mx-auto text-center space-y-16">
            <div>
              <h2 className="text-4xl font-black text-white mb-4">Todo lo que necesitas para triunfar</h2>
              <p className="text-lg text-slate-400 max-w-3xl mx-auto mt-6">Tu ecosistema integral: empieza gratis desarrollando con IA de forma práctica, y escala con servicios premium de alta calidad a muy bajo costo, con el respaldo de nuestro soporte y garantía.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto text-center">
               <div className="bg-[#0b1727] border text-center border-[#1c2e3e] rounded-3xl p-8 shadow-sm hover:border-emerald-500/50 transition-colors">
                  <div className="w-14 h-14 bg-[#042628] text-emerald-400 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                    <Zap className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Creación con IA</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Te enseñamos cómo generar tu sitio web de forma práctica en minutos.</p>
               </div>
               <div className="bg-[#0b1727] border text-center border-[#1c2e3e] rounded-3xl p-8 shadow-sm hover:border-[#fac900]/50 transition-colors">
                  <div className="w-14 h-14 bg-[#fac900]/10 text-[#fac900] rounded-2xl flex items-center justify-center mb-6 mx-auto">
                    <Globe className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Opciones Gratis</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Lanza tu primer prototipo y valida tu idea sin riesgos financieros.</p>
               </div>
               <div className="bg-[#0b1727] border text-center border-[#1c2e3e] rounded-3xl p-8 shadow-sm hover:border-emerald-500/50 transition-colors">
                  <div className="w-14 h-14 bg-[#042628] text-emerald-400 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                    <Rocket className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Escalabilidad</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Servicios premium de altísima calidad a precios excepcionalmente bajos.</p>
               </div>
               <div className="bg-[#0b1727] border text-center border-[#1c2e3e] rounded-3xl p-8 shadow-sm hover:border-[#fac900]/50 transition-colors">
                  <div className="w-14 h-14 bg-[#fac900]/10 text-[#fac900] rounded-2xl flex items-center justify-center mb-6 mx-auto">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Soporte y Garantía</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Comunidad y ayuda paso a paso para que no te estanques en lo técnico.</p>
               </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-24 border-t border-[#1c2e3e] bg-[#070d18]/50 text-left">
             <div className="max-w-4xl mx-auto px-6">
                <h2 className="text-3xl font-black text-white mb-12 text-center">Preguntas Frecuentes</h2>
                <div className="space-y-6">
                   <div className="bg-[#0b1727] p-6 rounded-2xl shadow-sm border border-[#1c2e3e]">
                      <h3 className="text-lg font-bold text-white mb-2">¿Es realmente gratis?</h3>
                      <p className="text-slate-400">Sí, contamos con un plan gratuito ilimitado en tiempo, ideal para que aprendas, lances tu primer prototipo y valides tu idea de negocio sin riesgos financieros.</p>
                   </div>
                   <div className="bg-[#0b1727] p-6 rounded-2xl shadow-sm border border-[#1c2e3e]">
                      <h3 className="text-lg font-bold text-white mb-2">¿Puedo usar mi propio dominio (.com, .net, etc)?</h3>
                      <p className="text-slate-400">¡Por supuesto! Esta es una de nuestras ventajas más poderosas. En el plan gratuito te permitimos conectar tu propio dominio y tener tu correo corporativo sin tener que pagar un plan premium. Si no tienes dominio, nosotros te damos un subdominio de prueba.</p>
                   </div>
                   <div className="bg-[#0b1727] p-6 rounded-2xl shadow-sm border border-[#1c2e3e]">
                      <h3 className="text-lg font-bold text-white mb-2">¿Tendré ayuda si me quedo atascado?</h3>
                      <p className="text-slate-400">Sí. Ofrecemos tutoriales paso a paso de cómo hacer todo, y además tenemos una comunidad y opción de solicitar soporte donde te guiaremos con lo técnico.</p>
                   </div>
                </div>
             </div>
          </section>

          {/* CTA Footer */}
          <section className="pb-12 pt-16 px-6 text-center">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 tracking-tight">¿Listo para lanzar tu proyecto con IA?</h2>
            <button onClick={() => setViewState("auth")} className="px-8 py-4 bg-[#fac900] hover:bg-[#ffb000] text-gray-900 rounded-full font-bold text-lg transition-all shadow-xl hover:-translate-y-1">
              Crea y Lanza tu negocio ahora
            </button>
          </section>
        </main>
        
        <footer className="border-t border-[#1c2e3e] py-8 px-6 text-center text-slate-500 text-sm">
          <p>© 2026 WebIA Fácil. Patrocinado por <a href="https://tuweblatino.com" className="text-slate-300 font-bold hover:underline hover:text-[#fac900]" target="_blank" rel="noreferrer">tuweblatino.com</a></p>
        </footer>
      </div>
    );
  }

  if (viewState === "auth") {
    return (
      <div className="min-h-screen bg-[#0b1727] bg-gradient-to-br from-[#0f3435] via-[#0b1727] to-[#070d18] flex items-center justify-center p-4">
        <div className="bg-[#0b1727] p-8 md:p-10 rounded-3xl shadow-2xl max-w-lg w-full border border-[#1c2e3e] relative overflow-hidden">
          <button 
            onClick={() => setViewState("landing")}
            className="absolute top-4 right-4 p-2 bg-[#1c2e3e]/80 backdrop-blur-sm border border-[#1c2e3e] shadow-sm hover:bg-[#2a4358] text-slate-400 hover:text-white rounded-full transition-colors z-20"
            title="Cerrar y volver al inicio"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
             <Server className="w-32 h-32 text-white" />
          </div>
          <div className="relative z-10">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-[#042628] text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-emerald-500/20">
                <FileArchive className="w-10 h-10" />
              </div>
              <h1 className="text-3xl md:text-3xl font-black text-white mb-2 tracking-tight leading-tight">
                Publica o lanza tu sitio web creado con IA <span className="text-[#fac900]">en minutos</span>
              </h1>
              <p className="text-slate-400 text-base font-medium">
                Sin altos costos ni gastos innecesarios.
              </p>
              <p className="text-sm text-slate-500 mt-2 font-medium">
                Patrocinado por <a href="https://tuweblatino.com" className="text-[#fac900] hover:underline" target="_blank" rel="noreferrer">tuweblatino.com</a>
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {authError && (
                <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {authError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-300">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="email" 
                    required 
                    className="w-full pl-10 pr-4 py-3 bg-[#0a1420] border border-[#1c2e3e] text-white rounded-xl focus:ring-2 focus:ring-[#fac900] focus:border-[#fac900] outline-none transition-all placeholder-slate-500"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {authMode !== "forgot" && (
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-300">Contraseña</label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="password" 
                      required 
                      className="w-full pl-10 pr-4 py-3 bg-[#0a1420] border border-[#1c2e3e] text-white rounded-xl focus:ring-2 focus:ring-[#fac900] focus:border-[#fac900] outline-none transition-all placeholder-slate-500"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {authMode === "register" && (
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-300">Código de Acceso</label>
                  <div className="relative">
                    <Key className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="password" 
                      required 
                      className="w-full pl-10 pr-4 py-3 bg-[#0a1420] border border-[#1c2e3e] text-white rounded-xl focus:ring-2 focus:ring-[#fac900] focus:border-[#fac900] outline-none transition-all placeholder-slate-500"
                      placeholder="Ingresa el código"
                      value={accessCode}
                      onChange={e => setAccessCode(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {authMode !== "forgot" && (
                <div className="space-y-1 pt-2">
                  <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Verificación de seguridad
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-1 bg-[#042628] rounded-xl py-3 px-4 font-mono font-bold text-emerald-400 tracking-wider flex items-center justify-between border border-[#1c2e3e]">
                       {captchaMath}
                       <button type="button" onClick={generateCaptcha} className="text-emerald-500 hover:text-emerald-300 transition-colors">
                         <RefreshCw className="w-4 h-4" />
                       </button>
                    </div>
                    <input 
                      type="number" 
                      required 
                      className="w-24 px-4 py-3 bg-[#0a1420] border border-[#1c2e3e] text-white rounded-xl focus:ring-2 focus:ring-[#fac900] focus:border-[#fac900] outline-none transition-all text-center font-bold"
                      placeholder="?"
                      value={captchaAnswer}
                      onChange={e => setCaptchaAnswer(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <button 
                type="submit"
                disabled={authLoading}
                className="w-full py-4 mt-4 bg-[#fac900] hover:bg-[#ffb000] disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-bold rounded-2xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 text-base flex justify-center items-center gap-2"
              >
                {authLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {authMode === "login" ? "Iniciar Sesión" : authMode === "register" ? "Crear Cuenta" : "Recuperar Contraseña"}
              </button>

              {authMode !== "forgot" && (
                <>
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-800"></div>
                    <span className="flex-shrink mx-4 text-slate-500 text-xs font-bold uppercase tracking-widest">O</span>
                    <div className="flex-grow border-t border-slate-800"></div>
                  </div>

                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={handleGoogleAuth}
                    className="w-full py-4 px-4 bg-white text-slate-900 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 text-base"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                    Entrar con Google
                  </button>
                </>
              )}
            </form>

            <div className="mt-6 flex flex-col gap-2 text-center text-sm font-medium text-slate-400">
               {authMode === "login" && (
                 <>
                   <button type="button" onClick={() => { setAuthMode("register"); setAuthError(""); }} className="hover:text-[#fac900] transition-colors">
                     ¿No tienes cuenta? Registrate aquí
                   </button>
                   <button type="button" onClick={() => { setAuthMode("forgot"); setAuthError(""); }} className="hover:text-[#fac900] transition-colors">
                     Olvidé mi contraseña
                   </button>
                 </>
               )}
               {authMode === "register" && (
                 <button type="button" onClick={() => { setAuthMode("login"); setAuthError(""); }} className="hover:text-[#fac900] transition-colors">
                   ¿Ya tienes cuenta? Inicia sesión aquí
                 </button>
               )}
               {authMode === "forgot" && (
                 <button type="button" onClick={() => { setAuthMode("login"); setAuthError(""); }} className="hover:text-[#fac900] transition-colors">
                   Volver al inicio de sesión
                 </button>
               )}
            </div>
            <p className="text-xs text-gray-400 mt-6 text-center">Acceso seguro con Firebase Email/Password + Captcha</p>
          </div>
        </div>
      </div>
    );
  }

  const renderFreeHosting = (onBack?: () => void) => (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      {onBack ? (
        <div className="flex items-center gap-4">
           <button onClick={onBack} className="p-2 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 rounded-full transition-colors text-gray-600 shrink-0">
             <ChevronRight className="w-5 h-5 rotate-180"/>
           </button>
           <h2 className="text-2xl font-black text-gray-900">Publica en Hosting de Prueba</h2>
        </div>
      ) : (
        <div className="space-y-2">
           <h2 className="text-2xl font-black text-gray-900">Pasos para publicar tu web</h2>
        </div>
      )}
      
      <p className="text-gray-600 text-base sm:text-lg">
        Sigue el paso a paso en este video tutorial y luego usa las credenciales a continuación para acceder al cPanel y publicar tu web.
      </p>

      <div className="rounded-3xl overflow-hidden shadow-xl border border-gray-200 bg-gray-100 aspect-video relative">
         <iframe 
           className="w-full h-full absolute inset-0"
           src="https://www.youtube.com/embed/n3H5U1E-k4o" 
           title="YouTube video player" 
           frameBorder="0" 
           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
           allowFullScreen>
         </iframe>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-6 sm:p-8 rounded-3xl space-y-6">
         <div className="flex items-center gap-3">
           <Server className="w-6 h-6 text-blue-600 shrink-0" />
           <h3 className="text-lg sm:text-xl font-bold text-gray-900">Tus Datos de Acceso cPanel</h3>
         </div>
         
         {userProfile?.hosting ? (
           <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-4 py-3 border border-blue-100 rounded-2xl gap-3 shadow-sm">
                 <span className="text-sm font-medium text-gray-500 w-24 shrink-0">URL:</span>
                 <span className="font-mono text-xs sm:text-sm text-blue-700 break-all">{userProfile.hosting.url}</span>
                 <a href={userProfile.hosting.url} target="_blank" rel="noreferrer" className="p-2 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-700 transition flex-shrink-0 self-end sm:self-auto" title="Abrir en nueva pestaña">
                   <ExternalLink className="w-4 h-4"/>
                 </a>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-4 py-3 border border-blue-100 rounded-2xl gap-3 shadow-sm">
                 <span className="text-sm font-medium text-gray-500 w-24 shrink-0">Usuario:</span>
                 <span className="font-mono text-xs sm:text-sm text-gray-900 break-all">{userProfile.hosting.user}</span>
                 <button onClick={() => navigator.clipboard.writeText(userProfile.hosting!.user)} className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl text-gray-600 transition flex-shrink-0 self-end sm:self-auto" title="Copiar usuario">
                   <Copy className="w-4 h-4"/>
                 </button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white px-4 py-3 border border-blue-100 rounded-2xl gap-3 shadow-sm">
                 <span className="text-sm font-medium text-gray-500 w-24 shrink-0">Contraseña:</span>
                 <span className="font-mono text-xs sm:text-sm text-gray-900 break-all">{userProfile.hosting.pass}</span>
                 <button onClick={() => navigator.clipboard.writeText(userProfile.hosting!.pass)} className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-xl text-gray-600 transition flex-shrink-0 self-end sm:self-auto" title="Copiar contraseña">
                   <Copy className="w-4 h-4"/>
                 </button>
              </div>
           </div>
         ) : (
           <div className="bg-white p-6 border border-blue-100 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                 <Lock className="w-6 h-6" />
              </div>
              <p className="text-gray-600 font-medium">Tus credenciales de hosting de prueba se están preparando.</p>
              <p className="text-sm text-gray-400">Si acabas de registrarte, espera unos minutos o contacta a soporte por WhatsApp para que te asignemos un espacio privado.</p>
              <button 
                onClick={() => window.open('https://wa.me/50762417266?text=Hola,%20solicito%20mis%20credenciales%20de%20hosting%20de%20prueba%20para%20WebIA', '_blank')}
                className="inline-flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline"
              >
                Solicitar credenciales por WhatsApp <ExternalLink className="w-4 h-4" />
              </button>
           </div>
         )}
      </div>
    </div>
  );

  const openCheckout = (planId: string) => {
    if (!user) {
      alert("Debes iniciar sesión para suscribirte a un plan.");
      setViewState("auth");
      return;
    }
    setCheckoutPlan(planId);
    setCheckoutData(prev => ({ ...prev, correo: user?.email || "" }));
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPlan || !user) return;
    
    try {
      const dominioFinal = checkoutData.tipoDominio === "propio" 
        ? checkoutData.dominioPropio 
        : `${checkoutData.subdominioPrefix}${checkoutData.subdominioSuffix}`;
      
      const messageText = `Hola, quiero suscribirme al plan *${checkoutPlan.toUpperCase()}*.\n\n*Mis detalles:*\nNombre: ${checkoutData.nombre}\nCorreo: ${checkoutData.correo}\nTeléfono: ${checkoutData.telefono}\nDominio: ${dominioFinal}\nForma de pago elegida: ${checkoutData.formaPago === 'link_pago' ? 'Link de pago (Visa/Mastercard)' : checkoutData.formaPago === 'transferencia' ? 'Transferencia bancaria' : 'PayPal'}`;
      const whatsappMessage = encodeURIComponent(messageText);
      const url = `https://wa.me/50762417266?text=${whatsappMessage}`;
      
      // Abrimos WhatsApp inmediatamente para evitar el bloqueador de popups (que se activa si hay mucho tiempo de espera en el await)
      window.open(url, '_blank', 'noopener,noreferrer');

      setCheckoutPlan(null);

      // Guardamos en Firebase en segundo plano
      const path = `users/${user.uid}`;
      try {
        await setDoc(doc(db, "users", user.uid), { plan: checkoutPlan }, { merge: true });
        setUserProfile((prev) => ({ ...prev, plan: checkoutPlan || "free" }));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }

    } catch(err) {
      console.error("Error saving checkout plan", err);
      // No mostramos alerta porque lo importante era abrir el WhatsApp y ya se hizo
    }
  };

  const renderHostingPlans = () => (
    <div className="space-y-8 bg-slate-900 rounded-[2.5rem] p-8 lg:p-12 text-white shadow-2xl relative">
      {checkoutPlan && (
        <div className="absolute inset-0 bg-slate-900 z-50 rounded-[2.5rem] flex flex-col p-8 overflow-y-auto w-full h-full">
          <button onClick={() => setCheckoutPlan(null)} className="self-end text-slate-400 hover:text-white p-2">
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-xl mx-auto w-full text-left space-y-6 pb-12">
            <h3 className="text-3xl font-bold tracking-tight text-white mb-2">Suscripción de Plan</h3>
            <p className="text-slate-400 text-sm">Estás solicitando el plan <span className="font-bold text-white uppercase">{checkoutPlan}</span></p>
            
            <form onSubmit={handleCheckoutSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Nombre completo</label>
                <input required type="text" value={checkoutData.nombre} onChange={e => setCheckoutData({...checkoutData, nombre: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="Ej. Juan Pérez" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">Correo electrónico</label>
                <input required type="email" value={checkoutData.correo} onChange={e => setCheckoutData({...checkoutData, correo: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="juan@ejemplo.com" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-300">WhatsApp / Teléfono</label>
                <input required type="tel" value={checkoutData.telefono} onChange={e => setCheckoutData({...checkoutData, telefono: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="+507 6000-0000" />
              </div>
              
              <div className="pt-4 border-t border-slate-700 space-y-4">
                <label className="text-sm font-medium text-slate-300">¿Qué tipo de dominio utilizarás?</label>
                <div className="grid grid-cols-2 gap-4">
                  <button type="button" onClick={() => setCheckoutData({...checkoutData, tipoDominio: "propio"})} className={`py-3 px-4 border rounded-xl text-sm font-medium transition-colors ${checkoutData.tipoDominio === "propio" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"}`}>
                    Tengo dominio propio
                  </button>
                  <button type="button" onClick={() => setCheckoutData({...checkoutData, tipoDominio: "subdominio"})} className={`py-3 px-4 border rounded-xl text-sm font-medium transition-colors ${checkoutData.tipoDominio === "subdominio" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"}`}>
                    Quiero un subdominio
                  </button>
                </div>
                
                {checkoutData.tipoDominio === "propio" ? (
                  <div className="space-y-1.5 mt-4">
                    <label className="text-sm font-medium text-slate-300">Escribe tu dominio propio</label>
                    <input required type="text" value={checkoutData.dominioPropio} onChange={e => setCheckoutData({...checkoutData, dominioPropio: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="ej. midominio.com" />
                  </div>
                ) : (
                  <div className="space-y-1.5 mt-4">
                    <label className="text-sm font-medium text-slate-300">Elige tu subdominio gratis</label>
                    <div className="flex">
                      <input required type="text" value={checkoutData.subdominioPrefix} onChange={e => setCheckoutData({...checkoutData, subdominioPrefix: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")})} className="w-3/5 bg-slate-800 border border-r-0 border-slate-700 rounded-l-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="minegocio" />
                      <select value={checkoutData.subdominioSuffix} onChange={e => setCheckoutData({...checkoutData, subdominioSuffix: e.target.value})} className="w-2/5 bg-slate-700 border border-slate-600 rounded-r-xl px-2 py-3 text-white text-sm focus:outline-none">
                        <option value=".misitiowebpro.com">.misitiowebpro.com</option>
                        <option value=".websiteya.com">.websiteya.com</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-slate-700 space-y-4">
                <label className="text-sm font-medium text-slate-300">Seleccione la forma de pago</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button type="button" onClick={() => setCheckoutData({...checkoutData, formaPago: "paypal"})} className={`py-3 px-3 border rounded-xl text-sm font-medium transition-colors ${checkoutData.formaPago === "paypal" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"}`}>
                    PayPal
                  </button>
                  <button type="button" onClick={() => setCheckoutData({...checkoutData, formaPago: "transferencia"})} className={`py-3 px-3 border rounded-xl text-sm font-medium transition-colors ${checkoutData.formaPago === "transferencia" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"}`}>
                    Transferencia
                  </button>
                  <button type="button" onClick={() => setCheckoutData({...checkoutData, formaPago: "link_pago"})} className={`py-3 px-3 border rounded-xl text-sm font-medium transition-colors ${checkoutData.formaPago === "link_pago" ? "bg-blue-600 border-blue-500 text-white" : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500"}`}>
                    Link Pago (Visa/MC)
                  </button>
                </div>
              </div>

              <button type="submit" className="w-full py-4 mt-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg transition-all hover:-translate-y-0.5">
                Enviar Solicitud / Suscribirse
              </button>
            </form>
          </div>
        </div>
      )}
      <div className="text-center space-y-4 mb-12 max-w-3xl mx-auto">
        <h3 className="text-3xl lg:text-4xl font-bold tracking-tight">Elige el plan que se adapta a tu momento actual</h3>
        <p className="text-slate-400 text-lg">Precios reales, sin sorpresas ocultas. Todos los planes incluyen SSL, cPanel y soporte por WhatsApp desde el primer día.</p>
        
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20 text-sm font-medium">
            <ShieldCheck className="w-4 h-4" />
            7 días de garantía. Dinero de vuelta, sin preguntas.
          </div>
          <div className="flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full border border-blue-500/20 text-sm font-medium">
            <CreditCard className="w-4 h-4" />
            Pagos online: Visa, Mastercard, PayPal y Link de Pago
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 lg:gap-8 items-stretch">
        {/* Gratis */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-8 flex flex-col hover:border-slate-500 transition-colors h-full">
          <div className="bg-slate-800 rounded-2xl p-6 -mx-8 -mt-8 mb-8 border-b border-slate-700 min-h-[170px]">
            <h4 className="text-2xl font-bold mb-2 text-white">Gratis</h4>
            <p className="text-slate-400 text-sm h-10">La mejor opción para aprender, probar y validar tu idea.</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-slate-300">$</span>
              <span className="text-5xl font-black tracking-tight">0</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Ilimitado en el tiempo</p>
          </div>
          <ul className="space-y-4 flex-1 text-sm text-slate-300 mb-8">
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> 1 conversión IA gratuita</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> 5GB NVMe de almacenamiento</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> Usa tu propio dominio o subdominio gratis</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> Cuentas de email incluidas</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> Bases de datos MySQL</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> Aplicaciones web tipo WordPress</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> 99% Uptime garantizado</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> Acceso FTP, PHP</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" /> Panel de control cPanel</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" /> SSL Gratis</li>
          </ul>
          <div className="mt-auto pt-4">
            <button onClick={() => openCheckout("free")} className="block w-full py-4 px-4 border border-slate-600 hover:bg-slate-700 rounded-2xl text-center font-bold transition-all">
              Contratar →
            </button>
          </div>
        </div>

        {/* Básico */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-8 flex flex-col hover:border-slate-500 transition-colors h-full">
          <div className="bg-slate-800 rounded-2xl p-6 -mx-8 -mt-8 mb-8 border-b border-slate-700 min-h-[170px]">
            <h4 className="text-2xl font-bold mb-2">Básico</h4>
            <p className="text-slate-400 text-sm h-10">Perfecto para comenzar tu presencia digital</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-slate-300">$</span>
              <span className="text-5xl font-black tracking-tight">9.97</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">por año · Sin costos adicionales</p>
          </div>
          <ul className="space-y-4 flex-1 text-sm text-slate-300 mb-8">
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> 10 conversiones IA gratuitas</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> Hasta 10 dominios alojados</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> 1 TB SSD NVMe de almacenamiento</li>
            <li className="flex items-start gap-3 text-white font-medium"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> Ancho de banda ilimitado</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> Hasta 10 correos por dominio</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" /> cPanel incluido</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" /> SSL Gratis en todos los dominios</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" /> Soporte técnico por WhatsApp</li>
          </ul>
          <div className="mt-auto pt-4">
            <button onClick={() => openCheckout("basico")} className="block w-full py-4 px-4 border border-slate-600 hover:bg-slate-700 rounded-2xl text-center font-bold transition-all">
              Contratar →
            </button>
          </div>
        </div>

        {/* Pro */}
        <div className="bg-slate-800/80 border-2 border-blue-500 rounded-3xl p-8 flex flex-col relative transform md:-translate-y-4 shadow-2xl shadow-blue-500/20 h-full">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-lg flex items-center gap-1.5">
            <span className="text-yellow-300">★</span> MÁS POPULAR
          </div>
          <div className="bg-slate-800 rounded-2xl p-6 -mx-8 -mt-8 mb-8 border-b border-slate-700 min-h-[170px]">
            <h4 className="text-2xl font-bold text-blue-400 mb-2">Pro</h4>
            <p className="text-slate-400 text-sm h-10">El preferido por emprendedores y negocios en crecimiento</p>
            <div className="mt-4 flex items-baseline gap-1 text-blue-400">
              <span className="text-2xl font-semibold">$</span>
              <span className="text-5xl font-black text-white tracking-tight">24.97</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">por año · Ahorra vs contratar varios hostings</p>
          </div>
          <ul className="space-y-4 flex-1 text-sm text-slate-300 mb-8">
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> <span className="text-white font-medium">25 conversiones IA</span> gratuitas</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> <span className="text-white font-medium">Hasta 100 dominios</span> alojados</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> <span className="text-white font-medium">2 TB SSD NVMe</span> de almacenamiento</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> Ancho de banda ilimitado</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> Hasta 100 correos por dominio</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" /> cPanel incluido</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" /> SSL Gratis en todos los dominios</li>
            <li className="flex items-start gap-3 font-medium text-blue-300"><CheckCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" /> Soporte prioritario por WhatsApp</li>
          </ul>
          <div className="mt-auto pt-4">
            <button onClick={() => openCheckout("pro")} className="block w-full py-4 px-4 bg-blue-500 hover:bg-blue-600 rounded-2xl text-center font-bold text-white transition-all shadow-md">
              Contratar →
            </button>
          </div>
        </div>

        {/* Master */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-3xl p-8 flex flex-col hover:border-slate-500 transition-colors h-full">
          <div className="bg-slate-800 rounded-2xl p-6 -mx-8 -mt-8 mb-8 border-b border-slate-700 min-h-[170px]">
            <h4 className="text-2xl font-bold text-purple-400 mb-2">Master</h4>
            <p className="text-slate-400 text-sm h-10">Recursos ilimitados para agencias y empresas</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-slate-300">$</span>
              <span className="text-5xl font-black tracking-tight">34.97</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">por año · La solución completa</p>
          </div>
          <ul className="space-y-4 flex-1 text-sm text-slate-300 mb-8">
            <li className="flex items-start gap-3 text-white font-medium"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> 50 conversiones IA incluidas</li>
            <li className="flex items-start gap-3 text-white font-medium"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> Dominio gratis por 1 año (luego $19.97 extra)</li>
            <li className="flex items-start gap-3 text-white font-medium"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> Dominios ilimitados alojados</li>
            <li className="flex items-start gap-3 text-white font-medium"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> Almacenamiento NVMe ilimitado</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> Ancho de banda ilimitado</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" /> Correos ilimitados por dominio</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" /> cPanel incluido</li>
            <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" /> SSL Gratis en todos los dominios</li>
            <li className="flex items-start gap-3 font-medium text-purple-300"><CheckCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" /> Soporte VIP por WhatsApp y llamadas</li>
          </ul>
          <div className="mt-auto pt-4">
            <button onClick={() => openCheckout("master")} className="block w-full py-4 px-4 bg-purple-600 hover:bg-purple-700 rounded-2xl text-center font-bold transition-all text-white shadow-md">
              Contratar →
            </button>
          </div>
        </div>
      </div>

      <div className="pt-10 text-center text-slate-500 text-sm">
        Patrocinado por <a href="https://tuweblatino.com" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors underline decoration-blue-500/30 underline-offset-4">tuweblatino.com</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-6 shrink-0 relative z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg lg:hidden"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0">
            W<span className="text-blue-200">F</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-gray-800 leading-none">WebIAFácil</span>
            <span className="text-[10px] text-gray-400 mt-0.5 font-medium">Patrocinado por <a href="https://tuweblatino.com" className="text-blue-500 hover:underline" target="_blank" rel="noreferrer">tuweblatino.com</a></span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full shadow-sm" />
            ) : (
              <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold shadow-sm">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.email}</span>
          </div>
          <button onClick={signOut} className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50" title="Cerrar sesión">
            <LogOut className="w-5 h-5"/>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-gray-900/50 z-10 lg:hidden" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`absolute lg:static inset-y-0 left-0 z-20 w-72 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
          <div className="p-4 flex-1 overflow-y-auto space-y-8">
            {/* Top Menu */}
            <div>
              <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Plataforma</p>
              <nav className="space-y-1">
                <button 
                  onClick={() => { setActiveTab("tutoriales"); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${activeTab === "tutoriales" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
                >
                  <Terminal className={`w-5 h-5 ${activeTab === "tutoriales" ? "text-blue-600" : "text-gray-400"}`} />
                  Tutoriales Paso a Paso
                </button>
                <button 
                  onClick={() => { setActiveTab("prompt-generator"); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${activeTab === "prompt-generator" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
                >
                  <FileArchive className={`w-5 h-5 ${activeTab === "prompt-generator" ? "text-blue-600" : "text-gray-400"}`} />
                  Generador de Prompts
                </button>
                <button 
                  onClick={() => { setActiveTab("converter"); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${activeTab === "converter" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
                >
                  <FileArchive className={`w-5 h-5 ${activeTab === "converter" ? "text-blue-600" : "text-gray-400"}`} />
                  Convertir Proyecto IA
                </button>
                <button 
                  onClick={() => { setActiveTab("free-hosting"); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${activeTab === "free-hosting" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
                >
                  <Server className={`w-5 h-5 ${activeTab === "free-hosting" ? "text-blue-600" : "text-gray-400"}`} />
                  Lanzar Gratis
                </button>
                <button 
                  onClick={() => { setActiveTab("hosting"); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${activeTab === "hosting" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
                >
                  <HardDrive className={`w-5 h-5 ${activeTab === "hosting" ? "text-blue-600" : "text-gray-400"}`} />
                  Hosting Premium
                </button>
                <button 
                  onClick={() => { setActiveTab("marketplace"); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${activeTab === "marketplace" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
                >
                  <ShoppingBag className={`w-5 h-5 ${activeTab === "marketplace" ? "text-blue-600" : "text-gray-400"}`} />
                  Marketplace <span className="ml-auto text-[10px] bg-blue-100 text-blue-700 py-0.5 px-2 rounded-full font-bold">Dominios</span>
                </button>
                <button 
                  onClick={() => { setActiveTab("afiliados"); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${activeTab === "afiliados" ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
                >
                  <Users className={`w-5 h-5 ${activeTab === "afiliados" ? "text-blue-600" : "text-gray-400"}`} />
                  Afiliados <span className="ml-auto text-[10px] bg-gray-100 text-gray-500 py-0.5 px-2 rounded-full font-bold">Pronto</span>
                </button>
              </nav>
            </div>

            {/* Bottom Support Menu */}
            <div>
              <p className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Comunidad y Soporte</p>
              <nav className="space-y-2">
                <a 
                  href="https://wa.me/50762417266" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full flex items-center gap-3 px-3 py-3 border border-gray-200 rounded-xl font-medium transition-colors hover:border-green-300 hover:bg-green-50 group"
                >
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 group-hover:bg-green-500 group-hover:text-white transition-colors">
                     <HeadphonesIcon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                     <span className="text-gray-900 text-sm">Soporte WhatsApp</span>
                     <span className="text-xs text-gray-500 font-mono">+507 62417266</span>
                  </div>
                </a>
                
                <a 
                  href="https://whatsapp.com/channel/0029VbCOj5nKGGGN0DQ4oe0W" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full flex items-center gap-3 px-3 py-3 bg-slate-900 border border-transparent rounded-xl font-medium transition-all hover:bg-slate-800 hover:shadow-lg shadow-sm text-white group"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                     <MessageCircle className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                     <span className="text-sm font-bold">Comunidad</span>
                     <span className="text-xs text-slate-400">Tuweblatino.com</span>
                  </div>
                </a>
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col items-center p-4 lg:p-8 overflow-y-auto w-full relative">
          
          {activeTab === "tutoriales" && (
            <div className="w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 space-y-8 pb-12">
               <header className="px-4 py-2 border-b border-gray-100 pb-8">
                 <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-medium text-xs mb-4 border border-blue-100">
                    Empieza aquí
                 </div>
                 <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Tutoriales Prácticos</h1>
                 <p className="text-gray-500 mt-2 text-lg max-w-2xl">Aprende paso a paso cómo crear tu sitio web fácil, montarlo en cPanel o usar servicios como Vercel y Render (aunque estos últimos pueden resultar más caros a futuro).</p>
               </header>
               
               <div className="grid md:grid-cols-2 gap-8 px-4">
                  {/* Tutorial 1 */}
                  <div className="bg-white border text-left border-gray-100 shadow-sm rounded-3xl overflow-hidden hover:border-gray-300 transition-colors">
                     <div className="aspect-video bg-gray-100 relative">
                        <iframe 
                          className="w-full h-full absolute inset-0"
                          src="https://www.youtube.com/embed/n3H5U1E-k4o" 
                          title="Crear y subir a cPanel" 
                          frameBorder="0" 
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                          allowFullScreen>
                        </iframe>
                     </div>
                     <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Crear Sitio con IA y subirlo a cPanel</h3>
                        <p className="text-gray-500 text-sm">La forma más económica y con control absoluto. Ideal para emprendedores y pymes que quieren dominios y bases de datos propias.</p>
                     </div>
                  </div>

                  {/* Tutorial 2 */}
                  <div className="bg-white border text-left border-gray-100 shadow-sm rounded-3xl overflow-hidden hover:border-gray-300 transition-colors">
                     <div className="aspect-video bg-gray-100 relative flex items-center justify-center">
                        <span className="text-gray-400 font-medium">Video en preparación...</span>
                     </div>
                     <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Alternativas Clould: Vercel y Render</h3>
                        <p className="text-gray-500 text-sm">Aprende cómo usar plataformas en la nube. Toma en cuenta que escalar en estas plataformas suele tener un costo más elevado.</p>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === "prompt-generator" && renderPromptGenerator()}

          {activeTab === "converter" && renderConverter()}

          {activeTab === "free-hosting" && (
            <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 space-y-6 pt-2">
              <header className="px-4 py-2">
                 <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Lanzar Sitio Gratis</h1>
                 <p className="text-gray-500 mt-2 text-lg">Prueba gratis y descubre lo fácil que es lanzar tu sitio web.</p>
              </header>
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 lg:p-8">
                 {renderFreeHosting()}
              </div>
            </div>
          )}

          {activeTab === "hosting" && (
            <div className="w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 space-y-6">
              <header className="px-4 py-2">
                 <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Hosting Premium</h1>
                 <p className="text-gray-500 mt-2 text-lg">Impulsa tu proyecto con la mejor infraestructura patrocinada por tuweblatino.com</p>
              </header>
              {renderHostingPlans()}
            </div>
          )}

          {activeTab === "marketplace" && (
            <div className="w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 space-y-8 pb-12">
               <header className="px-4 py-2 border-b border-gray-100 pb-8">
                 <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">Marketplace: Dominios</h1>
                 <p className="text-gray-500 mt-2 text-lg">Asegura tu identidad en internet. Compra tu dominio ideal hoy mismo de manera fácil y segura.</p>
               </header>
               
               <div className="grid md:grid-cols-2 gap-8 px-4 items-center">
                  <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-8 opacity-10">
                        <ShoppingBag className="w-32 h-32" />
                     </div>
                     <div className="relative z-10 space-y-6">
                        <h3 className="text-2xl font-bold text-blue-400">Registra tu dominio .com, .net, .org</h3>
                        <div className="flex items-baseline gap-1 text-white">
                           <span className="text-3xl font-semibold">$</span>
                           <span className="text-6xl font-black tracking-tight">14.97</span>
                        </div>
                        <p className="text-slate-400 font-medium">por año · Renovación al mismo precio garantizada</p>
                        
                        <ul className="space-y-4 pt-4 text-sm text-slate-300">
                           <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" /> Gestión DNS completa incluida</li>
                           <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" /> Protección de privacidad Whois gratuita</li>
                           <li className="flex items-start gap-3"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" /> Pagos online: Visa, Mastercard, PayPal</li>
                        </ul>
                     </div>
                  </div>
                  
                  <div className="space-y-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
                     <h3 className="text-2xl font-bold text-gray-900 leading-tight">Es fácil, seguro y te ayudamos con todo lo técnico.</h3>
                     <p className="text-gray-600 text-lg">
                        Te sentirás 100% seguro y acompañado en cada paso del proceso. Envíanos tu solicitud por WhatsApp y nosotros te asistimos.
                     </p>
                     
                     <a 
                        href="https://wa.me/50762417266?text=Quiero%20mi%20dominio%20.....%20www...." 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-3 w-full py-4 px-6 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-green-500/20 text-lg hover:-translate-y-1"
                     >
                        <MessageCircle className="w-6 h-6" /> Pedir mi dominio por WhatsApp
                     </a>
                     <p className="text-sm text-gray-400">Atención personalizada inmediata al +507 62417266</p>
                  </div>
               </div>
            </div>
          )}

          {activeTab === "afiliados" && (
            <div className="w-full max-w-4xl mx-auto text-center mt-20 animate-in fade-in zoom-in-95 duration-500 p-6">
               <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                 <Users className="w-12 h-12"/>
               </div>
               <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4 tracking-tight">Próximamente</h2>
               <p className="text-gray-500 text-lg max-w-md mx-auto">
                 Estamos trabajando arduamente en la nueva sección de <span className="font-bold text-gray-900">Afiliados y comisiones</span>. ¡Vuelve muy pronto!
               </p>
            </div>
          )}

          {/* New Professional Footer */}
          <footer className="w-full mt-20 pt-10 border-t border-gray-100 pb-10">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="flex flex-wrap justify-center gap-4 sm:gap-10">
                <a href="https://webiafacil.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-900 font-bold transition-colors">webiafacil.com</a>
                <a href="https://tuweblatino.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-900 font-bold transition-colors">tuweblatino.com</a>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-gray-300 uppercase tracking-widest">
                  Creado con <span className="text-[#fac900]">webiafacil.com</span> y <span className="text-blue-500">tuweblatino.com</span>
                </p>
                <p className="text-[10px] text-gray-300 font-bold uppercase">© {new Date().getFullYear()} Todos los derechos reservados</p>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
