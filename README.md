# Mecatrônica 2025

> Uma história que terminou, mas que pode ser revivida.

Site-memória da turma: uma introdução cinematográfica, um hero em tela cheia e uma narrativa em capítulos com memórias, galeria editorial, vídeos, números e um final emocional. É HTML, CSS e JavaScript puro, sem frameworks e sem bibliotecas de animação.

## Como adicionar as mídias

1. Coloque os arquivos nas pastas:

   | Pasta            | O que vai nela                                   | Formatos                         |
   | ---------------- | ------------------------------------------------ | -------------------------------- |
   | `media/fotos/`   | fotografias (pode usar subpastas)                | jpg, jpeg, png, webp, avif, gif  |
   | `media/videos/`  | vídeos                                           | mp4, webm, mov, m4v              |
   | `media/musicas/` | trilhas do player                                | mp3, m4a, aac, ogg, opus, wav    |

2. Gere o manifesto (requer [Node.js](https://nodejs.org) 18+):

   ```bash
   npm install        # opcional, mas recomendado: instala o "sharp" para otimizar as fotos
   npm run build      # lê as pastas e atualiza media/manifest.js
   ```

3. Faça commit de `media/` inteira (incluindo `media/manifest.js` e `media/_gerado/`).

O site só mostra o que estiver no manifesto. Por isso, **rode `npm run build` sempre que adicionar, trocar ou remover mídias**. Os números da seção "Em números" (fotografias, vídeos) são contados a partir desses arquivos reais.

### O que o build faz

- **Fotos:** lê as dimensões e a rotação EXIF. Com `sharp` instalado, também gera versões WebP leves de 640, 1280 e 1920 px em `media/_gerado/fotos/` e a cor média de cada foto (usada enquanto a imagem carrega). Sem `sharp`, o site usa os arquivos originais.
- **Vídeos:** com `ffmpeg` instalado, gera a capa e lê duração e proporção. Com `sharp`, a capa é o quadro mais nítido e bem exposto entre cinco momentos do vídeo. Uma imagem com o mesmo nome do vídeo (`formatura.mp4` + `formatura.jpg`) é usada como capa no lugar da gerada.
- **Vídeos de celular (.mov / HEVC):** nem todo navegador toca. Rode `npm run build:videos` para converter para MP4 H.264 leve, com no máximo 1920 px e reprodução que começa antes do download terminar.
- **Músicas:** o título vem das tags do arquivo (com `ffmpeg`) ou do nome do arquivo (`01 - Nossa música.mp3` → "Nossa música"). Nomes genéricos viram só o número (`musica-de-fundo01.mp3` → "Trilha 01").
- **Efeito do projetor:** um áudio em `media/musicas/` cujo nome começa com `projetor` não entra na playlist. Ele toca uma vez, quando a cortina da introdução se abre, e a trilha entra logo depois.
- **Avisos:** formatos que não abrem no navegador (HEIC, por exemplo) e referências inválidas no `config.json` aparecem no final da execução.

Arquivos gerados para mídias que não existem mais são removidos automaticamente.

### Escolher as fotos de destaque (opcional)

Sem configuração, o site escolhe sozinho. A capa é a primeira foto horizontal; se alguma tiver "capa" ou "turma" no nome, ela tem preferência. Para escolher manualmente, crie `media/config.json`:

```json
{
  "capa": "turma.jpg",
  "abertura": "primeiro-dia.jpg",
  "final": "ultima-aula.jpg",
  "destaques": ["foto1.jpg", "foto2.jpg", "foto3.jpg", "foto4.jpg", "foto5.jpg"],
  "videos": { "VID_20250312.mp4": "Apresentação do projeto" },
  "musicas": { "musica-de-fundo01.mp3": "Nome da música" }
}
```

- `capa`: fundo da introdução e do hero
- `abertura`: foto em tela cheia depois de "Foi aqui que tudo começou."
- `final`: última fotografia, com "Obrigado por fazer parte dessa história."
- `destaques`: até 5 fotos da seção Memórias
- `videos`: títulos para os vídeos. Sem título, o vídeo aparece como "Momento 01", "Momento 02"…
- `musicas`: títulos para as faixas do player

Rode `npm run build` depois de editar o arquivo.

## Ver o site

- Abrir `index.html` direto no navegador funciona.
- Para testar como ficará publicado: `npm start` e acesse <http://localhost:8080>.
- **Pré-visualização do layout:** `index.html?demo` preenche a página com imagens abstratas de demonstração, útil para ver galeria, lightbox e vídeos antes de ter as mídias. Nada disso aparece no site normal.

## Publicar (GitHub Pages)

Em *Settings → Pages*, escolha *Deploy from a branch* e selecione a branch e a pasta `/ (root)`. O site é estático e não precisa de build no servidor; basta que `media/manifest.js` e `media/_gerado/` estejam no commit.

O GitHub Pages aceita sites de até 1 GB e arquivos de até 100 MB. Com muitas fotos originais grandes, considere guardar os originais fora do repositório. Depois do build o site usa só as versões em `media/_gerado/`; o original fica como reserva, caso a versão otimizada falhe.

## Experiência

1. **Introdução:** tela preta, um brilho, "MECATRÔNICA", "2025" e a frase surgem em sequência. O botão **Entrar na memória** abre a cena como a cortina de um filme. Um clique antes do fim adianta a sequência.
2. **Hero:** a capa ocupa a tela, com parallax discreto.
3. **Capítulos I–IV:** frases que aparecem palavra por palavra entre as seções.
4. **Memórias:** até 5 fotos com bastante espaço vazio.
5. **Fotografias:** galeria editorial com proporções e posições variadas, carregada em lotes ("Ver mais fotografias").
6. **Lightbox:** tela cheia com contador (`12 / 238`), ← → e ESC no teclado, arrastar para os lados no celular, arrastar para baixo para fechar, e o botão "voltar" do celular fecha o visualizador.
7. **Momentos em movimento:** vídeos em uma faixa horizontal (deslizar ou arrastar). Cada vídeo só carrega quando é aberto, e a música pausa enquanto ele toca.
8. **Em números:** contagem animada a partir dos arquivos reais.
9. **Final:** "O ano acabou." → "Mas a história continua." → título → "Para nunca esquecer." → **Reviver a experiência ↻**, que volta ao início.

**Música:** player compacto no canto inferior direito. Nunca toca sozinha. Com "Som ligado" na introdução, o clique em "Entrar na memória" toca o projetor e, em seguida, a trilha entra em fade. A escolha fica salva no navegador.

## Leveza e acessibilidade

- Animações só com `transform`, `opacity` e blur pontual. Não há bibliotecas de animação.
- `IntersectionObserver` para revelar seções, fazer parallax só do que está na tela e carregar mídia sob demanda.
- Imagens com `loading="lazy"`, `srcset`/`sizes`, dimensões fixas (sem pulos de layout) e fallback automático para o original.
- `prefers-reduced-motion`: sem parallax, zoom, blur ou deslizamentos. Tudo continua funcionando, só com fades curtos.
- Cursor personalizado apenas em desktop com mouse (desligado no toque e no modo de movimento reduzido).
- Navegação por teclado, foco visível, diálogos com `aria-modal` e conteúdo de fundo inerte enquanto a introdução, o lightbox ou o player de vídeo estão abertos.
- Sem JavaScript, a introdução é pulada e o texto aparece normalmente.

## Estrutura

```
index.html              página
assets/css/style.css    estilos (paleta, tipografia, componentes, responsivo, movimento reduzido)
assets/js/main.js       interações (introdução, galeria, lightbox, vídeos, música, final…)
assets/fonts/           Cormorant Garamond e Inter (licença SIL OFL, incluída)
assets/img/             grão de filme e favicon
media/                  suas mídias + manifest.js (gerado) + _gerado/ (versões otimizadas)
tools/build.mjs         gerador do manifesto e das versões otimizadas
```
