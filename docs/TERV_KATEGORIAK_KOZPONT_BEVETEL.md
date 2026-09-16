# Terv: költségkategóriák, Központ és központi bevétel

Készült: 2026-09-11. Ez a dokumentum a megbeszélt és jóváhagyott tervet rögzíti.
**Még egyetlen sora sincs megvalósítva.** Azért van leírva, hogy a megvalósítás
ne emlékezetből induljon, és hogy a közben hozott döntések ne vesszenek el.

Az egész terv vezérelve végig ugyanaz volt, és a megvalósításban is ez marad:
**ne vesszen adat, és ne sérüljön a korábbi rögzítési logika** – ami mégis
változik, az legyen konvertálható és visszafordítható.

---

## 0. Hol tartunk, mi a nyitott döntés

| Rész | Állapot |
|---|---|
| Kategória rendszer | megtervezve, jóváhagyva, **nincs megvalósítva** |
| Központ mint `units.type='central'` | megtervezve, jóváhagyva, **nincs megvalósítva** |
| `incomes` tábla (központi bevétel) | megtervezve, jóváhagyva, **nincs megvalósítva** |
| Bankszámla egyenleg | **szándékosan elhalasztva** (lásd 4.3) |

---

## 1. Költségkategóriák

A tervet két, az adataitokból kiolvasott szám vezeti: **22 szállító adja a sorok
80%-át**, és **a szállítók 69%-ánál mindig ugyanaz az árucsoport**. Ezért a
besorolás szinte teljesen kitalálható a szállítóból, és ezért nem kell a
felhasználót választásra kényszeríteni a legtöbb esetben.

### 1.1 A kategóriák

Két szint: a **főkategória kötelező**, az **alkategória opcionális** és magától
kitöltődik. A lista a ti tényleges tételeitekből jött, nem általános sablonból.

| Főkategória | Alkategóriák | Mit fed le a mostani adatból |
|---|---|---|
| **Alapanyag** | zöldség-gyümölcs, tej és tejtermék, tojás, pékáru, hús és felvágott, édesség, olaj és zsiradék, fűszer és száraz áru, vegyes | zöldség 27 M, tej 10,7 M, tojás 8 M, pékáru 8,9 M, édesség 5,6 M, olaj 5,2 M, vegyes 9,8 M |
| **Ital** | üdítő, kávé és tea, szóda és CO2, alkohol | pepsi 15,3 M, cola 10,3 M, kávé 11,7 M, üdítő 5,3 M, szódagép bérlet, CO2 palack |
| **Tisztítás és higiénia** | tisztítószer, higiéniai papír, mosoda | tisztítószer 6,6 M |
| **Rezsi és bérleti díj** | bérleti díj, energia, üzemeltetési díj, hulladékkezelés | bérleti díj, üzemeltetési átalány, rendelkezésre állási díj 1,1 M, Biofilter |
| **Bér és személyi jellegű** | heti bér, EFO, jutalék, toborzás | jutalék 6,6 M, toborzás, plusz az összes bér és EFO kifizetés |
| **Gépjármű** | üzemanyag, szerviz, lízing és kamat, biztosítás | üzemanyag 6,3 M, kamat és tőke 4,7 M, Merkantil, Euroleasing, Autócentrum |
| **Szolgáltatás** | könyvelés, informatika, marketing és hirdetés, banki költség, egyéb | könyvelés 5,6 M, informatika 2,8 M, marketing 2,5 M, hirdetés 1 M |
| **Eszköz és karbantartás** | eszközbeszerzés, eszközbérlet, javítás, irodaszer | eszközbérbeadás 5,4 M, irodaszer 1,3 M, Nayax terminál |
| **Egyéb** | (nincs, helyette kötelező megnevezés) | ami tényleg sehova nem fér |

**A kategória tábla legyen szerkeszthető**, ne kódba égetett lista: ti tudjatok
újat felvenni, sorrendet állítani, régit inaktívvá tenni.

### 1.2 A felület

A vezérelv: **a besorolás legyen kevesebb munka, mint a kihagyása.**

- **A szállító adja a javaslatot.** Amint a szállító neve megvan, a rendszer
  megnézi, mit kapott ez a szállító legutóbb, és előre kiválasztja – láthatóan
  javaslatként: „Javaslat: Tej és tejtermék, a Pribofood korábbi 251 számlája
  alapján”. Ahol a szállító többfélét szállít (Telekom, Dallmayr, Merkantil),
  ott nem tippel, hanem kéri a választást.
- **Csempék, nem legördülő.** Az egység saját leggyakoribb 6–8 kategóriája egy
  sorban, egy kattintás. Mellette „Több…” gomb a teljes listához kereséssel.
  Billentyűvel az 1–8 számok is választanak.
- **Az Egyéb drágább.** Ismeretlen szállítónál nincs előre kiválasztva semmi, és
  az „Egyéb”-hez kötelező egy rövid megnevezés. A lusta út legyen több munka.
- **A mentést soha nem blokkolja.** Kategória nélkül a gomb felirata „Mentés
  besorolás nélkül”, a tétel sárga „Nincs besorolva” jelölést kap, az admin
  felületen meg számlálót: „Besorolatlan: 37 tétel”.
- **Bér és EFO esetén nincs választó.** Automatikusan a Bér és személyi jellegű
  kategóriát kapják a megfelelő alkategóriával; a rögzítés menete nem változik.
- **Nem hivatalos kifizetéseknél ugyanaz a csempesor**, de az egység saját, nem
  hivatalos költésének leggyakoribb kategóriáival. Itt a legnagyobb a lustaság
  kockázata, ezért itt a legfontosabb, hogy három-négy csempe elég legyen.

### 1.3 Az „Egyéb” megnevezés és a kategóriává léptetés

- Az Egyéb választásakor **kötelező egy rövid megnevezés**, és a mező
  **automatikus kiegészítést** ad a korábbi megnevezésekből. Enélkül a
  „takarítás”, „takaritas” és „takarító szer” három külön címke lenne, és soha
  nem gyűlne össze belőlük annyi, hogy kategóriát lehessen csinálni. Hasonló
  gépelésnél halk felajánlás: „Van már ilyen: takarítás. Azt választod?”
- **Admin képernyő az Egyéb tételekre**, megnevezés szerint csoportosítva,
  darabszámmal és összeggel. Küszöb felett (kb. tíz tétel vagy félmillió forint)
  kiemeli: „Érdemes kategóriát csinálni belőle.” Egy gombbal valódi kategória
  lesz belőle, és az összes ilyen megnevezésű tétel egy lépésben átkerül.

Vagyis a kategórialistát nem egy külső javaslatnak kell eltalálnia, hanem a
saját használatotok alakítja ki; a fenti kilenc főkategória csak a kiindulás.

### 1.4 A dolgozói számla kimarad a besorolásból

- Ha a **dolgozói számla kapcsoló be van kapcsolva, a kategória mező eltűnik**,
  rövid magyarázattal. Nem szürkül el, nem marad üresen – egyszerűen nincs ott.
- **A besorolatlan számlálóból is kimarad**, különben örökre ott lógna egy szám,
  amivel nem lehet mit kezdeni.
- **A jelentésben viszont saját sort kap**, „Dolgozói számla” néven, virtuális
  kategóriaként, hogy a kategóriák szerinti bontás összege kiadja a teljes
  költséget. A bontás három részből áll: valódi kategóriák, Dolgozói számla,
  Nincs besorolva.

### 1.5 Bevezetés a meglévő adat bántása nélkül

- **A kategória semmilyen számításba nem szól bele.** Nem érinti a házipénztárt,
  a tartalékot, az ÁFA-t, egyetlen összeget sem. Rosszul besorolt tétel is csak
  rosszul besorolt marad, pénzt nem mozdít.
- **Új oszlop, üresen.** A `category_id` NULL-ozható, alapérték nélkül. A meglévő
  több ezer sor NULL marad. **Nem csinálunk vak visszatöltést**, mert az kitalált
  adatot gyártana.
- **A visszamenőleges besorolás külön képernyőn**, szállítónként csoportosítva,
  darabszámmal és összeggel, egy kattintással az egész csoportra. Mivel 22
  szállító fedi a sorok 80%-át és 71 a 95%-ot, kb. hetven döntéssel évek adata
  besorolható. Ez a képernyő kizárólag a kategóriát írja, semmi mást.
- **A kiinduló szállító→kategória térkép legenerálható** az utalásos tábla 1913
  sorából, az „Áru” oszlop alapján, tehát nem üres képernyővel indultok.
- **Lépésenként, mindegyik önmagában visszafordítható:** kategória tábla és
  oszlop → mező az űrlapon opcionálisan → szállító alapú javaslat → tömeges
  besoroló → jelentések és export. Bármelyik lépésnél meg lehet állni.

**Nyitott adathiány:** a nem hivatalos kifizetésekre nincs rálátás (az utalásos
tábla csak hivatalos tételeket tartalmaz). Egy Kifizetések export a nem
hivatalosakkal együtt pontosítaná a listát, mielőtt bármit kódolunk.

---

## 2. A Központ

### 2.1 Mi a Központ ma

Hat dolga van, és egyik sem egység:

| Mi | Hol él | Mit csinál |
|---|---|---|
| Kifizetések | `central_payments` | készpénzes (számlás) és tartalék (számla nélküli), beérkezett/szkennelt/fizetett jelöléssel |
| Átküldések | `cash_transfers`, `source_type='central'` | pénz a Központ és az egységek között, plusz a bankos készpénzfelvétel |
| Zsebek | `cash_pockets`, `pocket_transactions` | lekötött készpénz |
| Revíziók | `cash_revisions` | egyenleg korrekció |
| Egyenleg | `useCentralBalance` | készpénz és tartalék |
| Napi sorozat | `fetchCentralHouseCashSeries` | ugyanolyan alakú, mint az egységeké |

Plusz újonnan a **dolgozói számlák** teljes összege, amit a Központ készpénze áll.

**Amije nincs: sora a `units` táblában.** Pontosan ezért nem választható sehol, és
ezért nincs hova tenni a 44 K0-s utalásos számlát.

### 2.2 A javaslat: harmadik típus, nem egység

Egy sor a `units` táblában **`type = 'central'`** típussal, „Központ” néven. A
felületen **nem egységnek hívjuk**; ahol gyűjtőnév kell, ott a mező felirata
**„Egység / Központ”**.

**Ez azért a legkevésbé kockázatos, mert a kód húsz helyen szűr
`type === 'restaurant'`-ra.** Egy új típus ezekbe automatikusan nem kerül bele:
nem jelenik meg a bér és EFO űrlapon, a Navbar egységváltójában, a forgalmi
jelentésben, a havi táblában, a napi rögzítésen, a bevétel-beállításokban és a
házipénztár jelentés egység-listájában. **A mostani rögzítési logika tehát
egyetlen ponton sem sérül.** Ahol viszont minden egység szerepel, ott azonnal
megjelenik – és épp ez kell: a számla űrlapon, a Számlák listában, az exportban.
(A `CashierImportPage` már ma is kezel egy `'other'` típust, tehát a harmadik
típus gondolata nem idegen a kódtól.)

### 2.3 Mi kerüljön alá, mi maradjon

- **Azonnal alá kerülhet:** a 44 K0-s utalásos számla és a jövőbeli központi
  számlás költségek. Ezek átutalásosak, tehát semmilyen készpénz egyenleget nem
  mozdítanak – ez a legbiztonságosabb első lépés.
- **Érintetlenül marad:** az átküldés, a zseb és a revízió. Ha a Központ kap egy
  azonosítót, akkor is **maradjon a `source_type='central'`**, ne váltsunk
  `source_unit_id`-ra, mert az a jóváhagyási szabályokat és az RLS-t is átírná.
- **Marad a dolgozói számla is az egységnél.** A számla ÁFA-jának fele az
  **egység** tartalékát terheli, tehát az egység azonosítója hordoz információt.
  A Központra víve elveszne, melyik egység tartalékát kell csökkenteni. A Központ
  nézetében viszont látszódjon.

### 2.4 Ami később jöhet, de most ne

A `central_payments` beolvasztása az `expenses` táblába. A leképezés hiánytalan:

| central_payments | expenses |
|---|---|
| payment_type 'cash' | is_official=true, payment_method='cash' |
| payment_type 'reserve' | is_official=false |
| payment_date | invoice_date |
| supplier_name, item_description, invoice_number, amount, notes | ugyanaz |
| received/scanned/paid + at/by | ugyanaz |

Előnye: egyetlen számlatábla maradna, és a kategória, az ÁFA kulcs meg a
jelölések automatikusan működnének a Központra is. Kockázata valós: a Központ
egyenlege ma ebből a táblából számol. **Ezért csak külön lépésben, és csak akkor,
ha az első lépések beváltak.**

### 2.5 Adatbiztonság

- **Egy új `units` sor felvétele önmagában semmit nem módosít.** Egyetlen meglévő
  rekord sem hivatkozik rá.
- **Az RLS nem változik.** A szabályok `get_my_unit_id()`-ra épülnek, és egyetlen
  felhasználó sem lesz ehhez rendelve.
- **Amire figyelni kell: a láthatóság, nem az adat.** Az éttermi egységekre
  iteráló jelentések (havi tábla, controlling, admin dashboard) a Központ
  tételeit nem mutatnák. Ez nem adatvesztés, de el kell dönteni, hova kell külön
  Központ oszlop – egyenként végig kell nézni, mielőtt élesedik.
- **A visszafordíthatóság a legfontosabb garancia.** A rá könyvelt számlák
  egyetlen `UPDATE`-tel átvihetők bárhová, mert csak a `unit_id` mutat rá.

---

## 3. Központi bevétel

### 3.1 A korlát, amit előbb ki kell mondani

**A rendszer ma nem ismer bankszámla egyenleget.** Két zseb van, a **Készpénz**
és a **Tartalék**, és mindkettő készpénz. Ezért egy átutalásos vagy kártyás
számla rögzítésre kerül, de **egyetlen egyenleget sem mozdít** – csak
nyilvántartás.

Ez a bevételi oldalra is igaz: a támogatás és a tanácsadási díj tipikusan
bankszámlára érkezik, tehát **ma nincs hova befolynia**. Rögzíteni és elemezni
tudjuk, de zsebet nem növel, amíg nincs bankszámla egyenleg. Ha készpénzben
érkezik valami, annak a Központ készpénzét kell növelnie.

A mai bevételi modell kizárólag egység-szintű és készpénz alapú: a `house_cash`
táblában az `official_other_income` növeli a Készpénzt, az `other_extra_income` a
Tartalékot. A Központnak ma semmilyen bevételi lehetősége nincs, az egyenlege
csak átküldésből nő.

### 3.2 Miért új tábla

- **A `house_cash` újrahasznosítása rossz út**, mert nincs benne fizetési mód.
  Egy bankra érkező támogatást csak úgy lehetne rögzíteni, hogy közben tévesen
  megnöveli a Központ **készpénz** egyenlegét. Ez valódi pénzügyi hiba lenne.
- **Az `expenses` negatív összeggel még rosszabb**: a negatív összeg nálatok már
  jóváíró számlát jelent, a kettő összekeveredne, és minden költségriport
  elromlana.
- **Ezért új tábla kell, az `expenses` tükörképe:** `incomes`, ugyanazzal a
  logikával – `unit_id`, dátum, összeg, megnevezés, `is_official`,
  `payment_method`, kategória, megjegyzés, jelölések. Így a Központ mellett
  bármelyik egység is használhatja később, ha kinövitek a `house_cash` két mezőjét.

### 3.3 A szabály a költségek pontos tükre

| Bevétel | Hatás |
|---|---|
| hivatalos + készpénz | Készpénz zseb **nő** |
| nem hivatalos | Tartalék zseb **nő** |
| hivatalos + átutalás vagy kártya | csak nyilvántartás, zseb nem mozdul |

Szó szerint ugyanaz a három ág, mint a költségeknél, ellenkező előjellel. Így nem
kell két szabályt fejben tartani, és a Központ napi sorozata ugyanúgy viselkedik,
mint az egységeké.

### 3.4 Bevételi kategóriák és a határvonal

Kategóriák: **támogatás, visszatérítés, tanácsadás, bérbeadás, kártérítés, kamat
és hozam, egyéb**. Ugyanabban a szerkeszthető kategória táblában laknak, mint a
költségek, egy **irány** mezővel megkülönböztetve – így egy helyen karbantartható
minden, és a bevételi oldal is megkapja az Egyéb megnevezés-logikát.

**A határvonal:** ami rendezvényhez tartozik, az marad a Rendezvény egységnél az
`event_revenues` táblában. A Központhoz csak az kerül, ami **semelyik
rendezvényhez és semelyik étteremhez** nem köthető. Ezt előre rögzíteni kell,
különben a támogatások fele ide, fele oda kerül.

### 3.5 Adatbiztonság

- **Az `incomes` teljesen új tábla, amire semmi nem hivatkozik.** Amíg nincs benne
  sor, a rendszer viselkedése bitre ugyanaz: egyetlen meglévő számítás, jelentés
  vagy egyenleg sem változik tőle.
- **A `house_cash` két bevételi mezőjéhez nem nyúlunk.** Az egységek ugyanúgy
  rögzítenek, ahogy eddig. A későbbi átvitel az `incomes` táblába külön,
  konvertálható lépés, de nem feltétele semminek.

---

## 4. Döntések, amik megszülettek

### 4.1 A Központ neve
Nem „egység” és nem is „költséghely” (utóbbi pontatlan lenne, mert bevétele is
van). A felületen egyszerűen **„Központ”**, gyűjtőnévként **„Egység / Központ”**.

### 4.2 A dolgozói számla helye
Marad az egységnél (mert az egység tartalékát terheli az ÁFA fele), a Központ
nézetében viszont látszik. A kategória-besorolásból kimarad, a jelentésben külön
virtuális sort kap.

### 4.3 Bankszámla egyenleg – elhalasztva
A bankra érkező központi bevétel **egyelőre csak nyilvántartás**, zsebet nem
mozdít. A bankszámla funkció sokkal végiggondoltabb folyamat, akár PSD2-vel,
mert a sok apróságra (utalási jutalékok, adók, számlavezetési díjak) ma nincs
rálátás. Amíg ez nincs meg, a fenti szabály érvényes.

---

## 5. Megvalósítási sorrend

1. **`units` sor `type='central'` típussal**, plusz a „Központ” felirat.
   Adatot nem mozdít, semmi nem hivatkozik rá.
2. **A K0-s utalásos számlák importja a Központra.** Csak átutalásos, egyenleget
   nem érint.
3. **A Központ nézete olvassa be a saját számláit is**, ugyanúgy, ahogy a
   dolgozói számlákat már olvassa.
4. **`incomes` tábla** a 3. fejezet szabályaival.
5. **Döntés a jelentésekről:** hol kell külön Központ oszlop, bevétellel együtt.
6. **Kategória rendszer** az 1.5 szerinti lépésekben.
7. **Csak ezután, ha egyáltalán szükséges:** a `central_payments` beolvasztása.

Az első három lépés után a K0 és a dolgozói számla kérdése is megoldódik, és
egyik sem nyúl a meglévő pénzmozgásokhoz.

---

## 6. Kapcsolódó, még nyitott adatügyek

Ezek nem a fenti terv részei, de ugyanezekhez a számokhoz tartoznak:

- **Elhalasztott utalásos sorok (2026. augusztus):** 44 K0 sor (5 733 501 Ft),
  7 KOMP sor (1 413 846 Ft), 7 K00 sor (74 352 Ft), és 6 egység kód nélküli sor
  (1 181 528 Ft, lásd `docs/hianyzo_egysegkod_2026_08.csv`).
- **A havi tábla képletei:** mind a tizenegy oszlophoz hozzá kell adni az
  **MV GASTRO** lapot (öt egységnek összesen 2 270 519 Ft), és a **Koltai**
  oszlopban a `H` (március) hivatkozásokat `W`-re (augusztus) kell cserélni.
- **A VEGYES egység és VEGYES rezsi lapok** szándékosan kimaradnak a havi tábla
  egység oszlopaiból, online viszont az egységnél jelennek meg (2 402 926 Ft).
  Ez rendszerszintű különbség a két oldal között, tudni kell róla.
