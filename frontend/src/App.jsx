import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";

export default function App() {
  // --- Klienci ---
  const [klienci, setKlienci] = useState([]);
  const [formKlient, setFormKlient] = useState({ imię: "", nazwisko: "", telefon: "" });
  const [loadingKlienci, setLoadingKlienci] = useState(false);

  // --- Samochody ---
  const [samochody, setSamochody] = useState([]);
  const [formSam, setFormSam] = useState({ marka: "", model: "", cena_bazowa: "", dostępność: "available" });
  const [loadingSam, setLoadingSam] = useState(false);

  // --- Rezerwacje ---
  const [wypozyczenia, setWypozyczenia] = useState([]);
  const [formRez, setFormRez] = useState({ id_klienta: "", id_samochodu: "", data_od: "", data_do: "" });
  const [rezultat, setRezultat] = useState(null);
  const [loadingWypo, setLoadingWypo] = useState(false);

  // --- UI ---
  const [msg, setMsg] = useState("");
  const notify = (text) => { setMsg(text); setTimeout(() => setMsg(""), 2500); };

  // ==================== API: Klienci ====================
  async function fetchKlienci() {
    try {
      setLoadingKlienci(true);
      const res = await fetch(`${API}/klienci`);
      setKlienci(await res.json());
    } catch (e) { notify("Błąd pobierania klientów"); }
    finally { setLoadingKlienci(false); }
  }
  async function addKlient(e) {
    e.preventDefault();
    if (!formKlient.imię || !formKlient.nazwisko) return notify("Podaj imię i nazwisko");
    try {
      const res = await fetch(`${API}/klienci`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formKlient),
      });
      if (!res.ok) throw 0;
      await fetchKlienci();
      setFormKlient({ imię: "", nazwisko: "", telefon: "" });
      notify("Dodano klienta ✅");
    } catch { notify("Błąd dodawania klienta"); }
  }

  // ==================== API: Samochody ====================
  async function fetchSamochody() {
    try {
      setLoadingSam(true);
      const res = await fetch(`${API}/samochody`);
      setSamochody(await res.json());
    } catch { notify("Błąd pobierania samochodów"); }
    finally { setLoadingSam(false); }
  }
  async function addSamochod(e) {
    e.preventDefault();
    const { marka, model, cena_bazowa } = formSam;
    if (!marka || !model || !cena_bazowa) return notify("Uzupełnij: marka, model, cena bazowa");
    try {
      const res = await fetch(`${API}/samochody`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formSam, cena_bazowa: Number(cena_bazowa) }),
      });
      if (!res.ok) throw 0;
      await fetchSamochody();
      setFormSam({ marka: "", model: "", cena_bazowa: "", dostępność: "available" });
      notify("Dodano samochód ✅");
    } catch { notify("Błąd dodawania samochodu"); }
  }

  // ==================== API: Wypożyczenia ====================
  async function fetchWypozyczenia() {
    try {
      setLoadingWypo(true);
      const res = await fetch(`${API}/wypozyczenia`);
      setWypozyczenia(await res.json());
    } catch { notify("Błąd pobierania wypożyczeń"); }
    finally { setLoadingWypo(false); }
  }

  async function rezerwuj(e) {
    e.preventDefault();
    const { id_klienta, id_samochodu, data_od, data_do } = formRez;
    if (!id_klienta || !id_samochodu || !data_od || !data_do) return notify("Uzupełnij wszystkie pola");
    try {
      const res = await fetch(`${API}/wypozyczenia/rezerwacja`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_klienta: Number(id_klienta), id_samochodu: Number(id_samochodu), data_od, data_do }),
      });
      const data = await res.json();
      if (!res.ok) { notify(data.detail || "Błąd rezerwacji"); return; }
      setRezultat(data);
      await fetchWypozyczenia();
      notify("Utworzono rezerwację ✅");
    } catch { notify("Błąd rezerwacji"); }
  }

  async function actionStatus(id, typ) {
    try {
      const res = await fetch(`${API}/wypozyczenia/${id}/${typ}`, { method: "POST" });
      if (!res.ok) throw 0;
      await fetchWypozyczenia();
    } catch { notify("Błąd akcji"); }
  }

  // ==================== Init ====================
  useEffect(() => { fetchKlienci(); fetchSamochody(); fetchWypozyczenia(); }, []);

  // ==================== UI ====================
  return (
    <div className="container">
      <header>
        <h1>Wypożyczalnia – Kaczy Wicher</h1>
        <p className="subtitle">FastAPI + SQLite + React (Vite)</p>
        {msg && <div className="toast">{msg}</div>}
      </header>

      <section className="grid">
        {/* ---------- Klienci ---------- */}
        <div className="card">
          <h2>Klienci</h2>
          <form onSubmit={addKlient} className="form">
            <div className="row">
              <label>Imię</label>
              <input value={formKlient.imię} onChange={(e) => setFormKlient({ ...formKlient, imię: e.target.value })} />
            </div>
            <div className="row">
              <label>Nazwisko</label>
              <input value={formKlient.nazwisko} onChange={(e) => setFormKlient({ ...formKlient, nazwisko: e.target.value })} />
            </div>
            <div className="row">
              <label>Telefon</label>
              <input value={formKlient.telefon} onChange={(e) => setFormKlient({ ...formKlient, telefon: e.target.value })} />
            </div>
            <button type="submit">Dodaj klienta</button>
          </form>

          <div className="list">
            {loadingKlienci ? <p>Ładowanie…</p> : klienci.length === 0 ? <p>Brak klientów.</p> : (
              <table>
                <thead><tr><th>ID</th><th>Imię</th><th>Nazwisko</th><th>Telefon</th></tr></thead>
                <tbody>
                  {klienci.map((k) => (
                    <tr key={k.id_klienta}>
                      <td>{k.id_klienta}</td>
                      <td>{k["imię"]}</td>
                      <td>{k.nazwisko}</td>
                      <td>{k.telefon || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ---------- Samochody ---------- */}
        <div className="card">
          <h2>Samochody</h2>
          <form onSubmit={addSamochod} className="form">
            <div className="row"><label>Marka</label>
              <input value={formSam.marka} onChange={(e) => setFormSam({ ...formSam, marka: e.target.value })} />
            </div>
            <div className="row"><label>Model</label>
              <input value={formSam.model} onChange={(e) => setFormSam({ ...formSam, model: e.target.value })} />
            </div>
            <div className="row"><label>Cena bazowa (PLN/doba)</label>
              <input type="number" step="0.01" value={formSam.cena_bazowa}
                     onChange={(e) => setFormSam({ ...formSam, cena_bazowa: e.target.value })} />
            </div>
            <div className="row"><label>Dostępność</label>
              <select value={formSam["dostępność"]} onChange={(e) => setFormSam({ ...formSam, dostępność: e.target.value })}>
                <option value="available">available</option>
                <option value="maintenance">maintenance</option>
              </select>
            </div>
            <button type="submit">Dodaj samochód</button>
          </form>

          <div className="list">
            {loadingSam ? <p>Ładowanie…</p> : samochody.length === 0 ? <p>Brak samochodów.</p> : (
              <table>
                <thead><tr><th>ID</th><th>Marka</th><th>Model</th><th>Cena bazowa</th><th>Dostępność</th></tr></thead>
                <tbody>
                  {samochody.map((s) => (
                    <tr key={s.id_samochodu}>
                      <td>{s.id_samochodu}</td><td>{s.marka}</td><td>{s.model}</td>
                      <td>{s.cena_bazowa}</td><td>{s["dostępność"]}</td>
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
              onChange={(e) => setFormRez({ ...formRez, id_klienta: e.target.value })}
            >
              <option value="">-- wybierz --</option>
              {klienci.map((k) => (
                <option key={k.id_klienta} value={k.id_klienta}>
                  {k.id_klienta}: {k["imię"]} {k.nazwisko}
                </option>
              ))}
            </select>
          </div>

          <div className="row">
            <label>Samochód</label>
            <select
              value={formRez.id_samochodu}
              onChange={(e) => setFormRez({ ...formRez, id_samochodu: e.target.value })}
            >
              <option value="">-- wybierz --</option>
              {samochody.map((s) => (
                <option key={s.id_samochodu} value={s.id_samochodu}>
                  {s.id_samochodu}: {s.marka} {s.model} (bazowa {s.cena_bazowa} PLN)
                </option>
              ))}
            </select>
          </div>

          <div className="row">
            <label>Data od</label>
            <input type="date" value={formRez.data_od}
                   onChange={(e) => setFormRez({ ...formRez, data_od: e.target.value })} />
          </div>

          <div className="row">
            <label>Data do</label>
            <input type="date" value={formRez.data_do}
                   onChange={(e) => setFormRez({ ...formRez, data_do: e.target.value })} />
          </div>

          <button type="submit">Zarezerwuj</button>
        </form>

        {rezultat && (
          <div className="result">
            <p><b>Sezon:</b> {rezultat.sezon}</p>
            <p><b>Mnożnik:</b> {rezultat["mnożnik_ceny"]}</p>
            <p><b>Cena dzienna:</b> {rezultat.cena_dzienna} PLN</p>
            <p><b>Koszt całkowity:</b> {rezultat.koszt_całkowity} PLN</p>
          </div>
        )}

        <h3>Lista wypożyczeń</h3>
        <div className="list">
          {loadingWypo ? <p>Ładowanie…</p> : wypozyczenia.length === 0 ? <p>Brak wypożyczeń.</p> : (
            <table>
              <thead>
              <tr>
                <th>ID</th><th>Klient</th><th>Samochód</th><th>od</th><th>do</th>
                <th>cena/doba</th><th>koszt</th><th>status</th><th>Akcje</th>
              </tr>
              </thead>
              <tbody>
              {wypozyczenia.map((w) => (
                <tr key={w.id_wypożyczenia}>
                  <td>{w.id_wypożyczenia}</td>
                  <td>{w["imię"]} {w.nazwisko}</td>
                  <td>{w.marka} {w.model}</td>
                  <td>{w.data_od}</td><td>{w.data_do}</td>
                  <td>{w.cena_dzienna}</td><td>{w.koszt_całkowity}</td>
                  <td>{w.status}</td>
                  <td className="actions">
                    <button onClick={() => actionStatus(w.id_wypożyczenia, "start")}>Start</button>
                    <button onClick={() => actionStatus(w.id_wypożyczenia, "koniec")}>Koniec</button>
                    <button onClick={() => actionStatus(w.id_wypożyczenia, "anuluj")}>Anuluj</button>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <footer>
        <small>Etap 3 — rezerwacje z sezonami ✅. Kolejny krok: walidacje i testy pod 5.0.</small>
      </footer>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Inter, system-ui, Arial; background: #0b1020; color: #e8ecf1; }
        .container { max-width: 1100px; margin: 0 auto; padding: 24px; }
        header { margin-bottom: 16px; }
        h1 { margin: 0 0 6px; font-size: 28px; }
        .subtitle { margin: 0; opacity: 0.75; }
        .toast { margin-top: 8px; background: #153955; border: 1px solid #2a5c86; padding: 8px 12px; border-radius: 8px; display: inline-block; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .card { background: #121a33; border: 1px solid #25335a; border-radius: 14px; padding: 16px; }
        .card.wide { margin-top: 8px; }
        h2, h3 { margin-top: 0; }
        .form .row { display: grid; grid-template-columns: 160px 1fr; gap: 8px; margin-bottom: 8px; align-items: center; }
        input, select { width: 100%; padding: 8px 10px; border-radius: 8px; border: 1px solid #2e3f6f; background: #0f1730; color: #e8ecf1; }
        button { margin-top: 6px; padding: 6px 10px; border-radius: 8px; border: 1px solid #2a5c86; background: #1a3a5c; color: #e8ecf1; cursor: pointer; }
        button:hover { filter: brightness(1.1); }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 8px; border-bottom: 1px solid #25335a; text-align: left; }
        .actions button { margin-right: 6px; }
        footer { margin-top: 18px; opacity: 0.7; }
        @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } .form .row { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
