#!/bin/bash
# Sync host MySQL to Docker MySQL backup
DATE=$(date +%Y%m%d_%H%M%S)
DUMP_FILE="/tmp/agripulse_backup_$DATE.sql"

echo "[DB Sync] Starting at $DATE"

# Dump from host MySQL
mysqldump -u agriuser -p'AgriPulse@2026!' agripulse_db > $DUMP_FILE

if [ $? -ne 0 ]; then
  echo "[DB Sync] Dump failed"
  exit 1
fi

# Import into Docker MySQL
docker exec -i agripulse-mysql-backup mysql -u agriuser -p'AgriPulse@2026!' agripulse_db < $DUMP_FILE

if [ $? -eq 0 ]; then
  echo "[DB Sync] Success — $DUMP_FILE imported"
  rm $DUMP_FILE
else
  echo "[DB Sync] Import failed"
  exit 1
fi
