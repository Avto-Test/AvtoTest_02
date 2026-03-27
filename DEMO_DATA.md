# Demo Data

Seed command:

```powershell
python scripts/seed_full_demo_site.py
```

Rich local test data:

```powershell
python scripts/safe_migrate.py --skip-backup
python scripts/seed_local_test_data.py
```

Full cross-domain local test data alias:

```powershell
python scripts/safe_migrate.py --skip-backup
python scripts/seed_full_test_data.py
```

Demo accounts:

- `demo.student@example.com` / `AutotestDemo!2026`
- `demo.free@example.com` / `AutotestDemo!2026`
- `demo.admin@example.com` / `AutotestDemo!2026`
- `demo.school.owner@example.com` / `AutotestDemo!2026`
- `demo.instructor.owner@example.com` / `AutotestDemo!2026`

Additional local accounts:

- `qa.student.one@example.com` / `AutotestDemo!2026`
- `qa.student.two@example.com` / `AutotestDemo!2026`
- `qa.student.three@example.com` / `AutotestDemo!2026`
- `qa.student.four@example.com` / `AutotestDemo!2026`
- `qa.school.manager@example.com` / `AutotestDemo!2026`
- `qa.instructor.manager@example.com` / `AutotestDemo!2026`
- `qa.parent.viewer@example.com` / `AutotestDemo!2026`

Seed quyidagilarni to'ldiradi:

- practice, simulation, analytics va learning-path uchun demo test bank
- barcha asosiy learning kategoriyalari uchun demo kategoriyalar, ko'proq savollar va har bir kategoriya uchun alohida lesson fayllari
- notifications uchun demo bildirishnomalar
- schools va instructors uchun rasm, lokatsiya, sharh va tariflar
- school leads, instructor apply/leads/complaints, registration settings va simulation exam settings
- subscription planlar, demo promo kodlar va violation log yozuvlari
- payments, feedbacks, pending registrations va refresh sessionlar
- RBAC role/permission mappinglari, school memberships va scoped user role assignmentlar
- XP wallets, coin wallets, achievements, streaklar, leaderboard snapshotlari va boost history
- review queue, analytics eventlar va simulation attempt history
- mavjud bo'lmagan backend endpointlar uchun demo XP, achievements, coins va leaderboard fallbacklari
- qo'shimcha local users, boyroq katalog (schools/instructors), category-based lessons va 50 ta alohida admin test savoli

Oxirgi seed verifikatsiyasi natijalari:

- users: 15
- categories: 7
- lessons: 43
- questions: 270
- schools: 6
- instructors: 16
- plans: 4
- promos: 5
- violations: 6
- payments: 6
- feedbacks: 5
- pending_registrations: 3
- refresh_sessions: 7
- user_roles: 10
- school_memberships: 9
- achievements: 4
- review_queue: 9
- simulation_attempts: 4
- analytics_events: 6
- xp_events: 36
- coin_transactions: 24
