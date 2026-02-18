import { test, expect } from '@playwright/test'
import { loginAs, seedDbAndStart } from './helpers/auth'

test('smoke routes for master_admin', async ({ page }) => {
  await seedDbAndStart(page)
  await loginAs(page, 'qa_user_master')

  const routes: Array<{ path: string; marker: string }> = [
    { path: '/app/dashboard', marker: 'OrthoScan | Painel Operacional' },
    { path: '/app/scans', marker: 'Exames (Scans)' },
    { path: '/app/cases', marker: 'Casos' },
    { path: '/app/lab', marker: 'Fila de produção e entregas' },
    { path: '/app/dentists', marker: 'Dentistas' },
    { path: '/app/patients', marker: 'Pacientes' },
    { path: '/app/settings/diagnostics', marker: 'Diagnostico do Sistema' },
  ]

  for (const route of routes) {
    await page.goto(route.path)
    await expect(page).toHaveURL(new RegExp(route.path.replace('/', '\\/')))
    await expect(page.getByText(route.marker).first()).toBeVisible()
  }
})
