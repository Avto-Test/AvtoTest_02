"""
AUTOTEST Payment Tests
"""

import json
import time
import pytest
from httpx import AsyncClient
from unittest.mock import MagicMock, patch
from core.config import settings

@pytest.mark.asyncio
async def test_create_checkout_session(client: AsyncClient, normal_user_token: str):
    # Mock Stripe
    with patch("stripe.checkout.Session.create") as mock_create:
        mock_create.return_value = MagicMock(url="https://checkout.stripe.com/test-url")
        
        response = await client.post(
            "/payments/checkout",
            headers={"Authorization": f"Bearer {normal_user_token}"}
        )
        assert response.status_code == 200
        assert response.json()["checkout_url"] == "https://checkout.stripe.com/test-url"
        mock_create.assert_called_once()


@pytest.mark.asyncio
async def test_webhook_subscription_activation(client: AsyncClient, normal_user):
    # Mock Stripe Webhook verification
    headers = {"stripe-signature": "t=123,v1=testsig"}
    
    payload = {
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "client_reference_id": str(normal_user.id),
                "customer_details": {"email": normal_user.email}
            }
        }
    }
    
    with patch("core.payments.stripe.verify_webhook_signature") as mock_verify:
        mock_verify.return_value = payload # Return payload as event
        
        response = await client.post(
            "/payments/webhook",
            content=json.dumps(payload),
            headers=headers
        )
        assert response.status_code == 200
        assert response.json() == {"status": "success"}
