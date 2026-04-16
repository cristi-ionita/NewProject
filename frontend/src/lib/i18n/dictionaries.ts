export const dictionaries = {
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
      active: "Activ",
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
      active: "Active",
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
      active: "Aktiv",
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

export const defaultLocale: Locale = "de";
export const locales: Locale[] = ["ro", "en", "de"];

type Dictionary = typeof dictionaries.ro;

export type TranslationNamespace = keyof Dictionary;
export type TranslationKey<N extends TranslationNamespace> = keyof Dictionary[N];

type FlatDictionary = Record<string, Record<string, string>>;

export function getTranslation<
  N extends TranslationNamespace,
  K extends TranslationKey<N>
>(locale: Locale, namespace: N, key: K): string {
  const currentDictionary = dictionaries[locale] as unknown as FlatDictionary;
  const fallbackDictionary =
    dictionaries[defaultLocale] as unknown as FlatDictionary;

  return (
    currentDictionary[String(namespace)]?.[String(key)] ??
    fallbackDictionary[String(namespace)]?.[String(key)] ??
    String(key)
  );
}