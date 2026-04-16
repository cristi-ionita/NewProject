import { api } from "@/lib/axios";

export type DocumentType =
  | "contract"
  | "payslip"
  | "driver_license"
  | "personal"
  | "company";

export type DocumentStatus = "valid" | "expired" | "pending";

export type DocumentItem = {
  id: number;
  user_id: number;
  uploaded_by: number | null;
  type: DocumentType;
  category: string;
  status: DocumentStatus;
  file_name: string;
  mime_type: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

// ========================
// 🔐 User header helper
// ========================
function buildUserHeaders(userCode: string) {
  return {
    "X-User-Code": userCode,
  };
}

// ========================
// 📄 Admin endpoints
// ========================

export async function getUserDocuments(userId: number): Promise<DocumentItem[]> {
  const { data } = await api.get<DocumentItem[]>(
    `/documents/admin/user/${userId}`
  );

  return data;
}

export async function adminUploadDocument(
  userId: number,
  formData: FormData
): Promise<DocumentItem> {
  const { data } = await api.post<DocumentItem>(
    `/documents/admin/upload/${userId}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return data;
}

export async function adminDeleteDocument(documentId: number): Promise<void> {
  await api.delete(`/documents/admin/${documentId}`);
}

export async function adminDownloadDocumentFile(
  documentId: number
): Promise<Blob> {
  const response = await api.get(`/documents/admin/${documentId}/download`, {
    responseType: "blob",
  });

  return response.data;
}

// ========================
// 👤 User endpoints
// ========================

export async function getMyDocuments(
  userCode: string
): Promise<DocumentItem[]> {
  const { data } = await api.get<DocumentItem[]>(`/documents/me`, {
    headers: buildUserHeaders(userCode),
  });

  return data;
}

export async function uploadMyDocument(
  userCode: string,
  formData: FormData
): Promise<DocumentItem> {
  const { data } = await api.post<DocumentItem>(
    `/documents/upload`,
    formData,
    {
      headers: {
        ...buildUserHeaders(userCode),
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return data;
}

export async function deleteMyDocument(
  documentId: number,
  userCode: string
): Promise<void> {
  await api.delete(`/documents/me/${documentId}`, {
    headers: buildUserHeaders(userCode),
  });
}

export async function myDownloadDocumentFile(
  documentId: number,
  userCode: string
): Promise<Blob> {
  const response = await api.get(`/documents/${documentId}/download`, {
    headers: buildUserHeaders(userCode),
    responseType: "blob",
  });

  return response.data;
}