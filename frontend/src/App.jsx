import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) throw new Error(data?.detail || data?.message || `HTTP ${res.status}`);
  return data;
}

function safeJson(t) {
  try {
    return JSON.parse(t);
  } catch {
    return { message: t };
  }
}

// overlap check: [a1,a2) vs [b1,b2) w ISO YYYY-MM-DD
function overlaps(a1, a2, b1, b2) {
  // zakładamy poprawny format dat (ISO)
  // kolizja gdy NIE zachodzi: a2 <= b1 lub a1 >= b2
  return !(a2 <= b1 || a1 >= b2);
}

export default function App() {
  const [view, setView] = useState("admin"); // admin | client

  // admin sections
  const [section, setSection] = useState("klienci"); // klienci | samochody | rezerwacje | cennik
  const [mode, setMode] = useState("historia"); // dodaj | historia

  const [toast, setToast] = useState(null); // {type, text}
  const [confirm, setConfirm] = useState(null); // {title, desc, onYes}

  const toastShow = (type, text) => {
    setToast({ type, text });
    window.clearTimeout(toastShow._t);
    toastShow._t = window.setTimeout(() => setToast(null), 3200);
  };

  // ---- dane ----
  const [klienci, setKlienci] = useState([]);
  const [samochody, setSamochody] = useState([]);
  const [cennik, setCennik] = useState([]);
  const [wypozyczenia, setWypozyczenia] = useState([]);

  const [loading, setLoading] = useState({
    klienci: false,
    samochody: false,
    cennik: false,
    wypozyczenia: false,
  });

  // ---- formularze (admin) ----
  const [formKlient, setFormKlient] = useState({ imie: "", nazwisko: "", telefon: "" });
  const [formDane, setFormDane] = useState({
    id_klienta: "",
    ulica: "",
    kod_pocztowy: "",
    miasto: "",
    email: "",
    zgoda_marketingowa: false,
  });

  const [formSam, setFormSam] = useState({
    marka: "",
    model: "",
    typ_samochodu: "",
    numer_rejestracyjny: "",
    cena_bazowa: "",
    dostepnosc: "available",
  });

  const [formCennik, setFormCennik] = useState({
    id_samochodu: "",
    sezon: "",
    mnoznik_ceny: "1.0",
    data_od: "",
    data_do: "",
  });

  const [formRez, setFormRez] = useState({
    id_klienta: "",
    id_samochodu: "",
    data_od: "",
    data_do: "",
  });

  const [rezultat, setRezultat] = useState(null);

  // ---- widok klienta: sprawdzanie terminu ----
  const [checkCarId, setCheckCarId] = useState("");
  const [checkFrom, setCheckFrom] = useState("");
  const [checkTo, setCheckTo] = useState("");

  // ---- fetch ----
  async function fetchKlienci() {
    setLoading((s) => ({ ...s, klienci: true }));
    try {
      setKlienci(await api("/klienci"));
    } catch (e) {
      toastShow("error", `Błąd klientów: ${e.message}`);
    } finally {
      setLoading((s) => ({ ...s, klienci: false }));
    }
  }

  async function fetchSamochody() {
    setLoading((s) => ({ ...s, samochody: true }));
    try {
      setSamochody(await api("/samochody"));
    } catch (e) {
      toastShow("error", `Błąd samochodów: ${e.message}`);
    } finally {
      setLoading((s) => ({ ...s, samochody: false }));
    }
  }

  async function fetchCennik() {
    setLoading((s) => ({ ...s, cennik: true }));
    try {
      setCennik(await api("/cennik"));
    } catch (e) {
      toastShow("error", `Błąd cennika: ${e.message}`);
    } finally {
      setLoading((s) => ({ ...s, cennik: false }));
    }
  }

  async function fetchWypozyczenia() {
    setLoading((s) => ({ ...s, wypozyczenia: true }));
    try {
      setWypozyczenia(await api("/wypozyczenia"));
    } catch (e) {
      toastShow("error", `Błąd wypożyczeń: ${e.message}`);
    } finally {
      setLoading((s) => ({ ...s, wypozyczenia: false }));
    }
  }

  async function refreshAll() {
    await Promise.all([fetchKlienci(), fetchSamochody(), fetchCennik(), fetchWypozyczenia()]);
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- admin actions ----
  async function addKlient(e) {
    e.preventDefault();
    if (!formKlient.imie.trim() || !formKlient.nazwisko.trim()) {
      toastShow("warn", "Podaj imię i nazwisko.");
      return;
    }
    try {
      await api("/klienci", { method: "POST", body: formKlient });
      setFormKlient({ imie: "", nazwisko: "", telefon: "" });
      await fetchKlienci();
      toastShow("ok", "Dodano klienta ✅");
    } catch (e2) {
      toastShow("error", `Błąd dodawania klienta: ${e2.message}`);
    }
  }

  async function saveDaneKlienta(e) {
    e.preventDefault();
    if (!formDane.id_klienta) {
      toastShow("warn", "Wybierz klienta.");
      return;
    }
    try {
      const { id_klienta, ...payload } = formDane;
      await api(`/klienci/${id_klienta}/dane`, { method: "POST", body: payload });
      toastShow("ok", "Zapisano dane klienta ✅");
      await fetchKlienci();
    } catch (e2) {
      toastShow("error", `Błąd zapisu danych: ${e2.message}`);
    }
  }

  async function addSamochod(e) {
    e.preventDefault();
    const { marka, model, typ_samochodu, numer_rejestracyjny, cena_bazowa } = formSam;
    if (!marka || !model || !typ_samochodu || !numer_rejestracyjny || !cena_bazowa) {
      toastShow("warn", "Uzupełnij wszystkie pola samochodu.");
      return;
    }
    try {
      await api("/samochody", {
        method: "POST",
        body: { ...formSam, cena_bazowa: Number(formSam.cena_bazowa) },
      });
      setFormSam({
        marka: "",
        model: "",
        typ_samochodu: "",
        numer_rejestracyjny: "",
        cena_bazowa: "",
        dostepnosc: "available",
      });
      await fetchSamochody();
      toastShow("ok", "Dodano samochód ✅");
    } catch (e2) {
      toastShow("error", `Błąd dodawania samochodu: ${e2.message}`);
    }
  }

  async function addCennik(e) {
    e.preventDefault();
    const { id_samochodu, sezon, mnoznik_ceny, data_od, data_do } = formCennik;
    if (!id_samochodu || !sezon || !mnoznik_ceny || !data_od || !data_do) {
      toastShow("warn", "Uzupełnij wszystkie pola cennika.");
      return;
    }
    try {
      await api("/cennik", {
        method: "POST",
        body: {
          id_samochodu: Number(id_samochodu),
          sezon,
          mnoznik_ceny: Number(mnoznik_ceny),
          data_od,
          data_do,
        },
      });
      setFormCennik({ id_samochodu: "", sezon: "", mnoznik_ceny: "1.0", data_od: "", data_do: "" });
      await fetchCennik();
      toastShow("ok", "Dodano regułę cennika ✅");
    } catch (e2) {
      toastShow("error", `Błąd dodawania cennika: ${e2.message}`);
    }
  }

  async function rezerwuj(e) {
    e.preventDefault();
    setRezultat(null);
    const { id_klienta, id_samochodu, data_od, data_do } = formRez;
    if (!id_klienta || !id_samochodu || !data_od || !data_do) {
      toastShow("warn", "Uzupełnij wszystkie pola rezerwacji.");
      return;
    }
    try {
      const data = await api("/wypozyczenia/rezerwacja", {
        method: "POST",
        body: {
          id_klienta: Number(id_klienta),
          id_samochodu: Number(id_samochodu),
          data_od,
          data_do,
        },
      });
      setRezultat(data);
      await fetchWypozyczenia();
      toastShow("ok", "Utworzono rezerwację ✅");
      setSection("rezerwacje");
      setMode("historia");
    } catch (e2) {
      toastShow("error", `Błąd rezerwacji: ${e2.message}`);
    }
  }

  async function actionStatus(id, typ) {
    try {
      await api(`/wypozyczenia/${id}/${typ}`, { method: "POST" });
      await fetchWypozyczenia();
      toastShow("ok", "Zmieniono status ✅");
    } catch (e2) {
      toastShow("error", `Błąd zmiany statusu: ${e2.message}`);
    }
  }

  function askDelete({ title, desc, onYes }) {
    setConfirm({ title, desc, onYes });
  }

  async function deleteKlient(id) {
    try {
      await api(`/klienci/${id}`, { method: "DELETE" });
      await refreshAll();
      toastShow("ok", "Usunięto klienta ✅");
    } catch (e) {
      toastShow("error", `Nie usunięto klienta: ${e.message}`);
    }
  }

  async function deleteSamochod(id) {
    try {
      await api(`/samochody/${id}`, { method: "DELETE" });
      await refreshAll();
      toastShow("ok", "Usunięto samochód ✅");
    } catch (e) {
      toastShow("error", `Nie usunięto samochodu: ${e.message}`);
    }
  }

  // ---- zajęte terminy (do klienta) ----
  const zajeteTerminy = useMemo(() => {
    const map = {};
    wypozyczenia
      .filter((w) => w.status !== "canceled")
      .forEach((w) => {
        if (!map[w.id_samochodu]) map[w.id_samochodu] = [];
        map[w.id_samochodu].push({ od: w.data_od, do: w.data_do, status: w.status });
      });
    return map;
  }, [wypozyczenia]);

  // klient: wynik sprawdzania
  const checkResult = useMemo(() => {
    if (!checkCarId || !checkFrom || !checkTo) return null;
    if (checkTo < checkFrom) return { ok: false, msg: "Data do nie może być wcześniejsza niż data od." };

    const carId = Number(checkCarId);
    const intervals = zajeteTerminy[carId] || [];
    const busy = intervals.some((t) => overlaps(checkFrom, checkTo, t.od, t.do));
    return busy
      ? { ok: false, msg: "Termin ZAJĘTY ❌ (koliduje z rezerwacją)" }
      : { ok: true, msg: "Termin WOLNY ✅" };
  }, [checkCarId, checkFrom, checkTo, zajeteTerminy]);

  // layout: klient ma pełną szerokość (bez sidebaru)
  const layoutStyle = view === "admin" ? S.layoutAdmin : S.layoutClient;

  return (
    <div style={S.page}>
      <Topbar view={view} setView={setView} onRefresh={refreshAll} />

      {toast && <Toast type={toast.type} text={toast.text} />}

      <div style={layoutStyle}>
        {view === "admin" ? (
          <>
            <aside style={S.sidebar}>
              <div style={S.sideTitle}>Panel pracownika</div>

              <SideButton active={section === "klienci"} onClick={() => (setSection("klienci"), setMode("historia"))}>
                Klienci
              </SideButton>
              <SideButton active={section === "samochody"} onClick={() => (setSection("samochody"), setMode("historia"))}>
                Samochody
              </SideButton>
              <SideButton active={section === "rezerwacje"} onClick={() => (setSection("rezerwacje"), setMode("historia"))}>
                Rezerwacje
              </SideButton>
              <SideButton active={section === "cennik"} onClick={() => (setSection("cennik"), setMode("historia"))}>
                Cennik
              </SideButton>

            </aside>

            <main style={S.main}>
              <SectionHeader title={titleFor(section)} mode={mode} setMode={setMode} />

              {/* KLIENCI */}
              {section === "klienci" && (
                mode === "dodaj" ? (
                  <div style={S.grid2}>
                    <Card title="Dodaj klienta">
                      <form onSubmit={addKlient} style={S.form}>
                        <div style={S.row3}>
                          <Field label="Imię">
                            <input style={S.input} value={formKlient.imie} onChange={(e) => setFormKlient({ ...formKlient, imie: e.target.value })} />
                          </Field>
                          <Field label="Nazwisko">
                            <input style={S.input} value={formKlient.nazwisko} onChange={(e) => setFormKlient({ ...formKlient, nazwisko: e.target.value })} />
                          </Field>
                          <Field label="Telefon">
                            <input style={S.input} value={formKlient.telefon} onChange={(e) => setFormKlient({ ...formKlient, telefon: e.target.value })} />
                          </Field>
                        </div>
                        <div style={S.actionsRight}>
                          <button style={{ ...S.btn, ...S.btnPrimary }} type="submit">Dodaj klienta</button>
                        </div>
                      </form>
                    </Card>

                    <Card title="Dane klienta " subtitle="Upsert: zapisuje lub aktualizuje rekord">
                      <form onSubmit={saveDaneKlienta} style={S.form}>
                        <div style={S.row2}>
                          <Field label="Klient">
                            <select style={S.input} value={formDane.id_klienta} onChange={(e) => setFormDane({ ...formDane, id_klienta: e.target.value })}>
                              <option value="">-- wybierz --</option>
                              {klienci.map((k) => (
                                <option key={k.id_klienta} value={k.id_klienta}>
                                  {k.id_klienta}: {k.imie} {k.nazwisko}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Field label="Email">
                            <input style={S.input} type="email" value={formDane.email} onChange={(e) => setFormDane({ ...formDane, email: e.target.value })} />
                          </Field>
                        </div>

                        <div style={S.row3}>
                          <Field label="Ulica">
                            <input style={S.input} value={formDane.ulica} onChange={(e) => setFormDane({ ...formDane, ulica: e.target.value })} />
                          </Field>
                          <Field label="Kod pocztowy">
                            <input style={S.input} value={formDane.kod_pocztowy} onChange={(e) => setFormDane({ ...formDane, kod_pocztowy: e.target.value })} />
                          </Field>
                          <Field label="Miasto">
                            <input style={S.input} value={formDane.miasto} onChange={(e) => setFormDane({ ...formDane, miasto: e.target.value })} />
                          </Field>
                        </div>

                        <label style={S.checkbox}>
                          <input type="checkbox" checked={formDane.zgoda_marketingowa} onChange={(e) => setFormDane({ ...formDane, zgoda_marketingowa: e.target.checked })} />
                          <span>Zgoda marketingowa</span>
                        </label>

                        <div style={S.actionsRight}>
                          <button style={{ ...S.btn, ...S.btnPrimary }} type="submit">Zapisz dane</button>
                        </div>
                      </form>
                    </Card>
                  </div>
                ) : (
                  <Card title="Historia klientów" subtitle="Lista + usuwanie">
                    {loading.klienci ? (
                      <Skeleton />
                    ) : klienci.length === 0 ? (
                      <Empty text="Brak klientów." />
                    ) : (
                      <Table
  head={[
    "ID",
    "Imię",
    "Nazwisko",
    "Telefon",
    "Email",
    "Ulica",
    "Kod pocztowy",
    "Miasto",
    "Zgoda marketingowa",
    "Akcje",
  ]}
  rows={klienci.map((k) => [
    k.id_klienta,
    k.imie,
    k.nazwisko,
    k.telefon || "-",
    k.email || "-",
    k.ulica || "-",
    k.kod_pocztowy || "-",
    k.miasto || "-",
    k.zgoda_marketingowa ? "TAK" : "NIE",
    <div style={S.rowActions} key={`k${k.id_klienta}`}>
      <button
        style={{ ...S.btn, ...S.btnDanger }}
        onClick={() =>
          askDelete({
            title: `Usuń klienta #${k.id_klienta}?`,
            desc: "Jeśli klient ma wypożyczenia w historii, backend zablokuje usunięcie.",
            onYes: () => deleteKlient(k.id_klienta),
          })
        }
        type="button"
      >
        Usuń
      </button>
    </div>,
  ])}
/>
                    )}
                  </Card>
                )
              )}

              {/* SAMOCHODY */}
              {section === "samochody" && (
                mode === "dodaj" ? (
                  <Card title="Dodaj samochód">
                    <form onSubmit={addSamochod} style={S.form}>
                      <div style={S.row3}>
                        <Field label="Marka">
                          <input style={S.input} value={formSam.marka} onChange={(e) => setFormSam({ ...formSam, marka: e.target.value })} />
                        </Field>
                        <Field label="Model">
                          <input style={S.input} value={formSam.model} onChange={(e) => setFormSam({ ...formSam, model: e.target.value })} />
                        </Field>
                        <Field label="Typ">
                          <input style={S.input} value={formSam.typ_samochodu} onChange={(e) => setFormSam({ ...formSam, typ_samochodu: e.target.value })} />
                        </Field>
                      </div>

                      <div style={S.row3}>
                        <Field label="Rejestracja">
                          <input style={S.input} value={formSam.numer_rejestracyjny} onChange={(e) => setFormSam({ ...formSam, numer_rejestracyjny: e.target.value })} />
                        </Field>
                        <Field label="Cena bazowa (PLN/d)">
                          <input style={S.input} type="number" value={formSam.cena_bazowa} onChange={(e) => setFormSam({ ...formSam, cena_bazowa: e.target.value })} />
                        </Field>
                        <Field label="Dostępność">
                          <select style={S.input} value={formSam.dostepnosc} onChange={(e) => setFormSam({ ...formSam, dostepnosc: e.target.value })}>
                            <option value="available">available</option>
                            <option value="unavailable">unavailable</option>
                          </select>
                        </Field>
                      </div>

                      <div style={S.actionsRight}>
                        <button style={{ ...S.btn, ...S.btnPrimary }} type="submit">Dodaj samochód</button>
                      </div>
                    </form>
                  </Card>
                ) : (
                  <Card title="Historia samochodów" subtitle="Lista + usuwanie">
                    {loading.samochody ? (
                      <Skeleton />
                    ) : samochody.length === 0 ? (
                      <Empty text="Brak samochodów." />
                    ) : (
                      <Table
                        head={["ID", "Marka", "Model", "Typ", "Rejestracja", "Cena", "Dostępność", "Akcje"]}
                        rows={samochody.map((s) => [
                          s.id_samochodu, s.marka, s.model, s.typ_samochodu, s.numer_rejestracyjny, s.cena_bazowa, s.dostepnosc,
                          <div style={S.rowActions} key={`s${s.id_samochodu}`}>
                            <button
                              style={{ ...S.btn, ...S.btnDanger }}
                              type="button"
                              onClick={() =>
                                askDelete({
                                  title: `Usunąć samochód #${s.id_samochodu}?`,
                                  desc: "Backend zablokuje usunięcie jeśli auto było w wypożyczeniach lub ma cennik.",
                                  onYes: () => deleteSamochod(s.id_samochodu),
                                })
                              }
                            >
                              Usuń
                            </button>
                          </div>,
                        ])}
                      />
                    )}
                  </Card>
                )
              )}

              {/* REZERWACJE */}
              {section === "rezerwacje" && (
                mode === "dodaj" ? (
                  <Card title="Nowa rezerwacja / wypożyczenie">
                    <form onSubmit={rezerwuj} style={S.form}>
                      <div style={S.row2}>
                        <Field label="Klient">
                          <select style={S.input} value={formRez.id_klienta} onChange={(e) => setFormRez({ ...formRez, id_klienta: e.target.value })}>
                            <option value="">-- wybierz --</option>
                            {klienci.map((k) => (
                              <option key={k.id_klienta} value={k.id_klienta}>
                                {k.id_klienta}: {k.imie} {k.nazwisko}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field label="Samochód">
                          <select style={S.input} value={formRez.id_samochodu} onChange={(e) => setFormRez({ ...formRez, id_samochodu: e.target.value })}>
                            <option value="">-- wybierz --</option>
                            {samochody.map((s) => (
                              <option key={s.id_samochodu} value={s.id_samochodu}>
                                {s.id_samochodu}: {s.marka} {s.model}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>

                      <div style={S.row3}>
                        <Field label="Data od">
                          <input style={S.input} type="date" value={formRez.data_od} onChange={(e) => setFormRez({ ...formRez, data_od: e.target.value })} />
                        </Field>
                        <Field label="Data do">
                          <input style={S.input} type="date" value={formRez.data_do} onChange={(e) => setFormRez({ ...formRez, data_do: e.target.value })} />
                        </Field>
                        <div style={{ display: "flex", alignItems: "flex-end" }}>
                          <button style={{ ...S.btn, ...S.btnPrimary, width: "100%" }} type="submit">Zarezerwuj</button>
                        </div>
                      </div>
                    </form>

                    {rezultat && (
                      <div style={S.resultBox}>
                        Utworzono wypożyczenie ID: <b>{rezultat.id_wypozyczenia}</b>
                      </div>
                    )}
                  </Card>
                ) : (
                  <Card title="Historia wypożyczeń" subtitle="Lista + start/koniec/anuluj">
                    {loading.wypozyczenia ? (
                      <Skeleton />
                    ) : wypozyczenia.length === 0 ? (
                      <Empty text="Brak wypożyczeń." />
                    ) : (
                      <div style={S.list}>
                        {wypozyczenia.map((w) => (
                          <div key={w.id_wypozyczenia} style={S.rentalRow}>
                            <div>
                              <div style={S.rentalTitle}>#{w.id_wypozyczenia} • {w.marka} {w.model}</div>
                              <div style={S.rentalMeta}>
                                Klient: {w.imie} {w.nazwisko} • {w.data_od} → {w.data_do} • status: <b>{w.status}</b>
                              </div>
                              <div style={S.rentalMeta}>
                                Cena dzienna: {w.cena_dzienna} PLN • koszt: {w.koszt_calkowity} PLN
                              </div>
                            </div>

                            <div style={S.rentalBtns}>
                              <button style={S.btn} type="button" onClick={() => actionStatus(w.id_wypozyczenia, "start")}>Start</button>
                              <button style={S.btn} type="button" onClick={() => actionStatus(w.id_wypozyczenia, "koniec")}>Koniec</button>
                              <button style={{ ...S.btn, ...S.btnDanger }} type="button" onClick={() => actionStatus(w.id_wypozyczenia, "anuluj")}>Anuluj</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                )
              )}

              {/* CENNIK */}
              {section === "cennik" && (
                mode === "dodaj" ? (
                  <Card title="Dodaj regułę cennika">
                    <form onSubmit={addCennik} style={S.form}>
                      <div style={S.row2}>
                        <Field label="Samochód">
                          <select style={S.input} value={formCennik.id_samochodu} onChange={(e) => setFormCennik({ ...formCennik, id_samochodu: e.target.value })}>
                            <option value="">-- wybierz --</option>
                            {samochody.map((s) => (
                              <option key={s.id_samochodu} value={s.id_samochodu}>
                                {s.id_samochodu}: {s.marka} {s.model}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Sezon">
                          <input style={S.input} value={formCennik.sezon} onChange={(e) => setFormCennik({ ...formCennik, sezon: e.target.value })} />
                        </Field>
                      </div>

                      <div style={S.row3}>
                        <Field label="Mnożnik">
                          <input style={S.input} type="number" value={formCennik.mnoznik_ceny} onChange={(e) => setFormCennik({ ...formCennik, mnoznik_ceny: e.target.value })} />
                        </Field>
                        <Field label="Data od">
                          <input style={S.input} type="date" value={formCennik.data_od} onChange={(e) => setFormCennik({ ...formCennik, data_od: e.target.value })} />
                        </Field>
                        <Field label="Data do">
                          <input style={S.input} type="date" value={formCennik.data_do} onChange={(e) => setFormCennik({ ...formCennik, data_do: e.target.value })} />
                        </Field>
                      </div>

                      <div style={S.actionsRight}>
                        <button style={{ ...S.btn, ...S.btnPrimary }} type="submit">Dodaj regułę</button>
                      </div>
                    </form>
                  </Card>
                ) : (
                  <Card title="Historia cennika" subtitle="Lista reguł">
                    {loading.cennik ? (
                      <Skeleton />
                    ) : cennik.length === 0 ? (
                      <Empty text="Brak reguł cennika." />
                    ) : (
                      <Table
                        head={["ID", "Auto", "Sezon", "Mnożnik", "Od", "Do"]}
                        rows={cennik.map((c) => [
                          c.id_cennika,
                          `${c.id_samochodu} (${c.marka} ${c.model})`,
                          c.sezon,
                          c.mnoznik_ceny,
                          c.data_od,
                          c.data_do,
                        ])}
                      />
                    )}
                  </Card>
                )
              )}
            </main>
          </>
        ) : (
          // ---------------- CLIENT VIEW (TYLKO SAMOCHODY + SPRAWDZ TERMIN) ----------------
          <main style={S.main}>
            <div style={S.clientHeader}>
              <div>
                <div style={S.sectionTitle}>Widok klienta</div>
                <div style={S.sectionSub}>Przegląd aut oraz sprawdzanie dostępności terminu.</div>
              </div>
            </div>

            <div style={S.grid2}>
              <Card title="Sprawdź dostępność terminu" subtitle="Wybierz auto i daty — pokażemy czy termin jest wolny">
                <div style={S.form}>
                  <div style={S.row2}>
                    <Field label="Samochód">
                      <select style={S.input} value={checkCarId} onChange={(e) => setCheckCarId(e.target.value)}>
                        <option value="">-- wybierz --</option>
                        {samochody.map((s) => (
                          <option key={s.id_samochodu} value={s.id_samochodu}>
                            {s.id_samochodu}: {s.marka} {s.model}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div />
                  </div>

                  <div style={S.row2}>
                    <Field label="Data od">
                      <input style={S.input} type="date" value={checkFrom} onChange={(e) => setCheckFrom(e.target.value)} />
                    </Field>
                    <Field label="Data do">
                      <input style={S.input} type="date" value={checkTo} onChange={(e) => setCheckTo(e.target.value)} />
                    </Field>
                  </div>

                  {checkResult && (
                    <div
                      style={{
                        ...S.resultBox,
                        border: checkResult.ok ? "1px solid rgba(34,197,94,0.35)" : "1px solid rgba(239,68,68,0.45)",
                        background: checkResult.ok ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
                      }}
                    >
                      {checkResult.msg}
                    </div>
                  )}
                </div>
              </Card>

              <Card title="Samochody" subtitle="Lista aut">
                {samochody.length === 0 ? (
                  <Empty text="Brak samochodów." />
                ) : (
                  <div style={S.cards}>
                    {samochody.map((s) => (
                      <div key={s.id_samochodu} style={S.carCard}>
                        <div style={S.carTop}>
                          <div style={S.carName}>#{s.id_samochodu} • {s.marka} {s.model}</div>
                          <span style={badge(s.dostepnosc)}>{s.dostepnosc}</span>
                        </div>
                        <div style={S.carMeta}>Typ: {s.typ_samochodu}</div>
                        <div style={S.carMeta}>Rejestracja: {s.numer_rejestracyjny}</div>
                        <div style={S.carMeta}>Cena bazowa: {s.cena_bazowa} PLN/doba</div>

                        <Divider />

                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </main>
        )}
      </div>

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          desc={confirm.desc}
          onNo={() => setConfirm(null)}
          onYes={async () => {
            setConfirm(null);
            await confirm.onYes();
          }}
        />
      )}
    </div>
  );
}

/* -------------------- Helpers -------------------- */

function titleFor(section) {
  switch (section) {
    case "klienci":
      return "Klienci";
    case "samochody":
      return "Samochody";
    case "rezerwacje":
      return "Rezerwacje";
    case "cennik":
      return "Cennik";
    default:
      return "Panel";
  }
}

/* -------------------- UI Components -------------------- */

function Topbar({ view, setView, onRefresh }) {
  return (
    <header style={S.topbar}>
      <div style={S.brand}>
        <div style={S.logo}>🦆</div>
        <div>
          <div style={S.h1}>Kaczy Wicher</div>
          <div style={S.sub}>Wypożyczalnia samochodowa</div>
        </div>
      </div>

      <div style={S.topActions}>
        <button style={{ ...S.btn, ...(view === "admin" ? S.btnPrimary : null) }} onClick={() => setView("admin")}>
          Panel pracownika
        </button>
        <button style={{ ...S.btn, ...(view === "client" ? S.btnPrimary : null) }} onClick={() => setView("client")}>
          Widok klienta
        </button>
        <button style={S.btn} onClick={onRefresh}>
          Odśwież
        </button>
      </div>
    </header>
  );
}

function SideButton({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{ ...S.sideBtn, ...(active ? S.sideBtnActive : null) }} type="button">
      {children}
    </button>
  );
}

function SectionHeader({ title, mode, setMode }) {
  return (
    <div style={S.sectionHeader}>
      <div>
        <div style={S.sectionTitle}>{title}</div>
        <div style={S.sectionSub}>Wybierz: dodawanie lub historia.</div>
      </div>

      <div style={S.sectionRight}>
        <div style={S.pills}>
          <button style={{ ...S.pill, ...(mode === "dodaj" ? S.pillActive : null) }} onClick={() => setMode("dodaj")} type="button">
            Dodaj
          </button>
          <button style={{ ...S.pill, ...(mode === "historia" ? S.pillActive : null) }} onClick={() => setMode("historia")} type="button">
            Historia
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <section style={S.card}>
      <div style={S.cardHead}>
        <div>
          <div style={S.cardTitle}>{title}</div>
          {subtitle && <div style={S.cardSub}>{subtitle}</div>}
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div style={S.field}>
      <div style={S.label}>{label}</div>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={S.divider} />;
}

function Empty({ text }) {
  return <div style={S.empty}>{text}</div>;
}

function Skeleton() {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={S.skel} />
      <div style={S.skel} />
      <div style={S.skel} />
    </div>
  );
}

function Table({ head, rows }) {
  return (
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} style={S.th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx}>
              {r.map((cell, j) => (
                <td key={j} style={S.td}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Toast({ type, text }) {
  return (
    <div style={{ ...S.toast, ...(type === "ok" ? S.toastOk : type === "warn" ? S.toastWarn : S.toastErr) }}>
      {text}
    </div>
  );
}

function ConfirmModal({ title, desc, onYes, onNo }) {
  return (
    <div style={S.modalBackdrop} onMouseDown={onNo}>
      <div style={S.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div style={S.modalTitle}>{title}</div>
        {desc && <div style={S.modalDesc}>{desc}</div>}
        <div style={S.modalBtns}>
          <button style={S.btn} onClick={onNo}>
            Anuluj
          </button>
          <button style={{ ...S.btn, ...S.btnDanger }} onClick={onYes}>
            Usuń
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Styles -------------------- */

const S = {
  page: {
  minHeight: "100vh",
  width: "100%",
  background: "linear-gradient(180deg, #0b1220 0%, #0b1220 140px, #0f172a 100%)",
  color: "#e5e7eb",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
},

  // layout
  layoutAdmin: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    gap: 12,
    alignItems: "start",
  },
  layoutClient: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
    alignItems: "start",
  },

  sidebar: {
    position: "sticky",
    top: 12,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    padding: 12,
  },
  sideTitle: { fontWeight: 900, marginBottom: 10, opacity: 0.95 },
  sideBtn: {
    width: "100%",
    textAlign: "left",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    color: "#e5e7eb",
    cursor: "pointer",
    fontWeight: 800,
    marginBottom: 8,
  },
  sideBtnActive: {
    background: "linear-gradient(180deg, rgba(59,130,246,0.85), rgba(37,99,235,0.85))",
    border: "1px solid rgba(59,130,246,0.45)",
  },
  sideHint: { marginTop: 10, fontSize: 12, opacity: 0.75, lineHeight: 1.35 },

  main: { minWidth: 0 },

  clientHeader: {
    padding: 12,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    marginBottom: 12,
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    marginBottom: 12,
    padding: 12,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
  },
  sectionTitle: { fontSize: 18, fontWeight: 950 },
  sectionSub: { fontSize: 12, opacity: 0.75, marginTop: 2 },
  sectionRight: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  pills: { display: "flex", gap: 8 },
  pill: {
    padding: "9px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "#e5e7eb",
    fontWeight: 900,
    cursor: "pointer",
  },
  pillActive: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.18)",
  },

  topbar: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    padding: 14,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 18,
    backdropFilter: "blur(10px)",
  },
  brand: { display: "flex", gap: 10, alignItems: "center" },
  logo: {
    width: 42,
    height: 42,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.10)",
    fontSize: 20,
  },
  h1: { fontSize: 20, fontWeight: 900, letterSpacing: 0.2 },
  sub: { fontSize: 13, opacity: 0.8, marginTop: 2 },
  topActions: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },

  grid2: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },

  card: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    padding: 14,
    minWidth: 0,
  },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: 900 },
  cardSub: { fontSize: 13, opacity: 0.8, marginTop: 2 },

  form: { display: "grid", gap: 10 },
  field: { display: "grid", gap: 6 },
  label: { fontSize: 12, opacity: 0.8 },
  input: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(0,0,0,0.25)",
    color: "#e5e7eb",
    outline: "none",
  },

  row2: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 },
  row3: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 },

  checkbox: { display: "flex", gap: 10, alignItems: "center", opacity: 0.9 },

  actionsRight: { display: "flex", justifyContent: "flex-end", gap: 8 },

  btn: {
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.06)",
    color: "#e5e7eb",
    cursor: "pointer",
    fontWeight: 700,
  },
  btnPrimary: {
    background: "linear-gradient(180deg, rgba(59,130,246,0.85), rgba(37,99,235,0.85))",
    border: "1px solid rgba(59,130,246,0.45)",
  },
  btnDanger: {
    background: "linear-gradient(180deg, rgba(239,68,68,0.85), rgba(220,38,38,0.85))",
    border: "1px solid rgba(239,68,68,0.45)",
  },

  divider: { height: 1, background: "rgba(255,255,255,0.08)", margin: "12px 0" },

  empty: {
    padding: 12,
    borderRadius: 14,
    background: "rgba(0,0,0,0.18)",
    border: "1px dashed rgba(255,255,255,0.12)",
    opacity: 0.85,
  },

  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0 },
  th: {
    textAlign: "left",
    fontSize: 12,
    opacity: 0.85,
    padding: "10px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
  },
  td: {
    padding: "10px 10px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    verticalAlign: "top",
    fontSize: 14,
  },

  rowActions: { display: "flex", gap: 8, justifyContent: "flex-end" },

  list: { display: "grid", gap: 10 },
  rentalRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.18)",
  },
  rentalTitle: { fontWeight: 900 },
  rentalMeta: { fontSize: 13, opacity: 0.85, marginTop: 2 },
  rentalBtns: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" },

  resultBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    border: "1px solid rgba(34,197,94,0.35)",
    background: "rgba(34,197,94,0.12)",
    fontWeight: 800,
  },

  cards: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
  carCard: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.18)",
    padding: 14,
  },
  carTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  carName: { fontWeight: 900 },
  carMeta: { fontSize: 13, opacity: 0.85, marginTop: 4 },

  ul: { margin: 0, paddingLeft: 18, opacity: 0.9 },
  li: { marginBottom: 4 },

  toast: {
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.35)",
    fontWeight: 700,
  },
  toastOk: { border: "1px solid rgba(34,197,94,0.40)" },
  toastWarn: { border: "1px solid rgba(234,179,8,0.45)" },
  toastErr: { border: "1px solid rgba(239,68,68,0.45)" },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.55)",
    display: "grid",
    placeItems: "center",
    padding: 16,
  },
  modal: {
    width: "min(520px, 100%)",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(15,23,42,0.92)",
    padding: 16,
  },
  modalTitle: { fontWeight: 900, fontSize: 16 },
  modalDesc: { marginTop: 8, opacity: 0.85, lineHeight: 1.35 },
  modalBtns: { marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 8 },

  skel: {
    height: 16,
    borderRadius: 12,
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.05)",
  },
};

function badge(status) {
  const base = {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    textTransform: "lowercase",
  };
  if (status === "available") {
    return { ...base, border: "1px solid rgba(34,197,94,0.35)", background: "rgba(34,197,94,0.12)" };
  }
  return { ...base, border: "1px solid rgba(234,179,8,0.35)", background: "rgba(234,179,8,0.12)" };
}
