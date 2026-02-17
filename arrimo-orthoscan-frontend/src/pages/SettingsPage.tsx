import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole, Mail, Pause, PenLine, Play, Trash2, UserRound, WandSparkles } from 'lucide-react'
import { can, groupedPermissionsForRole, permissionLabel, profileDescription, profileLabel, type PermissionModule } from '../auth/permissions'
import { useToast } from '../app/ToastProvider'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import Input from '../components/Input'
import { DATA_MODE } from '../data/dataMode'
import { DB_KEY, resetDb } from '../data/db'
import AppShell from '../layouts/AppShell'
import { clearSession, getCurrentUser } from '../lib/auth'
import { formatCnpj, isValidCnpj } from '../lib/cnpj'
import { addAuditEntry, applyTheme, loadSystemSettings, saveSystemSettings, type AppThemeMode, type LabCompanyProfile } from '../lib/systemSettings'
import { createUser, resetUserPassword, setUserActive, softDeleteUser, updateUser } from '../repo/userRepo'
import { requestPasswordReset, sendAccessEmail } from '../repo/accessRepo'
import { createOnboardingInvite } from '../repo/onboardingRepo'
import { listClinicsSupabase, listDentistsSupabase, type ClinicOption, type DentistOption } from '../repo/directoryRepo'
import { listProfiles } from '../repo/profileRepo'
import type { Role, User } from '../types/User'
import { useDb } from '../lib/useDb'

type MainTab = 'registration' | 'users' | 'system_update' | 'system_diagnostics'
type ModalTab = 'personal' | 'access' | 'profile' | 'link'
type PasswordMode = 'auto' | 'manual'
const ROLE_LIST: Role[] = ['master_admin', 'dentist_admin', 'dentist_client', 'clinic_client', 'lab_tech', 'receptionist']
const MODULE_ORDER: PermissionModule[] = ['Dashboard', 'Pacientes', 'Scans', 'Casos', 'Laboratorio', 'Usuarios', 'Configuracoes']

// In Supabase mode, collaborator onboarding via link is for operational profiles only (no admin).
const INVITE_ROLE_LIST: Role[] = ['dentist_admin', 'dentist_client', 'clinic_client', 'lab_tech', 'receptionist']
const ROLE_REQUIRES_LINK: Role[] = ['dentist_client', 'clinic_client', 'lab_tech', 'receptionist']
const ROLE_REQUIRES_CLINIC: Role[] = ['dentist_admin', 'dentist_client', 'clinic_client', 'lab_tech', 'receptionist']

function generatePassword(size = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'
  return Array.from({ length: size }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function downloadFile(fileName: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export default function SettingsPage() {
  const { db } = useDb()
  const { addToast } = useToast()
  const currentUser = getCurrentUser(db)
  const isSupabaseMode = DATA_MODE === 'supabase'

  const dentistsLocal = useMemo(() => db.dentists.filter((item) => item.type === 'dentista' && !item.deletedAt), [db.dentists])
  const clinicsLocal = useMemo(() => db.clinics.filter((item) => !item.deletedAt), [db.clinics])
  const [clinicsSupabase, setClinicsSupabase] = useState<ClinicOption[]>([])
  const [dentistsSupabase, setDentistsSupabase] = useState<DentistOption[]>([])
  const clinicOptions = useMemo<ClinicOption[]>(() => {
    if (isSupabaseMode) return clinicsSupabase
    return clinicsLocal.map((clinic) => ({ id: clinic.id, tradeName: clinic.tradeName }))
  }, [clinicsLocal, clinicsSupabase, isSupabaseMode])
  const dentistOptions = useMemo<DentistOption[]>(() => {
    if (isSupabaseMode) return dentistsSupabase
    return dentistsLocal.map((dentist) => ({ id: dentist.id, name: dentist.name, clinicId: dentist.clinicId ?? null }))
  }, [dentistsLocal, dentistsSupabase, isSupabaseMode])

  const [supabaseUsers, setSupabaseUsers] = useState<User[]>([])
  const users = useMemo(() => {
    if (isSupabaseMode) return supabaseUsers
    return [...db.users].sort((a, b) => a.name.localeCompare(b.name))
  }, [db.users, isSupabaseMode, supabaseUsers])

  const [mainTab, setMainTab] = useState<MainTab>('registration')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [modalTab, setModalTab] = useState<ModalTab>('personal')
  const [showPassword, setShowPassword] = useState(false)
  const [passwordMode, setPasswordMode] = useState<PasswordMode>('auto')
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '', cpf: '', birthDate: '', phone: '', addressLine: '', role: 'receptionist' as Role, isActive: true, linkedDentistId: '', linkedClinicId: '', sendAccessEmail: true })
  const [settingsState, setSettingsState] = useState(() => loadSystemSettings())
  const [labForm, setLabForm] = useState<LabCompanyProfile>(() => loadSystemSettings().labCompany)

  const canManageUsers = can(currentUser, 'users.write')
  const canDeleteUsers = can(currentUser, 'users.delete')
  const [inviteLink, setInviteLink] = useState('')

  useEffect(() => {
    let active = true
    if (!isSupabaseMode) {
      setClinicsSupabase([])
      setDentistsSupabase([])
      return
    }
    Promise.all([listClinicsSupabase(), listDentistsSupabase()]).then(([clinics, dentists]) => {
      if (!active) return
      setClinicsSupabase(clinics)
      setDentistsSupabase(dentists)
    })
    return () => {
      active = false
    }
  }, [isSupabaseMode])

  useEffect(() => {
    let active = true
    if (!isSupabaseMode) {
      setSupabaseUsers([])
      return
    }
    // In Supabase mode, user management is based on profiles (server-side), not localStorage db.users.
    listProfiles().then((profiles) => {
      if (!active) return
      const mapped: User[] = profiles
        .filter((profile) => profile.deleted_at == null)
        .map((profile) => ({
          id: profile.user_id,
          name: (profile.full_name ?? '').trim() || (profile.login_email ?? '').trim() || profile.user_id,
          email: (profile.login_email ?? '').trim(),
          role: profile.role as Role,
          isActive: Boolean(profile.is_active),
          linkedClinicId: profile.clinic_id ?? undefined,
          linkedDentistId: profile.dentist_id ?? undefined,
          createdAt: profile.created_at ?? '',
          updatedAt: profile.updated_at ?? '',
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
      setSupabaseUsers(mapped)
    })
    return () => {
      active = false
    }
  }, [isSupabaseMode])

  const openNew = () => {
    setEditingUser(null)
    setModalTab('personal')
    setPasswordMode(isSupabaseMode ? 'manual' : 'auto')
    setForm({ name: '', email: '', password: isSupabaseMode ? '' : generatePassword(), cpf: '', birthDate: '', phone: '', addressLine: '', role: 'receptionist', isActive: true, linkedDentistId: '', linkedClinicId: '', sendAccessEmail: true })
    setInviteLink('')
    setError('')
    setModalOpen(true)
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    setModalTab('personal')
    setPasswordMode('manual')
    setForm({ name: user.name, email: user.email, password: '', cpf: user.cpf ?? '', birthDate: user.birthDate ?? '', phone: user.phone ?? '', addressLine: user.addressLine ?? '', role: user.role, isActive: user.isActive, linkedDentistId: user.linkedDentistId ?? '', linkedClinicId: user.linkedClinicId ?? '', sendAccessEmail: false })
    setInviteLink('')
    setError('')
    setModalOpen(true)
  }

  const submitUser = async () => {
    setError('')
    if (isSupabaseMode && !editingUser) {
      if (!form.name.trim()) return setError('Nome e obrigatorio.')
      if (!INVITE_ROLE_LIST.includes(form.role)) {
        return setError('Convite por link (Supabase) apenas para: Dentista Admin, Dentista Cliente, Clinica Cliente, Recepcao e Laboratorio.')
      }
      if (ROLE_REQUIRES_CLINIC.includes(form.role) && !form.linkedClinicId.trim()) {
        return setError('Clinica vinculada e obrigatoria para este perfil.')
      }
      if (form.role === 'dentist_client' && !form.linkedDentistId.trim()) {
        return setError('Dentista responsavel e obrigatorio para perfil Dentista Cliente.')
      }
      const result = await createOnboardingInvite({
        fullName: form.name.trim(),
        cpf: form.cpf || undefined,
        phone: form.phone || undefined,
        role: form.role,
        clinicId: form.linkedClinicId,
        dentistId: form.linkedDentistId || undefined,
      })
      if (!result.ok || !result.inviteLink) {
        return setError(result.ok ? 'Falha ao gerar link de convite.' : result.error)
      }
      setInviteLink(result.inviteLink)
      addToast({ type: 'success', title: 'Convite gerado', message: 'Envie o link para o colaborador concluir cadastro.' })
      return
    }

    if (!form.name.trim() || !form.email.trim()) return setError('Nome e email sao obrigatorios.')
    if (!editingUser && !form.password.trim()) return setError('Senha e obrigatoria para novo usuario.')
    const basePayload = {
      name: form.name.trim(),
      email: form.email.trim(),
      cpf: form.cpf || undefined,
      birthDate: form.birthDate || undefined,
      phone: form.phone || undefined,
      addressLine: form.addressLine || undefined,
      role: form.role,
      isActive: form.isActive,
      linkedDentistId: form.linkedDentistId || undefined,
      linkedClinicId: form.linkedClinicId || undefined,
    }
    const result = editingUser
      ? updateUser(editingUser.id, { ...basePayload, ...(form.password.trim() ? { password: form.password.trim() } : {}) })
      : createUser({ ...basePayload, password: form.password.trim() })
    if (!result.ok) return setError(result.error)
    setModalOpen(false)
    addToast({ type: 'success', title: editingUser ? 'Usuario atualizado' : 'Usuario criado' })
  }

  const linkage = (user: User) => {
    if (user.role === 'dentist_client') return dentistOptions.find((item) => item.id === user.linkedDentistId)?.name ?? '-'
    if (user.role === 'clinic_client') return clinicOptions.find((item) => item.id === user.linkedClinicId)?.tradeName ?? '-'
    if (user.role === 'lab_tech') return 'Laboratorio'
    return '-'
  }

  const saveTheme = (theme: AppThemeMode) => {
    applyTheme(theme)
    const next = addAuditEntry({ ...settingsState, theme }, { action: 'theme_changed', actor: currentUser?.email, details: theme })
    saveSystemSettings(next)
    setSettingsState(next)
  }

  const saveLab = () => {
    if (!labForm.tradeName.trim() || !labForm.legalName.trim() || !isValidCnpj(labForm.cnpj) || !labForm.email.trim() || !labForm.phone.trim() || !labForm.addressLine.trim()) {
      addToast({ type: 'error', title: 'Preencha os dados obrigatorios do laboratorio.' })
      return
    }
    const next = addAuditEntry({ ...settingsState, labCompany: { ...labForm, cnpj: formatCnpj(labForm.cnpj), updatedAt: new Date().toISOString() } }, { action: 'lab_profile_updated', actor: currentUser?.email, details: labForm.tradeName })
    saveSystemSettings(next)
    setSettingsState(next)
    addToast({ type: 'success', title: 'Cadastro salvo' })
  }

  const exportBackup = () => {
    downloadFile(`backup_orthoscan_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ db: JSON.parse(localStorage.getItem(DB_KEY) ?? '{}'), settings: settingsState }, null, 2), 'application/json')
  }

  const modalPermissions = groupedPermissionsForRole(form.role)
  const showLinkTab = !isSupabaseMode || ROLE_REQUIRES_LINK.includes(form.role)
  const availableRoleList = isSupabaseMode && !editingUser ? INVITE_ROLE_LIST : ROLE_LIST
  const dentistsForSelect = useMemo(() => {
    if (form.role !== 'dentist_client') return dentistOptions
    if (!form.linkedClinicId) return dentistOptions
    return dentistOptions.filter((dentist) => (dentist.clinicId ? dentist.clinicId === form.linkedClinicId : true))
  }, [dentistOptions, form.linkedClinicId, form.role])

  return (
    <AppShell breadcrumb={['Inicio', 'Configuracoes']}>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Configuracoes</h1>
        <p className="mt-2 text-sm text-slate-500">Gestao de cadastro, usuarios, atualizacao e diagnostico do sistema.</p>
      </section>
      <section className="mt-6">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'registration', label: 'Cadastro' },
            { id: 'users', label: 'Usuarios' },
            { id: 'system_update', label: 'Atualizacao do sistema' },
            { id: 'system_diagnostics', label: 'Diagnostico do sistema' },
          ].map((item) => (
            <button key={item.id} type="button" onClick={() => setMainTab(item.id as MainTab)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${mainTab === item.id ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{item.label}</button>
          ))}
        </div>
      </section>

      {mainTab === 'users' ? <section className="mt-4 space-y-4">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Usuarios</h2>
              <p className="text-sm text-slate-500">Tabela limpa com Perfil, status e vinculo.</p>
            </div>
            {canManageUsers ? <Button onClick={openNew}>{isSupabaseMode ? '+ Convidar colaborador' : '+ Novo usuario'}</Button> : null}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Usuario</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Perfil</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Vinculo</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {users.map((user) => <tr key={user.id} className="bg-white transition hover:bg-brand-50/40">
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-lg bg-brand-100 p-2 text-brand-700"><UserRound className="h-4 w-4" /></div>
                      <div><p className="text-sm font-semibold text-slate-900">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p><div className="mt-2"><Badge tone="info">{profileLabel(user.role)}</Badge></div></div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-700">{profileLabel(user.role)}</td>
                  <td className="px-5 py-4"><Badge tone={user.isActive ? 'success' : 'neutral'}>{user.isActive ? 'Ativo' : 'Inativo'}</Badge></td>
                  <td className="px-5 py-4 text-sm text-slate-700">{linkage(user)}</td>
                  <td className="px-5 py-4"><div className="flex flex-wrap gap-2">
                    {canManageUsers && !isSupabaseMode ? <Button size="sm" variant="secondary" onClick={() => openEdit(user)} title="Editar"><PenLine className="h-4 w-4" /></Button> : null}
                    {canManageUsers && !isSupabaseMode ? <Button size="sm" variant="ghost" onClick={() => setUserActive(user.id, !user.isActive)} title={user.isActive ? 'Desativar' : 'Ativar'}>{user.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button> : null}
                    {canManageUsers ? <Button size="sm" variant="ghost" onClick={async () => {
                      if (DATA_MODE === 'supabase') {
                        const result = await requestPasswordReset({ email: user.email })
                        if (!result.ok) return addToast({ type: 'error', title: result.error })
                        if (result.warning) return addToast({ type: 'error', title: result.warning })
                        return addToast({ type: 'success', title: `Token enviado para ${user.email}` })
                      }
                      const p = generatePassword()
                      resetUserPassword(user.id, p)
                      addToast({ type: 'info', title: `Senha temporaria: ${p}` })
                    }} title="Redefinir senha"><LockKeyhole className="h-4 w-4" /></Button> : null}
                    {canManageUsers ? <Button size="sm" variant="ghost" onClick={async () => {
                      if (DATA_MODE === 'supabase') {
                        const result = await sendAccessEmail({ email: user.email, fullName: user.name })
                        if (!result.ok) return addToast({ type: 'error', title: result.error })
                        return addToast({ type: 'success', title: `Acesso enviado para ${user.email}` })
                      }
                      addToast({ type: 'info', title: `Acesso enviado para ${user.email}` })
                    }} title="Enviar acesso por email"><Mail className="h-4 w-4" /></Button> : null}
                    {canDeleteUsers && !isSupabaseMode ? <Button size="sm" variant="ghost" className="text-red-600" onClick={() => softDeleteUser(user.id)} title="Excluir"><Trash2 className="h-4 w-4" /></Button> : null}
                  </div></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Perfis e permissoes</h2>
          <div className="mt-4 space-y-4">
            {ROLE_LIST.map((role) => {
              const grouped = groupedPermissionsForRole(role)
              return <div key={role} className="rounded-lg border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">{profileLabel(role)}</p>
                <p className="mt-1 text-xs text-slate-500">{profileDescription(role)}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {MODULE_ORDER.filter((module) => (grouped[module] ?? []).length > 0).map((module) => <div key={`${role}_${module}`} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{module}</p>
                    <div className="mt-2 flex flex-wrap gap-2">{(grouped[module] ?? []).map((permission) => <Badge key={permission} tone="neutral">{permissionLabel(permission)}</Badge>)}</div>
                  </div>)}
                </div>
              </div>
            })}
          </div>
        </Card>
      </section> : null}

      {mainTab === 'registration' ? <section className="mt-4 space-y-4">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Tema</h2>
          <div className="mt-3 flex gap-2"><Button variant={settingsState.theme === 'light' ? 'primary' : 'secondary'} onClick={() => saveTheme('light')}>Light</Button><Button variant={settingsState.theme === 'dark' ? 'primary' : 'secondary'} onClick={() => saveTheme('dark')}>Dark</Button></div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Cadastro do laboratorio</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Nome do laboratorio *</label><Input value={labForm.tradeName} onChange={(event) => setLabForm((c) => ({ ...c, tradeName: event.target.value }))} /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Razao social *</label><Input value={labForm.legalName} onChange={(event) => setLabForm((c) => ({ ...c, legalName: event.target.value }))} /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">CNPJ *</label><Input value={labForm.cnpj} onChange={(event) => setLabForm((c) => ({ ...c, cnpj: formatCnpj(event.target.value) }))} /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Email empresarial *</label><Input type="email" value={labForm.email} onChange={(event) => setLabForm((c) => ({ ...c, email: event.target.value }))} /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Telefone *</label><Input value={labForm.phone} onChange={(event) => setLabForm((c) => ({ ...c, phone: event.target.value }))} /></div>
            <div className="sm:col-span-2"><label className="mb-1 block text-sm font-medium text-slate-700">Endereco completo *</label><Input value={labForm.addressLine} onChange={(event) => setLabForm((c) => ({ ...c, addressLine: event.target.value }))} /></div>
          </div>
          <div className="mt-4"><Button onClick={saveLab}>Salvar cadastro do laboratorio</Button></div>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Ajuda e LGPD</h2>
          <p className="mt-1 text-sm text-slate-500">Tutoriais rapidos e documentos legais para entrega/operacao.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/app/help" className="text-sm font-semibold text-brand-700 hover:text-brand-500">Abrir Ajuda</Link>
            <span className="text-slate-300">|</span>
            <Link to="/legal/terms" className="text-sm font-semibold text-brand-700 hover:text-brand-500">Termos</Link>
            <span className="text-slate-300">|</span>
            <Link to="/legal/privacy" className="text-sm font-semibold text-brand-700 hover:text-brand-500">Privacidade</Link>
            <span className="text-slate-300">|</span>
            <Link to="/legal/lgpd" className="text-sm font-semibold text-brand-700 hover:text-brand-500">Direitos LGPD</Link>
          </div>
        </Card>
      </section> : null}

      {mainTab === 'system_update' ? <section className="mt-4 space-y-4">
        <Card><h2 className="text-lg font-semibold text-slate-900">Backup</h2><div className="mt-3"><Button onClick={exportBackup}>Gerar backup</Button></div></Card>
        {DATA_MODE === 'local' ? <Card><h2 className="text-lg font-semibold text-slate-900">Dados locais</h2><div className="mt-3"><Button variant="ghost" className="text-red-700" onClick={() => { resetDb('empty'); clearSession(); window.location.reload() }}>Limpar dados locais</Button></div></Card> : null}
      </section> : null}

      {mainTab === 'system_diagnostics' ? <section className="mt-4"><Card className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-semibold text-slate-900">Diagnostico do sistema</h2><p className="mt-1 text-sm text-slate-500">Checklist automatico de recursos e dados.</p></div><Link to="/app/settings/diagnostics" className="inline-flex"><Button>Abrir diagnostico</Button></Link></Card></section> : null}

      {modalOpen ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
        <Card className="w-full max-w-3xl">
          <h2 className="text-xl font-semibold text-slate-900">
            {editingUser ? 'Editar usuario' : isSupabaseMode ? 'Convidar colaborador' : 'Novo usuario'}
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {(isSupabaseMode
              ? [{ id: 'personal', label: 'Dados pessoais' }, { id: 'profile', label: 'Perfil e permissoes' }, ...(showLinkTab ? [{ id: 'link', label: 'Vinculo' }] : [])]
              : [{ id: 'personal', label: 'Dados pessoais' }, { id: 'access', label: 'Acesso (login e senha)' }, { id: 'profile', label: 'Perfil e permissoes' }, { id: 'link', label: 'Vinculo' }]
            ).map((tab) => <button key={tab.id} type="button" onClick={() => setModalTab(tab.id as ModalTab)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${modalTab === tab.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{tab.label}</button>)}
          </div>
          {modalTab === 'personal' ? <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="mb-1 block text-sm font-medium text-slate-700">Nome completo</label><Input aria-label="Nome completo" value={form.name} onChange={(event) => setForm((c) => ({ ...c, name: event.target.value }))} /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">CPF</label><Input value={form.cpf} onChange={(event) => setForm((c) => ({ ...c, cpf: event.target.value }))} /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Data de nascimento</label><Input type="date" value={form.birthDate} onChange={(event) => setForm((c) => ({ ...c, birthDate: event.target.value }))} /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Telefone</label><Input value={form.phone} onChange={(event) => setForm((c) => ({ ...c, phone: event.target.value }))} /></div>
            <div className="sm:col-span-2"><label className="mb-1 block text-sm font-medium text-slate-700">Endereco completo</label><Input value={form.addressLine} onChange={(event) => setForm((c) => ({ ...c, addressLine: event.target.value }))} /></div>
          </div> : null}
          {!isSupabaseMode && modalTab === 'access' ? <div className="mt-4 space-y-4">
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Email (login)</label><Input aria-label="Email (login)" type="email" value={form.email} onChange={(event) => setForm((c) => ({ ...c, email: event.target.value }))} /></div>
            <div><label className="mb-1 block text-sm font-medium text-slate-700">Senha</label><div className="flex items-center gap-2"><div className="relative flex-1"><Input aria-label="Senha" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => setForm((c) => ({ ...c, password: event.target.value }))} className="pr-12" /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div><Button variant={passwordMode === 'manual' ? 'secondary' : 'ghost'} size="sm" onClick={() => setPasswordMode('manual')}>Manual</Button><Button variant={passwordMode === 'auto' ? 'secondary' : 'ghost'} size="sm" onClick={() => { setPasswordMode('auto'); setForm((c) => ({ ...c, password: generatePassword() })) }}>Auto</Button></div></div>
            <div className="flex flex-wrap gap-2"><Button variant="secondary" size="sm" onClick={() => setForm((c) => ({ ...c, password: generatePassword() }))}><WandSparkles className="mr-2 h-4 w-4" />Gerar senha automatica</Button><Button variant="ghost" size="sm" onClick={async () => {
              if (!form.email.trim()) return addToast({ type: 'error', title: 'Informe um email.' })
              if (DATA_MODE === 'supabase') {
                const result = await sendAccessEmail({ email: form.email.trim(), fullName: form.name.trim() || undefined })
                if (!result.ok) return addToast({ type: 'error', title: result.error })
                return addToast({ type: 'success', title: `Acesso enviado para ${form.email}` })
              }
              addToast({ type: 'info', title: `Acesso enviado para ${form.email || '-'}` })
            }}><Mail className="mr-2 h-4 w-4" />Enviar acesso por email</Button></div>
          </div> : null}
          {modalTab === 'profile' ? <div className="mt-4 space-y-4"><div><label className="mb-1 block text-sm font-medium text-slate-700">Perfil</label><select value={form.role} onChange={(event) => {
            const nextRole = event.target.value as Role
            setForm((c) => ({ ...c, role: nextRole, linkedDentistId: nextRole === 'dentist_client' ? c.linkedDentistId : '' }))
          }} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm">{availableRoleList.map((role) => <option key={role} value={role}>{profileLabel(role)}</option>)}</select>{isSupabaseMode ? <p className="mt-1 text-xs text-slate-500">Convite por link apenas para perfis operacionais (nao-admin).</p> : null}{isSupabaseMode && form.role === 'dentist_admin' ? <div className="mt-3"><label className="mb-1 block text-sm font-medium text-slate-700">Clinica vinculada</label><select value={form.linkedClinicId} onChange={(event) => setForm((c) => ({ ...c, linkedClinicId: event.target.value }))} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Selecione</option>{clinicOptions.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.tradeName}</option>)}</select></div> : null}</div><div className="rounded-lg border border-slate-200 p-4"><p className="text-sm font-semibold text-slate-900">{profileDescription(form.role)}</p><div className="mt-2 space-y-2">{MODULE_ORDER.filter((module) => (modalPermissions[module] ?? []).length > 0).map((module) => <div key={module}><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{module}</p><div className="mt-1 flex flex-wrap gap-2">{(modalPermissions[module] ?? []).map((permission) => <Badge key={permission} tone="neutral">{permissionLabel(permission)}</Badge>)}</div></div>)}</div></div></div> : null}
          {modalTab === 'link' && showLinkTab ? <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="mb-1 block text-sm font-medium text-slate-700">Clinica vinculada</label><select value={form.linkedClinicId} onChange={(event) => setForm((c) => ({ ...c, linkedClinicId: event.target.value, linkedDentistId: '' }))} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Selecione</option>{clinicOptions.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.tradeName}</option>)}</select></div>{form.role === 'dentist_client' ? <div className="sm:col-span-2"><label className="mb-1 block text-sm font-medium text-slate-700">Dentista responsavel</label><select value={form.linkedDentistId} onChange={(event) => setForm((c) => ({ ...c, linkedDentistId: event.target.value }))} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">Selecione</option>{dentistsForSelect.map((dentist) => <option key={dentist.id} value={dentist.id}>{dentist.name}</option>)}</select></div> : null}</div> : null}
          {inviteLink ? <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Link de cadastro</p>
            <p className="mt-1 break-all text-sm text-emerald-800">{inviteLink}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(inviteLink)}>
                Copiar link
              </Button>
              <Button size="sm" variant="ghost" onClick={() => window.open(inviteLink, '_blank')}>
                Abrir link
              </Button>
            </div>
          </div> : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={submitUser}>{isSupabaseMode && !editingUser ? 'Gerar link de cadastro' : 'Salvar'}</Button>
          </div>
        </Card>
      </div> : null}
    </AppShell>
  )
}
