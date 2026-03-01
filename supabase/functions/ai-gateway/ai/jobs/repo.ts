type SupabaseLike = {
  from: (table: string) => {
    insert: (payload: Record<string, unknown>) => {
      select: (columns: string) => {
        single: () => Promise<{ data: Record<string, unknown> | null; error: { message?: string } | null }>
      }
    }
    update: (payload: Record<string, unknown>) => {
      eq: (column: string, value: string) => Promise<{ error: { message?: string } | null }>
    }
  }
}

export async function createAiJob(
  supabase: SupabaseLike,
  payload: {
    clinicId: string
    userId: string
    feature: string
    inputHash: string
    inputRedacted: Record<string, unknown>
  },
) {
  const { data, error } = await supabase
    .from('ai_jobs')
    .insert({
      clinic_id: payload.clinicId,
      user_id: payload.userId,
      feature: payload.feature,
      input_hash: payload.inputHash,
      input_redacted: payload.inputRedacted,
      status: 'queued',
    })
    .select('id')
    .single()

  if (error || !data?.id) throw new Error(error?.message ?? 'Falha ao criar ai_job.')
  return String(data.id)
}

export async function updateAiJobStatus(
  supabase: SupabaseLike,
  jobId: string,
  payload: {
    status: 'processing' | 'done' | 'failed'
    output?: string
    error?: string
    tokensIn?: number
    tokensOut?: number
    costEstimated?: number
  },
) {
  const { error } = await supabase
    .from('ai_jobs')
    .update({
      status: payload.status,
      output: payload.output ?? null,
      error: payload.error ?? null,
      tokens_in: payload.tokensIn ?? 0,
      tokens_out: payload.tokensOut ?? 0,
      cost_estimated: payload.costEstimated ?? 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
  if (error) throw new Error(error.message ?? 'Falha ao atualizar ai_job.')
}
