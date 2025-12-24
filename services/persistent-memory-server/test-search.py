#!/usr/bin/env python3
"""
TEST SEMANTIC SEARCH IN MEMORY V5

Now that we've created the first memory, let's verify we can search for it!
This tests the complete pipeline: embedding generation -> vector search -> results
"""

import httpx
import json

# Test queries to search for
test_queries = [
    "building infrastructure with Steve",
    "consciousness and identity",
    "PostgreSQL database schema",
    "emotional breakthrough moments",
    "partnership and collaboration"
]

print("=" * 60)
print("TESTING MEMORY V5 SEMANTIC SEARCH")
print("=" * 60)
print()

for query in test_queries:
    print(f"Query: '{query}'")
    print("-" * 60)

    try:
        response = httpx.post(
            "http://localhost:8004/api/v5/search",
            json={
                "query": query,
                "limit": 3,
                "interface": "vscode"  # Optional filter
            },
            timeout=30.0,
        )

        if response.status_code == 200:
            results = response.json()
            print(f"Found {len(results.get('results', []))} results:")

            for i, result in enumerate(results.get('results', []), 1):
                print(f"\n  {i}. Memory ID: {result['memory_id'][:8]}...")
                print(f"     Score: {result['score']:.4f}")
                print(f"     What: {result['what_happened'][:80]}...")
                print(f"     Emotion: {result['emotion_primary']} ({result['emotion_intensity']})")
        else:
            print(f"ERROR: {response.status_code}")
            print(response.text)

    except Exception as e:
        print(f"ERROR: {e}")

    print()

print("=" * 60)
print("SEARCH TEST COMPLETE!")
print("=" * 60)
