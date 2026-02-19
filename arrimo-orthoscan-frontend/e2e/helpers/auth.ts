import { expect, type Page } from '@playwright/test'
import { DB_KEY, makeE2ESeedDb } from './dbSeed'

export async function seedDbAndStart(page: Page) {
  const db = makeE2ESeedDb()
  await page.addInitScript(
    ({ key, data }) => {
      window.localStorage.setItem(key, JSON.stringify(data))
    },
    { key: DB_KEY, data: db },
  )
}

export async function loginAs(page: Page, userId: string) {
  const emailById: Record<string, string> = {
    qa_user_master: 'master.qa@local',
    qa_user_admin: 'admin.qa@local',
    qa_user_dentist_client: 'dentist.client.qa@local',
    qa_user_clinic_client: 'clinic.client.qa@local',
    qa_user_lab: 'lab.qa@local',
    qa_user_reception: 'reception.qa@local',
  }

  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Entrar', level: 2 })).toBeVisible()

  const select = page.locator('select')
  if (await select.count()) {
    await select.selectOption(userId)
  } else {
    await page.getByLabel('Email').fill(emailById[userId])
    await page.getByLabel('Senha').fill('123456')
  }

  await page.getByRole('button', { name: 'Entrar' }).click({ noWaitAfter: true })
  await expect(page).toHaveURL(/\/app\/dashboard/)
}
