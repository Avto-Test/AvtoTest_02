import pytest

from services.payments.tspay import TSPayProvider


class _FakeResponse:
    def __init__(self, payload: dict):
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self._payload


class _FakeAsyncClient:
    def __init__(self, *, payload: dict, **_: object) -> None:
        self._payload = payload

    async def __aenter__(self) -> "_FakeAsyncClient":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> bool:
        return False

    async def get(self, url: str, params: dict | None = None) -> _FakeResponse:
        return _FakeResponse(self._payload)


@pytest.mark.asyncio
async def test_tspay_status_parser_uses_top_level_status_and_cheque_id(monkeypatch):
    payload = {
        "id": 6089,
        "cheque_id": "40b4e004-36e1-4f09-80bc-d3ce38d31ef9",
        "amount": 1000,
        "status": "success",
        "payment_type": "click",
    }

    monkeypatch.setattr(
        "services.payments.tspay.httpx.AsyncClient",
        lambda *args, **kwargs: _FakeAsyncClient(payload=payload, **kwargs),
    )

    provider = TSPayProvider()
    provider.base_url = "https://tspay.test/api/v1"
    provider.access_token = "token"

    result = await provider.get_transaction_status(
        "40b4e004-36e1-4f09-80bc-d3ce38d31ef9"
    )

    assert result.cheque_id == "40b4e004-36e1-4f09-80bc-d3ce38d31ef9"
    assert result.transaction_id == "6089"
    assert result.pay_status == "success"
    assert result.amount == 100000
