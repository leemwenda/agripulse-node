#!/bin/bash
# AgriPulse Telegram Bot

BOT_TOKEN="8864625945:AAHTTIGc0xwxewb8LU71u-hB_xYjAE487Vw"
CHAT_ID="8748137733"
APP_DIR="/home/mwenda/agripulse"
OFFSET_FILE="/tmp/agripulse-bot-offset"

send() {
  curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    -d chat_id="$CHAT_ID" \
    -d parse_mode="HTML" \
    -d text="$1" > /dev/null
}

get_status() {
  PM2=$(pm2 jlist 2>/dev/null | python3 -c "
import sys,json
try:
  p=next((x for x in json.load(sys.stdin) if x['name']=='agripulse'),None)
  if p:
    s=p['pm2_env']['status']
    m=round(p['monit']['memory']/1024/1024)
    print(f'{s}|{m}')
  else: print('missing|0')
except: print('error|0')
")
  PM2_STATUS=$(echo $PM2 | cut -d'|' -f1)
  PM2_MEM=$(echo $PM2 | cut -d'|' -f2)
  DOCKER=$(docker inspect --format='{{.State.Status}}' agripulse-app 2>/dev/null || echo "stopped")
  NGINX=$(systemctl is-active nginx 2>/dev/null)
  POSTFIX=$(systemctl is-active postfix@-.service 2>/dev/null)
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 https://agripulse.me/api/health)
  DISK=$(df / | awk 'NR==2 {print $5}')
  MEM=$(free | awk 'NR==2 {printf "%.0f%%", $3/$2*100}')
  UPTIME=$(uptime -p)

  pm2_icon=$([ "$PM2_STATUS" = "online" ] && echo "✅" || echo "❌")
  docker_icon=$([ "$DOCKER" = "running" ] && echo "✅" || echo "❌")
  nginx_icon=$([ "$NGINX" = "active" ] && echo "✅" || echo "❌")
  postfix_icon=$([ "$POSTFIX" = "active" ] && echo "✅" || echo "❌")
  site_icon=$([ "$HTTP" = "200" ] || [ "$HTTP" = "401" ] && echo "✅" || echo "❌")

  echo "<b>AgriPulse System Status</b>
$(date '+%d %b %Y %H:%M UTC')

<b>Services</b>
${pm2_icon} PM2 App — ${PM2_STATUS} (${PM2_MEM}MB)
${docker_icon} Docker Backup — ${DOCKER}
${nginx_icon} Nginx — ${NGINX}
${postfix_icon} Postfix Mail — ${POSTFIX}
${site_icon} Site — HTTP ${HTTP}

<b>Resources</b>
Disk: ${DISK} used
Memory: ${MEM} used
Uptime: ${UPTIME}

<b>Server:</b> agripulse.me (64.226.95.48)"
}

handle_command() {
  local cmd="$1"
  case "$cmd" in
    /start|/help)
      send "<b>AgriPulse Monitor Bot</b>

Available commands:

/status — Full system overview
/restart — Restart the app
/logs — Last 20 log lines
/heal — Run auto-healer now
/backup — Trigger DB backup
/disk — Disk usage details
/memory — Memory details
/help — Show this menu"
      ;;
    /status)
      send "$(get_status)"
      ;;
    /restart)
      send "Restarting AgriPulse..."
      cd $APP_DIR && pm2 restart agripulse && pm2 save
      send "AgriPulse restarted successfully."
      ;;
    /logs)
      LOGS=$(pm2 logs agripulse --lines 20 --nostream 2>/dev/null | tail -20)
      send "<b>Last 20 Log Lines</b>
<pre>${LOGS}</pre>"
      ;;
    /heal)
      send "Running auto-healer..."
      sudo bash $APP_DIR/scripts/auto-healer.sh > /tmp/heal-output.txt 2>&1
      RESULT=$(tail -5 /var/log/agripulse-healer.log)
      send "<b>Auto-Healer Complete</b>
<pre>${RESULT}</pre>"
      ;;
    /backup)
      send "Running DB backup..."
      sudo bash $APP_DIR/docker/db-sync.sh > /tmp/backup-output.txt 2>&1
      send "DB backup complete."
      ;;
    /disk)
      DISK_INFO=$(df -h / | awk 'NR==2 {print "Size: "$2"\nUsed: "$3"\nFree: "$4"\nUsage: "$5}')
      send "<b>Disk Usage</b>
<pre>${DISK_INFO}</pre>"
      ;;
    /memory)
      MEM_INFO=$(free -h | awk 'NR==2 {print "Total: "$2"\nUsed: "$3"\nFree: "$4}')
      send "<b>Memory Usage</b>
<pre>${MEM_INFO}</pre>"
      ;;
    *)
      send "Unknown command. Send /help for available commands."
      ;;
  esac
}

# Poll for updates
OFFSET=$(cat $OFFSET_FILE 2>/dev/null || echo "0")
UPDATES=$(curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${OFFSET}&timeout=1")

python3 << PYEOF
import json, subprocess, os

data = json.loads('''${UPDATES}''')
results = data.get('result', [])

for update in results:
    update_id = update['update_id']
    msg = update.get('message', {})
    chat_id = str(msg.get('chat', {}).get('id', ''))
    text = msg.get('text', '').strip()

    if chat_id == '${CHAT_ID}' and text:
        with open('/tmp/bot-command.txt', 'w') as f:
            f.write(text)

    with open('${OFFSET_FILE}', 'w') as f:
        f.write(str(update_id + 1))
PYEOF

if [ -f /tmp/bot-command.txt ]; then
  CMD=$(cat /tmp/bot-command.txt)
  rm /tmp/bot-command.txt
  handle_command "$CMD"
fi
