// frontend/src/App.jsx
import { useEffect, useMemo, useState } from "react";

const API = "http://127.0.0.1:8000";

export default function App() {
  // -------------------- view --------------------
  const [view, setView] = useState("admin");
  const [msg, setMsg] = useState("");
  const notify = (text) => {
    setMsg(text);
    if (text) setTimeout(() => setMsg(""), 2500);
  };

  // -------------------- Klienci --------------------
  const [klienci, setKlienci] = useState([]);
  const [loadingKlienci, setLoadingKlienci] = useState(false);
  const [formKlient, setFormKlient] = useState({
    imie: "",
    nazwisko: "",
    telefon: "",
  });

  async function fetchKlienci() {
    try {
      setLoadingKlienci(true);
      const res = await fetch(`${API}/klienci`);
      setKlienci(await res.json());
    } catch {
      notify("Blad pobierania klientow");
    } finally {
      setLoadingKlienci(false);
    }
  }

  async function addKlient(e) {
    e.preventDefault();
    if (!formKlient.imie || !formKlient.nazwisko) {
      notify("Podaj imie i nazwisko");
      return;
    }
    try {
      const res = await fetch(`${API}/klienci`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formKlient),
      });
      if (!res.ok) throw 0;
      await fetchKlienci();
      setFormKlient({ imie: "", nazwisko: "", telefon: "" });
      notify("Dodano klienta");
    } catch {
      notify("Blad dodawania klienta");
    }
  }

  // -------------------- Dane klienta 1–1 --------------------
  const [formDane, setFormDane] = useState({
    id_klienta: "",
    ulica: "",
    kod_pocztowy: "",
    miasto: "",
    email: "",
    zgoda_marketingowa: false,
  });

  async function saveDaneKlienta(e) {
    e.preventDefault();
    const { id_klienta, ...payload } = formDane;
    if (!id_klienta) {
      notify("Wybierz klienta");
      return;
    }
    try {
      const res = await fetch(`${API}/klienci/${id_klienta}/dane`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          zgoda_marketingowa: Boolean(payload.zgoda_marketingowa),
        }),
      });
      if (!res.ok) throw 0;
      notify("Zapisano dane klienta");
    } catch {
      notify("Blad zapisu danych klienta");
    }
  }

  // -------------------- Samochody --------------------
  const [samochody, setSamochody] = useState([]);
  const [loadingSam, setLoadingSam] = useState(false);
  const [formSam, setFormSam] = useState({
    marka: "",
    model: "",
    typ_samochodu: "",
    numer_rejestracyjny: "",
    cena_bazowa: "",
    dostepnosc: "available",
  });

  async function fetchSamochody() {
    try {
      setLoadingSam(true);
      const res = await fetch(`${API}/samochody`);
      setSamochody(await res.json());
    } catch {
      notify("Blad pobierania samochodow");
    } finally {
      setLoadingSam(false);
    }
  }

  async function addSamochod(e) {
    e.preventDefault();
    const { marka, model, cena_bazowa } = formSam;
    if (!marka || !model || !cena_bazowa) {
      notify("Uzupelnij marka, model i cene bazowa");
      return;
    }
    try {
      const res = await fetch(`${API}/samochody`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formSam,
          cena_bazowa: Number(formSam.cena_bazowa),
        }),
      });
      if (!res.ok) throw 0;
      await fetchSamochody();
      setFormSam({
        marka: "",
        model: "",
        typ_samochodu: "",
        numer_rejestracyjny: "",
        cena_bazowa: "",
        dostepnosc: "available",
      });
      notify("Dodano samochod");
    } catch {
      notify("Blad dodawania samochodu");
    }
  }

  // -------------------- Cennik --------------------
  const [cennik, setCennik] = useState([]);
  const [loadingCennik, setLoadingCennik] = useState(false);
  const [formCennik, setFormCennik] = useState({
    id_samochodu: "",
    sezon: "",
    mnoznik_ceny: "1.0",
    data_od: "",
    data_do: "",
  });

  async function fetchCennik() {
    try {
      setLoadingCennik(true);
      const res = await fetch(`${API}/cennik`);
      setCennik(await res.json());
    } catch {
      notify("Blad pobierania cennika");
    } finally {
      setLoadingCennik(false);
    }
  }

  async function addCennik(e) {
    e.preventDefault();
    const { id_samochodu, sezon, mnoznik_ceny, data_od, data_do } = formCennik;
    if (!id_samochodu || !sezon || !mnoznik_ceny || !data_od || !data_do) {
      notify("Uzupelnij wszystkie pola");
      return;
    }
    try {
      const res = await fetch(`${API}/cennik`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_samochodu: Number(id_samochodu),
          sezon,
          mnoznik_ceny: Number(mnoznik_ceny),
          data_od,
          data_do,
        }),
      });
      if (!res.ok) throw 0;
      await fetchCennik();
      setFormCennik({
        id_samochodu: "",
        sezon: "",
        mnoznik_ceny: "1.0",
        data_od: "",
        data_do: "",
      });
      notify("Dodano regule cennika");
    } catch {
      notify("Blad dodawania cennika");
    }
  }

  // -------------------- Wypozyczenia --------------------
  const [wypozyczenia, setWypozyczenia] = useState([]);
  const [loadingWypo, setLoadingWypo] = useState(false);
  const [formRez, setFormRez] = useState({
    id_klienta: "",
    id_samochodu: "",
    data_od: "",
    data_do: "",
  });
  const [rezultat, setRezultat] = useState(null);

  async function fetchWypozyczenia() {
    try {
      setLoadingWypo(true);
      const res = await fetch(`${API}/wypozyczenia`);
      setWypozyczenia(await res.json());
    } catch {
      notify("Blad pobierania wypozyczen");
    } finally {
      setLoadingWypo(false);
    }
  }

  async function rezerwuj(e) {
    e.preventDefault();
    const { id_klienta, id_samochodu, data_od, data_do } = formRez;
    if (!id_klienta || !id_samochodu || !data_od || !data_do) {
      notify("Uzupelnij wszystkie pola");
      return;
    }
    try {
      const res = await fetch(`${API}/wypozyczenia/rezerwacja`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_klienta: Number(id_klienta),
          id_samochodu: Number(id_samochodu),
          data_od,
          data_do,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.detail || "Blad rezerwacji");
        return;
      }
      setRezultat(data);
      await fetchWypozyczenia();
      notify("Utworzono rezerwacje");
    } catch {
      notify("Blad rezerwacji");
    }
  }

  async function actionStatus(id, typ) {
    try {
      const res = await fetch(`${API}/wypozyczenia/${id}/${typ}`, {
        method: "POST",
      });
      if (!res.ok) throw 0;
      await fetchWypozyczenia();
    } catch {
      notify("Blad zmiany statusu");
    }
  }

  // -------------------- Widok klienta --------------------
  const zajeteTerminy = useMemo(() => {
    const map = {};
    wypozyczenia
      .filter((w) => w.status !== "canceled")
      .forEach((w) => {
        if (!map[w.id_samochodu]) map[w.id_samochodu] = [];
        map[w.id_samochodu].push({
          id: w.id_wypozyczenia,
          od: w.data_od,
          do: w.data_do,
          status: w.status,
        });
      });
    return map;
  }, [wypozyczenia]);

  // -------------------- Init --------------------
  useEffect(() => {
    fetchKlienci();
    fetchSamochody();
    fetchWypozyczenia();
    fetchCennik();
  }, []);

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="container">
      <header>
        <h1>Wypozyczalnia – Kaczy Wicher</h1>
        <p className="subtitle">FastAPI + SQLite + React</p>
        <div className="view-switch">
          <button className={view === "admin" ? "active" : ""} onClick={() => setView("admin")}>
            Panel pracownika
          </button>
          <button className={view === "client" ? "active" : ""} onClick={() => setView("client")}>
            Widok klienta
          </button>
        </div>
        {msg && <div className="toast">{msg}</div>}
      </header>

      {view === "admin" ? (
        <>
          {/* ================== ADMIN ================== */}
          <section className="grid">

            {/* ---------- Klienci ---------- */}
            <div className="card">
              <h2>Klienci</h2>
              <form onSubmit={addKlient} className="form">
                <div className="row">
                  <label>Imie</label>
                  <input
                    value={formKlient.imie}
                    onChange={(e) => setFormKlient({ ...formKlient, imie: e.target.value })}
                  />
                </div>
                <div className="row">
                  <label>Nazwisko</label>
                  <input
                    value={formKlient.nazwisko}
                    onChange={(e) => setFormKlient({ ...formKlient, nazwisko: e.target.value })}
                  />
                </div>
                <div className="row">
                  <label>Telefon</label>
                  <input
                    value={formKlient.telefon}
                    onChange={(e) => setFormKlient({ ...formKlient, telefon: e.target.value })}
                  />
                </div>
                <button type="submit">Dodaj klienta</button>
              </form>

              <div className="list">
                {loadingKlienci ? (
                  <p>Ładowanie...</p>
                ) : klienci.length === 0 ? (
                  <p>Brak klientow.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Imie</th>
                        <th>Nazwisko</th>
                        <th>Telefon</th>
                      </tr>
                    </thead>
                    <tbody>
                      {klienci.map((k) => (
                        <tr key={k.id_klienta}>
                          <td>{k.id_klienta}</td>
                          <td>{k.imie}</td>
                          <td>{k.nazwisko}</td>
                          <td>{k.telefon || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* ---------- Dane klienta ---------- */}
            <div className="card">
              <h2>Dane klienta</h2>
              <form onSubmit={saveDaneKlienta} className="form">
                <div className="row">
                  <label>Klient</label>
                  <select
                    value={formDane.id_klienta}
                    onChange={(e) => setFormDane({ ...formDane, id_klienta: e.target.value })}
                  >
                    <option value="">-- wybierz --</option>
                    {klienci.map((k) => (
                      <option key={k.id_klienta} value={k.id_klienta}>
                        {k.id_klienta}: {k.imie} {k.nazwisko}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row">
                  <label>Ulica</label>
                  <input
                    value={formDane.ulica}
                    onChange={(e) => setFormDane({ ...formDane, ulica: e.target.value })}
                  />
                </div>

                <div className="row">
                  <label>Kod pocztowy</label>
                  <input
                    value={formDane.kod_pocztowy}
                    onChange={(e) => setFormDane({ ...formDane, kod_pocztowy: e.target.value })}
                  />
                </div>

                <div className="row">
                  <label>Miasto</label>
                  <input
                    value={formDane.miasto}
                    onChange={(e) => setFormDane({ ...formDane, miasto: e.target.value })}
                  />
                </div>

                <div className="row">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formDane.email}
                    onChange={(e) => setFormDane({ ...formDane, email: e.target.value })}
                  />
                </div>

                <div className="row checkbox-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={formDane.zgoda_marketingowa}
                      onChange={(e) =>
                        setFormDane({ ...formDane, zgoda_marketingowa: e.target.checked })
                      }
                    />
                    Zgoda marketingowa
                  </label>
                </div>

                <button type="submit">Zapisz</button>
              </form>
            </div>

            {/* ---------- Samochody ---------- */}
            <div className="card">
              <h2>Samochody</h2>
              <form onSubmit={addSamochod} className="form">
                <div className="row">
                  <label>Marka</label>
                  <input
                    value={formSam.marka}
                    onChange={(e) => setFormSam({ ...formSam, marka: e.target.value })}
                  />
                </div>
                <div className="row">
                  <label>Model</label>
                  <input
                    value={formSam.model}
                    onChange={(e) => setFormSam({ ...formSam, model: e.target.value })}
                  />
                </div>
                <div className="row">
                  <label>Typ samochodu</label>
                  <input
                    value={formSam.typ_samochodu}
                    onChange={(e) => setFormSam({ ...formSam, typ_samochodu: e.target.value })}
                  />
                </div>
                <div className="row">
                  <label>Rejestracja</label>
                  <input
                    value={formSam.numer_rejestracyjny}
                    onChange={(e) =>
                      setFormSam({ ...formSam, numer_rejestracyjny: e.target.value })
                    }
                  />
                </div>

                <div className="row">
                  <label>Cena bazowa</label>
                  <input
                    type="number"
                    value={formSam.cena_bazowa}
                    onChange={(e) =>
                      setFormSam({ ...formSam, cena_bazowa: e.target.value })
                    }
                  />
                </div>

                <div className="row">
                  <label>Dostepnosc</label>
                  <select
                    value={formSam.dostepnosc}
                    onChange={(e) => setFormSam({ ...formSam, dostepnosc: e.target.value })}
                  >
                    <option value="available">available</option>
                    <option value="unavailable">unavailable</option>
                  </select>
                </div>

                <button type="submit">Dodaj</button>
              </form>

              <div className="list">
                {loadingSam ? (
                  <p>Ładowanie...</p>
                ) : samochody.length === 0 ? (
                  <p>Brak samochodow.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Marka</th>
                        <th>Model</th>
                        <th>Typ</th>
                        <th>Rejestracja</th>
                        <th>Cena</th>
                        <th>Dostepnosc</th>
                      </tr>
                    </thead>
                    <tbody>
                      {samochody.map((s) => (
                        <tr key={s.id_samochodu}>
                          <td>{s.id_samochodu}</td>
                          <td>{s.marka}</td>
                          <td>{s.model}</td>
                          <td>{s.typ_samochodu}</td>
                          <td>{s.numer_rejestracyjny}</td>
                          <td>{s.cena_bazowa}</td>
                          <td>{s.dostepnosc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* ---------- Cennik ---------- */}
            <div className="card">
              <h2>Cennik</h2>
              <form onSubmit={addCennik} className="form">
                <div className="row">
                  <label>Samochod</label>
                  <select
                    value={formCennik.id_samochodu}
                    onChange={(e) =>
                      setFormCennik({ ...formCennik, id_samochodu: e.target.value })
                    }
                  >
                    <option value="">-- wybierz --</option>
                    {samochody.map((s) => (
                      <option key={s.id_samochodu} value={s.id_samochodu}>
                        {s.id_samochodu}: {s.marka} {s.model}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="row">
                  <label>Sezon</label>
                  <input
                    value={formCennik.sezon}
                    onChange={(e) => setFormCennik({ ...formCennik, sezon: e.target.value })}
                  />
                </div>

                <div className="row">
                  <label>Mnoznik</label>
                  <input
                    type="number"
                    value={formCennik.mnoznik_ceny}
                    onChange={(e) =>
                      setFormCennik({ ...formCennik, mnoznik_ceny: e.target.value })
                    }
                  />
                </div>

                <div className="row">
                  <label>Data od</label>
                  <input
                    type="date"
                    value={formCennik.data_od}
                    onChange={(e) =>
                      setFormCennik({ ...formCennik, data_od: e.target.value })
                    }
                  />
                </div>

                <div className="row">
                  <label>Data do</label>
                  <input
                    type="date"
                    value={formCennik.data_do}
                    onChange={(e) =>
                      setFormCennik({ ...formCennik, data_do: e.target.value })
                    }
                  />
                </div>

                <button type="submit">Dodaj regule</button>
              </form>

              <div className="list">
                {loadingCennik ? (
                  <p>Ładowanie...</p>
                ) : cennik.length === 0 ? (
                  <p>Brak reguł cennika.</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Samochod</th>
                        <th>Sezon</th>
                        <th>Mnoznik</th>
                        <th>Od</th>
                        <th>Do</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cennik.map((c) => (
                        <tr key={c.id_cennika}>
                          <td>{c.id_cennika}</td>
                          <td>{c.id_samochodu}</td>
                          <td>{c.sezon}</td>
                          <td>{c.mnoznik_ceny}</td>
                          <td>{c.data_od}</td>
                          <td>{c.data_do}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>

          {/* ---------- Rezerwacje ---------- */}
          <section className="card wide">
            <h2>Rezerwacje</h2>

            <form onSubmit={rezerwuj} className="form">
              <div className="row">
                <label>Klient</label>
                <select
                  value={formRez.id_klienta}
                  onChange={(e) =>
                    setFormRez({ ...formRez, id_klienta: e.target.value })
                  }
                >
                  <option value="">-- wybierz --</option>
                  {klienci.map((k) => (
                    <option key={k.id_klienta} value={k.id_klienta}>
                      {k.id_klienta}: {k.imie} {k.nazwisko}
                    </option>
                  ))}
                </select>
              </div>

              <div className="row">
                <label>Samochod</label>
                <select
                  value={formRez.id_samochodu}
                  onChange={(e) =>
                    setFormRez({ ...formRez, id_samochodu: e.target.value })
                  }
                >
                  <option value="">-- wybierz --</option>
                  {samochody.map((s) => (
                    <option key={s.id_samochodu} value={s.id_samochodu}>
                      {s.id_samochodu}: {s.marka} {s.model}
                    </option>
                  ))}
                </select>
              </div>

              <div className="row">
                <label>Data od</label>
                <input
                  type="date"
                  value={formRez.data_od}
                  onChange={(e) =>
                    setFormRez({ ...formRez, data_od: e.target.value })
                  }
                />
              </div>

              <div className="row">
                <label>Data do</label>
                <input
                  type="date"
                  value={formRez.data_do}
                  onChange={(e) =>
                    setFormRez({ ...formRez, data_do: e.target.value })
                  }
                />
              </div>

              <button type="submit">Zarezerwuj</button>
            </form>

            {rezultat && (
              <p className="result">
                Cena dzienna: {rezultat.cena_dzienna} PLN,
                koszt calkowity: {rezultat.koszt_calkowity} PLN
              </p>
            )}

            <div className="list">
              {loadingWypo ? (
                <p>Ładowanie...</p>
              ) : wypozyczenia.length === 0 ? (
                <p>Brak wypozyczen.</p>
              ) : (
                <ul>
                  {wypozyczenia.map((w) => (
                    <li key={w.id_wypozyczenia}>
                      #{w.id_wypozyczenia} klient {w.id_klienta} →
                      samochod {w.id_samochodu} ({w.data_od} – {w.data_do}) [{w.status}]
                      {" "}
                      <button onClick={() => actionStatus(w.id_wypozyczenia, "start")}>
                        Start
                      </button>
                      <button onClick={() => actionStatus(w.id_wypozyczenia, "koniec")}>
                        Koniec
                      </button>
                      <button onClick={() => actionStatus(w.id_wypozyczenia, "anuluj")}>
                        Anuluj
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="hint">Etap 3 – CRUD + transakcje</p>
          </section>
        </>
      ) : (
        // ================== VIEW KLIENTA ==================
        <section className="card wide">
          <h2>Dostepne samochody i zajete terminy</h2>
          {samochody.length === 0 ? (
            <p>Brak samochodow.</p>
          ) : (
            <div className="list">
              {samochody.map((s) => (
                <div key={s.id_samochodu} className="car-block">
                  <h3>
                    #{s.id_samochodu} {s.marka} {s.model} ({s.typ_samochodu}) – {s.dostepnosc}
                  </h3>
                  <p>Cena bazowa: {s.cena_bazowa} PLN/doba</p>
                  <p>Rejestracja: {s.numer_rejestracyjny}</p>
                  <p>
                    Zajete terminy:{" "}
                    {zajeteTerminy[s.id_samochodu] &&
                    zajeteTerminy[s.id_samochodu].length > 0 ? (
                      <ul>
                        {zajeteTerminy[s.id_samochodu].map((t) => (
                          <li key={t.id}>
                            {t.od} – {t.do} ({t.status})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "brak rezerwacji"
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
