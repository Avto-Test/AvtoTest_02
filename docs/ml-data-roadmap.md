# AUTOTEST — ML DATA ROADMAP (UPGRADED & EXECUTION-READY)

---

# 🧠 FINAL VERDICT

AUTOTEST is currently:

> a strong rule-based adaptive learning system
> with partially built ML data infrastructure

NOT yet a production ML system.

---

# ⚠️ CORE TRUTH

> DO NOT build ML yet
> BUILD DATA SYSTEM FIRST

---

# 🧩 CURRENT STATE (SHORT)

### ✅ EXISTS

* Adaptive system
* Analytics (rule-based)
* Feature ideas
* Partial snapshot system
* Basic ML structure (disabled)

### ❌ MISSING

* Proper feature logging
* Canonical snapshot system
* Label collection (active)
* Dataset pipeline
* Data quality layer
* ML deployment pipeline

---

# 🎯 TARGET

```text
snapshot (X) + label (y) → clean dataset → ML
```

---

# 🚀 PHASE STRUCTURE

## Phase 1 — Data Collection (CRITICAL)

## Phase 2 — Dataset Building

## Phase 3 — ML Training

## Phase 4 — Deployment

## Phase 5 — Optimization

---

# 💣 PRIORITY (VERY IMPORTANT)

```text
Phase 1 >>> ALL OTHER PHASES
```

---

# 🚀 PHASE 1 — DATA COLLECTION (MVP + FULL)

---

## 🎯 GOAL

Collect:

```text
(X, y) pairs WITHOUT leakage
```

---

# 🔥 PHASE 1 — MVP (DO THIS FIRST)

## 💣 MINIMAL WORKING SYSTEM

### 1. SNAPSHOT (ONLY 1 TRIGGER)

Trigger:

* after attempt завершение (test completed)

---

### Snapshot contains:

```text
user_id
attempt_id
snapshot_time

last_score
last_5_avg
last_5_std
overall_accuracy
total_attempts
avg_response_time
weakest_topic_accuracy
consistency_score
```

---

## 2. LABEL (EXAM RESULT)

Frontend:

```text
Did you pass the exam?
[Yes] [No]
```

---

Backend:

```text
user_exam_results:
- user_id
- snapshot_id
- exam_result (0/1)
- exam_date
```

---

## 3. LINKING (CRITICAL)

```text
label → EXACT snapshot_id
```

NOT nearest.

---

## 🎯 MVP RESULT

```text
(X, y) dataset exists
```

---

💣 AFTER THIS → ML CAN START

---

# 🚀 PHASE 1 — FULL VERSION

After MVP:

---

## SNAPSHOT EXTENSIONS

Add triggers:

* dashboard view
* simulation readiness
* before asking exam result

---

## SNAPSHOT MUST INCLUDE:

```text
feature_version
trigger_surface
prediction_value (rule-based)
confidence_score
last_activity_time
```

---

## FEATURE LOGGING UPGRADE

Add:

* response_time variance
* improvement_rate
* topic_entropy
* session activity

---

---

# 🚀 PHASE 2 — DATASET BUILDING

---

## 🎯 GOAL

```text
clean, versioned dataset
```

---

## TASKS

* join snapshot + label
* compute:

  * time_gap_days
  * activity_gap_days
  * confidence_score

---

## FILTER RULES

DROP or MARK:

```text
time_gap > 30 days
activity_gap > 20 days
missing features
invalid timestamps
```

---

## OUTPUT

```text
ml_dataset:
(X, y, metadata)
```

---

# 🚀 PHASE 3 — ML TRAINING

---

## 🎯 START SIMPLE

* Logistic Regression
* LightGBM

---

## TRAIN:

```python
model.fit(X, y)
```

---

## VALIDATION:

* ROC AUC
* Brier Score
* Calibration

---

## IMPORTANT:

```text
ML must beat rule-based system
```

---

# 🚀 PHASE 4 — DEPLOYMENT

---

## SHADOW MODE

```text
model runs but user DOES NOT see it
```

---

## COMPARE:

* rule vs ML

---

## ONLY THEN:

```text
enable ML
```

---

# 🚀 PHASE 5 — OPTIMIZATION

---

* add new features
* drift monitoring
* improve label collection
* A/B testing

---

# 💣 DATA QUALITY SYSTEM (CRITICAL)

---

## ADD:

```text
time_gap_days
activity_gap_days
confidence_score
```

---

## CONFIDENCE BASED ON:

* recency
* activity
* consistency
* data completeness

---

---

# ⚠️ HARD RULES

---

## ❌ DO NOT:

* use latest state after exam
* use nearest snapshot
* mix timelines
* train on fake labels

---

## ✅ ALWAYS:

```text
X = BEFORE exam
y = AFTER exam
```

---

---

# 🧠 FINAL DATA FLOW

```text
User → Attempt → Snapshot (X)
→ Exam → Label (y)
→ Dataset → Train
```

---

# 💣 BIGGEST RISKS

* no labels
* noisy labels
* time gaps
* user drift
* leakage

---

# 🚀 FINAL GOAL

```text
production ML system:
- clean data
- versioned dataset
- calibrated model
- safe deployment
```

---

# 🔚 FINAL MESSAGE

> AUTOTEST is not an ML system yet
> It is becoming one

And the correct path is:

```text
DATA → DATA → DATA → ML
```
