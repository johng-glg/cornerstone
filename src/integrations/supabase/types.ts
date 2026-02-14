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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      appearance_requests: {
        Row: {
          appearance_date: string
          assigned_to: string | null
          court_name: string | null
          created_at: string
          description: string
          hearing_id: string | null
          id: string
          matter_id: string
          notes: string | null
          requested_by: string | null
          requested_date: string
          status: Database["public"]["Enums"]["appearance_request_status"]
          updated_at: string
        }
        Insert: {
          appearance_date: string
          assigned_to?: string | null
          court_name?: string | null
          created_at?: string
          description: string
          hearing_id?: string | null
          id?: string
          matter_id: string
          notes?: string | null
          requested_by?: string | null
          requested_date?: string
          status?: Database["public"]["Enums"]["appearance_request_status"]
          updated_at?: string
        }
        Update: {
          appearance_date?: string
          assigned_to?: string | null
          court_name?: string | null
          created_at?: string
          description?: string
          hearing_id?: string | null
          id?: string
          matter_id?: string
          notes?: string | null
          requested_by?: string | null
          requested_date?: string
          status?: Database["public"]["Enums"]["appearance_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appearance_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearance_requests_hearing_id_fkey"
            columns: ["hearing_id"]
            isOneToOne: false
            referencedRelation: "litigation_hearings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearance_requests_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "litigation_matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appearance_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          assigned_date: string
          assignment_type: Database["public"]["Enums"]["assignment_type"]
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id: string
          is_active: boolean
          staff_id: string
          unassigned_date: string | null
        }
        Insert: {
          assigned_date?: string
          assignment_type: Database["public"]["Enums"]["assignment_type"]
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["entity_type"]
          id?: string
          is_active?: boolean
          staff_id: string
          unassigned_date?: string | null
        }
        Update: {
          assigned_date?: string
          assignment_type?: Database["public"]["Enums"]["assignment_type"]
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["entity_type"]
          id?: string
          is_active?: boolean
          staff_id?: string
          unassigned_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_entries: {
        Row: {
          billing_date: string
          client_id: string | null
          client_service_id: string | null
          company_id: string
          created_at: string
          description: string
          duration_minutes: number | null
          entry_type: Database["public"]["Enums"]["billing_entry_type"]
          expense_amount: number | null
          hourly_rate: number | null
          id: string
          is_billable: boolean
          litigation_matter_id: string | null
          notes: string | null
          staff_id: string
          status: Database["public"]["Enums"]["billing_entry_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          billing_date?: string
          client_id?: string | null
          client_service_id?: string | null
          company_id: string
          created_at?: string
          description: string
          duration_minutes?: number | null
          entry_type: Database["public"]["Enums"]["billing_entry_type"]
          expense_amount?: number | null
          hourly_rate?: number | null
          id?: string
          is_billable?: boolean
          litigation_matter_id?: string | null
          notes?: string | null
          staff_id: string
          status?: Database["public"]["Enums"]["billing_entry_status"]
          total_amount: number
          updated_at?: string
        }
        Update: {
          billing_date?: string
          client_id?: string | null
          client_service_id?: string | null
          company_id?: string
          created_at?: string
          description?: string
          duration_minutes?: number | null
          entry_type?: Database["public"]["Enums"]["billing_entry_type"]
          expense_amount?: number | null
          hourly_rate?: number | null
          id?: string
          is_billable?: boolean
          litigation_matter_id?: string | null
          notes?: string | null
          staff_id?: string
          status?: Database["public"]["Enums"]["billing_entry_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_entries_client_service_id_fkey"
            columns: ["client_service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_entries_litigation_matter_id_fkey"
            columns: ["litigation_matter_id"]
            isOneToOne: false
            referencedRelation: "litigation_matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      client_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          address_type: Database["public"]["Enums"]["address_type"]
          city: string
          client_id: string
          created_at: string
          id: string
          is_active: boolean
          is_primary: boolean
          state: string
          zip_code: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          address_type?: Database["public"]["Enums"]["address_type"]
          city: string
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          state: string
          zip_code: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          address_type?: Database["public"]["Enums"]["address_type"]
          city?: string
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          state?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_addresses_contact_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_communications: {
        Row: {
          client_id: string
          communication_date: string
          communication_type: Database["public"]["Enums"]["communication_type"]
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          direction: Database["public"]["Enums"]["communication_direction"]
          duration_minutes: number | null
          id: string
          notes: string | null
          outcome: string | null
          staff_id: string | null
          subject: string | null
        }
        Insert: {
          client_id: string
          communication_date?: string
          communication_type?: Database["public"]["Enums"]["communication_type"]
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["communication_direction"]
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          outcome?: string | null
          staff_id?: string | null
          subject?: string | null
        }
        Update: {
          client_id?: string
          communication_date?: string
          communication_type?: Database["public"]["Enums"]["communication_type"]
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          direction?: Database["public"]["Enums"]["communication_direction"]
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          outcome?: string | null
          staff_id?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_communications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_communications_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      client_documents: {
        Row: {
          client_id: string
          created_at: string
          document_type: string
          file_url: string
          id: string
          notes: string | null
          title: string
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          document_type?: string
          file_url: string
          id?: string
          notes?: string | null
          title: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          document_type?: string
          file_url?: string
          id?: string
          notes?: string | null
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      client_phones: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_active: boolean
          is_primary: boolean
          phone_number: string
          phone_type: Database["public"]["Enums"]["phone_type"]
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          phone_number: string
          phone_type?: Database["public"]["Enums"]["phone_type"]
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          phone_number?: string
          phone_type?: Database["public"]["Enums"]["phone_type"]
        }
        Relationships: [
          {
            foreignKeyName: "contact_phones_contact_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_service_clients: {
        Row: {
          client_id: string
          client_service_id: string
          created_at: string
          id: string
          is_primary: boolean
          relationship: Database["public"]["Enums"]["client_relationship"]
        }
        Insert: {
          client_id: string
          client_service_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          relationship?: Database["public"]["Enums"]["client_relationship"]
        }
        Update: {
          client_id?: string
          client_service_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          relationship?: Database["public"]["Enums"]["client_relationship"]
        }
        Relationships: [
          {
            foreignKeyName: "engagement_contacts_contact_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_contacts_engagement_id_fkey"
            columns: ["client_service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_service_types: {
        Row: {
          client_service_id: string
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          service_id: string
          start_date: string
        }
        Insert: {
          client_service_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          service_id: string
          start_date?: string
        }
        Update: {
          client_service_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          service_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagement_services_engagement_id_fkey"
            columns: ["client_service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagement_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      client_services: {
        Row: {
          closed_date: string | null
          contact_attempts_count: number | null
          contact_status:
            | Database["public"]["Enums"]["contact_status_enum"]
            | null
          contact_status_changed_at: string | null
          created_at: string
          enrolled_date: string | null
          escrow_balance: number | null
          estimated_completion_date: string | null
          estimated_settlement_percentage: number | null
          first_draft_date: string | null
          first_payment_date: string | null
          id: string
          last_contact_attempt_date: string | null
          last_successful_contact_date: string | null
          monthly_payment: number | null
          monthly_service_fee: number | null
          notes: string | null
          originating_company_id: string | null
          owning_company_id: string
          payment_frequency: string | null
          payment_status:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          payment_status_changed_at: string | null
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          primary_client_id: string | null
          primary_status_changed_at: string | null
          program_start_date: string | null
          program_type: string | null
          requires_management_approval: boolean | null
          retention_assigned_to: string | null
          retention_date: string | null
          retention_flag: boolean | null
          retention_reason: string | null
          retention_type:
            | Database["public"]["Enums"]["retention_type_enum"]
            | null
          service_number: string
          settlement_fee_percentage: number | null
          status: Database["public"]["Enums"]["service_status"]
          term_months: number | null
          total_enrolled_debt: number | null
          updated_at: string
        }
        Insert: {
          closed_date?: string | null
          contact_attempts_count?: number | null
          contact_status?:
            | Database["public"]["Enums"]["contact_status_enum"]
            | null
          contact_status_changed_at?: string | null
          created_at?: string
          enrolled_date?: string | null
          escrow_balance?: number | null
          estimated_completion_date?: string | null
          estimated_settlement_percentage?: number | null
          first_draft_date?: string | null
          first_payment_date?: string | null
          id?: string
          last_contact_attempt_date?: string | null
          last_successful_contact_date?: string | null
          monthly_payment?: number | null
          monthly_service_fee?: number | null
          notes?: string | null
          originating_company_id?: string | null
          owning_company_id: string
          payment_frequency?: string | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          payment_status_changed_at?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          primary_client_id?: string | null
          primary_status_changed_at?: string | null
          program_start_date?: string | null
          program_type?: string | null
          requires_management_approval?: boolean | null
          retention_assigned_to?: string | null
          retention_date?: string | null
          retention_flag?: boolean | null
          retention_reason?: string | null
          retention_type?:
            | Database["public"]["Enums"]["retention_type_enum"]
            | null
          service_number: string
          settlement_fee_percentage?: number | null
          status?: Database["public"]["Enums"]["service_status"]
          term_months?: number | null
          total_enrolled_debt?: number | null
          updated_at?: string
        }
        Update: {
          closed_date?: string | null
          contact_attempts_count?: number | null
          contact_status?:
            | Database["public"]["Enums"]["contact_status_enum"]
            | null
          contact_status_changed_at?: string | null
          created_at?: string
          enrolled_date?: string | null
          escrow_balance?: number | null
          estimated_completion_date?: string | null
          estimated_settlement_percentage?: number | null
          first_draft_date?: string | null
          first_payment_date?: string | null
          id?: string
          last_contact_attempt_date?: string | null
          last_successful_contact_date?: string | null
          monthly_payment?: number | null
          monthly_service_fee?: number | null
          notes?: string | null
          originating_company_id?: string | null
          owning_company_id?: string
          payment_frequency?: string | null
          payment_status?:
            | Database["public"]["Enums"]["payment_status_enum"]
            | null
          payment_status_changed_at?: string | null
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          primary_client_id?: string | null
          primary_status_changed_at?: string | null
          program_start_date?: string | null
          program_type?: string | null
          requires_management_approval?: boolean | null
          retention_assigned_to?: string | null
          retention_date?: string | null
          retention_flag?: boolean | null
          retention_reason?: string | null
          retention_type?:
            | Database["public"]["Enums"]["retention_type_enum"]
            | null
          service_number?: string
          settlement_fee_percentage?: number | null
          status?: Database["public"]["Enums"]["service_status"]
          term_months?: number | null
          total_enrolled_debt?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_services_retention_assigned_to_fkey"
            columns: ["retention_assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_originating_company_id_fkey"
            columns: ["originating_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_owning_company_id_fkey"
            columns: ["owning_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_primary_contact_id_fkey"
            columns: ["primary_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_id: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          first_name: string
          forth_crm_id: string | null
          id: string
          is_active: boolean
          last_name: string
          middle_name: string | null
          notes: string | null
          preferred_contact_method:
            | Database["public"]["Enums"]["phone_type"]
            | null
          ssn_encrypted: string | null
          status: Database["public"]["Enums"]["client_status_enum"] | null
          tcpa_consent: boolean | null
          tcpa_consent_date: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name: string
          forth_crm_id?: string | null
          id?: string
          is_active?: boolean
          last_name: string
          middle_name?: string | null
          notes?: string | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["phone_type"]
            | null
          ssn_encrypted?: string | null
          status?: Database["public"]["Enums"]["client_status_enum"] | null
          tcpa_consent?: boolean | null
          tcpa_consent_date?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          first_name?: string
          forth_crm_id?: string | null
          id?: string
          is_active?: boolean
          last_name?: string
          middle_name?: string | null
          notes?: string | null
          preferred_contact_method?:
            | Database["public"]["Enums"]["phone_type"]
            | null
          ssn_encrypted?: string | null
          status?: Database["public"]["Enums"]["client_status_enum"] | null
          tcpa_consent?: boolean | null
          tcpa_consent_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company_type: Database["public"]["Enums"]["company_type"]
          created_at: string
          data_visibility: Database["public"]["Enums"]["data_visibility"]
          email: string | null
          id: string
          is_active: boolean
          name: string
          parent_company_id: string | null
          phone: string | null
          settings: Json | null
          state: string | null
          updated_at: string
          website: string | null
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_type?: Database["public"]["Enums"]["company_type"]
          created_at?: string
          data_visibility?: Database["public"]["Enums"]["data_visibility"]
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_company_id?: string | null
          phone?: string | null
          settings?: Json | null
          state?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company_type?: Database["public"]["Enums"]["company_type"]
          created_at?: string
          data_visibility?: Database["public"]["Enums"]["data_visibility"]
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_company_id?: string | null
          phone?: string | null
          settings?: Json | null
          state?: string | null
          updated_at?: string
          website?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_parent_company_id_fkey"
            columns: ["parent_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_processor_configs: {
        Row: {
          api_key_encrypted: string | null
          company_id: string
          config: Json | null
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          processor_id: string
        }
        Insert: {
          api_key_encrypted?: string | null
          company_id: string
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          processor_id: string
        }
        Update: {
          api_key_encrypted?: string | null
          company_id?: string
          config?: Json | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          processor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_processor_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_processor_configs_processor_id_fkey"
            columns: ["processor_id"]
            isOneToOne: false
            referencedRelation: "payment_processors"
            referencedColumns: ["id"]
          },
        ]
      }
      creditor_contacts: {
        Row: {
          created_at: string
          creditor_id: string
          email: string | null
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          notes: string | null
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creditor_id: string
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          notes?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creditor_id?: string
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          notes?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creditor_contacts_creditor_id_fkey"
            columns: ["creditor_id"]
            isOneToOne: false
            referencedRelation: "creditors"
            referencedColumns: ["id"]
          },
        ]
      }
      creditors: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          created_at: string
          creditor_type: Database["public"]["Enums"]["creditor_type"]
          email: string | null
          fax: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string
          creditor_type?: Database["public"]["Enums"]["creditor_type"]
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string
          creditor_type?: Database["public"]["Enums"]["creditor_type"]
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      deadline_reminders: {
        Row: {
          created_at: string
          days_before: number
          deadline_date: string
          entity_id: string
          error_message: string | null
          id: string
          notification_id: string | null
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          scheduled_for: string
          sent_at: string | null
          staff_id: string | null
          status: Database["public"]["Enums"]["reminder_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          days_before: number
          deadline_date: string
          entity_id: string
          error_message?: string | null
          id?: string
          notification_id?: string | null
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          scheduled_for: string
          sent_at?: string | null
          staff_id?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          days_before?: number
          deadline_date?: string
          entity_id?: string
          error_message?: string | null
          id?: string
          notification_id?: string | null
          reminder_type?: Database["public"]["Enums"]["reminder_type"]
          scheduled_for?: string
          sent_at?: string | null
          staff_id?: string | null
          status?: Database["public"]["Enums"]["reminder_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deadline_reminders_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadline_reminders_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      docuseal_templates: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          docuseal_template_id: number
          id: string
          is_active: boolean
          name: string
          signer_roles: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          docuseal_template_id: number
          id?: string
          is_active?: boolean
          name: string
          signer_roles?: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          docuseal_template_id?: number
          id?: string
          is_active?: boolean
          name?: string
          signer_roles?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "docuseal_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      eligibility_reviews: {
        Row: {
          created_at: string
          decline_reason: string | null
          flags: Json | null
          id: string
          lead_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          decline_reason?: string | null
          flags?: Json | null
          id?: string
          lead_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          decline_reason?: string | null
          flags?: Json | null
          id?: string
          lead_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eligibility_reviews_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eligibility_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eligibility_reviews_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          admin_notes: string | null
          affected_module: string | null
          category: Database["public"]["Enums"]["feature_request_category"]
          created_at: string
          department: string | null
          description: string
          id: string
          priority: Database["public"]["Enums"]["feature_request_priority"]
          request_type: Database["public"]["Enums"]["feature_request_type"]
          staff_name: string | null
          status: Database["public"]["Enums"]["feature_request_status"]
          submitted_by: string | null
          title: string
          updated_at: string
          votes: number
        }
        Insert: {
          admin_notes?: string | null
          affected_module?: string | null
          category?: Database["public"]["Enums"]["feature_request_category"]
          created_at?: string
          department?: string | null
          description: string
          id?: string
          priority?: Database["public"]["Enums"]["feature_request_priority"]
          request_type?: Database["public"]["Enums"]["feature_request_type"]
          staff_name?: string | null
          status?: Database["public"]["Enums"]["feature_request_status"]
          submitted_by?: string | null
          title: string
          updated_at?: string
          votes?: number
        }
        Update: {
          admin_notes?: string | null
          affected_module?: string | null
          category?: Database["public"]["Enums"]["feature_request_category"]
          created_at?: string
          department?: string | null
          description?: string
          id?: string
          priority?: Database["public"]["Enums"]["feature_request_priority"]
          request_type?: Database["public"]["Enums"]["feature_request_type"]
          staff_name?: string | null
          status?: Database["public"]["Enums"]["feature_request_status"]
          submitted_by?: string | null
          title?: string
          updated_at?: string
          votes?: number
        }
        Relationships: []
      }
      filing_fees: {
        Row: {
          amount: number
          approved_date: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          matter_id: string
          notes: string | null
          paid_date: string | null
          requested_date: string
          status: Database["public"]["Enums"]["filing_fee_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          approved_date?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          matter_id: string
          notes?: string | null
          paid_date?: string | null
          requested_date?: string
          status?: Database["public"]["Enums"]["filing_fee_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_date?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          matter_id?: string
          notes?: string | null
          paid_date?: string | null
          requested_date?: string
          status?: Database["public"]["Enums"]["filing_fee_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "filing_fees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_fees_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "litigation_matters"
            referencedColumns: ["id"]
          },
        ]
      }
      forth_sync_log: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string
          entity_type: string
          error_message: string | null
          id: string
          request_payload: Json | null
          response_payload: Json | null
          success: boolean
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          error_message?: string | null
          id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          success: boolean
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          id?: string
          request_payload?: Json | null
          response_payload?: Json | null
          success?: boolean
        }
        Relationships: []
      }
      job_titles: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          title: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["app_role"]
          title: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          title?: string
        }
        Relationships: []
      }
      law_firm_contacts: {
        Row: {
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_active: boolean
          last_name: string
          law_firm_id: string
          notes: string | null
          phone: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_active?: boolean
          last_name: string
          law_firm_id: string
          notes?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_active?: boolean
          last_name?: string
          law_firm_id?: string
          notes?: string | null
          phone?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "law_firm_contacts_law_firm_id_fkey"
            columns: ["law_firm_id"]
            isOneToOne: false
            referencedRelation: "law_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      law_firms: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          created_at: string
          email: string | null
          fax: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          fax?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          lead_id: string
          next_action: string | null
          next_action_date: string | null
          notes: string | null
          outcome: string | null
          staff_id: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          lead_id: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          outcome?: string | null
          staff_id?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          lead_id?: string
          next_action?: string | null
          next_action_date?: string | null
          notes?: string | null
          outcome?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignment_log: {
        Row: {
          action: Database["public"]["Enums"]["assignment_action"]
          created_at: string
          from_staff_id: string | null
          id: string
          lead_id: string
          method: Database["public"]["Enums"]["assignment_method"] | null
          performed_by: string | null
          reason: string | null
          rule_id: string | null
          to_staff_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["assignment_action"]
          created_at?: string
          from_staff_id?: string | null
          id?: string
          lead_id: string
          method?: Database["public"]["Enums"]["assignment_method"] | null
          performed_by?: string | null
          reason?: string | null
          rule_id?: string | null
          to_staff_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["assignment_action"]
          created_at?: string
          from_staff_id?: string | null
          id?: string
          lead_id?: string
          method?: Database["public"]["Enums"]["assignment_method"] | null
          performed_by?: string | null
          reason?: string | null
          rule_id?: string | null
          to_staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignment_log_from_staff_id_fkey"
            columns: ["from_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_log_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "lead_assignment_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_log_to_staff_id_fkey"
            columns: ["to_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignment_pool: {
        Row: {
          assignment_count: number
          created_at: string
          id: string
          is_available: boolean
          last_assigned_at: string | null
          max_active_leads: number | null
          rule_id: string
          skills: Json | null
          staff_id: string
          updated_at: string
          weight: number
        }
        Insert: {
          assignment_count?: number
          created_at?: string
          id?: string
          is_available?: boolean
          last_assigned_at?: string | null
          max_active_leads?: number | null
          rule_id: string
          skills?: Json | null
          staff_id: string
          updated_at?: string
          weight?: number
        }
        Update: {
          assignment_count?: number
          created_at?: string
          id?: string
          is_available?: boolean
          last_assigned_at?: string | null
          max_active_leads?: number | null
          rule_id?: string
          skills?: Json | null
          staff_id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignment_pool_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "lead_assignment_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_pool_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignment_queue: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          assignment_method:
            | Database["public"]["Enums"]["assignment_method"]
            | null
          assignment_reason: string | null
          attempt_count: number
          created_at: string
          id: string
          last_attempt_at: string | null
          lead_id: string
          next_attempt_at: string | null
          priority: number
          queued_at: string
          rule_id: string | null
          status: Database["public"]["Enums"]["queue_status"]
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          assignment_method?:
            | Database["public"]["Enums"]["assignment_method"]
            | null
          assignment_reason?: string | null
          attempt_count?: number
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          lead_id: string
          next_attempt_at?: string | null
          priority?: number
          queued_at?: string
          rule_id?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          assignment_method?:
            | Database["public"]["Enums"]["assignment_method"]
            | null
          assignment_reason?: string | null
          attempt_count?: number
          created_at?: string
          id?: string
          last_attempt_at?: string | null
          lead_id?: string
          next_attempt_at?: string | null
          priority?: number
          queued_at?: string
          rule_id?: string | null
          status?: Database["public"]["Enums"]["queue_status"]
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignment_queue_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignment_queue_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "lead_assignment_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignment_rules: {
        Row: {
          company_id: string
          config: Json
          created_at: string
          description: string | null
          id: string
          interest_type: Database["public"]["Enums"]["lead_interest"] | null
          is_active: boolean
          is_default: boolean
          max_debt_amount: number | null
          method: Database["public"]["Enums"]["assignment_method"]
          min_debt_amount: number | null
          name: string
          priority: number
          source: Database["public"]["Enums"]["lead_source"] | null
          updated_at: string
        }
        Insert: {
          company_id: string
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          interest_type?: Database["public"]["Enums"]["lead_interest"] | null
          is_active?: boolean
          is_default?: boolean
          max_debt_amount?: number | null
          method?: Database["public"]["Enums"]["assignment_method"]
          min_debt_amount?: number | null
          name: string
          priority?: number
          source?: Database["public"]["Enums"]["lead_source"] | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          interest_type?: Database["public"]["Enums"]["lead_interest"] | null
          is_active?: boolean
          is_default?: boolean
          max_debt_amount?: number | null
          method?: Database["public"]["Enums"]["assignment_method"]
          min_debt_amount?: number | null
          name?: string
          priority?: number
          source?: Database["public"]["Enums"]["lead_source"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignment_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_banking: {
        Row: {
          account_number_encrypted: string | null
          account_type: Database["public"]["Enums"]["bank_account_type"]
          bank_name: string
          created_at: string
          id: string
          lead_id: string
          routing_number_encrypted: string | null
        }
        Insert: {
          account_number_encrypted?: string | null
          account_type?: Database["public"]["Enums"]["bank_account_type"]
          bank_name: string
          created_at?: string
          id?: string
          lead_id: string
          routing_number_encrypted?: string | null
        }
        Update: {
          account_number_encrypted?: string | null
          account_type?: Database["public"]["Enums"]["bank_account_type"]
          bank_name?: string
          created_at?: string
          id?: string
          lead_id?: string
          routing_number_encrypted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_banking_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_budgets: {
        Row: {
          amount: number
          category: string
          created_at: string
          id: string
          label: string
          lead_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          id?: string
          label: string
          lead_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          id?: string
          label?: string
          lead_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_budgets_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_debts: {
        Row: {
          account_number_last4: string | null
          account_type: Database["public"]["Enums"]["liability_type"]
          created_at: string
          creditor_id: string | null
          creditor_name: string
          current_balance: number
          id: string
          is_enrolled: boolean
          lead_id: string
          original_balance: number | null
        }
        Insert: {
          account_number_last4?: string | null
          account_type?: Database["public"]["Enums"]["liability_type"]
          created_at?: string
          creditor_id?: string | null
          creditor_name: string
          current_balance: number
          id?: string
          is_enrolled?: boolean
          lead_id: string
          original_balance?: number | null
        }
        Update: {
          account_number_last4?: string | null
          account_type?: Database["public"]["Enums"]["liability_type"]
          created_at?: string
          creditor_id?: string | null
          creditor_name?: string
          current_balance?: number
          id?: string
          is_enrolled?: boolean
          lead_id?: string
          original_balance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_debts_creditor_id_fkey"
            columns: ["creditor_id"]
            isOneToOne: false
            referencedRelation: "creditors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_debts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_disclosures: {
        Row: {
          acknowledged_at: string
          disclosure_type: string
          id: string
          lead_id: string
        }
        Insert: {
          acknowledged_at?: string
          disclosure_type: string
          id?: string
          lead_id: string
        }
        Update: {
          acknowledged_at?: string
          disclosure_type?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_disclosures_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_documents: {
        Row: {
          created_at: string
          document_type: string
          file_url: string
          id: string
          lead_id: string
          notes: string | null
          title: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          file_url: string
          id?: string
          lead_id: string
          notes?: string | null
          title: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_url?: string
          id?: string
          lead_id?: string
          notes?: string | null
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_documents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scoring_profiles: {
        Row: {
          company_id: string
          created_at: string
          criteria: Json
          description: string | null
          id: string
          interest_type: Database["public"]["Enums"]["lead_interest"] | null
          is_active: boolean
          is_default: boolean
          name: string
          source: Database["public"]["Enums"]["lead_source"] | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          criteria?: Json
          description?: string | null
          id?: string
          interest_type?: Database["public"]["Enums"]["lead_interest"] | null
          is_active?: boolean
          is_default?: boolean
          name: string
          source?: Database["public"]["Enums"]["lead_source"] | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          criteria?: Json
          description?: string | null
          id?: string
          interest_type?: Database["public"]["Enums"]["lead_interest"] | null
          is_active?: boolean
          is_default?: boolean
          name?: string
          source?: Database["public"]["Enums"]["lead_source"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_scoring_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          case_number: string | null
          company_id: string
          contacted_at: string | null
          converted_at: string | null
          converted_service_id: string | null
          court_name: string | null
          created_at: string
          credit_auth_date: string | null
          credit_auth_given: boolean | null
          date_of_birth: string | null
          disqualification_reason: string | null
          email: string | null
          employer_name: string | null
          employment_status:
            | Database["public"]["Enums"]["employment_status"]
            | null
          estimated_debt_amount: number | null
          first_name: string
          hardship_notes: string | null
          hardship_reason: Database["public"]["Enums"]["hardship_reason"] | null
          has_active_lawsuit: boolean | null
          has_federal_accounts: boolean | null
          has_security_clearance: boolean | null
          id: string
          in_bankruptcy: boolean | null
          interest_type: Database["public"]["Enums"]["lead_interest"]
          job_title: string | null
          landing_page: string | null
          last_name: string
          lead_number: string
          lead_score: number | null
          lost_at: string | null
          monthly_income: number | null
          new_at: string | null
          notes: string | null
          number_of_debts: number | null
          opposing_party: string | null
          originating_company_id: string | null
          phone: string | null
          qualified_at: string | null
          referrer_url: string | null
          response_deadline: string | null
          score_breakdown: Json | null
          score_calculated_at: string | null
          scoring_profile_id: string | null
          secured_credit_resolved: boolean | null
          service_date: string | null
          source: Database["public"]["Enums"]["lead_source"]
          ssn_last4_encrypted: string | null
          state: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          wizard_data: Json | null
          wizard_step: number | null
        }
        Insert: {
          assigned_to?: string | null
          case_number?: string | null
          company_id: string
          contacted_at?: string | null
          converted_at?: string | null
          converted_service_id?: string | null
          court_name?: string | null
          created_at?: string
          credit_auth_date?: string | null
          credit_auth_given?: boolean | null
          date_of_birth?: string | null
          disqualification_reason?: string | null
          email?: string | null
          employer_name?: string | null
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          estimated_debt_amount?: number | null
          first_name: string
          hardship_notes?: string | null
          hardship_reason?:
            | Database["public"]["Enums"]["hardship_reason"]
            | null
          has_active_lawsuit?: boolean | null
          has_federal_accounts?: boolean | null
          has_security_clearance?: boolean | null
          id?: string
          in_bankruptcy?: boolean | null
          interest_type?: Database["public"]["Enums"]["lead_interest"]
          job_title?: string | null
          landing_page?: string | null
          last_name: string
          lead_number: string
          lead_score?: number | null
          lost_at?: string | null
          monthly_income?: number | null
          new_at?: string | null
          notes?: string | null
          number_of_debts?: number | null
          opposing_party?: string | null
          originating_company_id?: string | null
          phone?: string | null
          qualified_at?: string | null
          referrer_url?: string | null
          response_deadline?: string | null
          score_breakdown?: Json | null
          score_calculated_at?: string | null
          scoring_profile_id?: string | null
          secured_credit_resolved?: boolean | null
          service_date?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          ssn_last4_encrypted?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          wizard_data?: Json | null
          wizard_step?: number | null
        }
        Update: {
          assigned_to?: string | null
          case_number?: string | null
          company_id?: string
          contacted_at?: string | null
          converted_at?: string | null
          converted_service_id?: string | null
          court_name?: string | null
          created_at?: string
          credit_auth_date?: string | null
          credit_auth_given?: boolean | null
          date_of_birth?: string | null
          disqualification_reason?: string | null
          email?: string | null
          employer_name?: string | null
          employment_status?:
            | Database["public"]["Enums"]["employment_status"]
            | null
          estimated_debt_amount?: number | null
          first_name?: string
          hardship_notes?: string | null
          hardship_reason?:
            | Database["public"]["Enums"]["hardship_reason"]
            | null
          has_active_lawsuit?: boolean | null
          has_federal_accounts?: boolean | null
          has_security_clearance?: boolean | null
          id?: string
          in_bankruptcy?: boolean | null
          interest_type?: Database["public"]["Enums"]["lead_interest"]
          job_title?: string | null
          landing_page?: string | null
          last_name?: string
          lead_number?: string
          lead_score?: number | null
          lost_at?: string | null
          monthly_income?: number | null
          new_at?: string | null
          notes?: string | null
          number_of_debts?: number | null
          opposing_party?: string | null
          originating_company_id?: string | null
          phone?: string | null
          qualified_at?: string | null
          referrer_url?: string | null
          response_deadline?: string | null
          score_breakdown?: Json | null
          score_calculated_at?: string | null
          scoring_profile_id?: string | null
          secured_credit_resolved?: boolean | null
          service_date?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          ssn_last4_encrypted?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          wizard_data?: Json | null
          wizard_step?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_engagement_id_fkey"
            columns: ["converted_service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_originating_company_id_fkey"
            columns: ["originating_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_scoring_profile_id_fkey"
            columns: ["scoring_profile_id"]
            isOneToOne: false
            referencedRelation: "lead_scoring_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      liabilities: {
        Row: {
          account_number: string | null
          client_service_id: string
          created_at: string
          current_balance: number | null
          current_creditor_id: string | null
          debt_buyer_id: string | null
          debt_buyer_other: string | null
          enrolled_balance: number | null
          id: string
          law_firm_id: string | null
          law_firm_other: string | null
          liability_type: Database["public"]["Enums"]["liability_type"]
          notes: string | null
          original_balance: number | null
          original_creditor_id: string | null
          priority: number | null
          servicing_creditor_id: string | null
          status: Database["public"]["Enums"]["liability_status"]
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          client_service_id: string
          created_at?: string
          current_balance?: number | null
          current_creditor_id?: string | null
          debt_buyer_id?: string | null
          debt_buyer_other?: string | null
          enrolled_balance?: number | null
          id?: string
          law_firm_id?: string | null
          law_firm_other?: string | null
          liability_type?: Database["public"]["Enums"]["liability_type"]
          notes?: string | null
          original_balance?: number | null
          original_creditor_id?: string | null
          priority?: number | null
          servicing_creditor_id?: string | null
          status?: Database["public"]["Enums"]["liability_status"]
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          client_service_id?: string
          created_at?: string
          current_balance?: number | null
          current_creditor_id?: string | null
          debt_buyer_id?: string | null
          debt_buyer_other?: string | null
          enrolled_balance?: number | null
          id?: string
          law_firm_id?: string | null
          law_firm_other?: string | null
          liability_type?: Database["public"]["Enums"]["liability_type"]
          notes?: string | null
          original_balance?: number | null
          original_creditor_id?: string | null
          priority?: number | null
          servicing_creditor_id?: string | null
          status?: Database["public"]["Enums"]["liability_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "liabilities_current_creditor_id_fkey"
            columns: ["current_creditor_id"]
            isOneToOne: false
            referencedRelation: "creditors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liabilities_debt_buyer_id_fkey"
            columns: ["debt_buyer_id"]
            isOneToOne: false
            referencedRelation: "creditors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liabilities_engagement_id_fkey"
            columns: ["client_service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liabilities_law_firm_id_fkey"
            columns: ["law_firm_id"]
            isOneToOne: false
            referencedRelation: "creditors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liabilities_original_creditor_id_fkey"
            columns: ["original_creditor_id"]
            isOneToOne: false
            referencedRelation: "creditors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liabilities_servicing_creditor_id_fkey"
            columns: ["servicing_creditor_id"]
            isOneToOne: false
            referencedRelation: "creditors"
            referencedColumns: ["id"]
          },
        ]
      }
      liability_actions: {
        Row: {
          action_type: string
          amount: number | null
          created_at: string
          description: string
          document_url: string | null
          id: string
          liability_id: string
          staff_id: string | null
        }
        Insert: {
          action_type: string
          amount?: number | null
          created_at?: string
          description: string
          document_url?: string | null
          id?: string
          liability_id: string
          staff_id?: string | null
        }
        Update: {
          action_type?: string
          amount?: number | null
          created_at?: string
          description?: string
          document_url?: string | null
          id?: string
          liability_id?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "liability_actions_liability_id_fkey"
            columns: ["liability_id"]
            isOneToOne: false
            referencedRelation: "liabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "liability_actions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      litigation_activities: {
        Row: {
          activity_date: string | null
          activity_type: string
          created_at: string
          description: string
          document_url: string | null
          id: string
          matter_id: string
          outcome: string | null
          staff_id: string | null
        }
        Insert: {
          activity_date?: string | null
          activity_type: string
          created_at?: string
          description: string
          document_url?: string | null
          id?: string
          matter_id: string
          outcome?: string | null
          staff_id?: string | null
        }
        Update: {
          activity_date?: string | null
          activity_type?: string
          created_at?: string
          description?: string
          document_url?: string | null
          id?: string
          matter_id?: string
          outcome?: string | null
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "litigation_activities_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "litigation_matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litigation_activities_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      litigation_documents: {
        Row: {
          created_at: string
          deadline_date: string | null
          document_type: string
          file_url: string | null
          filed_date: string | null
          id: string
          matter_id: string
          notes: string | null
          title: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          deadline_date?: string | null
          document_type: string
          file_url?: string | null
          filed_date?: string | null
          id?: string
          matter_id: string
          notes?: string | null
          title: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          deadline_date?: string | null
          document_type?: string
          file_url?: string | null
          filed_date?: string | null
          id?: string
          matter_id?: string
          notes?: string | null
          title?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "litigation_documents_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "litigation_matters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litigation_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      litigation_hearings: {
        Row: {
          created_at: string
          end_date: string | null
          hearing_type: string
          id: string
          judge_name: string | null
          location: string | null
          matter_id: string
          notes: string | null
          outcome: string | null
          scheduled_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          hearing_type: string
          id?: string
          judge_name?: string | null
          location?: string | null
          matter_id: string
          notes?: string | null
          outcome?: string | null
          scheduled_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          hearing_type?: string
          id?: string
          judge_name?: string | null
          location?: string | null
          matter_id?: string
          notes?: string | null
          outcome?: string | null
          scheduled_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "litigation_hearings_matter_id_fkey"
            columns: ["matter_id"]
            isOneToOne: false
            referencedRelation: "litigation_matters"
            referencedColumns: ["id"]
          },
        ]
      }
      litigation_matters: {
        Row: {
          case_number: string | null
          client_service_id: string
          county: string | null
          court_name: string | null
          created_at: string
          id: string
          judgment_amount: number | null
          liability_id: string
          next_hearing_date: string | null
          notes: string | null
          opposing_contact_id: string | null
          opposing_counsel: string | null
          opposing_counsel_id: string | null
          opposing_creditor_id: string | null
          opposing_law_firm_id: string | null
          opposing_party: string | null
          response_deadline: string | null
          service_date: string | null
          settlement_amount: number | null
          state: string | null
          status: Database["public"]["Enums"]["litigation_status"]
          updated_at: string
        }
        Insert: {
          case_number?: string | null
          client_service_id: string
          county?: string | null
          court_name?: string | null
          created_at?: string
          id?: string
          judgment_amount?: number | null
          liability_id: string
          next_hearing_date?: string | null
          notes?: string | null
          opposing_contact_id?: string | null
          opposing_counsel?: string | null
          opposing_counsel_id?: string | null
          opposing_creditor_id?: string | null
          opposing_law_firm_id?: string | null
          opposing_party?: string | null
          response_deadline?: string | null
          service_date?: string | null
          settlement_amount?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["litigation_status"]
          updated_at?: string
        }
        Update: {
          case_number?: string | null
          client_service_id?: string
          county?: string | null
          court_name?: string | null
          created_at?: string
          id?: string
          judgment_amount?: number | null
          liability_id?: string
          next_hearing_date?: string | null
          notes?: string | null
          opposing_contact_id?: string | null
          opposing_counsel?: string | null
          opposing_counsel_id?: string | null
          opposing_creditor_id?: string | null
          opposing_law_firm_id?: string | null
          opposing_party?: string | null
          response_deadline?: string | null
          service_date?: string | null
          settlement_amount?: number | null
          state?: string | null
          status?: Database["public"]["Enums"]["litigation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "litigation_matters_client_service_id_fkey"
            columns: ["client_service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litigation_matters_liability_id_fkey"
            columns: ["liability_id"]
            isOneToOne: false
            referencedRelation: "liabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litigation_matters_opposing_contact_id_fkey"
            columns: ["opposing_contact_id"]
            isOneToOne: false
            referencedRelation: "creditor_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litigation_matters_opposing_counsel_id_fkey"
            columns: ["opposing_counsel_id"]
            isOneToOne: false
            referencedRelation: "law_firm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litigation_matters_opposing_creditor_id_fkey"
            columns: ["opposing_creditor_id"]
            isOneToOne: false
            referencedRelation: "creditors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litigation_matters_opposing_law_firm_id_fkey"
            columns: ["opposing_law_firm_id"]
            isOneToOne: false
            referencedRelation: "law_firms"
            referencedColumns: ["id"]
          },
        ]
      }
      litigation_team_members: {
        Row: {
          assigned_at: string
          created_at: string
          id: string
          staff_id: string
          team_id: string
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          id?: string
          staff_id: string
          team_id: string
        }
        Update: {
          assigned_at?: string
          created_at?: string
          id?: string
          staff_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "litigation_team_members_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: true
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "litigation_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "litigation_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      litigation_teams: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          priority: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "litigation_teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      note_mentions: {
        Row: {
          created_at: string
          id: string
          mentioned_staff_id: string
          note_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mentioned_staff_id: string
          note_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mentioned_staff_id?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_mentions_mentioned_staff_id_fkey"
            columns: ["mentioned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_mentions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          created_by: string
          entity_id: string
          entity_type: string
          id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          entity_id: string
          entity_type: string
          id?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          entity_id?: string
          entity_type?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          id: string
          in_app_enabled: boolean
          notification_type: Database["public"]["Enums"]["notification_type"]
          sound_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          notification_type: Database["public"]["Enums"]["notification_type"]
          sound_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          id?: string
          in_app_enabled?: boolean
          notification_type?: Database["public"]["Enums"]["notification_type"]
          sound_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          link: string | null
          message: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      payment_processors: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          processor_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          processor_type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          processor_type?: string
        }
        Relationships: []
      }
      payment_schedules: {
        Row: {
          client_service_id: string
          created_at: string
          draft_amount: number
          drafts_generated: number
          first_draft_date: string
          frequency: Database["public"]["Enums"]["payment_frequency_enum"]
          id: string
          last_generated_date: string | null
          processor_fee_amount: number
          status: Database["public"]["Enums"]["schedule_status_enum"]
          total_drafts: number
          updated_at: string
        }
        Insert: {
          client_service_id: string
          created_at?: string
          draft_amount: number
          drafts_generated?: number
          first_draft_date: string
          frequency?: Database["public"]["Enums"]["payment_frequency_enum"]
          id?: string
          last_generated_date?: string | null
          processor_fee_amount?: number
          status?: Database["public"]["Enums"]["schedule_status_enum"]
          total_drafts: number
          updated_at?: string
        }
        Update: {
          client_service_id?: string
          created_at?: string
          draft_amount?: number
          drafts_generated?: number
          first_draft_date?: string
          frequency?: Database["public"]["Enums"]["payment_frequency_enum"]
          id?: string
          last_generated_date?: string | null
          processor_fee_amount?: number
          status?: Database["public"]["Enums"]["schedule_status_enum"]
          total_drafts?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_schedules_client_service_id_fkey"
            columns: ["client_service_id"]
            isOneToOne: true
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_settings: {
        Row: {
          company_id: string
          created_at: string
          hearing_days: number[]
          id: string
          is_active: boolean
          reminder_hour: number
          response_deadline_days: number[]
          task_due_days: number[]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          hearing_days?: number[]
          id?: string
          is_active?: boolean
          reminder_hour?: number
          response_deadline_days?: number[]
          task_due_days?: number[]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          hearing_days?: number[]
          id?: string
          is_active?: boolean
          reminder_hour?: number
          response_deadline_days?: number[]
          task_due_days?: number[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_settings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          company_id: string | null
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_preset: boolean
          is_public: boolean
          module: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_preset?: boolean
          is_public?: boolean
          module: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_preset?: boolean
          is_public?: boolean
          module?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_read: boolean
          can_update: boolean
          created_at: string
          id: string
          module: string
          notes: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          created_at?: string
          id?: string
          module: string
          notes?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          created_at?: string
          id?: string
          module?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      role_special_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      service_status_history: {
        Row: {
          changed_by: string | null
          client_service_id: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          reason: string | null
          status_dimension: string
        }
        Insert: {
          changed_by?: string | null
          client_service_id: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          status_dimension: string
        }
        Update: {
          changed_by?: string | null
          client_service_id?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string | null
          status_dimension?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_status_history_client_service_id_fkey"
            columns: ["client_service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          service_type: Database["public"]["Enums"]["service_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          service_type: Database["public"]["Enums"]["service_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          service_type?: Database["public"]["Enums"]["service_type"]
        }
        Relationships: []
      }
      settlements: {
        Row: {
          accepted_date: string | null
          attorney_approved: boolean | null
          attorney_approved_by: string | null
          attorney_approved_date: string | null
          completed_date: string | null
          created_at: string
          fee_collection_method:
            | Database["public"]["Enums"]["fee_collection_method"]
            | null
          fee_start_offset_months: number | null
          first_payment_date: string | null
          id: string
          liability_id: string
          notes: string | null
          number_of_payments: number | null
          offer_amount: number
          offer_percentage: number | null
          offered_date: string
          payment_schedule: Json | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          status: Database["public"]["Enums"]["settlement_status"]
          updated_at: string
        }
        Insert: {
          accepted_date?: string | null
          attorney_approved?: boolean | null
          attorney_approved_by?: string | null
          attorney_approved_date?: string | null
          completed_date?: string | null
          created_at?: string
          fee_collection_method?:
            | Database["public"]["Enums"]["fee_collection_method"]
            | null
          fee_start_offset_months?: number | null
          first_payment_date?: string | null
          id?: string
          liability_id: string
          notes?: string | null
          number_of_payments?: number | null
          offer_amount: number
          offer_percentage?: number | null
          offered_date?: string
          payment_schedule?: Json | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          status?: Database["public"]["Enums"]["settlement_status"]
          updated_at?: string
        }
        Update: {
          accepted_date?: string | null
          attorney_approved?: boolean | null
          attorney_approved_by?: string | null
          attorney_approved_date?: string | null
          completed_date?: string | null
          created_at?: string
          fee_collection_method?:
            | Database["public"]["Enums"]["fee_collection_method"]
            | null
          fee_start_offset_months?: number | null
          first_payment_date?: string | null
          id?: string
          liability_id?: string
          notes?: string | null
          number_of_payments?: number | null
          offer_amount?: number
          offer_percentage?: number | null
          offered_date?: string
          payment_schedule?: Json | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          status?: Database["public"]["Enums"]["settlement_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settlements_attorney_approved_by_fkey"
            columns: ["attorney_approved_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_liability_id_fkey"
            columns: ["liability_id"]
            isOneToOne: false
            referencedRelation: "liabilities"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_events: {
        Row: {
          created_at: string
          event_data: Json
          event_type: string
          id: string
          occurred_at: string
          request_id: string
          signer_id: string | null
        }
        Insert: {
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          occurred_at?: string
          request_id: string
          signer_id?: string | null
        }
        Update: {
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          occurred_at?: string
          request_id?: string
          signer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_events_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "signature_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_events_signer_id_fkey"
            columns: ["signer_id"]
            isOneToOne: false
            referencedRelation: "signature_signers"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_requests: {
        Row: {
          certificate_url: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          delivery_method: string
          docuseal_submission_id: number | null
          docuseal_template_id: number | null
          entity_id: string
          entity_type: string
          evidence_json: Json | null
          executed_pdf_url: string | null
          expires_at: string | null
          id: string
          language: string
          short_token: string
          signing_mode: string
          status: Database["public"]["Enums"]["signature_request_status"]
          template_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          certificate_url?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivery_method?: string
          docuseal_submission_id?: number | null
          docuseal_template_id?: number | null
          entity_id: string
          entity_type: string
          evidence_json?: Json | null
          executed_pdf_url?: string | null
          expires_at?: string | null
          id?: string
          language?: string
          short_token: string
          signing_mode?: string
          status?: Database["public"]["Enums"]["signature_request_status"]
          template_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          certificate_url?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivery_method?: string
          docuseal_submission_id?: number | null
          docuseal_template_id?: number | null
          entity_id?: string
          entity_type?: string
          evidence_json?: Json | null
          executed_pdf_url?: string | null
          expires_at?: string | null
          id?: string
          language?: string
          short_token?: string
          signing_mode?: string
          status?: Database["public"]["Enums"]["signature_request_status"]
          template_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signature_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signature_requests_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      signature_signers: {
        Row: {
          created_at: string
          docuseal_submitter_id: number | null
          email: string
          id: string
          ip_address: string | null
          name: string
          order_index: number
          phone: string | null
          request_id: string
          short_token: string | null
          signed_at: string | null
          signer_role: string
          signing_url: string | null
          status: Database["public"]["Enums"]["signer_status"]
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          docuseal_submitter_id?: number | null
          email: string
          id?: string
          ip_address?: string | null
          name: string
          order_index?: number
          phone?: string | null
          request_id: string
          short_token?: string | null
          signed_at?: string | null
          signer_role: string
          signing_url?: string | null
          status?: Database["public"]["Enums"]["signer_status"]
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          docuseal_submitter_id?: number | null
          email?: string
          id?: string
          ip_address?: string | null
          name?: string
          order_index?: number
          phone?: string | null
          request_id?: string
          short_token?: string | null
          signed_at?: string | null
          signer_role?: string
          signing_url?: string | null
          status?: Database["public"]["Enums"]["signer_status"]
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signature_signers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "signature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          avatar_url: string | null
          company_id: string
          created_at: string
          department: Database["public"]["Enums"]["department_new"]
          email: string
          first_name: string
          hourly_rate: number | null
          id: string
          is_active: boolean
          job_title: string | null
          last_login_at: string | null
          last_name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id: string
          created_at?: string
          department: Database["public"]["Enums"]["department_new"]
          email: string
          first_name: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          last_login_at?: string | null
          last_name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string
          created_at?: string
          department?: Database["public"]["Enums"]["department_new"]
          email?: string
          first_name?: string
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          last_login_at?: string | null
          last_name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          company_id: string | null
          created_at: string
          created_by: string | null
          default_description: string | null
          default_due_days: number | null
          default_title: string
          department: Database["public"]["Enums"]["department_new"] | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          priority: Database["public"]["Enums"]["task_priority"]
          task_type: Database["public"]["Enums"]["task_type"]
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          default_description?: string | null
          default_due_days?: number | null
          default_title: string
          department?: Database["public"]["Enums"]["department_new"] | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          priority?: Database["public"]["Enums"]["task_priority"]
          task_type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_by?: string | null
          default_description?: string | null
          default_due_days?: number | null
          default_title?: string
          department?: Database["public"]["Enums"]["department_new"] | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          task_type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["entity_type"] | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          task_type: Database["public"]["Enums"]["task_type"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: Database["public"]["Enums"]["task_type"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["entity_type"] | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: Database["public"]["Enums"]["task_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      template_categories: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number
          template_type: Database["public"]["Enums"]["template_type"] | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number
          template_type?: Database["public"]["Enums"]["template_type"] | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number
          template_type?: Database["public"]["Enums"]["template_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      template_usages: {
        Row: {
          channel: string | null
          entity_id: string
          entity_type: string
          error_message: string | null
          id: string
          success: boolean
          template_id: string
          used_at: string
          used_by: string | null
        }
        Insert: {
          channel?: string | null
          entity_id: string
          entity_type: string
          error_message?: string | null
          id?: string
          success?: boolean
          template_id: string
          used_at?: string
          used_by?: string | null
        }
        Update: {
          channel?: string | null
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          id?: string
          success?: boolean
          template_id?: string
          used_at?: string
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_usages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_usages_used_by_fkey"
            columns: ["used_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      template_versions: {
        Row: {
          change_notes: string | null
          content: string
          content_html: string | null
          created_at: string
          created_by: string | null
          id: string
          subject: string | null
          template_id: string
          version_number: number
        }
        Insert: {
          change_notes?: string | null
          content: string
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          subject?: string | null
          template_id: string
          version_number: number
        }
        Update: {
          change_notes?: string | null
          content?: string
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          subject?: string | null
          template_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          category_id: string | null
          company_id: string
          conditional_clauses: Json
          content: string
          content_html: string | null
          created_at: string
          created_by: string | null
          current_version: number
          description: string | null
          id: string
          is_active: boolean
          is_system: boolean
          language: Database["public"]["Enums"]["template_language"]
          merge_fields: Json
          name: string
          subject: string | null
          template_type: Database["public"]["Enums"]["template_type"]
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          company_id: string
          conditional_clauses?: Json
          content?: string
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          language?: Database["public"]["Enums"]["template_language"]
          merge_fields?: Json
          name: string
          subject?: string | null
          template_type: Database["public"]["Enums"]["template_type"]
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          company_id?: string
          conditional_clauses?: Json
          content?: string
          content_html?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          language?: Database["public"]["Enums"]["template_language"]
          merge_fields?: Json
          name?: string
          subject?: string | null
          template_type?: Database["public"]["Enums"]["template_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "template_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          client_service_id: string
          created_at: string
          description: string | null
          error_message: string | null
          external_id: string | null
          id: string
          last_sync_at: string | null
          liability_id: string | null
          parent_transaction_id: string | null
          processed_at: string | null
          processor_id: string | null
          schedule_id: string | null
          scheduled_date: string | null
          sequence_number: number | null
          settlement_id: string | null
          status: string
          sync_error: string | null
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          client_service_id: string
          created_at?: string
          description?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          last_sync_at?: string | null
          liability_id?: string | null
          parent_transaction_id?: string | null
          processed_at?: string | null
          processor_id?: string | null
          schedule_id?: string | null
          scheduled_date?: string | null
          sequence_number?: number | null
          settlement_id?: string | null
          status?: string
          sync_error?: string | null
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          client_service_id?: string
          created_at?: string
          description?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          last_sync_at?: string | null
          liability_id?: string | null
          parent_transaction_id?: string | null
          processed_at?: string | null
          processor_id?: string | null
          schedule_id?: string | null
          scheduled_date?: string | null
          sequence_number?: number | null
          settlement_id?: string | null
          status?: string
          sync_error?: string | null
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_engagement_id_fkey"
            columns: ["client_service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_liability_id_fkey"
            columns: ["liability_id"]
            isOneToOne: false
            referencedRelation: "liabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_parent_transaction_id_fkey"
            columns: ["parent_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_processor_id_fkey"
            columns: ["processor_id"]
            isOneToOne: false
            referencedRelation: "payment_processors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "payment_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "settlements"
            referencedColumns: ["id"]
          },
        ]
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
      workflow_executions: {
        Row: {
          actions_executed: Json | null
          block_message: string | null
          condition_results: Json | null
          duration_ms: number | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["workflow_entity_type"]
          error_message: string | null
          executed_at: string
          id: string
          rule_id: string
          status: Database["public"]["Enums"]["workflow_execution_status"]
          trigger_data: Json | null
        }
        Insert: {
          actions_executed?: Json | null
          block_message?: string | null
          condition_results?: Json | null
          duration_ms?: number | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["workflow_entity_type"]
          error_message?: string | null
          executed_at?: string
          id?: string
          rule_id: string
          status: Database["public"]["Enums"]["workflow_execution_status"]
          trigger_data?: Json | null
        }
        Update: {
          actions_executed?: Json | null
          block_message?: string | null
          condition_results?: Json | null
          duration_ms?: number | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["workflow_entity_type"]
          error_message?: string | null
          executed_at?: string
          id?: string
          rule_id?: string
          status?: Database["public"]["Enums"]["workflow_execution_status"]
          trigger_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "workflow_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_groups: {
        Row: {
          color: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          entity_type: Database["public"]["Enums"]["workflow_entity_type"]
          filter_conditions: Json
          id: string
          is_active: boolean
          name: string
          priority: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_type: Database["public"]["Enums"]["workflow_entity_type"]
          filter_conditions?: Json
          id?: string
          is_active?: boolean
          name: string
          priority?: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_type?: Database["public"]["Enums"]["workflow_entity_type"]
          filter_conditions?: Json
          id?: string
          is_active?: boolean
          name?: string
          priority?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_rules: {
        Row: {
          actions: Json
          company_id: string
          conditions: Json
          created_at: string
          created_by: string | null
          description: string | null
          entity_type: Database["public"]["Enums"]["workflow_entity_type"]
          group_id: string | null
          id: string
          is_active: boolean
          is_blocking: boolean
          name: string
          priority: number
          trigger_config: Json
          trigger_type: Database["public"]["Enums"]["workflow_trigger_type"]
          updated_at: string
        }
        Insert: {
          actions?: Json
          company_id: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_type: Database["public"]["Enums"]["workflow_entity_type"]
          group_id?: string | null
          id?: string
          is_active?: boolean
          is_blocking?: boolean
          name: string
          priority?: number
          trigger_config?: Json
          trigger_type: Database["public"]["Enums"]["workflow_trigger_type"]
          updated_at?: string
        }
        Update: {
          actions?: Json
          company_id?: string
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_type?: Database["public"]["Enums"]["workflow_entity_type"]
          group_id?: string | null
          id?: string
          is_active?: boolean
          is_blocking?: boolean
          name?: string
          priority?: number
          trigger_config?: Json
          trigger_type?: Database["public"]["Enums"]["workflow_trigger_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_rules_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_rules_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "workflow_groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      lead_rep_metrics: {
        Row: {
          avatar_url: string | null
          avg_days_to_convert: number | null
          avg_hours_to_contact: number | null
          contact_ratio: number | null
          contacted_count: number | null
          conversion_ratio: number | null
          converted_count: number | null
          credit_pull_count: number | null
          first_name: string | null
          last_name: string | null
          lost_count: number | null
          qualified_count: number | null
          staff_id: string | null
          total_assigned: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_source_metrics: {
        Row: {
          contact_ratio: number | null
          contacted_count: number | null
          conversion_ratio: number | null
          converted_count: number | null
          credit_pull_count: number | null
          credit_pull_ratio: number | null
          lost_count: number | null
          qualification_ratio: number | null
          qualified_count: number | null
          source: Database["public"]["Enums"]["lead_source"] | null
          total_leads: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_lead: {
        Args: {
          _force_method?: Database["public"]["Enums"]["assignment_method"]
          _force_staff_id?: string
          _lead_id: string
        }
        Returns: {
          assigned_to: string
          method: Database["public"]["Enums"]["assignment_method"]
          reason: string
        }[]
      }
      calculate_lead_score: {
        Args: { lead_row: Database["public"]["Tables"]["leads"]["Row"] }
        Returns: {
          breakdown: Json
          score: number
        }[]
      }
      can_access_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      check_trigger_match: {
        Args: { _trigger_config: Json; _trigger_data: Json }
        Returns: boolean
      }
      create_notification: {
        Args: {
          _entity_id?: string
          _entity_type?: string
          _link?: string
          _message?: string
          _title: string
          _type: Database["public"]["Enums"]["notification_type"]
          _user_id: string
        }
        Returns: string
      }
      evaluate_workflow_conditions: {
        Args: {
          _conditions: Json
          _entity_id: string
          _entity_type: Database["public"]["Enums"]["workflow_entity_type"]
        }
        Returns: boolean
      }
      generate_deadline_reminders: {
        Args: never
        Returns: {
          errors: string[]
          reminders_created: number
        }[]
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      process_assignment_queue: { Args: never; Returns: number }
      validate_status_transition: {
        Args: {
          _entity_id: string
          _entity_type: Database["public"]["Enums"]["workflow_entity_type"]
          _from_status: string
          _to_status: string
        }
        Returns: {
          allowed: boolean
          block_message: string
          rule_name: string
        }[]
      }
    }
    Enums: {
      address_type: "home" | "work" | "mailing" | "other"
      app_role:
        | "admin"
        | "attorney"
        | "paralegal"
        | "negotiator"
        | "case_manager"
        | "sales_rep"
        | "client_services_rep"
        | "payment_processor"
        | "correspondent"
        | "viewer"
        | "of_counsel"
        | "eligibility_reviewer"
      appearance_request_status:
        | "pending"
        | "approved"
        | "assigned"
        | "completed"
        | "cancelled"
      assignment_action:
        | "auto_assigned"
        | "manual_assigned"
        | "reassigned"
        | "unassigned"
        | "queue_added"
        | "queue_expired"
      assignment_method:
        | "round_robin"
        | "weighted"
        | "backlog_based"
        | "skillset_match"
      assignment_type:
        | "primary_attorney"
        | "litigation_attorney"
        | "client_services_rep"
        | "case_manager"
        | "negotiator"
        | "sales_rep"
      bank_account_type: "checking" | "savings"
      billing_entry_status: "draft" | "approved" | "invoiced" | "paid"
      billing_entry_type: "time" | "expense"
      client_relationship:
        | "primary_client"
        | "co_client"
        | "spouse"
        | "authorized_contact"
        | "other"
      client_status_enum: "active" | "inactive"
      communication_direction: "inbound" | "outbound"
      communication_type: "call" | "email" | "sms" | "meeting" | "note"
      company_type: "law_firm" | "affiliate" | "financing_company"
      contact_status_enum:
        | "reachable"
        | "hard_to_reach"
        | "unreachable"
        | "no_contact_allowed"
      creditor_type:
        | "original_creditor"
        | "collection_agency"
        | "law_firm"
        | "debt_buyer"
      data_visibility: "own_only" | "parent_and_own" | "full_hierarchy"
      department_new:
        | "administration"
        | "legal"
        | "negotiations"
        | "sales"
        | "client_services"
        | "operations"
        | "eligibility"
      employment_status:
        | "employed"
        | "unemployed"
        | "self_employed"
        | "retired"
        | "disabled"
      entity_type:
        | "engagement"
        | "case"
        | "liability"
        | "lead"
        | "litigation_matter"
      feature_request_category:
        | "workflow_gap"
        | "missing_field"
        | "ui_improvement"
        | "new_feature"
        | "integration"
        | "reporting"
        | "other"
      feature_request_priority: "critical" | "high" | "medium" | "low"
      feature_request_status:
        | "submitted"
        | "under_review"
        | "planned"
        | "in_progress"
        | "completed"
        | "declined"
      feature_request_type: "existing_workflow" | "future_improvement"
      fee_collection_method: "split" | "lump_sum"
      filing_fee_status:
        | "pending"
        | "submitted_to_client"
        | "approved"
        | "declined"
        | "paid"
      hardship_reason:
        | "job_loss"
        | "medical_emergency"
        | "divorce"
        | "reduced_income"
        | "business_failure"
        | "other"
      lead_interest: "debt_resolution" | "litigation" | "both"
      lead_source:
        | "web_form"
        | "referral"
        | "phone"
        | "advertisement"
        | "walk_in"
        | "other"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "converted"
        | "lost"
        | "intake"
        | "credit_review"
        | "plan_selection"
        | "qc_pending"
        | "docs_pending"
        | "eligibility_review"
      liability_status:
        | "enrolled"
        | "in_negotiation"
        | "settled"
        | "in_litigation"
        | "dismissed"
        | "cancelled"
      liability_type:
        | "credit_card"
        | "medical"
        | "auto_loan"
        | "personal_loan"
        | "student_loan"
        | "mortgage"
        | "other"
      litigation_status:
        | "new"
        | "pre_response"
        | "post_response"
        | "settled"
        | "dropped"
        | "judgment"
        | "declined"
        | "dismissed"
      notification_type:
        | "task_assigned"
        | "task_due_soon"
        | "task_overdue"
        | "lead_assigned"
        | "matter_assigned"
        | "hearing_reminder"
        | "settlement_update"
        | "mention"
        | "system_alert"
        | "response_deadline_reminder"
      payment_frequency_enum: "monthly" | "semi_monthly" | "bi_weekly"
      payment_status_enum:
        | "current"
        | "paused"
        | "nsf"
        | "past_due"
        | "suspended"
      payment_type: "lump_sum" | "payment_plan"
      phone_type: "mobile" | "home" | "work" | "fax" | "other"
      plan_type: "glg_standard" | "glg_adjustable" | "glg_exception"
      queue_status: "pending" | "assigned" | "expired" | "manual"
      reminder_status: "pending" | "sent" | "failed" | "skipped"
      reminder_type: "response_deadline" | "hearing" | "task_due"
      retention_type_enum:
        | "client_requested_cancel"
        | "company_initiated_cancel"
        | "at_risk"
        | "churn_risk"
        | "complaint"
      schedule_status_enum: "active" | "paused" | "completed" | "cancelled"
      service_status:
        | "prospect"
        | "active"
        | "suspended"
        | "closed"
        | "pending"
        | "graduated"
        | "dropped"
        | "cancelled"
      service_type: "debt_resolution" | "consumer_defense"
      settlement_status:
        | "offered"
        | "accepted"
        | "rejected"
        | "completed"
        | "defaulted"
        | "cancelled"
      signature_request_status:
        | "draft"
        | "queued"
        | "sent"
        | "viewed"
        | "partially_signed"
        | "completed"
        | "declined"
        | "expired"
        | "canceled"
        | "error"
      signer_status: "pending" | "sent" | "viewed" | "signed" | "declined"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "pending" | "in_progress" | "completed" | "cancelled"
      task_type:
        | "follow_up"
        | "document_review"
        | "court_deadline"
        | "settlement_negotiation"
        | "client_call"
        | "general"
      template_language: "en" | "es"
      template_type: "email" | "sms" | "document"
      transaction_status: "open" | "pending" | "cleared" | "cancelled"
      transaction_type:
        | "draft"
        | "processor_fee"
        | "settlement_payment"
        | "contingency_fee"
      workflow_action_type:
        | "create_task"
        | "send_notification"
        | "update_field"
        | "block_transition"
        | "trigger_webhook"
      workflow_entity_type:
        | "leads"
        | "client_services"
        | "liabilities"
        | "litigation_matters"
        | "tasks"
        | "settlements"
      workflow_execution_status: "success" | "blocked" | "failed" | "skipped"
      workflow_trigger_type:
        | "status_changed"
        | "field_updated"
        | "record_created"
        | "time_based"
        | "manual"
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
      address_type: ["home", "work", "mailing", "other"],
      app_role: [
        "admin",
        "attorney",
        "paralegal",
        "negotiator",
        "case_manager",
        "sales_rep",
        "client_services_rep",
        "payment_processor",
        "correspondent",
        "viewer",
        "of_counsel",
        "eligibility_reviewer",
      ],
      appearance_request_status: [
        "pending",
        "approved",
        "assigned",
        "completed",
        "cancelled",
      ],
      assignment_action: [
        "auto_assigned",
        "manual_assigned",
        "reassigned",
        "unassigned",
        "queue_added",
        "queue_expired",
      ],
      assignment_method: [
        "round_robin",
        "weighted",
        "backlog_based",
        "skillset_match",
      ],
      assignment_type: [
        "primary_attorney",
        "litigation_attorney",
        "client_services_rep",
        "case_manager",
        "negotiator",
        "sales_rep",
      ],
      bank_account_type: ["checking", "savings"],
      billing_entry_status: ["draft", "approved", "invoiced", "paid"],
      billing_entry_type: ["time", "expense"],
      client_relationship: [
        "primary_client",
        "co_client",
        "spouse",
        "authorized_contact",
        "other",
      ],
      client_status_enum: ["active", "inactive"],
      communication_direction: ["inbound", "outbound"],
      communication_type: ["call", "email", "sms", "meeting", "note"],
      company_type: ["law_firm", "affiliate", "financing_company"],
      contact_status_enum: [
        "reachable",
        "hard_to_reach",
        "unreachable",
        "no_contact_allowed",
      ],
      creditor_type: [
        "original_creditor",
        "collection_agency",
        "law_firm",
        "debt_buyer",
      ],
      data_visibility: ["own_only", "parent_and_own", "full_hierarchy"],
      department_new: [
        "administration",
        "legal",
        "negotiations",
        "sales",
        "client_services",
        "operations",
        "eligibility",
      ],
      employment_status: [
        "employed",
        "unemployed",
        "self_employed",
        "retired",
        "disabled",
      ],
      entity_type: [
        "engagement",
        "case",
        "liability",
        "lead",
        "litigation_matter",
      ],
      feature_request_category: [
        "workflow_gap",
        "missing_field",
        "ui_improvement",
        "new_feature",
        "integration",
        "reporting",
        "other",
      ],
      feature_request_priority: ["critical", "high", "medium", "low"],
      feature_request_status: [
        "submitted",
        "under_review",
        "planned",
        "in_progress",
        "completed",
        "declined",
      ],
      feature_request_type: ["existing_workflow", "future_improvement"],
      fee_collection_method: ["split", "lump_sum"],
      filing_fee_status: [
        "pending",
        "submitted_to_client",
        "approved",
        "declined",
        "paid",
      ],
      hardship_reason: [
        "job_loss",
        "medical_emergency",
        "divorce",
        "reduced_income",
        "business_failure",
        "other",
      ],
      lead_interest: ["debt_resolution", "litigation", "both"],
      lead_source: [
        "web_form",
        "referral",
        "phone",
        "advertisement",
        "walk_in",
        "other",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "converted",
        "lost",
        "intake",
        "credit_review",
        "plan_selection",
        "qc_pending",
        "docs_pending",
        "eligibility_review",
      ],
      liability_status: [
        "enrolled",
        "in_negotiation",
        "settled",
        "in_litigation",
        "dismissed",
        "cancelled",
      ],
      liability_type: [
        "credit_card",
        "medical",
        "auto_loan",
        "personal_loan",
        "student_loan",
        "mortgage",
        "other",
      ],
      litigation_status: [
        "new",
        "pre_response",
        "post_response",
        "settled",
        "dropped",
        "judgment",
        "declined",
        "dismissed",
      ],
      notification_type: [
        "task_assigned",
        "task_due_soon",
        "task_overdue",
        "lead_assigned",
        "matter_assigned",
        "hearing_reminder",
        "settlement_update",
        "mention",
        "system_alert",
        "response_deadline_reminder",
      ],
      payment_frequency_enum: ["monthly", "semi_monthly", "bi_weekly"],
      payment_status_enum: [
        "current",
        "paused",
        "nsf",
        "past_due",
        "suspended",
      ],
      payment_type: ["lump_sum", "payment_plan"],
      phone_type: ["mobile", "home", "work", "fax", "other"],
      plan_type: ["glg_standard", "glg_adjustable", "glg_exception"],
      queue_status: ["pending", "assigned", "expired", "manual"],
      reminder_status: ["pending", "sent", "failed", "skipped"],
      reminder_type: ["response_deadline", "hearing", "task_due"],
      retention_type_enum: [
        "client_requested_cancel",
        "company_initiated_cancel",
        "at_risk",
        "churn_risk",
        "complaint",
      ],
      schedule_status_enum: ["active", "paused", "completed", "cancelled"],
      service_status: [
        "prospect",
        "active",
        "suspended",
        "closed",
        "pending",
        "graduated",
        "dropped",
        "cancelled",
      ],
      service_type: ["debt_resolution", "consumer_defense"],
      settlement_status: [
        "offered",
        "accepted",
        "rejected",
        "completed",
        "defaulted",
        "cancelled",
      ],
      signature_request_status: [
        "draft",
        "queued",
        "sent",
        "viewed",
        "partially_signed",
        "completed",
        "declined",
        "expired",
        "canceled",
        "error",
      ],
      signer_status: ["pending", "sent", "viewed", "signed", "declined"],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["pending", "in_progress", "completed", "cancelled"],
      task_type: [
        "follow_up",
        "document_review",
        "court_deadline",
        "settlement_negotiation",
        "client_call",
        "general",
      ],
      template_language: ["en", "es"],
      template_type: ["email", "sms", "document"],
      transaction_status: ["open", "pending", "cleared", "cancelled"],
      transaction_type: [
        "draft",
        "processor_fee",
        "settlement_payment",
        "contingency_fee",
      ],
      workflow_action_type: [
        "create_task",
        "send_notification",
        "update_field",
        "block_transition",
        "trigger_webhook",
      ],
      workflow_entity_type: [
        "leads",
        "client_services",
        "liabilities",
        "litigation_matters",
        "tasks",
        "settlements",
      ],
      workflow_execution_status: ["success", "blocked", "failed", "skipped"],
      workflow_trigger_type: [
        "status_changed",
        "field_updated",
        "record_created",
        "time_based",
        "manual",
      ],
    },
  },
} as const
