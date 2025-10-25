import pandas as pd
import numpy as np
import re
import matplotlib.pyplot as plt
import json

df = pd.read_csv("structured_transactions.csv")
df['date'] = pd.to_datetime(df['date'])
df['month'] = df['date'].dt.to_period('M')

# Monthly summary for all past months
income = df[df['type']=='credit'].groupby('month')['amount'].sum()
expense = df[df['type']=='debit'].groupby('month')['amount'].sum()
ratio = (expense / income) * 100

summary = pd.DataFrame({
    'Income': income,
    'Expense': expense,
    'Spending Ratio (%)': ratio
}).fillna(0)
summary.reset_index(inplace=True)
summary.columns = ['Month', 'Income', 'Expense', 'Spending Ratio (%)']
print(summary)

# Current month weekly alert system
current_month = '2025-10'  # change dynamically for testing
df_current = df[df['month'] == current_month].copy()

if df_current.empty:
    print(f"No data for {current_month}")
else:
    # past months' average spending ratio
    past_months = df[df['month'] < current_month].copy()
    if not past_months.empty:
        income_past = past_months[past_months['type']=='credit'].groupby('month')['amount'].sum()
        expense_past = past_months[past_months['type']=='debit'].groupby('month')['amount'].sum()
        avg_spending_ratio = (expense_past / income_past).mean()
        print("Average spending ratio is: ", avg_spending_ratio)
    else:
        avg_spending_ratio = 0.8
        print(avg_spending_ratio)

    # First week income
    first_week_end = df_current['date'].min() + pd.Timedelta(days=6)
    first_week_income = df_current[(df_current['date'] <= first_week_end) & (df_current['type']=='credit')]['amount'].sum()

    # Estimated monthly budget based on trends
    monthly_budget_est = first_week_income * avg_spending_ratio

    # Weekly debit aggregation
    df_current['Weekly Expense'] = df_current.apply(lambda row: row['amount'] if row['type']=='debit' else 0, axis=1)
    df_current['week_start'] = df_current['date'] - pd.to_timedelta(df_current['date'].dt.weekday, unit='d')
    df_current['week_end'] = df_current['week_start'] + pd.Timedelta(days=6)

    weekly_current = df_current.groupby(['week_start','week_end']).agg({'Weekly Expense':'sum'}).reset_index()
    weekly_current['Cumulative Expense'] = weekly_current['Weekly Expense'].cumsum()
    weekly_current['Remaining Budget'] = monthly_budget_est - weekly_current['Cumulative Expense']
    weekly_current['Estimated Budget'] = monthly_budget_est
    weekly_current['First Week Income'] = first_week_income

    # Weekly alerts
    weekly_alerts = []
    for _, row in weekly_current.iterrows():
        alert_msg = (
            f"Week {row['week_start']} - {row['week_end']} (Month: {current_month}): "
            f"Weekly expenditure ₹{row['Weekly Expense']:.2f}, "
            f"Estimated monthly budget ₹{row['Estimated Budget']:.2f} "
            f"(first week income ₹{row['First Week Income']:.2f}), "
            f"Remaining budget ₹{row['Remaining Budget']:.2f}"
        )
        if row['Remaining Budget'] < 0:
            alert_msg += " ⚠️ You have exceeded your estimated monthly budget! Please adjust spending."
        weekly_alerts.append(alert_msg)

    for alert in weekly_alerts:
        print(alert)

    # Monthly expenditure pie chart
    df_current_debits = df_current[df_current['type']=='debit'].copy()
    if not df_current_debits.empty:
        monthly_category_expense = df_current_debits.groupby('category')['amount'].sum()
        monthly_category_expense = monthly_category_expense.sort_values(ascending=False)
        total_expense = monthly_category_expense.sum()
        
        # Explode largest slice
        # explode = [0.1] + [0]*(len(monthly_category_expense)-1)

        colors = plt.cm.tab20.colors[:len(monthly_category_expense)]
        
        # Computing percentages
        percentages = 100 * monthly_category_expense / total_expense
        labels = [f"{cat} ({p:.1f}%)" for cat, p in zip(monthly_category_expense.index, percentages)]
        
        plt.figure(figsize=(8,8))
        plt.pie(
            monthly_category_expense, 
            labels=labels, 
            startangle=140, 
            colors=colors,
            wedgeprops={'edgecolor':'white', 'linewidth':1}
        )
        plt.title(f"Expenditure Distribution by Category ({current_month})", fontsize=16)
        plt.legend(monthly_category_expense.index, title="Categories", bbox_to_anchor=(1, 0, 0.5, 1))
        plt.tight_layout()
        plt.show()
    else:
        print(f"No debit transactions found for {current_month} to plot pie chart.")

    # weekly cumulative expenses vs budget
    plt.figure(figsize=(10,5))
    plt.plot(weekly_current['week_start'].astype(str), weekly_current['Cumulative Expense'], marker='o', label='Cumulative Expense')
    plt.axhline(weekly_current['Estimated Budget'].iloc[0], color='red', linestyle='--', label='Estimated Budget')
    plt.xticks(rotation=45)
    plt.title(f"Weekly Cumulative Expenses vs Estimated Budget ({current_month})")
    plt.ylabel("Amount (₹)")
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.show()

    #Prepare JSON output
    summary['Month'] = summary['Month'].astype(str)
    weekly_current['week_start'] = weekly_current['week_start'].astype(str)
    weekly_current['week_end'] = weekly_current['week_end'].astype(str)

    summary_dict = summary.to_dict(orient='records')
    weekly_dict = weekly_current.to_dict(orient='records')

    output = {
        "monthly_summary": summary_dict,
        "weekly_summary": weekly_dict,
        "weekly_alerts": weekly_alerts
    }

    with open("financial_summary.json", "w") as f:
        json.dump(output, f, indent=4)

    print("Financial summary saved to JSON successfully!")

#Plot monthly income vs expense
plt.figure(figsize=(8,5))
plt.plot(summary['Month'].astype(str), summary['Income'], marker='o', label='Income')
plt.plot(summary['Month'].astype(str), summary['Expense'], marker='o', label='Expense')
plt.xticks(rotation=45)
plt.title("Monthly Income vs Expenses")
plt.ylabel("Amount (₹)")
plt.legend()
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()