import pandas as pd
from datetime import datetime, timedelta

def get_summary(df: pd.DataFrame, start_date: datetime, end_date: datetime) -> dict:
    """Calculates a financial summary for a given date range and formats it in INR."""
    
    period_df = df[(df['date'] >= start_date) & (df['date'] <= end_date)]
    
    if period_df.empty:
        return {
            "total_income": "₹0.00", 
            "total_expense": "₹0.00", 
            "net_flow": "₹0.00", 
            "transaction_count": 0
        }

    total_income = period_df[period_df['type'] == 'credit']['amount'].sum()
    total_expense = period_df[period_df['type'] == 'debit']['amount'].sum()
    net_flow = total_income + total_expense 

    # Format the final numbers as Indian Rupee strings
    summary = {
        "total_income": f"₹{total_income:,.2f}",
        "total_expense": f"₹{abs(total_expense):,.2f}",
        "net_flow": f"₹{net_flow:,.2f}",
        "transaction_count": len(period_df)
    }
    return summary

def get_weekly_summary(df: pd.DataFrame) -> dict:
    today = datetime.now()
    start_of_week = today - timedelta(days=today.weekday())
    end_of_week = start_of_week + timedelta(days=6)
    print(f"Calculating weekly summary from {start_of_week.date()} to {end_of_week.date()}...")
    return get_summary(df, start_of_week, end_of_week)

def get_monthly_summary(df: pd.DataFrame) -> dict:
    today = datetime.now()
    start_of_month = today.replace(day=1)
    next_month = (start_of_month.replace(day=28) + timedelta(days=4)).replace(day=1)
    end_of_month = next_month - timedelta(days=1)
    print(f"Calculating monthly summary from {start_of_month.date()} to {end_of_month.date()}...")
    return get_summary(df, start_of_month, end_of_month)