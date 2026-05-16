import pandas as pd
import json
import os
from datetime import datetime

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, pd.Timestamp)):
            return obj.isoformat()
        return super(DateTimeEncoder, self).default(obj)

file_path = 'ANTICANTIERE CONTABILITA.xlsx'

if not os.path.exists(file_path):
    print(f"File {file_path} not found.")
    exit(1)

try:
    xl = pd.ExcelFile(file_path)
    summary = {
        "sheets": xl.sheet_names,
        "content": {}
    }

    for sheet in xl.sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet)
        # Handle NaN values
        df = df.where(pd.notnull(df), None)
        
        summary["content"][sheet] = df.head(10).to_dict(orient='records')
        summary["content"][sheet + "_columns"] = df.columns.tolist()

    with open('excel_summary.json', 'w') as f:
        json.dump(summary, f, indent=4, cls=DateTimeEncoder)
    print("Summary saved to excel_summary.json")

except Exception as e:
    import traceback
    print(f"Error: {str(e)}")
    traceback.print_exc()
