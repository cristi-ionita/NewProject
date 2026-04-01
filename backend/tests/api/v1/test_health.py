import pytest

from app.api.v1.endpoints.health import health_check


@pytest.mark.asyncio
async def test_health_check():
    response = await health_check()

    assert response.status == "ok"