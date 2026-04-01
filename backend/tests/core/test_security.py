import hashlib

from app.core import security


def test_hash_pin_strips_and_hashes():
    pin = " 1234 "
    expected = hashlib.sha256("1234".encode()).hexdigest()

    result = security.hash_pin(pin)

    assert result == expected


def test_hash_pin_different_values():
    pin1 = "1234"
    pin2 = "4321"

    hash1 = security.hash_pin(pin1)
    hash2 = security.hash_pin(pin2)

    assert hash1 != hash2


def test_generate_admin_token_uses_secret(monkeypatch):
    monkeypatch.setattr(
        security.settings,
        "ADMIN_TOKEN_SECRET",
        "SECRET123",
    )

    password = "admin"
    expected_raw = f"{password}:SECRET123"
    expected_hash = hashlib.sha256(expected_raw.encode()).hexdigest()

    result = security.generate_admin_token(password)

    assert result == expected_hash


def test_generate_admin_token_changes_with_secret(monkeypatch):
    monkeypatch.setattr(security.settings, "ADMIN_TOKEN_SECRET", "A")
    token1 = security.generate_admin_token("admin")

    monkeypatch.setattr(security.settings, "ADMIN_TOKEN_SECRET", "B")
    token2 = security.generate_admin_token("admin")

    assert token1 != token2


def test_verify_admin_token_valid(monkeypatch):
    monkeypatch.setattr(security.settings, "ADMIN_PASSWORD", "admin123")
    monkeypatch.setattr(security.settings, "ADMIN_TOKEN_SECRET", "SECRET")

    valid_token = security.generate_admin_token("admin123")

    assert security.verify_admin_token(valid_token) is True


def test_verify_admin_token_invalid(monkeypatch):
    monkeypatch.setattr(security.settings, "ADMIN_PASSWORD", "admin123")
    monkeypatch.setattr(security.settings, "ADMIN_TOKEN_SECRET", "SECRET")

    invalid_token = "wrong_token"

    assert security.verify_admin_token(invalid_token) is False


def test_verify_admin_token_wrong_password(monkeypatch):
    monkeypatch.setattr(security.settings, "ADMIN_PASSWORD", "correct")
    monkeypatch.setattr(security.settings, "ADMIN_TOKEN_SECRET", "SECRET")

    token_from_wrong_password = security.generate_admin_token("wrong")

    assert security.verify_admin_token(token_from_wrong_password) is False