import os
import pickle
import pandas as pd
model_path = os.path.join("Model", "OurMLmodel.pkl")
with open(model_path, "rb") as f:
    model = pickle.load(f)
def predict_output(user_input:dict):
    input_df=pd.DataFrame([user_input])
    output=model.predict(input_df)[0]
    return output
