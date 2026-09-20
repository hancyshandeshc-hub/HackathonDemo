"""
RainfallNepal backend (Flask)

One service that does three things:
  1. Serves the website files from ./static  (index.html, prediction.html, ...)
  2. POST /predict   -> loads model.pkl and returns {"prediction": <mm/day>}
  3. POST /api/chat  -> LangGraph + Gemini chatbot, returns {"reply": "..."}

Local run:
    python -m venv venv
    source venv/bin/activate        # Windows: venv\\Scripts\\activate
    pip install -r requirements.txt
    cp .env.example .env            # paste your real GOOGLE_API_KEY into .env
    python main.py                  # http://localhost:3000

Render:
    Build command : pip install -r requirements.txt
    Start command : gunicorn main:app --timeout 120
    Env vars      : GOOGLE_API_KEY (required), GEMINI_MODEL / SYSTEM_PROMPT (optional)
"""

import os
import uuid
from typing import TypedDict, Annotated

import joblib
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# ======================================================================
# Chatbot (LangGraph + Gemini)
# ======================================================================
MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-3-flash-preview")

DEFAULT_SYSTEM_PROMPT = """You are the RainfallNepal Assistant, a friendly and concise chat widget on the
"Rainfall Prediction for Districts of Nepal" website. Keep answers short and helpful.

Facts about the website (only state these; do not invent other details):
- It covers 62 districts of Nepal and predicts monthly rainfall, up to 1 year ahead.
- The prediction form takes 8 inputs: forecast month, district, air humidity at 2m (%),
  temperature at 2m (deg C), wind speed at 10m (m/s), surface pressure (kPa),
  rainfall last month (mm/day) and humidity last month (%).
- The result is in millimetres per day (mm/day) and is placed into six categories:
  No rainfall (0), Very low (0.1-2.4), Low (2.5-7.5), Moderate (7.6-35.5),
  High (35.6-64.4), Very high (>=64.5).
- A machine-learning model learns from past temperature, humidity, pressure, wind and
  earlier rainfall to estimate future rainfall. The project states 91.15% accuracy.
- It is free to use. Farmers, travelers and planners can use it.
- Rainfall varies a lot over short distances (Terai vs hills vs mountains), so a
  prediction can differ from what someone sees locally. Climate change can also shift
  patterns, so the model needs regular updating.

If asked something you don't know or that is outside the website, say so honestly.
Never claim a prediction is guaranteed; it is an estimate."""

SYSTEM_PROMPT = os.environ.get("SYSTEM_PROMPT", DEFAULT_SYSTEM_PROMPT)

MAX_HISTORY_TURNS = 20  # keep requests small / cheap

# ChatGoogleGenerativeAI reads GOOGLE_API_KEY from the environment.
llm = ChatGoogleGenerativeAI(model=MODEL_NAME, temperature=0.7)


class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


def chat_node(state: ChatState):
    messages = [SystemMessage(content=SYSTEM_PROMPT)] + state["messages"]
    response = llm.invoke(messages)
    return {"messages": [response]}


graph = StateGraph(ChatState)
graph.add_node("chat_node", chat_node)
graph.add_edge(START, "chat_node")
graph.add_edge("chat_node", END)
chatbot = graph.compile(checkpointer=InMemorySaver())

# ======================================================================
# Rainfall prediction model
# ======================================================================
MODEL_PATH = os.environ.get("MODEL_PATH", os.path.join(BASE_DIR, "model.pkl"))
# Optional: if you label-encoded DISTRICT during training, save that encoder
# (e.g. joblib.dump(label_encoder, "district_encoder.pkl")) and put it next to main.py.
DISTRICT_ENCODER_PATH = os.environ.get(
    "DISTRICT_ENCODER_PATH", os.path.join(BASE_DIR, "district_encoder.pkl")
)

# Column order sent by prediction.js
FEATURES = [
    "MONTH", "DISTRICT", "RH2M", "T2M", "WS10M", "PS",
    "PRECTOT_LAST_MONTH", "RH2M_LAST_MONTH",
]
NUMERIC = [f for f in FEATURES if f != "DISTRICT"]

_model = None
_district_encoder = None


def get_model():
    """Load model.pkl once, on first use."""
    global _model, _district_encoder
    if _model is None:
        _model = joblib.load(MODEL_PATH)
        if os.path.exists(DISTRICT_ENCODER_PATH):
            _district_encoder = joblib.load(DISTRICT_ENCODER_PATH)
    return _model


def build_features(payload: dict) -> pd.DataFrame:
    """
    Turn the JSON from the frontend into the DataFrame the model expects.

    >>> EDIT HERE if your training pipeline did any extra preprocessing
    >>> (scaling, one-hot encoding, different column names, ...).
    If model.pkl is a scikit-learn Pipeline that already handles DISTRICT
    (OneHotEncoder etc.), nothing needs to change.
    """
    row = {k: payload[k] for k in FEATURES}
    if _district_encoder is not None:
        row["DISTRICT"] = _district_encoder.transform([row["DISTRICT"]])[0]
    df = pd.DataFrame([row], columns=FEATURES)

    # Match the exact column order the model was trained with, when it recorded it.
    names = getattr(get_model(), "feature_names_in_", None)
    if names is not None:
        df = df[list(names)]
    return df


def validate_payload(data):
    if not isinstance(data, dict):
        return None, "Request body must be JSON."
    missing = [k for k in FEATURES if k not in data or data[k] in (None, "")]
    if missing:
        return None, f"Missing fields: {', '.join(missing)}"
    clean = {"DISTRICT": str(data["DISTRICT"])}
    for k in NUMERIC:
        try:
            clean[k] = float(data[k])
        except (TypeError, ValueError):
            return None, f"'{k}' must be a number."
    if not 1 <= clean["MONTH"] <= 12:
        return None, "MONTH must be between 1 and 12."
    clean["MONTH"] = int(clean["MONTH"])
    for k in ("RH2M", "RH2M_LAST_MONTH"):
        if not 0 <= clean[k] <= 100:
            return None, f"'{k}' must be between 0 and 100."
    return clean, None


# ======================================================================
# Flask app
# ======================================================================
# Only ./static is public, so main.py, .env and model.pkl are never downloadable.
app = Flask(__name__, static_folder=os.path.join(BASE_DIR, "static"), static_url_path="")

# Needed only if the frontend is hosted on a different domain than this backend.
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/predict": {"origins": "*"}})


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/predict", methods=["POST"])
def predict():
    clean, err = validate_payload(request.get_json(silent=True))
    if err:
        return jsonify({"error": err}), 400

    try:
        model = get_model()
    except Exception as e:
        print("Model load error:", repr(e))
        return jsonify({"error": "Prediction model could not be loaded on the server."}), 503

    try:
        result = model.predict(build_features(clean))
        value = float(np.asarray(result).ravel()[0])
    except Exception as e:
        print("Prediction error:", repr(e))
        return jsonify({"error": "The model could not make a prediction from these inputs."}), 500

    # Regression models can return tiny negatives; rainfall can't be below 0.
    value = max(0.0, value)
    return jsonify({"prediction": round(value, 4)})


@app.route("/api/chat", methods=["POST"])
def chat():
    if not os.environ.get("GOOGLE_API_KEY"):
        return jsonify({"error": "Server is missing GOOGLE_API_KEY."}), 500

    data = request.get_json(silent=True) or {}
    message = data.get("message")
    history = data.get("history", [])

    if not message or not isinstance(message, str):
        return jsonify({"error": "Missing 'message' in request body."}), 400

    # The widget sends the full conversation (including the newest user message)
    # as [{role: "user"|"assistant", content}, ...].
    messages = []
    for turn in history[-MAX_HISTORY_TURNS:]:
        content = turn.get("content", "")
        if turn.get("role") == "assistant":
            messages.append(AIMessage(content=content))
        else:
            messages.append(HumanMessage(content=content))

    if not messages:
        messages = [HumanMessage(content=message)]

    try:
        # Fresh thread_id per request so different visitors never share state.
        result = chatbot.invoke(
            {"messages": messages},
            config={"configurable": {"thread_id": str(uuid.uuid4())}},
        )
        raw_content = result["messages"][-1].content

        # Gemini may return a string or a list of content blocks.
        if isinstance(raw_content, str):
            reply = raw_content
        elif isinstance(raw_content, list):
            parts = []
            for block in raw_content:
                if isinstance(block, str):
                    parts.append(block)
                elif isinstance(block, dict):
                    parts.append(block.get("text", ""))
            reply = "".join(parts) or "Sorry, I couldn't generate a response."
        else:
            reply = str(raw_content)
    except Exception as e:
        print("LangGraph/Gemini error:", e)
        return jsonify({"error": "The AI service returned an error."}), 502

    return jsonify({"reply": reply})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    app.run(host="0.0.0.0", port=port, debug=False)
