from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend import db

app = FastAPI(title="Kaczy Wicher API")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

db.init_db()


# -------------------- MODELE --------------------


class KlientIn(BaseModel):
    imie: str
    nazwisko: str
    telefon: str | None = None


class KlientDaneIn(BaseModel):
    ulica: str | None = None
    kod_pocztowy: str | None = None
    miasto: str | None = None
    email: str | None = None
    zgoda_marketingowa: bool = False


class SamochodIn(BaseModel):
    marka: str
    model: str
    typ_samochodu: str
    numer_rejestracyjny: str
    cena_bazowa: float
    dostepnosc: str = "available"


class RezerwacjaIn(BaseModel):
    id_klienta: int
    id_samochodu: int
    data_od: str  # YYYY-MM-DD
    data_do: str  # YYYY-MM-DD


class CennikIn(BaseModel):
    id_samochodu: int
    sezon: str
    mnoznik_ceny: float
    data_od: str
    data_do: str


# -------------------- ENDPOINTY --------------------


@app.get("/")
def root():
    return {"message": "Kaczy Wicher API działa"}


# --- Klienci ---


@app.get("/klienci")
def klienci_list():
    return [dict(row) for row in db.list_klienci()]


@app.post("/klienci")
def klienci_add(klient: KlientIn):
    new_id = db.add_klient(klient.imie, klient.nazwisko, klient.telefon)
    return {"id_klienta": new_id}


@app.post("/klienci/{id_klienta}/dane")
def klienci_set_dane(id_klienta: int, dane: KlientDaneIn):
    try:
        db.set_dane_klienta(
            id_klienta,
            dane.ulica,
            dane.kod_pocztowy,
            dane.miasto,
            dane.email,
            dane.zgoda_marketingowa,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True}


# NOWE: usuwanie klienta
@app.delete("/klienci/{id_klienta}")
def klienci_delete(id_klienta: int):
    try:
        db.delete_klient(id_klienta)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True}


# --- Samochody ---


@app.get("/samochody")
def samochody_list():
    return [dict(row) for row in db.list_samochody()]


@app.post("/samochody")
def samochody_add(sam: SamochodIn):
    new_id = db.add_samochod(
        sam.marka,
        sam.model,
        sam.typ_samochodu,
        sam.numer_rejestracyjny,
        sam.cena_bazowa,
        sam.dostepnosc,
    )
    return {"id_samochodu": new_id}


# NOWE: usuwanie samochodu
@app.delete("/samochody/{id_samochodu}")
def samochody_delete(id_samochodu: int):
    try:
        db.delete_samochod(id_samochodu)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True}


# --- Cennik ---


@app.get("/cennik")
def cennik_list():
    return [dict(row) for row in db.list_cennik()]


@app.post("/cennik")
def cennik_add(item: CennikIn):
    db.set_cennik(
        item.id_samochodu,
        item.sezon,
        item.mnoznik_ceny,
        item.data_od,
        item.data_do,
    )
    return {"ok": True}


# --- Wypozyczenia ---


@app.get("/wypozyczenia")
def wypozyczenia_list():
    return [dict(row) for row in db.list_wypozyczenia()]


@app.post("/wypozyczenia/rezerwacja")
def wypozyczenia_rezerwacja(rez: RezerwacjaIn):
    try:
        new_id = db.rezerwuj_samochod(
            rez.id_klienta,
            rez.id_samochodu,
            rez.data_od,
            rez.data_do,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"id_wypozyczenia": new_id}


@app.post("/wypozyczenia/{id_wypo}/start")
def wypozyczenia_start(id_wypo: int):
    try:
        db.start_wypozyczenia(id_wypo)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True}


@app.post("/wypozyczenia/{id_wypo}/koniec")
def wypozyczenia_koniec(id_wypo: int):
    try:
        db.koniec_wypozyczenia(id_wypo)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True}


@app.post("/wypozyczenia/{id_wypo}/anuluj")
def wypozyczenia_anuluj(id_wypo: int):
    try:
        db.anuluj_wypozyczenia(id_wypo)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"ok": True}
