"""
Mock Tools Router - Demonstration endpoints for Claude tool calling.

Provides simple mock tools that Claude can call during analysis.
In production, these would be replaced with real external APIs or MCP servers.
"""

from fastapi import APIRouter
from typing import Dict, Any
import random

router = APIRouter(prefix="/api/tools", tags=["tools"])


@router.get("/competitor-pricing")
async def get_competitor_pricing(product: str) -> Dict[str, Any]:
    """
    Mock competitor pricing tool.

    Returns simulated competitor pricing data for a given product.
    In production, this would call a real pricing API or database.

    Args:
        product: Product name to look up

    Returns:
        Dictionary with competitor pricing information
    """
    # Generate mock pricing data
    # Base price varies by product, with some randomization
    base_price = len(product) * 2.5  # Simple hash-like pricing
    competitor_avg = round(base_price + random.uniform(-2, 2), 2)
    market_low = round(competitor_avg * 0.85, 2)
    market_high = round(competitor_avg * 1.15, 2)

    return {
        "product": product,
        "competitor_average_price": competitor_avg,
        "market_low": market_low,
        "market_high": market_high,
        "currency": "NOK",
        "data_source": "Mock Competitor Database",
        "confidence": "demo"
    }


@router.get("/market-trend")
async def get_market_trend(category: str) -> Dict[str, Any]:
    """
    Mock market trend tool.

    Returns simulated market trend data for a product category.

    Args:
        category: Product category to analyze

    Returns:
        Dictionary with market trend information
    """
    trends = [
        {"trend": "growing", "percentage": 15.5},
        {"trend": "stable", "percentage": 2.1},
        {"trend": "declining", "percentage": -8.3},
        {"trend": "volatile", "percentage": 12.7}
    ]

    # Pick a trend based on category
    selected_trend = trends[len(category) % len(trends)]

    return {
        "category": category,
        "trend": selected_trend["trend"],
        "growth_rate": selected_trend["percentage"],
        "period": "YoY",
        "data_source": "Mock Market Intelligence",
        "confidence": "demo"
    }
