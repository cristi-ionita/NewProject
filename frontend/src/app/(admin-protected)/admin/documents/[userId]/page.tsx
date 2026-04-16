"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  adminDeleteDocument,
  adminDownloadDocumentFile,
  adminUploadDocument,
  type DocumentItem,
  getUserDocuments,
} from "@/services/documents.api";
import { listUsers, type UserItem } from "@/services/users.api";
import { useI18n } from "@/lib/i18n/use-i18n";
import ConfirmDialog from "@/components/confirm-dialog";
import { isApiClientError } from "@/lib/axios";
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  Trash2,
  Upload,
} from "lucide-react";

import PageHero from "@/components/ui/page-hero";
import SectionCard from "@/components/ui/section-card";
import LoadingCard from "@/components/ui/loading-card";
import ErrorAlert from "@/components/ui/error-alert";
import EmptyState from "@/components/ui/empty-state";

function normalize(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

type DocumentTypeKey = "ID_CARD" | "DRIVER_LICENSE" | "CONTRACT";

const DOCUMENT_TYPES: DocumentTypeKey[] = [
  "ID_CARD",
  "DRIVER_LICENSE",
  "CONTRACT",
];

export default function AdminUserDocumentsPage() {
  const params = useParams();
  const { locale } = useI18n();

  const userId = Number(params.userId);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(
    null
  );

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  function getTypeLabel(type: DocumentTypeKey) {
    if (type === "ID_CARD") {
      return text({
        ro: "Carte de identitate",
        en: "ID card",
        de: "Personalausweis",
      });
    }

    if (type === "DRIVER_LICENSE") {
      return text({
        ro: "Permis de conducere",
        en: "Driver license",
        de: "Führerschein",
      });
    }

    return text({
      ro: "Contract",
      en: "Contract",
      de: "Vertrag",
    });
  }

  function handleError(err: unknown) {
    if (isApiClientError(err)) {
      setError(err.message);
      return;
    }

    setError(
      text({
        ro: "A apărut o eroare neașteptată.",
        en: "Unexpected error.",
        de: "Unerwarteter Fehler.",
      })
    );
  }

  async function loadData() {
    if (!userId || Number.isNaN(userId)) return;

    try {
      setLoading(true);
      setError("");

      const [docs, loadedUsers] = await Promise.all([
        getUserDocuments(userId),
        listUsers(),
      ]);

      setDocuments(docs);
      setUsers(loadedUsers);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [userId]);

  const user = useMemo(
    () => users.find((item) => item.id === userId) || null,
    [users, userId]
  );

  function getDocument(type: string) {
    return (
      documents.find((item) => normalize(item.type) === normalize(type)) || null
    );
  }

  async function handleDownload(file: DocumentItem, view?: boolean) {
    try {
      const blob = await adminDownloadDocumentFile(file.id);
      const url = URL.createObjectURL(blob);

      if (view) {
        window.open(url, "_blank");
      } else {
        const link = window.document.createElement("a");
        link.href = url;
        link.download = file.file_name;
        link.click();
      }

      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      handleError(err);
    }
  }

  async function handleUpload(type: string, file: File | null) {
    if (!file) return;

    try {
      setSavingKey(type);
      setError("");

      const formData = new FormData();
      formData.append("type", type);
      formData.append("category", "COMPANY");
      formData.append("file", file);

      await adminUploadDocument(userId, formData);
      await loadData();
    } catch (err) {
      handleError(err);
    } finally {
      setSavingKey(null);
    }
  }

  function openDeleteModal(doc: DocumentItem) {
    setDocumentToDelete(doc);
    setDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    if (deletingId !== null) return;
    setDeleteModalOpen(false);
    setDocumentToDelete(null);
  }

  async function handleDeleteConfirm() {
    if (!documentToDelete) return;

    try {
      setDeletingId(documentToDelete.id);
      setError("");

      await adminDeleteDocument(documentToDelete.id);
      await loadData();

      setDeleteModalOpen(false);
      setDocumentToDelete(null);
    } catch (err) {
      handleError(err);
    } finally {
      setDeletingId(null);
    }
  }

  const deleteMessage = documentToDelete
    ? text({
        ro: `Sigur vrei să ștergi documentul ${documentToDelete.file_name}?`,
        en: `Are you sure you want to delete the document ${documentToDelete.file_name}?`,
        de: `Möchtest du das Dokument ${documentToDelete.file_name} wirklich löschen?`,
      })
    : "";

  if (loading) {
    return <LoadingCard />;
  }

  return (
    <>
      <div className="space-y-6">
        <PageHero
          icon={<FileText className="h-7 w-7" />}
          title={
            user?.full_name ||
            text({
              ro: "Documente utilizator",
              en: "User documents",
              de: "Benutzerdokumente",
            })
          }
          description={text({
            ro: "Gestionează documentele importante ale utilizatorului.",
            en: "Manage the user's important documents.",
            de: "Verwalte die wichtigen Dokumente des Benutzers.",
          })}
          actions={
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(0,0,0,0.25)] transition-all duration-200 hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
              {text({
                ro: "Înapoi",
                en: "Back",
                de: "Zurück",
              })}
            </Link>
          }
        />

        {error ? <ErrorAlert message={error} /> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {DOCUMENT_TYPES.map((type) => {
            const doc = getDocument(type);
            const isSaving = savingKey === type;

            return (
              <SectionCard
                key={type}
                title={getTypeLabel(type)}
                icon={<FileText className="h-4.5 w-4.5" />}
              >
                <div className="space-y-4">
                  <div>
                    {doc ? (
                      <>
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {doc.file_name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {text({
                            ro: "Document încărcat",
                            en: "Document uploaded",
                            de: "Dokument hochgeladen",
                          })}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-slate-950">
                          {text({
                            ro: "Fără document",
                            en: "No document",
                            de: "Kein Dokument",
                          })}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {text({
                            ro: "Încarcă un fișier pentru acest tip.",
                            en: "Upload a file for this type.",
                            de: "Lade eine Datei für diesen Typ hoch.",
                          })}
                        </p>
                      </>
                    )}
                  </div>

                  {doc ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownload(doc, true)}
                        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800"
                      >
                        <Eye className="h-4 w-4" />
                        {text({
                          ro: "Vezi",
                          en: "View",
                          de: "Ansehen",
                        })}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50"
                      >
                        <Download className="h-4 w-4" />
                        {text({
                          ro: "Descarcă",
                          en: "Download",
                          de: "Herunterladen",
                        })}
                      </button>

                      <button
                        type="button"
                        onClick={() => openDeleteModal(doc)}
                        disabled={deletingId === doc.id}
                        className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-all duration-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        {text({
                          ro: "Șterge",
                          en: "Delete",
                          de: "Löschen",
                        })}
                      </button>
                    </div>
                  ) : null}

                  <div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800">
                      <Upload className="h-4 w-4" />
                      {isSaving
                        ? "..."
                        : text({
                            ro: "Încarcă fișier",
                            en: "Upload file",
                            de: "Datei hochladen",
                          })}

                      <input
                        type="file"
                        className="hidden"
                        onChange={(event) =>
                          handleUpload(type, event.target.files?.[0] || null)
                        }
                        disabled={isSaving}
                      />
                    </label>
                  </div>
                </div>
              </SectionCard>
            );
          })}
        </section>

        {!documents.length ? (
          <EmptyState
            title={text({
              ro: "Nu există documente încărcate momentan.",
              en: "No uploaded documents yet.",
              de: "Noch keine Dokumente hochgeladen.",
            })}
          />
        ) : null}
      </div>

      <ConfirmDialog
        open={deleteModalOpen}
        title={text({
          ro: "Ștergere document",
          en: "Delete document",
          de: "Dokument löschen",
        })}
        message={deleteMessage}
        confirmText={text({
          ro: "Șterge",
          en: "Delete",
          de: "Löschen",
        })}
        cancelText={text({
          ro: "Anulează",
          en: "Cancel",
          de: "Abbrechen",
        })}
        loading={Boolean(deletingId)}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
      />
    </>
  );
}