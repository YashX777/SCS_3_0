import os
import re
import subprocess
import sqlite3
import pandas as pd
from datetime import datetime, timedelta, timezone

def parse_millis(ms):
    """Convert milliseconds to ISO datetime (UTC) for Android."""
    try:
        ms_clean = re.sub(r'\D', '', str(ms))
        if not ms_clean:
            return None
        return datetime.fromtimestamp(int(ms_clean)/1000, tz=timezone.utc)
    except:
        return None

def save_to_csv(df, filename="sms_raw_dump.csv"):
    df.to_csv(filename, index=False, quoting=1)
    print(f"\n✅ SMS data exported to '{filename}' ({len(df)} messages)\n")
    return df

#ANDROID FETCH

def fetch_android_sms():
    """Fetch all SMS from Android using ADB."""
    print("📱 Detecting Android device via ADB...")

    try:
        devices = subprocess.check_output(['adb', 'devices'], text=True)
        if len(devices.strip().splitlines()) <= 1:
            print("⚠️ No Android devices detected via ADB.")
            return pd.DataFrame()

        print("✅ Android device detected — fetching SMS...")
        cmd = [
            'adb', 'shell', 'content', 'query',
            '--uri', 'content://sms',
            '--projection', '_id,address,date,body,type,thread_id'
        ]
        out = subprocess.check_output(cmd, text=True)

        sms_blocks = []
        current_block = []

        for line in out.splitlines():
            line = line.rstrip()
            if line.startswith("Row:"):
                if current_block:
                    sms_blocks.append(" ".join(current_block))
                    current_block = []
            current_block.append(line)
        if current_block:
            sms_blocks.append(" ".join(current_block))

        sms_list = []
        for block in sms_blocks:
            content = re.sub(r'^Row: \d+\s+', '', block)
            sms_dict = {}

            for key in ['_id', 'address', 'date', 'type', 'thread_id']:
                m = re.search(rf'{key}=(.*?)(?:\s\w+=|$)', content, flags=re.DOTALL)
                sms_dict[key] = m.group(1).strip() if m else None

            m = re.search(r'body=(.*?)(?:\s(?:type|thread_id)=|$)', content, flags=re.DOTALL)
            sms_dict['body'] = m.group(1).strip() if m else None
            sms_dict['date'] = parse_millis(sms_dict['date'])
            sms_list.append(sms_dict)

        df_sms = pd.DataFrame(sms_list)
        save_to_csv(df_sms, "sms_raw_dump_android.csv")
        return df_sms

    except subprocess.CalledProcessError:
        print("⚠️ Error: Could not fetch SMS via ADB. Is your Android device connected and USB debugging enabled?")
        return pd.DataFrame()

# IPHONE FETCH

def fetch_iphone_sms_auto():
    """Automatically detect iPhone backup and extract SMS from any DB containing 'message' table."""
    print("📱 Detecting iPhone backup...")

    base_path = os.path.expanduser("~/Library/Application\Support/MobileSync/Backup/00008110-00022D5E3A00A01E")
    if not os.path.exists(base_path):
        print("⚠️ Backup folder not found. Create a local backup via Finder/iTunes first.")
        return pd.DataFrame()

    sms_db_path = None

    # Recursively check all files
    for root, dirs, files in os.walk(base_path):
        for file in files:
            file_path = os.path.join(root, file)
            try:
                conn = sqlite3.connect(file_path)
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
                tables = [row[0] for row in cursor.fetchall()]
                conn.close()
                if "message" in tables:
                    sms_db_path = file_path
                    break
            except sqlite3.DatabaseError:
                continue
        if sms_db_path:
            break

    if not sms_db_path:
        print("⚠️ Could not locate SMS database file in backup.")
        return pd.DataFrame()

    print(f"✅ Found SMS database: {sms_db_path}")

    # Extract SMS
    try:
        conn = sqlite3.connect(sms_db_path)
        df_sms = pd.read_sql_query("SELECT ROWID as _id, address, date, text as body FROM message", conn)
        conn.close()

        df_sms['date'] = df_sms['date'].apply(
            lambda x: datetime(2001,1,1) + timedelta(seconds=x) if x else None
        )

        save_to_csv(df_sms, "sms_raw_dump_iphone.csv")
        return df_sms

    except Exception as e:
        print("❌ Error reading iPhone SMS DB:", e)
        return pd.DataFrame()


def detect_device_and_fetch():
    """Auto-detect connected device or fallback to iPhone backup."""
    # Try Android first
    try:
        devices = subprocess.check_output(['adb', 'devices'], text=True)
        if len(devices.strip().splitlines()) > 1:
            return fetch_android_sms()
    except Exception:
        pass

    # Fallback to iPhone backup
    return fetch_iphone_sms_auto()

if __name__ == "__main__":
    df_sms = detect_device_and_fetch()

    if not df_sms.empty:
        print(df_sms.head(10)[['_id', 'address', 'date', 'body']])
    else:
        print("⚠️ No SMS data fetched.")
