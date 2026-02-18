import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import FilePickerWithCamera from '../components/files/FilePickerWithCamera'
import Input from '../components/Input'
import WhatsappLink from '../components/WhatsappLink'
import AppShell from '../layouts/AppShell'
import type { Patient } from '../types/Patient'
import type { PatientDocument } from '../types/PatientDocument'
import { useDb } from '../lib/useDb'
import { can } from '../auth/permissions'
import { listPatientsForUser } from '../auth/scope'
import { createPatient, getPatient, restorePatient, softDeletePatient, updatePatient } from '../repo/patientRepo'
import {
  addPatientDoc,
  deletePatientDoc,
  listPatientDocs,
  markPatientDocAsError,
  resolvePatientDocUrl,
  restoreDocStatus,
  updatePatientDoc,
} from '../repo/patientDocsRepo'
import { fetchCep, isValidCep, normalizeCep } from '../lib/cep'
import { formatFixedPhone, formatMobilePhone, isValidFixedPhone, isValidMobilePhone } from '../lib/phone'
import { updateScan } from '../data/scanRepo'
import { updateCase } from '../data/caseRepo'
import { getCurrentUser } from '../lib/auth'
import DocumentsList from '../components/documents/DocumentsList'
import { validatePatientDocFile } from '../repo/storageRepo'

type PatientForm = {
  name: string
  cpf: string
  birthDate: string
  gender: 'masculino' | 'feminino' | 'outro'
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
  primaryDentistId: string
  clinicId: string
  notes: string
}

type DocumentForm = {
  title: string
  category: PatientDocument['category']
  note: string
  date: string
  file: File | null
}

const emptyForm: PatientForm = {
  name: '',
  cpf: '',
  birthDate: '',
  gender: 'outro',
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
  primaryDentistId: '',
  clinicId: '',
  notes: '',
}

const emptyDocForm: DocumentForm = {
  title: '',
  category: 'outro',
  note: '',
  date: new Date().toISOString().slice(0, 10),
  file: null,
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  const p1 = digits.slice(0, 3)
  const p2 = digits.slice(3, 6)
  const p3 = digits.slice(6, 9)
  const p4 = digits.slice(9, 11)
  let out = p1
  if (p2) out += `.${p2}`
  if (p3) out += `.${p3}`
  if (p4) out += `-${p4}`
  return out
}

function normalizeWhatsapp(value: string) {
  return value.replace(/\D/g, '')
}

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { db } = useDb()
  const currentUser = getCurrentUser(db)
  const canWrite = can(currentUser, 'patients.write')
  const canDelete = can(currentUser, 'patients.delete')
  const canDeleteByRole = currentUser?.role === 'master_admin' || currentUser?.role === 'dentist_admin'
  const canDeletePatient = canDelete && canDeleteByRole
  const isExternalUser = currentUser?.role === 'dentist_client' || currentUser?.role === 'clinic_client'
  const canDocsWrite = can(currentUser, 'docs.write')
  const canDocsAdmin = currentUser?.role === 'master_admin' || currentUser?.role === 'dentist_admin' || currentUser?.role === 'receptionist'
  const isNew = params.id === 'new'
  const existing = useMemo(() => (!isNew && params.id ? getPatient(params.id) : null), [isNew, params.id])
  const scopedPatients = useMemo(() => listPatientsForUser(db, currentUser), [db, currentUser])

  const [form, setForm] = useState<PatientForm>(emptyForm)
  const [error, setError] = useState('')
  const [docModalOpen, setDocModalOpen] = useState(false)
  const [docForm, setDocForm] = useState<DocumentForm>(emptyDocForm)
  const [docEditOpen, setDocEditOpen] = useState(false)
  const [docEditId, setDocEditId] = useState<string>('')
  const [cepStatus, setCepStatus] = useState('')
  const [cepError, setCepError] = useState('')

  const dentists = useMemo(() => db.dentists.filter((item) => item.type === 'dentista' && !item.deletedAt), [db.dentists])
  const clinics = useMemo(() => db.clinics.filter((item) => !item.deletedAt), [db.clinics])
  const [docs, setDocs] = useState<PatientDocument[]>([])

  const scans = useMemo(() => {
    if (!existing) return []
    const name = existing.name.toLowerCase()
    return db.scans.filter(
      (scan) =>
        (scan.patientId && scan.patientId === existing.id) ||
        (!scan.patientId && scan.patientName.toLowerCase() === name),
    )
  }, [db.scans, existing])

  const cases = useMemo(() => {
    if (!existing) return []
    const name = existing.name.toLowerCase()
    return db.cases.filter(
      (caseItem) =>
        (caseItem.patientId && caseItem.patientId === existing.id) ||
        (!caseItem.patientId && caseItem.patientName.toLowerCase() === name),
    )
  }, [db.cases, existing])

  useEffect(() => {
    if (!existing) {
      setForm(emptyForm)
      return
    }
    setForm({
      name: existing.name,
      cpf: existing.cpf ?? '',
      birthDate: existing.birthDate ?? '',
      gender: existing.gender ?? 'outro',
      phone: existing.phone ?? '',
      whatsapp: existing.whatsapp ?? '',
      email: existing.email ?? '',
      address: {
        cep: existing.address?.cep ?? '',
        street: existing.address?.street ?? '',
        number: existing.address?.number ?? '',
        district: existing.address?.district ?? '',
        city: existing.address?.city ?? '',
        state: existing.address?.state ?? '',
      },
      primaryDentistId: existing.primaryDentistId ?? '',
      clinicId: existing.clinicId ?? '',
      notes: existing.notes ?? '',
    })
  }, [existing])

  useEffect(() => {
    let active = true
    if (!existing) {
      setDocs([])
      return
    }
    listPatientDocs(existing.id).then((items) => {
      if (!active) return
      setDocs(items)
    })
    return () => {
      active = false
    }
  }, [existing, db.patientDocuments, db.clinics, db.scans])

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
        setCepStatus('Endereço preenchido automaticamente.')
        setCepError('')
      })
      .catch((err: Error) => {
        if (!active) return
        setCepStatus('')
        setCepError(err.message || 'CEP não encontrado.')
      })

    return () => {
      active = false
    }
  }, [form.address.cep])

  if (!isNew && existing && !scopedPatients.some((item) => item.id === existing.id)) {
    return (
      <AppShell breadcrumb={['Inicio', 'Pacientes']}>
        <Card>
          <h1 className="text-xl font-semibold text-slate-900">Sem acesso</h1>
          <p className="mt-2 text-sm text-slate-500">Seu perfil nao permite visualizar este paciente.</p>
          <Link to="/app/patients" className="mt-3 inline-flex text-sm font-semibold text-brand-700">
            Voltar para pacientes
          </Link>
        </Card>
      </AppShell>
    )
  }

  if (!isNew && !existing) {
    return (
      <AppShell breadcrumb={['Inicio', 'Pacientes']}>
        <Card>
          <h1 className="text-xl font-semibold text-slate-900">Paciente não encontrado</h1>
          <Link to="/app/patients" className="mt-3 inline-flex text-sm font-semibold text-brand-700">
            Voltar para pacientes
          </Link>
        </Card>
      </AppShell>
    )
  }

  const selectedDentist = dentists.find((item) => item.id === form.primaryDentistId)
  const dentistPrefix = selectedDentist?.gender === 'feminino' ? 'Dra.' : selectedDentist ? 'Dr.' : ''
  const dentistWhatsappDigits = normalizeWhatsapp(selectedDentist?.whatsapp ?? '')
  const dentistWhatsappValid = dentistWhatsappDigits.length === 10 || dentistWhatsappDigits.length === 11

  const savePatient = () => {
    if (!canWrite) {
      setError('Sem permissao para editar pacientes.')
      return
    }
    if (!form.name.trim()) {
      setError('Nome e obrigatorio.')
      return
    }
    if (!form.birthDate) {
      setError('Data de nascimento e obrigatoria.')
      return
    }
    if (form.phone.trim() && !isValidFixedPhone(form.phone)) {
      setError('Telefone fixo invalido.')
      return
    }
    if (form.whatsapp.trim() && !isValidMobilePhone(form.whatsapp)) {
      setError('Celular/WhatsApp invalido.')
      return
    }

    const payload: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> = {
      name: form.name.trim(),
      cpf: form.cpf.trim() || undefined,
      birthDate: form.birthDate,
      gender: form.gender,
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
      primaryDentistId: form.primaryDentistId || undefined,
      clinicId: form.clinicId || undefined,
      notes: form.notes.trim() || undefined,
    }

    if (currentUser?.role === 'dentist_client') {
      if (!currentUser.linkedDentistId) {
        setError('Perfil externo sem dentista vinculado. Contate o administrador.')
        return
      }
      payload.primaryDentistId = currentUser.linkedDentistId
      payload.clinicId = currentUser.linkedClinicId || payload.clinicId
    }
    if (currentUser?.role === 'clinic_client') {
      if (!currentUser.linkedClinicId) {
        setError('Perfil externo sem clinica vinculada. Contate o administrador.')
        return
      }
      payload.clinicId = currentUser.linkedClinicId
    }

    if (isNew) {
      const result = createPatient(payload)
      if (!result.ok) {
        setError(result.error)
        return
      }
      navigate(`/app/patients/${result.patient.id}`, { replace: true })
      return
    }

    if (!existing) return
    const result = updatePatient(existing.id, payload)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
  }

  const handleDelete = () => {
    if (!existing) return
    if (!canDeletePatient) {
      setError('Somente Master Admin ou Dentista Admin podem excluir paciente.')
      return
    }
    const confirmed = window.confirm('Tem certeza que deseja excluir este paciente?')
    if (!confirmed) return
    const result = softDeletePatient(existing.id)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
    navigate('/app/patients', { replace: true })
  }

  const handleRestore = () => {
    if (!existing) return
    if (!canDeletePatient) return
    restorePatient(existing.id)
  }

  const handleLinkByName = () => {
    if (!existing) return
    if (!canWrite) return
    const name = existing.name.toLowerCase()
    const scansToUpdate = db.scans.filter((scan) => !scan.patientId && scan.patientName.toLowerCase() === name)
    const casesToUpdate = db.cases.filter((caseItem) => !caseItem.patientId && caseItem.patientName.toLowerCase() === name)
    scansToUpdate.forEach((scan) => updateScan(scan.id, { patientId: existing.id }))
    casesToUpdate.forEach((caseItem) => updateCase(caseItem.id, { patientId: existing.id }))
    if (scansToUpdate.length || casesToUpdate.length) {
      setError('')
    }
  }

  const submitDoc = async () => {
    if (!existing) return
    if (!canDocsWrite) {
      setError('Sem permissao para anexar documentos.')
      return
    }
    if (!docForm.title.trim()) {
      setError('Informe o titulo do documento.')
      return
    }
    if (docForm.file) {
      const valid = validatePatientDocFile(docForm.file)
      if (!valid.ok) {
        setError(valid.error)
        return
      }
    }
    const result = await addPatientDoc({
      patientId: existing.id,
      title: docForm.title,
      category: docForm.category,
      note: docForm.note,
      createdAt: docForm.date,
      file: docForm.file ?? undefined,
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setDocForm({ ...emptyDocForm, date: new Date().toISOString().slice(0, 10) })
    setDocModalOpen(false)
    setError('')
    const items = await listPatientDocs(existing.id)
    setDocs(items)
  }

  const acceptDocs =
    '.pdf,.jpg,.jpeg,.png,.heic,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*'

  const openDoc = async (doc: PatientDocument) => {
    const resolved = await resolvePatientDocUrl(doc)
    if (!resolved.ok) return
    window.open(resolved.url, '_blank', 'noreferrer')
  }

  const downloadDoc = async (doc: PatientDocument) => {
    const resolved = await resolvePatientDocUrl(doc)
    if (!resolved.ok) return
    const anchor = document.createElement('a')
    anchor.href = resolved.url
    anchor.download = doc.fileName || 'arquivo'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  }

  const beginEditDoc = (doc: PatientDocument) => {
    setDocEditId(doc.id)
    setDocForm({
      title: doc.title,
      category: doc.category,
      note: doc.note ?? '',
      date: doc.createdAt.slice(0, 10),
      file: null,
    })
    setDocEditOpen(true)
  }

  const submitDocEdit = async () => {
    if (!docEditId) return
    if (!canDocsAdmin) {
      setError('Sem permissao para editar documentos.')
      return
    }
    if (!docForm.title.trim()) {
      setError('Informe o titulo do documento.')
      return
    }

    const result = await updatePatientDoc(docEditId, {
      title: docForm.title,
      category: docForm.category,
      note: docForm.note,
      createdAt: docForm.date ? new Date(docForm.date).toISOString() : undefined,
    })
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
    setDocEditOpen(false)
    setDocEditId('')
    setDocForm({ ...emptyDocForm, date: new Date().toISOString().slice(0, 10) })
    if (existing) {
      const items = await listPatientDocs(existing.id)
      setDocs(items)
    }
  }

  const deleteDoc = async (doc: PatientDocument) => {
    if (!canDocsAdmin) return
    const ok = window.confirm(`Excluir o documento "${doc.title}"? Essa acao nao pode ser desfeita.`)
    if (!ok) return
    const result = await deletePatientDoc(doc.id)
    if (!result.ok) setError(result.error)
    if (existing) {
      const items = await listPatientDocs(existing.id)
      setDocs(items)
    }
  }

  return (
    <AppShell breadcrumb={['Inicio', 'Pacientes', isNew ? 'Novo' : existing?.name ?? 'Detalhe']}>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            {isNew ? 'Novo paciente' : existing?.name}
          </h1>
          {existing?.deletedAt ? <p className="mt-2 text-sm text-red-600">Paciente excluido (soft delete).</p> : null}
        </div>
        <Link
          to="/app/patients"
          className="inline-flex h-10 items-center rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-200"
        >
          Voltar
        </Link>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Cadastro</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Nome *</label>
              <Input value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">CPF</label>
              <Input value={form.cpf} onChange={(event) => setForm((c) => ({ ...c, cpf: formatCpf(event.target.value) }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Data nascimento *</label>
              <Input type="date" value={form.birthDate} onChange={(event) => setForm((c) => ({ ...c, birthDate: event.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Sexo</label>
              <select
                value={form.gender}
                onChange={(event) => setForm((c) => ({ ...c, gender: event.target.value as PatientForm['gender'] }))}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="masculino">Masculino</option>
                <option value="feminino">Feminino</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Telefone fixo</label>
              <Input value={form.phone} onChange={(event) => setForm((c) => ({ ...c, phone: formatFixedPhone(event.target.value) }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Celular (WhatsApp)</label>
              <Input value={form.whatsapp} onChange={(event) => setForm((c) => ({ ...c, whatsapp: formatMobilePhone(event.target.value) }))} />
              <WhatsappLink value={form.whatsapp} className="mt-2 text-xs font-semibold" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <Input type="email" value={form.email} onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">CEP</label>
              <Input
                value={form.address.cep}
                onChange={(event) =>
                  setForm((c) => ({ ...c, address: { ...c.address, cep: normalizeCep(event.target.value) } }))
                }
              />
              {cepStatus ? <p className="mt-1 text-xs text-emerald-700">{cepStatus}</p> : null}
              {cepError ? <p className="mt-1 text-xs text-amber-700">{cepError}</p> : null}
            </div>
            <div className="sm:col-span-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Rua</label>
              <Input value={form.address.street} onChange={(event) => setForm((c) => ({ ...c, address: { ...c.address, street: event.target.value } }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Numero</label>
              <Input value={form.address.number} onChange={(event) => setForm((c) => ({ ...c, address: { ...c.address, number: event.target.value } }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Bairro</label>
              <Input value={form.address.district} onChange={(event) => setForm((c) => ({ ...c, address: { ...c.address, district: event.target.value } }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Cidade</label>
              <Input value={form.address.city} onChange={(event) => setForm((c) => ({ ...c, address: { ...c.address, city: event.target.value } }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">UF</label>
              <Input value={form.address.state} onChange={(event) => setForm((c) => ({ ...c, address: { ...c.address, state: event.target.value.toUpperCase().slice(0, 2) } }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Observacoes</label>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) => setForm((c) => ({ ...c, notes: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Vinculos</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Clinica</label>
              <select
                value={form.clinicId}
                onChange={(event) => setForm((c) => ({ ...c, clinicId: event.target.value }))}
                disabled={isExternalUser}
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

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Dentista responsavel</label>
              <select
                value={form.primaryDentistId}
                onChange={(event) => setForm((c) => ({ ...c, primaryDentistId: event.target.value }))}
                disabled={isExternalUser}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="">Nao definido</option>
                {dentists.map((dentist) => (
                  <option key={dentist.id} value={dentist.id}>
                    {dentist.gender === 'feminino' ? 'Dra.' : 'Dr.'} {dentist.name}
                  </option>
                ))}
              </select>
              {selectedDentist ? (
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <p>
                    Responsavel: {dentistPrefix} {selectedDentist.name}
                  </p>
                  {dentistWhatsappValid ? <WhatsappLink value={selectedDentist?.whatsapp} className="text-xs font-semibold" /> : null}
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Historico - Scans</h2>
            {existing && canWrite ? (
              <Button variant="secondary" size="sm" onClick={handleLinkByName}>
                Vincular automaticamente
              </Button>
            ) : null}
          </div>
          <div className="mt-3 space-y-2">
            {scans.map((scan) => (
              <div key={scan.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {new Date(`${scan.scanDate}T00:00:00`).toLocaleDateString('pt-BR')} - {scan.arch}
                    </p>
                    <p className="text-xs text-slate-500">Status: {scan.status}</p>
                  </div>
                  <Link to="/app/scans" className="text-xs font-semibold text-brand-700">
                    Ver
                  </Link>
                </div>
              </div>
            ))}
            {scans.length === 0 ? <p className="text-sm text-slate-500">Nenhum scan vinculado.</p> : null}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Historico - Casos</h2>
          <div className="mt-3 space-y-2">
            {cases.map((caseItem) => (
              <div key={caseItem.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{caseItem.treatmentCode ?? caseItem.id}</p>
                    <p className="text-xs text-slate-500">Status: {caseItem.status}</p>
                  </div>
                  <Link to={`/app/cases/${caseItem.id}`} className="text-xs font-semibold text-brand-700">
                    Abrir
                  </Link>
                </div>
              </div>
            ))}
            {cases.length === 0 ? <p className="text-sm text-slate-500">Nenhum caso vinculado.</p> : null}
          </div>
        </Card>
      </section>

      <section className="mt-6">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Documentos do paciente</h2>
              <p className="mt-1 text-sm text-slate-500">Uploads e registros de documentos.</p>
            </div>
            {canDocsWrite ? <Button onClick={() => setDocModalOpen(true)}>Adicionar documento</Button> : null}
          </div>
          <div className="mt-4">
            <DocumentsList
              items={docs}
              canEdit={canDocsAdmin}
              canDelete={canDocsAdmin}
              canFlagError={canDocsWrite}
              onOpen={openDoc}
              onDownload={downloadDoc}
              onEdit={beginEditDoc}
              onDelete={deleteDoc}
              onRestore={async (doc) => {
                if (!canDocsWrite) return
                await restoreDocStatus(doc.id)
                if (existing) {
                  const items = await listPatientDocs(existing.id)
                  setDocs(items)
                }
              }}
              onMarkError={async (doc) => {
                if (!canDocsWrite) return
                const reason = window.prompt('Motivo do erro:')
                if (!reason?.trim()) return
                await markPatientDocAsError(doc.id, reason)
                if (existing) {
                  const items = await listPatientDocs(existing.id)
                  setDocs(items)
                }
              }}
            />
            {docs.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nenhum documento anexado.</p> : null}
          </div>
        </Card>
      </section>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <section className="mt-6 flex flex-wrap gap-2">
        {canWrite ? <Button onClick={savePatient}>Salvar</Button> : null}
        {existing && !existing.deletedAt && canDeletePatient ? (
          <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={handleDelete}>
            Excluir
          </Button>
        ) : null}
        {existing?.deletedAt && canDeletePatient ? (
          <Button variant="secondary" onClick={handleRestore}>
            Restaurar
          </Button>
        ) : null}
      </section>

      {docModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <Card className="w-full max-w-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Adicionar documento</h2>
                <p className="mt-1 text-sm text-slate-500">Upload ou captura de documentos.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDocModalOpen(false)}>
                Fechar
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Titulo</label>
                <Input value={docForm.title} onChange={(event) => setDocForm((c) => ({ ...c, title: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Categoria</label>
                <select
                  value={docForm.category}
                  onChange={(event) => setDocForm((c) => ({ ...c, category: event.target.value as PatientDocument['category'] }))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="identificacao">Identificacao</option>
                  <option value="contrato">Contrato</option>
                  <option value="consentimento">Consentimento</option>
                  <option value="exame">Exame</option>
                  <option value="foto">Foto</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Data</label>
                <Input type="date" value={docForm.date} onChange={(event) => setDocForm((c) => ({ ...c, date: event.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Observacao</label>
                <textarea
                  rows={3}
                  value={docForm.note}
                  onChange={(event) => setDocForm((c) => ({ ...c, note: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Arquivo</label>
                <FilePickerWithCamera
                  accept={acceptDocs}
                  onFileSelected={(file) => setDocForm((c) => ({ ...c, file }))}
                />
                {docForm.file ? <p className="mt-2 text-xs text-slate-500">{docForm.file.name}</p> : null}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDocModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={submitDoc}>Salvar documento</Button>
            </div>
          </Card>
        </div>
      ) : null}

      {docEditOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <Card className="w-full max-w-xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Editar documento</h2>
                <p className="mt-1 text-sm text-slate-500">Atualize titulo, categoria, data e observacao.</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDocEditOpen(false)
                  setDocEditId('')
                  setDocForm({ ...emptyDocForm, date: new Date().toISOString().slice(0, 10) })
                }}
              >
                Fechar
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Titulo</label>
                <Input value={docForm.title} onChange={(event) => setDocForm((c) => ({ ...c, title: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Categoria</label>
                <select
                  value={docForm.category}
                  onChange={(event) => setDocForm((c) => ({ ...c, category: event.target.value as PatientDocument['category'] }))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                >
                  <option value="identificacao">Identificacao</option>
                  <option value="contrato">Contrato</option>
                  <option value="consentimento">Consentimento</option>
                  <option value="exame">Exame</option>
                  <option value="foto">Foto</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Data</label>
                <Input type="date" value={docForm.date} onChange={(event) => setDocForm((c) => ({ ...c, date: event.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Observacao</label>
                <textarea
                  rows={3}
                  value={docForm.note}
                  onChange={(event) => setDocForm((c) => ({ ...c, note: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
                <p className="mt-2 text-xs text-slate-500">Troca de arquivo ainda nao suportada neste modo.</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setDocEditOpen(false)
                  setDocEditId('')
                  setDocForm({ ...emptyDocForm, date: new Date().toISOString().slice(0, 10) })
                }}
              >
                Cancelar
              </Button>
              <Button onClick={submitDocEdit}>Salvar alteracoes</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </AppShell>
  )
}
