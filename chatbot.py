from huggingface_hub import InferenceClient
from finance_backend import FinanceBackend
import matplotlib.pyplot as plt
import io
import base64

class FinanceChatbot:
    def __init__(self, hf_token: str):
        self.backend = FinanceBackend()
        self.client = InferenceClient(token=hf_token)
        self.context = []

    def chat(self, user_input: str) -> str:
        self.context.append(f"User: {user_input}")
        prompt = "\n".join(self.context) + "\nAssistant:"

        # Use Hugging Face hosted inference
        response = self.client.text_generation(model="tiiuae/falcon-7b-instruct", inputs=prompt, parameters={"max_new_tokens":200, "temperature":0.7})
        assistant_reply = response[0]['generated_text'].split("Assistant:")[-1].strip()

        self.context.append(f"Assistant: {assistant_reply}")
        return assistant_reply

    # --- Finance-specific methods ---
    def get_monthly_summary(self):
        return self.backend.get_monthly_summary()

    def get_weekly_summary(self):
        return self.backend.get_weekly_summary()

    def get_weekly_alerts(self):
        return self.backend.get_weekly_alerts()

    def plot_monthly_income_expense(self):
        buf = io.BytesIO()
        self.backend.plot_monthly_income_expense()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close()
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")

    def plot_current_month_expense(self):
        buf = io.BytesIO()
        self.backend.plot_current_month_expense()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close()
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")

    def plot_weekly_cumulative_vs_budget(self):
        buf = io.BytesIO()
        self.backend.plot_weekly_cumulative_vs_budget()
        plt.savefig(buf, format='png', bbox_inches='tight')
        plt.close()
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")