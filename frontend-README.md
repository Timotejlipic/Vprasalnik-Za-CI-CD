# Dokumentacija Sprednjega Dela (Frontend Documentation)

Ta dokument vsebuje celovito tehnično dokumentacijo za sprednji del (frontend) aplikacije **Trezor zrelosti CI/CD (MaturityVault)**. Aplikacija je zgrajena kot sodobna enostranska spletna aplikacija (SPA) z uporabo knjižnice React in orodja Vite.

---

## Tehnološki Sklad (Tech Stack)

Aplikacija se opira na naslednje tehnologije:
1. **React 19**: Deklarativna knjižnica za izgradnjo uporabniških vmesnikov.
2. **Vite**: Hitro orodje za razvoj in gradnjo spletnih aplikacij.
3. **TailwindCSS v4**: Sodobno utility-first CSS ogrodje, integrirano neposredno v Vite preko `@tailwindcss/vite` vtičnika za hitro in učinkovito stilizacijo.
4. **Vanilla CSS (in CSS spremenljivke)**: Za definicijo krovnega oblikovnega sistema in podporo tematskim prehodom.
5. **Fetch API**: Za sinhrono/asinhrono komunikacijo z zalednim C++ strežnikom.
6. **LocalStorage**: Uporablja se za predpomnjenje podatkov in kot rezervni sistem (offline fallback), ko zaledni strežnik ni dosegljiv.

---

## Pregled Mape `src` (Directory Structure)

```text
src/
├── api.js                # API odjemalec za komunikacijo z zalednim strežnikom
├── App.jsx               # Glavna komponenta, usmerjevalnik pogledov in globalna stanja
├── data.js               # Privzeti testni podatki in modeli (fallback)
├── main.jsx              # Vstopna točka za React aplikacijo
├── style.css             # Celotna CSS stilizacija aplikacije, Tailwind uvozi in oblikovni sistem s spremenljivkami
├── utils.js              # Pomožne funkcije (evalvacija zrelosti, pretvorbe podatkov)
└── components/           # Komponente uporabniškega vmesnika
    ├── AdminDashboard.jsx    # Nadzorna plošča za administratorje (uporabniki, skupine, dodelitve)
    ├── Assessment1.jsx       # Standardni enostranski vprašalnik za oceno
    ├── Assessment4.jsx       # Napreden, drevesno strukturiran vprašalnik
    ├── AssessmentWrapper.jsx # Ovoj za dinamično preklapljanje med različicami vprašalnikov
    ├── Builder.jsx           # Urejevalnik vprašalnikov (Form Builder)
    ├── Collapsible.jsx       # Pomožna komponenta za zložljive elemente v vprašalniku
    ├── Dashboard.jsx         # Glavna nadzorna plošča (seznam cevovodov, grafi, sinhronizacija)
    ├── GitHubYamlViewer.jsx  # Prikaz in statična analiza GitHub Actions YAML konfiguracij
    ├── Header.jsx            # Glavna vrhnja navigacija s profilom, preklopom teme in stikalom za stransko vrstico
    ├── LandingPage.jsx       # Prijavno-registracijska stran z obrazci
    ├── ResultsPanel.jsx      # Podroben prikaz rezultatov ocene z napotki za izboljšavo
    ├── Rules.jsx             # Urejevalnik pravil zrelosti (Rules Manager)
    ├── Sidebar.jsx           # Stranska vrstica za preklapljanje med pogledi
    └── UserAssessments.jsx   # Pogled za navadne uporabnike (seznam dodeljenih nalog za oceno)
```

---

## Opis Ključnih Komponent (Component Details)

### 1. `App.jsx`
Glaven del aplikacije. Upravlja naslednje naloge:
* **Globalna stanja**: Seznam cevovodov, kategorij, pravil, aktivnega uporabnika, varnostnih žetonov (JWT) in trenutnega pogleda (`currentView`).
* **Usmerjevalnik (Routing)**: Preklaplja med prijavnim zaslonom in glavnim delom aplikacije ter dinamično izrisuje ustrezen pogled glede na izbrano možnost v stranski vrstici.
* **Globalni Custom Alert**: Vsebuje preglasan `window.alert` mehanizem, ki namesto privzetega brskalniškega opozorila prikaže vrhunsko oblikovano modalno okno z ustreznim kontekstom (Uspeh/Napaka).
* **Samodejna prijava iz vabila**: Ob zagonu analizira URL parametre (`invite_email`, `set_password`, `repos`, `groups`) in samodejno vodi uporabnika skozi ustrezen tok (npr. nastavitev gesla ob prejetem vabilu).

### 2. `LandingPage.jsx`
Prvi zaslon, ki ga vidi neprijavljen uporabnik. Ponuja:
* Prijava uporabnika (`username`/`password`).
* Registracija novega računa.
* Stran za nastavitev gesla (sproži se prek unikatne povezave iz vabila).
* Možnost vstopa kao gost (guest mode) z omejenimi pravicami branja.

### 3. `Dashboard.jsx`
Osrednja stran za pregled zrelosti cevovodov. Vključuje:
* Vizualni graf s povprečnimi nivoji zrelosti v obliki krožnih indikatorjev (Gauge charts).
* Seznam vseh ocenjenih CI/CD cevovodov s hitrimi informacijami o različici in nivoju zrelosti.
* Iskalnik in filtre za hitro brskanje med projekti.
* **Sinhronizacija**: Administratorjem omogoča posodobitev starejših cevovodov na najnovejšo različico vprašalnika z avtomatskim kreiranjem zgodovinske varnostne kopije.
* **Poenostavljeno Novo Ocenjevanje**: Novo ocenjevanje se zažene preko kompaktnega in preglednega pojavnega okna, ki omogoča enostaven in čist izbiro različnih verzij vprašalnikov ter pravil zrelosti s pomočjo select dropdown elementov.

### 4. `AdminDashboard.jsx`
Nadzorna plošča za upravljanje sistema (samo za administratorje):
* **Upravljanje uporabnikov**: Ustvarjanje, urejanje vlog (admin/user) in brisanje uporabnikov.
* **Upravljanje skupin**: Ustvarjanje razvojnih skupin/timov.
* **Dodeljevanje ocen**: Možnost dodelitve specifičnega repozitorija in skupine določenemu uporabniku z avtomatskim generiranjem unikatne vabilne povezave za reševanje.

### 5. `Builder.jsx` (Form Builder)
Interaktivni urejevalnik strukture vprašalnika.
* Omogoča urejanje kategorij in vprašanj (globina, sortiranje, opisi).
* Podpira različne tipe vprašanj: `checkbox` (potrditveno polje), `yes_no_na` (DA/NE/neveljavno), `text` (tekstovni vnos), `numeric` (število) in `multiselect` (več izbir).
* Možnost uvoza in izvoza celotne strukture v formatu JSON ter shranjevanje novih različic (npr. `1.0`, `2.0`) neposredno v bazo podatkov.
* Gumb **"Izbriši celoten vprašalnik"** omogoča popoln izbris trenutne različice (če ni v uporabi s strani cevovodov).

### 6. `Rules.jsx` (Rules Manager)
Urejevalnik pravil za izračun nivojev zrelosti.
* Administrator lahko določi nivoje zrelosti (od 1 do 5), njihova imena, opise in priporočila za izboljšavo.
* Za vsak nivo se določijo kriteriji na podlagi vprašanj iz vprašalnika z uporabo operatorjev: `=`, `>=`, `>`, `<=`, `<`, ter `includes` (za večkratne izbire).
* Pravila se shranjujejo pod isto različico kot pripadajoči vprašalnik.

### 7. `AssessmentWrapper.jsx` & `Assessment4.jsx`
Vmesnik za reševanje vprašalnika.
* **Assessment4** ponuja napreden dvonivojski drevesni pogled: podkategorije ali vprašanja se prikažejo in postanejo zahtevane le, če je krovna kategorija označena kot prisotna (npr. podrobnosti o testiranju se odprejo šele, ko označete, da sploh izvajate teste).
* Podpira sprotno shranjevanje osnutkov in končno oddajo ocene.

### 8. `ResultsPanel.jsx`
Natančen prikaz rezultatov po oddaji ocene.
* Prikaže dosežen nivo zrelosti (Gauge bar) in statistiko izpolnjenih kriterijev (npr. *manjka še 5 pogojev (1 od 6 izpolnjeno)*).
* Izpiše natančen seznam pogojev, ki niso bili izpolnjeni za dosego višjega nivoja.
* Prikaže prilagojena priporočila za izboljšavo (Improvement Suggestions), ki so bila konfigurirana v Rules Managerju.

---

## Integracija z API-jem in Offline način (API & Offline Flow)

API odjemalec (`src/api.js`) pred vsako zahtevo preveri dosegljivost backend storitve prek klica `/health` z omejenim časovnim oknom (1.5 sekunde):

1. **Online način (Privzeto)**:
   * Podatki se berejo in shranjujejo neposredno v PostgreSQL bazo prek C++ backend API-ja.
   * Vsi klici vsebujejo JWT varnostni žeton v glavi `Authorization: Bearer <token>`.
   * Ob uspešnem klicu se kopija podatkov shrani tudi v `localStorage` brskalnika.

2. **Offline način (Rezervni scenarij)**:
   * Če strežnik ni dosegljiv, se aplikacija ne zruši, temveč samodejno preklopi na branje podatkov iz `localStorage`.
   * Uporabnik lahko še vedno pregleduje vprašalnike in pravila, vendar se shranjevanje novih različic izvaja lokalno v brskalniku do ponovne vzpostavitve povezave.

---

## Tematski in Stilski Sistem (Theming & Styling)

Celoten izgled je definiran v datoteki [style.css](file:///c:/CICDcevovodi/src/style.css) z uporabo CSS spremenljivk, ki so dopolnjene z utility razredi ogrodja TailwindCSS v4. Aplikacija ponuja nemoteno preklapljanje med **temnim** in **svetlim** načinom.

### Dinamično preklapljanje tem (Light / Dark Mode):
Tema se preklaplja preko gumba v glavi spletne strani (`Header.jsx`), ki doda ali odstrani `.light` razred na korenskem elementu dokumenta (`<html>`). Izbrana tema se shranjuje v `localStorage` uporabnika in se ob ponovnem obisku samodejno naloži preko inicializacijskega skripta v `index.html` (s čimer se prepreči vizualni utrip neoblikovane vsebine).

### Ključne barvne spremenljivke:
* **Temni način (Dark Mode - privzeto)**:
  * Ozadje aplikacije (`--bg-main`): `#0d1117`
  * Ozadje panelov (`--panel-bg`): `#161b22`
  * Meje in robovi (`--panel-border`): `#30363d`
  * Akcentna barva (modra): `#58a6ff` (`--accent-color`)
* **Svetli način (Light Mode)**:
  * Ozadje aplikacije (`--bg-main`): `#f6f8fa`
  * Ozadje panelov (`--panel-bg`): `#ffffff`
  * Meje in robovi (`--panel-border`): `#d0d7de`
  * Akcentna barva (modra): `#0969da` (`--accent-color`)

### Stekleni učinek in animacije:
* **Stekleni učinek (Glassmorphism)**: Uporablja se na karticah in modalnih oknih z lastnostjo `backdrop-filter: blur(12px)` in delno prosojnimi obrobami (`--glass-border`).
* **Animacije**:
  * `fadeIn`: Nežna animacija prikaza z rahlim premikom navzgor (preprečuje grobe prehode med zasloni).
  * `pulse`: Uporablja se za poudarjanje aktivnih stanj ali nalaganja.

---

## Zagon in Razvoj (How to Run)

### Lokalni zagon (brez Dockerja)
Za lokalni zagon sprednjega dela potrebujete nameščen **Node.js** (priporočena različica 18 ali novejša).

1. Namestite odvisnosti:
   ```bash
   npm install
   ```
2. Zaženite razvojni strežnik Vite:
   ```bash
   npm run dev
   ```
   Aplikacija bo dosegljiva na naslovu `http://localhost:5173`.

### Zagon prek Dockerja
Sprednji del je konfiguriran za tek znotraj Docker okolja z uporabo dveh stopenj (razvojna vroča sinhronizacija in produkcijski Nginx strežnik).

Za zagon celotnega okolja (sprednji del, zaledni del in PostgreSQL baza) v korenski mapi zaženite:
```bash
docker compose up --build
```
Razvojni vsebnik za frontend samodejno preslika lokalno mapo v `/app`, kar omogoča takojšnje posodabljanje vmesnika ob shranjevanju datotek (Hot Reload).
