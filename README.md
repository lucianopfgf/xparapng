# X Post Canvas

Crie um aplicativo web chamado "X Post to Image" que transforma posts do X (Twitter) em imagens PNG no formato 16:9 vertical (1080x1920px).

## Funcionalidades Principais

### 1. Captura do Post do X
- Campo de input para URL do post do X
- Ao receber a URL, fazer fetch dos dados do post via API do X ou scraping
- Extrair e exibir:
  - Nome completo do usuário
  - @username
  - Foto de perfil (URL original do X)
  - Texto completo do post (suportar threads longas dividindo em múltiplas imagens se necessário)
  - Data/hora do post
  - Contadores: curtidas, retweets, visualizações, respostas (com opção de ocultar)

### 2. Layout da Imagem
- Formato fixo: 1080x1920px (16:9 vertical)
- O bloco do post deve ser renderizado exatamente como aparece no X:
  - Mesma tipografia, espaçamento e ícones
  - Foto de perfil circular no canto superior esquerdo
  - Nome e @username abaixo da foto
  - Texto do post com quebras de linha preservadas
  - Mídia anexada (imagens/vídeos) se houver
  - Footer com contadores (opcional)

### 3. Sistema de Fundos
- O bloco do post deve flutuar sobre um fundo colorido com as seguintes opções obrigatórias:
  1. **Preto sólido** (#000000)
  2. **Branco sólido** (#FFFFFF)
  3. **Azul Kapital** (#0052CC ou similar azul corporativo)
  4. **Branco texturizado granulada HD** (textura de papel ou grão fino em alta resolução)
  5. **Azul texturizado granulada HD** (mesma textura do branco mas em tom azul)

- O bloco do post deve ter:
  - Sombra suave (box-shadow) para dar profundidade e modernidade
  - Bordas levemente arredondadas (8-12px)
  - Padding interno generoso para respiro

### 4. Customizações
- **Ajuste de dimensões do bloco do post**: slider ou input numérico para largura (ex: 60%-95% da largura total)
- **Ocultar contadores**: toggle para mostrar/ocultar curtidas, visualizações, retweets
- **Seletor de fundo**: dropdown ou grid visual com preview das 5 opções
- **Preview em tempo real**: mostrar como ficará a imagem antes de exportar

### 5. Exportação
- Botão "Exportar PNG" que gera e baixa a imagem em alta resolução (1080x1920px)
- Suporte a múltiplas imagens se o post for muito longo (dividir automaticamente)
- Nome do arquivo: `x-post-{username}-{timestamp}.png`

## Design e UX
- Interface limpa e moderna
- Preview grande da imagem sendo gerada
- Loading state enquanto processa a URL
- Mensagens de erro claras para URLs inválidas ou posts protegidos
- Responsivo (funcionar bem em desktop e mobile)

## Stack Sugerida
- Frontend: React + TypeScript
- Processamento de imagem: html2canvas ou similar
- API do X: usar endpoint oficial ou serviço de scraping se necessário
- Hospedagem: Vercel ou Netlify

## Inspiração
- Referências visuais e de funcionalidade : https://10015.io/tools/tweet-to-image-converter
- Manter fidelidade ao layout original do X para autenticidade

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://xpost-to-canvas.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/690f5af7-fe07-42fa-9d52-fe1982a475a4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
