import { useState } from 'react'
import api from '../lib/api'

export default function ContatoForm({ pageSlug = 'contato' }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setStatus('')
    setError('')
    try {
      await api.post('/forms/contato', { ...form, pageSlug })
      setStatus('Mensagem enviada com sucesso.')
      setForm({ name: '', email: '', phone: '', message: '' })
    } catch {
      setError('Nao foi possivel enviar. Tente novamente.')
    }
  }

  return (
    <div className="to-form-section">
      <form onSubmit={submit} className="to-form">
        <label>
          Digite o seu nome
          <input
            required
            placeholder="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label>
          Digite o e-mail para contato
          <input
            required
            type="email"
            placeholder="E-mail"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          Digite seu Telefone
          <input
            placeholder="Telefone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>
        <label>
          Digite sua mensagem
          <textarea
            required
            placeholder="Mensagem"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </label>
        <button type="submit" className="to-btn to-btn--green">Enviar</button>
      </form>
      {status ? <p className="to-form-status">{status}</p> : null}
      {error ? <p className="to-form-error">{error}</p> : null}
    </div>
  )
}
