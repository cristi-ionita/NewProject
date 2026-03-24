import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "de",
    lng: "de",
    interpolation: {
      escapeValue: false,
    },

    resources: {
      de: {
        translation: {
          // GENERAL
          back: "Zurück",
          logout: "Abmelden",
          loading: "Wird geladen...",
          refresh: "Aktualisieren",
          yes: "Ja",
          no: "Nein",

          // LOGIN
          login: "Login",
          selectUser: "Benutzer auswählen",
          admin: "Admin",
          adminPassword: "Admin-Passwort",
          pin: "PIN (4 Ziffern)",
          loggingIn: "Einloggen...",
          loginFailed: "Login fehlgeschlagen",

          // ADMIN DASHBOARD
          adminDashboard: "Admin Dashboard",
          createUsers: "Benutzer erstellen",
          createVehicles: "Fahrzeuge erstellen",
          vehicleIssues: "Fahrzeugprobleme",

          // ADMIN USERS
          adminUsers: "Admin - Benutzer",
          createUser: "Benutzer erstellen",
          editUser: "Benutzer bearbeiten",
          fullName: "Name",
          shiftNumber: "Schicht",
          active: "Aktiv",
          inactive: "Inaktiv",
          deactivate: "Deaktivieren",
          activate: "Aktivieren",
          save: "Speichern",
          cancel: "Abbrechen",

          // ADMIN VEHICLES
          adminVehiclesTitle: "Admin - Fahrzeuge",
          createVehicle: "Fahrzeug erstellen",
          brand: "Marke",
          model: "Modell",
          licensePlate: "Kennzeichen",
          year: "Jahr",
          vinOptional: "VIN (optional)",
          mileage: "Kilometerstand",
          delete: "Löschen",

          // VEHICLE STATUS
          activeVehicle: "Aktiv",
          inService: "Im Service",
          inactiveVehicle: "Inaktiv",

          // VEHICLE ISSUES
          adminVehicleIssues: "Admin - Fahrzeugprobleme",
          totalIssues: "Gesamtprobleme",
          reportedBy: "Gemeldet von",
          status: "Status",
          serviceInKm: "Service in km",
          brakes: "Bremsen",
          tires: "Reifen",
          oil: "Öl",
          dashboardChecks: "Kontrollleuchten",
          otherProblems: "Andere Probleme",
          createdAt: "Erstellt am",
          noIssues: "Keine Probleme gemeldet",
          loadIssuesError: "Probleme konnten nicht geladen werden.",
          backendConnectionError: "Verbindung zum Backend nicht möglich.",

          open: "Offen",
          inProgress: "In Bearbeitung",
          resolved: "Gelöst",

          // USER HOME
          currentVehicle: "Aktuelles Fahrzeug",
          noVehicleAssigned: "Kein Fahrzeug zugewiesen",
          submitIssues: "Probleme senden",
          sending: "Wird gesendet...",
          issuesSent: "Probleme erfolgreich gesendet",

          // PICKUP / RETURN
          pickupVehicle: "Fahrzeug übernehmen",
          returnVehicle: "Fahrzeug zurückgeben",
          confirmPickup: "Übernahme bestätigen",
          confirmReturn: "Rückgabe bestätigen",
        },
      },

      en: {
        translation: {
          // GENERAL
          back: "Back",
          logout: "Logout",
          loading: "Loading...",
          refresh: "Refresh",
          yes: "Yes",
          no: "No",

          // LOGIN
          login: "Login",
          selectUser: "Select user",
          admin: "Admin",
          adminPassword: "Admin password",
          pin: "PIN (4 digits)",
          loggingIn: "Logging in...",
          loginFailed: "Login failed",

          // ADMIN DASHBOARD
          adminDashboard: "Admin Dashboard",
          createUsers: "Create users",
          createVehicles: "Create vehicles",
          vehicleIssues: "Vehicle issues",

          // ADMIN USERS
          adminUsers: "Admin - Users",
          createUser: "Create user",
          editUser: "Edit user",
          fullName: "Full name",
          shiftNumber: "Shift",
          active: "Active",
          inactive: "Inactive",
          deactivate: "Deactivate",
          activate: "Activate",
          save: "Save",
          cancel: "Cancel",

          // ADMIN VEHICLES
          adminVehiclesTitle: "Admin - Vehicles",
          createVehicle: "Create vehicle",
          brand: "Brand",
          model: "Model",
          licensePlate: "License plate",
          year: "Year",
          vinOptional: "VIN (optional)",
          mileage: "Mileage",
          delete: "Delete",

          // VEHICLE STATUS
          activeVehicle: "Active",
          inService: "In service",
          inactiveVehicle: "Inactive",

          // VEHICLE ISSUES
          adminVehicleIssues: "Admin - Vehicle Issues",
          totalIssues: "Total issues",
          reportedBy: "Reported by",
          status: "Status",
          serviceInKm: "Service in km",
          brakes: "Brakes",
          tires: "Tires",
          oil: "Oil",
          dashboardChecks: "Dashboard checks",
          otherProblems: "Other problems",
          createdAt: "Created at",
          noIssues: "No issues reported",
          loadIssuesError: "Could not load issues.",
          backendConnectionError: "Cannot connect to backend.",

          open: "Open",
          inProgress: "In Progress",
          resolved: "Resolved",

          // USER HOME
          currentVehicle: "Current vehicle",
          noVehicleAssigned: "No vehicle assigned",
          submitIssues: "Submit issues",
          sending: "Sending...",
          issuesSent: "Issues sent successfully",

          // PICKUP / RETURN
          pickupVehicle: "Pick up vehicle",
          returnVehicle: "Return vehicle",
          confirmPickup: "Confirm pickup",
          confirmReturn: "Confirm return",
        },
      },

      ro: {
        translation: {
          // GENERAL
          back: "Înapoi",
          logout: "Logout",
          loading: "Se încarcă...",
          refresh: "Refresh",
          yes: "Da",
          no: "Nu",

          // LOGIN
          login: "Login",
          selectUser: "Selectează utilizator",
          admin: "Admin",
          adminPassword: "Parolă admin",
          pin: "PIN (4 cifre)",
          loggingIn: "Se conectează...",
          loginFailed: "Autentificare eșuată",

          // ADMIN DASHBOARD
          adminDashboard: "Admin Dashboard",
          createUsers: "Creare utilizatori",
          createVehicles: "Creare mașini",
          vehicleIssues: "Probleme mașini",

          // ADMIN USERS
          adminUsers: "Admin - Utilizatori",
          createUser: "Creează utilizator",
          editUser: "Modifică utilizator",
          fullName: "Nume",
          shiftNumber: "Tură",
          active: "Activ",
          inactive: "Inactiv",
          deactivate: "Dezactivează",
          activate: "Activează",
          save: "Salvează",
          cancel: "Renunță",

          // ADMIN VEHICLES
          adminVehiclesTitle: "Admin - Mașini",
          createVehicle: "Creează mașină",
          brand: "Marcă",
          model: "Model",
          licensePlate: "Număr înmatriculare",
          year: "An",
          vinOptional: "VIN (opțional)",
          mileage: "Kilometraj",
          delete: "Șterge",

          // VEHICLE STATUS
          activeVehicle: "Activă",
          inService: "În service",
          inactiveVehicle: "Inactivă",

          // VEHICLE ISSUES
          adminVehicleIssues: "Admin - Probleme mașini",
          totalIssues: "Total probleme",
          reportedBy: "Raportat de",
          status: "Status",
          serviceInKm: "Service în km",
          brakes: "Frâne",
          tires: "Anvelope",
          oil: "Ulei",
          dashboardChecks: "Check-uri bord",
          otherProblems: "Alte probleme",
          createdAt: "Creat la",
          noIssues: "Nu există probleme",
          loadIssuesError: "Nu am putut încărca problemele.",
          backendConnectionError: "Nu mă pot conecta la backend.",

          open: "Deschis",
          inProgress: "În lucru",
          resolved: "Rezolvat",

          // USER HOME
          currentVehicle: "Mașina curentă",
          noVehicleAssigned: "Nu ai o mașină atribuită",
          submitIssues: "Trimite probleme",
          sending: "Se trimite...",
          issuesSent: "Problemele au fost trimise",

          // PICKUP / RETURN
          pickupVehicle: "Preluare mașină",
          returnVehicle: "Predare mașină",
          confirmPickup: "Confirmă preluarea",
          confirmReturn: "Confirmă predarea",
        },
      },
    },
  });

export default i18n;