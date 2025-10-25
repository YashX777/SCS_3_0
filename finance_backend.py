import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import json
from datetime import datetime, timedelta

class FinanceBackend:
    def __init__(self, csv_file="structured_transactions.csv"):
        self.csv_file = csv_file
        self.df = pd.read_csv(self.csv_file)
        self.df['date'] = pd.to_datetime(self.df['date'])
        self.df['month'] = self.df['date'].dt.to_period('M')
        self.preprocess()

    def preprocess(self):
        df = self.df

        # Monthly summary
        income = df[df['type'] == 'credit'].groupby('month')['amount'].sum()
        expense = df[df['type'] == 'debit'].groupby('month')['amount'].sum()
        ratio = (expense / income).fillna(0) * 100

        # Ensure all arrays same length by filling missing months
        all_months = pd.period_range(df['month'].min(), df['month'].max(), freq='M')
        income = income.reindex(all_months, fill_value=0)
        expense = expense.reindex(all_months, fill_value=0)
        ratio = ratio.reindex(all_months, fill_value=0)

        self.summary = pd.DataFrame({
            'Month': income.index.astype(str),
            'Income': income.values,
            'Expense': expense.values,
            'Spending Ratio (%)': ratio.values
        })
        self.summary.reset_index(drop=True, inplace=True)

        # Current month analysis
        current_month = pd.Period(datetime.now(), freq='M')
        self.df_current = df[df['month'] == current_month].copy()

        if not self.df_current.empty:
            # Past months avg spending ratio
            past_months = df[df['month'] < current_month].copy()
            if not past_months.empty:
                income_past = past_months[past_months['type']=='credit'].groupby('month')['amount'].sum()
                expense_past = past_months[past_months['type']=='debit'].groupby('month')['amount'].sum()
                self.avg_spending_ratio = (expense_past / income_past).mean()
            else:
                self.avg_spending_ratio = 0.8

            # First week income
            first_week_end = self.df_current['date'].min() + timedelta(days=6)
            self.first_week_income = self.df_current[(self.df_current['date'] <= first_week_end) & 
                                                     (self.df_current['type']=='credit')]['amount'].sum()

            # Estimated monthly budget
            self.monthly_budget_est = self.first_week_income * self.avg_spending_ratio

            # Weekly expenses
            self.df_current['Weekly Expense'] = self.df_current.apply(lambda row: row['amount'] if row['type']=='debit' else 0, axis=1)
            self.df_current['week_start'] = self.df_current['date'] - pd.to_timedelta(self.df_current['date'].dt.weekday, unit='d')
            self.df_current['week_end'] = self.df_current['week_start'] + timedelta(days=6)

            self.weekly_current = self.df_current.groupby(['week_start','week_end']).agg({'Weekly Expense':'sum'}).reset_index()
            self.weekly_current['Cumulative Expense'] = self.weekly_current['Weekly Expense'].cumsum()
            self.weekly_current['Remaining Budget'] = self.monthly_budget_est - self.weekly_current['Cumulative Expense']
            self.weekly_current['Estimated Budget'] = self.monthly_budget_est
            self.weekly_current['First Week Income'] = self.first_week_income

            # Weekly alerts
            self.weekly_alerts = []
            for _, row in self.weekly_current.iterrows():
                alert_msg = (
                    f"Week {row['week_start']} - {row['week_end']} (Month: {current_month}): "
                    f"Weekly expenditure ₹{row['Weekly Expense']:.2f}, "
                    f"Estimated monthly budget ₹{row['Estimated Budget']:.2f} "
                    f"(first week income ₹{row['First Week Income']:.2f}), "
                    f"Remaining budget ₹{row['Remaining Budget']:.2f}"
                )
                if row['Remaining Budget'] < 0:
                    alert_msg += " ⚠️ You have exceeded your estimated monthly budget! Please adjust spending."
                self.weekly_alerts.append(alert_msg)

        else:
            self.weekly_current = pd.DataFrame()
            self.weekly_alerts = []

    # -------------------------
    # Functions to access data
    # -------------------------
    def get_monthly_summary(self):
        return self.summary

    def get_weekly_summary(self):
        return self.weekly_current

    def get_weekly_alerts(self):
        return self.weekly_alerts

    # -------------------------
    # JSON export
    # -------------------------
    def save_summary_json(self, filename="financial_summary.json"):
        self.summary['Month'] = self.summary['Month'].astype(str)
        if not self.weekly_current.empty:
            self.weekly_current['week_start'] = self.weekly_current['week_start'].astype(str)
            self.weekly_current['week_end'] = self.weekly_current['week_end'].astype(str)

        output = {
            "monthly_summary": self.summary.to_dict(orient='records'),
            "weekly_summary": self.weekly_current.to_dict(orient='records') if not self.weekly_current.empty else [],
            "weekly_alerts": self.weekly_alerts
        }

        with open(filename, "w") as f:
            json.dump(output, f, indent=4)

        print(f"Financial summary saved to {filename} successfully!")

    # -------------------------
    # Plotting functions
    # -------------------------
    def plot_monthly_income_expense(self):
        plt.figure(figsize=(8,5))
        plt.plot(self.summary['Month'].astype(str), self.summary['Income'], marker='o', label='Income')
        plt.plot(self.summary['Month'].astype(str), self.summary['Expense'], marker='o', label='Expense')
        plt.xticks(rotation=45)
        plt.title("Monthly Income vs Expenses")
        plt.ylabel("Amount (₹)")
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.show()

    def plot_current_month_expense(self):
        if self.df_current.empty:
            print("No debit transactions found for current month to plot.")
            return

        df_debits = self.df_current[self.df_current['type']=='debit']
        monthly_category_expense = df_debits.groupby('category')['amount'].sum().sort_values(ascending=False)
        total_expense = monthly_category_expense.sum()
        percentages = 100 * monthly_category_expense / total_expense
        labels = [f"{cat} ({p:.1f}%)" for cat, p in zip(monthly_category_expense.index, percentages)]
        colors = plt.cm.tab20.colors[:len(monthly_category_expense)]

        plt.figure(figsize=(8,8))
        plt.pie(monthly_category_expense, labels=labels, startangle=140,
                colors=colors, wedgeprops={'edgecolor':'white', 'linewidth':1})
        plt.title(f"Expenditure Distribution by Category ({pd.Period(datetime.now(), freq='M')})", fontsize=16)
        plt.legend(monthly_category_expense.index, title="Categories", bbox_to_anchor=(1,0,0.5,1))
        plt.tight_layout()
        plt.show()

    def plot_weekly_cumulative_vs_budget(self):
        if self.weekly_current.empty:
            print("No weekly data to plot.")
            return
        plt.figure(figsize=(10,5))
        plt.plot(self.weekly_current['week_start'].astype(str), self.weekly_current['Cumulative Expense'], marker='o', label='Cumulative Expense')
        plt.axhline(self.weekly_current['Estimated Budget'].iloc[0], color='red', linestyle='--', label='Estimated Budget')
        plt.xticks(rotation=45)
        plt.title(f"Weekly Cumulative Expenses vs Estimated Budget ({pd.Period(datetime.now(), freq='M')})")
        plt.ylabel("Amount (₹)")
        plt.legend()
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.show()