import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabaseClient'
import { listCaseLabItemsSupabase } from '../../../../repo/profileRepo'
import type { Case } from '../../../../types/Case'
import type { LabItem } from '../../../../types/Lab'
import { mapSupabaseCaseRow } from '../../infra/supabase/supabaseCaseMappers'

type SupabaseCaseRefs = {
  clinicName?: string
  dentistName?: string
  dentistGender?: string
  requesterName?: string
  requesterGender?: string
  patientBirthDate?: string
  patientWhatsapp?: string
  requestedProductId?: string
  requestedProductLabel?: string
}

export function useCaseSupabaseDetail(
  caseId: string | undefined,
  isSupabaseMode: boolean,
  syncTick: number,
) {
  const [supabaseCase, setSupabaseCase] = useState<Case | null>(null)
  const [supabaseLabItems, setSupabaseLabItems] = useState<LabItem[]>([])
  const [supabaseCaseRefs, setSupabaseCaseRefs] = useState<SupabaseCaseRefs>({})
  const [refreshKey, setRefreshKey] = useState(0)
  const refreshSupabase = useCallback(() => setRefreshKey((current) => current + 1), [])

  useEffect(() => {
    if (!isSupabaseMode || !supabase || !caseId) {
      setSupabaseCase(null)
      return
    }
    let active = true
    void (async () => {
      const { data } = await supabase
        .from('cases')
        .select('id, product_type, product_id, scan_id, clinic_id, patient_id, dentist_id, requested_by_dentist_id, data, deleted_at')
        .eq('id', caseId)
        .is('deleted_at', null)
        .maybeSingle()
      if (!active) return
      if (!data) {
        setSupabaseCase(null)
        return
      }
      setSupabaseCase(
        mapSupabaseCaseRow(data as {
          id: string
          product_type?: string
          product_id?: string
          scan_id?: string | null
          clinic_id?: string | null
          patient_id?: string | null
          dentist_id?: string | null
          requested_by_dentist_id?: string | null
          data?: Record<string, unknown>
        }),
      )
    })()
    return () => {
      active = false
    }
  }, [caseId, isSupabaseMode, refreshKey, syncTick])

  useEffect(() => {
    if (!isSupabaseMode || !caseId) {
      setSupabaseLabItems([])
      return
    }
    let active = true
    void listCaseLabItemsSupabase(caseId).then((items) => {
      if (!active) return
      setSupabaseLabItems(items)
    })
    return () => {
      active = false
    }
  }, [caseId, isSupabaseMode, refreshKey, syncTick])

  useEffect(() => {
    if (!isSupabaseMode || !supabase || !supabaseCase) {
      setSupabaseCaseRefs({})
      return
    }
    let active = true
    void (async () => {
      const [clinicRes, dentistRes, requesterRes, patientRes, scanRes] = await Promise.all([
        supabaseCase.clinicId
          ? supabase.from('clinics').select('id, trade_name').eq('id', supabaseCase.clinicId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabaseCase.dentistId
          ? supabase.from('dentists').select('id, name, gender').eq('id', supabaseCase.dentistId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabaseCase.requestedByDentistId
          ? supabase.from('dentists').select('id, name, gender').eq('id', supabaseCase.requestedByDentistId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabaseCase.patientId
          ? supabase.from('patients').select('id, birth_date, whatsapp, phone').eq('id', supabaseCase.patientId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabaseCase.sourceScanId
          ? supabase.from('scans').select('id, data').eq('id', supabaseCase.sourceScanId).maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      if (!active) return
      const scanData = ((scanRes.data as { data?: Record<string, unknown> } | null)?.data ?? {}) as Record<string, unknown>
      setSupabaseCaseRefs({
        clinicName: (clinicRes.data as { trade_name?: string } | null)?.trade_name,
        dentistName: (dentistRes.data as { name?: string } | null)?.name,
        dentistGender: (dentistRes.data as { gender?: string } | null)?.gender,
        requesterName: (requesterRes.data as { name?: string } | null)?.name,
        requesterGender: (requesterRes.data as { gender?: string } | null)?.gender,
        patientBirthDate: (patientRes.data as { birth_date?: string } | null)?.birth_date,
        patientWhatsapp: (patientRes.data as { whatsapp?: string; phone?: string } | null)?.whatsapp
          ?? (patientRes.data as { whatsapp?: string; phone?: string } | null)?.phone,
        requestedProductId: supabaseCase.requestedProductId ?? (scanData.purposeProductId as string | undefined),
        requestedProductLabel: supabaseCase.requestedProductLabel ?? (scanData.purposeLabel as string | undefined),
      })
    })()
    return () => {
      active = false
    }
  }, [isSupabaseMode, refreshKey, supabaseCase, syncTick])

  return {
    supabaseCase,
    supabaseLabItems,
    supabaseCaseRefs,
    refreshSupabase,
  }
}
