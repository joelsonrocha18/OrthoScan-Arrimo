export const SYSTEM_SETTINGS_KEY = 'arrimo_orthoscan_system_settings_v1'

export type AppThemeMode = 'light' | 'dark'

export type LabCompanyProfile = {
  tradeName: string
  legalName: string
  cnpj: string
  email: string
  phone: string
  whatsapp: string
  website?: string
  addressLine: string
  logoDataUrl?: string
  updatedAt?: string
}

export type SystemAuditEntry = {
  id: string
  createdAt: string
  action: string
  actor?: string
  details?: string
}

export type SystemSettings = {
  theme: AppThemeMode
  labCompany: LabCompanyProfile
  audit: SystemAuditEntry[]
}

const emptyLabCompany: LabCompanyProfile = {
  tradeName: '',
  legalName: '',
  cnpj: '',
  email: '',
  phone: '',
  whatsapp: '',
  website: '',
  addressLine: '',
  logoDataUrl: undefined,
  updatedAt: undefined,
}

const defaultSettings: SystemSettings = {
  theme: 'light',
  labCompany: emptyLabCompany,
  audit: [],
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object'
}

export function loadSystemSettings(): SystemSettings {
  const raw = localStorage.getItem(SYSTEM_SETTINGS_KEY)
  if (!raw) return defaultSettings

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isObject(parsed)) return defaultSettings

    const theme = parsed.theme === 'dark' ? 'dark' : 'light'
    const companyRaw = isObject(parsed.labCompany) ? parsed.labCompany : {}

    const labCompany: LabCompanyProfile = {
      tradeName: String(companyRaw.tradeName ?? ''),
      legalName: String(companyRaw.legalName ?? ''),
      cnpj: String(companyRaw.cnpj ?? ''),
      email: String(companyRaw.email ?? ''),
      phone: String(companyRaw.phone ?? ''),
      whatsapp: String(companyRaw.whatsapp ?? ''),
      website: String(companyRaw.website ?? ''),
      addressLine: String(companyRaw.addressLine ?? ''),
      logoDataUrl: typeof companyRaw.logoDataUrl === 'string' ? companyRaw.logoDataUrl : undefined,
      updatedAt: typeof companyRaw.updatedAt === 'string' ? companyRaw.updatedAt : undefined,
    }

    const auditRaw = Array.isArray(parsed.audit) ? parsed.audit : []
    const audit: SystemAuditEntry[] = auditRaw
      .filter(isObject)
      .map((item) => ({
        id: String(item.id ?? `audit_${Date.now()}`),
        createdAt: String(item.createdAt ?? new Date().toISOString()),
        action: String(item.action ?? 'unknown'),
        actor: typeof item.actor === 'string' ? item.actor : undefined,
        details: typeof item.details === 'string' ? item.details : undefined,
      }))

    return {
      theme,
      labCompany,
      audit,
    }
  } catch {
    return defaultSettings
  }
}

export function saveSystemSettings(settings: SystemSettings) {
  localStorage.setItem(SYSTEM_SETTINGS_KEY, JSON.stringify(settings))
}

export function applyTheme(theme: AppThemeMode) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function applyStoredTheme() {
  const settings = loadSystemSettings()
  applyTheme(settings.theme)
}

export function addAuditEntry(
  settings: SystemSettings,
  payload: { action: string; actor?: string; details?: string },
): SystemSettings {
  const entry: SystemAuditEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    createdAt: new Date().toISOString(),
    action: payload.action,
    actor: payload.actor,
    details: payload.details,
  }

  return {
    ...settings,
    audit: [entry, ...settings.audit].slice(0, 200),
  }
}
