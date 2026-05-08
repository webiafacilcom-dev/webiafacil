import React from "react";
import { CheckCircle2, Loader2, Circle, AlertCircle, FileSearch, Hammer, Package, Upload } from "lucide-react";
import { motion } from "motion/react";

type StepStatus = "pending" | "extracting" | "analyzing" | "installing" | "building" | "packaging" | "completed" | "error";

interface ProgressStepsProps {
  currentStatus: StepStatus;
  logs: string[];
}

const steps = [
  { id: "extracting", label: "Extrayendo Archivos", icon: Upload },
  { id: "analyzing", label: "Analizando Proyecto", icon: FileSearch },
  { id: "installing", label: "Preparando Entorno", icon: Hammer },
  { id: "building", label: "Compilando Proyecto", icon: Hammer },
  { id: "packaging", label: "Empaquetando para cPanel", icon: Package },
];

export const ProgressSteps: React.FC<ProgressStepsProps> = ({ currentStatus, logs }) => {
  const getStepIcon = (stepId: string) => {
    const statusIdx = steps.findIndex(s => s.id === currentStatus);
    const stepIdx = steps.findIndex(s => s.id === stepId);

    if (currentStatus === "error" && stepIdx === statusIdx) return AlertCircle;
    if (currentStatus === "completed" || stepIdx < statusIdx) return CheckCircle2;
    if (stepId === currentStatus) return Loader2;
    return Circle;
  };

  const getStepColor = (stepId: string) => {
    const statusIdx = steps.findIndex(s => s.id === currentStatus);
    const stepIdx = steps.findIndex(s => s.id === stepId);

    if (currentStatus === "error" && stepIdx === statusIdx) return "text-red-500 bg-red-50";
    if (currentStatus === "completed" || stepIdx < statusIdx) return "text-emerald-500 bg-emerald-50";
    if (stepId === currentStatus) return "text-[#fac900] bg-[#fac900]/10";
    return "text-slate-300 bg-slate-50";
  };

  return (
    <div className="w-full space-y-6">
      <div className="relative">
        <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-slate-100 -z-10" />
        <div className="space-y-6">
          {steps.map((step, index) => {
            const Icon = getStepIcon(step.id);
            const isActive = step.id === currentStatus;
            const isCompleted = steps.findIndex(s => s.id === currentStatus) > index || currentStatus === "completed";

            return (
              <motion.div 
                key={step.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 shadow-sm border border-transparent
                  ${getStepColor(step.id)}
                  ${isActive ? "border-[#fac900]/20 shadow-[#fac900]/10" : ""}
                `}>
                  <Icon className={`w-5 h-5 ${isActive ? "animate-spin" : ""}`} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-base font-bold transition-colors duration-500 ${isActive ? "text-slate-900" : isCompleted ? "text-emerald-600" : "text-slate-400"}`}>
                    {step.label}
                  </span>
                  {isActive && (
                    <motion.span 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[10px] font-bold text-[#fac900] uppercase tracking-widest mt-0.5"
                    >
                      En proceso...
                    </motion.span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl p-4 font-mono text-[10px] text-slate-300 h-36 overflow-y-auto custom-scrollbar border border-slate-800 shadow-lg">
        <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2">
           <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
           <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
           <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
           <span className="ml-2 font-bold text-[10px] text-slate-500 uppercase tracking-widest">Logs de Compilación</span>
        </div>
        {logs.map((log, i) => (
          <div key={i} className="mb-1 opacity-80 hover:opacity-100 transition-opacity whitespace-pre-wrap">
            <span className="text-[#fac900] mr-2">›</span> {log}
          </div>
        ))}
        {currentStatus === "building" && (
           <div className="animate-pulse text-emerald-400 mt-2 font-bold">Compilando assets... esto puede tardar 1-2 minutos.</div>
        )}
      </div>
    </div>
  );
};
