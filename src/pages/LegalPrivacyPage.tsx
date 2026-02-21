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

export default function LegalPrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-50">Politica de Privacidade</h1>
          <p className="mt-1 text-sm text-slate-400">
            OrthoScan (laboratorio de alinhadores). Versao modelo para revisao juridica. Ultima atualizacao: 18/02/2026.
          </p>
        </div>

        <Card className="border border-slate-800 bg-slate-900">
          <p className="text-sm text-slate-300">
            Esta politica descreve como tratamos dados pessoais ao operar o sistema administrativo OrthoScan. Dependendo do
            contrato, o laboratorio pode atuar como <span className="font-semibold text-slate-100">operador</span> e a
            clinica/dentista como <span className="font-semibold text-slate-100">controlador</span>, nos termos da LGPD.
          </p>

          <Section title="1. Dados Pessoais Tratados">
            <ul className="list-disc pl-5">
              <li>Dados de identificacao e contato (nome, telefone, e-mail).</li>
              <li>Dados de pacientes (incluindo dados sensiveis relacionados a saude odontologica).</li>
              <li>Dados de uso do sistema (logs de acesso, auditoria, operacoes realizadas).</li>
              <li>Arquivos e documentos enviados ao sistema (ex: scans, fotos, RX, PDFs).</li>
            </ul>
          </Section>

          <Section title="2. Finalidades">
            <ul className="list-disc pl-5">
              <li>Executar o fluxo de trabalho do laboratorio (triagem, planejamento, producao e entregas).</li>
              <li>Gestao de contratos, orcamentos, status e comunicacao com clinicas/dentistas.</li>
              <li>Seguranca, prevencao a fraudes e auditoria.</li>
              <li>Suporte tecnico e melhoria do produto.</li>
            </ul>
          </Section>

          <Section title="3. Bases Legais (LGPD)">
            <p>
              As bases legais variam conforme o contexto (execucao de contrato, cumprimento de obrigacao legal/regulatoria,
              legitimo interesse e, quando aplicavel, consentimento).
            </p>
            <p className="text-xs text-slate-400">
              Observacao: dados sensiveis exigem criterios reforcados. Recomenda-se validacao juridica do enquadramento
              para cada operacao.
            </p>
          </Section>

          <Section title="4. Compartilhamento">
            <ul className="list-disc pl-5">
              <li>Com clinicas/dentistas vinculados ao caso.</li>
              <li>Com provedores de infraestrutura (ex: hospedagem, banco de dados) estritamente para operar o sistema.</li>
              <li>Com terceiros quando exigido por lei ou ordem de autoridade competente.</li>
            </ul>
          </Section>

          <Section title="5. Retencao">
            <p>
              Mantemos os dados pelo tempo necessario para cumprir as finalidades, obrigacoes legais e resguardar direitos.
              Prazos podem ser definidos em contrato.
            </p>
          </Section>

          <Section title="6. Direitos do Titular">
            <p>
              Voce pode solicitar confirmacao de tratamento, acesso, correcao, portabilidade, eliminacao (quando aplicavel)
              e informacoes sobre compartilhamento. Algumas solicitacoes podem depender do controlador do dado (clinica).
            </p>
          </Section>

          <Section title="7. Seguranca">
            <p>
              Adotamos medidas tecnicas e administrativas proporcionais ao risco (controle de acesso, trilhas de auditoria,
              segregacao de perfis e protecao de credenciais).
            </p>
          </Section>

          <Section title="8. Contato">
            <p>
              Para solicitacoes LGPD e privacidade, utilize o canal informado no contrato ou na tela de configuracoes do
              laboratorio.
            </p>
          </Section>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/legal/terms" className="text-sm font-semibold text-brand-700 hover:text-brand-500">
              Termos de uso
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

