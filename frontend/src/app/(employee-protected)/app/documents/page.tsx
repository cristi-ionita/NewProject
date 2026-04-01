"use client";

import { useEffect, useState } from "react";
import { getUserSession } from "@/lib/auth";
import { extractErrorMessage } from "@/lib/error";
import {
  deleteMyDocument,
  DocumentItem,
  getMyDocuments,
  myDownloadDocumentFile,
  uploadMyDocument,
} from "@/services/documents.api";
import { useI18n } from "@/lib/i18n/use-i18n";
import ConfirmDialog from "@/components/confirm-dialog";
import {
  BadgeCheck,
  Download,
  Eye,
  FileText,
  IdCard,
  Trash2,
  Upload,
} from "lucide-react";

type DocumentCardConfig = {
  type: string;
  label: { ro: string; en: string; de: string };
  editable: boolean;
  icon: React.ReactNode;
};

const DOCUMENT_CARDS: DocumentCardConfig[] = [
  {
    type: "DRIVER_LICENSE",
    label: { ro: "Permis auto", en: "Driver License", de: "Führerschein" },
    editable: true,
    icon: <IdCard className="h-4.5 w-4.5" />,
  },
  {
    type: "ID_CARD",
    label: { ro: "Carte de identitate / Pașaport", en: "ID / Passport", de: "Ausweis / Reisepass" },
    editable: true,
    icon: <IdCard className="h-4.5 w-4.5" />,
  },
  {
    type: "CONTRACT",
    label: { ro: "Contract", en: "Contract", de: "Vertrag" },
    editable: false,
    icon: <FileText className="h-4.5 w-4.5" />,
  },
  {
    type: "PAYSLIP",
    label: { ro: "Fluturaș salariu", en: "Payslip", de: "Gehaltsabrechnung" },
    editable: false,
    icon: <BadgeCheck className="h-4.5 w-4.5" />,
  },
];

function normalize(value: string | undefined | null) {
  return (value || "").trim().toLowerCase();
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function cardClass() {
  return "rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]";
}

function tileClass() {
  return "rounded-[18px] border border-slate-200 bg-slate-50/80 p-4";
}

function sectionLabelClass() {
  return "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";
}

function formatDate(value: string, locale: "ro" | "en" | "de" = "ro") {
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

export default function EmployeeDocumentsPage() {
  const session = getUserSession();
  const { locale } = useI18n();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingType, setSavingType] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  async function loadDocuments() {
    try {
      if (!session?.unique_code) {
        setError(
          text({
            ro: "Sesiune user invalidă.",
            en: "Invalid user session.",
            de: "Ungültige Benutzersitzung.",
          })
        );
        setLoading(false);
        return;
      }

      setError("");
      const data = await getMyDocuments(session.unique_code);
      setDocuments(data);
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut încărca documentele",
            en: "Could not load documents",
            de: "Dokumente konnten nicht geladen werden",
          })
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.unique_code, locale]);

  function getDocumentByType(type: string) {
    return documents.find((doc) => normalize(doc.type) === normalize(type)) || null;
  }

  function getStatusBadgeClass(status: string) {
    const normalizedStatus = normalize(status);

    if (normalizedStatus === "active") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (normalizedStatus === "expired") {
      return "border-red-200 bg-red-50 text-red-700";
    }

    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  function getStatusLabel(status: string) {
    const normalizedStatus = normalize(status);

    if (normalizedStatus === "active") {
      return text({ ro: "Activ", en: "Active", de: "Aktiv" });
    }

    if (normalizedStatus === "expired") {
      return text({ ro: "Expirat", en: "Expired", de: "Abgelaufen" });
    }

    return status;
  }

  async function handleView(document: DocumentItem) {
    if (!session?.unique_code) return;

    try {
      setError("");

      const response = await myDownloadDocumentFile(document.id, session.unique_code);

      const blob = new Blob([response.data], {
        type: document.mime_type || "application/octet-stream",
      });

      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 10000);
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut deschide documentul",
            en: "Could not open document",
            de: "Dokument konnte nicht geöffnet werden",
          })
        )
      );
    }
  }

  async function handleDownload(document: DocumentItem) {
    if (!session?.unique_code) return;

    try {
      setError("");

      const response = await myDownloadDocumentFile(document.id, session.unique_code);

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
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut descărca documentul",
            en: "Could not download document",
            de: "Dokument konnte nicht heruntergeladen werden",
          })
        )
      );
    }
  }

  async function handleReplaceDocument(type: string, file: File | null) {
    if (!session?.unique_code || !file) return;

    const existingDocument = getDocumentByType(type);

    try {
      setSavingType(type);
      setError("");

      if (existingDocument && normalize(existingDocument.category) === "personal") {
        await deleteMyDocument(existingDocument.id, session.unique_code);
      }

      const formData = new FormData();
      formData.append("type", type);
      formData.append("file", file);

      await uploadMyDocument(session.unique_code, formData);
      await loadDocuments();
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut salva documentul",
            en: "Could not save document",
            de: "Dokument konnte nicht gespeichert werden",
          })
        )
      );
    } finally {
      setSavingType(null);
    }
  }

  function openDeleteModal(document: DocumentItem) {
    setDocumentToDelete(document);
    setDeleteModalOpen(true);
    setError("");
  }

  function closeDeleteModal() {
    if (deletingId !== null) return;
    setDeleteModalOpen(false);
    setDocumentToDelete(null);
  }

  async function handleDeleteConfirm() {
    if (!session?.unique_code || !documentToDelete) return;

    try {
      setDeletingId(documentToDelete.id);
      setError("");
      await deleteMyDocument(documentToDelete.id, session.unique_code);
      await loadDocuments();
      setDeleteModalOpen(false);
      setDocumentToDelete(null);
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut șterge documentul",
            en: "Could not delete document",
            de: "Dokument konnte nicht gelöscht werden",
          })
        )
      );
    } finally {
      setDeletingId(null);
    }
  }

  const totalDocuments = documents.length;
  const personalDocuments = documents.filter((doc) => normalize(doc.category) === "personal").length;
  const companyDocuments = documents.filter((doc) => normalize(doc.category) === "company").length;

  const isDeletingCurrent =
    documentToDelete !== null && deletingId === documentToDelete.id;

  if (loading) {
    return (
      <div className="rounded-[24px] border border-white/60 bg-white/80 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-slate-900" />
          <p className="text-sm font-medium text-slate-600">
            {text({
              ro: "Se încarcă...",
              en: "Loading...",
              de: "Wird geladen...",
            })}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5 text-slate-900">
        <section className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-slate-950 p-4 sm:p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_24%)]" />

          <div className="relative">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2.5">
                <div>
                  <h1 className="text-[30px] font-semibold tracking-tight text-white sm:text-[34px]">
                    {text({
                      ro: "Documentele mele",
                      en: "My Documents",
                      de: "Meine Dokumente",
                    })}
                  </h1>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-300">
                    {text({
                      ro: "Vezi, descarcă și gestionează documentele personale disponibile în contul tău.",
                      en: "View, download, and manage the personal documents available in your account.",
                      de: "Sieh, lade herunter und verwalte die persönlichen Dokumente in deinem Konto.",
                    })}
                  </p>
                </div>
              </div>

              <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-3">
                <HeroStatCard
                  icon={<FileText className="h-3.5 w-3.5" />}
                  label={text({
                    ro: "Total",
                    en: "Total",
                    de: "Gesamt",
                  })}
                  value={String(totalDocuments)}
                />
                <HeroStatCard
                  icon={<IdCard className="h-3.5 w-3.5" />}
                  label={text({
                    ro: "Personale",
                    en: "Personal",
                    de: "Persönlich",
                  })}
                  value={String(personalDocuments)}
                />
                <HeroStatCard
                  icon={<BadgeCheck className="h-3.5 w-3.5" />}
                  label={text({
                    ro: "Companie",
                    en: "Company",
                    de: "Firma",
                  })}
                  value={String(companyDocuments)}
                />
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
            {error}
          </div>
        ) : null}

        <section className={cardClass()}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {text({
                  ro: "Documente",
                  en: "Documents",
                  de: "Dokumente",
                })}
              </p>
              <h2 className="text-[17px] font-semibold text-slate-950">
                {text({
                  ro: "Bibliotecă documente",
                  en: "Document library",
                  de: "Dokumentenbibliothek",
                })}
              </h2>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
            {DOCUMENT_CARDS.map((card) => {
              const document = getDocumentByType(card.type);
              const isSaving = savingType === card.type;
              const isDeleting = deletingId === document?.id;

              return (
                <article
                  key={card.type}
                  className="rounded-[18px] border border-slate-200 bg-slate-50/80 p-4"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                        {card.icon}
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          {text({
                            ro: "Document",
                            en: "Document",
                            de: "Dokument",
                          })}
                        </p>
                        <h3 className="mt-1 text-base font-semibold text-slate-900">
                          {card.label[locale]}
                        </h3>
                      </div>
                    </div>

                    {document ? (
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                          getStatusBadgeClass(document.status)
                        )}
                      >
                        {getStatusLabel(document.status)}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {text({
                          ro: "Lipsește",
                          en: "Missing",
                          de: "Fehlt",
                        })}
                      </span>
                    )}
                  </div>

                  {document ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      <InfoTile
                        label={text({ ro: "Fișier", en: "File", de: "Datei" })}
                        value={document.file_name}
                      />
                      <InfoTile
                        label={text({ ro: "Categorie", en: "Category", de: "Kategorie" })}
                        value={document.category}
                      />
                      <InfoTile
                        label={text({ ro: "Expiră", en: "Expires", de: "Läuft ab" })}
                        value={document.expires_at ? formatDate(document.expires_at, locale) : "-"}
                      />
                      <InfoTile
                        label={text({ ro: "Creat", en: "Created", de: "Erstellt" })}
                        value={formatDate(document.created_at, locale)}
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      {text({
                        ro: "Nu există document încă.",
                        en: "There is no document yet.",
                        de: "Es gibt noch kein Dokument.",
                      })}
                    </p>
                  )}

                  {card.editable ? (
                    <div className="mt-5 space-y-3">
                      {document ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleView(document)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <Eye className="h-4 w-4" />
                            {text({ ro: "Vezi", en: "View", de: "Ansehen" })}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownload(document)}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                          >
                            <Download className="h-4 w-4" />
                            {text({ ro: "Descarcă", en: "Download", de: "Herunterladen" })}
                          </button>

                          <button
                            type="button"
                            onClick={() => openDeleteModal(document)}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            <Trash2 className="h-4 w-4" />
                            {isDeleting
                              ? text({ ro: "Se șterge...", en: "Deleting...", de: "Wird gelöscht..." })
                              : text({ ro: "Șterge", en: "Delete", de: "Löschen" })}
                          </button>
                        </div>
                      ) : null}

                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">
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

                        <div className="relative">
                          <input
                            type="file"
                            onChange={(e) =>
                              handleReplaceDocument(card.type, e.target.files?.[0] || null)
                            }
                            disabled={isSaving}
                            className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-60"
                          />
                          <Upload className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        </div>
                      </label>

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
                  ) : (
                    <div className="mt-5">
                      {document ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleView(document)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            <Eye className="h-4 w-4" />
                            {text({ ro: "Vezi", en: "View", de: "Ansehen" })}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownload(document)}
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                          >
                            <Download className="h-4 w-4" />
                            {text({ ro: "Descarcă", en: "Download", de: "Herunterladen" })}
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500">
                          {text({
                            ro: "Acest document va fi adăugat de administrator.",
                            en: "This document will be added by the administrator.",
                            de: "Dieses Dokument wird vom Administrator hinzugefügt.",
                          })}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
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

function HeroStatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-slate-300">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-2.5 line-clamp-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={tileClass()}>
      <p className={sectionLabelClass()}>{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}