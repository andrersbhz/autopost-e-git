export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      _internal_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          ai_provider: string | null
          author_id: string | null
          blog_id: string | null
          category: string
          content: string | null
          created_at: string
          excerpt: string | null
          fact_check_notes: string | null
          fact_check_status: string | null
          featured_image_url: string | null
          focus_keyword: string | null
          id: string
          image_alt: string | null
          image_caption: string | null
          is_approved: boolean | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          research_references: Json | null
          scheduled_at: string | null
          seo_audit_log: Json | null
          seo_keyword: string | null
          seo_title: string | null
          slug: string | null
          source_urls: string[] | null
          status: string
          title: string
          trending_topic: string | null
          updated_at: string
          user_id: string
          video_thumbnail_url: string | null
          visual_elements: Json | null
          wordpress_post_id: string | null
        }
        Insert: {
          ai_provider?: string | null
          author_id?: string | null
          blog_id?: string | null
          category: string
          content?: string | null
          created_at?: string
          excerpt?: string | null
          fact_check_notes?: string | null
          fact_check_status?: string | null
          featured_image_url?: string | null
          focus_keyword?: string | null
          id?: string
          image_alt?: string | null
          image_caption?: string | null
          is_approved?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          research_references?: Json | null
          scheduled_at?: string | null
          seo_audit_log?: Json | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug?: string | null
          source_urls?: string[] | null
          status?: string
          title: string
          trending_topic?: string | null
          updated_at?: string
          user_id: string
          video_thumbnail_url?: string | null
          visual_elements?: Json | null
          wordpress_post_id?: string | null
        }
        Update: {
          ai_provider?: string | null
          author_id?: string | null
          blog_id?: string | null
          category?: string
          content?: string | null
          created_at?: string
          excerpt?: string | null
          fact_check_notes?: string | null
          fact_check_status?: string | null
          featured_image_url?: string | null
          focus_keyword?: string | null
          id?: string
          image_alt?: string | null
          image_caption?: string | null
          is_approved?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          research_references?: Json | null
          scheduled_at?: string | null
          seo_audit_log?: Json | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug?: string | null
          source_urls?: string[] | null
          status?: string
          title?: string
          trending_topic?: string | null
          updated_at?: string
          user_id?: string
          video_thumbnail_url?: string | null
          visual_elements?: Json | null
          wordpress_post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_blog_id_fkey"
            columns: ["blog_id"]
            isOneToOne: false
            referencedRelation: "user_blogs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      authors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          category: string | null
          created_at: string
          id: string
          name: string
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name: string
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          created_at: string | null
          details: Json | null
          id: string
          level: string
          message: string
          module: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          details?: Json | null
          id?: string
          level?: string
          message: string
          module: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          details?: Json | null
          id?: string
          level?: string
          message?: string
          module?: string
          user_id?: string
        }
        Relationships: []
      }
      facebook_accounts: {
        Row: {
          access_token: string
          created_at: string | null
          disconnected_at: string | null
          facebook_enabled: boolean
          id: string
          instagram_account_id: string | null
          instagram_enabled: boolean
          is_active: boolean | null
          last_metrics: Json | null
          metrics_updated_at: string | null
          page_id: string
          page_name: string | null
          picture_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          disconnected_at?: string | null
          facebook_enabled?: boolean
          id?: string
          instagram_account_id?: string | null
          instagram_enabled?: boolean
          is_active?: boolean | null
          last_metrics?: Json | null
          metrics_updated_at?: string | null
          page_id: string
          page_name?: string | null
          picture_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          disconnected_at?: string | null
          facebook_enabled?: boolean
          id?: string
          instagram_account_id?: string | null
          instagram_enabled?: boolean
          is_active?: boolean | null
          last_metrics?: Json | null
          metrics_updated_at?: string | null
          page_id?: string
          page_name?: string | null
          picture_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      facebook_oauth_states: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          state: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      google_indexing_history: {
        Row: {
          article_id: string | null
          created_at: string
          id: string
          response_details: Json | null
          status: string
          url: string
          user_id: string
        }
        Insert: {
          article_id?: string | null
          created_at?: string
          id?: string
          response_details?: Json | null
          status: string
          url: string
          user_id: string
        }
        Update: {
          article_id?: string | null
          created_at?: string
          id?: string
          response_details?: Json | null
          status?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_indexing_history_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_indexing_history_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "public_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      google_search_console_oauth_states: {
        Row: {
          expires_at: string | null
          state: string
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          state: string
          user_id: string
        }
        Update: {
          expires_at?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      instagram_accounts_direct: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_login: string | null
          password: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          password: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          password?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      knowledge_entries: {
        Row: {
          content: string
          created_at: string
          description: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          id: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          file_type?: string | null
          id?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      license_keys: {
        Row: {
          activated_at: string | null
          created_at: string
          current_ip: string | null
          current_session_id: string | null
          current_user_agent: string | null
          expires_at: string | null
          id: string
          last_login_at: string | null
          license_key: string
          mp_subscription_id: string | null
          notes: string | null
          plan: string
          status: string
          stripe_subscription_id: string | null
          subscription_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          current_ip?: string | null
          current_session_id?: string | null
          current_user_agent?: string | null
          expires_at?: string | null
          id?: string
          last_login_at?: string | null
          license_key: string
          mp_subscription_id?: string | null
          notes?: string | null
          plan: string
          status?: string
          stripe_subscription_id?: string | null
          subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          current_ip?: string | null
          current_session_id?: string | null
          current_user_agent?: string | null
          expires_at?: string | null
          id?: string
          last_login_at?: string | null
          license_key?: string
          mp_subscription_id?: string | null
          notes?: string | null
          plan?: string
          status?: string
          stripe_subscription_id?: string | null
          subscription_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "license_keys_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      license_sessions: {
        Row: {
          ended_at: string | null
          ended_reason: string | null
          id: string
          ip: string | null
          is_active: boolean
          license_id: string
          session_token: string
          started_at: string
          user_agent: string | null
        }
        Insert: {
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          ip?: string | null
          is_active?: boolean
          license_id: string
          session_token: string
          started_at?: string
          user_agent?: string | null
        }
        Update: {
          ended_at?: string | null
          ended_reason?: string | null
          id?: string
          ip?: string | null
          is_active?: boolean
          license_id?: string
          session_token?: string
          started_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "license_sessions_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "license_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      nexa_audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          organization_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          organization_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nexa_audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "nexa_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nexa_organization_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["nexa_role"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["nexa_role"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["nexa_role"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexa_organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "nexa_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nexa_organizations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          logo_url: string | null
          name: string
          plan: string
          segment: Database["public"]["Enums"]["nexa_segment"]
          settings: Json
          slug: string
          status: Database["public"]["Enums"]["nexa_org_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name: string
          plan?: string
          segment?: Database["public"]["Enums"]["nexa_segment"]
          settings?: Json
          slug: string
          status?: Database["public"]["Enums"]["nexa_org_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          plan?: string
          segment?: Database["public"]["Enums"]["nexa_segment"]
          settings?: Json
          slug?: string
          status?: Database["public"]["Enums"]["nexa_org_status"]
          updated_at?: string
        }
        Relationships: []
      }
      nexa_profiles: {
        Row: {
          active_organization_id: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          preferences: Json
          updated_at: string
        }
        Insert: {
          active_organization_id?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          preferences?: Json
          updated_at?: string
        }
        Update: {
          active_organization_id?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          preferences?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexa_profiles_active_organization_id_fkey"
            columns: ["active_organization_id"]
            isOneToOne: false
            referencedRelation: "nexa_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      nexa_team_members: {
        Row: {
          created_at: string
          id: string
          is_lead: boolean
          organization_id: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_lead?: boolean
          organization_id: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_lead?: boolean
          organization_id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexa_team_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "nexa_organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nexa_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "nexa_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      nexa_teams: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexa_teams_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "nexa_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      online_users: {
        Row: {
          city: string | null
          country: string | null
          id: string
          last_seen: string | null
          latitude: number
          longitude: number
          state: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          id?: string
          last_seen?: string | null
          latitude: number
          longitude: number
          state?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          id?: string
          last_seen?: string | null
          latitude?: number
          longitude?: number
          state?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_methods_config: {
        Row: {
          admin_notify_email: string | null
          admin_notify_phone: string | null
          admin_notify_whatsapp: boolean
          created_at: string
          id: string
          mercadopago_access_token: string | null
          mercadopago_enabled: boolean
          mercadopago_public_key: string | null
          mp_webhook_secret: string | null
          notify_admin_whatsapp_number: string | null
          notify_email_admin: boolean | null
          notify_email_customer: boolean | null
          notify_whatsapp_admin: boolean | null
          pagarme_api_key: string | null
          pagarme_enabled: boolean
          pix_bank: string | null
          pix_enabled: boolean
          pix_key: string | null
          pix_key_type: string | null
          pix_owner_document: string | null
          pix_owner_name: string | null
          singleton: boolean
          stripe_enabled: boolean
          updated_at: string
        }
        Insert: {
          admin_notify_email?: string | null
          admin_notify_phone?: string | null
          admin_notify_whatsapp?: boolean
          created_at?: string
          id?: string
          mercadopago_access_token?: string | null
          mercadopago_enabled?: boolean
          mercadopago_public_key?: string | null
          mp_webhook_secret?: string | null
          notify_admin_whatsapp_number?: string | null
          notify_email_admin?: boolean | null
          notify_email_customer?: boolean | null
          notify_whatsapp_admin?: boolean | null
          pagarme_api_key?: string | null
          pagarme_enabled?: boolean
          pix_bank?: string | null
          pix_enabled?: boolean
          pix_key?: string | null
          pix_key_type?: string | null
          pix_owner_document?: string | null
          pix_owner_name?: string | null
          singleton?: boolean
          stripe_enabled?: boolean
          updated_at?: string
        }
        Update: {
          admin_notify_email?: string | null
          admin_notify_phone?: string | null
          admin_notify_whatsapp?: boolean
          created_at?: string
          id?: string
          mercadopago_access_token?: string | null
          mercadopago_enabled?: boolean
          mercadopago_public_key?: string | null
          mp_webhook_secret?: string | null
          notify_admin_whatsapp_number?: string | null
          notify_email_admin?: boolean | null
          notify_email_customer?: boolean | null
          notify_whatsapp_admin?: boolean | null
          pagarme_api_key?: string | null
          pagarme_enabled?: boolean
          pix_bank?: string | null
          pix_enabled?: boolean
          pix_key?: string | null
          pix_key_type?: string | null
          pix_owner_document?: string | null
          pix_owner_name?: string | null
          singleton?: boolean
          stripe_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          accent_color: string
          brand_name: string
          brand_short: string
          button_hover_style: string | null
          button_radius: string | null
          contact_email: string | null
          contact_phone: string | null
          cta_primary: string
          cta_secondary: string
          description: string
          favicon_url: string | null
          font_color_base: string | null
          font_color_muted: string | null
          footer_text: string | null
          google_site_verification: string | null
          hero_button_bg_color: string | null
          hero_button_text_color: string | null
          hero_description_color: string | null
          hero_description_size: number | null
          hero_image_url: string | null
          hero_link_label: string | null
          hero_link_url: string | null
          hero_title_color: string | null
          hero_title_size: number | null
          hero_video_url: string | null
          id: string
          logo_url: string | null
          offer_badge: string | null
          plans_json: Json
          primary_color: string
          singleton: boolean
          tagline: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          accent_color?: string
          brand_name?: string
          brand_short?: string
          button_hover_style?: string | null
          button_radius?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cta_primary?: string
          cta_secondary?: string
          description?: string
          favicon_url?: string | null
          font_color_base?: string | null
          font_color_muted?: string | null
          footer_text?: string | null
          google_site_verification?: string | null
          hero_button_bg_color?: string | null
          hero_button_text_color?: string | null
          hero_description_color?: string | null
          hero_description_size?: number | null
          hero_image_url?: string | null
          hero_link_label?: string | null
          hero_link_url?: string | null
          hero_title_color?: string | null
          hero_title_size?: number | null
          hero_video_url?: string | null
          id?: string
          logo_url?: string | null
          offer_badge?: string | null
          plans_json?: Json
          primary_color?: string
          singleton?: boolean
          tagline?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          accent_color?: string
          brand_name?: string
          brand_short?: string
          button_hover_style?: string | null
          button_radius?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cta_primary?: string
          cta_secondary?: string
          description?: string
          favicon_url?: string | null
          font_color_base?: string | null
          font_color_muted?: string | null
          footer_text?: string | null
          google_site_verification?: string | null
          hero_button_bg_color?: string | null
          hero_button_text_color?: string | null
          hero_description_color?: string | null
          hero_description_size?: number | null
          hero_image_url?: string | null
          hero_link_label?: string | null
          hero_link_url?: string | null
          hero_title_color?: string | null
          hero_title_size?: number | null
          hero_video_url?: string | null
          id?: string
          logo_url?: string | null
          offer_badge?: string | null
          plans_json?: Json
          primary_color?: string
          singleton?: boolean
          tagline?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          blog_limit: number | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          subscription_plan:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          blog_limit?: number | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          blog_limit?: number | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          subscription_plan?:
            | Database["public"]["Enums"]["subscription_plan"]
            | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      publish_log: {
        Row: {
          article_id: string
          created_at: string
          error_message: string | null
          id: string
          platform: string
          published_url: string | null
          status: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          platform: string
          published_url?: string | null
          status?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          platform?: string
          published_url?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publish_log_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publish_log_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "public_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_notifications: {
        Row: {
          admin_note: string | null
          amount_cents: number
          buyer_email: string
          buyer_name: string | null
          buyer_phone: string | null
          created_at: string
          currency: string
          delivered_at: string | null
          id: string
          license_id: string | null
          metadata: Json | null
          mp_payment_id: string | null
          payment_method: string
          payment_reference: string | null
          plan: string
          proof_url: string | null
          read_at: string | null
          status: string
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amount_cents: number
          buyer_email: string
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          id?: string
          license_id?: string | null
          metadata?: Json | null
          mp_payment_id?: string | null
          payment_method: string
          payment_reference?: string | null
          plan: string
          proof_url?: string | null
          read_at?: string | null
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amount_cents?: number
          buyer_email?: string
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          currency?: string
          delivered_at?: string | null
          id?: string
          license_id?: string | null
          metadata?: Json | null
          mp_payment_id?: string | null
          payment_method?: string
          payment_reference?: string | null
          plan?: string
          proof_url?: string | null
          read_at?: string | null
          status?: string
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_notifications_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "license_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      social_follows: {
        Row: {
          created_at: string
          followed_at: string
          id: string
          platform: string
          status: string
          target_avatar: string | null
          target_external_id: string
          target_username: string | null
          unfollowed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          followed_at?: string
          id?: string
          platform?: string
          status?: string
          target_avatar?: string | null
          target_external_id: string
          target_username?: string | null
          unfollowed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          followed_at?: string
          id?: string
          platform?: string
          status?: string
          target_avatar?: string | null
          target_external_id?: string
          target_username?: string | null
          unfollowed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_interactions: {
        Row: {
          ai_response: string | null
          author_avatar: string | null
          author_name: string | null
          content: string
          created_at: string
          error_message: string | null
          external_id: string
          id: string
          interaction_type: string | null
          original_link: string | null
          page_avatar: string | null
          page_id: string
          platform: string
          processed_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_response?: string | null
          author_avatar?: string | null
          author_name?: string | null
          content: string
          created_at?: string
          error_message?: string | null
          external_id: string
          id?: string
          interaction_type?: string | null
          original_link?: string | null
          page_avatar?: string | null
          page_id: string
          platform: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_response?: string | null
          author_avatar?: string | null
          author_name?: string | null
          content?: string
          created_at?: string
          error_message?: string | null
          external_id?: string
          id?: string
          interaction_type?: string | null
          original_link?: string | null
          page_avatar?: string | null
          page_id?: string
          platform?: string
          processed_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_publications: {
        Row: {
          account_key: string
          account_name: string | null
          article_id: string | null
          caption: string | null
          created_at: string
          error_message: string | null
          id: string
          image_url: string | null
          link_url: string | null
          permalink: string | null
          platform: string
          published_at: string | null
          remote_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_key: string
          account_name?: string | null
          article_id?: string | null
          caption?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          permalink?: string | null
          platform: string
          published_at?: string | null
          remote_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_key?: string
          account_name?: string | null
          article_id?: string | null
          caption?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          permalink?: string | null
          platform?: string
          published_at?: string | null
          remote_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_publications_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_publications_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "public_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          license_id: string | null
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          license_id?: string | null
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          license_id?: string | null
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "license_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      threads_accounts: {
        Row: {
          access_token: string
          created_at: string
          disconnected_at: string | null
          id: string
          is_active: boolean
          scopes: string[]
          threads_user_id: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          access_token: string
          created_at?: string
          disconnected_at?: string | null
          id?: string
          is_active?: boolean
          scopes?: string[]
          threads_user_id: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string
          disconnected_at?: string | null
          id?: string
          is_active?: boolean
          scopes?: string[]
          threads_user_id?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      threads_oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          return_url: string | null
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          return_url?: string | null
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          return_url?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      trending_topics: {
        Row: {
          category: string
          context: string | null
          created_at: string
          fetched_at: string
          id: string
          related_queries: string[] | null
          search_volume: string | null
          source_name: string | null
          source_url: string | null
          topic: string
          update_count: number | null
          used: boolean | null
          user_id: string
        }
        Insert: {
          category: string
          context?: string | null
          created_at?: string
          fetched_at?: string
          id?: string
          related_queries?: string[] | null
          search_volume?: string | null
          source_name?: string | null
          source_url?: string | null
          topic: string
          update_count?: number | null
          used?: boolean | null
          user_id: string
        }
        Update: {
          category?: string
          context?: string | null
          created_at?: string
          fetched_at?: string
          id?: string
          related_queries?: string[] | null
          search_volume?: string | null
          source_name?: string | null
          source_url?: string | null
          topic?: string
          update_count?: number | null
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_blogs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          user_id: string
          wordpress_app_password: string
          wordpress_url: string
          wordpress_username: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          user_id: string
          wordpress_app_password: string
          wordpress_url: string
          wordpress_username: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
          wordpress_app_password?: string
          wordpress_url?: string
          wordpress_username?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          articles_per_day: number | null
          auto_publish: boolean | null
          automation_enabled: boolean | null
          azure_openai_api_key: string | null
          azure_openai_deployment_name: string | null
          azure_openai_endpoint: string | null
          azure_openai_model: string | null
          categories: string[] | null
          created_at: string
          dashboard_order: string[] | null
          dashboard_widgets: Json | null
          facebook_access_token: string | null
          facebook_ad_account_id: string | null
          facebook_page_id: string | null
          follower_growth_mode: boolean | null
          gemini_api_key: string | null
          gemini_model: string | null
          google_analytics_property_id: string | null
          google_indexing_key: string | null
          google_oauth_client_id: string | null
          google_oauth_secret_vault_id: string | null
          google_search_console_token: string | null
          groq_api_key: string | null
          groq_model: string | null
          id: string
          image_format: string
          image_knowledge_urls: string[]
          image_mode: string
          image_prompt: string | null
          image_prompt_template: string | null
          instagram_account_id: string | null
          instagram_automation_human_like: boolean | null
          instagram_follow_duration_max: number | null
          instagram_follow_duration_min: number | null
          instagram_follows_per_day_max: number | null
          instagram_follows_per_day_min: number | null
          interaction_mode: string | null
          last_trends_fetch: string | null
          linkedin_access_token: string | null
          linkedin_org_id: string | null
          metrics_refresh_interval: number | null
          openai_api_key: string | null
          openai_model: string | null
          priority_categories: string[]
          social_posting_mode: string
          social_reply_prompt: string | null
          trends_refresh_interval: number | null
          updated_at: string
          user_id: string
          wordpress_app_password: string | null
          wordpress_application_password: string | null
          wordpress_url: string | null
          wordpress_username: string | null
          writer_prompt: string | null
          youtube_api_key: string | null
        }
        Insert: {
          articles_per_day?: number | null
          auto_publish?: boolean | null
          automation_enabled?: boolean | null
          azure_openai_api_key?: string | null
          azure_openai_deployment_name?: string | null
          azure_openai_endpoint?: string | null
          azure_openai_model?: string | null
          categories?: string[] | null
          created_at?: string
          dashboard_order?: string[] | null
          dashboard_widgets?: Json | null
          facebook_access_token?: string | null
          facebook_ad_account_id?: string | null
          facebook_page_id?: string | null
          follower_growth_mode?: boolean | null
          gemini_api_key?: string | null
          gemini_model?: string | null
          google_analytics_property_id?: string | null
          google_indexing_key?: string | null
          google_oauth_client_id?: string | null
          google_oauth_secret_vault_id?: string | null
          google_search_console_token?: string | null
          groq_api_key?: string | null
          groq_model?: string | null
          id?: string
          image_format?: string
          image_knowledge_urls?: string[]
          image_mode?: string
          image_prompt?: string | null
          image_prompt_template?: string | null
          instagram_account_id?: string | null
          instagram_automation_human_like?: boolean | null
          instagram_follow_duration_max?: number | null
          instagram_follow_duration_min?: number | null
          instagram_follows_per_day_max?: number | null
          instagram_follows_per_day_min?: number | null
          interaction_mode?: string | null
          last_trends_fetch?: string | null
          linkedin_access_token?: string | null
          linkedin_org_id?: string | null
          metrics_refresh_interval?: number | null
          openai_api_key?: string | null
          openai_model?: string | null
          priority_categories?: string[]
          social_posting_mode?: string
          social_reply_prompt?: string | null
          trends_refresh_interval?: number | null
          updated_at?: string
          user_id: string
          wordpress_app_password?: string | null
          wordpress_application_password?: string | null
          wordpress_url?: string | null
          wordpress_username?: string | null
          writer_prompt?: string | null
          youtube_api_key?: string | null
        }
        Update: {
          articles_per_day?: number | null
          auto_publish?: boolean | null
          automation_enabled?: boolean | null
          azure_openai_api_key?: string | null
          azure_openai_deployment_name?: string | null
          azure_openai_endpoint?: string | null
          azure_openai_model?: string | null
          categories?: string[] | null
          created_at?: string
          dashboard_order?: string[] | null
          dashboard_widgets?: Json | null
          facebook_access_token?: string | null
          facebook_ad_account_id?: string | null
          facebook_page_id?: string | null
          follower_growth_mode?: boolean | null
          gemini_api_key?: string | null
          gemini_model?: string | null
          google_analytics_property_id?: string | null
          google_indexing_key?: string | null
          google_oauth_client_id?: string | null
          google_oauth_secret_vault_id?: string | null
          google_search_console_token?: string | null
          groq_api_key?: string | null
          groq_model?: string | null
          id?: string
          image_format?: string
          image_knowledge_urls?: string[]
          image_mode?: string
          image_prompt?: string | null
          image_prompt_template?: string | null
          instagram_account_id?: string | null
          instagram_automation_human_like?: boolean | null
          instagram_follow_duration_max?: number | null
          instagram_follow_duration_min?: number | null
          instagram_follows_per_day_max?: number | null
          instagram_follows_per_day_min?: number | null
          interaction_mode?: string | null
          last_trends_fetch?: string | null
          linkedin_access_token?: string | null
          linkedin_org_id?: string | null
          metrics_refresh_interval?: number | null
          openai_api_key?: string | null
          openai_model?: string | null
          priority_categories?: string[]
          social_posting_mode?: string
          social_reply_prompt?: string | null
          trends_refresh_interval?: number | null
          updated_at?: string
          user_id?: string
          wordpress_app_password?: string | null
          wordpress_application_password?: string | null
          wordpress_url?: string | null
          wordpress_username?: string | null
          writer_prompt?: string | null
          youtube_api_key?: string | null
        }
        Relationships: []
      }
      visitor_history: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          state: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      nexa_profiles_public: {
        Row: {
          avatar_url: string | null
          full_name: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          full_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
      payment_methods_public: {
        Row: {
          mercadopago_enabled: boolean | null
          mercadopago_public_key: string | null
          pagarme_enabled: boolean | null
          pix_bank: string | null
          pix_enabled: boolean | null
          pix_key: string | null
          pix_key_type: string | null
          pix_owner_name: string | null
        }
        Relationships: []
      }
      public_articles: {
        Row: {
          ai_provider: string | null
          author_id: string | null
          category: string | null
          content: string | null
          created_at: string | null
          excerpt: string | null
          featured_image_url: string | null
          focus_keyword: string | null
          id: string | null
          image_alt: string | null
          image_caption: string | null
          meta_description: string | null
          meta_title: string | null
          published_at: string | null
          scheduled_at: string | null
          seo_keyword: string | null
          seo_title: string | null
          slug: string | null
          status: string | null
          title: string | null
          trending_topic: string | null
          updated_at: string | null
          visual_elements: Json | null
          wordpress_post_id: string | null
        }
        Insert: {
          ai_provider?: string | null
          author_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          focus_keyword?: string | null
          id?: string | null
          image_alt?: string | null
          image_caption?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug?: string | null
          status?: string | null
          title?: string | null
          trending_topic?: string | null
          updated_at?: string | null
          visual_elements?: Json | null
          wordpress_post_id?: string | null
        }
        Update: {
          ai_provider?: string | null
          author_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured_image_url?: string | null
          focus_keyword?: string | null
          id?: string | null
          image_alt?: string | null
          image_caption?: string | null
          meta_description?: string | null
          meta_title?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          seo_keyword?: string | null
          seo_title?: string | null
          slug?: string | null
          status?: string | null
          title?: string | null
          trending_topic?: string | null
          updated_at?: string | null
          visual_elements?: Json | null
          wordpress_post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "public_authors"
            referencedColumns: ["id"]
          },
        ]
      }
      public_authors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          category: string | null
          created_at: string | null
          id: string | null
          name: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          category?: string | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_license_session: {
        Args: { p_ip: string; p_license_key: string; p_user_agent: string }
        Returns: Json
      }
      admin_confirm_pix_sale: {
        Args: { p_period_days?: number; p_sale_id: string }
        Returns: Json
      }
      attach_pix_proof: {
        Args: { p_proof_url: string; p_sale_id: string }
        Returns: Json
      }
      check_sale_status: {
        Args: { p_mp_payment_id?: string; p_stripe_session_id?: string }
        Returns: Json
      }
      clean_old_trending_topics: { Args: never; Returns: undefined }
      cleanup_expired_data: { Args: never; Returns: undefined }
      create_license_after_payment: {
        Args: {
          p_amount_cents: number
          p_buyer_email: string
          p_buyer_name: string
          p_buyer_phone: string
          p_currency: string
          p_mp_payment_id?: string
          p_payment_method: string
          p_period_days?: number
          p_plan: string
          p_stripe_session_id?: string
          p_stripe_subscription_id?: string
        }
        Returns: Json
      }
      create_pending_sale: {
        Args: {
          p_amount_cents: number
          p_buyer_email: string
          p_buyer_name: string
          p_buyer_phone: string
          p_metadata?: Json
          p_payment_method?: string
          p_plan: string
          p_reference?: string
        }
        Returns: string
      }
      decrypt_credential: {
        Args: { enc_key: string; val: string }
        Returns: string
      }
      disconnect_google_oauth_credentials: { Args: never; Returns: undefined }
      encrypt_credential: { Args: { val: string }; Returns: string }
      extend_license_by_subscription: {
        Args: { p_period_days?: number; p_stripe_subscription_id: string }
        Returns: undefined
      }
      generate_license_key: { Args: never; Returns: string }
      get_admin_profiles: {
        Args: never
        Returns: {
          blog_limit: number
          created_at: string
          email: string
          id: string
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
        }[]
      }
      get_credentials_status: { Args: never; Returns: Json }
      get_google_oauth_credentials_for_backend: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_google_oauth_credentials_status: { Args: never; Returns: Json }
      get_online_locations: {
        Args: { p_minutes: number }
        Returns: {
          city: string
          country: string
          id: string
          latitude: number
          longitude: number
          state: string
        }[]
      }
      get_public_payment_config: {
        Args: never
        Returns: {
          admin_notify_email: string
          mercadopago_enabled: boolean
          notify_admin_whatsapp_number: string
          pagarme_enabled: boolean
          pix_bank: string
          pix_enabled: boolean
          pix_key: string
          pix_key_type: string
          pix_owner_name: string
          stripe_enabled: boolean
        }[]
      }
      get_top_countries_history: {
        Args: { p_limit?: number }
        Returns: {
          count: number
          country: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_open_sale_folder: { Args: { p_name: string }; Returns: boolean }
      nexa_has_org_role: {
        Args: {
          _org_id: string
          _roles: Database["public"]["Enums"]["nexa_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      nexa_is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      nexa_is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      nexa_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      record_visitor_history: {
        Args: {
          p_city: string
          p_country: string
          p_latitude: number
          p_longitude: number
          p_state: string
          p_user_id: string
        }
        Returns: undefined
      }
      revoke_license_by_subscription: {
        Args: { p_stripe_subscription_id: string }
        Returns: undefined
      }
      save_google_oauth_credentials: {
        Args: { p_client_id: string; p_client_secret?: string }
        Returns: Json
      }
      update_online_status: {
        Args: {
          p_city: string
          p_country: string
          p_latitude: number
          p_longitude: number
          p_state: string
          p_user_id: string
        }
        Returns: undefined
      }
      validate_license_session: {
        Args: { p_session_token: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      nexa_org_status: "active" | "suspended" | "trial" | "cancelled"
      nexa_role:
        | "super_admin"
        | "org_admin"
        | "manager"
        | "supervisor"
        | "quality_analyst"
        | "agent"
        | "auditor"
      nexa_segment:
        | "sales"
        | "support"
        | "collections"
        | "finance"
        | "health"
        | "education"
        | "telecom"
        | "other"
      subscription_plan: "basico" | "avancado" | "enterprise"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      nexa_org_status: ["active", "suspended", "trial", "cancelled"],
      nexa_role: [
        "super_admin",
        "org_admin",
        "manager",
        "supervisor",
        "quality_analyst",
        "agent",
        "auditor",
      ],
      nexa_segment: [
        "sales",
        "support",
        "collections",
        "finance",
        "health",
        "education",
        "telecom",
        "other",
      ],
      subscription_plan: ["basico", "avancado", "enterprise"],
    },
  },
} as const
