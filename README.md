# 🎵 Spotify Now Playing SVG Generator

Gerador de SVG dinâmico que exibe a música atual ou recente do Spotify em tempo real. Perfeito para adicionar ao seu perfil do GitHub, site pessoal ou qualquer lugar que aceite SVGs.

## 📋 Índice

- [Características](#-características)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Requisitos](#-requisitos)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Uso](#-uso)
- [Arquitetura](#-arquitetura)
- [Personalização](#-personalização)
- [Solução de Problemas](#-solução-de-problemas)

## ✨ Características

- 🎨 SVG dinâmico e personalizável
- 🎵 Exibe música tocando atualmente ou última tocada
- 🔄 Atualização automática via refresh token
- 🎭 Sistema de templates flexível
- 📊 Animação de barras de áudio
- 🎨 Cores personalizáveis via parâmetros
- 📊 Suporte a JSON API para dados estruturados
- 🏗️ Arquitetura modular e fácil de manter
- ☁️ Pronto para deploy no Vercel

## 📁 Estrutura do Projeto

```
Spotify/
├── api/
│   ├── config/
│   │   └── Config.js
│   ├── services/
│   │   ├── SpotifyClient.js
│   │   ├── TemplateManager.js
│   │   └── SVGGenerator.js
│   ├── templates/
│   │   ├── templates.json
│   │   ├── spotify-dark.html
│   │   └── spotify.html
│   ├── .env
│   ├── index.js
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
├── build/
│   └── node/
│       └── node-18/
│           └── Dockerfile
├── .dockerignore
├── .gitignore
├── docker-compose.yml
├── vercel.json
└── README.md
```

## 🔧 Requisitos

- Node.js 18 ou superior
- npm ou yarn
- Conta Spotify (gratuita ou premium)
- Spotify App registrado

## 📦 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/spotify-svg-generator.git
cd spotify-svg-generator
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente (veja seção [Configuração](#%EF%B8%8F-configuração))

## ⚙️ Configuração

### 1. Criar Aplicativo Spotify

1. Acesse [Spotify Dashboard](https://developer.spotify.com/dashboard)
2. Clique em "Create an App"
3. Anote o **Client ID** e **Client Secret**
4. Em "Edit Settings", adicione `http://localhost:8888/callback` como Redirect URI

### 2. Obter Refresh Token

**Passo 1:** Obter código de autorização (cole no navegador):

```
https://accounts.spotify.com/authorize?client_id=SEU_CLIENT_ID&response_type=code&redirect_uri=http://localhost:8888/callback&scope=user-read-currently-playing%20user-read-recently-played
```

**Passo 2:** Trocar código por refresh token:

```bash
# Primeiro, codifique CLIENT_ID:CLIENT_SECRET em Base64
echo -n "CLIENT_ID:CLIENT_SECRET" | base64

# Depois, use curl para obter o token
curl -X POST "https://accounts.spotify.com/api/token" \
  -H "Authorization: Basic SEU_BASE64_AQUI" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=CODIGO_OBTIDO_NO_PASSO_1" \
  -d "redirect_uri=http://localhost:8888/callback"
```

O response conterá o `refresh_token` que você precisa.

### 3. Configurar Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto:

```env
SPOTIFY_CLIENT_ID=seu_client_id_aqui
SPOTIFY_SECRET_ID=seu_client_secret_aqui
SPOTIFY_REFRESH_TOKEN=seu_refresh_token_aqui
NODE_ENV=development
```

**Importante:** Nunca commite o arquivo `.env` no Git!

## 🚀 Uso

### Desenvolvimento Local

```bash
# Iniciar servidor de desenvolvimento
npm run dev

# ou usar nodemon
npm start
```

O servidor estará disponível em `http://localhost:3000`

### Deploy no Vercel

1. Instale o Vercel CLI:
```bash
npm i -g vercel
```

2. Configure as variáveis de ambiente no Vercel:
```bash
vercel env add SPOTIFY_CLIENT_ID
vercel env add SPOTIFY_SECRET_ID
vercel env add SPOTIFY_REFRESH_TOKEN
```

3. Deploy:
```bash
vercel --prod
```

### Uso Básico

**SVG:**
```
https://seu-dominio.vercel.app/api
```

**JSON API:**
```
https://seu-dominio.vercel.app/api?type=json
```

### Com Parâmetros Personalizados

```
https://seu-dominio.vercel.app/api?background_color=1DB954&border_color=FFFFFF
```

### Em Markdown (GitHub)

```markdown
![Spotify](https://seu-dominio.vercel.app/api)
```

### Em HTML

```html
<img src="https://seu-dominio.vercel.app/api?background_color=181414&border_color=1DB954" 
     alt="Spotify Now Playing">
```

## 🏗️ Arquitetura

A aplicação segue o princípio de **Separação de Responsabilidades (SoC)** com uma arquitetura modular:

### Config.js
**Responsabilidade:** Gerenciamento de configurações e variáveis de ambiente

```javascript
Config.load();              // Carrega variáveis do .env
Config.get('CHAVE');        // Obtém valor de configuração
Config.validate();          // Valida configurações obrigatórias
```

**Métodos:**
- `load()` - Carrega arquivo .env (apenas em desenvolvimento)
- `get(key, defaultValue)` - Obtém variável de ambiente
- `validate()` - Valida se todas as variáveis necessárias estão definidas

### SpotifyClient.js
**Responsabilidade:** Comunicação com a API do Spotify

**Métodos principais:**
- `getNowPlaying()` - Retorna música tocando atualmente
- `getRecentlyPlayed()` - Retorna últimas 10 músicas tocadas
- `makeRequest(url, headers, postData)` - Centraliza todas as requisições HTTP
- `refreshAccessToken()` - Renova o token de acesso automaticamente
- `getAuth()` - Gera autenticação Basic (Base64)
- `safeRequest(fn)` - Wrapper para tratamento de erros

**Características:**
- Usa Fetch API nativa do Node.js 18+
- Tratamento robusto de erros
- Retorna objeto vazio em caso de falha (graceful degradation)

### TemplateManager.js
**Responsabilidade:** Gerenciamento e renderização de templates HTML

**Métodos:**
- `getCurrentTemplate()` - Retorna nome do template ativo
- `loadTemplate(name)` - Carrega arquivo de template do disco
- `render(name, data)` - Renderiza template substituindo variáveis

**Sistema de Templates:**
- Suporta `{{variavel}}` e `{{ variavel }}`
- Suporta `{{variavel|safe}}` para HTML não escapado
- Configuração via `templates/templates.json`
- Fallback automático para template padrão

### SVGGenerator.js
**Responsabilidade:** Orquestração e geração do SVG final

**Métodos principais:**
- `generate(bgColor, borderColor)` - Gera SVG completo
- `getData()` - Retorna dados estruturados (para JSON API)
- `generateBars()` - Cria estrutura HTML das barras animadas
- `generateBarCSS()` - Gera CSS com animações aleatórias
- `getTrackData(nowPlaying, recentPlays)` - Determina qual música exibir
- `loadImageB64(url)` - Converte imagem para Base64
- `escapeHtml(text)` - Sanitiza texto para prevenir XSS

**Lógica de Seleção:**
- Se estiver tocando: mostra música atual com status "Vibing to:"
- Se não estiver tocando: escolhe aleatoriamente das últimas 10 tocadas com status "Was playing:"

### index.js
**Responsabilidade:** Entry point e handler Vercel Serverless

```javascript
module.exports = async (req, res) => {
  // 1. Carrega e valida configurações
  Config.load();
  Config.validate();
  
  // 2. Inicializa serviços
  const spotifyClient = new SpotifyClient();
  const templateManager = new TemplateManager(templatesPath);
  const svgGenerator = new SVGGenerator(spotifyClient, templateManager);
  
  // 3. Processa requisição e retorna resposta
  if (outputType === 'json') {
    res.json(await svgGenerator.getData());
  } else {
    res.send(await svgGenerator.generate(bgColor, borderColor));
  }
};
```

**Parâmetros aceitos:**
- `type` - "svg" (padrão) ou "json"
- `background_color` - Cor de fundo em hex (sem #)
- `border_color` - Cor da borda em hex (sem #)

## 🎨 Personalização

### Cores

Passe cores em hexadecimal (sem #):

```
?background_color=181414&border_color=1DB954
```

### Templates

Edite `src/templates/templates.json`:

```json
{
  "current-theme": "dark",
  "templates": {
    "spotify": "spotify.html",
    "spotify-dark": "spotify-dark.html"
  }
}
```

### Criando Novo Template

Crie um novo arquivo HTML em `src/templates/` usando as variáveis disponíveis:

**Variáveis de Dados:**
- `{{status}}` - "Vibing to:" ou "Was playing:"
- `{{songName}}` - Nome da música (HTML escapado)
- `{{artistName}}` - Nome do artista (HTML escapado)
- `{{songURI}}` - Link da música no Spotify
- `{{artistURI}}` - Link do artista no Spotify
- `{{image}}` - Imagem da capa em Base64
- `{{background_color}}` - Cor de fundo
- `{{border_color}}` - Cor da borda

**Variáveis de Animação:**
- `{{contentBar|safe}}` - HTML das barras de animação (84 divs)
- `{{barCSS|safe}}` - CSS das animações com duração aleatória

**Exemplo de template mínimo:**

```html
<svg width="400" height="120" xmlns="http://www.w3.org/2000/svg">
  <foreignObject width="400" height="120">
    <div xmlns="http://www.w3.org/1999/xhtml">
      <style>
        .container { background: #{{background_color}}; padding: 20px; }
        {{barCSS|safe}}
      </style>
      <div class="container">
        <img src="data:image/png;base64,{{image}}" width="80" height="80" />
        <div>{{status}}</div>
        <div><strong>{{songName}}</strong></div>
        <div>{{artistName}}</div>
        {{contentBar|safe}}
      </div>
    </div>
  </foreignObject>
</svg>
```

## 🐛 Solução de Problemas

### Erro: "Variáveis de ambiente não carregadas"

**Causa:** Arquivo `.env` não encontrado ou variáveis ausentes.

**Solução:**
1. Verifique se o arquivo `.env` existe na raiz do projeto
2. Confirme que todas as 3 variáveis estão definidas:
    - SPOTIFY_CLIENT_ID
    - SPOTIFY_SECRET_ID
    - SPOTIFY_REFRESH_TOKEN
3. Em produção (Vercel), configure as variáveis no dashboard

### Erro: "Failed to refresh token"

**Causas comuns:**
- Refresh token inválido ou expirado
- Client ID ou Secret incorretos
- Escopos insuficientes no token

**Solução:**
1. Verifique se as credenciais estão corretas
2. Gere um novo refresh token seguindo o processo na seção de configuração
3. Certifique-se de usar os escopos corretos:
    - `user-read-currently-playing`
    - `user-read-recently-played`

### SVG não atualiza

**Causa:** Cache do navegador ou CDN.

**Solução:**
- O cache está configurado para 1 segundo (`s-maxage=1`)
- Force atualização com Ctrl+F5
- Em produção, o Vercel pode cachear por mais tempo

### Imagem não aparece

**Causas comuns:**
- URL da imagem inacessível
- Erro ao converter para Base64
- Música sem capa de álbum

**Solução:**
1. Verifique os logs do console
2. A aplicação tenta usar 2 tamanhos de imagem como fallback
3. Se nenhuma imagem estiver disponível, o campo estará vazio

### Erro 500 no Vercel

**Causa:** Tempo de execução excedido ou erro não tratado.

**Solução:**
1. Verifique os logs no Vercel Dashboard
2. A função Serverless tem timeout de 10s (plano gratuito)
3. Confirme que a API do Spotify está acessível

## 📝 Boas Práticas

1. **Segurança:**
    - Nunca commite o arquivo `.env`
    - Use variáveis de ambiente no Vercel para produção
    - Tokens são armazenados apenas em memória

2. **Performance:**
    - Cache configurado para 1 segundo
    - Imagens convertidas para Base64 (evita requisições externas)
    - Graceful degradation em caso de erros

3. **Manutenibilidade:**
    - Código modular e testável
    - Separação clara de responsabilidades

4. **Deploy:**
    - Use sempre HTTPS em produção
    - Configure variáveis de ambiente no Vercel
    - Monitore logs de erro

## 🐳 Docker

Para executar com Docker:

```bash
# Build
docker-compose build

# Run
docker-compose up

# Stop
docker-compose down
```

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se livre para:

1. Fork o projeto
2. Criar uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abrir um Pull Request

**Diretrizes:**
- Mantenha a arquitetura modular
- Teste localmente antes de submeter PR
- Atualize a documentação quando necessário

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📊 API Response Examples

### JSON Response (`?type=json`)

```json
{
  "song_name": "Bohemian Rhapsody",
  "artist_name": "Queen",
  "album_name": "A Night at the Opera",
  "song_url": "https://open.spotify.com/track/...",
  "artist_url": "https://open.spotify.com/artist/...",
  "album_url": "https://open.spotify.com/album/...",
  "image_url": "https://i.scdn.co/image/...",
  "status": "Vibing to:",
  "is_playing": true,
  "duration_ms": 354947,
  "progress_ms": 125000
}
```

---

⭐ Se este projeto te ajudou, considere dar uma estrela!

📧 Dúvidas? Abra uma [issue](https://github.com/seu-usuario/spotify-now-playing/issues)