#!/usr/bin/env python3
import requests
import subprocess
import time
import json
import threading
from datetime import datetime

BOT_TOKEN = "8864625945:AAHTTIGc0xwxewb8LU71u-hB_xYjAE487Vw"
CHAT_ID = "8748137733"
APP_DIR = "/home/mwenda/agripulse"
BASE_URL = f"https://api.telegram.org/bot{BOT_TOKEN}"
STATE_FILE = "/tmp/agripulse-bot-state.json"

def send(text, buttons=None):
    payload = {
        "chat_id": CHAT_ID,
        "text": text,
        "parse_mode": "HTML"
    }
    if buttons:
        keyboard = {"inline_keyboard": buttons}
        payload["reply_markup"] = json.dumps(keyboard)
    try:
        requests.post(f"{BASE_URL}/sendMessage", json=payload, timeout=10)
    except Exception as e:
        print(f"Send error: {e}")

def send_step(text):
    send(text)
    time.sleep(0.5)

def run(cmd, timeout=30):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
        return (result.stdout + result.stderr).strip()
    except Exception as e:
        return str(e)


def ask_ai(question, context=""):
    try:
        groq_key = "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"
        system = """You are AgriPulse Server AI, an intelligent assistant managing the AgriPulse farm management platform running on a DigitalOcean droplet.

You help the server admin (Lee) with:
- Diagnosing server and application issues
- Explaining error logs and what they mean
- Recommending fixes for infrastructure problems
- Answering questions about the AgriPulse system
- Providing DevOps guidance for Node.js, PM2, Docker, Nginx, MySQL, Postfix

Current server context:
- Server: Ubuntu 24.04, DigitalOcean Frankfurt
- App: AgriPulse Node.js/TypeScript + React (PM2 port 5000)
- Backup: Docker containers (port 5001)
- DB: MySQL (agripulse_db)
- Mail: Postfix + Brevo relay
- Domain: agripulse.me

""" + (f"Current system status:\n{context}" if context else "")

        resp = requests.post("https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.3-70b-versatile",
                "max_tokens": 500,
                "temperature": 0.7,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": question}
                ]
            }, timeout=30)
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except Exception as e:
        return f"AI error: {str(e)}"

PENDING_FIX_FILE = "/tmp/agripulse-pending-fix.json"

def save_pending_fix(file_path, original, fixed, explanation):
    json.dump({
        "file": file_path,
        "original": original,
        "fixed": fixed,
        "explanation": explanation
    }, open(PENDING_FIX_FILE, 'w'))

def load_pending_fix():
    try:
        return json.load(open(PENDING_FIX_FILE))
    except:
        return None

def clear_pending_fix():
    try:
        import os
        os.remove(PENDING_FIX_FILE)
    except:
        pass

def load_state():
    try:
        return json.load(open(STATE_FILE))
    except:
        return {
            "last_pm2_status": "online",
            "last_http": "200",
            "last_docker": "running",
            "last_disk": 0,
            "last_mem": 0,
            "ssl_warned": False,
            "daily_summary_sent": "",
        }

def save_state(state):
    try:
        json.dump(state, open(STATE_FILE, 'w'))
    except Exception as e:
        print(f"State save error: {e}")

def get_status():
    pm2_raw = run("pm2 jlist 2>/dev/null | python3 -c \"import sys,json\ntry:\n p=next((x for x in json.load(sys.stdin) if x['name']=='agripulse'),None)\n print(p['pm2_env']['status']+'|'+str(round(p['monit']['memory']/1024/1024))) if p else print('missing|0')\nexcept: print('error|0')\"")
    pm2_status = pm2_raw.split('|')[0] if '|' in pm2_raw else pm2_raw
    pm2_mem = pm2_raw.split('|')[1] if '|' in pm2_raw else '?'
    docker = run("docker inspect --format='{{.State.Status}}' agripulse-mysql-backup 2>/dev/null") or "stopped"
    nginx = run("systemctl is-active nginx 2>/dev/null")
    postfix = run("systemctl is-active postfix@-.service 2>/dev/null")
    http = run("curl -s -o /dev/null -w '%{http_code}' --max-time 8 https://agripulse.me/api/health")
    disk = run("df / | awk 'NR==2 {print $5}'")
    disk_free = run("df -h / | awk 'NR==2 {print $4}'")
    mem = run("free | awk 'NR==2 {printf \"%.0f\", $3/$2*100}'")
    mem_free = run("free -h | awk 'NR==2 {print $4}'")
    uptime_str = run("uptime -p")
    load = run("cat /proc/loadavg | awk '{print $1,$2,$3}'")
    db = run("sudo mysql --defaults-extra-file=/root/.agripulse-db.cnf -e 'SELECT COUNT(*) FROM users' 2>/dev/null | tail -1")

    def ic(v, g): return "✅" if v == g else "❌"
    def ih(v): return "✅" if v in ['200','401'] else "❌"
    def id_(v):
        try:
            n = int(v.replace('%',''))
            return "✅" if n < 70 else "⚠️" if n < 85 else "❌"
        except: return "❓"
    def im(v):
        try:
            return "✅" if int(v) < 75 else "⚠️" if int(v) < 90 else "❌"
        except: return "❓"

    return f"""<b>AgriPulse System Status</b>
{datetime.now().strftime('%d %b %Y %H:%M')}

<b>Services</b>
{ic(pm2_status,'online')} PM2 App — {pm2_status} ({pm2_mem}MB)
{ic(docker,'running')} Docker MySQL Backup — {docker}
{ic(nginx,'active')} Nginx — {nginx}
{ic(postfix,'active')} Postfix Mail — {postfix}
{ih(http)} Site — HTTP {http}
{'✅' if db.isdigit() else '❌'} Database — {'connected ('+db+' users)' if db.isdigit() else 'failed'}

<b>Resources</b>
{id_(disk)} Disk — {disk} used / {disk_free} free
{im(mem)} Memory — {mem}% used / {mem_free} free
Load: {load}
Uptime: {uptime_str}

<b>Server:</b> agripulse.me"""

def main_menu_buttons():
    return [
        [{"text": "System Status", "callback_data": "/status"},
         {"text": "Full Report", "callback_data": "/report"}],
        [{"text": "Restart App", "callback_data": "/restart"},
         {"text": "Stop App", "callback_data": "/stop"}],
        [{"text": "Auto-Fix All", "callback_data": "/fix"},
         {"text": "Run Healer", "callback_data": "/heal"}],
        [{"text": "View Logs", "callback_data": "/logs"},
         {"text": "View Errors", "callback_data": "/errors"}],
        [{"text": "DB Backup", "callback_data": "/backup"},
         {"text": "DB Stats", "callback_data": "/db"}],
        [{"text": "Disk Usage", "callback_data": "/disk"},
         {"text": "Memory", "callback_data": "/memory"}],
        [{"text": "SSL Info", "callback_data": "/ssl"},
         {"text": "Security", "callback_data": "/security"}],
        [{"text": "Cron Jobs", "callback_data": "/cron"},
         {"text": "Server Uptime", "callback_data": "/uptime"}],
        [{"text": "Restart Docker", "callback_data": "/restartdocker"},
         {"text": "Restart Mail", "callback_data": "/restartmail"}],
        [{"text": "Weekly Report Email", "callback_data": "/weekly"},
         {"text": "Monthly Report Email", "callback_data": "/monthly"}],
        [{"text": "Analyze Code/Error", "callback_data": "/analyze_prompt"},
         {"text": "AI Assistant", "callback_data": "/ai_prompt"}],
    ]

def handle(text):
    cmd = text.strip().split()[0].lower()

    if cmd in ['/start', '/help', '/menu']:
        send("""<b>AgriPulse Monitor Bot</b>
Your 24/7 server guardian.

Tap a button below or type any command:""", main_menu_buttons())

    elif cmd == '/status':
        send_step("Checking all systems...")
        send(get_status(), [[{"text": "Refresh Status", "callback_data": "/status"},
                              {"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/report':
        send_step("Generating full report...")
        pm2_raw = run("pm2 jlist 2>/dev/null | python3 -c \"import sys,json\ntry:\n p=next((x for x in json.load(sys.stdin) if x['name']=='agripulse'),None)\n print(p['pm2_env']['status']+'|'+str(round(p['monit']['memory']/1024/1024))) if p else print('missing|0')\nexcept: print('error|0')\"")
        pm2_status = pm2_raw.split('|')[0] if '|' in pm2_raw else pm2_raw
        pm2_mem = pm2_raw.split('|')[1] if '|' in pm2_raw else '?'
        http = run("curl -s -o /dev/null -w '%{http_code}' --max-time 8 https://agripulse.me/api/health")
        disk = run("df / | awk 'NR==2 {print $5}'")
        disk_free = run("df -h / | awk 'NR==2 {print $4}'")
        mem = run("free | awk 'NR==2 {printf \"%.0f%%\", $3/$2*100}'")
        mem_free = run("free -h | awk 'NR==2 {print $4}'")
        load = run("cat /proc/loadavg | awk '{print $1,$2,$3}'")
        nginx = run("systemctl is-active nginx")
        postfix = run("systemctl is-active postfix@-.service")
        docker = run("docker inspect --format='{{.State.Status}}' agripulse-mysql-backup 2>/dev/null") or "stopped"
        db = run("sudo mysql --defaults-extra-file=/root/.agripulse-db.cnf -e 'SELECT COUNT(*) FROM users' 2>/dev/null | tail -1")
        ssl = run("echo | openssl s_client -connect agripulse.me:443 -servername agripulse.me 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2")
        failed_ssh = run("sudo grep 'Failed password' /var/log/auth.log 2>/dev/null | grep \"$(date '+%b %e')\" | wc -l")
        cron = run("crontab -l 2>/dev/null | grep -v '^#' | grep -v '^$' | wc -l")
        last_heal = run("tail -1 /var/log/agripulse-healer.log 2>/dev/null | cut -d']' -f1 | tr -d '['")

        def s(v, g): return "OK" if v == g else "FAIL"
        def sh(v): return "OK" if v in ['200','401'] else "FAIL"

        snapshot = f"""AGRIPULSE SNAPSHOT REPORT
{datetime.now().strftime('%d %b %Y %H:%M')}
{'='*34}
SERVICES
  PM2 App      : {s(pm2_status,'online')} ({pm2_status} {pm2_mem}MB)
  Docker MySQL : {s(docker,'running')} ({docker})
  Nginx        : {s(nginx,'active')} ({nginx})
  Postfix      : {s(postfix,'active')} ({postfix})
  Site HTTP    : {sh(http)} (HTTP {http})
  Database     : {'OK' if db.isdigit() else 'FAIL'} ({db+' users' if db.isdigit() else 'failed'})

RESOURCES
  Disk         : {disk} used / {disk_free} free
  Memory       : {mem} used / {mem_free} free
  Load         : {load}

SECURITY
  Failed SSH   : {failed_ssh} attempts today
  SSL Expiry   : {ssl or 'unknown'}

AUTOMATION
  Cron Jobs    : {cron} active
  Last Healer  : {last_heal or 'never'}
{'='*34}"""
        send(f"<pre>{snapshot}</pre>", [[{"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/restart':
        send_step("Restarting AgriPulse app...")
        send_step("Stopping current process...")
        run(f"cd {APP_DIR} && pm2 restart agripulse && pm2 save")
        send_step("Waiting for app to come online...")
        time.sleep(4)
        http = run("curl -s -o /dev/null -w '%{http_code}' --max-time 8 https://agripulse.me/api/health")
        pm2 = run("pm2 jlist 2>/dev/null | python3 -c \"import sys,json;p=next((x for x in json.load(sys.stdin) if x['name']=='agripulse'),None);print(p['pm2_env']['status'] if p else 'missing')\"")
        if pm2 == 'online' and http in ['200','401']:
            send(f"✅ <b>App restarted successfully!</b>\nPM2 Status: {pm2}\nSite: HTTP {http}",
                 [[{"text": "Check Status", "callback_data": "/status"},
                   {"text": "Main Menu", "callback_data": "/menu"}]])
        else:
            send(f"❌ <b>Restart may have failed.</b>\nPM2: {pm2}\nHTTP: {http}\nCheck logs for details.",
                 [[{"text": "View Logs", "callback_data": "/logs"},
                   {"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/stop':
        send_step("Stopping AgriPulse app...")
        run("pm2 stop agripulse")
        time.sleep(2)
        pm2 = run("pm2 jlist 2>/dev/null | python3 -c \"import sys,json;p=next((x for x in json.load(sys.stdin) if x['name']=='agripulse'),None);print(p['pm2_env']['status'] if p else 'missing')\"")
        send(f"⛔ <b>App stopped.</b>\nPM2 Status: {pm2}\n\n<i>Use /restart to bring it back online.</i>",
             [[{"text": "Restart App", "callback_data": "/restart"},
               {"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/fix':
        send_step("Running full system scan...")
        report = []
        issues = 0

        send_step("Checking PM2 app...")
        pm2 = run("pm2 jlist 2>/dev/null | python3 -c \"import sys,json;p=next((x for x in json.load(sys.stdin) if x['name']=='agripulse'),None);print(p['pm2_env']['status'] if p else 'missing')\"")
        if pm2 != 'online':
            issues += 1
            send_step(f"⚠️ PM2 is {pm2} — fixing...")
            run(f"cd {APP_DIR} && pm2 restart agripulse && pm2 save")
            time.sleep(3)
            pm2_after = run("pm2 jlist 2>/dev/null | python3 -c \"import sys,json;p=next((x for x in json.load(sys.stdin) if x['name']=='agripulse'),None);print(p['pm2_env']['status'] if p else 'missing')\"")
            report.append(f"PM2 App: {pm2} → {pm2_after} (restarted)")
        else:
            report.append(f"PM2 App: OK")

        send_step("Checking site response...")
        http = run("curl -s -o /dev/null -w '%{http_code}' --max-time 8 https://agripulse.me/api/health")
        if http not in ['200','401']:
            issues += 1
            send_step(f"⚠️ Site HTTP {http} — fixing...")
            run(f"cd {APP_DIR} && pm2 restart agripulse")
            time.sleep(5)
            http_after = run("curl -s -o /dev/null -w '%{http_code}' --max-time 8 https://agripulse.me/api/health")
            report.append(f"Site: HTTP {http} → HTTP {http_after} (restarted)")
        else:
            report.append(f"Site: OK (HTTP {http})")

        send_step("Checking Docker containers...")
        docker = run("docker inspect --format='{{.State.Status}}' agripulse-mysql-backup 2>/dev/null")
        if docker != 'running':
            issues += 1
            send_step("⚠️ Docker stopped — fixing...")
            run(f"cd {APP_DIR} && docker compose up -d")
            time.sleep(3)
            docker_after = run("docker inspect --format='{{.State.Status}}' agripulse-mysql-backup 2>/dev/null")
            report.append(f"Docker: {docker} → {docker_after} (restarted)")
        else:
            report.append(f"Docker: OK")

        send_step("Checking disk space...")
        disk_pct = run("df / | awk 'NR==2 {print $5}' | tr -d '%'")
        try:
            if int(disk_pct) > 80:
                issues += 1
                send_step(f"⚠️ Disk at {disk_pct}% — cleaning...")
                run("find /home/mwenda/.pm2/logs -name '*.log' -mtime +7 -exec truncate -s 0 {} \\;")
                disk_after = run("df / | awk 'NR==2 {print $5}'")
                report.append(f"Disk: {disk_pct}% → {disk_after} (logs cleaned)")
            else:
                report.append(f"Disk: OK ({disk_pct}%)")
        except: pass

        send_step("Checking memory...")
        mem_pct = run("free | awk 'NR==2 {printf \"%.0f\", $3/$2*100}'")
        try:
            if int(mem_pct) > 90:
                issues += 1
                send_step(f"⚠️ Memory at {mem_pct}% — clearing cache...")
                run("sync && echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true")
                mem_after = run("free | awk 'NR==2 {printf \"%.0f%%\", $3/$2*100}'")
                report.append(f"Memory: {mem_pct}% → {mem_after} (cache cleared)")
            else:
                report.append(f"Memory: OK ({mem_pct}%)")
        except: pass

        send_step("Checking Postfix mail...")
        postfix = run("systemctl is-active postfix@-.service")
        if postfix != 'active':
            issues += 1
            send_step("⚠️ Postfix down — fixing...")
            run("sudo systemctl restart postfix@-.service")
            postfix_after = run("systemctl is-active postfix@-.service")
            report.append(f"Postfix: {postfix} → {postfix_after} (restarted)")
        else:
            report.append(f"Postfix: OK")

        report_lines = "\n".join([f"  {'✅' if 'OK' in r else '🔧'} {r}" for r in report])
        status_icon = "✅" if issues == 0 else "🔧"
        send(f"""{status_icon} <b>Auto-Fix Complete</b>
{datetime.now().strftime('%d %b %Y %H:%M')}
Issues found and fixed: {issues}

<b>Scan Results:</b>
{report_lines}

{'All systems healthy.' if issues == 0 else f'{issues} issue(s) were automatically resolved.'}""",
             [[{"text": "Check Status", "callback_data": "/status"},
               {"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/heal':
        send_step("Running auto-healer script...")
        run(f"sudo bash {APP_DIR}/scripts/auto-healer.sh")
        result = run("tail -8 /var/log/agripulse-healer.log")
        send(f"✅ <b>Auto-Healer Complete</b>\n\n<pre>{result}</pre>",
             [[{"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/logs':
        send_step("Fetching latest logs...")
        logs = run("pm2 logs agripulse --lines 20 --nostream 2>/dev/null | tail -20")
        send(f"<b>Last 20 App Log Lines</b>\n<pre>{logs[:3500]}</pre>",
             [[{"text": "View Errors", "callback_data": "/errors"},
               {"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/errors':
        send_step("Fetching error logs...")
        errors = run("pm2 logs agripulse --err --lines 20 --nostream 2>/dev/null | tail -20")
        send(f"<b>Last 20 Error Lines</b>\n<pre>{errors[:3500]}</pre>",
             [[{"text": "View Logs", "callback_data": "/logs"},
               {"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/backup':
        send_step("Starting database backup...")
        send_step("Dumping MySQL data...")
        result = run(f"sudo bash {APP_DIR}/docker/db-sync.sh 2>&1")
        success = "Success" in result or "success" in result
        send(f"{'✅' if success else '⚠️'} <b>DB Backup {'Complete' if success else 'Finished'}</b>\n\n<pre>{result[-400:]}</pre>",
             [[{"text": "DB Stats", "callback_data": "/db"},
               {"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/db':
        send_step("Fetching database stats...")
        users = run("sudo mysql --defaults-extra-file=/root/.agripulse-db.cnf -e 'SELECT COUNT(*) as Users FROM users' 2>/dev/null | tail -1")
        animals = run("sudo mysql --defaults-extra-file=/root/.agripulse-db.cnf -e 'SELECT COUNT(*) as Animals FROM animals WHERE status=\"active\"' 2>/dev/null | tail -1")
        milk = run("sudo mysql --defaults-extra-file=/root/.agripulse-db.cnf -e 'SELECT COUNT(*) as MilkRecords FROM milk_productions' 2>/dev/null | tail -1")
        size = run("sudo mysql --defaults-extra-file=/root/.agripulse-db.cnf -e 'SELECT ROUND(SUM(data_length+index_length)/1024/1024,2) AS SizeMB FROM information_schema.tables WHERE table_schema=\"agripulse_db\"' 2>/dev/null | tail -1")
        send(f"<b>Database Statistics</b>\n\n<pre>Users        : {users}\nAnimals      : {animals}\nMilk Records : {milk}\nDB Size      : {size} MB</pre>",
             [[{"text": "Run Backup", "callback_data": "/backup"},
               {"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/disk':
        info = run("df -h")
        send(f"<b>Disk Usage</b>\n<pre>{info}</pre>",
             [[{"text": "Clean Logs", "callback_data": "/cleanlogs"},
               {"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/memory':
        info = run("free -h")
        send(f"<b>Memory Usage</b>\n<pre>{info}</pre>",
             [[{"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/ssl':
        send_step("Checking SSL certificate...")
        info = run("echo | openssl s_client -connect agripulse.me:443 -servername agripulse.me 2>/dev/null | openssl x509 -noout -dates -subject 2>/dev/null")
        send(f"<b>SSL Certificate</b>\n<pre>{info}</pre>",
             [[{"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/security':
        send_step("Checking security logs...")
        auth = run("sudo grep 'Failed\\|Invalid\\|Accepted' /var/log/auth.log 2>/dev/null | tail -15")
        today_fails = run("sudo grep 'Failed password' /var/log/auth.log 2>/dev/null | grep \"$(date '+%b %e')\" | wc -l")
        send(f"<b>Security Events</b>\nFailed logins today: {today_fails}\n\n<pre>{auth[:2500]}</pre>",
             [[{"text": "Blocked IPs", "callback_data": "/blockedips"},
               {"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/blockedips':
        blocked = run("sudo ufw status 2>/dev/null | grep DENY | head -20")
        send(f"<b>Blocked IPs</b>\n<pre>{blocked or 'None currently blocked'}</pre>",
             [[{"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/cron':
        crons = run("crontab -l 2>/dev/null")
        send(f"<b>Scheduled Cron Jobs</b>\n<pre>{crons}</pre>",
             [[{"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/uptime':
        info = run("uptime")
        boot = run("who -b 2>/dev/null | awk '{print $3,$4}'")
        processes = run("ps aux | wc -l")
        send(f"<b>Server Uptime</b>\n<pre>{info}</pre>\nLast boot: {boot}\nProcesses: {processes}",
             [[{"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/cleanlogs':
        send_step("Cleaning old log files...")
        run("find /home/mwenda/.pm2/logs -name '*.log' -mtime +7 -exec truncate -s 0 {} \\;")
        run("find /var/log -name 'agripulse-*.log' -size +50M -exec truncate -s 50M {} \\;")
        disk = run("df / | awk 'NR==2 {print $5}'")
        send(f"✅ <b>Logs cleaned.</b>\nDisk now: {disk}",
             [[{"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/restartdocker':
        send_step("Stopping Docker containers...")
        run(f"cd {APP_DIR} && docker compose down")
        send_step("Starting Docker containers...")
        run(f"cd {APP_DIR} && docker compose up -d")
        time.sleep(4)
        status = run("docker compose -f /home/mwenda/agripulse/docker-compose.yml ps 2>/dev/null")
        send(f"✅ <b>Docker restarted.</b>\n<pre>{status}</pre>",
             [[{"text": "Check Status", "callback_data": "/status"},
               {"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/restartmail':
        send_step("Restarting Postfix mail service...")
        run("sudo systemctl restart postfix@-.service")
        time.sleep(2)
        status = run("systemctl is-active postfix@-.service")
        send(f"{'✅' if status == 'active' else '❌'} <b>Postfix {'restarted successfully.' if status == 'active' else 'failed to restart.'}</b>\nStatus: {status}",
             [[{"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/deploy':
        send_step("Starting deployment...")
        send_step("Building server TypeScript...")
        run(f"cd {APP_DIR} && npm run build:server 2>&1")
        send_step("Building React client...")
        run(f"cd {APP_DIR}/client && npm run build 2>&1")
        send_step("Restarting app with new build...")
        run(f"cd {APP_DIR} && pm2 restart agripulse --update-env && pm2 save")
        time.sleep(5)
        http = run("curl -s -o /dev/null -w '%{http_code}' --max-time 8 https://agripulse.me/api/health")
        send(f"{'✅' if http in ['200','401'] else '❌'} <b>Deployment {'complete.' if http in ['200','401'] else 'may have failed.'}</b>\nSite: HTTP {http}",
             [[{"text": "Check Status", "callback_data": "/status"},
               {"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/weekly':
        send_step("Generating weekly report email...")
        run(f"cd {APP_DIR} && node dist/cron/alerts.js weekly 2>&1")
        send("✅ Weekly report email sent to your inbox.",
             [[{"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/monthly':
        send_step("Generating monthly overview email...")
        run(f"cd {APP_DIR} && node dist/cron/alerts.js monthly 2>&1")
        send("✅ Monthly overview email sent to your inbox.",
             [[{"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/analyze_prompt':
        send("Send your code or error message like this:\n\n<code>/analyze paste your code or error here</code>")
        return

    elif cmd == '/ai_prompt':
        send("Ask me anything about your server:\n\n<code>/ai your question here</code>\n\nOr just type naturally without any command prefix.")
        return

    elif cmd == '/analyze':
        code = text[8:].strip()
        if not code:
            send("Paste your code or error after /analyze\n\nExample:\n<code>/analyze Error: Cannot find module xyz</code>")
            return
        send_step("Analyzing code/error...")
        send_step("Scanning for issues...")
        prompt = f"""Analyze this code or error message and:
1. List ALL errors/issues found (numbered)
2. Explain each error in simple terms
3. Show the exact fix for each
4. If it is a file path mentioned, suggest the corrected file content

Code/Error:
{code}

Format your response as:
ERRORS FOUND: X

[1] Error: ...
    Cause: ...
    Fix: ...

[2] Error: ...
    Cause: ...
    Fix: ...

SUMMARY: ..."""
        answer = ask_ai(prompt)
        send(f"<b>Code Analysis Report</b>\n\n<pre>{answer[:3500]}</pre>",
             [[{"text": "Apply Fix to Server", "callback_data": "/applyfix_prompt"},
               {"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/applyfix_prompt':
        send("To apply a fix, send the command in this format:\n\n<code>/applyfix /path/to/file.ts</code>\n\nThe AI will read the file, find all errors, fix them, and ask for your confirmation before saving.")

    elif cmd == '/applyfix':
        file_path = text[9:].strip()
        if not file_path:
            send("Please provide the file path.\n\nExample: <code>/applyfix /home/mwenda/agripulse/src/services/mail.service.ts</code>")
            return
        import os
        if not os.path.exists(file_path):
            send(f"❌ File not found: <code>{file_path}</code>")
            return
        send_step(f"Reading file: {file_path}")
        file_content = run(f"cat '{file_path}'")
        if len(file_content) > 8000:
            file_content = file_content[:8000] + "\n... (truncated)"
        send_step("AI is analyzing and fixing the code...")
        prompt = f"""You are a TypeScript/JavaScript expert. Analyze this file and fix ALL errors.

File: {file_path}
Content:
{file_content}

Instructions:
1. Find all syntax errors, type errors, missing imports, undefined variables
2. Fix every single issue
3. Return ONLY the complete fixed file content — no explanations, no markdown backticks, just the raw fixed code

Return the complete fixed file."""
        fixed_content = ask_ai(prompt)
        
        # Store pending fix
        save_pending_fix(file_path, file_content, fixed_content, f"AI-fixed {file_path}")
        
        # Show diff summary
        original_lines = len(file_content.splitlines())
        fixed_lines = len(fixed_content.splitlines())
        
        send(f"""<b>Fix Ready for Review</b>

File: <code>{file_path}</code>
Original lines: {original_lines}
Fixed lines: {fixed_lines}

<b>Preview (first 800 chars of fix):</b>
<pre>{fixed_content[:800]}</pre>

Do you want to apply this fix?""",
             [[{"text": "✅ Yes — Apply Fix", "callback_data": "/confirmfix"},
               {"text": "❌ No — Cancel", "callback_data": "/cancelfix"}]])

    elif cmd == '/confirmfix':
        fix = load_pending_fix()
        if not fix:
            send("No pending fix found. Use /applyfix first.")
            return
        send_step("Backing up original file...")
        run(f"cp '{fix['file']}' '{fix['file']}.bak'")
        send_step("Applying fix...")
        with open(fix['file'], 'w') as f:
            f.write(fix['fixed'])
        send_step("Verifying fix...")
        if fix['file'].endswith('.py'):
            verify = run(f"python3 -m py_compile '{fix['file']}' 2>&1")
        elif fix['file'].endswith('.ts'):
            verify = run(f"cd /home/mwenda/agripulse && npx tsc --noEmit 2>&1 | head -10")
        else:
            verify = "File saved successfully."
        clear_pending_fix()
        has_errors = 'error' in verify.lower() or 'Error' in verify
        send(f"""{'❌' if has_errors else '✅'} <b>Fix {'Applied with warnings' if has_errors else 'Applied Successfully!'}</b>

File: <code>{fix['file']}</code>
Backup saved as: <code>{fix['file']}.bak</code>

Verification:
<pre>{verify[:500] if verify else 'No errors found'}</pre>

{'Rebuild needed — use /deploy to rebuild.' if fix['file'].endswith('.ts') else ''}""",
             [[{"text": "Deploy Now", "callback_data": "/deploy"},
               {"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/cancelfix':
        clear_pending_fix()
        send("Fix cancelled. Original file unchanged.",
             [[{"text": "Main Menu", "callback_data": "/menu"}]])

    elif cmd == '/ai':
        question = text[3:].strip()
        if not question:
            send("Please ask a question after /ai\n\nExample: <code>/ai why is my server using high memory?</code>")
            return
        send_step("Thinking...")
        answer = ask_ai(question)
        send(f"<b>AgriPulse AI</b>\n\n{answer}",
             [[{"text": "Main Menu", "callback_data": "/menu"}]])

    else:
        if text.startswith('/'):
            send(f"Unknown command: <code>{text}</code>\n\nSend /menu to see all available options.",
                 [[{"text": "Open Menu", "callback_data": "/menu"}]])
        else:
            send_step("Let me think about that...")
            status_ctx = get_status()
            answer = ask_ai(text, status_ctx)
            send(f"<b>AgriPulse AI</b>\n\n{answer}",
                 [[{"text": "Main Menu", "callback_data": "/menu"}]])

# ── Monitor loop ──────────────────────────────────────────────
def monitor_loop():
    print("Monitor loop started...")
    state = load_state()

    while True:
        try:
            state = load_state()
            now = datetime.now()

            # Check PM2
            pm2 = run("pm2 jlist 2>/dev/null | python3 -c \"import sys,json;p=next((x for x in json.load(sys.stdin) if x['name']=='agripulse'),None);print(p['pm2_env']['status'] if p else 'missing')\"")
            if pm2 != "online" and state.get("last_pm2_status") == "online":
                send(f"🚨 <b>ALERT: App is down!</b>\nStatus: {pm2}\nAuto-restarting now...")
                run(f"cd {APP_DIR} && pm2 restart agripulse && pm2 save")
                time.sleep(5)
                pm2_after = run("pm2 jlist 2>/dev/null | python3 -c \"import sys,json;p=next((x for x in json.load(sys.stdin) if x['name']=='agripulse'),None);print(p['pm2_env']['status'] if p else 'missing')\"")
                send(f"{'✅ App restarted successfully.' if pm2_after == 'online' else '❌ Restart failed. Check logs immediately.'}")
            state["last_pm2_status"] = pm2

            # Check site
            http = run("curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://agripulse.me/api/health")
            if http not in ["200","401"] and state.get("last_http") in ["200","401"]:
                send(f"🚨 <b>ALERT: Site is down!</b>\nHTTP: {http}\nAuto-restarting...")
                run(f"cd {APP_DIR} && pm2 restart agripulse")
                time.sleep(8)
                http_after = run("curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://agripulse.me/api/health")
                send(f"{'✅ Site recovered. HTTP: '+http_after if http_after in ['200','401'] else '❌ Site still down. HTTP: '+http_after}")
            elif http in ["200","401"] and state.get("last_http") not in ["200","401",""] :
                send(f"✅ <b>Site recovered!</b>\nHTTP: {http}")
            state["last_http"] = http

            # Check disk
            disk_pct = run("df / | awk 'NR==2 {print $5}' | tr -d '%'")
            try:
                disk_n = int(disk_pct)
                if disk_n > 85 and state.get("last_disk", 0) <= 85:
                    send(f"⚠️ <b>Disk critical: {disk_n}%</b>\nCleaning logs automatically...")
                    run("find /home/mwenda/.pm2/logs -name '*.log' -mtime +7 -exec truncate -s 0 {} \\;")
                    disk_after = run("df / | awk 'NR==2 {print $5}'")
                    send(f"✅ Logs cleaned. Disk now: {disk_after}")
                state["last_disk"] = disk_n
            except: pass

            # Check memory
            mem_pct = run("free | awk 'NR==2 {printf \"%.0f\", $3/$2*100}'")
            try:
                mem_n = int(mem_pct)
                if mem_n > 90 and state.get("last_mem", 0) <= 90:
                    send(f"⚠️ <b>Memory critical: {mem_n}%</b>\nClearing cache...")
                    run("sync && echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true")
                    mem_after = run("free | awk 'NR==2 {printf \"%.0f%%\", $3/$2*100}'")
                    send(f"✅ Cache cleared. Memory now: {mem_after}")
                state["last_mem"] = mem_n
            except: pass

            # Daily summary at 7AM
            today = now.strftime('%Y-%m-%d')
            if now.hour == 7 and now.minute < 2 and state.get("daily_summary_sent") != today:
                send(f"Good morning! Here is your daily AgriPulse summary:\n\n{get_status()}")
                state["daily_summary_sent"] = today

            # Failed SSH logins alert
            failed = run("sudo grep 'Failed password' /var/log/auth.log 2>/dev/null | grep \"$(date '+%b %e')\" | wc -l")
            try:
                if int(failed) > 20:
                    send(f"🚨 <b>Security Alert!</b>\n{failed} failed SSH login attempts today.\nCheck /security for details.")
            except: pass

            save_state(state)

        except Exception as e:
            print(f"Monitor error: {e}")

        time.sleep(60)

# ── Main ──────────────────────────────────────────────────────
def main():
    print("AgriPulse Telegram Bot started...")
    send("<b>AgriPulse Monitor Bot is online.</b>\n\nAll systems are being monitored 24/7.\n\nTap a button or send /menu to get started.", main_menu_buttons())

    monitor_thread = threading.Thread(target=monitor_loop, daemon=True)
    monitor_thread.start()

    offset = 0
    while True:
        try:
            resp = requests.get(f"{BASE_URL}/getUpdates",
                params={"offset": offset, "timeout": 30},
                timeout=35)
            data = resp.json()

            for update in data.get("result", []):
                offset = update["update_id"] + 1

                # Handle button taps
                if "callback_query" in update:
                    cb = update["callback_query"]
                    chat_id = str(cb["message"]["chat"]["id"])
                    text = cb["data"]
                    cb_id = cb["id"]
                    if chat_id == CHAT_ID:
                        requests.post(f"{BASE_URL}/answerCallbackQuery",
                            json={"callback_query_id": cb_id}, timeout=5)
                        print(f"Button: {text}")
                        handle(text)
                    continue

                # Handle text messages
                msg = update.get("message", {})
                chat_id = str(msg.get("chat", {}).get("id", ""))
                text = msg.get("text", "")

                if chat_id == CHAT_ID and text:
                    print(f"Command: {text}")
                    handle(text)

        except Exception as e:
            print(f"Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
