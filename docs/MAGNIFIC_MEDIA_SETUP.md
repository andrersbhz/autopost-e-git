# Magnific no AutoPostWP

## O que foi integrado

O AutoPostWP agora pode usar a Magnific como provedor automático de mídia editorial:

- Mystic para imagem destacada dos artigos.
- Google Veo 3.1 image-to-video para vídeo opcional.
- Jobs assíncronos com `task_id`, status e URL de saída.
- Sincronização automática no `auto-pipeline` antes da publicação e depois da geração de artigos.
- Proteção editorial padrão para evitar fabricar a identidade de uma pessoa real quando não há referência visual confiável.
- Painel em **Estúdio de Imagens** para ativar/desativar imagem, vídeo, proporção, resolução, duração, áudio e prompt editorial.

## 1. Configurar a chave da API

A chave da Magnific não é armazenada no navegador nem na tabela `user_settings`. Configure-a como secret da Edge Function:

```bash
supabase secrets set MAGNIFIC_API_KEY="SUA_CHAVE_MAGNIFIC"
```

Depois faça o deploy da função:

```bash
supabase functions deploy magnific-media
```

No painel do AutoPostWP, abra **Estúdio de Imagens → Magnific — mídia automática** e clique em **Testar API**.

## 2. Aplicar as migrations

Aplique as migrations novas:

```bash
supabase db push
```

Elas criam:

- `magnific_settings`
- `media_generation_jobs`
- `articles.generated_video_url`
- trigger que desliga a geração de imagem OpenAI quando Magnific automática é ativada, evitando cobrança duplicada.

## 3. Ativar no painel

No Estúdio de Imagens:

1. Ative **Magnific**.
2. Ative **Imagens automáticas**.
3. Opcionalmente ative **Vídeos automáticos**.
4. Escolha formato, resolução e duração.
5. Salve.
6. Clique em **Processar fila** para um teste imediato.

O fluxo normal passa a ser:

`tendência → artigo → job Mystic → imagem → job Veo 3.1 opcional → vídeo → publicação`

## Comportamento assíncrono

A Magnific devolve um `task_id`. O AutoPostWP não mantém uma requisição aberta aguardando a renderização. Cada execução do pipeline consulta os jobs pendentes e, ao receber `COMPLETED`, grava a URL retornada:

- imagem em `articles.featured_image_url`;
- vídeo em `articles.generated_video_url`.

Isso evita timeout de Edge Function e é mais seguro para automação em produção.

## Segurança

- `MAGNIFIC_API_KEY` fica apenas nos secrets do Supabase.
- O frontend nunca recebe a chave.
- RLS limita configurações e jobs ao próprio usuário.
- O filtro NSFW da Magnific permanece habilitado.
- O preset editorial evita texto, logotipos, watermarks e cenas inventadas que possam alterar o sentido factual da matéria.

## API usada

- Imagem: `POST /v1/ai/mystic`
- Status da imagem: `GET /v1/ai/mystic/{task-id}`
- Vídeo: `POST /v1/ai/image-to-video/veo-3-1`
- Status do vídeo: `GET /v1/ai/image-to-video/veo-3-1/{task-id}`

A implementação normaliza os aliases da interface para os valores oficiais de aspect ratio aceitos pelo Mystic.
