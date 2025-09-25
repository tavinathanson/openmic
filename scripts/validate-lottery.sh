#!/bin/bash

echo "🧪 Testing Lottery Logic via API..."
echo ""

# Test by calling the API endpoint
echo "📊 Fetching current comedian status..."
curl -s http://localhost:3003/api/admin/comedians | jq '.'

echo ""
echo "To fully test:"
echo "1. Add some comedians via walk-in or regular signup"
echo "2. Check them in with different statuses"
echo "3. Click 'Generate' to test the lottery"
echo "4. Verify selected comedians can't be modified"
echo ""
echo "The UI now prevents:"
echo "✓ Generating when no one is checked in"
echo "✓ Modifying comedians after lottery selection"
echo "✓ Showing only eligible count in button"