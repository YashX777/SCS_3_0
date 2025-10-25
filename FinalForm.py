import pandas as pd
import re

df = pd.read_csv("sms_transactions.csv")

df['date'] = pd.to_datetime(df['date'], utc=True, errors='coerce').dt.date

def extract_amount(text):
    if pd.isna(text):
        return None
    m = re.search(r'Rs\.?\s?([\d,]+\.?\d*)', text)
    if m:
        return float(m.group(1).replace(',', ''))
    return None

def extract_type(text):
    if pd.isna(text):
        return 'unknown'
    text_lower = text.lower()
    if 'credited' in text_lower:
        return 'credit'
    elif 'debited' in text_lower or 'sent' in text_lower or 'paid' in text_lower:
        return 'debit'
    else:
        return 'unknown'

def extract_description(text):
    if pd.isna(text):
        return None
    m = re.search(r'\bto\s+([A-Z][A-Z\s]+)', text, re.IGNORECASE)
    if m:
        return m.group(1).title().strip()
    m = re.search(r'\bfrom\s+([A-Z][A-Z\s]+)', text, re.IGNORECASE)
    if m:
        return m.group(1).title().strip()
    return None

CATEGORY_KEYWORDS = {
    'upi': 'Transfer',
    'atm': 'Cash Withdrawal',
    'amazon': 'Shopping',
    'flipkart': 'Shopping',
    'restaurant': 'Food',
    'zomato': 'Food',
    'pay': 'Payment',
    'bill': 'Bills',
    'electricity': 'Bills',
    'water': 'Bills',
    'netflix': 'Entertainment',
    'movie': 'Entertainment',
    'fuel': 'Fuel',
    'petrol': 'Fuel'
}

PAYEE_CATEGORY_OVERRIDE = {
    'kamdhenu milk distributor': 'Food',
    'spotify': 'Subscription',
    'zomato': 'Food',
    'swiggy': 'Food',
    'amazon': 'Shopping',
    'flipkart': 'Shopping',
    'netflix': 'Entertainment',
    'irctc': 'Travel',
    'ola': 'Travel',
    'uber': 'Travel',
    'vijayanand': 'Travel',
    'recharge': 'Bills',
    'INOX': 'Entertainment',
}

def categorize(text, description):
    desc_lower = (description or '').lower()
    for payee, cat in PAYEE_CATEGORY_OVERRIDE.items():
        if payee in desc_lower:
            return cat
    if pd.isna(text):
        return 'Other'
    text_lower = text.lower()
    for k, v in CATEGORY_KEYWORDS.items():
        if k in text_lower:
            return v
    return 'Other'

df['amount'] = df['body'].apply(extract_amount)
df['type'] = df['body'].apply(extract_type)
df['description'] = df['body'].apply(extract_description)
df['category'] = df.apply(lambda row: categorize(row['body'], row['description']), axis=1)

df_final = df[['date', 'description', 'amount', 'type', 'category']]

df_final.to_csv("structured_transactions.csv", index=False, quoting=1)

print("Structured transactions saved to structured_transactions.csv")