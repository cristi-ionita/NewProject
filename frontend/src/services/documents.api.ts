import { api } from "@/lib/axios";

export type DocumentItem = {
  id: number;
  user_id: number;
  uploaded_by: number | null;
  type: string;
  category: string;
  status: string;
  file_name: string;
  mime_type: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getUserDocuments(userId: number) {
  const { data } = await api.get<DocumentItem[]>(`/documents/admin/user/${userId}`);
  return data;
}

export async function adminUploadDocument(userId: number, formData: FormData) {
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

export async function adminDeleteDocument(documentId: number) {
  await api.delete(`/documents/admin/${documentId}`);
}

export async function adminDownloadDocumentFile(documentId: number) {
  const response = await api.get(`/documents/admin/${documentId}/download`, {
    responseType: "blob",
  });

  return response;
}

export async function getMyDocuments(code: string) {
  const { data } = await api.get<DocumentItem[]>(`/documents/me/${code}`);
  return data;
}

export async function uploadMyDocument(code: string, formData: FormData) {
  const { data } = await api.post<DocumentItem>(
    `/documents/upload/${code}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return data;
}

export async function deleteMyDocument(documentId: number, code: string) {
  await api.delete(`/documents/me/${documentId}/${code}`);
}

export async function myDownloadDocumentFile(documentId: number, code: string) {
  const response = await api.get(`/documents/${documentId}/download/${code}`, {
    responseType: "blob",
  });

  return response;
}