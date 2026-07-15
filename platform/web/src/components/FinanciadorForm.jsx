import { useState } from 'react'
import api from '../lib/api'

export default function FinanciadorForm({ pageSlug = 'financiadores' }) {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setStatus('')
    setError('')
    try {
      await api.post('/forms/financiador', { ...form, pageSlug })
      setStatus('Cadastro enviado com sucesso.')
      setForm({ name: '', email: '', message: '' })
    } catch {
      setError('Nao foi possivel enviar. Tente novamente.')
    }
  }

  return (
    <div className="to-fin-form-fields">
      <h3 className="to-fin-form-subtitle">Preencha o formulário abaixo</h3>
      <form onSubmit={submit} className="to-form">
        <label>
          Digite o nome da sua empresa
          <input
            required
            placeholder="Nome da empresa"
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
          Descrição
          <textarea
            required
            placeholder="Descrição"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </label>
        <button type="submit" className="to-btn to-btn--green">Cadastrar</button>
      </form>
      {status ? <p className="to-form-status">{status}</p> : null}
      {error ? <p className="to-form-error">{error}</p> : null}
    </div>
  )
}
