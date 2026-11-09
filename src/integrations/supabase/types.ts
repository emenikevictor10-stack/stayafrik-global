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
      addon_orders: {
        Row: {
          addon_id: string
          addon_name: string
          amount_kobo: number
          arranged_at: string | null
          arranged_by: string | null
          booking_id: string
          created_at: string
          guest_id: string
          id: string
          note: string | null
          paid_at: string | null
          pay_method: string | null
          qty: number
          reference: string | null
          staff_note: string | null
          status: string
        }
        Insert: {
          addon_id: string
          addon_name: string
          amount_kobo: number
          arranged_at?: string | null
          arranged_by?: string | null
          booking_id: string
          created_at?: string
          guest_id: string
          id?: string
          note?: string | null
          paid_at?: string | null
          pay_method?: string | null
          qty: number
          reference?: string | null
          staff_note?: string | null
          status?: string
        }
        Update: {
          addon_id?: string
          addon_name?: string
          amount_kobo?: number
          arranged_at?: string | null
          arranged_by?: string | null
          booking_id?: string
          created_at?: string
          guest_id?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          pay_method?: string | null
          qty?: number
          reference?: string | null
          staff_note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_orders_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addon_orders_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      addons: {
        Row: {
          active: boolean
          city_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          price_kobo: number
          sort: number
          unit: string
        }
        Insert: {
          active?: boolean
          city_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price_kobo: number
          sort?: number
          unit?: string
        }
        Update: {
          active?: boolean
          city_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price_kobo?: number
          sort?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "addons_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      app_settings: {
        Row: {
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json | null
        }
        Insert: {
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
        }
        Update: {
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      bank_transfers: {
        Row: {
          amount_kobo: number
          booking_id: string | null
          check_in: string | null
          check_out: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          expires_at: string
          guest_id: string
          id: string
          meta: Json
          receipt_path: string | null
          reference: string
          reject_reason: string | null
          sender_name: string | null
          source: string
          status: string
          submitted_at: string | null
          title: string | null
        }
        Insert: {
          amount_kobo: number
          booking_id?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          expires_at: string
          guest_id: string
          id?: string
          meta?: Json
          receipt_path?: string | null
          reference: string
          reject_reason?: string | null
          sender_name?: string | null
          source?: string
          status?: string
          submitted_at?: string | null
          title?: string | null
        }
        Update: {
          amount_kobo?: number
          booking_id?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          expires_at?: string
          guest_id?: string
          id?: string
          meta?: Json
          receipt_path?: string | null
          reference?: string
          reject_reason?: string | null
          sender_name?: string | null
          source?: string
          status?: string
          submitted_at?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transfers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_change_requests: {
        Row: {
          booking_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          guest_id: string
          id: string
          new_check_in: string
          new_check_out: string
          note: string | null
          staff_note: string | null
          status: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          guest_id: string
          id?: string
          new_check_in: string
          new_check_out: string
          note?: string | null
          staff_note?: string | null
          status?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          guest_id?: string
          id?: string
          new_check_in?: string
          new_check_out?: string
          note?: string | null
          staff_note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_change_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_events: {
        Row: {
          actor: string
          actor_id: string | null
          booking_id: string
          created_at: string
          data: Json
          id: string
          type: string
        }
        Insert: {
          actor?: string
          actor_id?: string | null
          booking_id: string
          created_at?: string
          data?: Json
          id?: string
          type: string
        }
        Update: {
          actor?: string
          actor_id?: string | null
          booking_id?: string
          created_at?: string
          data?: Json
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          attention_reason: string | null
          cancelled_at: string | null
          cancelled_reason: string | null
          check_in_date: string
          check_in_time: string | null
          check_out_date: string
          cleaning_fee_kobo: number | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          discount_kobo: number | null
          fee_kobo: number | null
          guest_count: number | null
          guest_id: string
          hold_expires_at: string | null
          host_id: string | null
          host_payout_kobo: number | null
          host_respond_by: string | null
          id: string
          is_split: boolean
          listing_code: string | null
          listing_id: string | null
          markup_kobo: number | null
          nightly_breakdown: Json | null
          paid_at: string | null
          partner_address: string | null
          partner_city: string | null
          partner_image: string | null
          partner_title: string | null
          payment_expires_at: string | null
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
          subtotal_kobo: number | null
          total_price: number
          updated_at: string
        }
        Insert: {
          attention_reason?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          check_in_date: string
          check_in_time?: string | null
          check_out_date: string
          cleaning_fee_kobo?: number | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          discount_kobo?: number | null
          fee_kobo?: number | null
          guest_count?: number | null
          guest_id: string
          hold_expires_at?: string | null
          host_id?: string | null
          host_payout_kobo?: number | null
          host_respond_by?: string | null
          id?: string
          is_split?: boolean
          listing_code?: string | null
          listing_id?: string | null
          markup_kobo?: number | null
          nightly_breakdown?: Json | null
          paid_at?: string | null
          partner_address?: string | null
          partner_city?: string | null
          partner_image?: string | null
          partner_title?: string | null
          payment_expires_at?: string | null
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
          subtotal_kobo?: number | null
          total_price?: number
          updated_at?: string
        }
        Update: {
          attention_reason?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          check_in_date?: string
          check_in_time?: string | null
          check_out_date?: string
          cleaning_fee_kobo?: number | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          discount_kobo?: number | null
          fee_kobo?: number | null
          guest_count?: number | null
          guest_id?: string
          hold_expires_at?: string | null
          host_id?: string | null
          host_payout_kobo?: number | null
          host_respond_by?: string | null
          id?: string
          is_split?: boolean
          listing_code?: string | null
          listing_id?: string | null
          markup_kobo?: number | null
          nightly_breakdown?: Json | null
          paid_at?: string | null
          partner_address?: string | null
          partner_city?: string | null
          partner_image?: string | null
          partner_title?: string | null
          payment_expires_at?: string | null
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
          subtotal_kobo?: number | null
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
      help_guides: {
        Row: {
          body: string[]
          created_at: string
          id: string
          published: boolean
          slug: string
          sort: number
          summary: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string[]
          created_at?: string
          id?: string
          published?: boolean
          slug: string
          sort?: number
          summary?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string[]
          created_at?: string
          id?: string
          published?: boolean
          slug?: string
          sort?: number
          summary?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      host_status: {
        Row: {
          host_id: string
          paused_listing_ids: string[]
          reason: string | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          host_id: string
          paused_listing_ids?: string[]
          reason?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          host_id?: string
          paused_listing_ids?: string[]
          reason?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          billed_email: string | null
          billed_name: string | null
          booking_id: string
          company_name: string | null
          guest_id: string
          id: string
          issued_at: string
          kind: string
          lines: Json
          number: string
          tax_id: string | null
        }
        Insert: {
          amount: number
          billed_email?: string | null
          billed_name?: string | null
          booking_id: string
          company_name?: string | null
          guest_id: string
          id?: string
          issued_at?: string
          kind: string
          lines?: Json
          number: string
          tax_id?: string | null
        }
        Update: {
          amount?: number
          billed_email?: string | null
          billed_name?: string | null
          booking_id?: string
          company_name?: string | null
          guest_id?: string
          id?: string
          issued_at?: string
          kind?: string
          lines?: Json
          number?: string
          tax_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_submissions: {
        Row: {
          country: string | null
          created_at: string
          full_name: string | null
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
          country?: string | null
          created_at?: string
          full_name?: string | null
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
          country?: string | null
          created_at?: string
          full_name?: string | null
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
      listing_blocks: {
        Row: {
          created_at: string
          end_date: string
          id: string
          listing_id: string
          note: string | null
          source: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          listing_id: string
          note?: string | null
          source?: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          listing_id?: string
          note?: string | null
          source?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_blocks_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_date_prices: {
        Row: {
          date: string
          listing_id: string
          price: number
        }
        Insert: {
          date: string
          listing_id: string
          price: number
        }
        Update: {
          date?: string
          listing_id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "listing_date_prices_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_private: {
        Row: {
          access_instructions: string | null
          listing_id: string
          updated_at: string
        }
        Insert: {
          access_instructions?: string | null
          listing_id: string
          updated_at?: string
        }
        Update: {
          access_instructions?: string | null
          listing_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_private_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          address: string | null
          amenities: string[]
          area: string | null
          bathrooms: number
          bedrooms: number
          booking_mode: string
          city: string | null
          city_id: string | null
          cleaning_fee: number
          created_at: string
          description: string | null
          host_id: string
          ical_error: string | null
          ical_synced_at: string | null
          ical_url: string | null
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
          max_nights: number | null
          min_nights: number
          monthly_discount_pct: number
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
          weekend_price: number | null
          weekly_discount_pct: number
        }
        Insert: {
          address?: string | null
          amenities?: string[]
          area?: string | null
          bathrooms?: number
          bedrooms?: number
          booking_mode?: string
          city?: string | null
          city_id?: string | null
          cleaning_fee?: number
          created_at?: string
          description?: string | null
          host_id: string
          ical_error?: string | null
          ical_synced_at?: string | null
          ical_url?: string | null
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
          max_nights?: number | null
          min_nights?: number
          monthly_discount_pct?: number
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
          weekend_price?: number | null
          weekly_discount_pct?: number
        }
        Update: {
          address?: string | null
          amenities?: string[]
          area?: string | null
          bathrooms?: number
          bedrooms?: number
          booking_mode?: string
          city?: string | null
          city_id?: string | null
          cleaning_fee?: number
          created_at?: string
          description?: string | null
          host_id?: string
          ical_error?: string | null
          ical_synced_at?: string | null
          ical_url?: string | null
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
          max_nights?: number | null
          min_nights?: number
          monthly_discount_pct?: number
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
          weekend_price?: number | null
          weekly_discount_pct?: number
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
          geo_status: string | null
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
          geo_status?: string | null
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
          geo_status?: string | null
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
      partner_catalogue: {
        Row: {
          rayprop_listing_id: string
          record: Json
          refreshed_at: string
        }
        Insert: {
          rayprop_listing_id: string
          record: Json
          refreshed_at?: string
        }
        Update: {
          rayprop_listing_id?: string
          record?: Json
          refreshed_at?: string
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
      partner_sync_state: {
        Row: {
          blocked_reason: string | null
          blocked_until: string | null
          id: number
          last_full_refresh_at: string | null
          updated_at: string
        }
        Insert: {
          blocked_reason?: string | null
          blocked_until?: string | null
          id?: number
          last_full_refresh_at?: string | null
          updated_at?: string
        }
        Update: {
          blocked_reason?: string | null
          blocked_until?: string | null
          id?: number
          last_full_refresh_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          account_name: string | null
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
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          account_name?: string | null
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
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          account_name?: string | null
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
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      payment_shares: {
        Row: {
          amount_kobo: number
          booking_id: string
          created_at: string
          email: string | null
          id: string
          label: string | null
          last_reminded_at: string | null
          name: string | null
          paid_at: string | null
          pay_method: string | null
          payer_user_id: string | null
          phone: string | null
          reference: string | null
          refunded_at: string | null
          reminder_count: number
          removed_at: string | null
          share_no: number
          status: string
          token: string
        }
        Insert: {
          amount_kobo: number
          booking_id: string
          created_at?: string
          email?: string | null
          id?: string
          label?: string | null
          last_reminded_at?: string | null
          name?: string | null
          paid_at?: string | null
          pay_method?: string | null
          payer_user_id?: string | null
          phone?: string | null
          reference?: string | null
          refunded_at?: string | null
          reminder_count?: number
          removed_at?: string | null
          share_no: number
          status?: string
          token: string
        }
        Update: {
          amount_kobo?: number
          booking_id?: string
          created_at?: string
          email?: string | null
          id?: string
          label?: string | null
          last_reminded_at?: string | null
          name?: string | null
          paid_at?: string | null
          pay_method?: string | null
          payer_user_id?: string | null
          phone?: string | null
          reference?: string | null
          refunded_at?: string | null
          reminder_count?: number
          removed_at?: string | null
          share_no?: number
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_shares_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          batch_id: string | null
          booking_id: string | null
          created_at: string
          currency: string
          due_at: string | null
          failure_reason: string | null
          held_at: string | null
          hold_reason: string | null
          host_id: string
          id: string
          paid_reference: string | null
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
          due_at?: string | null
          failure_reason?: string | null
          held_at?: string | null
          hold_reason?: string | null
          host_id: string
          id?: string
          paid_reference?: string | null
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
          due_at?: string | null
          failure_reason?: string | null
          held_at?: string | null
          hold_reason?: string | null
          host_id?: string
          id?: string
          paid_reference?: string | null
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
      review_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          review_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          review_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          review_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: true
            referencedRelation: "reviews"
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
          tags: string[]
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
          tags?: string[]
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
          tags?: string[]
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
          credit_naira: number | null
          credit_reason: string | null
          first_reply_at: string | null
          id: string
          last_guest_message_at: string | null
          media: string[]
          note: string
          overdue_alerted_at: string | null
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
          credit_naira?: number | null
          credit_reason?: string | null
          first_reply_at?: string | null
          id?: string
          last_guest_message_at?: string | null
          media?: string[]
          note: string
          overdue_alerted_at?: string | null
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
          credit_naira?: number | null
          credit_reason?: string | null
          first_reply_at?: string | null
          id?: string
          last_guest_message_at?: string | null
          media?: string[]
          note?: string
          overdue_alerted_at?: string | null
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
      team_invites: {
        Row: {
          accepted_at: string | null
          accepted_user_id: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          roles: Database["public"]["Enums"]["app_role"][]
          status: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
          roles: Database["public"]["Enums"]["app_role"][]
          status?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_user_id?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          roles?: Database["public"]["Enums"]["app_role"][]
          status?: string
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
      user_status: {
        Row: {
          blocked_at: string | null
          blocked_reason: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          blocked_at?: string | null
          blocked_reason?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          blocked_at?: string | null
          blocked_reason?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          added_at: string
          listing_ref: string
          wishlist_id: string
        }
        Insert: {
          added_at?: string
          listing_ref: string
          wishlist_id: string
        }
        Update: {
          added_at?: string
          listing_ref?: string
          wishlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_members: {
        Row: {
          joined_at: string
          user_id: string
          wishlist_id: string
        }
        Insert: {
          joined_at?: string
          user_id: string
          wishlist_id: string
        }
        Update: {
          joined_at?: string
          user_id?: string
          wishlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_members_wishlist_id_fkey"
            columns: ["wishlist_id"]
            isOneToOne: false
            referencedRelation: "wishlists"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          share_token: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          share_token?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          share_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_team_invites: { Args: never; Returns: number }
      admin_health: { Args: never; Returns: Json }
      admin_insights: { Args: { _from: string; _to: string }; Returns: Json }
      auto_release_due_bookings: { Args: never; Returns: number }
      booking_actor: { Args: never; Returns: string }
      booking_lifecycle_tick: { Args: never; Returns: Json }
      booking_reminders_tick: { Args: never; Returns: Json }
      confirm_addon_payment: {
        Args: { _amount_kobo: number; _reference: string }
        Returns: {
          addon_id: string
          addon_name: string
          amount_kobo: number
          arranged_at: string | null
          arranged_by: string | null
          booking_id: string
          created_at: string
          guest_id: string
          id: string
          note: string | null
          paid_at: string | null
          pay_method: string | null
          qty: number
          reference: string | null
          staff_note: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "addon_orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_local_payment: {
        Args: { _amount_kobo: number; _reference: string }
        Returns: {
          attention_reason: string | null
          cancelled_at: string | null
          cancelled_reason: string | null
          check_in_date: string
          check_in_time: string | null
          check_out_date: string
          cleaning_fee_kobo: number | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          discount_kobo: number | null
          fee_kobo: number | null
          guest_count: number | null
          guest_id: string
          hold_expires_at: string | null
          host_id: string | null
          host_payout_kobo: number | null
          host_respond_by: string | null
          id: string
          is_split: boolean
          listing_code: string | null
          listing_id: string | null
          markup_kobo: number | null
          nightly_breakdown: Json | null
          paid_at: string | null
          partner_address: string | null
          partner_city: string | null
          partner_image: string | null
          partner_title: string | null
          payment_expires_at: string | null
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
          subtotal_kobo: number | null
          total_price: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
      expire_stale_holds: { Args: { _listing_id: string }; Returns: number }
      find_booking: {
        Args: { _email: string; _reference: string }
        Returns: {
          check_in: string
          check_out: string
          city: string
          listing_code: string
          status: string
          title: string
        }[]
      }
      generate_listing_code: { Args: never; Returns: string }
      get_payment_share: {
        Args: { _token: string }
        Returns: {
          amount_kobo: number
          booking_id: string
          booking_status: string
          check_in: string
          check_out: string
          city: string
          expires_at: string
          lead_first_name: string
          share_id: string
          shares_paid: number
          shares_total: number
          status: string
          title: string
        }[]
      }
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
      get_shared_wishlist: {
        Args: { _token: string }
        Returns: {
          listing_refs: string[]
          name: string
        }[]
      }
      guest_addon_cancel: { Args: { _order_id: string }; Returns: string }
      guest_confirm_checkin: {
        Args: { _booking_id: string }
        Returns: undefined
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
      host_booking_action: {
        Args: { _action: string; _booking_id: string; _reason?: string }
        Returns: undefined
      }
      host_booking_guests: {
        Args: { _booking_ids: string[] }
        Returns: {
          booking_id: string
          guest_name: string
          guest_phone: string
        }[]
      }
      issue_invoice: {
        Args: { _booking_id: string; _company: string; _tax_id: string }
        Returns: {
          amount: number
          billed_email: string | null
          billed_name: string | null
          booking_id: string
          company_name: string | null
          guest_id: string
          id: string
          issued_at: string
          kind: string
          lines: Json
          number: string
          tax_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "invoices"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      join_wishlist: { Args: { _token: string }; Returns: string }
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
      log_booking_event: {
        Args: {
          _actor: string
          _booking_id: string
          _data?: Json
          _type: string
        }
        Returns: undefined
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
      payout_block_reason: { Args: { _host: string }; Returns: string }
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
      record_share_payment: {
        Args: { _amount_kobo: number; _payer: string; _reference: string }
        Returns: {
          attention_reason: string | null
          cancelled_at: string | null
          cancelled_reason: string | null
          check_in_date: string
          check_in_time: string | null
          check_out_date: string
          cleaning_fee_kobo: number | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          discount_kobo: number | null
          fee_kobo: number | null
          guest_count: number | null
          guest_id: string
          hold_expires_at: string | null
          host_id: string | null
          host_payout_kobo: number | null
          host_respond_by: string | null
          id: string
          is_split: boolean
          listing_code: string | null
          listing_id: string | null
          markup_kobo: number | null
          nightly_breakdown: Json | null
          paid_at: string | null
          partner_address: string | null
          partner_city: string | null
          partner_image: string | null
          partner_title: string | null
          payment_expires_at: string | null
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
          subtotal_kobo: number | null
          total_price: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
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
      send_email_to: {
        Args: {
          _body: string
          _heading: string
          _link: string
          _subject: string
          _to: string
        }
        Returns: undefined
      }
      set_listing_location: {
        Args: { _id: string; _kind: string; _location_id: string }
        Returns: undefined
      }
      setting_int: { Args: { _default: number; _key: string }; Returns: number }
      split_reminders_tick: { Args: never; Returns: number }
      split_share_action: {
        Args: { _action: string; _share_id: string }
        Returns: undefined
      }
      staff_addon_action: {
        Args: { _action: string; _note: string; _order_id: string }
        Returns: undefined
      }
      staff_bank_transfer_action: {
        Args: { _action: string; _id: string; _reason: string }
        Returns: undefined
      }
      staff_booking_action: {
        Args: { _action: string; _booking_id: string; _note?: string }
        Returns: undefined
      }
      staff_change_request_action: {
        Args: { _action: string; _id: string; _note: string }
        Returns: undefined
      }
      staff_host_action: {
        Args: { _action: string; _host_id: string; _reason?: string }
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
      staff_kyc_action: {
        Args: { _action: string; _id: string; _reason: string }
        Returns: undefined
      }
      staff_offer_credit: {
        Args: { _amount: number; _issue_id: string; _reason: string }
        Returns: undefined
      }
      staff_payout_action: {
        Args: {
          _action: string
          _payout_id: string
          _reason?: string
          _reference?: string
        }
        Returns: undefined
      }
      staff_review_reply: {
        Args: { _body: string; _review_id: string }
        Returns: undefined
      }
      staff_team_cancel_invite: { Args: { _id: string }; Returns: undefined }
      staff_team_invite: {
        Args: {
          _email: string
          _roles: Database["public"]["Enums"]["app_role"][]
        }
        Returns: string
      }
      staff_team_list: {
        Args: never
        Returns: {
          email: string
          full_name: string
          roles: Database["public"]["Enums"]["app_role"][]
          since: string
          user_id: string
        }[]
      }
      staff_team_remove: { Args: { _user_id: string }; Returns: undefined }
      staff_team_resend_invite: { Args: { _id: string }; Returns: undefined }
      staff_team_set_roles: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: undefined
      }
      staff_user_action: {
        Args: { _action: string; _reason: string; _user_id: string }
        Returns: undefined
      }
      stay_area_points: {
        Args: { _local_ids: string[]; _partner_ids: string[] }
        Returns: {
          lat: number
          level: string
          lng: number
          stay_id: string
        }[]
      }
      submit_bank_transfer: {
        Args: { _id: string; _receipt_path: string; _sender: string }
        Returns: undefined
      }
      submit_guest_id: {
        Args: {
          _country: string
          _full_name: string
          _number: string
          _path: string
          _type: string
        }
        Returns: string
      }
      support_issue_tick: { Args: never; Returns: Json }
      tag_partner_locations: {
        Args: { _force?: boolean; _rows: Json }
        Returns: number
      }
      trip_access: { Args: { _booking_id: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "client"
        | "agent"
        | "admin"
        | "support"
        | "finance"
        | "listings"
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
      app_role: ["client", "agent", "admin", "support", "finance", "listings"],
    },
  },
} as const
