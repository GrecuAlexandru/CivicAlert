# Date Demo CivicAlert

Acest fisier contine date de test realiste pentru a popula aplicatia in timpul prezentarii sau inainte.

## 1. Utilizatori (Conturi de creat/folosit)

**Admin:**

- **Email:** admin@civicalert.ro
- **Parola:** qweqwe
- **Nume:** Admin Primarie
- **Rol:** Admin

**Cetatean 1 (Cel care raporteaza):**

- **Email:** ion.popescu@test.com
- **Parola:** qweqwe
- **Nume:** Ion Popescu
- **Oras:** Bucuresti

**Cetatean 2 (Cel care comenteaza/voteaza):**

- **Email:** maria.ionescu@test.com
- **Parola:** qweqwe
- **Nume:** Maria Ionescu
- **Oras:** Bucuresti

---

## 2. Sesizari (Tichete)

Alege 2-3 dintre acestea pentru a le adauga pe harta in zone diferite.

### Tichet A: Groapa periculoasa in asfalt

- **Titlu:** Groapa adanca pe trecerea de pietoni
- **Descriere:** Este o groapa foarte mare chiar pe trecerea de pietoni din intersectie. Am vazut mai multe masini lovind-o azi dimineata. Este pericol de accident atat pentru soferi cat si pentru pietoni. Va rog sa interveniti urgent.
- **Categorie:** Infrastructura / Gropi
- **Locatie sugerata:** O intersectie circulata.
- **Poze de descarcat (Cautare Google):**
  - "pothole in asphalt road romania"
  - "groapa asfalt trecere pietoni"
  - _Sfat:_ Cauta o poza cu o groapa in asfalt gri, eventual cu marcaje rutiere pe langa.

### Tichet B: Iluminat public defect

- **Titlu:** Stalpi de iluminat nefunctionali in parc
- **Descriere:** De 3 zile, aleile din zona locului de joaca sunt in bezna totala. Sunt 4 stalpi care nu se aprind seara. Este nesigur pentru copii si parinti.
- **Categorie:** Iluminat Public
- **Locatie sugerata:** Un parc sau o zona pietonala.
- **Poze de descarcat (Cautare Google):**
  - "street light off night park"
  - "dark park alley night"
  - _Sfat:_ O poza de noapte, intunecata, unde se vede doar conturul stalpilor.

### Tichet C: Deseuri neridicate

- **Titlu:** Gunoi neridicat de o saptamana
- **Descriere:** Pubelele sunt pline ochi si gunoiul a inceput sa fie depozitat pe langa acestea. Mirosul este insuportabil si au inceput sa apara sobolani.
- **Categorie:** Salubritate
- **Locatie sugerata:** Zona din spatele unor blocuri.
- **Poze de descarcat (Cautare Google):**
  - "overflowing garbage bins romania"
  - "gunoi neridicat sector"
  - _Sfat:_ O poza cu tomberoane pline sau saci de gunoi pe jos.

### Tichet D (Pentru Demo Live - "Rezolvat"): Banca rupta

- **Titlu:** Banca vandalizata in statia de autobuz
- **Descriere:** Banca din statie are spatarul rupt si scandurile lipsa. Nu se poate sta pe ea.
- **Categorie:** Mobilier Urban
- **Poze de descarcat (Cautare Google):**
  - "broken park bench"
  - "banca rupta parc"

---

## 3. Scenariu Interactiune (Comentarii & Update-uri)

Foloseste contul **Maria Ionescu** pentru a interactiona cu tichetul creat de **Ion Popescu** (ex: Tichetul A - Groapa).

**Actiune 1: Upvote**

- Da like/upvote la sesizare.

**Actiune 2: Adauga Comentariu (Maria)**

- **Mesaj:** "Confirm! Trec zilnic pe acolo si chiar ieri mi-am strambat janta la masina in groapa aia. Este inadmisibil sa stea asa de 2 saptamani."

**Actiune 3: Adauga Comentariu cu Poza (Maria - optional)**

- **Mesaj:** "Uite cum arata azi dimineata, s-a marit si mai tare dupa ploaie."
- **Poza de descarcat:**
  - Gaseste o alta poza cu o groapa, poate una plina cu apa ("pothole water filled").

**Actiune 4: Raspuns Autor (Ion)**

- **Mesaj:** "Multumesc pentru sustinere, Maria! Sper sa o vada cei de la primarie mai repede."

**Actiune 5: Interventie Admin (Admin Primarie)**

- **Schimbare Status:** Din `Pending` in `Approved` (Aprobat).
- **Mesaj Admin (in comentarii sau la status):** "Sesizarea a fost preluata si trimisa catre echipa tehnica. Se va remedia in termen de 48h."

**Actiune 6: Rezolvare (Admin Primarie -> Mai tarziu)**

- **Schimbare Status:** Din `Approved` in `Resolved` (Rezolvat).
- **Comentariu Admin (Optional, dovada):** "Lucrarea a fost finalizata."
- **Poza Rezolvare:** "asphalt patch road" (o poza cu asfalt proaspat sau o "plomba").
