// api/consultar-ia.js
//
// Função serverless (formato Vercel) que recebe o sintoma descrito pelo
// cliente e pergunta pro Gemini quais peças do catálogo da loja são mais
// prováveis, sempre reforçando "confirme com um profissional".
//
// A chave da API NUNCA fica no código nem no front-end — ela vive só na
// variável de ambiente GEMINI_API_KEY, configurada no painel da Vercel
// (Project Settings > Environment Variables).
//
// Como conseguir a chave (gratuita): https://aistudio.google.com/apikey
// Atenção: isso é a API do Gemini, separada da assinatura "Gemini Pro/AI Pro"
// do app — a assinatura do app não libera créditos de API automaticamente,
// mas a API tem um nível gratuito próprio, sem cartão de crédito.

const catalogo = require('../catalogo.json');

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

module.exports = async (req, res) => {
  // Libera chamada vinda do próprio site (ajuste se for servir de outro domínio)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no servidor.' });
  }

  const { sintoma, veiculo } = req.body || {};

  if (!sintoma || typeof sintoma !== 'string' || !sintoma.trim()) {
    return res.status(400).json({ error: 'Descreva o sintoma do veículo.' });
  }

  // Manda só id/nome/categoria pro modelo — não precisa saber preço pra decidir.
  const catalogoResumido = catalogo.map((p) => ({
    id: p.id,
    nome: p.nome,
    categoria: p.categoria,
  }));

  const prompt = `
Você é o assistente de diagnóstico do site SR Autopeças. Um cliente vai descrever
um sintoma do carro dele${veiculo ? ` (veículo informado: ${veiculo})` : ' (sem informar o veículo)'}.

Sintoma descrito pelo cliente: "${sintoma.trim()}"

Catálogo de peças disponível (use SOMENTE os "id" listados aqui — nunca invente
um id, SKU ou peça que não esteja nesta lista):
${JSON.stringify(catalogoResumido)}

Tarefa:
1. Escreva um diagnóstico curto (1 a 2 frases, português simples e direto)
   explicando a causa mais provável do sintoma.
2. Escolha até 3 peças do catálogo acima relacionadas ao sintoma, cada uma com
   uma estimativa de compatibilidade de 0 a 100 (campo "match").
3. Se o sintoma for vago demais, grave (ex.: falha nos freios, fumaça, cheiro
   de queimado, perda de direção) ou não bater com nada específico do
   catálogo, marque "precisaSuporte": true e escreva uma "mensagemSuporte"
   recomendando falar com um especialista.
4. NUNCA garanta que a peça sugerida vai resolver o problema — deixe sempre
   claro que é uma sugestão preliminar e que um profissional/mecânico deve
   confirmar antes de qualquer troca.

Responda APENAS com um JSON válido, sem markdown e sem texto fora do JSON,
neste formato exato:
{
  "diagnostico": "string",
  "pecas": [{ "id": "string", "match": number }],
  "precisaSuporte": boolean,
  "mensagemSuporte": "string"
}`.trim();

  try {
    const resposta = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      }),
    });

    if (!resposta.ok) {
      const erroTexto = await resposta.text();
      console.error('Erro Gemini:', resposta.status, erroTexto);
      return res.status(502).json({ error: 'Falha ao consultar a IA.' });
    }

    const dados = await resposta.json();
    const textoBruto = dados?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textoBruto) {
      return res.status(502).json({ error: 'Resposta vazia da IA.' });
    }

    let ia;
    try {
      ia = JSON.parse(textoBruto);
    } catch (parseErr) {
      console.error('JSON inválido vindo da IA:', textoBruto);
      return res.status(502).json({ error: 'Resposta da IA em formato inesperado.' });
    }

    // Blindagem: só aceita peças que realmente existem no catálogo.
    const idsValidos = new Set(catalogo.map((p) => p.id));
    const pecasValidas = Array.isArray(ia.pecas)
      ? ia.pecas.filter((p) => p && idsValidos.has(p.id))
      : [];

    return res.status(200).json({
      diagnostico: typeof ia.diagnostico === 'string' ? ia.diagnostico : '',
      pecas: pecasValidas,
      precisaSuporte: Boolean(ia.precisaSuporte) || pecasValidas.length === 0,
      mensagemSuporte:
        typeof ia.mensagemSuporte === 'string' && ia.mensagemSuporte
          ? ia.mensagemSuporte
          : 'Não encontramos uma peça com boa correspondência pro seu caso. Fale com um dos nossos especialistas.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno ao consultar a IA.' });
  }
};
