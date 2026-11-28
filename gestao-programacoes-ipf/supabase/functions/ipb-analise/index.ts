// Função "ipb-analise" (Supabase Edge Function)
// Gera a PROPOSTA INICIAL de análise de um relatório e confere imagens de atas
// com as regras do Manual Presbiteriano. O texto final é sempre do relator.
//
// Segredo necessário (Supabase → Edge Functions → Secrets): ANTHROPIC_API_KEY
// Opcional: ANTHROPIC_MODEL (modelo do Claude a usar)
// Publicar com verify_jwt desligado: a função confere a sessão do sistema pela ipb_api.
import Anthropic from "npm:@anthropic-ai/sdk";

const MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-opus-5-5";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function ipbApi(req: Record<string, unknown>) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ipb_api`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({ req }),
  });
  const j = await r.json();
  if (!r.ok || j?.erro) throw new Error(j?.erro || "Falha ao consultar o banco.");
  return j;
}

const SISTEMA_RELATORIO = `Você ajuda a comissão de exame de relatórios de um Presbitério da Igreja Presbiteriana do Brasil (IPB).
Escreva, em português do Brasil, uma PROPOSTA INICIAL de parecer sobre o relatório recebido. O relator vai revisar, alterar e assinar o texto final; deixe isso implícito, sem pedir desculpas nem se apresentar.
Baseie-se apenas nos dados enviados (campos do formulário, verificações automáticas, comparação com o ano anterior e análises dos membros). Não invente números nem fatos. Quando algo não puder ser concluído pelos dados, diga que precisa ser confirmado com a igreja.
Estrutura do texto (texto corrido com títulos numerados simples, sem markdown com asteriscos ou cerquilhas):
1. Identificação (igreja, formulário, ano).
2. Síntese do relatório: os números e fatos principais, comparando com o ano anterior quando houver.
3. Pontos que precisam de correção ou esclarecimento (inconsistências de preenchimento, totais que não conferem, campos em branco).
4. Pontos de atenção e recomendações à igreja (por exemplo: repasse do dízimo ao Supremo Concílio, róis, exame de contas, patrimônio, previdência do pastor), sempre ligados ao que o relatório mostra.
   Regras financeiras do presbitério: a verba presbiterial devida é 3% da receita de dízimos e ofertas; mostre o valor devido, o repassado e a diferença. A sobra de caixa de um ano para o outro (saldo para o ano seguinte) é movimento normal e varia a cada ano: não trate a variação como irregularidade; descreva a evolução com os valores dos dois anos.
5. Recomendação sugerida: Aprovar, Aprovar com ressalvas ou Devolver para correção, com uma frase de justificativa.
Tom: respeitoso, objetivo e pastoral, como um parecer de concílio. Até umas 600 palavras.`;

const SISTEMA_ATA = `Você ajuda o relator de uma comissão de exame de livros de atas de um Presbitério da Igreja Presbiteriana do Brasil (IPB).
Você recebe as atas em PDF (digitalizado ou gerado no computador) e/ou imagens de páginas, e uma lista de regras do Regulamento para Confecção de Atas dos Concílios da IPB e da Constituição da IPB.
Para CADA regra da lista, decida, olhando somente os PDFs e as imagens:
- "conforme": a página mostra que a regra foi cumprida (cite onde);
- "nao_conforme": a página mostra descumprimento (descreva o que viu);
- "nao_verificavel": o material não permite concluir (por exemplo, regras sobre o livro inteiro, capa, encadernação, ou trecho ilegível);
- "nao_se_aplica": a regra não se aplica a esta ata (por exemplo, eleição que não houve).
Seja criterioso: não marque "conforme" sem evidência visível. Em "evidencia", cite trechos curtos ou descreva o que se vê, com a página (no PDF, informe o arquivo e a página do PDF; quando o livro tiver numeração própria, cite também a folha e o número da ata). Um PDF pode trazer várias atas: confira as regras em todas e aponte em qual ata está cada problema. Em "observacao", sugira a correção quando houver problema.
Escreva em português do Brasil. O "resumo" é uma proposta inicial de parecer, em 1 a 3 parágrafos, para o relator ajustar. Em "transcricao_resumida", resuma o que foi lido em cada página (número da ata, data, presentes, assuntos, encerramento), indicando trechos ilegíveis.`;

const SCHEMA_ATA = {
  type: "object",
  properties: {
    resumo: { type: "string" },
    transcricao_resumida: { type: "string" },
    itens: {
      type: "array",
      items: {
        type: "object",
        properties: {
          regraId: { type: "string" },
          situacao: { type: "string", enum: ["conforme", "nao_conforme", "nao_verificavel", "nao_se_aplica"] },
          pagina: { type: "string" },
          evidencia: { type: "string" },
          observacao: { type: "string" },
        },
        required: ["regraId", "situacao", "pagina", "evidencia", "observacao"],
        additionalProperties: false,
      },
    },
  },
  required: ["resumo", "transcricao_resumida", "itens"],
  additionalProperties: false,
};

const SISTEMA_PARECER = `Você ajuda o relator de uma comissão de um Presbitério da Igreja Presbiteriana do Brasil (IPB) a preparar a PRÉVIA de um parecer.
Você recebe o documento em análise (PDF, quando houver), os dados da comissão e do documento, uma lista de regras a conferir e um ÍNDICE do Manual Presbiteriano (edição 2025) com a página em que começa cada artigo de cada documento (CI/IPB = Constituição, CD/IPB = Código de Disciplina, PL/IPB = Princípios de Liturgia, Regulamento de Atas e os modelos de estatuto e regimento).
Escreva em português do Brasil. Para cada ponto relevante, crie um item:
- tipo: "nao_conforme" (há descumprimento visível), "observacao" (falha leve ou dado a esclarecer), "recomendacao", "determinacao" (o concílio manda corrigir) ou "conforme" (só para pontos importantes cumpridos).
- texto: a crítica ou orientação, em uma ou duas frases, no tom de parecer de concílio.
- evidencia: onde está no documento analisado (página do PDF, número da ata, data, trecho curto). Não invente: se não viu, diga que não foi possível verificar.
- fundamentos: a base da crítica, com documento (use exatamente as siglas do índice), artigo, parágrafo, inciso e alínea quando houver. Para atas, cite sempre o artigo, o parágrafo e o inciso do Regulamento de Atas ou da CI/IPB. Use só artigos que você conhece com segurança e que existem no índice; deixe vazio o que não souber.
Nas atas, confira as regras da lista uma a uma; não marque "conforme" sem evidência. Não invente números, nomes ou fatos.
O "resumo" é uma proposta de conclusão em 1 a 3 parágrafos (por exemplo: aprovar sem ressalvas, aprovar com observações ou devolver para correção), para o relator ajustar.`;

const SCHEMA_PARECER = {
  type: "object",
  properties: {
    resumo: { type: "string" },
    itens: {
      type: "array",
      items: {
        type: "object",
        properties: {
          tipo: { type: "string", enum: ["nao_conforme", "observacao", "recomendacao", "determinacao", "conforme"] },
          texto: { type: "string" },
          evidencia: { type: "string" },
          fundamentos: {
            type: "array",
            items: {
              type: "object",
              properties: { documento: { type: "string" }, artigo: { type: "string" }, paragrafo: { type: "string" }, inciso: { type: "string" }, alinea: { type: "string" } },
              required: ["documento", "artigo", "paragrafo", "inciso", "alinea"],
              additionalProperties: false,
            },
          },
        },
        required: ["tipo", "texto", "evidencia", "fundamentos"],
        additionalProperties: false,
      },
    },
  },
  required: ["resumo", "itens"],
  additionalProperties: false,
};

function textoDe(msg: { content: Array<{ type: string; text?: string }> }) {
  return msg.content.filter((b) => b.type === "text").map((b) => b.text || "").join("").trim();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return json({ erro: "Use POST." }, 405);
  try {
    const body = await request.json();
    const { usuario } = await ipbApi({ action: "quem", token: body.token });
    if (!["admin", "analista"].includes(usuario.role)) return json({ erro: "Só analistas e administradores podem pedir a análise da IA." }, 403);
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) return json({ erro: "A chave da IA (ANTHROPIC_API_KEY) não foi configurada no Supabase." }, 500);
    const client = new Anthropic({ apiKey });

    if (body.tipo === "relatorio") {
      const stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 8000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        system: SISTEMA_RELATORIO,
        messages: [{ role: "user", content: "Dados do relatório (JSON):\n" + JSON.stringify(body.contexto ?? {}) }],
      } as never);
      const msg = await stream.finalMessage();
      if (msg.stop_reason === "refusal") return json({ erro: "A IA não conseguiu analisar este relatório. Escreva o parecer manualmente." }, 422);
      return json({ texto: textoDe(msg as never), modelo: msg.model });
    }

    if (body.tipo === "ata") {
      const { item } = await ipbApi({ action: "ata", op: "abrir", id: body.ataId, token: body.token });
      const paginas: string[] = item.paginas || [];
      if (!paginas.length) return json({ erro: "A ata não tem PDF nem imagens." }, 400);
      const content: unknown[] = [];
      paginas.forEach((p, i) => {
        const pdf = /^data:application\/pdf(?:;name=([^;]*))?;base64,(.+)$/.exec(p);
        if (pdf) {
          let nome = "Ata em PDF";
          try { nome = pdf[1] ? decodeURIComponent(pdf[1]) : nome; } catch { /* nome padrão */ }
          content.push({ type: "text", text: `Arquivo ${i + 1} (PDF): ${nome}` });
          content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdf[2] }, title: nome });
          return;
        }
        const m = /^data:(image\/(?:jpeg|png|gif|webp));base64,(.+)$/.exec(p);
        if (!m) return;
        content.push({ type: "text", text: `Página ${i + 1}:` });
        content.push({ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } });
      });
      content.push({
        type: "text",
        text: "Dados informados no envio: " + JSON.stringify(body.meta ?? {}) +
          "\n\nRegras a conferir (responda um item para cada regraId):\n" +
          (body.regras ?? []).map((g: { id: string; artigo: string; texto: string }) => `- ${g.id} [${g.artigo}]: ${g.texto}`).join("\n"),
      });
      const stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA_ATA } },
        system: SISTEMA_ATA,
        messages: [{ role: "user", content }],
      } as never);
      const msg = await stream.finalMessage();
      if (msg.stop_reason === "refusal") return json({ erro: "A IA não conseguiu analisar este material. Faça a conferência manual." }, 422);
      let resultado;
      try { resultado = JSON.parse(textoDe(msg as never)); } catch { return json({ erro: "A resposta da IA veio incompleta. Tente de novo." }, 502); }
      return json({ resultado, modelo: msg.model });
    }
    if (body.tipo === "parecer") {
      const content: unknown[] = [];
      if (typeof body.pdf === "string" && body.pdf.length > 100) {
        content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: body.pdf }, title: String(body.pdfNome || "Documento em análise") });
      }
      content.push({
        type: "text",
        text: "Comissão: " + JSON.stringify(body.comissao ?? {}) + "\nReunião: " + JSON.stringify(body.reuniao ?? {}) +
          "\nDocumentos (dados cadastrados): " + JSON.stringify(body.documentos ?? []) +
          "\nParecer em redação: " + JSON.stringify(body.parecer ?? {}) +
          (body.pdf ? "" : "\n(O PDF do documento não foi enviado: use só os dados acima e diga o que não pôde ser verificado.)") +
          "\n\nRegras a conferir:\n" + (body.regras ?? []).map((g: { id: string; artigo: string; texto: string }) => `- ${g.id} [${g.artigo}]: ${g.texto}`).join("\n") +
          "\n\nÍndice do Manual Presbiteriano (artigo→página):\n" + String(body.indice || ""),
      });
      const stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA_PARECER } },
        system: SISTEMA_PARECER,
        messages: [{ role: "user", content }],
      } as never);
      const msg = await stream.finalMessage();
      if (msg.stop_reason === "refusal") return json({ erro: "A IA não conseguiu analisar este documento. Escreva o parecer manualmente." }, 422);
      let resultado;
      try { resultado = JSON.parse(textoDe(msg as never)); } catch { return json({ erro: "A resposta da IA veio incompleta. Tente de novo." }, 502); }
      return json({ resultado, modelo: msg.model });
    }
    return json({ erro: "Tipo de análise desconhecido." }, 400);
  } catch (e) {
    return json({ erro: (e as Error).message || String(e) }, 500);
  }
});
