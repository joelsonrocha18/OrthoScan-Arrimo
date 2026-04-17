import type { OrthoDomainEvent, OrthoDomainEventName } from '../../../types/Domain'
import { nowIsoDateTime } from '../../utils/date'
import { createEntityId } from '../../utils/id'

export function createOrthoDomainEvent(
  name: OrthoDomainEventName,
  aggregateId: string,
  aggregateType: OrthoDomainEvent['aggregateType'],
  context: Record<string, unknown> = {},
  occurredAt = nowIsoDateTime(),
): OrthoDomainEvent {
  return {
    id: createEntityId('domain-event'),
    name,
    aggregateId,
    aggregateType,
    occurredAt,
    context,
  }
}

export function mergeOrthoDomainEvents(
  existing: OrthoDomainEvent[] = [],
  incoming: OrthoDomainEvent[] = [],
) {
  const merged = new Map<string, OrthoDomainEvent>()
  ;[...existing, ...incoming]
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
    .forEach((event) => {
      const key = `${event.name}::${event.aggregateId}::${event.occurredAt}`
      if (!merged.has(key)) {
        merged.set(key, event)
      }
    })
  return [...merged.values()].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
}
