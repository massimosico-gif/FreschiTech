import React from 'react';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Conferma Azione", 
  message = "Sei sicuro di voler procedere?",
  confirmText = "Conferma",
  cancelText = "Annulla",
  type = "danger"
}) => {
  if (!isOpen) return null;

  const accentColor = type === "danger" ? "#ef4444" : "#8bc53f";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white/95 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-white/50 animate-scale-up">
        <div className="p-8">
          <h3 className="text-xl font-black text-[#0f172a] mb-2">{title}</h3>
          <p className="text-[#64748b] leading-relaxed">{message}</p>
        </div>
        
        <div className="p-6 bg-slate-50/50 flex gap-3 justify-end border-t border-slate-100">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-2xl font-bold text-[#64748b] hover:bg-white transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            style={{ backgroundColor: accentColor }}
            className="px-6 py-3 rounded-2xl font-bold text-white shadow-lg hover:brightness-110 transition-all active:scale-95"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
