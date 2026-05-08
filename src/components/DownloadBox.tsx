import React from "react";
import { Download, RefreshCw, ExternalLink, ShieldCheck, Zap, Server } from "lucide-react";
import { motion } from "motion/react";

interface DownloadBoxProps {
  downloadUrl: string;
  onReset: () => void;
}

export const DownloadBox: React.FC<DownloadBoxProps> = ({ downloadUrl, onReset }) => {
  return (
    <div className="w-full space-y-8 animate-in fade-in zoom-in-95 duration-700">
      <div className="bg-emerald-50 border border-emerald-100 rounded-[32px] p-8 text-center relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="w-20 h-20 bg-emerald-500 text-white rounded-[24px] flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
            <Download className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">¡Tu ZIP está listo!</h2>
          <p className="text-slate-600 max-w-sm mx-auto font-medium">
            Hemos compilado tu proyecto IA y optimizado todos los assets para una carga ultra rápida en cPanel.
          </p>
          
          <div className="pt-4 flex flex-col gap-3 max-w-sm mx-auto">
            <a 
              href={downloadUrl}
              className="group w-full py-5 px-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black transition-all shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-3 text-lg active:scale-[0.98]"
            >
              Descargar ZIP Final
              <Download className="w-5 h-5 group-hover:translate-y-1 transition-transform" />
            </a>
            
            <button 
              onClick={onReset}
              className="w-full py-4 text-slate-500 hover:text-slate-800 font-bold transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Convertir otro proyecto
            </button>
          </div>
        </div>
        
        {/* Background purely decorative */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 opacity-10 rotate-12">
           <Zap className="w-64 h-64 text-emerald-600" />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-white border border-slate-100 p-8 rounded-[32px] shadow-sm hover:shadow-xl transition-all group"
        >
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
            <Server className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Hosting Recomendado</h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Lanza tu sitio en TuWebLatino.com con soporte especializado en IA y cPanel optimizado.
          </p>
          <a 
            href="https://tuweblatino.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 font-black text-sm uppercase tracking-widest hover:gap-3 transition-all"
          >
            Ver Planes <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="bg-[#fac900]/5 border border-[#fac900]/10 p-8 rounded-[32px] shadow-sm hover:shadow-xl transition-all group"
        >
          <div className="w-14 h-14 bg-[#fac900]/10 text-[#fac900] rounded-2xl flex items-center justify-center mb-6 group-hover:bg-[#fac900] group-hover:text-gray-900 transition-all">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Seguridad Garantizada</h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Incluimos un .htaccess configurado para proteger tu index.html y rutas SPA de forma profesional.
          </p>
          <span className="inline-flex items-center gap-2 text-[#fac900] font-black text-sm uppercase tracking-widest">
            Auditado por WebIA <ShieldCheck className="w-4 h-4" />
          </span>
        </motion.div>
      </div>
    </div>
  );
};
