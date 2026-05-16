import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Funzione di utilità per unire le classi Tailwind in modo intelligente
 */
function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const Card = ({ children, onClick, className = "", hoverEffect = true }) => {
  // Controlla se la classe passata contiene già una definizione di hover per lo sfondo
  const hasCustomHoverBg = className.includes('hover:bg-')

  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative bg-white/40 backdrop-blur-md border border-white/50 rounded-[2.5rem] p-8",
        "transition-all duration-500 flex flex-col h-full",
        hoverEffect && !hasCustomHoverBg && "hover:bg-white/60 hover:shadow-2xl hover:shadow-accent/10 cursor-pointer group",
        hoverEffect && hasCustomHoverBg && "cursor-pointer group",
        className
      )}
    >
      {children}
    </div>
  )
}

export default Card
