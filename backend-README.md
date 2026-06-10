# Dokumentacija Zalednega Dela (Backend Documentation)

Ta dokument opisuje zaledni del aplikacije **Vprašalnik za popisovanje CI/CD cevovodov**.

Backend je napisan v jeziku **C++** in skrbi za komunikacijo med frontend aplikacijo, PostgreSQL bazo podatkov in poslovno logiko sistema. Njegova naloga je obdelava API zahtev, avtentikacija uporabnikov, shranjevanje odgovorov vprašalnika, delo s pravili zrelosti in vračanje podatkov frontendu.

---

## Namen backenda

Backend omogoča:

- prijavo in registracijo uporabnikov,
- preverjanje uporabniške identitete z JWT žetoni,
- komunikacijo s PostgreSQL bazo,
- pridobivanje in shranjevanje vprašalnikov,
- pridobivanje in shranjevanje pravil zrelosti,
- shranjevanje rezultatov ocen CI/CD cevovodov,
- upravljanje uporabnikov, skupin in dodeljenih ocen,
- vračanje podatkov frontend aplikaciji prek REST API poti.

Backend predstavlja glavni logični del aplikacije. Frontend samo prikazuje podatke in omogoča interakcijo, dejanska obdelava podatkov pa se izvaja na backendu.

---

## Tehnološki sklad

Backend uporablja:

- **C++** kot programski jezik,
- **CMake** za konfiguracijo in gradnjo projekta,
- **cpp-httplib** za HTTP strežnik,
- **PostgreSQL** kot relacijsko bazo podatkov,
- **libpq** za povezavo s PostgreSQL bazo,
- **JWT** za avtentikacijo uporabnikov,
- **Docker** za enostaven zagon v kontejnerju.

---

## Struktura backend mape

```text
backend/
│
├── include/
│   └── cicdq/
│       │
│       ├── routes/
│       │   ├── assessment.hpp      # API poti za ocenjevanje CI/CD cevovodov
│       │   ├── assignments.hpp     # API poti za dodelitve uporabnikom
│       │   ├── auth.hpp            # API poti za prijavo, registracijo in avtentikacijo
│       │   ├── categories.hpp      # API poti za kategorije vprašalnika
│       │   ├── pipelines.hpp       # API poti za CI/CD cevovode
│       │   ├── questionnaire.hpp   # API poti za vprašalnike
│       │   └── rules.hpp           # API poti za pravila zrelosti
│       │
│       ├── assessment.hpp          # Logika za obdelavo ocen
│       ├── auth.hpp                # Avtentikacijska logika
│       ├── crypto.hpp              # Pomožne funkcije za varnost, gesla in šifriranje
│       ├── db.hpp                  # Povezava s PostgreSQL bazo
│       ├── jwt.hpp                 # Ustvarjanje in preverjanje JWT žetonov
│       ├── store.hpp               # Glavna plast za delo s podatki
│       └── types.hpp               # Skupni podatkovni tipi in modeli
│
├── src/
│   └── main.cpp                    # Glavna vstopna točka backend strežnika
│
├── .env.example                    # Primer okoljskih spremenljivk
├── CMakeLists.txt                  # CMake konfiguracija projekta
└── vprasalnik.sql                  # SQL struktura oziroma začetni podatki baze
```
---

## Opis ključnih komponent backenda

### 1. `main.cpp`

Datoteka `main.cpp` je glavna vstopna točka backend aplikacije.

Njene glavne naloge so:

- prebere okoljske spremenljivke, kot sta `PORT` in `JWT_SECRET`,
- ustvari HTTP strežnik,
- registrira vse API poti,
- nastavi osnovne sistemske poti, kot je preverjanje delovanja strežnika,
- zažene poslušanje na določenih vratih.

Backend se privzeto zažene na vratih:

```text
3002
```

Primer lokalnega naslova backenda:

```text
http://localhost:3002
```

Ta datoteka je pomembna, ker poveže vse ostale dele backenda v delujočo aplikacijo.

---

### 2. `db.hpp`

Datoteka `db.hpp` skrbi za povezavo s PostgreSQL bazo podatkov.

Njene glavne naloge so:

- vzpostavitev povezave z bazo,
- izvajanje SQL poizvedb,
- preverjanje, ali je baza dosegljiva,
- vračanje rezultatov poizvedb drugim delom aplikacije.

Backend uporablja to komponento vedno, ko mora brati ali zapisovati podatke v bazo.

Primeri podatkov, ki se berejo iz baze:

- uporabniki,
- vprašalniki,
- odgovori,
- CI/CD cevovodi,
- pravila zrelosti,
- rezultati ocen.

Če povezava z bazo ne deluje, backend ne more pravilno delovati.

---

### 3. `store.hpp`

Datoteka `store.hpp` predstavlja podatkovni oziroma servisni sloj backenda.

Njena naloga je, da povezuje API poti z bazo podatkov. Namesto da bi vsaka API pot neposredno izvajala SQL poizvedbe, se logika za delo s podatki združi v tej datoteki.

`store.hpp` skrbi za:

- pridobivanje podatkov iz baze,
- shranjevanje novih podatkov,
- posodabljanje obstoječih podatkov,
- brisanje podatkov,
- pretvorbo podatkov v obliko, ki jo lahko frontend uporabi.

Primeri uporabe:

- ko frontend zahteva seznam vprašalnikov,
- ko uporabnik odda izpolnjen vprašalnik,
- ko administrator spremeni pravila zrelosti,
- ko se shrani rezultat ocene cevovoda.

Ta komponenta je ena najpomembnejših v backendu, ker vsebuje večino povezave med poslovno logiko in bazo.

---

### 4. `types.hpp`

Datoteka `types.hpp` vsebuje skupne podatkovne tipe oziroma modele, ki jih uporablja backend.

V njej so definirane strukture podatkov, ki predstavljajo glavne entitete aplikacije.

Primeri takšnih entitet:

- uporabnik,
- vprašanje,
- kategorija,
- CI/CD cevovod,
- odgovor uporabnika,
- pravilo zrelosti,
- rezultat ocene,
- dodelitev uporabniku.

Namen te datoteke je, da imajo različni deli backenda enoten način predstavljanja podatkov.

Brez tega bi bila koda hitro nepregledna, ker bi vsak del aplikacije podatke predstavljal malo drugače.

---

### 5. `auth.hpp`

Datoteka `auth.hpp` vsebuje logiko za avtentikacijo uporabnikov.

Skrbi za:

- registracijo novih uporabnikov,
- prijavo obstoječih uporabnikov,
- preverjanje uporabniškega imena in gesla,
- preverjanje uporabniških vlog,
- zaščito delov aplikacije, ki so namenjeni samo prijavljenim uporabnikom.

Avtentikacija je pomembna zato, da sistem ve, kdo uporablja aplikacijo in katere pravice ima.

Primer:

- navaden uporabnik lahko izpolnjuje dodeljene vprašalnike,
- administrator lahko upravlja uporabnike, vprašalnike, pravila in dodelitve.

---

### 6. `jwt.hpp`

Datoteka `jwt.hpp` skrbi za ustvarjanje in preverjanje JWT žetonov.

JWT žeton se ustvari ob uspešni prijavi uporabnika. Frontend ta žeton shrani in ga nato pošilja pri zahtevah na backend.

Primer HTTP glave:

```text
Authorization: Bearer <jwt_token>
```

Backend pri zaščitenih poteh preveri:

- ali je žeton prisoten,
- ali je žeton veljaven,
- kateremu uporabniku pripada,
- kakšno vlogo ima uporabnik.

Če žeton ni pravilen ali manjka, backend zahtevo zavrne.

---

### 7. `crypto.hpp`

Datoteka `crypto.hpp` vsebuje pomožne varnostne funkcije.

Uporablja se predvsem pri delu z gesli.

Njene naloge so lahko:

- zgoščevanje gesel,
- preverjanje gesel,
- ustvarjanje varnostnih vrednosti,
- druge pomožne kriptografske operacije.

Gesel se ne sme shranjevati v navadni tekstovni obliki. Če bi sistem shranjeval gesla neposredno kot tekst, bi bila to resna varnostna napaka.

Zato se gesla pred shranjevanjem obdelajo z varnostnimi funkcijami.

---

### 8. `assessment.hpp`

Datoteka `assessment.hpp` vsebuje logiko za ocenjevanje CI/CD cevovodov.

Njena glavna naloga je obdelava odgovorov, ki jih uporabnik poda v vprašalniku.

Skrbi za:

- branje uporabnikovih odgovorov,
- preverjanje izpolnjenih pogojev,
- primerjavo odgovorov s pravili zrelosti,
- izračun dosežene stopnje zrelosti,
- pripravo seznama manjkajočih pogojev za naslednjo stopnjo,
- vračanje rezultatov frontendu.

To je ena izmed ključnih komponent projekta, ker predstavlja glavno dodano vrednost aplikacije.

Aplikacija ni samo obrazec za vprašanja. Njena vrednost je v tem, da iz odgovorov izračuna stopnjo zrelosti CI/CD cevovoda.

---

### 9. `routes/auth.hpp`

Datoteka `routes/auth.hpp` vsebuje API poti za avtentikacijo.

Pokriva funkcionalnosti, kot so:

- registracija uporabnika,
- prijava uporabnika,
- preverjanje prijavljenega uporabnika,
- vračanje podatkov o uporabniku.

Te poti uporablja frontend na prijavni in registracijski strani.

Tipičen potek:

1. uporabnik vpiše uporabniško ime in geslo,
2. frontend pošlje podatke na backend,
3. backend preveri podatke,
4. backend vrne JWT žeton,
5. frontend shrani žeton in uporabnika preusmeri v aplikacijo.

---

### 10. `routes/questionnaire.hpp`

Datoteka `routes/questionnaire.hpp` vsebuje API poti za vprašalnike.

Skrbi za:

- pridobivanje vprašalnikov,
- shranjevanje vprašalnikov,
- urejanje vprašalnikov,
- delo z različicami vprašalnikov,
- uvoz in izvoz strukture vprašalnika.

To datoteko uporablja predvsem administratorski del aplikacije, kjer se ureja struktura vprašalnika.

Uporabljajo jo tudi navadni uporabniki, ko izpolnjujejo vprašalnik, saj frontend potrebuje podatke o vprašanjih in kategorijah.

---

### 11. `routes/categories.hpp`

Datoteka `routes/categories.hpp` vsebuje API poti za kategorije vprašalnika.

Kategorije se uporabljajo za organizacijo vprašanj v smiselne sklope.

Primeri kategorij so lahko:

- build,
- testiranje,
- deployment,
- monitoring,
- varnost,
- rollback postopki.

Ta komponenta omogoča, da vprašalnik ni samo dolg seznam vprašanj, ampak je urejen po področjih CI/CD cevovoda.

---

### 12. `routes/rules.hpp`

Datoteka `routes/rules.hpp` vsebuje API poti za pravila zrelosti.

Pravila zrelosti določajo, kaj mora biti izpolnjeno, da CI/CD cevovod doseže določeno stopnjo zrelosti.

Skrbi za:

- pridobivanje pravil,
- dodajanje novih pravil,
- urejanje obstoječih pravil,
- brisanje pravil,
- povezavo pravil z verzijo vprašalnika.

Primer:

- za nižjo stopnjo zrelosti je dovolj osnovna avtomatska gradnja,
- za višjo stopnjo zrelosti so potrebni avtomatski testi,
- za najvišje stopnje so lahko potrebni dodatni pogoji, kot so deployment strategije, monitoring ali rollback postopki.

Ta del je pomemben, ker določa logiko ocenjevanja.

---

### 13. `routes/pipelines.hpp`

Datoteka `routes/pipelines.hpp` vsebuje API poti za CI/CD cevovode.

CI/CD cevovod predstavlja projekt oziroma repozitorij, ki ga uporabnik ocenjuje.

Skrbi za:

- ustvarjanje novega cevovoda,
- prikaz seznama cevovodov,
- pridobivanje podrobnosti posameznega cevovoda,
- posodabljanje cevovoda,
- brisanje cevovoda.

Frontend uporablja te poti za prikaz nadzorne plošče, kjer uporabnik vidi svoje ocenjene cevovode in rezultate.

---

### 14. `routes/assessment.hpp`

Datoteka `routes/assessment.hpp` vsebuje API poti za oddajo in pregled ocen.

Skrbi za:

- oddajo izpolnjenega vprašalnika,
- shranjevanje odgovorov,
- shranjevanje rezultata,
- pridobivanje obstoječih ocen,
- prikaz rezultatov posameznega cevovoda.

Ta datoteka povezuje frontend vprašalnik z backend logiko za izračun zrelosti.

Tipičen potek:

1. uporabnik izpolni vprašalnik,
2. frontend pošlje odgovore na backend,
3. backend odgovore obdela,
4. sistem izračuna stopnjo zrelosti,
5. rezultat se shrani v bazo,
6. frontend uporabniku prikaže rezultat.

---

### 15. `routes/assignments.hpp`

Datoteka `routes/assignments.hpp` vsebuje API poti za dodelitve uporabnikom.

Namenjena je predvsem administratorjem.

Administrator lahko uporabniku dodeli:

- določen repozitorij,
- določen CI/CD cevovod,
- vprašalnik, ki ga mora izpolniti,
- skupino oziroma razvojni tim.

Ta komponenta omogoča organizirano delo z več uporabniki, kjer vsak uporabnik ne ocenjuje nujno vseh cevovodov, ampak samo tiste, ki so mu dodeljeni.

---

### 16. `.env.example`

Datoteka `.env.example` prikazuje primer okoljskih spremenljivk, ki jih backend potrebuje za delovanje.

V njej so običajno navedeni:

- vrata backenda,
- JWT skrivnost,
- podatki za povezavo z bazo,
- naslov frontenda,
- druge konfiguracijske vrednosti.

Primer:

```env
PORT=3002
JWT_SECRET=dev_secret_change_in_prod
DB_HOST=db
DB_PORT=5432
DB_NAME=vprasalnik
DB_USER=postgres
DB_PASSWORD=postgres
```

Ta datoteka se ne uporablja neposredno kot konfiguracija, ampak služi kot predloga.

Običajno se iz nje naredi datoteka `.env`, kjer so dejanske nastavitve okolja.

---

### 17. `CMakeLists.txt`

Datoteka `CMakeLists.txt` vsebuje navodila za gradnjo C++ backend projekta.

CMake jo uporablja za:

- določanje imena projekta,
- nastavitev C++ standarda,
- vključevanje header datotek,
- povezovanje zunanjih knjižnic,
- ustvarjanje izvršljive datoteke.

Brez pravilno nastavljene `CMakeLists.txt` datoteke backend ne bo mogoče prevesti.

---

### 18. `vprasalnik.sql`

Datoteka `vprasalnik.sql` vsebuje SQL ukaze za pripravo baze podatkov.

Lahko vsebuje:

- ustvarjanje tabel,
- začetne podatke,
- osnovne uporabnike,
- začetne kategorije,
- začetna vprašanja,
- začetna pravila zrelosti.

Pri Docker zagonu se ta datoteka lahko uporabi za avtomatsko inicializacijo baze.

Če se baza izbriše in ponovno ustvari, se lahko s to datoteko vzpostavi začetno stanje aplikacije.

---

## Povzetek ključnih komponent

Backend je sestavljen iz več jasno ločenih delov:

- `main.cpp` za zagon strežnika,
- `db.hpp` za povezavo z bazo,
- `store.hpp` za delo s podatki,
- `auth.hpp` in `jwt.hpp` za prijavo in varnost,
- `crypto.hpp` za varno obdelavo gesel,
- `assessment.hpp` za izračun zrelosti,
- `routes/` datoteke za posamezne API skupine,
- `types.hpp` za skupne podatkovne modele,
- `CMakeLists.txt` za gradnjo projekta,
- `vprasalnik.sql` za pripravo baze.

Takšna struktura omogoča, da je backend bolj pregleden, lažje vzdrževan in ločen po odgovornostih.