import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const Route = createFileRoute("/docs/api")({
  head: () => ({
    meta: [
      { title: "API de integração — Zone Connection" },
      {
        name: "description",
        content:
          "Como um sistema parceiro se conecta à Zone Connection: token, leads, imóveis, funis e webhooks.",
      },
    ],
  }),
  component: DocsApiPage,
});

const secoes = [
  ["comecar", "Começar"],
  ["token", "Token"],
  ["escopos", "Escopos"],
  ["leads", "Leads"],
  ["imoveis", "Imóveis"],
  ["funis", "Funis"],
  ["webhooks", "Webhooks"],
  ["chamadas", "Chamadas"],
  ["base-fria", "Base fria"],
  ["erros", "Erros"],
];

function DocsApiPage() {
  return (
    <div className="min-h-screen bg-[#F4F7F8] text-[#16324A]">
      <header className="bg-[#0B1F33] text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#7DD3F5]">ZONE CONNECTION</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">API de integração</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
              O seu sistema se conecta na Zone Connection. A imobiliária vem da credencial. Você não envia o id do cliente.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
            <p className="text-white/60">Base de produção</p>
            <p className="font-medium">https://api.zoneconnection.com.br/api</p>
            <p className="mt-2 text-white/60">Base de homologação</p>
            <p className="font-medium">http://api-staging-zoneconnection.179.198.111.97.sslip.io/api</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 md:grid-cols-[200px_1fr]">
        <nav className="flex gap-2 overflow-auto md:sticky md:top-6 md:block md:h-fit md:space-y-1 md:self-start">
          {secoes.map(([id, rotulo]) => (
            <a
              key={id}
              href={`#${id}`}
              className="block whitespace-nowrap rounded-lg px-3 py-2 text-sm text-[#355066] hover:bg-white hover:text-[#079ED4]"
            >
              {rotulo}
            </a>
          ))}
        </nav>

        <main className="space-y-8">
          <Secao id="comecar" titulo="O que você recebe">
            <p>
              A Zone Connection cria uma aplicação para a sua imobiliária e entrega três dados: <strong>Client ID</strong>, <strong>segredo</strong> e <strong>slug</strong> da imobiliária. O segredo aparece uma vez. Guarde os dois. A credencial de homologação não funciona em produção.
            </p>
            <p>
              Abrir <code>https://api.zoneconnection.com.br/api</code> no navegador responde 404. Esse endereço é só o prefixo. A primeira chamada é <code>POST /v1/oauth/token</code>. Todas as rotas abaixo já incluem esse prefixo: a URL completa é a base mais o caminho, por exemplo <code>https://api.zoneconnection.com.br/api/v1/oauth/token</code>.
            </p>
            <Tabela
              linhas={[
                ["Base", "https://api.zoneconnection.com.br/api"],
                ["Token", "POST /v1/oauth/token"],
                ["Header", "Authorization: Bearer access_token"],
                ["Validade", "3600 segundos. Peça outro token quando expirar."],
                ["Imobiliária", "Só o slug recebido. Não envie tenantId."],
              ]}
            />
            <Passos
              itens={[
                "Peça o token com o Client ID, o segredo e o slug.",
                "Envie o access_token no header Authorization: Bearer.",
                "Consulte os funis antes de criar um lead, para usar uma etapa que existe.",
                "Se for receber eventos, cadastre a sua URL HTTPS em Webhooks.",
              ]}
            />
          </Secao>

          <Secao id="token" titulo="Token">
            <p>POST /v1/oauth/token. O corpo é JSON. A resposta vale 1 hora.</p>
            <Bloco
              codigo={`curl -X POST $BASE/v1/oauth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "grant_type": "client_credentials",
    "client_id": "zc_...",
    "client_secret": "seu-segredo",
    "tenant_slug": "slug-da-imobiliaria"
  }'`}
            />
            <Bloco
              codigo={`{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600
}`}
            />
          </Secao>

          <Secao id="escopos" titulo="Escopos">
            <Tabela
              linhas={[
                ["leads:read", "Listar e consultar leads"],
                ["leads:write", "Criar lead"],
                ["leads:update", "Atualizar lead e mover de etapa"],
                ["properties:read", "Listar e consultar imóveis"],
                ["funnels:read", "Listar funis e etapas"],
                ["funnels:write", "Reservado para alteração de funil"],
                ["calls:write", "Registrar o pacote da chamada"],
                ["webhooks:manage", "Cadastrar e desativar a sua URL"],
              ]}
            />
            <p>Sem token a API responde 401. Com token e sem o escopo, 403.</p>
          </Secao>

          <Secao id="leads" titulo="Leads">
            <Tabela
              linhas={[
                ["GET /v1/leads", "leads:read"],
                ["GET /v1/leads/:id", "leads:read"],
                ["POST /v1/leads", "leads:write"],
                ["PATCH /v1/leads/:id", "leads:update"],
                ["POST /v1/leads/:id/move", "leads:update"],
              ]}
            />
            <p>
              Na criação, <code>nome</code>, <code>telefone</code>, <code>interesse</code>, <code>cidade</code> e <code>bairro</code> são obrigatórios. O telefone usa o formato (81) 99999-9999. O interesse aceito é Comprar. A categoria é opcional e fica no lead: aluguel ou potencial. A prioridade pode ser Alta, Média ou Baixa. A etapa é o slug do funil, por exemplo novo.
            </p>
            <Bloco
              codigo={`{
  "nome": "Ana Souza",
  "telefone": "(81) 99999-9999",
  "interesse": "Comprar",
  "cidade": "Recife",
  "bairro": "Boa Viagem",
  "email": "ana@email.com",
  "origem": "agente",
  "stage": "novo",
  "prioridade": "Média",
  "categoria": "potencial"
}`}
            />
            <p>Para mover de etapa: POST /v1/leads/:id/move com {`{ "stage": "slug-lido-no-funil" }`}. O slug vem de GET /v1/funnels/:id/stages. Liste os leads com GET /v1/leads?search=ana&amp;categoria=potencial.</p>
          </Secao>

          <Secao id="imoveis" titulo="Imóveis">
            <p>GET /v1/properties e GET /v1/properties/:id, com o escopo properties:read. O id público do usado disponível é o id da venda. A resposta não traz dados internos do proprietário.</p>
            <p>
              Cada imóvel traz <code>purpose</code>: venda, aluguel, lancamento ou sala_comercial. Exemplo: <code>GET /v1/properties?purpose=venda&amp;city=Recife&amp;neighborhood=Boa%20Viagem&amp;bedrooms=2&amp;bathrooms=1&amp;minPrice=200000&amp;maxPrice=800000&amp;page=1&amp;limit=20</code>. O tipo físico aceita apartamento, casa, terreno, sala_comercial, loja, galpao, fazenda, chacara ou outro. Não existe filtro de aluguel separado do purpose. A resposta traz id, purpose, propertyType, description, price, location, features e coverImage. Sem dados do proprietário.
            </p>
          </Secao>

          <Secao id="funis" titulo="Funis">
            <p>GET /v1/funnels, GET /v1/funnels/:id e GET /v1/funnels/:id/stages, com funnels:read. Para mover o lead, envie o slug da etapa e use o escopo leads:update. O campo papel é estável mesmo quando o nome visível da etapa muda. Os papéis de integração da etapa são: prospeccao_ativa, frio, qualificado, agendado, agendado_compra e agendado_venda. Lead de aluguel e lead em potencial não são etapa: vão no campo categoria do lead. A imobiliária atribui esses papéis às etapas dela. Leia a lista desta imobiliária antes de mover.</p>
          </Secao>

          <Secao id="webhooks" titulo="Webhooks">
            <p>
              Você cadastra a sua URL. A Zone Connection envia um POST quando o evento acontece. O corpo não traz o lead inteiro. Você busca o recurso na API com o resourceId.
            </p>
            <Tabela
              linhas={[
                ["POST /v1/webhooks", "Cria o destino e devolve o segredo uma vez"],
                ["GET /v1/webhooks", "Lista os destinos, sem segredo"],
                ["GET /v1/webhooks/:id", "Consulta um destino"],
                ["PATCH /v1/webhooks/:id", "Altera URL, eventos ou active"],
                ["DELETE /v1/webhooks/:id", "Desativa e cancela entregas pendentes"],
                ["POST /v1/webhooks/:id/rotate-secret", "Troca o segredo"],
              ]}
            />
            <p>Eventos: lead.created, lead.updated, lead.stage_changed, property.available, property.unavailable, property.updated. Imóvel só emite na transição real de status disponível.</p>
            <Bloco
              codigo={`{
  "url": "https://seu-sistema.com/webhooks/zone",
  "events": ["lead.created", "lead.updated"]
}`}
            />
            <Bloco
              codigo={`{
  "id": "evento-uuid",
  "name": "lead.created",
  "occurredAt": "2026-11-07T21:00:00.000Z",
  "data": { "resourceId": "lead-uuid", "resourceType": "lead" }
}`}
            />
            <p>
              Headers: X-Zone-Event-Id, X-Zone-Event, X-Zone-Timestamp e X-Zone-Signature. A assinatura é sha256= e o HMAC-SHA256 do segredo sobre timestamp + "." + corpo cru, nos bytes recebidos. A entrega pode repetir. Deduplica pelo id. Sucesso é HTTP 2xx. 408, 429, 5xx, timeout e falha de rede são tentados de novo, até 6 vezes. Os outros 4xx encerram.
            </p>
            <Bloco
              codigo={`const crypto = require("crypto");
const esperado = "sha256=" + crypto
  .createHmac("sha256", segredo)
  .update(timestamp + "." + rawBody)
  .digest("hex");`}
            />
          </Secao>

          <Secao id="chamadas" titulo="Pacote da chamada">
            <p>
              POST /v1/calls, com o escopo calls:write. O mesmo externalId na mesma imobiliária atualiza o registro em vez de duplicar. Se etapaSlug existir no funil informado, o lead muda de etapa. resultado aceita sem_contato, frio, qualificado, agendado, recusou ou numero_invalido.
            </p>
            <Bloco
              codigo={`{
  "externalId": "call_123456",
  "leadId": "uuid-do-lead",
  "telefone": "81999999999",
  "inicioEm": "2026-11-07T21:00:00Z",
  "fimEm": "2026-11-07T21:08:00Z",
  "resultado": "qualificado",
  "resumo": "Cliente quer comprar em Boa Viagem.",
  "transcricao": "texto da ligação",
  "funilId": "uuid-do-funil",
  "etapaSlug": "qualificado"
}`}
            />
          </Secao>

          <Secao id="base-fria" titulo="CSV da base fria">
            <p>
              GET /v1/leads/import/modelo devolve o arquivo de exemplo. POST /v1/leads/import recebe {`{ "csv": "..." }`}, com leads:write. UTF-8, vírgula ou ponto e vírgula. Telefone com DDD. Cidade vazia vira Não informado. Interesse vazio vira Comprar. A coluna categoria é opcional: aluguel ou potencial. Os contatos entram no funil comercial padrão. Para colocar em outra etapa, use POST /v1/leads/:id/move depois.
            </p>
            <Bloco
              codigo={`nome,telefone,email,cidade,bairro,interesse,origem,prioridade,categoria
Ana Souza,(81) 98888-7777,ana@email.com,Recife,Boa Viagem,Comprar,base-fria,Média,potencial`}
            />
          </Secao>

          <Secao id="erros" titulo="Erros">
            <Tabela
              linhas={[
                ["401", "Token ausente, inválido ou expirado"],
                ["403", "Token válido sem o escopo"],
                ["404", "Recurso de outra imobiliária ou inexistente"],
                ["400", "Corpo inválido, como telefone ou URL"],
              ]}
            />
          </Secao>
        </main>
      </div>
    </div>
  );
}

function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">{titulo}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-[#355066]">{children}</div>
    </section>
  );
}

function Passos({ itens }: { itens: string[] }) {
  return (
    <ol className="space-y-2">
      {itens.map((item, indice) => (
        <li key={item} className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E7F6FC] text-xs font-semibold text-[#079ED4]">
            {indice + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Tabela({ linhas }: { linhas: string[][] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8EC]">
      {linhas.map(([nome, detalhe]) => (
        <div key={nome} className="grid gap-1 border-b border-[#E2E8EC] px-3 py-2 last:border-0 md:grid-cols-[220px_1fr]">
          <code className="text-[#0B6F96]">{nome}</code>
          <span>{detalhe}</span>
        </div>
      ))}
    </div>
  );
}

function Bloco({ codigo }: { codigo: string }) {
  return (
    <pre className="overflow-auto rounded-xl bg-[#0B1F33] p-4 text-xs leading-5 text-[#D7F3FF]">
      <code>{codigo}</code>
    </pre>
  );
}
