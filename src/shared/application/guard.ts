import { can, type Permission } from '../../auth/permissions'
import { logger } from '../../lib/logger'
import {
  createForbiddenError,
  createUnauthorizedError,
  err,
  ok,
  toAppError,
  type Result,
} from '../errors'

type FlowGuardContext = {
  flow: string
  action: string
  actorId?: string
  actorRole?: string
  targetId?: string
  permission?: Permission
  context?: Record<string, unknown>
}

type GuardActor = {
  id?: string
  role?: string
} | null | undefined

export function unwrapResult<T, E>(result: Result<T, E>, mapper?: (error: E) => Error) {
  if (result.ok) return result.data
  if (mapper) throw mapper(result.error)
  throw toAppError(result.error)
}

export function assertActorPermission(actor: GuardActor, permission: Permission, flow: string) {
  if (!actor?.id) {
    throw createUnauthorizedError(`Sessão inválida para ${flow}.`)
  }
  const allowed = can(actor as Parameters<typeof can>[0], permission)
  if (!allowed) {
    throw createForbiddenError(`Sem permissao para ${flow}.`, { permission, actorRole: actor.role })
  }
}

export function runGuarded<T>(meta: FlowGuardContext, action: () => T): Result<T, string> {
  logger.info('Iniciando fluxo critico.', {
    flow: meta.flow,
    action: meta.action,
    actorId: meta.actorId,
    actorRole: meta.actorRole,
    targetId: meta.targetId,
    permission: meta.permission,
    ...meta.context,
  })
  try {
    const data = action()
    logger.info('Fluxo critico concluido.', {
      flow: meta.flow,
      action: meta.action,
      actorId: meta.actorId,
      targetId: meta.targetId,
    })
    return ok(data)
  } catch (error) {
    const appError = toAppError(error, `Falha em ${meta.flow}.`)
    logger.error(
      'Falha em fluxo critico.',
      {
        flow: meta.flow,
        action: meta.action,
        actorId: meta.actorId,
        actorRole: meta.actorRole,
        targetId: meta.targetId,
        permission: meta.permission,
        code: appError.code,
        ...meta.context,
      },
      appError,
    )
    return err(appError.message)
  }
}

export async function runGuardedAsync<T>(meta: FlowGuardContext, action: () => Promise<T>): Promise<Result<T, string>> {
  logger.info('Iniciando fluxo critico.', {
    flow: meta.flow,
    action: meta.action,
    actorId: meta.actorId,
    actorRole: meta.actorRole,
    targetId: meta.targetId,
    permission: meta.permission,
    ...meta.context,
  })
  try {
    const data = await action()
    logger.info('Fluxo critico concluido.', {
      flow: meta.flow,
      action: meta.action,
      actorId: meta.actorId,
      targetId: meta.targetId,
    })
    return ok(data)
  } catch (error) {
    const appError = toAppError(error, `Falha em ${meta.flow}.`)
    logger.error(
      'Falha em fluxo critico.',
      {
        flow: meta.flow,
        action: meta.action,
        actorId: meta.actorId,
        actorRole: meta.actorRole,
        targetId: meta.targetId,
        permission: meta.permission,
        code: appError.code,
        ...meta.context,
      },
      appError,
    )
    return err(appError.message)
  }
}
