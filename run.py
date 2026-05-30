import sys
import socket
import http.server
import socketserver
import os
import json
import shutil
import datetime

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

def copy_file_or_dir(src, dest):
    try:
        if os.path.isdir(src):
            shutil.copytree(src, dest, dirs_exist_ok=True)
        elif os.path.exists(src):
            shutil.copy2(src, dest)
    except Exception as e:
        print(f"Failed to copy {src} to {dest}: {e}")

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
                
                # Fallback to os.environ
                if not env_key:
                    env_key = os.environ.get("YAKSSOOG_API_KEY", "")
                
                if not env_key:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"success": False, "error": "Local .env file does not contain YAKSSOOG_API_KEY."}, ensure_ascii=False).encode('utf-8'))
                    return

                # Perform actual API request server-side
                final_key = env_key if "%" in env_key else quote(env_key)
                url = f"https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService01/getMdcinGrnIdntfcInfoList01?serviceKey={final_key}&item_name={quote(query)}&pageNo=1&numOfRows=1&type=json"
                
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                try:
                    with urllib.request.urlopen(req, timeout=10) as response:
                        res_body = response.read()
                except urllib.error.HTTPError as he:
                    error_details = he.read().decode('utf-8', errors='ignore')
                    self.send_response(he.code)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "success": False, 
                        "error": f"HTTP Error {he.code}", 
                        "details": error_details
                    }, ensure_ascii=False).encode('utf-8'))
                    return
                    
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(res_body)
            except Exception as e:
                import traceback
                traceback.print_exc()
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
