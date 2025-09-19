#!/bin/bash

# Remove old backup
echo "Removing old backup..."
rm ~/db_backup/app.db

# Copy current db from container to backup
echo "Backing up current app.db from container..."
sudo podman cp app:/data/app.db ../../db_backup/app.db

# Stop and remove caddy container
echo "Stopping and removing caddy container..."
sudo podman stop caddy
sudo podman rm caddy

# Stop and remove app container
echo "Stopping and removing app container..."
sudo podman stop app
sudo podman rm app

# Rebuild and start containers
echo "Rebuilding and starting containers..."
sudo podman-compose up -d --build

echo "Deployment complete."

