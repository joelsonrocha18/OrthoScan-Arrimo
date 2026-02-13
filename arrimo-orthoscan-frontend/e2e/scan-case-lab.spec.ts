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
  await page.getByPlaceholder('Valor do orcamento').fill('12000')
  await page.getByRole('button', { name: 'Fechar orcamento' }).click()
  await page.getByRole('button', { name: 'Aprovar contrato' }).click()
  await page.getByRole('button', { name: 'Gerar OS para o LAB' }).click()

  await page.goto('/app/lab')
  await expect(page.getByText('Aguardando iniciar').first()).toBeVisible()
  await expect(page.getByText('Em producao').first()).toBeVisible()
  await expect(page.getByText('Controle de qualidade').first()).toBeVisible()
  await expect(page.getByText('Prontas').first()).toBeVisible()
})
