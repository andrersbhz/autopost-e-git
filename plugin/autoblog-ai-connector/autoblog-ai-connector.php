<?php
/**
 * Plugin Name: AutoBlog AI Connector
 * Plugin URI: https://autoblog-ai.lovable.app
 * Description: Conecta o painel AutoBlog AI ao WordPress para publicação automática de artigos com SEO, imagem destacada e campos Yoast.
 * Version: 1.0.0
 * Author: AutoBlog AI
 * License: GPL v2 or later
 * Text Domain: autoblog-ai-connector
 *
 * Este plugin cria um endpoint REST customizado que aceita posts do sistema AutoBlog AI
 * com suporte completo a: título, conteúdo HTML, excerpt, imagem destacada (base64 ou URL),
 * campos SEO (Yoast), categorias e status de publicação.
 */

if (!defined('ABSPATH')) {
    exit; // Impede acesso direto ao ficheiro
}

// ============================================================
// 1. CONSTANTES DO PLUGIN
// ============================================================
define('AUTOBLOG_AI_VERSION', '1.0.0');
define('AUTOBLOG_AI_NAMESPACE', 'autoblog-ai/v1');

// ============================================================
// 2. ATIVAÇÃO — cria a chave API na primeira ativação
// ============================================================
register_activation_hook(__FILE__, function () {
    // Gera uma chave API única se ainda não existir
    if (!get_option('autoblog_ai_api_key')) {
        update_option('autoblog_ai_api_key', wp_generate_password(48, false));
    }
    // Marca que o plugin está ativo
    update_option('autoblog_ai_active', true);
    // Limpa cache de rewrite rules
    flush_rewrite_rules();
});

// ============================================================
// 3. DESATIVAÇÃO
// ============================================================
register_deactivation_hook(__FILE__, function () {
    update_option('autoblog_ai_active', false);
    flush_rewrite_rules();
});

// ============================================================
// 4. PÁGINA DE CONFIGURAÇÕES NO ADMIN
// ============================================================
add_action('admin_menu', function () {
    add_options_page(
        'AutoBlog AI Connector',
        'AutoBlog AI',
        'manage_options',
        'autoblog-ai-settings',
        'autoblog_ai_settings_page'
    );
});

/**
 * Renderiza a página de configurações com a chave API e status
 */
function autoblog_ai_settings_page() {
    // Regenerar chave se solicitado
    if (isset($_POST['autoblog_ai_regenerate']) && check_admin_referer('autoblog_ai_regen')) {
        update_option('autoblog_ai_api_key', wp_generate_password(48, false));
        echo '<div class="notice notice-success"><p>Chave API regenerada com sucesso!</p></div>';
    }

    $api_key = get_option('autoblog_ai_api_key', '');
    $site_url = get_site_url();
    $endpoint = $site_url . '/wp-json/' . AUTOBLOG_AI_NAMESPACE;
    ?>
    <div class="wrap">
        <h1>🤖 AutoBlog AI Connector</h1>
        <div style="background:#1a1a2e;color:#e0e0e0;padding:24px;border-radius:12px;margin-top:16px;max-width:700px;">
            <h2 style="color:#c084fc;margin-top:0;">Status da Conexão</h2>
            <p style="color:#4ade80;font-size:16px;">✅ Plugin ativo e pronto para receber artigos</p>

            <h3 style="color:#c084fc;">Dados para configurar no AutoBlog AI:</h3>
            <table style="width:100%;border-collapse:collapse;">
                <tr>
                    <td style="padding:8px;color:#a0a0a0;">URL do Endpoint:</td>
                    <td style="padding:8px;">
                        <code style="background:#2a2a4a;padding:4px 8px;border-radius:4px;color:#f0abfc;"><?php echo esc_html($endpoint); ?></code>
                    </td>
                </tr>
                <tr>
                    <td style="padding:8px;color:#a0a0a0;">Chave API:</td>
                    <td style="padding:8px;">
                        <code style="background:#2a2a4a;padding:4px 8px;border-radius:4px;color:#f0abfc;" id="api-key"><?php echo esc_html($api_key); ?></code>
                        <button type="button" onclick="navigator.clipboard.writeText(document.getElementById('api-key').textContent)" class="button button-small" style="margin-left:8px;">📋 Copiar</button>
                    </td>
                </tr>
                <tr>
                    <td style="padding:8px;color:#a0a0a0;">Versão:</td>
                    <td style="padding:8px;color:#c084fc;"><?php echo AUTOBLOG_AI_VERSION; ?></td>
                </tr>
            </table>

            <form method="post" style="margin-top:16px;">
                <?php wp_nonce_field('autoblog_ai_regen'); ?>
                <button type="submit" name="autoblog_ai_regenerate" class="button" style="background:#7c3aed;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;">
                    🔄 Regenerar Chave API
                </button>
            </form>

            <div style="margin-top:20px;padding:12px;background:#2a2a4a;border-radius:8px;border-left:3px solid #c084fc;">
                <strong style="color:#c084fc;">📌 Instruções:</strong>
                <ol style="margin:8px 0;padding-left:20px;color:#d0d0d0;">
                    <li>Copie a <strong>URL do Endpoint</strong> e a <strong>Chave API</strong></li>
                    <li>No painel AutoBlog AI, vá em <strong>Configurações → WordPress</strong></li>
                    <li>Cole a URL no campo <strong>"URL do WordPress"</strong></li>
                    <li>Cole a chave API no campo <strong>"Senha de Aplicativo"</strong></li>
                    <li>Clique em <strong>Salvar</strong></li>
                </ol>
            </div>
        </div>
    </div>
    <?php
}

// ============================================================
// 5. REGISTRO DOS ENDPOINTS REST
// ============================================================
add_action('rest_api_init', function () {

    // --- POST /autoblog-ai/v1/publish ---
    // Recebe um artigo completo e publica no WordPress
    register_rest_route(AUTOBLOG_AI_NAMESPACE, '/publish', [
        'methods'  => 'POST',
        'callback' => 'autoblog_ai_publish_article',
        'permission_callback' => 'autoblog_ai_check_auth',
    ]);

    // --- GET /autoblog-ai/v1/status ---
    // Verifica se o plugin está ativo e acessível
    register_rest_route(AUTOBLOG_AI_NAMESPACE, '/status', [
        'methods'  => 'GET',
        'callback' => 'autoblog_ai_status',
        'permission_callback' => 'autoblog_ai_check_auth',
    ]);

    // --- GET /autoblog-ai/v1/posts ---
    // Lista os últimos posts publicados pelo sistema
    register_rest_route(AUTOBLOG_AI_NAMESPACE, '/posts', [
        'methods'  => 'GET',
        'callback' => 'autoblog_ai_list_posts',
        'permission_callback' => 'autoblog_ai_check_auth',
    ]);

    // --- GET /autoblog-ai/v1/categories ---
    // Lista todas as categorias disponíveis
    register_rest_route(AUTOBLOG_AI_NAMESPACE, '/categories', [
        'methods'  => 'GET',
        'callback' => 'autoblog_ai_list_categories',
        'permission_callback' => 'autoblog_ai_check_auth',
    ]);
});

// ============================================================
// 6. AUTENTICAÇÃO VIA CHAVE API (Header ou Query Param)
// ============================================================
function autoblog_ai_check_auth($request) {
    $api_key = get_option('autoblog_ai_api_key', '');
    if (empty($api_key)) return false;

    // Aceita via header X-AutoBlog-Key ou via query param ?api_key=
    $provided = $request->get_header('X-AutoBlog-Key');
    if (!$provided) {
        $provided = $request->get_param('api_key');
    }

    return hash_equals($api_key, (string) $provided);
}

// ============================================================
// 7. ENDPOINT: STATUS — verifica conectividade
// ============================================================
function autoblog_ai_status() {
    return new WP_REST_Response([
        'status'      => 'connected',
        'plugin'      => 'AutoBlog AI Connector',
        'version'     => AUTOBLOG_AI_VERSION,
        'site_name'   => get_bloginfo('name'),
        'site_url'    => get_site_url(),
        'wp_version'  => get_bloginfo('version'),
        'yoast_active'=> defined('WPSEO_VERSION'),
        'timezone'    => wp_timezone_string(),
        'timestamp'   => current_time('c'),
    ], 200);
}

// ============================================================
// 8. ENDPOINT: PUBLISH — publica artigo completo
// ============================================================
function autoblog_ai_publish_article($request) {
    $params = $request->get_json_params();

    // Campos obrigatórios
    $title   = sanitize_text_field($params['title'] ?? '');
    $content = wp_kses_post($params['content'] ?? '');

    if (empty($title) || empty($content)) {
        return new WP_REST_Response([
            'error' => 'Campos "title" e "content" são obrigatórios',
        ], 400);
    }

    // Campos opcionais
    $excerpt         = sanitize_text_field($params['excerpt'] ?? '');
    $status          = in_array($params['status'] ?? 'publish', ['publish', 'draft', 'pending']) ? $params['status'] : 'publish';
    $category_names  = $params['categories'] ?? [];
    $seo_title       = sanitize_text_field($params['seo_title'] ?? '');
    $meta_desc       = sanitize_text_field($params['meta_description'] ?? '');
    $seo_keyword     = sanitize_text_field($params['seo_keyword'] ?? '');
    $image_url       = $params['featured_image_url'] ?? '';
    $image_base64    = $params['featured_image_base64'] ?? '';
    $scheduled_at    = $params['scheduled_at'] ?? null;

    // --- Criar/buscar categorias ---
    $category_ids = [];
    foreach ((array) $category_names as $cat_name) {
        $cat_name = sanitize_text_field($cat_name);
        $term = term_exists($cat_name, 'category');
        if ($term) {
            $category_ids[] = (int) $term['term_id'];
        } else {
            $new = wp_insert_term($cat_name, 'category');
            if (!is_wp_error($new)) {
                $category_ids[] = (int) $new['term_id'];
            }
        }
    }

    // --- Preparar dados do post ---
    $post_data = [
        'post_title'    => $title,
        'post_content'  => $content,
        'post_excerpt'  => $excerpt,
        'post_status'   => $status,
        'post_type'     => 'post',
        'post_author'   => 1, // Admin por padrão
        'post_category' => !empty($category_ids) ? $category_ids : [1],
    ];

    // Agendamento futuro
    if ($scheduled_at && $status === 'publish') {
        $post_data['post_status'] = 'future';
        $post_data['post_date']   = date('Y-m-d H:i:s', strtotime($scheduled_at));
        $post_data['post_date_gmt'] = get_gmt_from_date($post_data['post_date']);
    }

    // --- Inserir o post ---
    $post_id = wp_insert_post($post_data, true);

    if (is_wp_error($post_id)) {
        return new WP_REST_Response([
            'error' => 'Falha ao criar post: ' . $post_id->get_error_message(),
        ], 500);
    }

    // --- Upload de imagem destacada ---
    $media_id = 0;

    // Opção 1: imagem via base64
    if (!empty($image_base64)) {
        $media_id = autoblog_ai_upload_base64_image($image_base64, $title, $post_id);
    }
    // Opção 2: imagem via URL
    elseif (!empty($image_url)) {
        $media_id = autoblog_ai_upload_url_image($image_url, $title, $post_id);
    }

    if ($media_id > 0) {
        set_post_thumbnail($post_id, $media_id);
    }

    // --- Campos SEO (Yoast) ---
    if (defined('WPSEO_VERSION')) {
        if ($seo_title)   update_post_meta($post_id, '_yoast_wpseo_title', $seo_title);
        if ($meta_desc)   update_post_meta($post_id, '_yoast_wpseo_metadesc', $meta_desc);
        if ($seo_keyword) update_post_meta($post_id, '_yoast_wpseo_focuskw', $seo_keyword);
    }

    // Meta customizado para rastreamento
    update_post_meta($post_id, '_autoblog_ai_generated', true);
    update_post_meta($post_id, '_autoblog_ai_timestamp', current_time('c'));

    return new WP_REST_Response([
        'success'  => true,
        'post_id'  => $post_id,
        'link'     => get_permalink($post_id),
        'status'   => get_post_status($post_id),
        'media_id' => $media_id,
        'message'  => 'Artigo publicado com sucesso via AutoBlog AI!',
    ], 201);
}

// ============================================================
// 9. ENDPOINT: POSTS — lista últimos posts gerados
// ============================================================
function autoblog_ai_list_posts($request) {
    $per_page = (int) ($request->get_param('per_page') ?? 20);

    $posts = get_posts([
        'post_type'      => 'post',
        'posts_per_page' => min($per_page, 100),
        'meta_key'       => '_autoblog_ai_generated',
        'meta_value'     => '1',
        'orderby'        => 'date',
        'order'          => 'DESC',
    ]);

    $result = array_map(function ($p) {
        return [
            'id'        => $p->ID,
            'title'     => $p->post_title,
            'status'    => $p->post_status,
            'link'      => get_permalink($p->ID),
            'date'      => $p->post_date,
            'excerpt'   => wp_trim_words($p->post_excerpt ?: $p->post_content, 30),
            'thumbnail' => get_the_post_thumbnail_url($p->ID, 'medium'),
        ];
    }, $posts);

    return new WP_REST_Response([
        'total' => count($result),
        'posts' => $result,
    ], 200);
}

// ============================================================
// 10. ENDPOINT: CATEGORIES — lista categorias
// ============================================================
function autoblog_ai_list_categories() {
    $cats = get_categories(['hide_empty' => false]);
    $result = array_map(function ($c) {
        return [
            'id'    => $c->term_id,
            'name'  => $c->name,
            'slug'  => $c->slug,
            'count' => $c->count,
        ];
    }, $cats);

    return new WP_REST_Response($result, 200);
}

// ============================================================
// 11. HELPERS — Upload de imagem (base64)
// ============================================================
function autoblog_ai_upload_base64_image($base64, $title, $post_id) {
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/media.php');
    require_once(ABSPATH . 'wp-admin/includes/image.php');

    // Remove cabeçalho data:image/xxx;base64, se existir
    if (strpos($base64, ',') !== false) {
        $parts  = explode(',', $base64);
        $base64 = $parts[1];
    }

    $decoded  = base64_decode($base64);
    $slug     = sanitize_title($title);
    $filename = $slug . '-' . time() . '.png';

    $upload = wp_upload_bits($filename, null, $decoded);
    if ($upload['error']) return 0;

    $filetype = wp_check_filetype($upload['file']);
    $attachment = [
        'post_mime_type' => $filetype['type'],
        'post_title'     => $title,
        'post_content'   => '',
        'post_status'    => 'inherit',
    ];

    $attach_id = wp_insert_attachment($attachment, $upload['file'], $post_id);
    $metadata  = wp_generate_attachment_metadata($attach_id, $upload['file']);
    wp_update_attachment_metadata($attach_id, $metadata);

    // Alt text para SEO
    update_post_meta($attach_id, '_wp_attachment_image_alt', $title);

    return $attach_id;
}

// ============================================================
// 12. HELPERS — Upload de imagem (URL externa)
// ============================================================
function autoblog_ai_upload_url_image($url, $title, $post_id) {
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    require_once(ABSPATH . 'wp-admin/includes/media.php');
    require_once(ABSPATH . 'wp-admin/includes/image.php');

    $tmp = download_url($url, 30);
    if (is_wp_error($tmp)) return 0;

    $slug = sanitize_title($title);
    $ext  = pathinfo(parse_url($url, PHP_URL_PATH), PATHINFO_EXTENSION) ?: 'jpg';

    $file_array = [
        'name'     => $slug . '-' . time() . '.' . $ext,
        'tmp_name' => $tmp,
    ];

    $media_id = media_handle_sideload($file_array, $post_id, $title);
    if (is_wp_error($media_id)) {
        @unlink($tmp);
        return 0;
    }

    // Alt text para SEO
    update_post_meta($media_id, '_wp_attachment_image_alt', $title);

    return $media_id;
}
