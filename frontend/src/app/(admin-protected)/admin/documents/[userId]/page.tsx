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

type DocumentCardConfig = {
  type: string;
  label: {
    ro: string;
    en: string;
    de: string;
  };
  category?: string;
  uploadableByAdmin: boolean;
  replaceOnUpload?: boolean;
  allowDelete?: boolean;
  isList?: boolean;
};

const DOCUMENT_CARDS: DocumentCardConfig[] = [
  {
    type: "ID_CARD",
    label: {
      ro: "Carte de identitate / Pașaport",
      en: "ID / Passport",
      de: "Ausweis / Reisepass",
    },
    uploadableByAdmin: false,
    allowDelete: false,
  },
  {
    type: "DRIVER_LICENSE",
    label: {
      ro: "Permis de conducere",
      en: "Driver license",
      de: "Führerschein",
    },
    uploadableByAdmin: false,
    allowDelete: false,
  },
  {
    type: "CONTRACT",
    label: {
      ro: "Contract",
      en: "Contract",
      de: "Vertrag",
    },
    category: "COMPANY",
    uploadableByAdmin: true,
    replaceOnUpload: true,
    allowDelete: true,
  },
  {
    type: "OTHER",
    label: {
      ro: "Alte documente",
      en: "Other documents",
      de: "Andere Dokumente",
    },
    uploadableByAdmin: false,
    allowDelete: true,
    isList: true,
  },
];

function normalize(value: string | undefined | null) {
  return (value || "").trim().toLowerCase();
}

function extractErrorMessage(error: unknown): string {
  const err = error as {
    response?: {
      data?: {
        detail?: string | Array<{ msg?: string }> | { msg?: string };
      };
    };
  };

  const detail = err?.response?.data?.detail;

  if (!detail) return "Failed to load documents.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => item?.msg || "Error").join(", ");
  if (typeof detail === "object") return detail.msg || "Error";

  return "Failed to load documents.";
}

export default function AdminUserDocumentsPage() {
  const params = useParams();
  const { locale, t } = useI18n();

  const userId = Number(params.userId);

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  function formatDate(value?: string | null) {
    if (!value) return "—";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(
      locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    ).format(date);
  }

  async function loadPageData() {
    try {
      setLoading(true);
      setError("");

      const [documentsData, usersData] = await Promise.all([
        getUserDocuments(userId),
        listUsers(),
      ]);

      setDocuments(documentsData);
      setUsers(usersData);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!userId || Number.isNaN(userId)) return;
    loadPageData();
  }, [userId]);

  function getDocument(type: string) {
    return documents.find((doc) => normalize(doc.type) === normalize(type)) || null;
  }

  function getDocuments(type: string) {
    return documents.filter((doc) => normalize(doc.type) === normalize(type));
  }

  const payslips = useMemo(() => getDocuments("PAYSLIP"), [documents]);
  const user = useMemo(
    () => users.find((item) => item.id === userId) || null,
    [users, userId]
  );

  function getStatusBadgeClass(status: string) {
    const normalized = normalize(status);

    if (normalized === "active") {
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (normalized === "expired") {
      return "border border-red-200 bg-red-50 text-red-700";
    }

    return "border border-slate-200 bg-slate-100 text-slate-700";
  }

  function getStatusLabel(status: string) {
    const normalized = normalize(status);

    if (normalized === "active") {
      return text({ ro: "Activ", en: "Active", de: "Aktiv" });
    }

    if (normalized === "expired") {
      return text({ ro: "Expirat", en: "Expired", de: "Abgelaufen" });
    }

    return status;
  }

  async function handleView(document: DocumentItem) {
    try {
      setError("");

      const response = await adminDownloadDocumentFile(document.id);
      const blob = new Blob([response.data], {
        type: document.mime_type || "application/octet-stream",
      });

      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 10000);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  async function handleDownload(document: DocumentItem) {
    try {
      setError("");

      const response = await adminDownloadDocumentFile(document.id);
      const blob = new Blob([response.data], {
        type: document.mime_type || "application/octet-stream",
      });

      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = document.file_name;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  async function handleSingleDocumentUpload(
    type: string,
    category: string | undefined,
    file: File | null,
    replaceOnUpload?: boolean
  ) {
    if (!file) return;

    const existingDocument = getDocument(type);

    try {
      setSavingKey(type);
      setError("");

      if (replaceOnUpload && existingDocument) {
        await adminDeleteDocument(existingDocument.id);
      }

      const formData = new FormData();
      formData.append("type", type);
      formData.append("category", category || "COMPANY");
      formData.append("file", file);

      await adminUploadDocument(userId, formData);
      await loadPageData();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSavingKey(null);
    }
  }

  async function handlePayslipUpload(file: File | null) {
    if (!file) return;

    try {
      setSavingKey("PAYSLIP");
      setError("");

      const formData = new FormData();
      formData.append("type", "PAYSLIP");
      formData.append("category", "COMPANY");
      formData.append("file", file);

      await adminUploadDocument(userId, formData);
      await loadPageData();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSavingKey(null);
    }
  }

  function openDeleteModal(document: DocumentItem) {
    setDocumentToDelete(document);
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
      await loadPageData();
      setDeleteModalOpen(false);
      setDocumentToDelete(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  const isDeletingCurrent =
    documentToDelete !== null && deletingId === documentToDelete.id;

  return (
    <>
      <div className="space-y-6 text-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div className="page-header mb-0">
            <h1 className="page-title">
              {user?.full_name ||
                text({
                  ro: "Documente angajat",
                  en: "Employee documents",
                  de: "Mitarbeiterdokumente",
                })}
            </h1>

            <p className="page-description">
              {text({
                ro: "Vizualizează, descarcă, încarcă sau șterge documente administrative.",
                en: "View, download, upload, or delete administrative documents.",
                de: "Administrative Dokumente anzeigen, herunterladen, hochladen oder löschen.",
              })}
            </p>
          </div>

          <Link href="/admin/users" className="btn-secondary shrink-0">
            {text({
              ro: "Înapoi",
              en: "Back",
              de: "Zurück",
            })}
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="section-card">
            <p className="text-sm text-slate-500">{t("common", "loading")}</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
              {DOCUMENT_CARDS.map((card) => {
                const isSaving = savingKey === card.type;

                if (card.isList) {
                  const list = getDocuments(card.type);

                  return (
                    <article key={card.type} className="section-card">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                            {text({ ro: "Documente", en: "Documents", de: "Dokumente" })}
                          </p>
                          <h2 className="mt-2 text-lg font-semibold text-slate-900">
                            {card.label[locale]}
                          </h2>
                        </div>

                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {list.length}{" "}
                          {text({
                            ro: list.length === 1 ? "fișier" : "fișiere",
                            en: list.length === 1 ? "file" : "files",
                            de: list.length === 1 ? "Datei" : "Dateien",
                          })}
                        </span>
                      </div>

                      {list.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          {text({
                            ro: "Nu există alte documente încărcate.",
                            en: "There are no other uploaded documents.",
                            de: "Es gibt keine weiteren hochgeladenen Dokumente.",
                          })}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {list.map((document) => {
                            const isDeleting = deletingId === document.id;

                            return (
                              <div
                                key={document.id}
                                className="rounded-2xl border border-slate-200 p-4"
                              >
                                <div className="mb-3 flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="break-words font-medium text-slate-900">
                                      {document.file_name}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-500">
                                      {text({
                                        ro: "Creat",
                                        en: "Created",
                                        de: "Erstellt",
                                      })}
                                      : {formatDate(document.created_at)}
                                    </p>
                                  </div>

                                  <span
                                    className={[
                                      "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                                      getStatusBadgeClass(document.status),
                                    ].join(" ")}
                                  >
                                    {getStatusLabel(document.status)}
                                  </span>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleView(document)}
                                    className="btn-secondary"
                                  >
                                    {text({
                                      ro: "Vezi",
                                      en: "View",
                                      de: "Ansehen",
                                    })}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDownload(document)}
                                    className="btn-primary"
                                  >
                                    {text({
                                      ro: "Descarcă",
                                      en: "Download",
                                      de: "Herunterladen",
                                    })}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openDeleteModal(document)}
                                    disabled={isDeleting}
                                    className="btn-secondary disabled:opacity-60"
                                  >
                                    {isDeleting
                                      ? text({
                                          ro: "Se șterge...",
                                          en: "Deleting...",
                                          de: "Wird gelöscht...",
                                        })
                                      : text({
                                          ro: "Șterge",
                                          en: "Delete",
                                          de: "Löschen",
                                        })}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </article>
                  );
                }

                const document = getDocument(card.type);
                const isDeleting = deletingId === document?.id;

                return (
                  <article key={card.type} className="section-card">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                          {text({ ro: "Document", en: "Document", de: "Dokument" })}
                        </p>
                        <h2 className="mt-2 text-lg font-semibold text-slate-900">
                          {card.label[locale]}
                        </h2>
                      </div>

                      {document ? (
                        <span
                          className={[
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                            getStatusBadgeClass(document.status),
                          ].join(" ")}
                        >
                          {getStatusLabel(document.status)}
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                          {text({
                            ro: "Lipsește",
                            en: "Missing",
                            de: "Fehlt",
                          })}
                        </span>
                      )}
                    </div>

                    {document ? (
                      <div className="space-y-2 text-sm">
                        <p>
                          <span className="text-slate-500">
                            {text({ ro: "Fișier", en: "File", de: "Datei" })}:
                          </span>{" "}
                          <span className="break-words font-medium text-slate-900">
                            {document.file_name}
                          </span>
                        </p>

                        <p>
                          <span className="text-slate-500">
                            {text({ ro: "Tip", en: "Type", de: "Typ" })}:
                          </span>{" "}
                          <span className="text-slate-900">{document.type}</span>
                        </p>

                        <p>
                          <span className="text-slate-500">
                            {text({ ro: "Categorie", en: "Category", de: "Kategorie" })}:
                          </span>{" "}
                          <span className="text-slate-900">{document.category}</span>
                        </p>

                        <p>
                          <span className="text-slate-500">
                            {text({ ro: "Expiră", en: "Expires", de: "Läuft ab" })}:
                          </span>{" "}
                          <span className="text-slate-900">
                            {document.expires_at ? formatDate(document.expires_at) : "—"}
                          </span>
                        </p>

                        <p>
                          <span className="text-slate-500">
                            {text({ ro: "Creat", en: "Created", de: "Erstellt" })}:
                          </span>{" "}
                          <span className="text-slate-900">{formatDate(document.created_at)}</span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        {text({
                          ro: "Nu există document încă.",
                          en: "No document uploaded yet.",
                          de: "Noch kein Dokument hochgeladen.",
                        })}
                      </p>
                    )}

                    <div className="mt-5 space-y-3">
                      {document ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleView(document)}
                            className="btn-secondary"
                          >
                            {text({
                              ro: "Vezi",
                              en: "View",
                              de: "Ansehen",
                            })}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownload(document)}
                            className="btn-primary"
                          >
                            {text({
                              ro: "Descarcă",
                              en: "Download",
                              de: "Herunterladen",
                            })}
                          </button>

                          {card.allowDelete ? (
                            <button
                              type="button"
                              onClick={() => openDeleteModal(document)}
                              disabled={isDeleting}
                              className="btn-secondary disabled:opacity-60"
                            >
                              {isDeleting
                                ? text({
                                    ro: "Se șterge...",
                                    en: "Deleting...",
                                    de: "Wird gelöscht...",
                                  })
                                : text({
                                    ro: "Șterge",
                                    en: "Delete",
                                    de: "Löschen",
                                  })}
                            </button>
                          ) : null}
                        </div>
                      ) : null}

                      {card.uploadableByAdmin ? (
                        <label className="block">
                          <span className="label">
                            {document
                              ? text({
                                  ro: "Înlocuiește fișierul",
                                  en: "Replace file",
                                  de: "Datei ersetzen",
                                })
                              : text({
                                  ro: "Încarcă fișier",
                                  en: "Upload file",
                                  de: "Datei hochladen",
                                })}
                          </span>

                          <input
                            type="file"
                            onChange={(e) =>
                              handleSingleDocumentUpload(
                                card.type,
                                card.category,
                                e.target.files?.[0] || null,
                                card.replaceOnUpload
                              )
                            }
                            disabled={isSaving}
                            className="block w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-60"
                          />
                        </label>
                      ) : null}

                      {isSaving ? (
                        <p className="text-xs text-slate-500">
                          {text({
                            ro: "Se încarcă fișierul...",
                            en: "Uploading file...",
                            de: "Datei wird hochgeladen...",
                          })}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>

            <article className="section-card">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {text({ ro: "Documente", en: "Documents", de: "Dokumente" })}
                  </p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-900">
                    {text({
                      ro: "Fluturași de salariu",
                      en: "Payslips",
                      de: "Gehaltsabrechnungen",
                    })}
                  </h2>
                </div>

                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {payslips.length}{" "}
                  {text({
                    ro: payslips.length === 1 ? "fișier" : "fișiere",
                    en: payslips.length === 1 ? "file" : "files",
                    de: payslips.length === 1 ? "Datei" : "Dateien",
                  })}
                </span>
              </div>

              <label className="mb-5 block">
                <span className="label">
                  {text({
                    ro: "Încarcă fluturaș",
                    en: "Upload payslip",
                    de: "Gehaltsabrechnung hochladen",
                  })}
                </span>

                <input
                  type="file"
                  onChange={(e) => handlePayslipUpload(e.target.files?.[0] || null)}
                  disabled={savingKey === "PAYSLIP"}
                  className="block w-full rounded-2xl border border-slate-200 px-3 py-3 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-60"
                />
              </label>

              {savingKey === "PAYSLIP" ? (
                <p className="mb-4 text-xs text-slate-500">
                  {text({
                    ro: "Se încarcă fișierul...",
                    en: "Uploading file...",
                    de: "Datei wird hochgeladen...",
                  })}
                </p>
              ) : null}

              {payslips.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {text({
                    ro: "Nu există fluturași încă.",
                    en: "There are no payslips yet.",
                    de: "Es gibt noch keine Gehaltsabrechnungen.",
                  })}
                </p>
              ) : (
                <div className="space-y-3">
                  {payslips.map((document) => {
                    const isDeleting = deletingId === document.id;

                    return (
                      <div
                        key={document.id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words font-medium text-slate-900">
                              {document.file_name}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {text({
                                ro: "Creat",
                                en: "Created",
                                de: "Erstellt",
                              })}
                              : {formatDate(document.created_at)}
                            </p>
                          </div>

                          <span
                            className={[
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                              getStatusBadgeClass(document.status),
                            ].join(" ")}
                          >
                            {getStatusLabel(document.status)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleView(document)}
                            className="btn-secondary"
                          >
                            {text({
                              ro: "Vezi",
                              en: "View",
                              de: "Ansehen",
                            })}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownload(document)}
                            className="btn-primary"
                          >
                            {text({
                              ro: "Descarcă",
                              en: "Download",
                              de: "Herunterladen",
                            })}
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(document)}
                            disabled={isDeleting}
                            className="btn-secondary disabled:opacity-60"
                          >
                            {isDeleting
                              ? text({
                                  ro: "Se șterge...",
                                  en: "Deleting...",
                                  de: "Wird gelöscht...",
                                })
                              : text({
                                  ro: "Șterge",
                                  en: "Delete",
                                  de: "Löschen",
                                })}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteModalOpen}
        title={text({
          ro: "Confirmare ștergere",
          en: "Delete confirmation",
          de: "Löschbestätigung",
        })}
        message={
          documentToDelete
            ? text({
                ro: `Sigur vrei să ștergi documentul "${documentToDelete.file_name}"?`,
                en: `Are you sure you want to delete the document "${documentToDelete.file_name}"?`,
                de: `Möchtest du das Dokument "${documentToDelete.file_name}" wirklich löschen?`,
              })
            : text({
                ro: "Sigur vrei să ștergi acest document?",
                en: "Are you sure you want to delete this document?",
                de: "Möchtest du dieses Dokument wirklich löschen?",
              })
        }
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
        loading={isDeletingCurrent}
        loadingText={text({
          ro: "Se șterge...",
          en: "Deleting...",
          de: "Wird gelöscht...",
        })}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
      />
    </>
  );
}