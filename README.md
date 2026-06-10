# Vprašalnik za popisovanje CI/CD cevovodov

## Namen projekta

Projekt je spletna aplikacija za strukturirano popisovanje CI/CD cevovodov in izračun njihove stopnje zrelosti.

Uporabnik za posamezen CI/CD cevovod izpolni vprašalnik, v katerem označi, katere aktivnosti cevovod vključuje, kako so te aktivnosti implementirane in kateri dodatni pogoji so izpolnjeni. Na podlagi odgovorov sistem izračuna stopnjo zrelosti cevovoda in uporabniku prikaže, katere zahteve so že izpolnjene ter kaj manjka za doseganje naslednje stopnje zrelosti.

Aplikacija je namenjena lažjemu pregledu, dokumentiranju in izboljševanju CI/CD procesov.

---

## Uporabniki

Aplikacija je namenjena:

- razvijalcem programske opreme,
- DevOps ekipam,
- vodjem projektov,
- administratorjem sistema,
- študentom in profesorjem pri analizi CI/CD cevovodov.

V aplikaciji obstajata dve glavni vlogi:

- **navaden uporabnik**, ki lahko izpolnjuje vprašalnike in pregleduje svoje rezultate,
- **administrator**, ki lahko upravlja uporabnike, vprašalnike, pravila zrelosti in dodelitve.

---

## Glavne funkcionalnosti

Aplikacija omogoča:

- registracijo in prijavo uporabnikov,
- izpolnjevanje vprašalnika za CI/CD cevovode,
- shranjevanje odgovorov uporabnika,
- izračun stopnje zrelosti CI/CD cevovoda,
- prikaz dosežene stopnje zrelosti,
- prikaz manjkajočih pogojev za naslednjo stopnjo zrelosti,
- upravljanje vprašalnikov,
- upravljanje pravil zrelosti,
- upravljanje uporabnikov in dodelitev,
- povezavo s PostgreSQL bazo,
- zagon celotnega sistema z Dockerjem.

---

## Tehnološki sklad

Projekt uporablja:

- **Frontend:** React + Vite
- **Backend:** C++
- **Baza podatkov:** PostgreSQL
- **Kontejnerizacija:** Docker in Docker Compose
- **Avtentikacija:** JWT

---

## Struktura projekta

```text
Vprasalnik-Za-CI-CD/
│
├── backend/                 # C++ backend
│   ├── include/             # header datoteke in API poti
│   ├── src/                 # glavna backend koda
│   ├── .env.example         # primer okoljskih spremenljivk
│   ├── CMakeLists.txt       # CMake konfiguracija
│   └── vprasalnik.sql       # SQL datoteka za bazo
│
├── public/                  # javne frontend datoteke
├── src/                     # React frontend koda
│
├── Dockerfile.backend       # Docker konfiguracija za backend
├── Dockerfile.frontend      # Docker konfiguracija za frontend
├── docker-compose.yml       # lokalni zagon aplikacije
├── docker-compose.prod.yml  # produkcijski zagon aplikacije
│
├── frontend-README.md       # dokumentacija frontenda
├── backend-README.md        # dokumentacija backenda
├── package.json             # frontend odvisnosti
└── README.md                # glavna dokumentacija projekta
```

---

## Dokumentacija

Projekt je razdeljen na dva glavna dela:

- **Frontend** – uporabniški vmesnik aplikacije.
- **Backend** – zaledni strežnik, API logika in povezava z bazo.

### Frontend dokumentacija

Frontend dokumentacija je dostopna tukaj:

[Frontend dokumentacija](https://github.com/Timotejlipic/Vprasalnik-Za-CI-CD/blob/main/frontend-README.md)


V frontend dokumentaciji so opisani:

- uporabljene frontend tehnologije,
- struktura frontend kode,
- glavne React komponente,
- komunikacija z backend API-jem,
- lokalni in Docker zagon frontenda.

### Backend dokumentacija

Backend dokumentacija je dostopna tukaj:

[Backend dokumentacija](https://github.com/Timotejlipic/Vprasalnik-Za-CI-CD/blob/main/backend-README.md)

V backend dokumentaciji so opisani:

- struktura backend kode,
- glavne backend komponente,
- API poti,
- povezava s PostgreSQL bazo,
- avtentikacija z JWT,
- lokalni in Docker zagon backenda.

---

## Predpogoji za namestitev

Za najlažji zagon aplikacije potrebujete:

1. **Git**
2. **Docker Desktop**

Ročna namestitev Node.js, CMake, C++ knjižnic in PostgreSQL ni potrebna, če aplikacijo zaženete z Dockerjem.

---

## Namestitev Git

Git prenesete iz uradne strani:

```text
https://git-scm.com/downloads
```

Po namestitvi odprite terminal oziroma Command Prompt in preverite, ali Git deluje:

```bash
git --version
```

Če se izpiše verzija programa Git, je namestitev uspešna.

---

## Namestitev Docker Desktop

Docker Desktop prenesete iz uradne strani:

```text
https://www.docker.com/products/docker-desktop/
```

Po namestitvi zaženite Docker Desktop in počakajte, da se popolnoma zažene.

Če uporabljate Windows, mora biti Docker Desktop odprt, preden zaženete aplikacijo.

---

## Navodila za zagon aplikacije

### 1. Prenos projekta

Odprite terminal oziroma Command Prompt in se premaknite v mapo, kamor želite prenesti projekt.

Primer:

```bash
cd Desktop
```

Nato prenesite projekt iz GitHub repozitorija:

```bash
git clone https://github.com/Timotejlipic/Vprasalnik-Za-CI-CD.git
```

Premaknite se v mapo projekta:

```bash
cd Vprasalnik-Za-CI-CD
```

---

### 2. Zagon aplikacije z Dockerjem

Preverite, da je Docker Desktop odprt.

Nato v korenski mapi projekta zaženite:

```bash
docker compose up --build
```

Prvi zagon lahko traja nekaj minut, ker Docker prenese in pripravi vse potrebne komponente.

Po uspešnem zagonu bo aplikacija dostopna na naslovu:

```text
http://localhost:5173
```

Backend bo dostopen na naslovu:

```text
http://localhost:3002
```

PostgreSQL baza bo dostopna na naslovu:

```text
localhost:5432
```

---

### 3. Ustavitev aplikacije

Če želite aplikacijo ustaviti, v terminalu pritisnite:

```text
CTRL + C
```

Nato lahko po potrebi zaženete še:

```bash
docker compose down
```

Ta ukaz ustavi in odstrani zagnane Docker kontejnerje.

---

## Ponovni zagon aplikacije

Če ste aplikacijo že enkrat zagnali, jo lahko naslednjič zaženete z ukazom:

```bash
docker compose up
```

Če ste spremenili kodo, Docker nastavitve ali konfiguracijo, uporabite:

```bash
docker compose up --build
```

---

## Brisanje baze in svež začetek

Če želite izbrisati trenutno bazo in začeti znova, uporabite:

```bash
docker compose down -v
```

Nato ponovno zaženite aplikacijo:

```bash
docker compose up --build
```

Pozor: ukaz `docker compose down -v` izbriše shranjene podatke iz baze.

---

## Ročni razvojni zagon brez Dockerja

Ta način je namenjen razvijalcem. Za običajno uporabo je priporočljiv zagon z Dockerjem.

### Frontend

Namestitev odvisnosti:

```bash
npm install
```

Zagon frontend razvojnega strežnika:

```bash
npm run dev
```

Frontend bo dostopen na naslovu:

```text
http://localhost:5173
```

### Backend

Backend je napisan v C++ in uporablja CMake.

Za ročni zagon backenda potrebujete:

- C++ prevajalnik,
- CMake,
- PostgreSQL,
- PostgreSQL razvojne knjižnice,
- pravilno nastavljene okoljske spremenljivke.

Priporočen način za zagon backenda je zato uporaba Dockerja.

---

## Povezava do delujoče rešitve

Delujoča rešitev je dostopna tukaj:

```text
http://193.77.152.232:5173/
```

Če aplikacija še ni objavljena na spletu, jo lahko lokalno zaženete z Dockerjem in odprete na naslovu:

```text
http://localhost:5173
```
