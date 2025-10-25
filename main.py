from chatbot import FinanceChatbot

HF_TOKEN = "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"  # Hugging Face API token

def main():
    bot = FinanceChatbot(hf_token=HF_TOKEN)
    print("Welcome to Finance AI Chatbot!")
    print("Type 'exit' to quit.")
    print("Available commands: 'monthly summary', 'weekly summary', 'weekly alerts', 'plot monthly', 'plot weekly', 'plot category'")

    while True:
        user_input = input("You: ").strip()
        if user_input.lower() == "exit":
            break
        elif user_input.lower() == "monthly summary":
            print(bot.get_monthly_summary())
        elif user_input.lower() == "weekly summary":
            print(bot.get_weekly_summary())
        elif user_input.lower() == "weekly alerts":
            for alert in bot.get_weekly_alerts():
                print(alert)
        elif user_input.lower() == "plot monthly":
            img_base64 = bot.plot_monthly_income_expense()
            print(f"[Monthly Income vs Expense Plot - Base64 PNG]\n{img_base64[:200]}...")
        elif user_input.lower() == "plot weekly":
            img_base64 = bot.plot_weekly_cumulative_vs_budget()
            print(f"[Weekly Cumulative vs Budget Plot - Base64 PNG]\n{img_base64[:200]}...")
        elif user_input.lower() == "plot category":
            img_base64 = bot.plot_current_month_expense()
            print(f"[Current Month Category Pie Chart - Base64 PNG]\n{img_base64[:200]}...")
        else:
            reply = bot.chat(user_input)
            print(f"Assistant: {reply}")

if __name__ == "__main__":
    main()