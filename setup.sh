#!/bin/bash

# Color definitions
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Node.js TypeScript Boilerplate Setup ===${NC}"
echo "This script configures the boilerplate for your new project."
echo ""

# Get the current directory name as the default project name
DEFAULT_NAME=$(basename "$PWD")

# User input
read -p "Project Name ($DEFAULT_NAME): " PROJECT_NAME
PROJECT_NAME=${PROJECT_NAME:-$DEFAULT_NAME}

read -p "Project Description: " PROJECT_DESCRIPTION

echo ""
echo "Settings:"
echo "--------------------------------"
echo "Name:        $PROJECT_NAME"
echo "Description: $PROJECT_DESCRIPTION"
echo "--------------------------------"
echo ""

read -p "Do you want to proceed with these settings? (y/N): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  echo "Setup canceled."
  exit 1
fi

echo ""
echo -e "${GREEN}Updating files...${NC}"

# Script to safely update JSON files using Node.js
# Pass variables via environment variables to handle special characters correctly
PROJECT_NAME="$PROJECT_NAME" PROJECT_DESCRIPTION="$PROJECT_DESCRIPTION" node -e "
const fs = require('fs');
const path = require('path');

const updateJsonFile = (filePath) => {
    if (!fs.existsSync(filePath)) return;

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Update basic fields
    data.name = process.env.PROJECT_NAME;
    data.description = process.env.PROJECT_DESCRIPTION;
    data.version = '0.1.0'; // Reset version for new project

    // For package-lock.json, packages[''] might also need updating,
    // but it's automatically fixed during npm install, so we only update the root.

    fs.writeFileSync(filePath, JSON.stringify(data, null, '\t') + '\n');
    console.log('Updated: ' + filePath);
};

updateJsonFile('package.json');
updateJsonFile('package-lock.json');
"

# Update README.md
echo "# $PROJECT_NAME" >README.md
if [ -n "$PROJECT_DESCRIPTION" ]; then
  echo "" >>README.md
  echo "$PROJECT_DESCRIPTION" >>README.md
fi
echo "Updated: README.md"

echo ""
echo -e "${GREEN}Installing dependencies (npm install)...${NC}"
npm install

echo ""
echo -e "${GREEN}Resetting git repository...${NC}"
rm -rf .git
git init

echo ""
echo -e "${GREEN}Setup completed!${NC}"
echo ""

# Confirmation to delete the script itself
read -p "Do you want to delete this setup script (setup.sh)? (y/N): " DELETE_SCRIPT
if [[ "$DELETE_SCRIPT" == "y" || "$DELETE_SCRIPT" == "Y" ]]; then
  rm -- "$0"
  echo "setup.sh has been deleted."
fi

