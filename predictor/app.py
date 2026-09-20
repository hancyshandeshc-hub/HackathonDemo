from fastapi import FastAPI
import pandas as pd
from fastapi.responses import JSONResponse
from schema.user_input_pydantic import UserInput
from Model.predict import predict_output, model
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get('/')
def home():
    return {'message': 'Welcome to the Rainfall Prediction API'}

@app.get('/health')
def health_check():
    return {'status': 'OK'}

@app.post('/predict')
def predict_rainfall(data: UserInput):
    try:
        user_input = {
            'DISTRICT': data.DISTRICT,
            'MONTH': data.MONTH,
            'T2M': data.T2M,
            'RH2M': data.RH2M,
            'PS': data.PS,
            'WS10M': data.WS10M,
            'PRECTOT_LAST_MONTH': data.PRECTOT_LAST_MONTH,
            'RH2M_LAST_MONTH': data.RH2M_LAST_MONTH,
        }

        prediction = predict_output(user_input)

        return JSONResponse(
            status_code=200,
            content={'prediction': prediction}
        )

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={'error': str(e)}
        )
