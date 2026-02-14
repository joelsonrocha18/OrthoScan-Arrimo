import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import AppShell from '../layouts/AppShell'
import type { DentistClinic } from '../types/DentistClinic'
import { createDentist, getDentist, restoreDentist, softDeleteDentist, updateDentist } from '../data/dentistRepo'
import { useDb } from '../lib/useDb'
import { fetchCep, isValidCep, normalizeCep } from '../lib/cep'
import { getCurrentUser } from '../lib/auth'
import { can } from '../auth/permissions'

type DentistForm = {
  name: string
  cro: string
  gender: 'masculino' | 'feminino'
  clinicId: string
  phone: string
  whatsapp: string
  email: string
  address: {
    cep: string
    street: string
    number: string
    district: string
    city: string
    state: string
  }
  notes: string
  isActive: boolean
}

const emptyForm: DentistForm = {
  name: '',
  cro: '',
  gender: 'masculino',
  clinicId: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: {
    cep: '',
    street: '',
    number: '',
    district: '',
    city: '',
    state: '',
  },
  notes: '',
  isActive: true,
}

function mapToForm(item: DentistClinic): DentistForm {
  return {
    name: item.name,
    cro: item.cro ?? '',
    gender: item.gender ?? 'masculino',
    clinicId: item.clinicId ?? '',
    phone: item.phone ?? '',
    whatsapp: item.whatsapp ?? '',
    email: item.email ?? '',
    address: {
      cep: item.address?.cep ?? '',
      street: item.address?.street ?? '',
      number: item.address?.number ?? '',
      district: item.address?.district ?? '',
      city: item.address?.city ?? '',
      state: item.address?.state ?? '',
    },
    notes: item.notes ?? '',
    isActive: item.isActive,
  }
}

export default function DentistDetailPage() {
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { db } = useDb()
  const currentUser = getCurrentUser(db)
  const canWrite = can(currentUser, 'dentists.write')
  const canDelete = can(currentUser, 'dentists.delete')
  const isNew = params.id === 'new'
  const existing = useMemo(
    () => (!isNew && params.id ? getDentist(params.id) : null),
    [isNew, params.id],
  )

  const [form, setForm] = useState<DentistForm>(emptyForm)
  const [error, setError] = useState('')
  const [cepStatus, setCepStatus] = useState('')
  const [cepError, setCepError] = useState('')

  const clinics = useMemo(() => db.clinics.filter((item) => !item.deletedAt), [db.clinics])

  useEffect(() => {
    if (!existing) {
      setForm(emptyForm)
      return
    }
    setForm(mapToForm(existing))
  }, [existing])

  useEffect(() => {
    const cep = normalizeCep(form.address.cep)
    if (!isValidCep(cep)) {
      setCepStatus('')
      setCepError('')
      return
    }

    let active = true
    fetchCep(cep)
      .then((data) => {
        if (!active) return
        setForm((current) => ({
          ...current,
          address: {
            ...current.address,
            street: data.street || current.address.street,
            district: data.district || current.address.district,
            city: data.city || current.address.city,
            state: data.state || current.address.state,
          },
        }))
        setCepStatus('Endereco preenchido automaticamente.')
        setCepError('')
      })
      .catch((err: Error) => {
        if (!active) return
        setCepStatus('')
        setCepError(err.message || 'CEP nao encontrado.')
      })

    return () => {
      active = false
    }
  }, [form.address.cep])

  const normalizeWhatsapp = (value: string) => value.replace(/\D/g, '')
  const whatsappDigits = normalizeWhatsapp(form.whatsapp || form.phone)
  const whatsappValid = whatsappDigits.length === 10 || whatsappDigits.length === 11
  const whatsappLink = whatsappValid ? `https://wa.me/55${whatsappDigits}` : ''

  const namePrefix = form.gender === 'feminino' ? 'Dra.' : 'Dr.'
  const headerName = form.name.trim() ? `${namePrefix} ${form.name.trim()}` : ''

  if (!isNew && !existing) {
    return (
      <AppShell breadcrumb={['Inicio', 'Dentistas']}>
        <Card>
          <h1 className="text-xl font-semibold text-slate-900">Registro nao encontrado</h1>
          <Link to="/app/dentists" className="mt-3 inline-flex text-sm font-semibold text-brand-700">
            Voltar para dentistas
          </Link>
        </Card>
      </AppShell>
    )
  }

  const handleSave = () => {
    if (!canWrite) {
      setError('Sem permissao para editar dentistas.')
      return
    }
    if (!form.name.trim()) {
      setError('Nome e obrigatorio.')
      return
    }
    const payload = {
      type: 'dentista' as const,
      name: form.name.trim(),
      cnpj: undefined,
      cro: form.cro.trim() || undefined,
      gender: form.gender,
      clinicId: form.clinicId ? form.clinicId : undefined,
      phone: form.phone.trim() || undefined,
      whatsapp: form.whatsapp.trim() || undefined,
      email: form.email.trim() || undefined,
      address: {
        cep: form.address.cep.trim() || undefined,
        street: form.address.street.trim() || undefined,
        number: form.address.number.trim() || undefined,
        district: form.address.district.trim() || undefined,
        city: form.address.city.trim() || undefined,
        state: form.address.state.trim() || undefined,
      },
      notes: form.notes.trim() || undefined,
      isActive: form.isActive,
    }

    if (isNew) {
      const result = createDentist({
        ...payload,
        isActive: payload.isActive ?? true,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      navigate(`/app/dentists/${result.dentist.id}`, { replace: true })
      return
    }

    if (!existing) return
    const result = updateDentist(existing.id, payload)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
  }

  const handleDelete = () => {
    if (!existing) return
    if (!canDelete) return
    const confirmed = window.confirm('Tem certeza que deseja excluir?')
    if (!confirmed) return
    const result = softDeleteDentist(existing.id)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
  }

  const handleRestore = () => {
    if (!existing) return
    if (!canDelete) return
    const result = restoreDentist(existing.id)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
  }

  return (
    <AppShell breadcrumb={['Inicio', 'Dentistas', isNew ? 'Novo' : existing?.name ?? 'Detalhe']}>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            {isNew ? 'Novo dentista' : headerName || existing?.name}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Dentista {existing?.deletedAt ? '(Excluido)' : ''}
          </p>
        </div>
        <Link
          to="/app/dentists"
          className="inline-flex h-10 items-center rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-200"
        >
          Voltar
        </Link>
      </section>

      <section className="mt-6 space-y-4">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Identificacao</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nome</label>
              <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Sexo</label>
              <select
                value={form.gender}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    gender: event.target.value as DentistForm['gender'],
                  }))
                }
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">CRO</label>
              <Input value={form.cro} onChange={(event) => setForm((current) => ({ ...current, cro: event.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Clinica vinculada</label>
              <select
                value={form.clinicId}
                onChange={(event) => setForm((current) => ({ ...current, clinicId: event.target.value }))}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">Nenhuma</option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.tradeName}
                  </option>
                ))}
              </select>
              {form.clinicId ? (
                <Link to={`/app/clinics/${form.clinicId}`} className="mt-2 inline-flex text-xs font-semibold text-brand-700">
                  Abrir clinica
                </Link>
              ) : null}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Contatos</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Telefone</label>
              <Input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">WhatsApp</label>
              <Input
                value={form.whatsapp}
                onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))}
              />
              {whatsappValid ? (
                <a href={whatsappLink} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-semibold text-brand-700">
                  Abrir WhatsApp
                </a>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Endereco</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">CEP</label>
              <Input
                value={form.address.cep}
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: { ...current.address, cep: normalizeCep(event.target.value) } }))
                }
              />
              {cepStatus ? <p className="mt-1 text-xs text-emerald-700">{cepStatus}</p> : null}
              {cepError ? <p className="mt-1 text-xs text-amber-700">{cepError}</p> : null}
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Rua</label>
              <Input
                value={form.address.street}
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: { ...current.address, street: event.target.value } }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Numero</label>
              <Input
                value={form.address.number}
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: { ...current.address, number: event.target.value } }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Bairro</label>
              <Input
                value={form.address.district}
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: { ...current.address, district: event.target.value } }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Cidade</label>
              <Input
                value={form.address.city}
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: { ...current.address, city: event.target.value } }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">UF</label>
              <Input
                value={form.address.state}
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: { ...current.address, state: event.target.value.toUpperCase().slice(0, 2) } }))
                }
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Observacoes</h2>
          <textarea
            rows={4}
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Status</h2>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
            <span className="text-sm text-slate-700">{form.isActive ? 'Ativo' : 'Inativo'}</span>
          </div>
        </Card>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-2">
          {canWrite ? <Button onClick={handleSave}>Salvar</Button> : null}
          {!isNew && existing?.deletedAt && canDelete ? (
            <Button variant="secondary" onClick={handleRestore}>
              Restaurar
            </Button>
          ) : null}
          {!isNew && !existing?.deletedAt && canDelete ? (
            <Button variant="ghost" onClick={handleDelete} className="text-red-600 hover:text-red-700">
              Excluir
            </Button>
          ) : null}
        </div>
      </section>
    </AppShell>
  )
}
