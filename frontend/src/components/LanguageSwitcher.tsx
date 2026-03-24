import { useTranslation } from "react-i18next";

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const getButtonStyle = (lang: string): React.CSSProperties => ({
    border: "none",
    background: i18n.language === lang ? "#000" : "#f0f0f0",
    color: i18n.language === lang ? "#fff" : "#111",
    padding: "6px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 600,
    transition: "all 0.2s ease",
  });

  return (
    <div style={{ display: "flex", gap: "6px" }}>
      <button
        style={getButtonStyle("de")}
        onClick={() => i18n.changeLanguage("de")}
      >
        DE
      </button>

      <button
        style={getButtonStyle("en")}
        onClick={() => i18n.changeLanguage("en")}
      >
        EN
      </button>

      <button
        style={getButtonStyle("ro")}
        onClick={() => i18n.changeLanguage("ro")}
      >
        RO
      </button>
    </div>
  );
}

export default LanguageSwitcher;