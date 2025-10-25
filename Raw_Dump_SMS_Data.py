import subprocess
import pandas as pd
import re
from datetime import datetime, timezone

def parse_millis(ms):
    """Convert milliseconds to ISO datetime (UTC)."""
    try:
        ms_clean = re.sub(r'\D', '', str(ms))
        if not ms_clean:
            return None
        return datetime.fromtimestamp(int(ms_clean)/1000, tz=timezone.utc)
    except:
        return None

def fetch_sms_preserve_full():
    """Fetch all SMS via ADB, preserving full multi-line bodies."""
    # Run adb content query
    cmd = [
        'adb', 'shell', 'content', 'query',
        '--uri', 'content://sms',
        '--projection', '_id,address,date,body,type,thread_id'
    ]
    out = subprocess.check_output(cmd, text=True)

    sms_blocks = []
    current_block = []

    # Split output into blocks, one block per SMS
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
        # Remove 'Row: n' prefix
        content = re.sub(r'^Row: \d+\s+', '', block)
        sms_dict = {}

        # Extract simple fields
        for key in ['_id', 'address', 'date', 'type', 'thread_id']:
            m = re.search(rf'{key}=(.*?)(?:\s\w+=|$)', content, flags=re.DOTALL)
            sms_dict[key] = m.group(1).strip() if m else None

        # Extract body (everything after 'body=' up to 'type=' or 'thread_id=' if present)
        m = re.search(r'body=(.*?)(?:\s(?:type|thread_id)=|$)', content, flags=re.DOTALL)
        sms_dict['body'] = m.group(1).strip() if m else None

        # Parse date to datetime
        sms_dict['date'] = parse_millis(sms_dict['date'])

        sms_list.append(sms_dict)

    # Convert to DataFrame
    df_sms = pd.DataFrame(sms_list)
    return df_sms

if __name__ == "__main__":
    df_sms = fetch_sms_preserve_full()
    
    # Example: show first 5 SMS with full body
    for i, row in df_sms.head(10).iterrows():
        print(f"ID: {row['_id']}, Address: {row['address']}")
        print(f"Date: {row['date']}")
        print("Body:")
        print(row['body'])
        print("-"*60)

df_sms.to_csv("sms_raw_dump.csv", index=False, quoting=1)