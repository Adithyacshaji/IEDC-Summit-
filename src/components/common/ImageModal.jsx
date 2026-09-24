import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function ImageModal({ imageUrl, altText, onClose }) {
  if (!imageUrl) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-9999999 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div 
        className="relative max-w-full max-h-full flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-all"
        >
          <X size={24} />
        </button>
        <img 
          src={imageUrl} 
          alt={altText || 'Full View'} 
          className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
        />
      </div>
    </div>,
    document.body
  );
}
