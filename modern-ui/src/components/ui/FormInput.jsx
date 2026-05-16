import React from 'react'

const FormInput = ({ 
  label, 
  icon: Icon, 
  placeholder, 
  value, 
  onChange, 
  type = 'text',
  className = '',
  innerRef,
  ...props 
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="fh-box-label ml-1">{label}</label>}
      <div className="fh-input-group">
        {Icon && (
          <div className="fh-icon-wrapper">
            <Icon size={18} />
          </div>
        )}
        <input 
          ref={innerRef}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`fh-input ${Icon ? 'fh-input-iconic' : ''}`}
          {...props}
        />
      </div>
    </div>
  )
}

export default FormInput
