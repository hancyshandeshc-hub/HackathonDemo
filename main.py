"""
LangGraph-powered backend for the chat widget.

Frontend (index.html / widget.css / widget.js) is unchanged — it just
POSTs {message, history} to /api/chat and expects {reply: "..."} back.
This file swaps the backend logic to use LangGraph + Gemini instead of
a raw REST call.

Setup:
    python -m venv venv
    source venv/bin/activate        # Windows: venv\\Scripts\\activate
    pip install -r requirements.txt
    cp .env.example .env            # then paste your real Gemini key into .env
    python app.py

Then open http://localhost:3000
"""

import os
from typing import TypedDict, Annotated

from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import InMemorySaver
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

MODEL_NAME = os.environ.get("GEMINI_MODEL", "gemini-3-flash-preview")
SYSTEM_PROMPT = os.environ.get(
    "SYSTEM_PROMPT",
    "You are a friendly, concise assistant embedded as a chat widget on a "
    "company website. Keep answers short and helpful. If you don't know "
    "something, say so honestly.",
)

# ChatGoogleGenerativeAI reads GOOGLE_API_KEY from the environment
# automatically once load_dotenv() has populated it.
llm = ChatGoogleGenerativeAI(model=MODEL_NAME, temperature=0.7)


# ---------- LangGraph setup ----------
class ChatState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]


def chat_node(state: ChatState):
    messages = state["messages"]
    messages_with_system_prompt = [SystemMessage(content=SYSTEM_PROMPT)] + messages
    response = llm.invoke(messages_with_system_prompt)
    return {"messages": [response]}


checkpointer = InMemorySaver()

graph = StateGraph(ChatState)
graph.add_node("chat_node", chat_node)
graph.add_edge(START, "chat_node")
graph.add_edge("chat_node", END)

chatbot = graph.compile(checkpointer=checkpointer)


# ---------- Flask app ----------
app = Flask(__name__, static_folder=".", static_url_path="")

# Allow requests from your GitHub Pages site (and anywhere else, for a
# hackathon demo) since the frontend and backend now live on different
# domains once deployed.
CORS(app, resources={r"/api/*": {"origins": "*"}})


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/api/chat", methods=["POST"])
def chat():
    if not os.environ.get("GOOGLE_API_KEY"):
        return jsonify({"error": "Server is missing GOOGLE_API_KEY. Check your .env file."}), 500

    data = request.get_json(silent=True) or {}
    message = data.get("message")
    history = data.get("history", [])

    if not message or not isinstance(message, str):
        return jsonify({"error": "Missing 'message' in request body."}), 400

    # The widget sends history as [{role: "user"|"assistant", content}, ...].
    # Convert to LangChain message objects for the graph.
    messages = []
    for turn in history:
        role = turn.get("role")
        content = turn.get("content", "")
        if role == "assistant":
            messages.append(AIMessage(content=content))
        else:
            messages.append(HumanMessage(content=content))

    if not messages:
        messages = [HumanMessage(content=message)]

    try:
        # thread_id groups a conversation for the checkpointer. Since the
        # widget already sends full history each turn, a fixed id per
        # server process is fine for a hackathon demo.
        result = chatbot.invoke(
            {"messages": messages},
            config={"configurable": {"thread_id": "widget-session"}},
        )
        raw_content = result["messages"][-1].content

        # Some Gemini responses come back as a plain string; others come
        # back as a list of content blocks (e.g. [{"type": "text", "text": "..."}]).
        # Normalize either shape into plain text for the widget.
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
    # 0.0.0.0 is required on hosts like Render/Railway; 127.0.0.1 only
    # accepts connections from the same machine.
    app.run(host="0.0.0.0", port=port, debug=True)
