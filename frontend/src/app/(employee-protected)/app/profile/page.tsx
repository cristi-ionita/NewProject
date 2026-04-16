"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  FileText,
  IdCard,
  KeyRound,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import PageHero from "@/components/ui/page-hero";
import HeroStatCard from "@/components/ui/hero-stat-card";
import SectionCard from "@/components/ui/section-card";
import LoadingCard from "@/components/ui/loading-card";
import ErrorAlert from "@/components/ui/error-alert";
import EmptyState from "@/components/ui/empty-state";

import { getUserSession, saveUserSession } from "@/lib/auth";
import { extractErrorMessage } from "@/lib/error";
import { isApiClientError } from "@/lib/axios";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  getMyProfileSummary,
  updateMyProfile,
  type ProfileSummaryResponse,
} from "@/services/profile.api";

type EditSection = "account" | "profile" | "iban" | null;

type AddressParts = {
  street: string;
  streetNumber: string;
  apartment: string;
  postcode: string;
};

type FormState = {
  username: string;
  pin: string;
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  streetNumber: string;
  apartment: string;
  postcode: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  iban: string;
};

const EMPTY_ADDRESS: AddressParts = {
  street: "",
  streetNumber: "",
  apartment: "",
  postcode: "",
};

const EMPTY_FORM: FormState = {
  username: "",
  pin: "",
  firstName: "",
  lastName: "",
  phone: "",
  street: "",
  streetNumber: "",
  apartment: "",
  postcode: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  iban: "",
};

function normalizeSpaces(value: string) {
  return value.trimStart().replace(/\s+/g, " ");
}

function toTitleCase(value: string) {
  return normalizeSpaces(value)
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeName(value: string) {
  return toTitleCase(value);
}

function normalizeAddressText(value: string) {
  return toTitleCase(value);
}

function normalizePostcode(value: string) {
  return value.toUpperCase().trimStart().replace(/\s+/g, " ");
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+\s()-]/g, "").trimStart();
}

function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function isValidPin(value: string) {
  if (!value) return true;
  return /^\d{4}$/.test(value);
}

function isValidIban(value: string) {
  const iban = normalizeIban(value);

  if (!iban) return true;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return false;
  if (iban.length < 15 || iban.length > 34) return false;

  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let numeric = "";

  for (const ch of rearranged) {
    numeric += /[A-Z]/.test(ch) ? String(ch.charCodeAt(0) - 55) : ch;
  }

  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }

  return remainder === 1;
}

function formatAddress(address: AddressParts) {
  const parts = [
    address.street.trim() ? `Street: ${address.street.trim()}` : "",
    address.streetNumber.trim() ? `Number: ${address.streetNumber.trim()}` : "",
    address.apartment.trim() ? `Apartment: ${address.apartment.trim()}` : "",
    address.postcode.trim() ? `Postcode: ${address.postcode.trim()}` : "",
  ].filter(Boolean);

  return parts.join(", ");
}

function parseAddress(address?: string | null): AddressParts {
  if (!address?.trim()) return EMPTY_ADDRESS;

  const streetMatch = address.match(/Street:\s*([^,]+)/i);
  const numberMatch = address.match(/Number:\s*([^,]+)/i);
  const apartmentMatch = address.match(/Apartment:\s*([^,]+)/i);
  const postcodeMatch = address.match(/Postcode:\s*([^,]+)/i);

  if (!streetMatch && !numberMatch && !apartmentMatch && !postcodeMatch) {
    return {
      street: address.trim(),
      streetNumber: "",
      apartment: "",
      postcode: "",
    };
  }

  return {
    street: streetMatch?.[1]?.trim() || "",
    streetNumber: numberMatch?.[1]?.trim() || "",
    apartment: apartmentMatch?.[1]?.trim() || "",
    postcode: postcodeMatch?.[1]?.trim() || "",
  };
}

function buildFormState(data: ProfileSummaryResponse): FormState {
  const profile = data.employee_profile;
  const address = parseAddress(profile?.address);

  return {
    username: data.user.unique_code || "",
    pin: "",
    firstName: profile?.first_name || "",
    lastName: profile?.last_name || "",
    phone: profile?.phone || "",
    street: address.street,
    streetNumber: address.streetNumber,
    apartment: address.apartment,
    postcode: address.postcode,
    emergencyContactName: profile?.emergency_contact_name || "",
    emergencyContactPhone: profile?.emergency_contact_phone || "",
    iban: profile?.iban || "",
  };
}

function getStatusFromError(err: unknown) {
  if (!isApiClientError(err)) return null;
  return err.status ?? null;
}

export default function EmployeeProfilePage() {
  const { locale } = useI18n();

  const [data, setData] = useState<ProfileSummaryResponse | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [loading, setLoading] = useState(true);
  const [activeEdit, setActiveEdit] = useState<EditSection>(null);
  const [saving, setSaving] = useState<EditSection>(null);

  const [error, setError] = useState("");
  const [ibanError, setIbanError] = useState("");
  const [profileMissing, setProfileMissing] = useState(false);

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  const getSessionError = useCallback(
    () =>
      text({
        ro: "Sesiune utilizator invalidă.",
        en: "Invalid user session.",
        de: "Ungültige Benutzersitzung.",
      }),
    [locale]
  );

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const hydrateState = useCallback((result: ProfileSummaryResponse) => {
    setData(result);
    setForm(buildFormState(result));
    setProfileMissing(false);
    setIbanError("");
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const session = getUserSession();

      if (!session?.unique_code) {
        setData(null);
        setProfileMissing(false);
        setError(getSessionError());
        return;
      }

      const result = await getMyProfileSummary(session.unique_code);
      hydrateState(result);
    } catch (err: unknown) {
      const status = getStatusFromError(err);

      if (status === 404) {
        setData(null);
        setProfileMissing(true);
        setError("");
        return;
      }

      setProfileMissing(false);
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut încărca profilul.",
            en: "Could not load profile.",
            de: "Profil konnte nicht geladen werden.",
          })
        )
      );
    } finally {
      setLoading(false);
    }
  }, [getSessionError, hydrateState, locale]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const profile = data?.employee_profile;
  const documents = data?.documents_summary;

  const parsedDisplayAddress = useMemo(
    () => parseAddress(profile?.address),
    [profile?.address]
  );

  const fullEmployeeName = useMemo(() => {
    const first = normalizeName(form.firstName).trim();
    const last = normalizeName(form.lastName).trim();

    if (first || last) return `${first} ${last}`.trim();

    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    }

    return data?.user.full_name || "-";
  }, [data?.user.full_name, form.firstName, form.lastName, profile]);

  function resetEditState(nextData?: ProfileSummaryResponse | null) {
    if (nextData) {
      setForm(buildFormState(nextData));
    } else if (data) {
      setForm(buildFormState(data));
    }

    setActiveEdit(null);
    setError("");
    setIbanError("");
  }

  function startEdit(section: EditSection) {
    setActiveEdit(section);
    setError("");
    setIbanError("");
  }

  async function reloadAndClose() {
    await loadProfile();
    setActiveEdit(null);
    setIbanError("");
  }

  async function handleSaveAccount() {
    const session = getUserSession();

    if (!session?.unique_code) {
      setError(getSessionError());
      return;
    }

    const nextUsername = normalizeSpaces(form.username);
    const nextPin = form.pin.trim();

    if (!nextUsername) {
      setError(
        text({
          ro: "Username-ul este obligatoriu.",
          en: "Username is required.",
          de: "Benutzername ist erforderlich.",
        })
      );
      return;
    }

    if (!isValidPin(nextPin)) {
      setError(
        text({
          ro: "PIN-ul trebuie să conțină exact 4 cifre.",
          en: "PIN must contain exactly 4 digits.",
          de: "Die PIN muss genau 4 Ziffern enthalten.",
        })
      );
      return;
    }

    try {
      setSaving("account");
      setError("");

      await updateMyProfile(session.unique_code, {
        username: nextUsername,
        pin: nextPin || undefined,
      });

      saveUserSession({
        ...session,
        unique_code: nextUsername || session.unique_code,
      });

      await reloadAndClose();
      setField("pin", "");
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut salva datele de logare.",
            en: "Could not save login details.",
            de: "Anmeldedaten konnten nicht gespeichert werden.",
          })
        )
      );
    } finally {
      setSaving(null);
    }
  }

  async function handleSaveProfile() {
    const session = getUserSession();

    if (!session?.unique_code) {
      setError(getSessionError());
      return;
    }

    try {
      setSaving("profile");
      setError("");

      const formattedAddress = formatAddress({
        street: normalizeAddressText(form.street),
        streetNumber: normalizeAddressText(form.streetNumber),
        apartment: normalizeAddressText(form.apartment),
        postcode: normalizePostcode(form.postcode),
      });

      await updateMyProfile(session.unique_code, {
        first_name: normalizeName(form.firstName) || null,
        last_name: normalizeName(form.lastName) || null,
        phone: form.phone.trim() || null,
        address: formattedAddress || null,
        emergency_contact_name: normalizeName(form.emergencyContactName) || null,
        emergency_contact_phone: form.emergencyContactPhone.trim() || null,
      });

      await reloadAndClose();
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut salva datele personale.",
            en: "Could not save personal details.",
            de: "Persönliche Daten konnten nicht gespeichert werden.",
          })
        )
      );
    } finally {
      setSaving(null);
    }
  }

  async function handleSaveIban() {
    const session = getUserSession();

    if (!session?.unique_code) {
      setError(getSessionError());
      return;
    }

    const normalized = normalizeIban(form.iban);

    if (normalized && !isValidIban(normalized)) {
      setIbanError(
        text({
          ro: "IBAN invalid.",
          en: "Invalid IBAN.",
          de: "Ungültige IBAN.",
        })
      );
      return;
    }

    try {
      setSaving("iban");
      setError("");
      setIbanError("");

      await updateMyProfile(session.unique_code, {
        iban: normalized || null,
      });

      await reloadAndClose();
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut salva IBAN-ul.",
            en: "Could not save IBAN.",
            de: "IBAN konnte nicht gespeichert werden.",
          })
        )
      );
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <LoadingCard />;
  }

  if (error && !data && !profileMissing) {
    return <ErrorAlert message={error} />;
  }

  if (profileMissing) {
    return (
      <EmptyState
        title={text({
          ro: "Profilul angajatului nu există încă",
          en: "Employee profile does not exist yet",
          de: "Mitarbeiterprofil existiert noch nicht",
        })}
        description={text({
          ro: "Contul există, dar profilul asociat nu a fost creat încă în sistem.",
          en: "The account exists, but the linked employee profile has not been created yet.",
          de: "Das Konto existiert, aber das verknüpfte Mitarbeiterprofil wurde noch nicht erstellt.",
        })}
      />
    );
  }

  if (!data || !documents) {
    return (
      <EmptyState
        title={text({
          ro: "Nu există date disponibile",
          en: "No data available",
          de: "Keine Daten verfügbar",
        })}
      />
    );
  }

  const isEditingAccount = activeEdit === "account";
  const isEditingProfile = activeEdit === "profile";
  const isEditingIban = activeEdit === "iban";

  return (
    <div className="space-y-6">
      <PageHero
        icon={<UserRound className="h-7 w-7" />}
        title={text({
          ro: "Profilul meu",
          en: "My Profile",
          de: "Mein Profil",
        })}
        description={text({
          ro: "Gestionează datele contului, informațiile personale și detaliile bancare.",
          en: "Manage your account details, personal information and banking details.",
          de: "Verwalte deine Kontodaten, persönlichen Informationen und Bankdaten.",
        })}
        stats={
          <div className="grid w-full gap-3 sm:grid-cols-3">
            <HeroStatCard
              icon={<UserRound className="h-4 w-4" />}
              label={text({
                ro: "Angajat",
                en: "Employee",
                de: "Mitarbeiter",
              })}
              value={fullEmployeeName}
            />
            <HeroStatCard
              icon={<ShieldCheck className="h-4 w-4" />}
              label={text({
                ro: "Tură",
                en: "Shift",
                de: "Schicht",
              })}
              value={data.user.shift_number || "-"}
            />
            <HeroStatCard
              icon={<FileText className="h-4 w-4" />}
              label={text({
                ro: "Documente",
                en: "Documents",
                de: "Dokumente",
              })}
              value={documents.total_documents}
            />
          </div>
        }
      />

      {error ? <ErrorAlert message={error} /> : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title={text({
            ro: "Prezentare",
            en: "Overview",
            de: "Übersicht",
          })}
          icon={<UserRound className="h-5 w-5" />}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <InfoTile
              label={text({ ro: "Nume", en: "Name", de: "Name" })}
              value={fullEmployeeName}
            />
            <InfoTile
              label={text({ ro: "Tură", en: "Shift", de: "Schicht" })}
              value={data.user.shift_number || "-"}
            />
            <InfoTile
              label={text({ ro: "Username", en: "Username", de: "Benutzername" })}
              value={data.user.unique_code || "-"}
            />
            <InfoTile
              label={text({
                ro: "Documente totale",
                en: "Total documents",
                de: "Dokumente gesamt",
              })}
              value={documents.total_documents}
            />
          </div>
        </SectionCard>

        <SectionCard
          title={text({
            ro: "Date de logare",
            en: "Login details",
            de: "Anmeldedaten",
          })}
          icon={<KeyRound className="h-5 w-5" />}
          actions={
            !isEditingAccount ? (
              <ActionButton variant="secondary" onClick={() => startEdit("account")}>
                {text({ ro: "Editează", en: "Edit", de: "Bearbeiten" })}
              </ActionButton>
            ) : (
              <div className="flex flex-wrap gap-2">
                <ActionButton onClick={handleSaveAccount} disabled={saving === "account"}>
                  {saving === "account"
                    ? text({ ro: "Se salvează...", en: "Saving...", de: "Wird gespeichert..." })
                    : text({ ro: "Salvează", en: "Save", de: "Speichern" })}
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onClick={() => resetEditState()}
                  disabled={saving === "account"}
                >
                  {text({ ro: "Anulează", en: "Cancel", de: "Abbrechen" })}
                </ActionButton>
              </div>
            )
          }
        >
          {!isEditingAccount ? (
            <div className="grid gap-4 md:grid-cols-2">
              <InfoTile
                label={text({ ro: "Username", en: "Username", de: "Benutzername" })}
                value={data.user.unique_code || "-"}
              />
              <InfoTile
                label="PIN"
                value={text({
                  ro: "Ascuns pentru securitate",
                  en: "Hidden for security",
                  de: "Aus Sicherheitsgründen verborgen",
                })}
              />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label={text({ ro: "Username", en: "Username", de: "Benutzername" })}
                value={form.username}
                onChange={(value) => setField("username", normalizeSpaces(value))}
                placeholder={text({
                  ro: "Username",
                  en: "Username",
                  de: "Benutzername",
                })}
              />
              <Field
                label="PIN"
                type="password"
                value={form.pin}
                onChange={(value) =>
                  setField("pin", value.replace(/[^\d]/g, "").slice(0, 4))
                }
                placeholder={text({
                  ro: "4 cifre",
                  en: "4 digits",
                  de: "4 Ziffern",
                })}
              />
            </div>
          )}
        </SectionCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard
          title={text({
            ro: "Date personale",
            en: "Personal details",
            de: "Persönliche Daten",
          })}
          icon={<Phone className="h-5 w-5" />}
          actions={
            !isEditingProfile ? (
              <ActionButton variant="secondary" onClick={() => startEdit("profile")}>
                {text({ ro: "Editează", en: "Edit", de: "Bearbeiten" })}
              </ActionButton>
            ) : (
              <div className="flex flex-wrap gap-2">
                <ActionButton onClick={handleSaveProfile} disabled={saving === "profile"}>
                  {saving === "profile"
                    ? text({ ro: "Se salvează...", en: "Saving...", de: "Wird gespeichert..." })
                    : text({ ro: "Salvează", en: "Save", de: "Speichern" })}
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  onClick={() => resetEditState()}
                  disabled={saving === "profile"}
                >
                  {text({ ro: "Anulează", en: "Cancel", de: "Abbrechen" })}
                </ActionButton>
              </div>
            )
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <ProfileField
              label={text({ ro: "Prenume", en: "First name", de: "Vorname" })}
              editing={isEditingProfile}
              value={form.firstName}
              displayValue={profile?.first_name || "-"}
              onChange={(value) => setField("firstName", normalizeName(value))}
              placeholder="John"
            />
            <ProfileField
              label={text({ ro: "Nume", en: "Last name", de: "Nachname" })}
              editing={isEditingProfile}
              value={form.lastName}
              displayValue={profile?.last_name || "-"}
              onChange={(value) => setField("lastName", normalizeName(value))}
              placeholder="Doe"
            />
            <ProfileField
              label={text({ ro: "Telefon", en: "Phone", de: "Telefon" })}
              editing={isEditingProfile}
              value={form.phone}
              displayValue={profile?.phone || "-"}
              onChange={(value) => setField("phone", normalizePhone(value))}
              placeholder="+447..."
            />
            <ProfileField
              label={text({ ro: "Stradă", en: "Street", de: "Straße" })}
              editing={isEditingProfile}
              value={form.street}
              displayValue={parsedDisplayAddress.street || "-"}
              onChange={(value) => setField("street", normalizeAddressText(value))}
              placeholder="Baker Street"
            />
            <ProfileField
              label={text({
                ro: "Număr stradă",
                en: "Street number",
                de: "Hausnummer",
              })}
              editing={isEditingProfile}
              value={form.streetNumber}
              displayValue={parsedDisplayAddress.streetNumber || "-"}
              onChange={(value) => setField("streetNumber", normalizeAddressText(value))}
              placeholder="221B"
            />
            <ProfileField
              label={text({ ro: "Apartament", en: "Apartment", de: "Wohnung" })}
              editing={isEditingProfile}
              value={form.apartment}
              displayValue={parsedDisplayAddress.apartment || "-"}
              onChange={(value) => setField("apartment", normalizeAddressText(value))}
              placeholder="12"
            />
            <ProfileField
              label={text({ ro: "Cod poștal", en: "Postcode", de: "Postleitzahl" })}
              editing={isEditingProfile}
              value={form.postcode}
              displayValue={parsedDisplayAddress.postcode || "-"}
              onChange={(value) => setField("postcode", normalizePostcode(value))}
              placeholder="NW1 6XE"
            />
            <ProfileField
              label={text({
                ro: "Contact de urgență",
                en: "Emergency contact",
                de: "Notfallkontakt",
              })}
              editing={isEditingProfile}
              value={form.emergencyContactName}
              displayValue={profile?.emergency_contact_name || "-"}
              onChange={(value) => setField("emergencyContactName", normalizeName(value))}
              placeholder="Jane Doe"
            />
            <div className="md:col-span-2">
              <ProfileField
                label={text({
                  ro: "Telefon urgență",
                  en: "Emergency phone",
                  de: "Notfalltelefon",
                })}
                editing={isEditingProfile}
                value={form.emergencyContactPhone}
                displayValue={profile?.emergency_contact_phone || "-"}
                onChange={(value) => setField("emergencyContactPhone", normalizePhone(value))}
                placeholder="+447..."
              />
            </div>
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="IBAN"
            icon={<IdCard className="h-5 w-5" />}
            actions={
              !isEditingIban ? (
                <ActionButton variant="secondary" onClick={() => startEdit("iban")}>
                  {text({ ro: "Editează", en: "Edit", de: "Bearbeiten" })}
                </ActionButton>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <ActionButton onClick={handleSaveIban} disabled={saving === "iban"}>
                    {saving === "iban"
                      ? text({ ro: "Se salvează...", en: "Saving...", de: "Wird gespeichert..." })
                      : text({ ro: "Salvează", en: "Save", de: "Speichern" })}
                  </ActionButton>
                  <ActionButton
                    variant="secondary"
                    onClick={() => resetEditState()}
                    disabled={saving === "iban"}
                  >
                    {text({ ro: "Anulează", en: "Cancel", de: "Abbrechen" })}
                  </ActionButton>
                </div>
              )
            }
          >
            {!isEditingIban ? (
              <InfoTile label="IBAN" value={profile?.iban || "-"} mono />
            ) : (
              <div>
                <Field
                  label="IBAN"
                  value={form.iban}
                  onChange={(value) => {
                    setField("iban", normalizeIban(value));
                    if (ibanError) setIbanError("");
                  }}
                  placeholder="RO49AAAA1B31007593840000"
                  mono
                />
                {ibanError ? (
                  <p className="mt-3 text-sm font-medium text-red-600">{ibanError}</p>
                ) : null}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title={text({
              ro: "Rezumat documente",
              en: "Documents summary",
              de: "Dokumentenzusammenfassung",
            })}
            icon={<BadgeCheck className="h-5 w-5" />}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <InfoTile
                label={text({
                  ro: "Total documente",
                  en: "Total documents",
                  de: "Dokumente gesamt",
                })}
                value={documents.total_documents}
              />
              <InfoTile
                label={text({
                  ro: "Documente personale",
                  en: "Personal documents",
                  de: "Persönliche Dokumente",
                })}
                value={documents.personal_documents}
              />
              <InfoTile
                label={text({
                  ro: "Documente companie",
                  en: "Company documents",
                  de: "Firmendokumente",
                })}
                value={documents.company_documents}
              />
              <InfoTile
                label={text({ ro: "Contract", en: "Contract", de: "Vertrag" })}
                value={
                  documents.has_contract
                    ? text({ ro: "Da", en: "Yes", de: "Ja" })
                    : text({ ro: "Nu", en: "No", de: "Nein" })
                }
              />
              <InfoTile
                label={text({
                  ro: "Fluturaș salariu",
                  en: "Payslip",
                  de: "Gehaltsabrechnung",
                })}
                value={
                  documents.has_payslip
                    ? text({ ro: "Da", en: "Yes", de: "Ja" })
                    : text({ ro: "Nu", en: "No", de: "Nein" })
                }
              />
              <InfoTile
                label={text({
                  ro: "Permis auto",
                  en: "Driver license",
                  de: "Führerschein",
                })}
                value={
                  documents.has_driver_license
                    ? text({ ro: "Da", en: "Yes", de: "Ja" })
                    : text({ ro: "Nu", en: "No", de: "Nein" })
                }
              />
            </div>
          </SectionCard>
        </div>
      </section>
    </div>
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
      ? "rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      : "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={[
          "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200",
          mono ? "font-mono uppercase tracking-[0.05em]" : "",
        ].join(" ")}
      />
    </div>
  );
}

function ProfileField({
  label,
  editing,
  value,
  displayValue,
  onChange,
  placeholder,
}: {
  label: string;
  editing: boolean;
  value: string;
  displayValue: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return editing ? (
    <Field label={label} value={value} onChange={onChange} placeholder={placeholder} />
  ) : (
    <InfoTile label={label} value={displayValue} />
  );
}

function InfoTile({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p
        className={[
          "mt-2 break-words text-sm font-semibold text-slate-900",
          mono ? "font-mono" : "",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}