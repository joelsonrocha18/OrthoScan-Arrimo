import { test, expect } from '@playwright/test'
import { loginAs, seedDbAndStart } from './helpers/auth'

test('dentist_client sees only scoped records and cannot access diagnostics', async ({ page }) => {
  await seedDbAndStart(page)
  await loginAs(page, 'qa_user_dentist_client')

  await page.goto('/app/patients')
  await expect(page.getByText('Paciente 1')).toBeVisible()
  await expect(page.getByText('Paciente 2')).toBeVisible()
  await expect(page.getByText('Paciente 4')).toHaveCount(0)

  await page.goto('/app/scans')
  await expect(page.getByText('Paciente 1')).toBeVisible()
  await expect(page.getByText('Paciente 4')).toHaveCount(0)

  await page.goto('/app/cases')
  await expect(page.getByText('Paciente 1')).toBeVisible()
  await expect(page.getByText('Paciente 4')).toHaveCount(0)

  await page.goto('/app/settings/diagnostics')
  await expect(page.getByRole('heading', { name: 'Sem acesso' })).toBeVisible()
})

test('lab_tech can access LAB but cannot access patients page', async ({ page }) => {
  await seedDbAndStart(page)
  await loginAs(page, 'qa_user_lab')

  await page.goto('/app/lab')
  await expect(page.getByText('Fila de produção e entregas')).toBeVisible()

  await page.goto('/app/patients')
  await expect(page.getByRole('heading', { name: 'Sem acesso' })).toBeVisible()
})
