import { Link } from 'react-router-dom'
import Card from '../components/Card'
import AppShell from '../layouts/AppShell'

type HelpSection = {
  title: string
  items: Array<{ title: string; steps: string[]; links?: Array<{ label: string; to: string }> }>
}

const HELP: HelpSection[] = [
  {
    title: 'Primeiros Passos',
    items: [
      {
        title: '1) Entrar no sistema',
        steps: ['Acesse a tela de login.', 'Digite seu e-mail e senha.', 'Se for seu primeiro acesso, finalize o cadastro pelo link enviado.'],
        links: [{ label: 'Login', to: '/login' }],
      },
      {
        title: '2) Criar um exame (Scan)',
        steps: ['Menu Exames.', 'Clique em "Novo Exame".', 'Anexe STL superior/inferior, fotos e RX conforme protocolo.', 'Envie para aprovacao, se aplicavel.'],
        links: [{ label: 'Exames', to: '/app/scans' }],
      },
      {
        title: '3) Converter exame em tratamento (Caso)',
        steps: ['Abra um exame aprovado.', 'Clique em "Criar Caso".', 'Defina arcada, quantidade de placas e troca.', 'Avance fase/orcamento/contrato conforme combinado.'],
        links: [{ label: 'Tratamentos', to: '/app/cases' }],
      },
    ],
  },
  {
    title: 'Operacao do Laboratorio',
    items: [
      {
        title: 'Entregas em lotes (parcial)',
        steps: [
          'Dentro do tratamento, registre um "lote de entrega" (de placa X ate Y).',
          'Isso atualiza o saldo de placas (reposicoes) do tratamento.',
          'Use observacoes para rastreabilidade (motoboy, retirada, etc).',
        ],
      },
      {
        title: 'Reposicoes (saldo de placas)',
        steps: [
          'Reposicao aqui significa placas restantes para completar o tratamento contratado.',
          'O Dashboard pode mostrar o saldo total e quais tratamentos estao com saldo.',
        ],
      },
      {
        title: 'Refinamentos',
        steps: [
          'Refinamento e um novo scan + novo planejamento apos finalizar o tratamento, quando necessario.',
          'Defina se havera novo contrato/orcamento conforme politica comercial.',
        ],
      },
    ],
  },
  {
    title: 'Seguranca e LGPD',
    items: [
      {
        title: 'Boas praticas',
        steps: [
          'Nao compartilhe usuario/senha.',
          'Use perfis com permissao minima necessaria.',
          'Evite exportar dados fora do sistema sem justificativa.',
        ],
        links: [
          { label: 'Politica de Privacidade', to: '/legal/privacy' },
          { label: 'Termos de Uso', to: '/legal/terms' },
          { label: 'Direitos LGPD', to: '/legal/lgpd' },
        ],
      },
    ],
  },
]

export default function HelpPage() {
  return (
    <AppShell breadcrumb={['Inicio', 'Ajuda']}>
      <section>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Ajuda</h1>
        <p className="mt-2 text-sm text-slate-500">Tutoriais curtos para operacao do OrthoScan.</p>
      </section>

      <section className="mt-6 space-y-4">
        {HELP.map((section) => (
          <Card key={section.title}>
            <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
            <div className="mt-4 space-y-4">
              {section.items.map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
                    {item.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  {item.links && item.links.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {item.links.map((link) => (
                        <Link key={link.to} to={link.to} className="text-sm font-semibold text-brand-700 hover:text-brand-500">
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </section>
    </AppShell>
  )
}

