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

export default function LegalTermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Termos de Uso</h1>
          <p className="mt-1 text-sm text-slate-400">
            OrthoScan (laboratorio de alinhadores). Versao modelo para revisao juridica. Ultima atualizacao: 18/02/2026.
          </p>
        </div>

        <Card className="border border-slate-800 bg-slate-900">
          <Section title="1. Objetivo">
            <p>
              Estes termos regulam o uso do sistema OrthoScan para gestao operacional do laboratorio (scans, planejamentos,
              producao, entregas e administracao).
            </p>
          </Section>

          <Section title="2. Contas e Acesso">
            <ul className="list-disc pl-5">
              <li>O usuario e responsavel por manter suas credenciais seguras e nao compartilhar acesso.</li>
              <li>Perfis e permissoes limitam as acoes conforme funcao (RBAC).</li>
              <li>Recomendado habilitar 2FA para perfis administrativos quando disponivel.</li>
            </ul>
          </Section>

          <Section title="3. Uso Adequado">
            <ul className="list-disc pl-5">
              <li>Proibido inserir conteudo ilicito, ofensivo, ou violar direitos de terceiros.</li>
              <li>Proibido tentar explorar vulnerabilidades, burlar permissao ou acessar dados sem autorizacao.</li>
            </ul>
          </Section>

          <Section title="4. Dados e Documentos">
            <p>
              O usuario declara possuir base legal e autorizacao para inserir dados de pacientes e arquivos (incluindo dados
              sensiveis), e deve respeitar as politicas internas e a LGPD.
            </p>
          </Section>

          <Section title="5. Disponibilidade">
            <p>
              O sistema pode passar por manutencao, atualizacoes e indisponibilidades pontuais. Medidas razoaveis serao
              adotadas para reduzir impacto.
            </p>
          </Section>

          <Section title="6. Responsabilidades">
            <p>
              O OrthoScan e uma ferramenta de gestao. Decisoes clinicas e responsabilidade tecnica permanecem com os
              profissionais e/ou clinicas envolvidas.
            </p>
          </Section>

          <Section title="7. Alteracoes">
            <p>Estes termos podem ser atualizados. Alteracoes relevantes devem ser comunicadas aos usuarios.</p>
          </Section>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/legal/privacy" className="text-sm font-semibold text-brand-700 hover:text-brand-500">
              Politica de privacidade
            </Link>
            <span className="text-slate-600">|</span>
            <Link to="/legal/lgpd" className="text-sm font-semibold text-brand-700 hover:text-brand-500">
              Direitos LGPD
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

