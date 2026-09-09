# SR Autopeças — Smart Garage com IA (Gemini)

## Estrutura do projeto

```
index.html            → site (carrossel + card SR Smart Garage + carrinho)
style.css             → estilos
script.js             → lógica do front (tabs, carrinho, chamada à IA)
catalogo.json         → catálogo de peças (fonte única, usado pelo front E pela função de IA)
api/consultar-ia.js   → função serverless que fala com o Gemini
.env.example          → modelo da variável de ambiente (sem chave de verdade)
.gitignore            → garante que sua chave real nunca vá pro GitHub
```

## Antes de tudo: 2 coisas pra personalizar

1. **Número do WhatsApp** — abra `script.js` e troque:
   ```js
   const WHATSAPP_NUMERO = '5511999999999'; // TODO: coloque o número real aqui
   ```
   Formato: código do país + DDD + número, só números (ex: `5511987654321`).

2. **Catálogo de peças** — edite `catalogo.json` com as peças reais da sua loja
   (nome, marca, SKU, OEM, preço). A IA só pode sugerir peças que estejam
   nesse arquivo — isso é proposital, pra ela nunca inventar um SKU que não
   existe na sua loja.

## Como conseguir a chave do Gemini (gratuita)

A assinatura "Gemini Pro"/"Google AI Pro" do app **não** libera créditos de
API automaticamente — são coisas cobradas separadamente. Mas a API do Gemini
tem um nível gratuito próprio, sem cartão de crédito:

1. Acesse https://aistudio.google.com/apikey
2. Entre com sua conta Google
3. Clique em "Create API key"
4. Guarde essa chave — você vai colar ela na Vercel, nunca no código

## Deploy na Vercel (gratuito)

1. Suba esta pasta para um repositório novo no GitHub.
2. Entre em https://vercel.com, clique em "Add New Project" e importe esse
   repositório (login com GitHub).
3. Não precisa mexer em nenhuma configuração de build — é um projeto
   estático + funções serverless, a Vercel detecta a pasta `api/` sozinha.
4. Antes de clicar em "Deploy", vá em **Environment Variables** e adicione:
   - Nome: `GEMINI_API_KEY`
   - Valor: a chave que você pegou no passo anterior
5. Clique em Deploy. Pronto — seu site e a função de IA já ficam no ar juntos,
   de graça, em uma URL tipo `seu-projeto.vercel.app`.

Se depois quiser trocar algo na variável de ambiente, dá pra fazer em
Project Settings > Environment Variables a qualquer momento (é preciso
fazer um novo deploy pra ela valer).

## Testando localmente antes de subir

Sem a Vercel CLI, o jeito mais simples de testar o front (carrossel, tabs,
carrinho) é abrir com um servidor local simples:

```bash
python3 -m http.server 8000
```

e acessar `http://localhost:8000`. **A parte de IA não vai funcionar nesse
modo**, porque `python3 -m http.server` não roda a função serverless — pra
testar a IA de verdade, o mais fácil é instalar a Vercel CLI (`npm i -g
vercel`) e rodar `vercel dev` na pasta do projeto.

## Como a IA decide as peças

A função `api/consultar-ia.js`:

1. Recebe o sintoma que o cliente digitou.
2. Manda pro Gemini só os nomes/IDs do seu catálogo (nunca o catálogo
   inteiro com preço, nem deixa ele inventar peça nova).
3. Pede um diagnóstico curto + até 3 peças prováveis, cada uma com uma
   porcentagem de match.
4. Se o sintoma for grave (freio, fumaça, direção) ou vago demais, a IA
   marca isso e o site mostra automaticamente o botão "Falar no WhatsApp"
   em vez de arriscar uma sugestão ruim.
5. Toda resposta da IA é filtrada no servidor — se ela citar um ID de peça
   que não existe no seu `catalogo.json`, essa peça é descartada antes de
   chegar no cliente.

A aba "Buscar por veículo" **não** usa IA — é um filtro local determinístico
no `catalogo.json`, pra não gastar cota da API à toa em buscas que já são
diretas.
