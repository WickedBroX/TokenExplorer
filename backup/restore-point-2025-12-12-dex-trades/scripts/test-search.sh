#!/bin/bash

# Test Script for Search Functionality
# Run this after deploying backend changes

API_URL="${1:-http://localhost:3001}"
BZR_ADDRESS="0x85Cb098bdcD3Ca929d2cD18Fc7A2669fF0362242"

echo "========================================="
echo "BZR Token Explorer - Search API Tests"
echo "========================================="
echo "API URL: $API_URL"
echo ""

# Test 1: Address Search (Valid)
echo "Test 1: Address Search (Valid BZR Contract)"
echo "-------------------------------------------"
curl -s "${API_URL}/api/search?query=${BZR_ADDRESS}" | jq '.'
echo ""
echo ""

# Test 2: Invalid Address
echo "Test 2: Invalid Address"
echo "------------------------"
curl -s "${API_URL}/api/search?query=0x123" | jq '.'
echo ""
echo ""

# Test 3: Block Number
echo "Test 3: Block Number Search"
echo "----------------------------"
curl -s "${API_URL}/api/search?query=18000000" | jq '.'
echo ""
echo ""

# Test 4: Transaction Hash (will likely not find)
echo "Test 4: Transaction Hash Search"
echo "--------------------------------"
curl -s "${API_URL}/api/search?query=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" | jq '.'
echo ""
echo ""

# Test 5: Empty Query
echo "Test 5: Empty Query (Should Error)"
echo "-----------------------------------"
curl -s "${API_URL}/api/search?query=" | jq '.'
echo ""
echo ""

# Test 6: Unknown Type
echo "Test 6: Unknown Type (Should Error)"
echo "------------------------------------"
curl -s "${API_URL}/api/search?query=hello" | jq '.'
echo ""
echo ""

# Test 7: ENS Domain (Not Implemented)
echo "Test 7: ENS Domain (Should Return 501)"
echo "---------------------------------------"
curl -s "${API_URL}/api/search?query=vitalik.eth" | jq '.'
echo ""
echo ""

echo "========================================="
echo "Tests Complete!"
echo "========================================="
echo ""
echo "Usage: $0 [API_URL]"
echo "Example: $0 http://159.198.46.117:3001"
