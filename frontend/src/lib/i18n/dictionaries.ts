export const dictionaries = {
  en: {
    common: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      loading: "Loading...",
      logout: "Logout",
      search: "Search",
      actions: "Actions",
      status: "Status",
      yes: "Yes",
      no: "No",
    },
    nav: {
      dashboard: "Dashboard",
      users: "Users",
      vehicles: "Vehicles",
      assignments: "Assignments",
      issues: "Issues",
      documents: "Documents",
      leave: "Leave",
      alerts: "Alerts",
      profile: "Profile",
      myVehicle: "My vehicle",
      session: "Session",
    },
    dashboard: {
      title: "Dashboard",
      subtitle: "Overview of your fleet and activity",
    },
  },

  ro: {
    common: {
      save: "Salvează",
      cancel: "Anulează",
      delete: "Șterge",
      edit: "Editează",
      loading: "Se încarcă...",
      logout: "Deconectare",
      search: "Caută",
      actions: "Acțiuni",
      status: "Status",
      yes: "Da",
      no: "Nu",
    },
    nav: {
      dashboard: "Dashboard",
      users: "Utilizatori",
      vehicles: "Vehicule",
      assignments: "Alocări",
      issues: "Probleme",
      documents: "Documente",
      leave: "Concedii",
      alerts: "Alerte",
      profile: "Profil",
      myVehicle: "Vehiculul meu",
      session: "Sesiune",
    },
    dashboard: {
      title: "Dashboard",
      subtitle: "Privire de ansamblu asupra flotei și activității",
    },
  },

  de: {
    common: {
      save: "Speichern",
      cancel: "Abbrechen",
      delete: "Löschen",
      edit: "Bearbeiten",
      loading: "Wird geladen...",
      logout: "Abmelden",
      search: "Suchen",
      actions: "Aktionen",
      status: "Status",
      yes: "Ja",
      no: "Nein",
    },
    nav: {
      dashboard: "Dashboard",
      users: "Benutzer",
      vehicles: "Fahrzeuge",
      assignments: "Zuweisungen",
      issues: "Probleme",
      documents: "Dokumente",
      leave: "Urlaub",
      alerts: "Warnungen",
      profile: "Profil",
      myVehicle: "Mein Fahrzeug",
      session: "Sitzung",
    },
    dashboard: {
      title: "Dashboard",
      subtitle: "Übersicht über Fuhrpark und Aktivität",
    },
  },
} as const;

export type Locale = keyof typeof dictionaries;

export const defaultLocale: Locale = "ro";
export const locales: Locale[] = ["ro", "en", "de"];

type Dictionary = typeof dictionaries.en;

export type TranslationNamespace = keyof Dictionary;
export type TranslationKey<N extends TranslationNamespace> = keyof Dictionary[N];

type FlatDictionary = Record<string, Record<string, string>>;

export function getTranslation(
  locale: Locale,
  namespace: string,
  key: string
): string {
  const currentDictionary = dictionaries[locale] as FlatDictionary;
  const fallbackDictionary = dictionaries[defaultLocale] as FlatDictionary;

  return (
    currentDictionary[namespace]?.[key] ??
    fallbackDictionary[namespace]?.[key] ??
    key
  );
}