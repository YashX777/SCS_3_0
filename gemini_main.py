import google.generativeai as genai
import SCS_3_0.gemini_chatbot as gemini_chatbot
import SCS_3_0.financial_analyzer as financial_analyzer

# config
def configure_gemini():
    """Configures the Gemini API with a hardcoded key."""
    api_key = "AIzaSyAk8bAoNXRC-X7aeJehbk5JSZhHk8Hp7MM" 
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        print("Error: API key is not set.")
        exit()
    genai.configure(api_key=api_key)
    print("Gemini API configured successfully.")

# Main
def chat_with_bot():
    """
    Initializes the model, loads data, and starts the interactive chat loop.
    """
    transactions_df = gemini_chatbot.load_transactions("structured_transactions.csv")
    if transactions_df is None:
        return

    model = genai.GenerativeModel('gemini-2.5-flash')
    
    print("\n Financial Assistant is ready! Ask me anything about your transactions.")
    print("   Try 'weekly summary', 'monthly summary', or ask a complex question.")
    print("   Type 'quit' or 'exit' to end the chat.\n")

    # Chat loop
    while True:
        user_prompt = input("You: ").lower()
        if user_prompt in ["quit", "exit"]:
            print("Goodbye!")
            break
        
        print("Thinking...")
        
        summary_data = None
        if "weekly summary" in user_prompt or "this week" in user_prompt:
            summary_data = financial_analyzer.get_weekly_summary(transactions_df)
            prompt_for_llm = f"Please present this weekly financial summary in a friendly, easy-to-read format.Your response must be in plain text. Do not use markdown formatting like asterisks for bolding or hashtags for headings. The amounts are in Indian Rupees: {summary_data}"

        elif "monthly summary" in user_prompt or "this month" in user_prompt:
            summary_data = financial_analyzer.get_monthly_summary(transactions_df)
            prompt_for_llm = f"Please present this monthly financial summary in a friendly, easy-to-read format.Your response must be in plain text. Do not use markdown formatting like asterisks for bolding or hashtags for headings. The amounts are in Indian Rupees: {summary_data}"
        
        else:
            data_context_string = gemini_chatbot.get_data_as_string(transactions_df)
            prompt_for_llm = f"""
            You are a helpful financial assistant. Today is October 26, 2025.
            Based on the following data, please answer the user's question.
            IMPORTANT: All monetary amounts in the data are in Indian Rupees (INR).
            Please display all financial answers with the '₹' symbol.
            Your response must be in plain text. Do not use markdown formatting like asterisks for bolding or hashtags for headings
            
            Data: {data_context_string}
            Question: {user_prompt}
            """

        response = model.generate_content(prompt_for_llm)
        print(f"Assistant: {response.text}\n")


if __name__ == "__main__":
    configure_gemini()
    chat_with_bot()