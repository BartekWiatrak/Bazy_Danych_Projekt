# backend/db.py
import sqlite3
from contextlib import contextmanager
from datetime import datetime

DB_PATH = "app.db"

# --- połączenie i row_factory jako słowniki ---
def dict_factory(cursor, row):
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = dict_factory
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()

# --- inicjalizacja schematu (dokładnie Twoje tabele) ---
CREATE_SQL = [
    # Klienci
    """
    CREATE TABLE IF NOT EXISTS "Klienci" (
        "id_klienta"    INTEGER PRIMARY KEY AUTOINCREMENT,
        "imię"          TEXT NOT NULL,
        "nazwisko"      TEXT NOT NULL,
        "telefon"       TEXT
    );
    """,
    # Samochody
    """
    CREATE TABLE IF NOT EXISTS "Samochody" (
        "id_samochodu"  INTEGER PRIMARY KEY AUTOINCREMENT,
        "marka"         TEXT NOT NULL,
        "model"         TEXT NOT NULL,
        "cena_bazowa"   REAL NOT NULL,
        "dostępność"    TEXT NOT NULL DEFAULT 'available'  -- np. available/maintenance
    );
    """,
    # Wypożyczenia
    """
    CREATE TABLE IF NOT EXISTS "Wypożyczenia" (
        "id_wypożyczenia"   INTEGER PRIMARY KEY AUTOINCREMENT,
        "id_klienta"        INTEGER NOT NULL,
        "id_samochodu"      INTEGER NOT NULL,
        "data_od"           TEXT NOT NULL,      -- ISO: YYYY-MM-DD
        "data_do"           TEXT NOT NULL,      -- ISO: YYYY-MM-DD
        "cena_dzienna"      REAL NOT NULL,
        "koszt_całkowity"   REAL NOT NULL,
        "status"            TEXT NOT NULL CHECK (status IN ('reserved','active','completed','canceled')),
        FOREIGN KEY("id_klienta")   REFERENCES "Klienci"("id_klienta"),
        FOREIGN KEY("id_samochodu") REFERENCES "Samochody"("id_samochodu")
    );
    """,
    # Cennik (przypięty do wypożyczenia 1—1, zgodnie z Twoim ERD)
    """
    CREATE TABLE IF NOT EXISTS "Cennik" (
        "id_wypożyczenia"   INTEGER PRIMARY KEY,
        "sezon"             TEXT NOT NULL,   -- np. niski/sredni/wysoki (opis dowolny)
        "mnożnik_ceny"      REAL NOT NULL,   -- np. 0.9 / 1.0 / 1.3
        "data_od"           TEXT NOT NULL,
        "data_do"           TEXT NOT NULL,
        FOREIGN KEY("id_wypożyczenia") REFERENCES "Wypożyczenia"("id_wypożyczenia")
    );
    """
]

def init_db():
    with get_db() as conn:
        cur = conn.cursor()
        for sql in CREATE_SQL:
            cur.execute(sql)

# ----------------- LOGIKA SEZONÓW -----------------
# Sezon liczymy po miesiącu z "data_od". Możesz zmienić progi jak chcesz.
SEASON_RULES = [
    # (nazwa_sezonu, mnożnik, miesiące)
    ("niski", 0.90, {1, 2, 11}),          # styczeń, luty, listopad
    ("wysoki", 1.30, {6, 7, 8}),          # lato
    ("średni", 1.00, set(range(1,13)))    # fallback (nadpisany przez wcześniejsze)
]
def pick_season(date_iso: str):
    """Zwraca (sezon, mnożnik) na podstawie miesiąca z daty 'YYYY-MM-DD'."""
    m = datetime.strptime(date_iso, "%Y-%m-%d").month
    for name, mult, months in SEASON_RULES:
        if m in months:
            return name, mult
    return "średni", 1.0

# ----------------- POMOCNICZE CRUD-y -----------------
def add_klient(imię: str, nazwisko: str, telefon: str | None = None):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            'INSERT INTO "Klienci" ("imię","nazwisko","telefon") VALUES (?,?,?)',
            (imię, nazwisko, telefon)
        )
        return cur.lastrowid

def add_samochod(marka: str, model: str, cena_bazowa: float, dostępność: str = "available"):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            'INSERT INTO "Samochody" ("marka","model","cena_bazowa","dostępność") VALUES (?,?,?,?)',
            (marka, model, cena_bazowa, dostępność)
        )
        return cur.lastrowid

def list_klienci():
    with get_db() as conn:
        return conn.execute('SELECT * FROM "Klienci" ORDER BY "id_klienta" DESC').fetchall()

def list_samochody(tylko_dostepne: bool = False):
    with get_db() as conn:
        if tylko_dostepne:
            return conn.execute('SELECT * FROM "Samochody" WHERE "dostępność" = "available" ORDER BY "id_samochodu" DESC').fetchall()
        return conn.execute('SELECT * FROM "Samochody" ORDER BY "id_samochodu" DESC').fetchall()

# ----------------- DOSTĘPNOŚĆ: brak nakładania się terminów -----------------
def is_vehicle_available(id_samochodu: int, data_od: str, data_do: str) -> bool:
    """True jeśli brak rezerwacji/aktywnych wypożyczeń nachodzących na [data_od, data_do)."""
    sql = """
    SELECT 1
    FROM "Wypożyczenia" w
    WHERE w."id_samochodu" = ?
      AND w."status" IN ('reserved','active')
      AND NOT (w."data_do" <= ? OR w."data_od" >= ?)
    LIMIT 1;
    """
    with get_db() as conn:
        row = conn.execute(sql, (id_samochodu, data_od, data_do)).fetchone()
        return row is None

# ----------------- REZERWACJA (Twoja transakcja T1) -----------------
def rezerwuj_samochod(id_klienta: int, id_samochodu: int, data_od: str, data_do: str):
    """
    Tworzy wypożyczenie + wpis w Cennik.
    Wylicza cenę dzienną = cena_bazowa * mnożnik_ceny (wg sezonu z data_od).
    Koszt całkowity = cena_dzienna * liczba_dni.
    Zwraca id_wypożyczenia.
    """
    # Walidacje podstawowe
    d1 = datetime.strptime(data_od, "%Y-%m-%d")
    d2 = datetime.strptime(data_do, "%Y-%m-%d")
    if not (d1 < d2):
        raise ValueError("data_od musi być < data_do")
    if not is_vehicle_available(id_samochodu, data_od, data_do):
        raise ValueError("Samochód zajęty w podanym terminie")

    with get_db() as conn:
        cur = conn.cursor()

        # 1) Pobierz cenę bazową samochodu
        car = cur.execute('SELECT "cena_bazowa" FROM "Samochody" WHERE "id_samochodu" = ?',
                          (id_samochodu,)).fetchone()
        if not car:
            raise ValueError("Nie znaleziono samochodu")

        cena_bazowa = float(car["cena_bazowa"])

        # 2) Wyznacz sezon i mnożnik (na podstawie data_od)
        sezon, mnoznik = pick_season(data_od)
        cena_dzienna = round(cena_bazowa * float(mnoznik), 2)
        dni = (d2 - d1).days
        koszt_calkowity = round(cena_dzienna * dni, 2)

        # 3) INSERT do Wypożyczenia
        cur.execute(
            '''
            INSERT INTO "Wypożyczenia"
            ("id_klienta","id_samochodu","data_od","data_do","cena_dzienna","koszt_całkowity","status")
            VALUES (?,?,?,?,?,?, 'reserved')
            ''',
            (id_klienta, id_samochodu, data_od, data_do, cena_dzienna, koszt_calkowity)
        )
        id_wypo = cur.lastrowid

        # 4) INSERT do Cennik (zastosowana reguła dla tego wypożyczenia)
        cur.execute(
            '''
            INSERT INTO "Cennik"
            ("id_wypożyczenia","sezon","mnożnik_ceny","data_od","data_do")
            VALUES (?,?,?,?,?)
            ''',
            (id_wypo, sezon, mnoznik, data_od, data_do)
        )

        return {
            "id_wypożyczenia": id_wypo,
            "cena_dzienna": cena_dzienna,
            "koszt_całkowity": koszt_calkowity,
            "sezon": sezon,
            "mnożnik_ceny": mnoznik
        }

# ----------------- ZMIANA STATUSÓW (T2/T3/T4) -----------------
def start_wypozyczenia(id_wypożyczenia: int):
    with get_db() as conn:
        conn.execute('UPDATE "Wypożyczenia" SET "status" = "active" WHERE "id_wypożyczenia" = ?', (id_wypożyczenia,))

def zakoncz_wypozyczenie(id_wypożyczenia: int):
    with get_db() as conn:
        conn.execute('UPDATE "Wypożyczenia" SET "status" = "completed" WHERE "id_wypożyczenia" = ?', (id_wypożyczenia,))

def anuluj_rezerwacje(id_wypożyczenia: int):
    with get_db() as conn:
        conn.execute(
            'UPDATE "Wypożyczenia" SET "status" = "canceled" WHERE "id_wypożyczenia" = ? AND "status" = "reserved"',
            (id_wypożyczenia,)
        )

# ----------------- LISTY POD API -----------------
def list_wypozyczenia():
    with get_db() as conn:
        sql = '''
        SELECT w.*, k."imię", k."nazwisko", s."marka", s."model"
        FROM "Wypożyczenia" w
        JOIN "Klienci" k ON k."id_klienta" = w."id_klienta"
        JOIN "Samochody" s ON s."id_samochodu" = w."id_samochodu"
        ORDER BY w."id_wypożyczenia" DESC
        '''
        return conn.execute(sql).fetchall()

def list_cennik():
    with get_db() as conn:
        return conn.execute('SELECT * FROM "Cennik" ORDER BY "id_wypożyczenia" DESC').fetchall()

# Uruchomienie jednorazowe: python -c "from backend.db import init_db; init_db()"
if __name__ == "__main__":
    init_db()
    print("✅ Zainicjalizowano bazę SQLite:", DB_PATH)
