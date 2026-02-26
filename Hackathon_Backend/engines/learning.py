"""
engines/learning.py - Quiz Logic & Risk Profiling
"""

from typing import List
from models.schemas import QuizSubmission, RiskProfile
from datetime import datetime


# ─── Static Quiz Bank ─────────────────────────────────────────────────────────

QUIZ_BANK = [
    {
        "id": 1,
        "question": "How would you react if your portfolio dropped 20% in a month?",
        "options": [
            "Sell everything immediately",
            "Sell some to reduce risk",
            "Hold and wait for recovery",
            "Buy more at lower prices",
        ],
        "category": "risk",
        "weights": [0, 1, 2, 3],
    },
    {
        "id": 2,
        "question": "What is your primary investment goal?",
        "options": [
            "Preserve capital",
            "Generate steady income",
            "Moderate growth",
            "Maximum long-term growth",
        ],
        "category": "goals",
        "weights": [0, 1, 2, 3],
    },
    {
        "id": 3,
        "question": "How long is your investment horizon?",
        "options": [
            "Less than 1 year",
            "1 – 3 years",
            "3 – 7 years",
            "More than 7 years",
        ],
        "category": "horizon",
        "weights": [0, 1, 2, 3],
    },
    {
        "id": 4,
        "question": "What percentage of your monthly income can you invest?",
        "options": ["Less than 5%", "5–10%", "10–25%", "More than 25%"],
        "category": "capacity",
        "weights": [0, 1, 2, 3],
    },
    {
        "id": 5,
        "question": "How familiar are you with financial instruments?",
        "options": [
            "Not familiar at all",
            "Basic (FD, mutual funds)",
            "Intermediate (stocks, ETFs)",
            "Advanced (options, crypto, forex)",
        ],
        "category": "knowledge",
        "weights": [0, 1, 2, 3],
    },
]

MAX_SCORE = sum(max(q["weights"]) for q in QUIZ_BANK)


def get_all_questions() -> List[dict]:
    """Return the full quiz question bank."""
    return [
        {
            "id": q["id"],
            "question": q["question"],
            "options": q["options"],
            "category": q["category"],
        }
        for q in QUIZ_BANK
    ]


def calculate_risk_profile(submission: QuizSubmission) -> RiskProfile:
    """Score the quiz answers and assign a risk profile."""
    score_map = {q["id"]: q["weights"] for q in QUIZ_BANK}
    total_score = 0

    for answer in submission.answers:
        weights = score_map.get(answer.question_id, [])
        if 0 <= answer.selected_option < len(weights):
            total_score += weights[answer.selected_option]

    # Normalize to 0–100
    normalized = (total_score / MAX_SCORE) * 100 if MAX_SCORE else 0

    if normalized < 33:
        profile = "conservative"
    elif normalized < 66:
        profile = "moderate"
    else:
        profile = "aggressive"

    return RiskProfile(
        user_id=submission.user_id,
        score=round(normalized, 2),
        profile=profile,
        generated_at=datetime.utcnow(),
    )
