from fastapi import FastAPI
import pandas as pd
from fastapi.responses import JSONResponse
from schema.user_input_pydantic import UserInput
from Model.predict import predict_output, model
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows the website to talk to the API
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
	# human readable
@app.get('/')
def home():
    return {'message':'Welcome to Car Price Prediction API'}

	# machine readable
@app.get('/health')
def health_check():
    return {
        	'status': 'OK',
          }

@app.post('/predict')
def predict_price(data: UserInput):
    try:
        user_input = {
            'name': data.name,
            'company': data.company,
            'year': data.year,
            'kms_driven': data.kms_driven,
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
