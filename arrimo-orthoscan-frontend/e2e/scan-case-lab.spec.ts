import { test, expect } from '@playwright/test'
import { loginAs, seedDbAndStart } from './helpers/auth'

test('scan to case to lab flow', async ({ page }) => {
  await seedDbAndStart(page)
  await loginAs(page, 'qa_user_master')

  await page.goto('/app/scans')
  await page.getByRole('button', { name: 'Criar Caso' }).first().click()
  await page.getByRole('button', { name: 'Criar Caso' }).nth(1).click()

  await expect(page).toHaveURL(/\/app\/cases\//)
  await expect(page.getByText('Queixa do paciente:')).toBeVisible()
  await expect(page.getByText('Orientação do dentista:')).toBeVisible()
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
      const db = JSON.parse(raw) as any
      db.cases = (db.cases ?? []).map((c: any) => {
        if (c.id !== id) return c
        return {
          ...c,
          phase: 'contrato_pendente',
          budget: { value: 12000, createdAt: new Date().toISOString() },
          contract: { ...(c.contract ?? {}), status: 'pendente' },
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
  await expect(page.getByRole('heading', { level: 3, name: 'Em producao' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Controle de qualidade' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Prontas' })).toBeVisible()
})
