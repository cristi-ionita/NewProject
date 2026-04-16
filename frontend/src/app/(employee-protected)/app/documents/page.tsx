"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Download,
  Eye,
  FileText,
  IdCard,
  Trash2,
  Upload,
} from "lucide-react";

import ConfirmDialog from "@/components/confirm-dialog";
import EmptyState from "@/components/ui/empty-state";
import ErrorAlert from "@/components/ui/error-alert";
import HeroStatCard from "@/components/ui/hero-stat-card";
import LoadingCard from "@/components/ui/loading-card";
import PageHero from "@/components/ui/page-hero";
import SectionCard from "@/components/ui/section-card";

import { getUserSession } from "@/lib/auth";
import { useI18n } from "@/lib/i18n/use-i18n";
import { extractErrorMessage } from "@/lib/error";
import {
  deleteMyDocument,
  getMyDocuments,
  myDownloadDocumentFile,
  uploadMyDocument,
  type DocumentItem,
} from "@/services/documents.api";

type SupportedLocale = "ro" | "en" | "de";

type DocumentCardConfig = {
  type: string;
  label: { ro: string; en: string; de: string };
  editable: boolean;
  icon: ReactNode;
  emptyDescription?: { ro: string; en: string; de: string };
};

const DOCUMENT_CARDS: DocumentCardConfig[] = [
  {
    type: "driver_license",
    label: { ro: "Permis auto", en: "Driver License", de: "Führerschein" },
    editable: true,
    icon: <IdCard className="h-4.5 w-4.5" />,
    emptyDescription: {
      ro: "Nu există document încă.",
      en: "There is no document yet.",
      de: "Es gibt noch kein Dokument.",
    },
  },
  {
    type: "personal",
    label: {
      ro: "Carte de identitate / Pașaport",
      en: "ID / Passport",
      de: "Ausweis / Reisepass",
    },
    editable: true,
    icon: <IdCard className="h-4.5 w-4.5" />,
    emptyDescription: {
      ro: "Nu există document încă.",
      en: "There is no document yet.",
      de: "Es gibt noch kein Dokument.",
    },
  },
  {
    type: "contract",
    label: { ro: "Contract", en: "Contract", de: "Vertrag" },
    editable: false,
    icon: <FileText className="h-4.5 w-4.5" />,
    emptyDescription: {
      ro: "Acest document va fi adăugat de administrator.",
      en: "This document will be added by the administrator.",
      de: "Dieses Dokument wird vom Administrator hinzugefügt.",
    },
  },
  {
    type: "payslip",
    label: { ro: "Fluturaș salariu", en: "Payslip", de: "Gehaltsabrechnung" },
    editable: false,
    icon: <BadgeCheck className="h-4.5 w-4.5" />,
    emptyDescription: {
      ro: "Acest document va fi adăugat de administrator.",
      en: "This document will be added by the administrator.",
      de: "Dieses Dokument wird vom Administrator hinzugefügt.",
    },
  },
];

function normalize(value: string | undefined | null) {
  return (value || "").trim().toLowerCase();
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value: string, locale: SupportedLocale) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(date);
}

export default function EmployeeDocumentsPage() {
  const { locale } = useI18n();
  const safeLocale: SupportedLocale =
    locale === "ro" || locale === "en" || locale === "de" ? locale : "en";

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingType, setSavingType] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentItem | null>(null);

  function text(values: { ro: string; en: string; de: string }) {
    return values[safeLocale];
  }

  const getSessionErrorMessage = useCallback(
    () =>
      text({
        ro: "Sesiune user invalidă.",
        en: "Invalid user session.",
        de: "Ungültige Benutzersitzung.",
      }),
    [safeLocale]
  );

  const loadDocuments = useCallback(async () => {
    const session = getUserSession();

    try {
      setLoading(true);
      setError("");

      if (!session?.unique_code) {
        setDocuments([]);
        setError(getSessionErrorMessage());
        return;
      }

      const data = await getMyDocuments(session.unique_code);
      setDocuments(data);
    } catch (err: unknown) {
      setDocuments([]);
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut încărca documentele.",
            en: "Could not load documents.",
            de: "Dokumente konnten nicht geladen werden.",
          })
        )
      );
    } finally {
      setLoading(false);
    }
  }, [getSessionErrorMessage, safeLocale]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const totalDocuments = documents.length;

  const personalDocuments = useMemo(
    () => documents.filter((doc) => normalize(doc.category) === "personal").length,
    [documents]
  );

  const companyDocuments = useMemo(
    () => documents.filter((doc) => normalize(doc.category) === "company").length,
    [documents]
  );

  const getDocumentByType = useCallback(
    (type: string) =>
      documents.find((doc) => normalize(doc.type) === normalize(type)) || null,
    [documents]
  );

  function getStatusBadgeClass(status: string) {
    const normalizedStatus = normalize(status);

    if (normalizedStatus === "valid") {
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (normalizedStatus === "expired") {
      return "border-red-200 bg-red-50 text-red-700";
    }

    if (normalizedStatus === "pending") {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  function getStatusLabel(status: string) {
    const normalizedStatus = normalize(status);

    if (normalizedStatus === "valid") {
      return text({ ro: "Valid", en: "Valid", de: "Gültig" });
    }

    if (normalizedStatus === "expired") {
      return text({ ro: "Expirat", en: "Expired", de: "Abgelaufen" });
    }

    if (normalizedStatus === "pending") {
      return text({ ro: "În așteptare", en: "Pending", de: "Ausstehend" });
    }

    return status || text({ ro: "Necunoscut", en: "Unknown", de: "Unbekannt" });
  }

  async function openDocument(document: DocumentItem, download = false) {
    const session = getUserSession();

    if (!session?.unique_code) {
      setError(getSessionErrorMessage());
      return;
    }

    try {
      setError("");

      const blob = await myDownloadDocumentFile(document.id, session.unique_code);
      const url = window.URL.createObjectURL(blob);

      if (download) {
        const link = window.document.createElement("a");
        link.href = url;
        link.download = document.file_name;
        window.document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        return;
      }

      window.open(url, "_blank");

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 10000);
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          download
            ? text({
                ro: "Nu am putut descărca documentul.",
                en: "Could not download document.",
                de: "Dokument konnte nicht heruntergeladen werden.",
              })
            : text({
                ro: "Nu am putut deschide documentul.",
                en: "Could not open document.",
                de: "Dokument konnte nicht geöffnet werden.",
              })
        )
      );
    }
  }

  async function handleReplaceDocument(type: string, file: File | null) {
    const session = getUserSession();

    if (!session?.unique_code || !file) {
      return;
    }

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
            ro: "Nu am putut salva documentul.",
            en: "Could not save document.",
            de: "Dokument konnte nicht gespeichert werden.",
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
    if (deletingId !== null) {
      return;
    }

    setDeleteModalOpen(false);
    setDocumentToDelete(null);
  }

  async function handleDeleteConfirm() {
    const session = getUserSession();

    if (!session?.unique_code || !documentToDelete) {
      return;
    }

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
            ro: "Nu am putut șterge documentul.",
            en: "Could not delete document.",
            de: "Dokument konnte nicht gelöscht werden.",
          })
        )
      );
    } finally {
      setDeletingId(null);
    }
  }

  const isDeletingCurrent =
    documentToDelete !== null && deletingId === documentToDelete.id;

  if (loading) {
    return <LoadingCard />;
  }

  if (error && !documents.length) {
    return <ErrorAlert message={error} />;
  }

  return (
    <>
      <div className="space-y-6">
        <PageHero
          icon={<FileText className="h-7 w-7" />}
          title={text({
            ro: "Documentele mele",
            en: "My Documents",
            de: "Meine Dokumente",
          })}
          description={text({
            ro: "Vezi, descarcă și gestionează documentele disponibile în contul tău.",
            en: "View, download and manage the documents available in your account.",
            de: "Sieh, lade herunter und verwalte die in deinem Konto verfügbaren Dokumente.",
          })}
          stats={
            <div className="grid w-full gap-3 sm:grid-cols-3">
              <HeroStatCard
                icon={<FileText className="h-4 w-4" />}
                label={text({ ro: "Total", en: "Total", de: "Gesamt" })}
                value={totalDocuments}
              />
              <HeroStatCard
                icon={<IdCard className="h-4 w-4" />}
                label={text({
                  ro: "Personale",
                  en: "Personal",
                  de: "Persönlich",
                })}
                value={personalDocuments}
              />
              <HeroStatCard
                icon={<BadgeCheck className="h-4 w-4" />}
                label={text({
                  ro: "Companie",
                  en: "Company",
                  de: "Firma",
                })}
                value={companyDocuments}
              />
            </div>
          }
        />

        {error ? <ErrorAlert message={error} /> : null}

        <SectionCard
          title={text({
            ro: "Bibliotecă documente",
            en: "Document library",
            de: "Dokumentenbibliothek",
          })}
          icon={<FileText className="h-5 w-5" />}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {DOCUMENT_CARDS.map((card) => {
              const document = getDocumentByType(card.type);
              const isSaving = savingType === card.type;
              const isDeleting = deletingId === document?.id;

              return (
                <DocumentCard
                  key={card.type}
                  locale={safeLocale}
                  card={card}
                  document={document}
                  isSaving={isSaving}
                  isDeleting={isDeleting}
                  text={text}
                  getStatusLabel={getStatusLabel}
                  getStatusBadgeClass={getStatusBadgeClass}
                  onView={() => {
                    if (document) {
                      void openDocument(document, false);
                    }
                  }}
                  onDownload={() => {
                    if (document) {
                      void openDocument(document, true);
                    }
                  }}
                  onDelete={() => {
                    if (document) {
                      openDeleteModal(document);
                    }
                  }}
                  onReplace={(file) => {
                    void handleReplaceDocument(card.type, file);
                  }}
                />
              );
            })}
          </div>
        </SectionCard>

        {!documents.length ? (
          <EmptyState
            title={text({
              ro: "Nu există documente disponibile",
              en: "No documents available",
              de: "Keine Dokumente verfügbar",
            })}
            description={text({
              ro: "Documentele tale vor apărea aici după ce sunt încărcate în sistem.",
              en: "Your documents will appear here after they are uploaded to the system.",
              de: "Deine Dokumente erscheinen hier, nachdem sie ins System hochgeladen wurden.",
            })}
          />
        ) : null}
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
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
        onCancel={closeDeleteModal}
      />
    </>
  );
}

function DocumentCard({
  locale,
  card,
  document,
  isSaving,
  isDeleting,
  text,
  getStatusLabel,
  getStatusBadgeClass,
  onView,
  onDownload,
  onDelete,
  onReplace,
}: {
  locale: SupportedLocale;
  card: DocumentCardConfig;
  document: DocumentItem | null;
  isSaving: boolean;
  isDeleting: boolean;
  text: (values: { ro: string; en: string; de: string }) => string;
  getStatusLabel: (status: string) => string;
  getStatusBadgeClass: (status: string) => string;
  onView: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onReplace: (file: File | null) => void;
}) {
  return (
    <article className="rounded-[18px] border border-slate-200 bg-slate-50/80 p-4">
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
          {card.emptyDescription ? card.emptyDescription[locale] : "-"}
        </p>
      )}

      <div className="mt-5 space-y-3">
        {document ? (
          <div className="flex flex-wrap gap-2">
            <ActionButton variant="secondary" onClick={onView}>
              <Eye className="h-4 w-4" />
              {text({ ro: "Vezi", en: "View", de: "Ansehen" })}
            </ActionButton>

            <ActionButton onClick={onDownload}>
              <Download className="h-4 w-4" />
              {text({ ro: "Descarcă", en: "Download", de: "Herunterladen" })}
            </ActionButton>

            {card.editable ? (
              <ActionButton variant="secondary" onClick={onDelete} disabled={isDeleting}>
                <Trash2 className="h-4 w-4" />
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
              </ActionButton>
            ) : null}
          </div>
        ) : null}

        {card.editable ? (
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
                onChange={(event) => {
                  onReplace(event.target.files?.[0] || null);
                  event.currentTarget.value = "";
                }}
                disabled={isSaving}
                className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 disabled:opacity-60"
              />
              <Upload className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
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
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const className =
    variant === "primary"
      ? "inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      : "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
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
    <div className="rounded-[18px] border border-slate-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}