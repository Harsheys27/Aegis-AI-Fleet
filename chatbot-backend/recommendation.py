

import pandas as pd
from pathlib import Path

# Make file paths robust to different working directories.
_BASE_DIR = Path(__file__).resolve().parent
lookup_df = pd.read_csv(_BASE_DIR / "data" / "exception_lookup.csv")


RISK_WEIGHTS = {
    "Overspeed": 10,
    "Harsh Braking": 8,
    "Harsh Acceleration": 7,
    "Night Driving": 5
}
_DEFAULT_WEIGHT = 3

# ── Module-level caches ─────────────────────────────────────────
_merged_df_cache = None          # df merged with lookup_df (once)
_all_scores_cache = None         # vectorized score table for every vehicle
_vehicle_analysis_cache = {}     # per-vehicle analysis results


def get_merged_df(df):
    """Return the merged dataframe, computing and caching it on first call."""
    global _merged_df_cache
    if _merged_df_cache is None:
        _merged_df_cache = pd.merge(df, lookup_df, on="exception_type", how="left")
    return _merged_df_cache


def get_all_vehicle_scores(df):
    """
    Return a DataFrame (vehicle_id, safety_score) sorted descending.
    Uses fully vectorised pandas ops – no Python row loops.
    """
    global _all_scores_cache
    if _all_scores_cache is not None:
        return _all_scores_cache

    merged = get_merged_df(df)

    # Map each exception_name to its risk weight (vectorised)
    weight_series = merged["exception_name"].map(RISK_WEIGHTS).fillna(_DEFAULT_WEIGHT)
    penalty_series = weight_series * merged["exception_count"]

    penalty_by_vehicle = (
        merged.assign(penalty=penalty_series)
        .groupby("vehicle_id")["penalty"]
        .sum()
    )

    scores = (100 - penalty_by_vehicle).rename("safety_score").reset_index()
    scores["safety_score"] = scores["safety_score"].astype(int)
    scores = scores.sort_values("safety_score", ascending=False).reset_index(drop=True)

    _all_scores_cache = scores
    return _all_scores_cache


def analyze_vehicle(df, vehicle_id):
    """
    Analyse a single vehicle.  Results are cached after the first call so
    repeated calls (e.g. from /vehicles and /analyze) are free.
    """
    if vehicle_id in _vehicle_analysis_cache:
        return _vehicle_analysis_cache[vehicle_id]

    merged_df = get_merged_df(df)
    vehicle_data = merged_df[merged_df["vehicle_id"] == vehicle_id]

    if vehicle_data.empty:
        return None

    driver_name = str(vehicle_data["driver_name"].iloc[0])
    total_exceptions = int(vehicle_data["exception_count"].sum())
    total_trips = int(vehicle_data["trip_id"].nunique())
    unique_exception_types = int(vehicle_data["exception_name"].nunique())

    # Confidence
    if total_trips < 5:
        confidence = "Low"
    elif total_trips < 20:
        confidence = "Medium"
    else:
        confidence = "High"

    # Exception summary (vectorised)
    exception_summary = (
        vehicle_data
        .groupby("exception_name")["exception_count"]
        .sum()
    )

    if not exception_summary.empty:
        highest_risk_exception = exception_summary.idxmax()
        top_exception_count = int(exception_summary.max())
    else:
        highest_risk_exception = "None"
        top_exception_count = 0

    breakdown = exception_summary.to_dict()

    top_exception_percentage = (
        round((top_exception_count / total_exceptions) * 100, 1)
        if total_exceptions > 0 else 0
    )

    # Safety score – vectorised, no iterrows
    weight_col = vehicle_data["exception_name"].map(RISK_WEIGHTS).fillna(_DEFAULT_WEIGHT)
    penalty_total = (weight_col * vehicle_data["exception_count"]).sum()
    current_vehicle_score = int(100 - penalty_total)

    # Recommended vehicle from the cached global scores table
    all_scores = get_all_vehicle_scores(df)
    other_scores = all_scores[all_scores["vehicle_id"] != vehicle_id]

    if not other_scores.empty:
        best = other_scores.iloc[0]
        recommended_vehicle = int(best["vehicle_id"])
        recommended_vehicle_score = int(best["safety_score"])
    else:
        recommended_vehicle = int(vehicle_id)
        recommended_vehicle_score = current_vehicle_score

    # Risk Level
    if current_vehicle_score >= 80:
        risk_level = "Low"
    elif current_vehicle_score >= 60:
        risk_level = "Moderate"
    else:
        risk_level = "High"

    # Grade
    if current_vehicle_score >= 95:
        grade = "A+"
    elif current_vehicle_score >= 90:
        grade = "A"
    elif current_vehicle_score >= 80:
        grade = "B"
    elif current_vehicle_score >= 70:
        grade = "C"
    elif current_vehicle_score >= 60:
        grade = "D"
    else:
        grade = "F"

    result = {
        "vehicle_id": int(vehicle_id),
        "driver_name": driver_name,
        "safety_score": current_vehicle_score,
        "grade": grade,
        "confidence": confidence,
        "risk_level": risk_level,
        "total_exceptions": total_exceptions,
        "total_trips": total_trips,
        "unique_exception_types": unique_exception_types,
        "highest_risk_exception": highest_risk_exception,
        "breakdown": breakdown,
        "recommended_vehicle": recommended_vehicle,
        "recommended_vehicle_score": recommended_vehicle_score,
        "top_exception_count": top_exception_count,
        "top_exception_percentage": top_exception_percentage,
    }

    _vehicle_analysis_cache[vehicle_id] = result
    return result
