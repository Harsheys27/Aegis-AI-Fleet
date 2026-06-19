
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import ollama
import re
import time

from recommendation import (
    analyze_vehicle,
    get_merged_df,
    get_all_vehicle_scores,
)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# ── Load data once at startup ────────────────────────────────────
# Ensure relative paths work regardless of current working directory.
from pathlib import Path

_BASE_DIR = Path(__file__).resolve().parent

df = pd.read_csv(_BASE_DIR / "data" / "sample_data_exceptions_type.csv")
lookup_df = pd.read_csv(_BASE_DIR / "data" / "exception_lookup.csv")


print("\n========== DATASET INFO ==========")
print("Shape:", df.shape)
print("Unique Vehicles:", df["vehicle_id"].nunique())
print("==================================\n")

# Pre-warm caches so first request is fast
_t = time.time()
get_merged_df(df)
get_all_vehicle_scores(df)
print(f"[BOOT] Caches pre-warmed in {time.time() - _t:.2f}s\n")


# ── Ollama options – limit token output for speed ────────────────
_OLLAMA_FAST_OPTS = {
    "num_predict": 80,
    "temperature": 0.2,
    "top_k": 20,
    "top_p": 0.8,
}
_OLLAMA_ANALYSIS_OPTS = {
    "num_predict": 220,
    "temperature": 0.2,
    "top_k": 20,
    "top_p": 0.8,
}


# ── Helpers ──────────────────────────────────────────────────────
def _postprocess_ai_output(text: str, vehicle_id: int) -> str:
    forbidden_patterns = [
        r"^.*Recommended Vehicle.*$",
        r"^.*Recommended Usage.*$",
        r"^.*Risk Contribution\s*%.*$",
        r"^.*Implementation Requirements.*$",
    ]
    out = text
    for pat in forbidden_patterns:
        out = re.sub(pat, "", out, flags=re.MULTILINE)
    out = re.sub(
        r"\bTT\s*" + re.escape(str(vehicle_id)) + r"\b",
        f"TT{vehicle_id}",
        out,
    )
    out = re.sub(r"\n{3,}", "\n\n", out).strip()
    return out


# ── Routes ───────────────────────────────────────────────────────
@app.route("/exceptions")
def exceptions():
    # Use the cached merged_df instead of re-merging
    merged_df = get_merged_df(df)
    exception_counts = (
        merged_df
        .groupby("exception_name")["exception_count"]
        .sum()
        .to_dict()
    )
    return jsonify(exception_counts)


@app.route("/dashboard")
def dashboard():
    total_exceptions = int(df["exception_count"].sum())
    active_vehicles = int(df["vehicle_id"].nunique())
    total_trips = int(df["trip_id"].nunique())
    return jsonify({
        "total_exceptions": total_exceptions,
        "active_vehicles": active_vehicles,
        "total_trips": total_trips,
    })


@app.route("/vehicles")
def vehicles():
    t0 = time.time()

    # Use pre-warmed scores instead of calling analyze_vehicle 100× cold
    all_scores = get_all_vehicle_scores(df)
    vehicles_list = []

    for _, row in all_scores.head(100).iterrows():
        vehicle_id = int(row["vehicle_id"])
        result = analyze_vehicle(df, vehicle_id)  # returns cached result
        if result is None:
            continue

        score = result["safety_score"]
        risk = "high" if score < 75 else "medium" if score < 90 else "low"

        vehicles_list.append({
            "vehicle_id": result["vehicle_id"],
            "driver_name": result["driver_name"],
            "safety_score": score,
            "total_exceptions": result["total_exceptions"],
            "risk": risk,
        })

    vehicles_list.sort(key=lambda x: x["safety_score"], reverse=True)
    print(f"[TIMING] /vehicles: {time.time() - t0:.2f}s ({len(vehicles_list)} vehicles)")
    return jsonify(vehicles_list)


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json
    t_start = time.time()

    # ── CHAT MODE ────────────────────────────────────────────────
    if "message" in data:
        user_message = data["message"]
        t0 = time.time()
        response = ollama.chat(
            model="phi3",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are Aegis Fleet AI. "
                        "Answer concisely and professionally about fleet safety topics."
                    ),
                },
                {"role": "user", "content": user_message},
            ],
            options=_OLLAMA_FAST_OPTS,
        )
        print(f"[TIMING] Chat ollama.chat: {time.time() - t0:.2f}s")
        return jsonify({"reply": response["message"]["content"]})

    # ── VEHICLE ANALYSIS MODE ────────────────────────────────────
    vehicle_id = int(data["vehicle_id"])

    t0 = time.time()
    result = analyze_vehicle(df, vehicle_id)   # O(1) after first call (cached)
    print(f"[TIMING] analyze_vehicle: {time.time() - t0:.2f}s")

    if result is None:
        return jsonify({"error": "Vehicle not found"})

    # Compact prompt to reduce token count and Ollama latency
    prompt = (
        f"Vehicle TT{result['vehicle_id']} | Driver: {result['driver_name']} | "
        f"Score: {result['safety_score']} | Grade: {result['grade']} | "
        f"Risk: {result['risk_level']} | Confidence: {result['confidence']} | "
        f"Trips: {result['total_trips']} | Exceptions: {result['total_exceptions']} | "
        f"Types: {result['unique_exception_types']} | "
        f"Top Exception: {result['highest_risk_exception']}\n"
        f"Breakdown: {result['breakdown']}\n\n"
        "Write a Fleet Analysis Report with exactly three sections:\n"
        "1. Summary (2-3 sentences covering grade, score, risk, trips, exceptions)\n"
        "2. Exceptions (2-3 sentences)\n"
        "3. Conclusion (2 sentences on highest risk and overall condition)\n"
        "Use only the data above. No recommendations. Be concise."
    )

    messages = [
        {
            "role": "system",
            "content": (
                "You are Aegis Fleet AI. "
                "Provide structured fleet analysis. Be concise and data-driven."
            ),
        },
        {"role": "user", "content": prompt},
    ]

    print("\n========== PROMPT SENT TO LLM ==========\n", prompt)

    t1 = time.time()
    response = ollama.chat(
        model="phi3",
        messages=messages,
        options=_OLLAMA_ANALYSIS_OPTS,
    )
    print(f"[TIMING] Vehicle ollama.chat: {time.time() - t1:.2f}s")
    print("\n========== LLM RESPONSE ==========\n", response["message"]["content"])

    normalized_ai_analysis = _postprocess_ai_output(
        response["message"]["content"], result["vehicle_id"]
    )

    print(f"[TIMING] Total /analyze: {time.time() - t_start:.2f}s")

    return jsonify({
        "vehicle_id": result["vehicle_id"],
        "driver_name": result["driver_name"],
        "safety_score": result["safety_score"],
        "grade": result["grade"],
        "confidence": result["confidence"],
        "risk_level": result["risk_level"],
        "total_exceptions": result["total_exceptions"],
        "total_trips": result["total_trips"],
        "unique_exception_types": result["unique_exception_types"],
        "highest_risk_exception": result["highest_risk_exception"],
        "breakdown": result["breakdown"],
        "recommended_vehicle": result["recommended_vehicle"],
        "top_exception_percentage": result["top_exception_percentage"],
        "top_exception_count": result["top_exception_count"],
        "ai_analysis": normalized_ai_analysis,
    })


if __name__ == "__main__":
    app.run(debug=True, port=8000)
