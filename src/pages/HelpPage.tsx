import { Link } from 'react-router-dom'
import Card from '../components/Card'
import AppShell from '../layouts/AppShell'

type HelpSection = {
  title: string
  links: Array<{ label: string; to: string }>
}

const HELP: HelpSection[] = [
  {
    title: 'Acessos',
    links: [
      { label: 'Login', to: '/login' },
      { label: 'Exames', to: '/app/scans' },
      { label: 'Alinhadores', to: '/app/cases' },
    ],
  },
  {
    title: 'Laboratório',
    links: [
      { label: 'Laboratório', to: '/app/lab' },
      { label: 'Painel', to: '/app/dashboard' },
    ],
  },
  {
    title: 'LGPD e termos',
    links: [
      { label: 'Política de Privacidade', to: '/legal/privacy' },
      { label: 'Termos de Uso', to: '/legal/terms' },
      { label: 'Direitos LGPD', to: '/legal/lgpd' },
    ],
  },
]

export default function HelpPage() {
  return (
    <AppShell breadcrumb={['Início', 'Ajuda']}>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Ajuda</h1>
      </section>

      <section className="mt-6 space-y-4">
        {HELP.map((section) => (
          <Card key={section.title}>
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {section.links.map((link) => (
                <Link key={link.to} to={link.to} className="text-sm font-semibold text-brand-700 hover:text-brand-500">
                  {link.label}
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </section>
    </AppShell>
  )
}
