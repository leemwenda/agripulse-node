#!/bin/bash
# AgriPulse Auto-Healer
# Runs every 5 minutes via cron

LOG="/var/log/agripulse-healer.log"
ALERT_EMAIL="leemwenda8714@gmail.com"
SITE="https://agripulse.me/api/health"
APP_DIR="/home/mwenda/agripulse"
REPORT=""
ISSUES=0

timestamp() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "[$(timestamp)] $1" >> $LOG; }
alert() { REPORT="$REPORT\n$1"; ISSUES=$((ISSUES+1)); }

log "--- Healer run started ---"

# 1. Check PM2 process
PM2_STATUS=$(pm2 jlist 2>/dev/null | python3 -c "
import sys,json
try:
  procs = json.load(sys.stdin)
  p = next((x for x in procs if x['name']=='agripulse'),None)
  print(p['pm2_env']['status'] if p else 'missing')
except:
  print('error')
")

if [ "$PM2_STATUS" != "online" ]; then
  log "PM2 status: $PM2_STATUS — restarting"
  sudo kill -9 $(sudo lsof -t -i:5000) 2>/dev/null; sleep 1
  cd $APP_DIR && pm2 delete agripulse 2>/dev/null; pm2 start dist/index.js --name agripulse 2>/dev/null
  pm2 save
  alert "PM2 was $PM2_STATUS — restarted automatically"
  log "PM2 restarted"
else
  log "PM2 status: online"
fi

# 2. Check site response
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 $SITE)
if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "401" ]; then
  log "Site returned HTTP $HTTP_CODE — restarting PM2"
  cd $APP_DIR && pm2 restart agripulse
  sleep 5
  HTTP_RETRY=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 $SITE)
  alert "Site was down (HTTP $HTTP_CODE) — restarted. Now returning HTTP $HTTP_RETRY"
  log "Site restart complete. Now: $HTTP_RETRY"
else
  log "Site response: HTTP $HTTP_CODE"
fi

# 3. Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 80 ]; then
  log "Disk at $DISK_USAGE% — cleaning logs"
  # Clean PM2 logs older than 7 days
  find /home/mwenda/.pm2/logs -name "*.log" -mtime +7 -exec truncate -s 0 {} \;
  # Clean old alert logs
  find /var/log -name "agripulse-*.log" -size +50M -exec truncate -s 50M {} \;
  # Clean npm cache
  npm cache clean --force 2>/dev/null
  DISK_AFTER=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
  alert "Disk was at $DISK_USAGE% — cleaned logs. Now at $DISK_AFTER%"
  log "Disk cleaned. Now: $DISK_AFTER%"
else
  log "Disk usage: $DISK_USAGE%"
fi

# 4. Check memory
MEM_FREE=$(free | awk 'NR==2 {printf "%.0f", $4/$2*100}')
if [ "$MEM_FREE" -lt 10 ]; then
  log "Memory critically low ($MEM_FREE% free) — clearing cache"
  sync && echo 3 > /proc/sys/vm/drop_caches 2>/dev/null
  alert "Memory was critically low ($MEM_FREE% free) — cache cleared"
  log "Cache cleared"
else
  log "Memory free: $MEM_FREE%"
fi

# 5. Docker app containers removed — PM2 only mode
log "Docker app: skipped (PM2 only mode)" 

# 6. Check Postfix mail service
POSTFIX_STATUS=$(systemctl is-active postfix@-.service 2>/dev/null)
if [ "$POSTFIX_STATUS" != "active" ]; then
  log "Postfix not active ($POSTFIX_STATUS) — restarting"
  sudo systemctl restart postfix@-.service
  alert "Postfix was $POSTFIX_STATUS — restarted automatically"
  log "Postfix restarted"
else
  log "Postfix status: active"
fi

# 7. Send email report if issues found
if [ "$ISSUES" -gt 0 ]; then
  log "Sending alert email — $ISSUES issue(s) detected"
  BODY="From: notifications@agripulse.me
To: $ALERT_EMAIL
Subject: AgriPulse Auto-Healer Report — $ISSUES Issue(s) Fixed
MIME-Version: 1.0
Content-Type: text/html; charset=utf-8

<html>
<body style='font-family:Arial,sans-serif;background:#f6f8f7;padding:20px;'>
<table width='600' style='background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin:0 auto;'>
  <tr><td style='background:linear-gradient(160deg,#166534,#14532d);padding:30px;text-align:center;'>
    <div style='color:#fff;font-size:24px;font-weight:700;'>AgriPulse Auto-Healer</div>
    <div style='color:rgba(255,255,255,0.6);font-size:13px;margin-top:6px;'>Automated Issue Resolution Report</div>
  </td></tr>
  <tr><td style='padding:30px;'>
    <div style='background:#fef2f2;border-left:4px solid #dc2626;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:20px;'>
      <div style='font-size:11px;font-weight:700;color:#dc2626;letter-spacing:1px;margin-bottom:4px;'>ISSUES DETECTED AND FIXED</div>
      <div style='font-size:14px;color:#991b1b;'>$ISSUES issue(s) were automatically resolved on your server.</div>
    </div>
    <table width='100%' style='border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;'>
      <tr><td style='padding:14px 20px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-weight:600;color:#111827;'>Resolution Details</td></tr>
      <tr><td style='padding:16px 20px;color:#374151;font-size:14px;line-height:24px;'>$(echo -e "$REPORT" | sed 's/^/• /')</td></tr>
    </table>
    <div style='margin-top:20px;font-size:13px;color:#6b7280;'>Time: $(timestamp)<br>Server: agripulse.me (64.226.95.48)</div>
  </td></tr>
  <tr><td style='background:#fafafa;border-top:1px solid #e5e7eb;padding:20px 30px;font-size:12px;color:#9ca3af;'>
    AgriPulse Auto-Healer — Running automatically every 5 minutes
  </td></tr>
</table>
</body></html>"

  echo "$BODY" | sendmail -t
  log "Alert email sent to $ALERT_EMAIL"
fi

log "--- Healer run complete. Issues fixed: $ISSUES ---"
