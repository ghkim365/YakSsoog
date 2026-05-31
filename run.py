import sys
import socket
import http.server
import socketserver
import os
import json
import shutil
import datetime
import urllib.request
import urllib.parse
import re
import html

# Configure stdout to use UTF-8 to prevent encoding crashes on Windows (CP949)
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

PORT = 8001
CWD = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.path.join(CWD, "backups")

def get_formatted_timestamp():
    now = datetime.datetime.now()
    year = now.strftime("%Y")
    month = now.strftime("%m")
    day = now.strftime("%d")
    
    hour = now.hour
    ampm = "pm" if hour >= 12 else "am"
    hour_12 = hour % 12
    hour_12 = hour_12 if hour_12 != 0 else 12
    
    hour_str = f"{hour_12:02d}"
    min_str = f"{now.minute:02d}"
    
    return f"{year}-{month}{day}_{hour_str}{min_str}{ampm}"

def copy_file_or_dir(src, dst):
    """Robustly copies a file or directory from src to dst."""
    if not os.path.exists(src):
        return
    if os.path.isdir(src):
        if os.path.exists(dst):
            shutil.rmtree(dst)
        shutil.copytree(src, dst)
    else:
        # Ensure destination directory exists
        dst_dir = os.path.dirname(dst)
        if dst_dir:
            os.makedirs(dst_dir, exist_ok=True)
        shutil.copy2(src, dst)

def scrape_naver_medicine(query):
    try:
        # 1. Search page
        search_url = f"https://terms.naver.com/medicineSearch.naver?mode=nameSearch&query={urllib.parse.quote(query)}"
        req = urllib.request.Request(search_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            search_html = html.unescape(response.read().decode('utf-8'))
            
        # Find first /entry.naver?docId=...
        entry_match = re.search(r'href="(/entry\.naver\?docId=(\d+)[^"]*)"', search_html)
        if not entry_match:
            return None
            
        doc_id = entry_match.group(2)
        detail_url = f"https://terms.naver.com/entry.naver?docId={doc_id}&cid=51000&categoryId=51000"
        
        # 2. Detail page
        req_detail = urllib.request.Request(detail_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req_detail, timeout=5) as response_detail:
            detail_html = html.unescape(response_detail.read().decode('utf-8'))
            
        # Parse Title
        title = "알 수 없음"
        title_match = re.search(r'<title>(.*?)</title>', detail_html, re.I)
        if title_match:
            title = title_match.group(1).split(':')[0].strip()
        else:
            title_match_h2 = re.search(r'<h2 class="title">(.*?)</h2>', detail_html, re.S)
            if title_match_h2:
                title = re.sub(r'<[^>]+>', '', title_match_h2.group(1)).strip()
                
        # Parse Image URL
        image_url = ""
        img_match = re.search(r'imageUrl=([^&"\']+)', detail_html)
        if img_match:
            image_url = urllib.parse.unquote(img_match.group(1))
            
        # Parse Manufacturer (제조사)
        manufacturer = "알 수 없음"
        manuf_match = re.search(r'(?:제조/수입사|제조사|제조/수입업체).*?</th>\s*<td>\s*(.*?)\s*</td>', detail_html, re.S)
        if manuf_match:
            manufacturer = re.sub(r'<[^>]+>', '', manuf_match.group(1)).strip()
            
        # Parse Meta Description (for efficacy and usage)
        efficacy = ""
        usage = ""
        meta_desc = re.search(r'<meta[^>]*?property="og:description"[^>]*?content="([^"]+)"', detail_html)
        if not meta_desc:
            meta_desc = re.search(r'<meta[^>]*?content="([^"]+)"[^>]*?property="og:description"', detail_html)
            
        if meta_desc:
            desc_content = meta_desc.group(1)
            
            # Extract Efficacy (효능효과)
            eff_match = re.search(r'\[효능효과\]\s*(.*?)(?=\s*\[|$)', desc_content)
            if eff_match:
                efficacy = eff_match.group(1).strip()
                
            # Extract Usage (용법용량)
            use_match = re.search(r'\[용법용량\]\s*(.*?)(?=\s*\[|$)', desc_content)
            if use_match:
                usage = use_match.group(1).strip()
                
        return {
            "ITEM_SEQ": doc_id,
            "ITEM_NAME": title,
            "ENTP_NAME": manufacturer,
            "ITEM_IMAGE": image_url,
            "EFFICIENCY_OUTLINE": efficacy,
            "USE_METHOD_OUTLINE": usage,
            "UPDATE_DATE": datetime.datetime.now().strftime("%Y%m%d")
        }
    except Exception as e:
        print(f"Error scraping Naver medicine: {e}")
        return None

def scrape_url_detail(url):
    """Scrape a specific Naver Terms or health.kr medicine detail page URL."""
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as resp:
            page_html = html.unescape(resp.read().decode('utf-8'))

        result = {
            "name": "", "manufacturer": "", "image_url": "",
            "efficacy": "", "usage": "", "source": url
        }

        # ── Naver Terms detail page ──────────────────────────────────────────
        if 'terms.naver.com' in url:
            # Title
            title_m = re.search(r'<title>(.*?)</title>', page_html, re.I)
            if title_m:
                result["name"] = title_m.group(1).split(':')[0].strip()

            # Image
            img_m = re.search(r'imageUrl=([^&"\']+)', page_html)
            if img_m:
                result["image_url"] = urllib.parse.unquote(img_m.group(1))

            # Manufacturer
            manuf_m = re.search(
                r'(?:제조/수입사|제조사|제조/수입업체).*?</th>\s*<td>\s*(.*?)\s*</td>',
                page_html, re.S)
            if manuf_m:
                result["manufacturer"] = re.sub(r'<[^>]+>', '', manuf_m.group(1)).strip()

            # Efficacy & Usage from og:description
            meta_m = re.search(
                r'<meta[^>]*?property="og:description"[^>]*?content="([^"]+)"', page_html)
            if not meta_m:
                meta_m = re.search(
                    r'<meta[^>]*?content="([^"]+)"[^>]*?property="og:description"', page_html)
            if meta_m:
                desc = meta_m.group(1)
                eff_m = re.search(r'\[효능효과\]\s*(.*?)(?=\s*\[|$)', desc)
                use_m = re.search(r'\[용법용량\]\s*(.*?)(?=\s*\[|$)', desc)
                if eff_m: result["efficacy"] = eff_m.group(1).strip()
                if use_m: result["usage"]    = use_m.group(1).strip()

        # ── health.kr page ───────────────────────────────────────────────────
        elif 'health.kr' in url:
            # Drug name from h2 / title
            name_m = re.search(r'<h2[^>]*class="[^"]*drug[^"]*"[^>]*>(.*?)</h2>', page_html, re.S)
            if not name_m:
                name_m = re.search(r'<title>(.*?)</title>', page_html, re.I)
            if name_m:
                result["name"] = re.sub(r'<[^>]+>', '', name_m.group(1)).split('|')[0].strip()

            # Manufacturer
            manuf_m = re.search(
                r'(?:업체명|제조사).*?<td[^>]*>(.*?)</td>', page_html, re.S)
            if manuf_m:
                result["manufacturer"] = re.sub(r'<[^>]+>', '', manuf_m.group(1)).strip()

            # Image
            img_m = re.search(r'<img[^>]+id="imgDrug"[^>]+src="([^"]+)"', page_html)
            if img_m:
                result["image_url"] = img_m.group(1)

            # Efficacy
            eff_m = re.search(
                r'(?:효능효과|이 약의 효능).*?<td[^>]*>(.*?)</td>', page_html, re.S)
            if eff_m:
                result["efficacy"] = re.sub(r'<[^>]+>', '', eff_m.group(1)).strip()

            # Usage
            use_m = re.search(
                r'(?:용법용량|이 약의 용법).*?<td[^>]*>(.*?)</td>', page_html, re.S)
            if use_m:
                result["usage"] = re.sub(r'<[^>]+>', '', use_m.group(1)).strip()

        return result if result["name"] else None

    except Exception as e:
        print(f"[scrape_url_detail] Error: {e}")
        return None

class YakSsoogRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Always add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        # 1. CREATE BACKUP
        if self.path == '/api/backup':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                payload = json.loads(post_data.decode('utf-8'))
                state_data = payload.get("state", {})
                is_safety = payload.get("isSafety", False)
                
                os.makedirs(BACKUP_DIR, exist_ok=True)
                ts = get_formatted_timestamp()
                
                prefix = "YakSsoog_safety_backup_before_restore_" if is_safety else "YakSsoog_design_backup_"
                folder_name = f"{prefix}{ts}"
                target_path = os.path.join(BACKUP_DIR, folder_name)
                os.makedirs(target_path, exist_ok=True)
                
                # Copy source files
                copy_file_or_dir(os.path.join(CWD, "index.html"), os.path.join(target_path, "index.html"))
                copy_file_or_dir(os.path.join(CWD, "app.js"), os.path.join(target_path, "app.js"))
                copy_file_or_dir(os.path.join(CWD, "run.py"), os.path.join(target_path, "run.py"))
                copy_file_or_dir(os.path.join(CWD, "Run_YakSsoog.bat"), os.path.join(target_path, "Run_YakSsoog.bat"))
                copy_file_or_dir(os.path.join(CWD, "Stop_YakSsoog.bat"), os.path.join(target_path, "Stop_YakSsoog.bat"))
                copy_file_or_dir(os.path.join(CWD, "stitch"), os.path.join(target_path, "stitch"))
                copy_file_or_dir(os.path.join(CWD, "assets"), os.path.join(target_path, "assets"))
                
                # Save settings JSON state inside target path
                with open(os.path.join(target_path, "settings.json"), "w", encoding="utf-8") as f:
                    json.dump(state_data, f, ensure_ascii=False, indent=2)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True, 
                    "folderName": folder_name,
                    "message": "디자인 백업이 성공적으로 완료되었습니다."
                }, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode('utf-8'))

        # 2. RESTORE BACKUP
        elif self.path == '/api/restore':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                payload = json.loads(post_data.decode('utf-8'))
                folder_name = payload.get("folderName")
                
                if not folder_name:
                    self.send_response(400)
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "복원 폴더명이 필요합니다."}, ensure_ascii=False).encode('utf-8'))
                    return
                
                source_dir = os.path.join(BACKUP_DIR, folder_name)
                if not os.path.exists(source_dir):
                    self.send_response(404)
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "백업 폴더를 찾을 수 없습니다."}, ensure_ascii=False).encode('utf-8'))
                    return

                # A. Create Safety Backup of current code first!
                safety_ts = get_formatted_timestamp()
                safety_folder = f"YakSsoog_safety_backup_before_restore_{safety_ts}"
                safety_path = os.path.join(BACKUP_DIR, safety_folder)
                os.makedirs(safety_path, exist_ok=True)
                
                # Copy current code into safety folder
                copy_file_or_dir(os.path.join(CWD, "index.html"), os.path.join(safety_path, "index.html"))
                copy_file_or_dir(os.path.join(CWD, "app.js"), os.path.join(safety_path, "app.js"))
                copy_file_or_dir(os.path.join(CWD, "run.py"), os.path.join(safety_path, "run.py"))
                copy_file_or_dir(os.path.join(CWD, "Run_YakSsoog.bat"), os.path.join(safety_path, "Run_YakSsoog.bat"))
                copy_file_or_dir(os.path.join(CWD, "Stop_YakSsoog.bat"), os.path.join(safety_path, "Stop_YakSsoog.bat"))
                copy_file_or_dir(os.path.join(CWD, "stitch"), os.path.join(safety_path, "stitch"))
                copy_file_or_dir(os.path.join(CWD, "assets"), os.path.join(safety_path, "assets"))
                
                # B. Remove current files to prevent leftovers
                for item in ["index.html", "app.js", "stitch", "assets"]:
                    target_item = os.path.join(CWD, item)
                    if os.path.exists(target_item):
                        if os.path.isdir(target_item):
                            shutil.rmtree(target_item)
                        else:
                            os.remove(target_item)
                            
                # C. Copy files from Backup to Current Root
                copy_file_or_dir(os.path.join(source_dir, "index.html"), os.path.join(CWD, "index.html"))
                copy_file_or_dir(os.path.join(source_dir, "app.js"), os.path.join(CWD, "app.js"))
                copy_file_or_dir(os.path.join(source_dir, "stitch"), os.path.join(CWD, "stitch"))
                copy_file_or_dir(os.path.join(source_dir, "assets"), os.path.join(CWD, "assets"))
                
                # D. Read back settings.json state to return to client
                state_data = {}
                settings_file = os.path.join(source_dir, "settings.json")
                if os.path.exists(settings_file):
                    with open(settings_file, "r", encoding="utf-8") as f:
                        state_data = json.load(f)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True, 
                    "state": state_data,
                    "safetyFolder": safety_folder,
                    "message": "백업에서 성공적으로 복원되었습니다."
                }, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode('utf-8'))

        # 3. DELETE BACKUP
        elif self.path == '/api/backup/delete':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                payload = json.loads(post_data.decode('utf-8'))
                folder_name = payload.get("folderName")
                
                target_dir = os.path.join(BACKUP_DIR, folder_name)
                if os.path.exists(target_dir):
                    shutil.rmtree(target_dir)
                    
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "message": "백업이 성공적으로 삭제되었습니다."}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode('utf-8'))
        # 4. GUARDIAN ALERT SEND
        elif self.path == '/api/guardian/send':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                payload = json.loads(post_data.decode('utf-8'))
                phone   = payload.get('phone', '').strip()
                message = payload.get('message', '').strip()

                if not phone or not message:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "phone and message required"}).encode())
                    return

                # Log the message to console (real SMS requires external API like CoolSMS/Twilio)
                print(f"[Guardian] SMS to {phone}: {message}")

                # Try opening default SMS app via mailto-style (desktop fallback)
                # On mobile PWA, the client-side tel: fallback handles it
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "message": f"Guardian alert logged for {phone}"
                }, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())

        # 5. SAVE EXPORTED DATA TO json-bak & UPDATE app.js
        elif self.path == '/api/export-save':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                payload = json.loads(post_data.decode('utf-8'))
                
                # Create json-bak folder
                json_bak_dir = os.path.join(CWD, "json-bak")
                os.makedirs(json_bak_dir, exist_ok=True)
                
                # Format name: YakSsoog_backup_YYYYMMDD_HHMM.json
                now = datetime.datetime.now()
                date_str = now.strftime("%Y%m%d_%H%M")
                file_name = f"YakSsoog_backup_{date_str}.json"
                file_path = os.path.join(json_bak_dir, file_name)
                
                # Save backup file
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(payload, f, ensure_ascii=False, indent=2)
                # Automatically update app.js defaults!
                meds = payload.get("yagssoog_med_list", [])
                alarms = payload.get("yagssoog_alarm_list", [])
                
                app_js_path = os.path.join(CWD, "app.js")
                if os.path.exists(app_js_path):
                    with open(app_js_path, "r", encoding="utf-8") as f:
                        app_js_content = f.read()
                    
                    # Format to JSON string with indent
                    meds_json = json.dumps(meds, ensure_ascii=False, indent=2)
                    alarms_json = json.dumps(alarms, ensure_ascii=False, indent=2)
                    
                    # Replace DEFAULT_MEDICATIONS
                    import re
                    pattern_meds = r'(const\s+DEFAULT_MEDICATIONS\s*=\s*)\[[\s\S]*?\]\s*;'
                    app_js_content = re.sub(pattern_meds, f"\\1{meds_json};", app_js_content, count=1)
                    
                    # Replace DEFAULT_ALARMS
                    pattern_alarms = r'(const\s+DEFAULT_ALARMS\s*=\s*)\[[\s\S]*?\]\s*;'
                    app_js_content = re.sub(pattern_alarms, f"\\1{alarms_json};", app_js_content, count=1)
                    
                    with open(app_js_path, "w", encoding="utf-8") as f:
                        f.write(app_js_content)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True, 
                    "filePath": file_path,
                    "message": "데이터가 json-bak 폴더에 저장되었으며 app.js 기본값도 갱신되었습니다."
                }, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode('utf-8'))

        else:
            super().do_POST()

    def do_GET(self):
        # 4. LIST ALL BACKUPS
        if self.path == '/api/backups':
            try:
                os.makedirs(BACKUP_DIR, exist_ok=True)
                items = os.listdir(BACKUP_DIR)
                backups = []
                for item in items:
                    item_path = os.path.join(BACKUP_DIR, item)
                    if os.path.isdir(item_path):
                        # Filter YakSsoog backups
                        if item.startswith("YakSsoog_design_backup_") or item.startswith("YakSsoog_safety_backup_"):
                            is_safety = "safety" in item
                            backups.append({
                                "name": item,
                                "type": "Safety" if is_safety else "Standard",
                                "time": item.replace("YakSsoog_safety_backup_before_restore_", "").replace("YakSsoog_design_backup_", "")
                            })
                
                # Sort newest first
                backups.sort(key=lambda x: x["name"], reverse=True)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "backups": backups}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode('utf-8'))
        # 5. SECURE PROXY SEARCH FOR LOCAL DEVELOPMENT
        elif self.path.startswith('/api/search'):
            try:
                from urllib.parse import urlparse, parse_qs, quote
                import urllib.request
                
                parsed = urlparse(self.path)
                query_params = parse_qs(parsed.query)
                query = query_params.get('query', [''])[0]
                
                if not query:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "query parameter is required"}, ensure_ascii=False).encode('utf-8'))
                    return
                
                # Read from .env file if it exists
                env_key = ""
                env_file_path = os.path.join(CWD, ".env")
                if os.path.exists(env_file_path):
                    with open(env_file_path, "r", encoding="utf-8") as env_f:
                        for line in env_f:
                            if line.strip().startswith("YAKSSOOG_API_KEY="):
                                env_key = line.strip().split("=", 1)[1].strip('"').strip("'").strip()
                
                # Fallback to os.environ or client passed key
                if not env_key:
                    env_key = os.environ.get("YAKSSOOG_API_KEY", "")
                if not env_key:
                    env_key = query_params.get('apiKey', [''])[0] or query_params.get('serviceKey', [''])[0] or query_params.get('key', [''])[0]
                
                api_success = False
                res_body = None
                
                if env_key:
                    try:
                        final_key = env_key if "%" in env_key else quote(env_key)
                        url = f"https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService01/getMdcinGrnIdntfcInfoList01?serviceKey={final_key}&item_name={quote(query)}&pageNo=1&numOfRows=1&type=json"
                        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                        with urllib.request.urlopen(req, timeout=5) as response:
                            res_body = response.read()
                            
                        # Parse to check if items found
                        data = json.loads(res_body.decode('utf-8'))
                        total_count = data.get("body", {}).get("totalCount", 0)
                        if total_count > 0:
                            api_success = True
                    except Exception as e:
                        print(f"[API Error, trying Naver fallback] {e}")
                
                if api_success and res_body:
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(res_body)
                    return
                
                # Fallback to Naver scraping
                print(f"[Naver Scraper] Querying fallback for '{query}'...")
                naver_data = scrape_naver_medicine(query)
                if naver_data:
                    mfds_mock = {
                        "header": {
                            "resultCode": "00",
                            "resultMsg": "NORMAL SERVICE (Naver Fallback)."
                        },
                        "body": {
                            "pageNo": 1,
                            "totalCount": 1,
                            "numOfRows": 1,
                            "items": [
                                {
                                    "ITEM_SEQ": naver_data["ITEM_SEQ"],
                                    "ITEM_NAME": naver_data["ITEM_NAME"],
                                    "ENTP_NAME": naver_data["ENTP_NAME"],
                                    "ITEM_IMAGE": naver_data["ITEM_IMAGE"],
                                    "EFFICIENCY_OUTLINE": naver_data["EFFICIENCY_OUTLINE"],
                                    "USE_METHOD_OUTLINE": naver_data["USE_METHOD_OUTLINE"],
                                    "UPDATE_DATE": naver_data["UPDATE_DATE"],
                                    "CRA_RSTRCN_OUTLINE": ""
                                }
                            ]
                        }
                    }
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps(mfds_mock, ensure_ascii=False).encode('utf-8'))
                    return
                
                # If everything fails, return empty result
                empty_response = {
                    "header": {
                        "resultCode": "00",
                        "resultMsg": "NO DATA FOUND"
                    },
                    "body": {
                        "pageNo": 1,
                        "totalCount": 0,
                        "numOfRows": 1,
                        "items": []
                    }
                }
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(empty_response, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                import traceback
                traceback.print_exc()
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode('utf-8'))
        # 6. SCRAPE SPECIFIC URL (Naver Terms or health.kr)
        elif self.path.startswith('/api/scrape_url'):
            try:
                from urllib.parse import urlparse, parse_qs
                parsed = urlparse(self.path)
                query_params = parse_qs(parsed.query)
                target_url = query_params.get('url', [''])[0]

                if not target_url:
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "url parameter is required"}, ensure_ascii=False).encode('utf-8'))
                    return

                result = scrape_url_detail(target_url)
                if result:
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": True, "data": result}, ensure_ascii=False).encode('utf-8'))
                else:
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "해당 URL에서 의약품 정보를 찾을 수 없습니다."}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False).encode('utf-8'))
        else:
            super().do_GET()

# Create backups folder upfront
os.makedirs(BACKUP_DIR, exist_ok=True)

local_ip = get_local_ip()

print("==================================================================")
print("[YakSsoog] 약쏘옥 디자인 백업용 서버 기동 완료 (Port 8001)")
print("==================================================================")
print(f" * PC 접속 주소:      http://localhost:{PORT}/index.html")
print(f" * 모바일 접속 주소:   http://{local_ip}:{PORT}/index.html")
print(f" * 백업 폴더 경로:    {BACKUP_DIR}")
print("==================================================================")

# Force using current directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

socketserver.TCPServer.allow_reuse_address = True
try:
    with socketserver.TCPServer(("", PORT), YakSsoogRequestHandler) as httpd:
        httpd.serve_forever()
except KeyboardInterrupt:
    print("\n약쏘옥 서버가 중단되었습니다.")
except Exception as e:
    print(f"\n서버 작동 오류 발생: {e}")
