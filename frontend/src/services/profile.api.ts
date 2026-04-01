import { api } from "@/lib/axios";

export type ProfileSummaryResponse = {
  user: {
    id: number;
    full_name: string;
    unique_code: string;
    username?: string | null;
    shift_number: string | null;
    is_active: boolean;
  };
  employee_profile: {
    first_name: string;
    last_name: string;
    phone: string | null;
    address: string | null;
    position: string | null;
    department: string | null;
    hire_date: string | null;
    iban: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  documents_summary: {
    total_documents: number;
    personal_documents: number;
    company_documents: number;
    has_contract: boolean;
    has_payslip: boolean;
    has_driver_license: boolean;
  };
};

export async function getMyProfileSummary(code: string) {
  const { data } = await api.get<ProfileSummaryResponse>(
    `/employee-profiles/summary/me/${code}`
  );
  return data;
}

export async function updateMyProfile(
  code: string,
  payload: {
    username?: string | null;
    pin?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    address?: string | null;
    position?: string | null;
    department?: string | null;
    hire_date?: string | null;
    iban?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
  }
) {
  await api.put(`/employee-profiles/me/${code}`, payload);
}