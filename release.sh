#! /bin/sh

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

echo "🪜 Incrementing version number"
npm version patch

NEW_VERSION=$(npm pkg get version | tr -d '"')

echo "🌿 Creating release branch for v$NEW_VERSION"
git checkout -b release/$NEW_VERSION
git add .
git commit -m "chore: bump to $NEW_VERSION"
git push origin release/$NEW_VERSION

echo
echo
echo -e "----------------------------------------"
echo -e "|| ${GREEN} Your release is ready for review ${NC} ||"
echo -e "----------------------------------------"
echo -e "1️⃣  Go to ${YELLOW}https://github.com/Chainlit/typescript-client/compare/main...release/$NEW_VERSION${NC}"
echo -e "2️⃣  Create a pull request and merge it to main"
echo -e "3️⃣  Go to ${YELLOW}https://github.com/Chainlit/typescript-client/actions/workflows/publish.yaml${NC}"
echo -e "4️⃣  Click on 'Run workflow'"
echo -e "5️⃣  Rock'n'roll 🎸"