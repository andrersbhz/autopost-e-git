=== AutoBlog AI Connector ===
Contributors: autoblogai
Tags: automation, ai, publishing, seo, rest-api
Requires at least: 5.8
Tested up to: 6.7
Stable tag: 1.0.0
Requires PHP: 7.4
License: GPLv2 or later

== Description ==

Conecta o painel AutoBlog AI ao seu WordPress para publicação automática de artigos gerados por IA com SEO otimizado.

**Recursos:**
* Endpoint REST seguro com autenticação via chave API
* Publicação de artigos com título, conteúdo HTML, excerpt
* Upload automático de imagem destacada (base64 ou URL)
* Preenchimento automático de campos Yoast SEO
* Criação automática de categorias
* Agendamento de posts para data futura
* Listagem de posts gerados pelo sistema
* Painel de configurações no admin do WordPress

== Installation ==

1. Faça upload da pasta `autoblog-ai-connector` para `/wp-content/plugins/`
2. Ative o plugin em Plugins → Plugins Instalados
3. Vá em Configurações → AutoBlog AI para ver a chave API
4. Copie a chave API e cole no painel AutoBlog AI em Configurações → WordPress

== Changelog ==

= 1.0.0 =
* Lançamento inicial
* Endpoints: /publish, /status, /posts, /categories
* Suporte a Yoast SEO
* Upload de imagens (base64 e URL)
