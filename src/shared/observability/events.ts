export const BUSINESS_EVENTS = {
  CASE_CREATED: 'case.created',
  CASE_STATUS_CHANGED: 'case.status_changed',
  LAB_SENT: 'lab.sent',
  LAB_DELIVERED: 'lab.delivered',
  LAB_REWORK_REGISTERED: 'lab.rework_registered',
} as const

export type BusinessEventName = typeof BUSINESS_EVENTS[keyof typeof BUSINESS_EVENTS]
