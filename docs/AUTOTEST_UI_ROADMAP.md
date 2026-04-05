# AUTOTEST Product UI Roadmap

Last updated: March 13, 2026

## Vision

AUTOTEST should not feel like a simple testing website.

It should feel like an AI Driving Exam Coach.

The goal is to create a calm, premium, intelligent interface that is comparable in product quality to:

- Apple Fitness
- Linear
- Arc Browser
- Duolingo
- Brilliant

The interface should guide users toward passing their driving exam through intelligent recommendations, structured learning, and visible momentum. Every key screen should answer three questions immediately:

- What should I do now?
- Why does it matter?
- How close am I to exam readiness?

This means AUTOTEST must prioritize learning clarity over dashboard density, coaching over raw analytics, and confidence over complexity.

## Core Product Philosophy

### 1. Focus-first interface

Each screen should have one dominant action and one dominant message. Users should never have to scan ten equal-weight cards to understand their next step. The interface must direct attention toward the next learning action, not toward decorative statistics.

### 2. Minimal UI noise

Remove anything that does not help the user practice, recover weak topics, or understand readiness. Dense widgets, duplicated metrics, and overly segmented cards should be replaced with calmer grouped surfaces and clearer sectioning.

### 3. AI-guided learning

AUTOTEST should feel like it is actively coaching the learner. The product should recommend what to practice next, what topic is weakening progress, when to review, and when the user is ready for simulation. Guidance should feel specific, timely, and trustworthy.

### 4. Strong visual hierarchy

Important information must look important. Primary actions, plan status, weak-topic recovery, and readiness signals should visually dominate secondary analytics, history, and supporting details. Typography, spacing, contrast, and scale should all reinforce this hierarchy.

### 5. Calm premium design

The product should feel modern and premium without becoming flashy. Avoid the generic SaaS dashboard look. AUTOTEST is a learning product, so the visual system should feel deliberate, quiet, polished, and confidence-building.

## UX Flow Model

```text
Today
|
v
Practice
|
v
Improve weak topics
|
v
Simulation exam
|
v
Pass real exam
```

This flow should define the logic of the entire product:

- Today: The dashboard should work like a daily coach briefing. It should tell the user what matters today, what to do next, and how that work contributes to exam readiness.
- Practice: Practice screens should minimize distraction and keep the learner in a clear question-answer-feedback loop.
- Improve weak topics: Weak-topic recovery should be visible, actionable, and easy to start. This is the bridge between doing questions and actually improving.
- Simulation exam: Simulation should feel like an earned milestone, not just another button. The product should explain readiness and make the user feel prepared before entry.
- Pass real exam: Progress screens should always connect short-term effort to the long-term outcome of passing the real exam.

Every page should support this journey:

- Dashboard: defines today's plan and next action.
- Practice: delivers focused execution.
- Review and weak topics: turns mistakes into guided recovery.
- Lessons: fills concept gaps before they become repeated errors.
- Simulation readiness: explains when and why the learner is ready.
- Analytics: reinforces progress only when it helps decision-making.

## PHASE 1 - Product Identity & AI Study Plan

**Goal**

Transform the dashboard from a generic dashboard into an AI coach interface.

### UI elements to introduce

#### AI Study Plan card

Example:

**Bugungi reja**

- 12 ta savol mashq
- 1 lesson
- 1 review

This card should become the daily center of gravity for the dashboard. It should feel like a personalized plan generated for today, not a static to-do list.

#### Dashboard hero

The dashboard hero should become:

**Today's Practice**

The hero should contain:

- the user's main daily action
- a short explanation of why that action matters
- current readiness context
- a single primary CTA

#### Large CTA

Primary action:

**Mashqni boshlash**

This CTA should be visually dominant and immediately visible above the fold on desktop and mobile.

#### AI recommendation message

Example:

`Siz uchun eng muhim mavzu: Yo'l belgilar`

This message should explain the most important next learning priority based on weak-topic and performance signals.

### Phase 1 UX impact

This phase changes AUTOTEST from "a place where I can take tests" into "a system that knows what I need to do next." That shift is critical. It reduces friction at the start of a session, lowers decision fatigue, and gives the product a distinctive AI coach identity. Users should open the dashboard and instantly understand:

- what to do now
- what topic needs attention
- how today's work connects to passing the exam

### Phase 1 implementation notes

- Replace multi-card dashboard clutter with one hero surface and one study-plan surface.
- Limit above-the-fold content to the most important learning actions.
- Keep supporting analytics secondary and below the primary coaching area.
- Use real backend intelligence wherever available, especially dashboard, review, lesson, and readiness signals.
- Ensure the mobile layout preserves the same coaching-first hierarchy.

### Phase 1 success criteria

- A first-time or returning user can identify the next action in under 5 seconds.
- The dashboard has one clear primary CTA.
- Weak-topic coaching is visible without opening secondary pages.
- The product reads as an AI learning coach, not as a metrics dashboard.

## PHASE 2 - Visual Hierarchy & Layout Simplification

**Goal**

Reduce cognitive overload and create a cleaner, more premium dashboard structure.

### Design direction

Remove excessive cards and introduce:

- surfaces
- sections
- breathing space

The dashboard should no longer look like a grid of equally weighted widgets. Instead, it should feel like a guided reading experience with clear vertical flow.

### Layout model

Dashboard:

- Hero section
- Weak topics section
- Simulation readiness
- Recent activity timeline

### Phase 2 UX impact

This phase reduces cognitive overload by grouping related content into larger, calmer modules. Users should process the page top to bottom instead of jumping between competing card fragments. Breathing space improves comprehension, makes the product feel more premium, and increases trust in the information hierarchy.

### Phase 2 implementation notes

- Merge small metrics into larger contextual surfaces.
- Use section titles that read like product guidance, not admin labels.
- Reserve strong contrast and accent color for actions and key states.
- Reduce visual borders and card repetition.
- Keep timeline and history lightweight so they support the flow without stealing attention.

### Phase 2 success criteria

- The dashboard feels scannable in one pass.
- The hero remains dominant.
- Users can distinguish current action, supporting context, and historical data without confusion.
- The page feels calmer even when the same amount of information is present.

## PHASE 3 - Premium Interaction Design

**Goal**

Make the product feel responsive, refined, and premium through subtle interaction design.

### Interaction patterns to introduce

Components should support:

- hover lift
- button feedback
- progress animation
- chart animation

Animations must be:

- fast
- soft
- predictable

Avoid flashy motion.

### Motion guidance

- Hover states should create slight elevation and improved clarity, not dramatic movement.
- Button interactions should provide immediate tactile feedback and reinforce confidence.
- Progress indicators should animate smoothly from previous to current state.
- Charts should transition in a way that helps understanding, not decoration.

### Phase 3 UX impact

Premium interaction design makes the system feel alive and trustworthy. It signals quality without distraction. When done well, motion improves orientation, rewards progress, and helps users notice important state changes.

### Phase 3 implementation notes

- Keep most transitions within a short, calm duration range.
- Prefer opacity, slight translate, and scale adjustments over complex motion paths.
- Use animation to communicate change in readiness, progress, or completion.
- Avoid motion on every element at once.

### Phase 3 success criteria

- Interactions feel polished without slowing the user down.
- Motion improves comprehension of state changes.
- No animation competes with question answering or reading.

## PHASE 4 - AI Product Feel

**Goal**

Introduce intelligent UI signals so users feel the system is guiding them.

### Example guidance messages

- `You improved 12% today.`
- `You are close to exam readiness.`
- `You should review these topics.`

### Product behavior direction

These messages should be tied to real learning state, not generic encouragement. AUTOTEST should communicate like a calm coach:

- specific
- encouraging
- evidence-based
- action-oriented

### Phase 4 UX impact

This phase creates the AI product feel. Users should sense that AUTOTEST understands their performance, adapts to it, and gives meaningful next-step advice. The product becomes more personal and more motivating without becoming noisy or gimmicky.

### Phase 4 implementation notes

- Place guidance close to the action it affects.
- Explain recommendations in simple language.
- Prefer short, useful messages over long AI paragraphs.
- Avoid overclaiming intelligence when confidence is low or data is limited.

### Phase 4 success criteria

- Recommendations feel relevant and believable.
- Users understand why a topic or task is being highlighted.
- Coaching language increases confidence instead of pressure.

## PHASE 5 - Advanced Learning Visualization

**Goal**

Make progress visible through high-value visual learning signals.

### Visual systems to introduce

- Topic mastery radar
- Simulation readiness meter
- Progress rings
- Learning journey visualization

The Learning Path should feel like a roadmap instead of a card list.

### Product direction

These visualizations should help users answer:

- What am I good at?
- What still needs work?
- How close am I to simulation readiness?
- What is the most efficient path forward?

### Phase 5 UX impact

Advanced learning visualization turns invisible progress into visible momentum. It helps users understand not just that they are active, but how their abilities are changing over time. This supports motivation, trust, and better decision-making.

### Phase 5 implementation notes

- Use visualization only when it improves understanding.
- Keep each graphic tied to a clear explanatory label.
- Make readiness visuals feel meaningful and earned.
- Represent the learning journey as progression through milestones, not as disconnected widgets.

### Phase 5 success criteria

- Users can identify strengths and weaknesses at a glance.
- Readiness feels measurable and motivating.
- The learning path communicates progress direction, not just status snapshots.

## EdTech UI Analysis

## Duolingo

### Key strengths

- Gamification
- Learning path progression
- Simple UI

### Lessons for AUTOTEST

- Use streaks, XP, and progression feedback only when they reinforce learning momentum.
- Make the path forward obvious after every session.
- Keep task entry friction extremely low.

## Brilliant

### Strengths

- Concept-focused learning
- Visual problem solving
- Clean typography

### Lessons

- Use visual explanations and clean learning cards.
- Present concepts with clarity before asking for repeated execution.
- Let typography and spacing do more work than decorative UI.

## Khan Academy

### Strengths

- Structured curriculum
- Topic mastery tracking
- Simple analytics

### Lessons

- Topic mastery must be very clear.
- Curriculum progress should feel structured, not incidental.
- Analytics should support learning choices rather than overwhelm the learner.

## AUTOTEST Design System

## Color System

Primary accent:

Electric blue / indigo gradient

Secondary accent:

Soft green for progress

Neutral backgrounds:

Light gray or deep dark

Avoid too many colors.

Design guidance:

- Use the primary accent for hero moments, main CTA states, and intelligence surfaces.
- Use soft green only for progress, mastery, completion, and readiness improvement.
- Keep warning and error colors limited and purposeful.
- Let neutral surfaces carry most of the interface so accent colors feel premium instead of noisy.

## Typography

Hierarchy:

- Display
- Title
- Section Title
- Body
- Caption

Key pages should use large display titles.

Typography guidance:

- Display text should appear on the dashboard hero, practice entry, and simulation readiness moments.
- Title and Section Title should create a clear reading rhythm across the page.
- Body text should stay concise and readable.
- Caption text should support metadata, helper copy, and timestamps without competing with action content.

## Component Philosophy

Reduce number of cards.

Use:

- large surfaces
- floating modules
- layered UI

Component guidance:

- Prefer one strong surface over three weak cards.
- Treat each surface as a meaningful product block with a clear purpose.
- Use layering to separate primary action from supportive context.
- Keep component shapes, spacing, and shadow behavior consistent so the system feels intentional.

## Motion System

Define micro-interactions:

- surface-hover-lift
- progress animations
- chart transitions

Motion should feel calm and premium.

Motion guidance:

- Use motion to clarify interface state changes.
- Keep animation curves smooth and restrained.
- Avoid exaggerated bouncing, springiness, or game-like motion in core learning flows.
- Maintain consistency so motion becomes part of the product language.

## Implementation Plan

Development should follow the phases in sequence, not in parallel. The product should first establish a clear AI coach identity, then simplify layout, then add premium interaction polish, then strengthen AI guidance signals, and only then introduce more advanced visual learning systems.

Implementation order:

1. PHASE 1 - Product Identity & AI Study Plan
2. PHASE 2 - Visual Hierarchy & Layout Simplification
3. PHASE 3 - Premium Interaction Design
4. PHASE 4 - AI Product Feel
5. PHASE 5 - Advanced Learning Visualization

Start with:

PHASE 1 - Product Identity & AI Study Plan

Only after Phase 1 is complete move to Phase 2.

Recommended delivery rule:

- Each phase should ship with a clear before/after UX review.
- Each phase should preserve the core learning flow.
- Each phase should be validated on both desktop and mobile.
- No later-phase visual system should be layered on top of a weak Phase 1 foundation.

## Next Step

Next development task:

Implement Phase 1 dashboard redesign.

Do not implement other phases yet.
