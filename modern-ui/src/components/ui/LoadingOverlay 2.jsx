import React from 'react';

const LoadingOverlay = ({ message = "Caricamento in corso..." }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white/90 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4 border border-white/50">
        <div className="w-12 h-12 border-4 border-[#8bc53f]/20 border-t-[#8bc53f] rounded-full animate-spin"></div>
        <p className="text-[#0f172a] font-bold text-lg">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
