import { Link } from 'react-router-dom'
import Card from '../components/Card'

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold text-slate-100">{props.title}</h2>
      <div className="mt-2 space-y-2 text-sm text-slate-300">{props.children}</div>
    </section>
  )
}

export default function LegalLgpdPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Direitos LGPD (Resumo)</h1>
          <p className="mt-1 text-sm text-slate-400">Material de apoio. Ultima atualizacao: 18/02/2026.</p>
        </div>

        <Card className="border border-slate-800 bg-slate-900">
          <p className="text-sm text-slate-300">
            Se voce for titular de dados (ex: paciente), a LGPD garante direitos. Em ambientes de laboratorio e clinica,
            as solicitacoes podem precisar ser tratadas em conjunto entre controlador e operador.
          </p>

          <Section title="Direitos do Titular (art. 18 LGPD)">
            <ul className="list-disc pl-5">
              <li>Confirmacao da existencia de tratamento.</li>
              <li>Acesso aos dados.</li>
              <li>Correcao de dados incompletos, inexatos ou desatualizados.</li>
              <li>Anonimizacao, bloqueio ou eliminacao (quando aplicavel).</li>
              <li>Portabilidade (quando aplicavel).</li>
              <li>Informacao sobre compartilhamento.</li>
              <li>Revogacao de consentimento (quando essa for a base legal).</li>
            </ul>
          </Section>

          <Section title="Como solicitar">
            <ol className="list-decimal pl-5">
              <li>Identifique o paciente/caso e descreva a solicitacao.</li>
              <li>Use o canal de privacidade definido no contrato ou pela clinica.</li>
              <li>Para seguranca, pode ser solicitada confirmacao de identidade.</li>
            </ol>
          </Section>

          <Section title="Prazos">
            <p>
              Prazos dependem do tipo de solicitacao e da complexidade. O fluxo deve ser registrado e auditavel.
            </p>
          </Section>

          <Section title="Observacoes Importantes">
            <ul className="list-disc pl-5">
              <li>Nem toda solicitacao resulta em eliminacao imediata (ex: obrigacoes legais e regulatoria).</li>
              <li>Dados de saude exigem cautela e controles reforcados.</li>
            </ul>
          </Section>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/legal/privacy" className="text-sm font-semibold text-brand-700 hover:text-brand-500">
              Politica de privacidade
            </Link>
            <span className="text-slate-600">|</span>
            <Link to="/legal/terms" className="text-sm font-semibold text-brand-700 hover:text-brand-500">
              Termos de uso
            </Link>
            <span className="text-slate-600">|</span>
            <Link to="/login" className="text-sm font-semibold text-slate-200 hover:text-white">
              Voltar ao login
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}

