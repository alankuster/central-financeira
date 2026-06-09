import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { FinanceiroProvider } from './context/FinanceiroContext'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import IAConsultora from './pages/IAConsultora'
import { Receitas, Despesas, Dividas, Acordos } from './pages/Financas'
import { Radar, Sonhos, Score, Reuniao } from './pages/Outros'
import Categorias from './pages/Categorias'
import './styles.css'

const link = document.createElement('link')
link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap'
link.rel = 'stylesheet'
document.head.appendChild(link)

const tablerLink = document.createElement('link')
tablerLink.href = 'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css'
tablerLink.rel = 'stylesheet'
document.head.appendChild(tablerLink)

export default function App() {
  return (
    <BrowserRouter>
      <FinanceiroProvider>
        <div className="app">
          <Sidebar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/ia" element={<IAConsultora />} />
              <Route path="/receitas" element={<Receitas />} />
              <Route path="/despesas" element={<Despesas />} />
              <Route path="/radar" element={<Radar />} />
              <Route path="/dividas" element={<Dividas />} />
              <Route path="/acordos" element={<Acordos />} />
              <Route path="/sonhos" element={<Sonhos />} />
              <Route path="/score" element={<Score />} />
              <Route path="/reuniao" element={<Reuniao />} />
              <Route path="/categorias" element={<Categorias />} />
            </Routes>
          </main>
        </div>
      </FinanceiroProvider>
    </BrowserRouter>
  )
}
