# Bazy_Danych_Projekt
Bazy Danych Projekt - Bartosz Wiatrak, Artur Kaczor

Prosty szkielet aplikacji webowej: FastAPI (backend) + SQLite (baza) + React/Vite (frontend).

Bazy_Danych_Projekt/
├─ backend/
│  ├─ main.py      # tu piszesz endpointy API (FastAPI)
│  └─ db.py        # tu konfigurujesz bazę SQLite (modele/połączenie)
├─ frontend/
│  └─ src/
│     └─ App.jsx   # tu piszesz interfejs (React)
├─ .venv/          # wirtualne środowisko Pythona
└─ README.md

1) Backend – FastAPI + SQLite

Aktywuj środowisko (Windows):

.venv\Scripts\activate
python -m uvicorn backend.main:app --reload

Aktywuj środowisko (MacOS):

source .venv/bin/activate
python -m uvicorn backend.main:app --reload


Backend działa na:

API: http://127.0.0.1:8000/

Swagger (testy): http://127.0.0.1:8000/docs

2) Frontend – React (Vite)
W nowym terminalu:

Windows:

cd frontend
npm run dev

MacOS:

cd frontend && npm run dev


Frontend działa na:

http://localhost:5173/


KOD:
backend/main.py – definicje endpointów, logika API (GET/POST/PUT/DELETE).
backend/db.py – konfiguracja bazy SQLite (połączenie, modele).
frontend/src/App.jsx – UI Twojej aplikacji (formularze, listy, wywołania fetch/axios do API).