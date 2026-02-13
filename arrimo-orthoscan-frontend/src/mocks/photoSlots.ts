import type { PhotoSlot } from '../types/Scan'

export const INTRA_SLOTS: PhotoSlot[] = [
  { id: 'intra_frontal', label: 'Intraoral - Frontal', kind: 'foto_intra' },
  { id: 'intra_lateral_dir', label: 'Intraoral - Lateral direita', kind: 'foto_intra' },
  { id: 'intra_lateral_esq', label: 'Intraoral - Lateral esquerda', kind: 'foto_intra' },
  { id: 'intra_oclusal_sup', label: 'Intraoral - Oclusal superior', kind: 'foto_intra' },
  { id: 'intra_oclusal_inf', label: 'Intraoral - Oclusal inferior', kind: 'foto_intra' },
]

export const EXTRA_SLOTS: PhotoSlot[] = [
  { id: 'extra_face_frontal', label: 'Extraoral - Face frontal', kind: 'foto_extra' },
  { id: 'extra_face_lateral_dir', label: 'Extraoral - Face lateral direita', kind: 'foto_extra' },
  { id: 'extra_face_lateral_esq', label: 'Extraoral - Face lateral esquerda', kind: 'foto_extra' },
  { id: 'extra_diagonal_dir', label: 'Extraoral - Diagonal direita (3/4)', kind: 'foto_extra' },
  { id: 'extra_diagonal_esq', label: 'Extraoral - Diagonal esquerda (3/4)', kind: 'foto_extra' },
  { id: 'extra_sorriso_frontal', label: 'Extraoral - Sorriso frontal', kind: 'foto_extra' },
]
