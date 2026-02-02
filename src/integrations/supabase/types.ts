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
          last_name: string
          lead_number: string
          lost_at: string | null
          monthly_income: number | null
          new_at: string | null
          notes: string | null
          number_of_debts: number | null
          opposing_party: string | null
          originating_company_id: string | null
          phone: string | null
          qualified_at: string | null
          response_deadline: string | null
          secured_credit_resolved: boolean | null
          service_date: string | null
          source: Database["public"]["Enums"]["lead_source"]
          ssn_last4_encrypted: string | null
          state: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
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
          last_name: string
          lead_number: string
          lost_at?: string | null
          monthly_income?: number | null
          new_at?: string | null
          notes?: string | null
          number_of_debts?: number | null
          opposing_party?: string | null
          originating_company_id?: string | null
          phone?: string | null
          qualified_at?: string | null
          response_deadline?: string | null
          secured_credit_resolved?: boolean | null
          service_date?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          ssn_last4_encrypted?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
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
          last_name?: string
          lead_number?: string
          lost_at?: string | null
          monthly_income?: number | null
          new_at?: string | null
          notes?: string | null
          number_of_debts?: number | null
          opposing_party?: string | null
          originating_company_id?: string | null
          phone?: string | null
          qualified_at?: string | null
          response_deadline?: string | null
          secured_credit_resolved?: boolean | null
          service_date?: string | null
          source?: Database["public"]["Enums"]["lead_source"]
          ssn_last4_encrypted?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
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
          opposing_counsel: string | null
          opposing_counsel_id: string | null
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
          opposing_counsel?: string | null
          opposing_counsel_id?: string | null
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
          opposing_counsel?: string | null
          opposing_counsel_id?: string | null
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
            foreignKeyName: "litigation_matters_opposing_counsel_id_fkey"
            columns: ["opposing_counsel_id"]
            isOneToOne: false
            referencedRelation: "law_firm_contacts"
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
      staff: {
        Row: {
          avatar_url: string | null
          company_id: string
          created_at: string
          department: Database["public"]["Enums"]["department"]
          email: string
          first_name: string
          id: string
          is_active: boolean
          job_title: string | null
          last_name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          company_id: string
          created_at?: string
          department: Database["public"]["Enums"]["department"]
          email: string
          first_name: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          last_name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string
          created_at?: string
          department?: Database["public"]["Enums"]["department"]
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          job_title?: string | null
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
      transactions: {
        Row: {
          amount: number
          client_service_id: string
          created_at: string
          description: string | null
          error_message: string | null
          external_id: string | null
          id: string
          liability_id: string | null
          parent_transaction_id: string | null
          processed_at: string | null
          processor_id: string | null
          scheduled_date: string | null
          sequence_number: number | null
          settlement_id: string | null
          status: string
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
          liability_id?: string | null
          parent_transaction_id?: string | null
          processed_at?: string | null
          processor_id?: string | null
          scheduled_date?: string | null
          sequence_number?: number | null
          settlement_id?: string | null
          status?: string
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
          liability_id?: string | null
          parent_transaction_id?: string | null
          processed_at?: string | null
          processor_id?: string | null
          scheduled_date?: string | null
          sequence_number?: number | null
          settlement_id?: string | null
          status?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_company: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      assignment_type:
        | "primary_attorney"
        | "litigation_attorney"
        | "client_services_rep"
        | "case_manager"
        | "negotiator"
        | "sales_rep"
      bank_account_type: "checking" | "savings"
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
      department:
        | "admin"
        | "sales_intake"
        | "client_services"
        | "attorney"
        | "case_manager"
        | "negotiations"
        | "payment_processing"
        | "correspondence"
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
      fee_collection_method: "split" | "lump_sum"
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
      payment_status_enum:
        | "current"
        | "paused"
        | "nsf"
        | "past_due"
        | "suspended"
      payment_type: "lump_sum" | "payment_plan"
      phone_type: "mobile" | "home" | "work" | "fax" | "other"
      plan_type: "glg_standard" | "glg_adjustable" | "glg_exception"
      retention_type_enum:
        | "client_requested_cancel"
        | "company_initiated_cancel"
        | "at_risk"
        | "churn_risk"
        | "complaint"
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
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "pending" | "in_progress" | "completed" | "cancelled"
      task_type:
        | "follow_up"
        | "document_review"
        | "court_deadline"
        | "settlement_negotiation"
        | "client_call"
        | "general"
      transaction_status: "open" | "pending" | "cleared" | "cancelled"
      transaction_type:
        | "draft"
        | "processor_fee"
        | "settlement_payment"
        | "contingency_fee"
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
      department: [
        "admin",
        "sales_intake",
        "client_services",
        "attorney",
        "case_manager",
        "negotiations",
        "payment_processing",
        "correspondence",
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
      fee_collection_method: ["split", "lump_sum"],
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
      retention_type_enum: [
        "client_requested_cancel",
        "company_initiated_cancel",
        "at_risk",
        "churn_risk",
        "complaint",
      ],
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
      transaction_status: ["open", "pending", "cleared", "cancelled"],
      transaction_type: [
        "draft",
        "processor_fee",
        "settlement_payment",
        "contingency_fee",
      ],
    },
  },
} as const
