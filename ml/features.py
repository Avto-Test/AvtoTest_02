"""
AUTOTEST ML Feature Engineering
Extracts numeric feature vectors for user pass prediction.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict

from models.attempt import Attempt
from models.user_skill import UserSkill
from models.attempt_answer import AttemptAnswer
from models.question import Question

FEATURE_VERSION = 1
FEATURE_COUNT = 20

async def get_user_feature_vector(
    db: AsyncSession, 
    user_id: str, 
    before_at: Optional[datetime] = None
) -> Optional[List[float]]:
    """
    Extract exactly 20 numeric features for a user.
    Returns None if user has < 10 attempts (cold start) or < 10 before 'before_at'.
    """
    try:
        # 1. Fetch all finished attempts
        stmt_attempts = (
            select(Attempt.score, Attempt.finished_at, Attempt.mode, Attempt.avg_response_time, Attempt.response_time_variance)
            .where(Attempt.user_id == user_id, Attempt.finished_at.is_not(None))
        )
        
        if before_at:
            stmt_attempts = stmt_attempts.where(Attempt.finished_at < before_at)
            
        stmt_attempts = stmt_attempts.order_by(Attempt.finished_at.desc())
        
        res_attempts = await db.execute(stmt_attempts)
        attempts = res_attempts.all()
        
        total_attempts_raw = len(attempts)
        if total_attempts_raw < 1:
            return None
            
        scores = [a.score for a in attempts]
        # Normalize scores (assuming out of 20)
        scores_pct = [(s / 20.0) * 100 for s in scores]
        
        # 2. Fetch User Skills
        stmt_skills = select(UserSkill).where(UserSkill.user_id == user_id)
        res_skills = await db.execute(stmt_skills)
        user_skills = res_skills.scalars().all()
        
        if not user_skills:
            # Should not happen if they have 10 attempts, but safety first
            user_skills = []
            
        now = datetime.now(timezone.utc)
        
        # --- FEATURE CALCULATIONS ---
        
        # 1. readiness_score
        avg_recent_5 = sum(scores_pct[:5]) / len(scores_pct[:5]) if scores_pct else 0.0
        readiness_score = avg_recent_5 
        
        print("DEBUG: Calc 2 (bkt)", flush=True)
        # 2. avg_bkt_mastery
        avg_bkt_mastery = 0.0
        if user_skills:
            avg_bkt_mastery = sum(s.bkt_knowledge_prob for s in user_skills) / len(user_skills)
        
        print("DEBUG: Calc 3 (retention)", flush=True)
        # 3. avg_retention
        avg_retention = 0.0
        def calc_ret(s):
            if not s.last_practice_at: return 0.5
            days = (now - s.last_practice_at).total_seconds() / 86400
            return max(0.2, min(1.0, np.exp(-0.015 * days)))
            
        if user_skills:
            avg_retention = sum(calc_ret(s) for s in user_skills) / len(user_skills)
        
        print("DEBUG: Calc 4 (consolidation)", flush=True)
        # 4. consolidation_factor
        consolidation_factor = avg_bkt_mastery * avg_retention
        
        print("DEBUG: Calc 5 (consistency)", flush=True)
        # 5. adaptive_consistency_score
        last_5 = scores_pct[:5]
        adaptive_consistency_score = 100.0
        if len(last_5) >= 2:
            std = np.std(last_5)
            adaptive_consistency_score = max(0.0, 100.0 - std)
            
        print("DEBUG: Calc 6 (training level)", flush=True)
        # 6. training_level_encoded
        adaptive_scores = [a.score for a in attempts if a.mode == 'adaptive'][:3]
        level = 0.0
        if len(adaptive_scores) >= 2:
            avg_adaptive = (sum(adaptive_scores) / len(adaptive_scores) / 20.0) * 100
            if avg_adaptive >= 85: level = 2.0
            elif avg_adaptive >= 60: level = 1.0
            
        print("DEBUG: Calc 7 (pressure resilience)", flush=True)
        # 7. pressure_resilience
        last_a = attempts[0]
        pressure_resilience = 1.0
        if last_a.avg_response_time and last_a.response_time_variance:
            norm_var = last_a.response_time_variance / (last_a.avg_response_time ** 2) if last_a.avg_response_time > 0 else 0
            pressure_resilience = max(0.0, min(1.0, 1.0 - norm_var))
            
        print("DEBUG: Calc 8-10", flush=True)
        # 8. avg_response_time
        avg_response_time = last_a.avg_response_time or 0.0
        
        # 9. response_time_variance
        response_time_variance_log = np.log1p(last_a.response_time_variance or 0.0)
        
        # 10. total_attempts
        total_attempts_log = np.log1p(total_attempts_raw)
        
        print("DEBUG: Calc 11-12", flush=True)
        # 11. last_5_score_mean
        last_5_score_mean = np.mean(scores[:5]) if scores else 0.0
        
        # 12. last_5_score_std
        last_5_score_std = np.std(scores[:5]) if len(scores[:5]) >= 2 else 0.0
        
        print("DEBUG: Calc 13 (overdue)", flush=True)
        # 13. review_queue_size
        total_due = sum(1 for s in user_skills if s.next_review_at and s.next_review_at <= now)
        
        print("DEBUG: Calc 14-15", flush=True)
        # 14. avg_interval_days
        avg_interval_days = 0.0
        if user_skills:
            avg_interval_days = sum(s.interval_days for s in user_skills) / len(user_skills)
        
        # 15. repetition_stability_score
        repetition_stability_score = 0.0
        if user_skills:
            repetition_stability_score = sum(s.ease_factor for s in user_skills) / len(user_skills)
        
        print("DEBUG: Calc 16 (entropy)", flush=True)
        # 16. topic_entropy
        topic_entropy = 0.0
        if user_skills:
            topic_accs = [s.skill_score for s in user_skills]
            sum_acc = sum(topic_accs)
            if sum_acc > 0:
                probs = [p/sum_acc for p in topic_accs if p > 0]
                topic_entropy = -sum(p * np.log(p) for p in probs)

        print("DEBUG: Calc 17-18", flush=True)
        # 17. weakest_topic_mastery
        weakest_topic_mastery = 0.0
        if user_skills:
            weakest_topic_mastery = min(s.bkt_knowledge_prob for s in user_skills)
        
        # 18. strongest_topic_mastery
        strongest_topic_mastery = 0.0
        if user_skills:
            strongest_topic_mastery = max(s.bkt_knowledge_prob for s in user_skills)
        
        # 19. time_since_last_attempt (days)
        time_since_last_attempt = 1.0 # Default 1 day
        if last_a.finished_at:
            time_since_last_attempt = (now - last_a.finished_at).total_seconds() / 86400
            
        # 20. overdue_ratio
        overdue_ratio = 0.0
        if user_skills:
            overdue_ratio = total_due / len(user_skills)
        
        vector = [
            float(readiness_score),
            float(avg_bkt_mastery),
            float(avg_retention),
            float(consolidation_factor),
            float(adaptive_consistency_score),
            float(level),
            float(pressure_resilience),
            float(avg_response_time),
            float(response_time_variance_log),
            float(total_attempts_log),
            float(last_5_score_mean),
            float(last_5_score_std),
            float(total_due),
            float(avg_interval_days),
            float(repetition_stability_score),
            float(topic_entropy),
            float(weakest_topic_mastery),
            float(strongest_topic_mastery),
            float(time_since_last_attempt),
            float(overdue_ratio)
        ]
        
        # Replace any NaN/Inf with 0
        vector = [0.0 if np.isnan(v) or np.isinf(v) else v for v in vector]
        
        return vector

    except Exception as e:
        import traceback
        traceback.print_exc()
        return None
