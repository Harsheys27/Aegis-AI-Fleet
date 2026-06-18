import pandas as pd

print("Loading CSV...")

df = pd.read_csv(
    "data/sample_data_exceptions_type.csv"
)

print("Success!")
print(df.head())
print(df.columns)