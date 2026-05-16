import React from 'react'
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Edit2, 
  Trash2,
  ExternalLink,
  Car
} from 'lucide-react'
import Card from '../ui/Card'

const ContactCard = ({ contact, onEdit, onDelete }) => {
  
  const getTypeIcon = () => {
    switch(contact.type) {
      case 'company': return <Building2 size={24} className="text-sky-500" />
      default: return <User size={24} className="text-slate-400" />
    }
  }

  const getTypeLabel = () => {
    switch(contact.type) {
      case 'company': return 'Azienda'
      default: return 'Privato'
    }
  }

  return (
    <Card onClick={() => onEdit && onEdit(contact)}>
      {/* Header with Type and Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-50 group-hover:border-accent/30 transition-all">
            {getTypeIcon()}
          </div>
          <span className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-slate-400">{getTypeLabel()}</span>
        </div>
        
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit && onEdit(contact); }} 
            className="p-2.5 bg-white text-slate-400 hover:text-accent hover:border-accent/30 border border-slate-100 rounded-xl transition-all shadow-sm"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete && onDelete(contact.id); }} 
            className="p-2.5 bg-white text-slate-400 hover:text-rose-500 hover:border-rose-100 border border-slate-100 rounded-xl transition-all shadow-sm"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Main Info */}
      <div className="mb-6">
        <h3 className="text-xl font-black text-slate-800 mb-1 leading-tight group-hover:text-accent transition-colors">
          {contact.name}
        </h3>
        <div className="flex items-center gap-2 text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest">
          <span>{contact.vat_id || contact.tax_code || 'Nessun identificativo'}</span>
        </div>
      </div>

      {/* Contact Details */}
      <div className="mt-auto space-y-4">
        <div className="grid grid-cols-1 gap-2">
          {contact.email && (
            <div className="flex items-center gap-3 p-3 bg-white/30 rounded-2xl border border-white/50 hover:bg-white/50 transition-colors">
              <Mail size={14} className="text-accent" />
              <span className="text-[0.7rem] font-bold text-slate-600 truncate">{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-3 p-3 bg-white/30 rounded-2xl border border-white/50 hover:bg-white/50 transition-colors">
              <Phone size={14} className="text-sky-400" />
              <span className="text-[0.7rem] font-bold text-slate-600">{contact.phone}</span>
            </div>
          )}
          <div className="flex items-center justify-between p-3 bg-white/30 rounded-2xl border border-white/50">
            <div className="flex items-center gap-3">
              <MapPin size={14} className="text-rose-400" />
              <span className="text-[0.7rem] font-bold text-slate-600 uppercase tracking-wider">
                {contact.city || '---'} ({contact.province || '--'})
              </span>
            </div>
            {contact.distance && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-accent/10 rounded-lg text-accent text-[0.6rem] font-black">
                <Car size={10} />
                <span>{contact.distance} km</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
            <span className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-accent">Attivo</span>
          </div>
          <button className="text-accent hover:text-accent/80 transition-colors">
            <ExternalLink size={16} />
          </button>
        </div>
      </div>
    </Card>
  )
}

export default ContactCard
