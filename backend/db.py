# backend/db.py
import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "app.db"


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    """Tworzy tabele, jeśli jeszcze nie istnieją."""
    create_sql = [
        # Klienci
        """
        CREATE TABLE IF NOT EXISTS Klienci (
            id_klienta INTEGER PRIMARY KEY AUTOINCREMENT,
            imie       TEXT NOT NULL,
            nazwisko   TEXT NOT NULL,
            telefon    TEXT
        );
        """,
        # Dane_klienta (relacja 1-1 z Klienci)
        """
        CREATE TABLE IF NOT EXISTS Dane_klienta (
            id_klienta          INTEGER PRIMARY KEY,
            ulica               TEXT,
            kod_pocztowy        TEXT,
            miasto              TEXT,
            email               TEXT,
            zgoda_marketingowa  INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY(id_klienta)
                REFERENCES Klienci(id_klienta)
                ON DELETE CASCADE
        );
        """,
        # Samochody
        """
        CREATE TABLE IF NOT EXISTS Samochody (
            id_samochodu        INTEGER PRIMARY KEY AUTOINCREMENT,
            marka               TEXT NOT NULL,
            model               TEXT NOT NULL,
            typ_samochodu       TEXT NOT NULL,
            numer_rejestracyjny TEXT NOT NULL UNIQUE,
            cena_bazowa         REAL NOT NULL,
            dostepnosc          TEXT NOT NULL DEFAULT 'available'
        );
        """,
        # Wypozyczenia
        """
        CREATE TABLE IF NOT EXISTS Wypozyczenia (
            id_wypozyczenia INTEGER PRIMARY KEY AUTOINCREMENT,
            id_klienta      INTEGER NOT NULL,
            id_samochodu    INTEGER NOT NULL,
            data_od         TEXT NOT NULL,
            data_do         TEXT NOT NULL,
            cena_dzienna    REAL NOT NULL,
            koszt_calkowity REAL NOT NULL,
            status          TEXT NOT NULL,
            FOREIGN KEY(id_klienta)
                REFERENCES Klienci(id_klienta),
            FOREIGN KEY(id_samochodu)
                REFERENCES Samochody(id_samochodu)
        );
        """,
        # Cennik
        """
        CREATE TABLE IF NOT EXISTS Cennik (
            id_cennika    INTEGER PRIMARY KEY AUTOINCREMENT,
            id_samochodu  INTEGER NOT NULL,
            sezon         TEXT NOT NULL,
            mnoznik_ceny  REAL NOT NULL,
            data_od       TEXT NOT NULL,
            data_do       TEXT NOT NULL,
            FOREIGN KEY(id_samochodu)
                REFERENCES Samochody(id_samochodu)
        );
        """,
    ]

    with get_db() as conn:
        cur = conn.cursor()
        for sql in create_sql:
            cur.execute(sql)


# -------------------- KLIENCI --------------------


def add_klient(imie: str, nazwisko: str, telefon: str | None):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO Klienci (imie, nazwisko, telefon)
            VALUES (?, ?, ?)
            """,
            (imie, nazwisko, telefon),
        )
        return cur.lastrowid


def set_dane_klienta(
    id_klienta: int,
    ulica: str | None,
    kod_pocztowy: str | None,
    miasto: str | None,
    email: str | None,
    zgoda_marketingowa: bool,
):
    """
    Relacja 1-1: PK = FK id_klienta.
    INSERT ... ON CONFLICT = upsert (tworzy lub aktualizuje).
    """
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO Dane_klienta
                (id_klienta, ulica, kod_pocztowy, miasto, email, zgoda_marketingowa)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id_klienta) DO UPDATE SET
                ulica = excluded.ulica,
                kod_pocztowy = excluded.kod_pocztowy,
                miasto = excluded.miasto,
                email = excluded.email,
                zgoda_marketingowa = excluded.zgoda_marketingowa
            """,
            (id_klienta, ulica, kod_pocztowy, miasto, email, int(zgoda_marketingowa)),
        )


def list_klienci():
    """
    Zwraca listę klientów wraz z danymi dodatkowymi (LEFT JOIN).
    """
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT k.id_klienta,
                   k.imie,
                   k.nazwisko,
                   k.telefon,
                   d.ulica,
                   d.kod_pocztowy,
                   d.miasto,
                   d.email,
                   d.zgoda_marketingowa
            FROM Klienci k
            LEFT JOIN Dane_klienta d
              ON d.id_klienta = k.id_klienta
            ORDER BY k.id_klienta DESC
            """
        )
        return cur.fetchall()


# -------------------- SAMOCHODY --------------------


def add_samochod(
    marka: str,
    model: str,
    typ_samochodu: str,
    numer_rejestracyjny: str,
    cena_bazowa: float,
    dostepnosc: str,
):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO Samochody
                (marka, model, typ_samochodu, numer_rejestracyjny, cena_bazowa, dostepnosc)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (marka, model, typ_samochodu, numer_rejestracyjny, cena_bazowa, dostepnosc),
        )
        return cur.lastrowid


def list_samochody():
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT *
            FROM Samochody
            ORDER BY id_samochodu DESC
            """
        )
        return cur.fetchall()


# -------------------- CENNIK --------------------


def list_cennik():
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT c.*, s.marka, s.model
            FROM Cennik c
            JOIN Samochody s ON s.id_samochodu = c.id_samochodu
            ORDER BY s.marka, s.model, c.data_od
            """
        )
        return cur.fetchall()


def set_cennik(
    id_samochodu: int,
    sezon: str,
    mnoznik_ceny: float,
    data_od: str,
    data_do: str,
):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO Cennik (id_samochodu, sezon, mnoznik_ceny, data_od, data_do)
            VALUES (?, ?, ?, ?, ?)
            """,
            (id_samochodu, sezon, mnoznik_ceny, data_od, data_do),
        )


def _oblicz_cene_dzienna(conn: sqlite3.Connection, id_samochodu: int, data_od: str, data_do: str) -> float:
    """
    Szuka w Cenniku reguły pasującej do zakresu dat.
    Jeśli znajdzie – zwraca cena_bazowa * mnoznik.
    Jeśli nie – zwraca sama cena_bazowa.
    """
    cur = conn.cursor()
    # pobierz bazową cenę samochodu
    cur.execute(
        "SELECT cena_bazowa FROM Samochody WHERE id_samochodu = ?",
        (id_samochodu,),
    )
    row = cur.fetchone()
    if row is None:
        raise ValueError("Samochód nie istnieje")
    baza = row["cena_bazowa"]

    # znajdź mnożnik z Cennika (najprostsza wersja – pierwszy pasujący)
    cur.execute(
        """
        SELECT mnoznik_ceny
        FROM Cennik
        WHERE id_samochodu = ?
          AND NOT (data_do < ? OR data_od > ?)
        ORDER BY data_od DESC
        LIMIT 1
        """,
        (id_samochodu, data_od, data_do),
    )
    c = cur.fetchone()
    if c is None:
        return float(baza)
    return float(baza) * float(c["mnoznik_ceny"])


# -------------------- WYPOZYCZENIA --------------------


def _sprawdz_kolizje(conn: sqlite3.Connection, id_samochodu: int, data_od: str, data_do: str) -> bool:
    """
    Zwraca True, jeśli istnieje kolidujące wypożyczenie (reserved/active).
    """
    cur = conn.cursor()
    cur.execute(
        """
        SELECT 1
        FROM Wypozyczenia
        WHERE id_samochodu = ?
          AND status IN ('reserved', 'active')
          AND NOT (data_do <= ? OR data_od >= ?)
        LIMIT 1
        """,
        (id_samochodu, data_od, data_do),
    )
    return cur.fetchone() is not None


def rezerwuj_samochod(id_klienta: int, id_samochodu: int, data_od: str, data_do: str):
    with get_db() as conn:
        if _sprawdz_kolizje(conn, id_samochodu, data_od, data_do):
            raise ValueError("Samochód jest już zarezerwowany w podanym okresie.")

        cena_dzienna = _oblicz_cene_dzienna(conn, id_samochodu, data_od, data_do)

        # liczba dni (bardzo prosta wersja – na projekt wystarczy)
        from datetime import date

        d_od = date.fromisoformat(data_od)
        d_do = date.fromisoformat(data_do)
        dni = (d_do - d_od).days or 1
        koszt = cena_dzienna * dni

        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO Wypozyczenia
                (id_klienta, id_samochodu, data_od, data_do,
                 cena_dzienna, koszt_calkowity, status)
            VALUES (?, ?, ?, ?, ?, ?, 'reserved')
            """,
            (id_klienta, id_samochodu, data_od, data_do, cena_dzienna, koszt),
        )
        return cur.lastrowid


def list_wypozyczenia():
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT w.*, k.imie, k.nazwisko, s.marka, s.model
            FROM Wypozyczenia w
            JOIN Klienci k ON k.id_klienta = w.id_klienta
            JOIN Samochody s ON s.id_samochodu = w.id_samochodu
            ORDER BY w.id_wypozyczenia DESC
            """
        )
        return cur.fetchall()


def start_wypozyczenia(id_wypozyczenia: int):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE Wypozyczenia
            SET status = 'active'
            WHERE id_wypozyczenia = ? AND status = 'reserved'
            """,
            (id_wypozyczenia,),
        )
        if cur.rowcount == 0:
            raise ValueError("Nie można rozpocząć tego wypożyczenia.")


def koniec_wypozyczenia(id_wypozyczenia: int):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE Wypozyczenia
            SET status = 'completed'
            WHERE id_wypozyczenia = ? AND status IN ('reserved', 'active')
            """,
            (id_wypozyczenia,),
        )
        if cur.rowcount == 0:
            raise ValueError("Nie można zakończyć tego wypożyczenia.")


def anuluj_wypozyczenia(id_wypozyczenia: int):
    with get_db() as conn:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE Wypozyczenia
            SET status = 'canceled'
            WHERE id_wypozyczenia = ? AND status = 'reserved'
            """,
            (id_wypozyczenia,),
        )
        if cur.rowcount == 0:
            raise ValueError("Nie można anulować tego wypożyczenia.")
