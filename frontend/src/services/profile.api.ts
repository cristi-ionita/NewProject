import { api } from "@/lib/axios";

export type ProfileSummaryUser = {
  id: number;
  full_name: string;
  unique_code: string;
  username?: string | null;
  shift_number: string | null;
  is_active: boolean;
};

export type ProfileSummaryEmployeeProfile = {
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
};

export type ProfileSummaryDocuments = {
  total_documents: number;
  personal_documents: number;
  company_documents: number;
  has_contract: boolean;
  has_payslip: boolean;
  has_driver_license: boolean;
};

export type ProfileSummaryResponse = {
  user: ProfileSummaryUser;
  employee_profile: ProfileSummaryEmployeeProfile | null;
  documents_summary: ProfileSummaryDocuments;
};

export type UpdateMyProfilePayload = {
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
};

export async function getMyProfileSummary(
  code: string
): Promise<ProfileSummaryResponse> {
  const { data } = await api.get<ProfileSummaryResponse>(
    `/employee-profiles/summary/me/${code}`
  );

  return data;
}

export async function updateMyProfile(
  code: string,
  payload: UpdateMyProfilePayload
): Promise<void> {
  await api.put(`/employee-profiles/me/${code}`, payload);
}