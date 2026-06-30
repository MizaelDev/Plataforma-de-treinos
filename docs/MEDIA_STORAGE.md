# Armazenamento de mídias

O sistema não deve salvar vídeos, GIFs ou imagens no banco PostgreSQL nem no disco local do Railway.

## Regra principal

- O banco salva apenas URL e metadados.
- O frontend exibe a mídia a partir da URL salva.
- Upload real deve ser feito futuramente via storage externo ou URL assinada.
- Chaves de storage ficam apenas no backend.

## Campos preparados

Biblioteca de exercícios:

- `mediaType`: `IMAGE`, `GIF`, `VIDEO`, `EXTERNAL_URL`, `EMBED`
- `mediaUrl`
- `thumbnailUrl`
- `videoProvider`: `YOUTUBE`, `VIMEO`, `BUNNY`, `SUPABASE`, `R2`, `EXTERNAL`, `NONE`
- `durationSeconds`
- `fileSize`
- `mimeType`

Aulas:

- `videoUrl`
- `thumbnailUrl`
- `videoProvider`
- `durationSeconds`
- `isPreview`
- `order`

## Serviços recomendados

- YouTube não listado: demonstrações simples.
- Vimeo: controle maior do vídeo.
- Bunny.net Stream: melhor opção de custo/benefício para cursos e aulas.
- Cloudflare R2: bom para imagens, GIFs, MP4s e arquivos.
- Supabase Storage: simples para começar.
- Amazon S3: opção robusta para produção maior.

## O que não fazer

- Não salvar base64 no banco.
- Não persistir arquivo no Railway.
- Não expor chaves de storage no frontend.
- Não carregar vídeo automaticamente em listagens grandes.
