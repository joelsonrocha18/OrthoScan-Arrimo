import { test, expect } from '@playwright/test'
import { loginAs, seedDbAndStart } from './helpers/auth'

test('scan to case to lab flow', async ({ page }) => {
  await seedDbAndStart(page)
  await loginAs(page, 'qa_user_master')

  await page.goto('/app/scans', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Criar Caso' }).first().click({ noWaitAfter: true })
  await page.getByRole('button', { name: 'Criar Caso' }).nth(1).click({ noWaitAfter: true })

  await expect(page).toHaveURL(/\/app\/cases\//)
  await expect(page.getByText(/Queixa do paciente:/i)).toBeVisible()
  await expect(page.getByText(/Orienta.*do dentista:/i)).toBeVisible()
  await expect(page.getByText('Queixa A')).toBeVisible()
  await expect(page.getByText('Orientacao A')).toBeVisible()

  await page.getByRole('button', { name: 'Concluir planejamento' }).click()
  const closeBudgetButton = page.getByRole('button', { name: 'Fechar orcamento' })
  await expect(closeBudgetButton).toBeEnabled()
  const caseId = page.url().split('/').pop() ?? ''
  // Make the budget->contract transition deterministic in E2E by updating the seeded local DB directly.
  await page.evaluate(
    ({ caseId: id }) => {
      const key = 'arrimo_orthoscan_db_v1'
      const raw = window.localStorage.getItem(key)
      if (!raw) return
      const db = JSON.parse(raw) as { cases?: Array<Record<string, unknown>> }
      const cases = Array.isArray(db.cases) ? db.cases : []
      db.cases = cases.map((c) => {
        const currentId = typeof c.id === 'string' ? c.id : ''
        if (currentId !== id) return c
        const currentContract =
          typeof c.contract === 'object' && c.contract !== null ? (c.contract as Record<string, unknown>) : {}
        return {
          ...c,
          phase: 'contrato_pendente',
          budget: { value: 12000, createdAt: new Date().toISOString() },
          contract: { ...currentContract, status: 'pendente' },
          updatedAt: new Date().toISOString(),
        }
      })
      window.localStorage.setItem(key, JSON.stringify(db))
      window.dispatchEvent(new Event('arrimo:db_changed'))
    },
    { caseId },
  )

  // Wait for the case phase transition after saving to local storage.
  await expect(page.getByText('Fase atual: Contrato pendente')).toBeVisible({ timeout: 30_000 })
  const approveButton = page.getByRole('button', { name: 'Aprovar contrato' })
  await expect(approveButton).toBeEnabled({ timeout: 30_000 })
  await approveButton.click()
  await page.getByRole('button', { name: 'Gerar OS para o LAB' }).click()

  await page.goto('/app/lab')
  await expect(page.getByRole('heading', { level: 3, name: 'Aguardando iniciar' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: /Em produ/ })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Controle de qualidade' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Prontas' })).toBeVisible()
})
