from app.core.i18n import get_language_from_headers, normalize_language, translate


def test_normalize_language_returns_supported_language():
    assert normalize_language("en") == "en"
    assert normalize_language("de-DE") == "de"
    assert normalize_language("ro-RO,ro;q=0.9,en;q=0.8") == "ro"


def test_normalize_language_falls_back_to_default():
    assert normalize_language(None) == "ro"
    assert normalize_language("") == "ro"
    assert normalize_language("fr-FR,es;q=0.8") == "ro"


def test_get_language_from_headers_reads_accept_language():
    headers = {"accept-language": "de-DE,de;q=0.9,en;q=0.8"}
    assert get_language_from_headers(headers) == "de"


def test_translate_returns_requested_language_message():
    assert translate("users.full_name.blank", "ro") == "Numele complet nu poate fi gol."
    assert translate("users.full_name.blank", "en") == "Full name cannot be blank."
    assert translate("users.full_name.blank", "de") == "Der vollständige Name darf nicht leer sein."


def test_translate_falls_back_to_default_language():
    assert translate("users.full_name.blank", "fr") == "Numele complet nu poate fi gol."


def test_translate_returns_fallback_for_unknown_code():
    assert translate("unknown.code", "en", fallback="Fallback message") == "Fallback message"