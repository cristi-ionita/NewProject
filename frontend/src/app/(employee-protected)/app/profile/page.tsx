"use client";

import { useEffect, useMemo, useState } from "react";
import { getUserSession, saveUserSession } from "@/lib/auth";
import { extractErrorMessage } from "@/lib/error";
import {
  getMyProfileSummary,
  type ProfileSummaryResponse,
  updateMyProfile,
} from "@/services/profile.api";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  BadgeCheck,
  FileText,
  IdCard,
  KeyRound,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function isValidIban(value: string) {
  const iban = normalizeIban(value);

  if (!iban) return true;
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return false;
  if (iban.length < 15 || iban.length > 34) return false;

  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let numeric = "";

  for (const ch of rearranged) {
    if (/[A-Z]/.test(ch)) {
      numeric += (ch.charCodeAt(0) - 55).toString();
    } else {
      numeric += ch;
    }
  }

  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }

  return remainder === 1;
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .trimStart()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeName(value: string) {
  return toTitleCase(value);
}

function normalizeText(value: string) {
  return value.trimStart().replace(/\s+/g, " ");
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

function cardClass() {
  return "rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]";
}

function tileClass() {
  return "rounded-[18px] border border-slate-200 bg-slate-50/80 p-4";
}

function sectionLabelClass() {
  return "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";
}

function displayValueClass() {
  return "mt-2 text-sm font-medium text-slate-900";
}

function displayValueStrongClass() {
  return "mt-2 text-sm font-semibold text-slate-900";
}

function inputClass() {
  return "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200";
}

function ibanInputClass() {
  return "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-mono text-sm uppercase tracking-[0.05em] text-slate-900 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-200";
}

function buttonPrimaryClass() {
  return "rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60";
}

function buttonSecondaryClass() {
  return "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";
}

function formatAddress({
  street,
  streetNumber,
  apartment,
  postcode,
}: {
  street: string;
  streetNumber: string;
  apartment: string;
  postcode: string;
}) {
  const parts = [
    street.trim() ? `Street: ${street.trim()}` : "",
    streetNumber.trim() ? `Number: ${streetNumber.trim()}` : "",
    apartment.trim() ? `Apartment: ${apartment.trim()}` : "",
    postcode.trim() ? `Postcode: ${postcode.trim()}` : "",
  ].filter(Boolean);

  return parts.join(", ");
}

function parseAddress(address: string) {
  if (!address?.trim()) {
    return {
      street: "",
      streetNumber: "",
      apartment: "",
      postcode: "",
      raw: "",
    };
  }

  const result = {
    street: "",
    streetNumber: "",
    apartment: "",
    postcode: "",
    raw: address,
  };

  const streetMatch = address.match(/Street:\s*([^,]+)/i);
  const numberMatch = address.match(/Number:\s*([^,]+)/i);
  const apartmentMatch = address.match(/Apartment:\s*([^,]+)/i);
  const postcodeMatch = address.match(/Postcode:\s*([^,]+)/i);

  if (streetMatch) result.street = streetMatch[1].trim();
  if (numberMatch) result.streetNumber = numberMatch[1].trim();
  if (apartmentMatch) result.apartment = apartmentMatch[1].trim();
  if (postcodeMatch) result.postcode = postcodeMatch[1].trim();

  if (!streetMatch && !numberMatch && !apartmentMatch && !postcodeMatch) {
    result.street = address;
  }

  return result;
}

export default function EmployeeProfilePage() {
  const { locale } = useI18n();

  const [data, setData] = useState<ProfileSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editingAccount, setEditingAccount] = useState(false);
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);

  const [editingProfile, setEditingProfile] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [street, setStreet] = useState("");
  const [streetNumber, setStreetNumber] = useState("");
  const [apartment, setApartment] = useState("");
  const [postcode, setPostcode] = useState("");

  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [editingIban, setEditingIban] = useState(false);
  const [iban, setIban] = useState("");
  const [savingIban, setSavingIban] = useState(false);
  const [ibanError, setIbanError] = useState("");

  function text(values: { ro: string; en: string; de: string }) {
    return values[locale];
  }

  async function loadProfile() {
    try {
      const session = getUserSession();

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
      const result = await getMyProfileSummary(session.unique_code);
      setData(result);

      setUsername(result.user.unique_code || "");
      setPin("");

      setFirstName(result.employee_profile?.first_name || "");
      setLastName(result.employee_profile?.last_name || "");
      setPhone(result.employee_profile?.phone || "");

      const parsedAddress = parseAddress(result.employee_profile?.address || "");
      setStreet(parsedAddress.street);
      setStreetNumber(parsedAddress.streetNumber);
      setApartment(parsedAddress.apartment);
      setPostcode(parsedAddress.postcode);

      setEmergencyContactName(result.employee_profile?.emergency_contact_name || "");
      setEmergencyContactPhone(result.employee_profile?.emergency_contact_phone || "");
      setIban(result.employee_profile?.iban || "");
      setIbanError("");
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut încărca profilul",
            en: "Could not load profile",
            de: "Profil konnte nicht geladen werden",
          })
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function handleSaveAccount() {
    try {
      const session = getUserSession();

      if (!session?.unique_code) {
        setError(
          text({
            ro: "Sesiune user invalidă.",
            en: "Invalid user session.",
            de: "Ungültige Benutzersitzung.",
          })
        );
        return;
      }

      setSavingAccount(true);
      setError("");

      const nextUsername = normalizeText(username);

      await updateMyProfile(session.unique_code, {
        username: nextUsername || null,
        pin: pin.trim() || undefined,
      });

      saveUserSession({
        ...session,
        unique_code: nextUsername || session.unique_code,
      });

      await loadProfile();
      setEditingAccount(false);
      setPin("");
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut salva datele de logare",
            en: "Could not save login details",
            de: "Anmeldedaten konnten nicht gespeichert werden",
          })
        )
      );
    } finally {
      setSavingAccount(false);
    }
  }

  async function handleSaveProfile() {
    try {
      const session = getUserSession();

      if (!session?.unique_code) {
        setError(
          text({
            ro: "Sesiune user invalidă.",
            en: "Invalid user session.",
            de: "Ungültige Benutzersitzung.",
          })
        );
        return;
      }

      setSavingProfile(true);
      setError("");

      const formattedAddress = formatAddress({
        street: normalizeAddressText(street),
        streetNumber: normalizeAddressText(streetNumber),
        apartment: normalizeAddressText(apartment),
        postcode: normalizePostcode(postcode),
      });

      await updateMyProfile(session.unique_code, {
        first_name: normalizeName(firstName) || null,
        last_name: normalizeName(lastName) || null,
        phone: phone.trim() || null,
        address: formattedAddress || null,
        emergency_contact_name: normalizeName(emergencyContactName) || null,
        emergency_contact_phone: emergencyContactPhone.trim() || null,
      });

      await loadProfile();
      setEditingProfile(false);
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut salva datele personale",
            en: "Could not save personal details",
            de: "Persönliche Daten konnten nicht gespeichert werden",
          })
        )
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveIban() {
    try {
      const session = getUserSession();

      if (!session?.unique_code) {
        setError(
          text({
            ro: "Sesiune user invalidă.",
            en: "Invalid user session.",
            de: "Ungültige Benutzersitzung.",
          })
        );
        return;
      }

      const normalized = normalizeIban(iban);

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

      setSavingIban(true);
      setError("");
      setIbanError("");

      await updateMyProfile(session.unique_code, {
        first_name: normalizeName(firstName) || null,
        last_name: normalizeName(lastName) || null,
        iban: normalized || null,
      });

      await loadProfile();
      setEditingIban(false);
    } catch (err: unknown) {
      setError(
        extractErrorMessage(
          err,
          text({
            ro: "Nu am putut salva IBAN-ul",
            en: "Could not save IBAN",
            de: "IBAN konnte nicht gespeichert werden",
          })
        )
      );
    } finally {
      setSavingIban(false);
    }
  }

  function resetAccountEdit() {
    setUsername(data?.user.unique_code || "");
    setPin("");
    setEditingAccount(false);
    setError("");
  }

  function resetProfileEdit() {
    setFirstName(data?.employee_profile?.first_name || "");
    setLastName(data?.employee_profile?.last_name || "");
    setPhone(data?.employee_profile?.phone || "");

    const parsedAddress = parseAddress(data?.employee_profile?.address || "");
    setStreet(parsedAddress.street);
    setStreetNumber(parsedAddress.streetNumber);
    setApartment(parsedAddress.apartment);
    setPostcode(parsedAddress.postcode);

    setEmergencyContactName(data?.employee_profile?.emergency_contact_name || "");
    setEmergencyContactPhone(data?.employee_profile?.emergency_contact_phone || "");
    setEditingProfile(false);
    setError("");
  }

  function resetIbanEdit() {
    setIban(data?.employee_profile?.iban || "");
    setIbanError("");
    setEditingIban(false);
    setError("");
  }

  const profile = data?.employee_profile;

  const fullEmployeeName = useMemo(() => {
    const fn = normalizeName(firstName).trim();
    const ln = normalizeName(lastName).trim();

    if (fn || ln) return `${fn} ${ln}`.trim();
    if (profile?.first_name || profile?.last_name) {
      return `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim();
    }
    return data?.user.full_name || "-";
  }, [firstName, lastName, profile, data?.user.full_name]);

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

  if (error && !data) {
    return (
      <div className="rounded-[24px] border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className={cardClass()}>
        <div className="text-sm text-slate-500">
          {text({
            ro: "Nu există date.",
            en: "There is no data.",
            de: "Es sind keine Daten vorhanden.",
          })}
        </div>
      </div>
    );
  }

  const documents = data.documents_summary;
  const parsedDisplayAddress = parseAddress(profile?.address || "");

  return (
    <div className="space-y-5 text-slate-900">
      <section className="relative overflow-hidden rounded-[26px] border border-slate-200 bg-slate-950 p-4 sm:p-5 shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_24%)]" />

        <div className="relative">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2.5">
              <div>
                <h1 className="text-[30px] font-semibold tracking-tight text-white sm:text-[34px]">
                  {text({
                    ro: "Profilul meu",
                    en: "My Profile",
                    de: "Mein Profil",
                  })}
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-300">
                  {text({
                    ro: "Vezi informațiile contului și datele tale personale.",
                    en: "View your account information and personal details.",
                    de: "Sieh deine Kontoinformationen und persönlichen Daten an.",
                  })}
                </p>
              </div>
            </div>

            <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-3">
              <HeroStatCard
                icon={<UserRound className="h-3.5 w-3.5" />}
                label={text({
                  ro: "Angajat",
                  en: "Employee",
                  de: "Mitarbeiter",
                })}
                value={fullEmployeeName}
              />
              <HeroStatCard
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                label={text({
                  ro: "Tură",
                  en: "Shift",
                  de: "Schicht",
                })}
                value={data.user.shift_number || "-"}
              />
              <HeroStatCard
                icon={<FileText className="h-3.5 w-3.5" />}
                label={text({
                  ro: "Documente",
                  en: "Documents",
                  de: "Dokumente",
                })}
                value={String(documents.total_documents)}
              />
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
          {error}
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className={cardClass()}>
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
              <UserRound className="h-4.5 w-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {text({
                  ro: "Prezentare",
                  en: "Overview",
                  de: "Übersicht",
                })}
              </p>
              <h2 className="text-[17px] font-semibold text-slate-950">
                {text({
                  ro: "Angajat",
                  en: "Employee",
                  de: "Mitarbeiter",
                })}
              </h2>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className={tileClass()}>
              <p className={sectionLabelClass()}>
                {text({ ro: "Nume", en: "Name", de: "Name" })}
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">{fullEmployeeName}</p>
            </div>

            <div className={tileClass()}>
              <p className={sectionLabelClass()}>
                {text({ ro: "Tură", en: "Shift", de: "Schicht" })}
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {data.user.shift_number || "-"}
              </p>
            </div>
          </div>
        </div>

        <div className={cardClass()}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                <KeyRound className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {text({
                    ro: "Securitate",
                    en: "Security",
                    de: "Sicherheit",
                  })}
                </p>
                <h2 className="text-[17px] font-semibold text-slate-950">
                  {text({
                    ro: "Date de logare",
                    en: "Login details",
                    de: "Anmeldedaten",
                  })}
                </h2>
              </div>
            </div>

            {!editingAccount ? (
              <button
                type="button"
                onClick={() => setEditingAccount(true)}
                className={buttonSecondaryClass()}
              >
                {text({
                  ro: "Schimbă datele de logare",
                  en: "Change login details",
                  de: "Anmeldedaten ändern",
                })}
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveAccount}
                  disabled={savingAccount}
                  className={buttonPrimaryClass()}
                >
                  {savingAccount
                    ? text({ ro: "Se salvează...", en: "Saving...", de: "Wird gespeichert..." })
                    : text({ ro: "Salvează", en: "Save", de: "Speichern" })}
                </button>

                <button
                  type="button"
                  onClick={resetAccountEdit}
                  disabled={savingAccount}
                  className={buttonSecondaryClass()}
                >
                  {text({ ro: "Anulează", en: "Cancel", de: "Abbrechen" })}
                </button>
              </div>
            )}
          </div>

          {!editingAccount ? (
            <div className={tileClass()}>
              <p className="text-sm text-slate-500">
                {text({
                  ro: "Datele de logare sunt ascunse.",
                  en: "Login details are hidden.",
                  de: "Anmeldedaten sind ausgeblendet.",
                })}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div className={tileClass()}>
                <p className={sectionLabelClass()}>
                  {text({ ro: "Username", en: "Username", de: "Benutzername" })}
                </p>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(normalizeText(e.target.value))}
                  placeholder={text({
                    ro: "Username",
                    en: "Username",
                    de: "Benutzername",
                  })}
                  className={inputClass()}
                />
              </div>

              <div className={tileClass()}>
                <p className={sectionLabelClass()}>PIN</p>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder={text({
                    ro: "4 cifre",
                    en: "4 digits",
                    de: "4 Ziffern",
                  })}
                  className={inputClass()}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className={cardClass()}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                <Phone className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {text({
                    ro: "Date personale",
                    en: "Personal details",
                    de: "Persönliche Daten",
                  })}
                </p>
                <h2 className="text-[17px] font-semibold text-slate-950">
                  {text({
                    ro: "Profil",
                    en: "Profile",
                    de: "Profil",
                  })}
                </h2>
              </div>
            </div>

            {!editingProfile ? (
              <button
                type="button"
                onClick={() => setEditingProfile(true)}
                className={buttonSecondaryClass()}
              >
                {text({ ro: "Editează", en: "Edit", de: "Bearbeiten" })}
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className={buttonPrimaryClass()}
                >
                  {savingProfile
                    ? text({ ro: "Se salvează...", en: "Saving...", de: "Wird gespeichert..." })
                    : text({ ro: "Salvează", en: "Save", de: "Speichern" })}
                </button>

                <button
                  type="button"
                  onClick={resetProfileEdit}
                  disabled={savingProfile}
                  className={buttonSecondaryClass()}
                >
                  {text({ ro: "Anulează", en: "Cancel", de: "Abbrechen" })}
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <DetailField
              label={text({ ro: "Prenume", en: "First name", de: "Vorname" })}
              editing={editingProfile}
              value={firstName}
              displayValue={profile?.first_name || "-"}
              onChange={(v) => setFirstName(normalizeName(v))}
              placeholder="John"
            />
            <DetailField
              label={text({ ro: "Nume", en: "Last name", de: "Nachname" })}
              editing={editingProfile}
              value={lastName}
              displayValue={profile?.last_name || "-"}
              onChange={(v) => setLastName(normalizeName(v))}
              placeholder="Doe"
            />
            <DetailField
              label={text({ ro: "Telefon", en: "Phone", de: "Telefon" })}
              editing={editingProfile}
              value={phone}
              displayValue={profile?.phone || "-"}
              onChange={(v) => setPhone(normalizePhone(v))}
              placeholder="+447..."
            />
            <DetailField
              label={text({ ro: "Stradă", en: "Street", de: "Straße" })}
              editing={editingProfile}
              value={street}
              displayValue={parsedDisplayAddress.street || "-"}
              onChange={(v) => setStreet(normalizeAddressText(v))}
              placeholder="Baker Street"
            />
            <DetailField
              label={text({
                ro: "Număr stradă",
                en: "Street number",
                de: "Hausnummer",
              })}
              editing={editingProfile}
              value={streetNumber}
              displayValue={parsedDisplayAddress.streetNumber || "-"}
              onChange={(v) => setStreetNumber(normalizeAddressText(v))}
              placeholder="221B"
            />
            <DetailField
              label={text({ ro: "Apartament", en: "Apartment", de: "Wohnung" })}
              editing={editingProfile}
              value={apartment}
              displayValue={parsedDisplayAddress.apartment || "-"}
              onChange={(v) => setApartment(normalizeAddressText(v))}
              placeholder="12"
            />
            <DetailField
              label={text({ ro: "Cod poștal", en: "Postcode", de: "Postleitzahl" })}
              editing={editingProfile}
              value={postcode}
              displayValue={parsedDisplayAddress.postcode || "-"}
              onChange={(v) => setPostcode(normalizePostcode(v))}
              placeholder="NW1 6XE"
            />
            <DetailField
              label={text({
                ro: "Contact de urgență",
                en: "Emergency contact",
                de: "Notfallkontakt",
              })}
              editing={editingProfile}
              value={emergencyContactName}
              displayValue={profile?.emergency_contact_name || "-"}
              onChange={(v) => setEmergencyContactName(normalizeName(v))}
              placeholder="Jane Doe"
            />
            <div className="md:col-span-2">
              <DetailField
                label={text({
                  ro: "Telefon urgență",
                  en: "Emergency phone",
                  de: "Notfalltelefon",
                })}
                editing={editingProfile}
                value={emergencyContactPhone}
                displayValue={profile?.emergency_contact_phone || "-"}
                onChange={(v) => setEmergencyContactPhone(normalizePhone(v))}
                placeholder="+447..."
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className={cardClass()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <IdCard className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {text({
                      ro: "Bancar",
                      en: "Banking",
                      de: "Banking",
                    })}
                  </p>
                  <h2 className="text-[17px] font-semibold text-slate-950">IBAN</h2>
                </div>
              </div>

              {!editingIban ? (
                <button
                  type="button"
                  onClick={() => setEditingIban(true)}
                  className={buttonSecondaryClass()}
                >
                  {text({ ro: "Editează", en: "Edit", de: "Bearbeiten" })}
                </button>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSaveIban}
                    disabled={savingIban}
                    className={buttonPrimaryClass()}
                  >
                    {savingIban
                      ? text({ ro: "Se salvează...", en: "Saving...", de: "Wird gespeichert..." })
                      : text({ ro: "Salvează", en: "Save", de: "Speichern" })}
                  </button>

                  <button
                    type="button"
                    onClick={resetIbanEdit}
                    disabled={savingIban}
                    className={buttonSecondaryClass()}
                  >
                    {text({ ro: "Anulează", en: "Cancel", de: "Abbrechen" })}
                  </button>
                </div>
              )}
            </div>

            <div className={tileClass()}>
              <p className={sectionLabelClass()}>IBAN</p>

              {editingIban ? (
                <>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => {
                      setIban(normalizeIban(e.target.value));
                      if (ibanError) setIbanError("");
                    }}
                    placeholder="RO49AAAA1B31007593840000"
                    className={ibanInputClass()}
                  />
                  {ibanError ? (
                    <p className="mt-2 text-sm font-medium text-red-600">{ibanError}</p>
                  ) : null}
                </>
              ) : (
                <p className="mt-2 break-all font-mono text-sm text-slate-900">
                  {profile?.iban || "-"}
                </p>
              )}
            </div>
          </div>

          <div className={cardClass()}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                <BadgeCheck className="h-4.5 w-4.5" />
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
                    ro: "Rezumat",
                    en: "Summary",
                    de: "Zusammenfassung",
                  })}
                </h2>
              </div>
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-2">
              <DocTile
                label={text({
                  ro: "Total documente",
                  en: "Total documents",
                  de: "Dokumente gesamt",
                })}
                value={documents.total_documents}
              />
              <DocTile
                label={text({
                  ro: "Documente personale",
                  en: "Personal documents",
                  de: "Persönliche Dokumente",
                })}
                value={documents.personal_documents}
              />
              <DocTile
                label={text({
                  ro: "Documente companie",
                  en: "Company documents",
                  de: "Firmendokumente",
                })}
                value={documents.company_documents}
              />
              <DocTile
                label={text({ ro: "Contract", en: "Contract", de: "Vertrag" })}
                value={
                  documents.has_contract
                    ? text({ ro: "Da", en: "Yes", de: "Ja" })
                    : text({ ro: "Nu", en: "No", de: "Nein" })
                }
              />
              <DocTile
                label={text({ ro: "Fluturaș salariu", en: "Payslip", de: "Gehaltsabrechnung" })}
                value={
                  documents.has_payslip
                    ? text({ ro: "Da", en: "Yes", de: "Ja" })
                    : text({ ro: "Nu", en: "No", de: "Nein" })
                }
              />
              <DocTile
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
          </div>
        </div>
      </section>
    </div>
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

function DetailField({
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
  return (
    <div>
      <p className={sectionLabelClass()}>{label}</p>
      {editing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass()}
        />
      ) : (
        <p className={displayValueClass()}>{displayValue}</p>
      )}
    </div>
  );
}

function DocTile({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className={tileClass()}>
      <p className={sectionLabelClass()}>{label}</p>
      <p className={displayValueStrongClass()}>{value}</p>
    </div>
  );
}