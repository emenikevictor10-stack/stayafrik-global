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
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: []
      }
      bookings: {
        Row: {
          attention_reason: string | null
          check_in_date: string
          check_in_time: string | null
          check_out_date: string
          created_at: string
          guest_count: number | null
          guest_id: string
          id: string
          listing_code: string | null
          listing_id: string | null
          partner_address: string | null
          partner_city: string | null
          partner_image: string | null
          partner_title: string | null
          payment_reference: string | null
          rayprop_hold_expires_at: string | null
          rayprop_hold_id: string | null
          rayprop_listing_id: string | null
          rayprop_quote_id: string | null
          rayprop_quote_total_kobo: number | null
          rayprop_reservation_id: string | null
          released_at: string | null
          review_prompted_at: string | null
          source: string
          status: string
          total_price: number
          updated_at: string
        }
        Insert: {
          attention_reason?: string | null
          check_in_date: string
          check_in_time?: string | null
          check_out_date: string
          created_at?: string
          guest_count?: number | null
          guest_id: string
          id?: string
          listing_code?: string | null
          listing_id?: string | null
          partner_address?: string | null
          partner_city?: string | null
          partner_image?: string | null
          partner_title?: string | null
          payment_reference?: string | null
          rayprop_hold_expires_at?: string | null
          rayprop_hold_id?: string | null
          rayprop_listing_id?: string | null
          rayprop_quote_id?: string | null
          rayprop_quote_total_kobo?: number | null
          rayprop_reservation_id?: string | null
          released_at?: string | null
          review_prompted_at?: string | null
          source?: string
          status?: string
          total_price?: number
          updated_at?: string
        }
        Update: {
          attention_reason?: string | null
          check_in_date?: string
          check_in_time?: string | null
          check_out_date?: string
          created_at?: string
          guest_count?: number | null
          guest_id?: string
          id?: string
          listing_code?: string | null
          listing_id?: string | null
          partner_address?: string | null
          partner_city?: string | null
          partner_image?: string | null
          partner_title?: string | null
          payment_reference?: string | null
          rayprop_hold_expires_at?: string | null
          rayprop_hold_id?: string | null
          rayprop_listing_id?: string | null
          rayprop_quote_id?: string | null
          rayprop_quote_total_kobo?: number | null
          rayprop_reservation_id?: string | null
          released_at?: string | null
          review_prompted_at?: string | null
          source?: string
          status?: string
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      kyc_submissions: {
        Row: {
          created_at: string
          id: string
          id_image_url: string
          id_number: string
          id_type: string
          reviewed_at: string | null
          reviewer_notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_image_url: string
          id_number: string
          id_type: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          id_image_url?: string
          id_number?: string
          id_type?: string
          reviewed_at?: string | null
          reviewer_notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          address: string | null
          amenities: string[]
          area: string | null
          bathrooms: number
          bedrooms: number
          city: string | null
          city_id: string | null
          created_at: string
          description: string | null
          host_id: string
          id: string
          images: string[]
          is_available: boolean
          lat: number | null
          listing_code: string | null
          lng: number | null
          location: string | null
          location_confidence: number | null
          location_raw: string | null
          location_status: string
          location_suggestion_id: string | null
          neighborhood: string | null
          neighbourhood_id: string | null
          price_per_night: number
          rating: number
          reviews_count: number
          state: string | null
          state_id: string | null
          title: string
          type: string
          updated_at: string
          verified: boolean
          video_url: string | null
        }
        Insert: {
          address?: string | null
          amenities?: string[]
          area?: string | null
          bathrooms?: number
          bedrooms?: number
          city?: string | null
          city_id?: string | null
          created_at?: string
          description?: string | null
          host_id: string
          id?: string
          images?: string[]
          is_available?: boolean
          lat?: number | null
          listing_code?: string | null
          lng?: number | null
          location?: string | null
          location_confidence?: number | null
          location_raw?: string | null
          location_status?: string
          location_suggestion_id?: string | null
          neighborhood?: string | null
          neighbourhood_id?: string | null
          price_per_night?: number
          rating?: number
          reviews_count?: number
          state?: string | null
          state_id?: string | null
          title: string
          type?: string
          updated_at?: string
          verified?: boolean
          video_url?: string | null
        }
        Update: {
          address?: string | null
          amenities?: string[]
          area?: string | null
          bathrooms?: number
          bedrooms?: number
          city?: string | null
          city_id?: string | null
          created_at?: string
          description?: string | null
          host_id?: string
          id?: string
          images?: string[]
          is_available?: boolean
          lat?: number | null
          listing_code?: string | null
          lng?: number | null
          location?: string | null
          location_confidence?: number | null
          location_raw?: string | null
          location_status?: string
          location_suggestion_id?: string | null
          neighborhood?: string | null
          neighbourhood_id?: string | null
          price_per_night?: number
          rating?: number
          reviews_count?: number
          state?: string | null
          state_id?: string | null
          title?: string
          type?: string
          updated_at?: string
          verified?: boolean
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "listings_location_suggestion_id_fkey"
            columns: ["location_suggestion_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_neighbourhood_id_fkey"
            columns: ["neighbourhood_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          aliases: string[]
          created_at: string
          id: string
          is_active: boolean
          lat: number | null
          listing_count: number
          lng: number | null
          name: string
          parent_id: string | null
          slug: string
          type: string
        }
        Insert: {
          aliases?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          lat?: number | null
          listing_count?: number
          lng?: number | null
          name: string
          parent_id?: string | null
          slug: string
          type: string
        }
        Update: {
          aliases?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          lat?: number | null
          listing_count?: number
          lng?: number | null
          name?: string
          parent_id?: string | null
          slug?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          listing_id: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          listing_id?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          listing_id?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          attempts: number
          channel: string
          code_hash: string
          consumed: boolean
          created_at: string
          expires_at: string
          id: string
          identifier: string
          purpose: string
        }
        Insert: {
          attempts?: number
          channel: string
          code_hash: string
          consumed?: boolean
          created_at?: string
          expires_at: string
          id?: string
          identifier: string
          purpose?: string
        }
        Update: {
          attempts?: number
          channel?: string
          code_hash?: string
          consumed?: boolean
          created_at?: string
          expires_at?: string
          id?: string
          identifier?: string
          purpose?: string
        }
        Relationships: []
      }
      partner_location_map: {
        Row: {
          city_id: string | null
          confidence: number | null
          lat: number | null
          lng: number | null
          neighbourhood_id: string | null
          raw_address: string | null
          raw_city: string | null
          raw_neighbourhood: string | null
          raw_state: string | null
          rayprop_listing_id: string
          state_id: string | null
          status: string
          suggestion_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          city_id?: string | null
          confidence?: number | null
          lat?: number | null
          lng?: number | null
          neighbourhood_id?: string | null
          raw_address?: string | null
          raw_city?: string | null
          raw_neighbourhood?: string | null
          raw_state?: string | null
          rayprop_listing_id: string
          state_id?: string | null
          status?: string
          suggestion_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          city_id?: string | null
          confidence?: number | null
          lat?: number | null
          lng?: number | null
          neighbourhood_id?: string | null
          raw_address?: string | null
          raw_city?: string | null
          raw_neighbourhood?: string | null
          raw_state?: string | null
          rayprop_listing_id?: string
          state_id?: string | null
          status?: string
          suggestion_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_location_map_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_location_map_neighbourhood_id_fkey"
            columns: ["neighbourhood_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_location_map_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_location_map_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_number: string | null
          bank_code: string | null
          brand: string
          created_at: string
          exp_month: number | null
          exp_year: number | null
          holder_name: string | null
          id: string
          is_default: boolean
          last4: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          bank_code?: string | null
          brand: string
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          holder_name?: string | null
          id?: string
          is_default?: boolean
          last4: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          bank_code?: string | null
          brand?: string
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          holder_name?: string | null
          id?: string
          is_default?: boolean
          last4?: string
          user_id?: string
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          batch_id: string | null
          booking_id: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          host_id: string
          id: string
          payment_method_id: string | null
          paystack_transfer_code: string | null
          processed_at: string | null
          processed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          batch_id?: string | null
          booking_id?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          host_id: string
          id?: string
          payment_method_id?: string | null
          paystack_transfer_code?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          batch_id?: string | null
          booking_id?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          host_id?: string
          id?: string
          payment_method_id?: string | null
          paystack_transfer_code?: string | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string | null
          email_verified: boolean
          full_name: string | null
          id: string
          is_host: boolean
          phone: string | null
          phone_verified: boolean
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean
          full_name?: string | null
          id?: string
          is_host?: boolean
          phone?: string | null
          phone_verified?: boolean
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string | null
          email_verified?: boolean
          full_name?: string | null
          id?: string
          is_host?: boolean
          phone?: string | null
          phone_verified?: boolean
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      rayprop_events: {
        Row: {
          event_id: string
          event_type: string | null
          payload: Json | null
          received_at: string
          reservation_id: string | null
        }
        Insert: {
          event_id: string
          event_type?: string | null
          payload?: Json | null
          received_at?: string
          reservation_id?: string | null
        }
        Update: {
          event_id?: string
          event_type?: string | null
          payload?: Json | null
          received_at?: string
          reservation_id?: string | null
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          failure_reason: string | null
          id: string
          initiated_by: string
          paystack_reference: string | null
          reason: string | null
          status: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          initiated_by: string
          paystack_reference?: string | null
          reason?: string | null
          status?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          failure_reason?: string | null
          id?: string
          initiated_by?: string
          paystack_reference?: string | null
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          approved_at: string | null
          created_at: string
          expires_at: string | null
          guest_id: string
          host_id: string
          id: string
          listing_id: string
          note: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          visit_at: string | null
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          expires_at?: string | null
          guest_id: string
          host_id: string
          id?: string
          listing_id: string
          note?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          visit_at?: string | null
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          expires_at?: string | null
          guest_id?: string
          host_id?: string
          id?: string
          listing_id?: string
          note?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          visit_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string | null
          created_at: string
          guest_id: string
          hidden: boolean
          id: string
          listing_id: string
          rating: number
        }
        Insert: {
          booking_id: string
          comment?: string | null
          created_at?: string
          guest_id: string
          hidden?: boolean
          id?: string
          listing_id: string
          rating: number
        }
        Update: {
          booking_id?: string
          comment?: string | null
          created_at?: string
          guest_id?: string
          hidden?: boolean
          id?: string
          listing_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      support_issue_events: {
        Row: {
          author_id: string | null
          author_type: string
          body: string | null
          channel: string
          created_at: string
          id: string
          issue_id: string
          kind: string
          media: string[]
        }
        Insert: {
          author_id?: string | null
          author_type: string
          body?: string | null
          channel?: string
          created_at?: string
          id?: string
          issue_id: string
          kind: string
          media?: string[]
        }
        Update: {
          author_id?: string | null
          author_type?: string
          body?: string | null
          channel?: string
          created_at?: string
          id?: string
          issue_id?: string
          kind?: string
          media?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "support_issue_events_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "support_issues"
            referencedColumns: ["id"]
          },
        ]
      }
      support_issues: {
        Row: {
          asked_fixed_at: string | null
          booking_id: string
          category: string
          closed_at: string | null
          created_at: string
          first_reply_at: string | null
          id: string
          last_guest_message_at: string | null
          media: string[]
          note: string
          owner_id: string | null
          rating: number | null
          ref: string
          reopened_count: number
          reply_due_at: string
          status: string
          updated_at: string
          urgent: boolean
          user_id: string
        }
        Insert: {
          asked_fixed_at?: string | null
          booking_id: string
          category: string
          closed_at?: string | null
          created_at?: string
          first_reply_at?: string | null
          id?: string
          last_guest_message_at?: string | null
          media?: string[]
          note: string
          owner_id?: string | null
          rating?: number | null
          ref: string
          reopened_count?: number
          reply_due_at: string
          status?: string
          updated_at?: string
          urgent?: boolean
          user_id: string
        }
        Update: {
          asked_fixed_at?: string | null
          booking_id?: string
          category?: string
          closed_at?: string | null
          created_at?: string
          first_reply_at?: string | null
          id?: string
          last_guest_message_at?: string | null
          media?: string[]
          note?: string
          owner_id?: string | null
          rating?: number | null
          ref?: string
          reopened_count?: number
          reply_due_at?: string
          status?: string
          updated_at?: string
          urgent?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_issues_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_release_due_bookings: { Args: never; Returns: number }
      create_support_issue: {
        Args: {
          _booking_id: string
          _category: string
          _media?: string[]
          _note: string
          _urgent: boolean
        }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      expire_reservations: { Args: never; Returns: number }
      generate_listing_code: { Args: never; Returns: string }
      get_public_profiles: {
        Args: { _user_ids: string[] }
        Returns: {
          avatar_url: string
          full_name: string
          is_host: boolean
          user_id: string
          whatsapp: string
        }[]
      }
      guest_issue_action: {
        Args: {
          _action: string
          _body?: string
          _issue_id: string
          _media?: string[]
          _value?: number
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      listing_booked_ranges: {
        Args: { _listing_id: string }
        Returns: {
          check_in: string
          check_out: string
        }[]
      }
      loc_norm: { Args: { t: string }; Returns: string }
      location_audit_summary: { Args: never; Returns: Json }
      location_chain: {
        Args: { _id: string }
        Returns: {
          city_id: string
          neighbourhood_id: string
          state_id: string
        }[]
      }
      location_merge_report: {
        Args: never
        Returns: {
          breadcrumb: string
          listings: number
          location_id: string
          location_name: string
          variants: string[]
        }[]
      }
      match_location: {
        Args: {
          _address: string
          _city: string
          _lat: number
          _lng: number
          _neigh: string
          _state: string
        }
        Returns: {
          city_id: string
          confidence: number
          neighbourhood_id: string
          state_id: string
          status: string
          suggestion_id: string
        }[]
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      notify_admins: {
        Args: { _body: string; _link: string; _title: string }
        Returns: undefined
      }
      popular_locations: {
        Args: { _limit?: number }
        Returns: {
          breadcrumb: string
          id: string
          listing_count: number
          name: string
          slug: string
          type: string
        }[]
      }
      queue_review_prompts: { Args: never; Returns: number }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refresh_location_counts: { Args: never; Returns: undefined }
      retag_local_listings: { Args: never; Returns: number }
      search_locations: {
        Args: { _include_empty?: boolean; _limit?: number; q: string }
        Returns: {
          breadcrumb: string
          id: string
          listing_count: number
          name: string
          rank: number
          slug: string
          type: string
        }[]
      }
      search_stays: {
        Args: { _limit?: number; q: string }
        Returns: {
          id: string
          kind: string
          subtitle: string
          title: string
        }[]
      }
      send_alert_email: {
        Args: {
          _body: string
          _heading: string
          _link: string
          _subject: string
          _user_id: string
        }
        Returns: undefined
      }
      set_listing_location: {
        Args: { _id: string; _kind: string; _location_id: string }
        Returns: undefined
      }
      staff_issue_action: {
        Args: {
          _action: string
          _body?: string
          _issue_id: string
          _status?: string
        }
        Returns: undefined
      }
      tag_partner_locations: {
        Args: { _force?: boolean; _rows: Json }
        Returns: number
      }
    }
    Enums: {
      app_role: "client" | "agent" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["client", "agent", "admin"],
    },
  },
} as const
