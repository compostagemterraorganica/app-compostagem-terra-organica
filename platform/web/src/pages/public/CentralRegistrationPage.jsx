import { useState } from 'react'
import api from '../../lib/api'

export default function CentralRegistrationPage() {
  const [form, setForm] = useState({
    centralName: '',
    contactName: '',
    email: '',
    city: '',
    state: ''
  })
  const [status, setStatus] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    await api.post('/forms/central-registration', form)
    setStatus('Cadastro enviado com sucesso.')
  }

  return (
    <section>
      <h2>Cadastro de Centrais</h2>
      <form onSubmit={submit} className="form-col">
        <input placeholder="Nome da central" value={form.centralName} onChange={(e) => setForm({ ...form, centralName: e.target.value })} />
        <input placeholder="Contato" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <input placeholder="UF" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        <button type="submit">Enviar cadastro</button>
      </form>
      <p>{status}</p>
    </section>
  )
}
