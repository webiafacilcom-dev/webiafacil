import React, { useRef, useState } from "react";
import { UploadCloud, FileArchive, X, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UploadBoxProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export const UploadBox: React.FC<UploadBoxProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const validateAndSelect = (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setError("Solo se permiten archivos .zip");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("El archivo es demasiado grande (Máximo 100MB)");
      return;
    }
    setSelectedFile(file);
    onFileSelect(file);
  };

  const clearSelection = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full">
      <motion.div
        whileHover={!disabled && !selectedFile ? { scale: 1.005 } : {}}
        whileTap={!disabled && !selectedFile ? { scale: 0.995 } : {}}
        className={`relative w-full h-52 border-2 border-dashed rounded-[24px] transition-all duration-300 flex flex-col items-center justify-center p-6 
          ${isDragging ? "border-[#fac900] bg-[#fac900]/5 scale-[1.01]" : "border-slate-200 bg-slate-50 hover:bg-slate-100"}
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          ${selectedFile ? "border-emerald-200 bg-emerald-50/30" : ""}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !selectedFile && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && validateAndSelect(e.target.files[0])}
        />

        <AnimatePresence mode="wait">
          {!selectedFile ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col items-center text-center px-4"
            >
              <div className="w-12 h-12 bg-white shadow-lg rounded-xl flex items-center justify-center mb-3 text-[#fac900]">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Sube tu proyecto</h3>
              <p className="text-slate-500 text-xs max-w-[200px] leading-relaxed">
                Suelta tu .zip aquí o haz clic. (Máximo 100MB)
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="selected"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center w-full px-4 text-center"
            >
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-3">
                <FileArchive className="w-6 h-6" />
              </div>
              <div className="bg-white border border-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm max-w-full">
                <span className="font-bold text-slate-900 text-xs truncate max-w-[150px]">{selectedFile.name}</span>
                <button 
                  onClick={clearSelection}
                  className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-emerald-600 text-xs font-bold mt-3 uppercase tracking-wider">¡Archivo listo!</p>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -bottom-10 left-0 right-0 flex justify-center"
          >
            <div className="bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-100 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};
