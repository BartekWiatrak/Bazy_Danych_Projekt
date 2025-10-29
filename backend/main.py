# backend/main.py
from fastapi.middleware.cors import CORSMiddleware

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from backend import db

app = FastAPI(title="Kaczy Wicher API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# Inicjalizacja bazy przy starcie
db.init_db()

# --------- MODELE WEJŚCIOWE (Pydantic) ---------
class KlientIn(BaseModel):
    imię: str
    nazwisko: str
    telefon: str | None = None

class SamochodIn(BaseModel):
    marka: str
    model: str
    cena_bazowa: float
    dostępność: str = "available"

class RezerwacjaIn(BaseModel):
    id_klienta: int
    id_samochodu: int
    data_od: str  # 'YYYY-MM-DD'
    data_do: str

# --------- ENDPOINTY ---------
@app.get("/klienci")
def klienci_list():
    return db.list_klienci()

@app.post("/klienci")
def klienci_add(k: KlientIn):
    kid = db.add_klient(k.imię, k.nazwisko, k.telefon)
    return {"id_klienta": kid}

@app.get("/samochody")
def samochody_list(tylko_dostepne: bool = False):
    return db.list_samochody(tylko_dostepne)

@app.post("/samochody")
def samochody_add(s: SamochodIn):
    sid = db.add_samochod(s.marka, s.model, s.cena_bazowa, s.dostępność)
    return {"id_samochodu": sid}

@app.get("/wypozyczenia")
def wypozyczenia_list():
    return db.list_wypozyczenia()

@app.post("/wypozyczenia/rezerwacja")
def wypozyczenia_rezerwacja(r: RezerwacjaIn):
    try:
        return db.rezerwuj_samochod(r.id_klienta, r.id_samochodu, r.data_od, r.data_do)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/wypozyczenia/{id_wypo}/start")
def wypozyczenia_start(id_wypo: int):
    db.start_wypozyczenia(id_wypo)
    return {"ok": True}

@app.post("/wypozyczenia/{id_wypo}/koniec")
def wypozyczenia_koniec(id_wypo: int):
    db.zakoncz_wypozyczenie(id_wypo)
    return {"ok": True}

@app.post("/wypozyczenia/{id_wypo}/anuluj")
def wypozyczenia_anuluj(id_wypo: int):
    db.anuluj_rezerwacje(id_wypo)
    return {"ok": True}

@app.get("/cennik")
def cennik_list():
    return db.list_cennik()
