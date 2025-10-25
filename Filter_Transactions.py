import pandas as pd

df_sms = pd.read_csv('sms_raw_dump.csv')

df_transactions = df_sms[df_sms['body'].str.contains(r'\b(debited|credited|Sent)\b', case=True, na=False)]

df_transactions = df_transactions.reset_index(drop=True)

print(df_transactions.head())

df_transactions.to_csv('sms_transactions.csv', index=False)