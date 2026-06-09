import React, { useState } from 'react'
import { formatBRL } from '../lib/supabase'

// ─── Toast ──────────────────────────────────────────────────
let toastTimeout
export function showToast(msg) {
  const existing = document.getElementById('global-toast')
  if (existing) existing.remove()
  const el = document.createElement('div')
  el.id = 'global-toast'
  el.className = 'toast'
  el.textContent = msg
  document.body.appendChild(el)
  clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => el.remove(), 2500)
}

// ─── Loading ────────────────────────────────────────────────
export function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <span>Carregando dados...</span>
    </div>
  )
}

// ─── Modal ──────────────────────────────────────────────────
export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <div className="modal-title">
          <span>{title}</span>
          <button className="close-btn" onClick={onClose}>
            <i className="ti ti-x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── Tag selector ───────────────────────────────────────────
export function TagSelector({ options, value, onChange }) {
  return (
    <div className="tags">
      {options.map(opt => (
        <button
          key={opt.value || opt}
          className={`tag ${value === (opt.value || opt) ? 'sel' : ''}`}
          onClick={() => onChange(opt.value || opt)}
          type="button"
        >
          {opt.label || opt}
        </button>
      ))}
    </div>
  )
}

// ─── Status Badge ───────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    negativado: { label: 'Negativado', cls: 'neg' },
    em_dia: { label: 'Em dia', cls: 'ok' },
    negociando: { label: 'Negociando', cls: 'prog' },
    quitado: { label: 'Quitado', cls: 'ok' },
    parcelado: { label: 'Parcelado', cls: 'parc' },
    prevista: { label: 'Prevista', cls: 'prog' },
    confirmada: { label: 'Confirmada', cls: 'prog' },
    recebida: { label: 'Recebida', cls: 'ok' },
    pendente: { label: 'Pendente', cls: 'prog' },
    aceito: { label: 'Aceito', cls: 'ok' },
    recusado: { label: 'Recusado', cls: 'neg' },
    expirado: { label: 'Expirado', cls: 'neg' },
  }
  const info = map[status] || { label: status, cls: 'prog' }
  return <span className={`debt-tag ${info.cls}`}>{info.label}</span>
}

// ─── Empty state ────────────────────────────────────────────
export function EmptyState({ icon, text }) {
  return (
    <div className="empty-state">
      <i className={`ti ti-${icon}`} />
      <p>{text}</p>
    </div>
  )
}

// ─── Card de métrica ────────────────────────────────────────
export function MetricCard({ label, value, color, sub, subColor }) {
  return (
    <div className={`card ${color || ''}`}>
      <div className="card-label">{label}</div>
      <div className="card-value">{value}</div>
      {sub && <div className="card-change" style={{ color: subColor }}>{sub}</div>}
    </div>
  )
}

// ─── Progress bar ───────────────────────────────────────────
export function ProgressBar({ pct, color }) {
  const cls = pct >= 80 ? 'green' : pct >= 40 ? 'amber' : 'red'
  return (
    <div className="progress-bar">
      <div className={`progress-fill ${color || cls}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}

// ─── AI Badge ───────────────────────────────────────────────
export function AIBadge({ text }) {
  return (
    <span className="ai-badge">
      <i className="ti ti-sparkles" style={{ fontSize: 11 }} />
      {text}
    </span>
  )
}

// ─── Spinner inline ─────────────────────────────────────────
export function Spinner() {
  return <div className="spinner" style={{ width: 18, height: 18 }} />
}
