import React from 'react'

const Badge = ({ children, color, className = "" }) => {
  return (
    <span 
      className={`px-3 py-1 rounded-full text-[0.6rem] font-black tracking-widest uppercase ${className}`}
      style={{ backgroundColor: `${color}15`, color: color }}
    >
      {children}
    </span>
  )
}

export default Badge
