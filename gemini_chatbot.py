import pandas as pd

def load_transactions(file_path: str) -> pd.DataFrame:
    """
    Loads transaction data from a CSV file into a pandas DataFrame.
    file_path: The path to the CSV file.

    Returns a pandas DataFrame with transaction data, or None if the file is not found.
    """
    try:
        df = pd.read_csv(file_path)
        df['date'] = pd.to_datetime(df['date'])

        #Force the 'amount' column to be numeric. Any values that can't be converted will become NaN (Not a Number).
        df['amount'] = pd.to_numeric(df['amount'], errors='coerce')

        #Replace any NaN values with 0 to prevent errors in calculations.
        df['amount'] = df['amount'].fillna(0)
        
        print("Transaction data loaded and cleaned successfully.")
        return df
    except FileNotFoundError:
        print(f"Error: The file '{file_path}' was not found.")
        return None
    except Exception as e:
        print(f"An error occurred while loading the data: {e}")
        return None

def get_data_as_string(df: pd.DataFrame) -> str:
    """
    Converts a DataFrame into a clean string format for the LLM prompt.
    Returns a string representation of the data.
    """
    if df is None or df.empty:
        return "No data available."
    records = df.to_records(index=False).tolist()
    header = df.columns.tolist()
    return f"Header: {header}\nData: {records}"