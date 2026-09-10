-- =============================================================================
-- Utalásos tábla – 2026. augusztus, első kör
-- Készült: 2026-09-10
--
-- Forrás: docs/utalásos táblázat 2026_full.xlsx (a TELJES, 96 lapos fájl), a 2026 augusztusi teljesítésű sorok.
-- Az egység kódok leképezése számlaszám-egyezésből lett levezetve az online
-- adattal (002=KTI, 003=Szentkirályi, 005=Államkincstár, 006=Knorr 69,
-- 008=RSR, 009=Knorr 86, 010=Knorr 105).
--
-- Két lépés:
--   1) 93 új átutalásos számla felvétele (11 385 942 Ft).
--   2) 46 már online lévő számlán a hiányzó állapot jelölések pótlása.
--
-- Az állapotok a tábla SZÍNKÓDJAIBÓL jönnek, mert az megbízhatóbb, mint az
-- "Utalva" oszlop (160 sárga sor van, de csak 80-ban van dátum):
--   * mályva számlaszám  -> beérkezett ÉS szkennelt
--   * sárga sorháttér    -> fizetett
-- A fizetés dátuma: az "Utalva" oszlop dátuma, ha van; egyébként a számla
-- fizetési határideje (egyeztetve). Egy sornál egyik sincs, ott dátum nélkül
-- marad a fizetett jelölés.
--
-- A kelt dátum a tábla TELJESÍTÉS oszlopa (egyeztetve; a táblában nincs külön
-- számla kelte). A tétel megnevezése az "Áru" oszlopból jön.
--
-- MOST KIMARAD, későbbi körre felírva:
--   * 7 KOMP sor (kompenzációval rendezve, szeptemberben) - 1 413 846 Ft
--   * 6 sor egység kód nélkül - 1 181 528 Ft (lásd docs/hianyzo_egysegkod_2026_08.csv)
--   * 44 K0 (központi) sor - 5 733 501 Ft: nincs "Központ" nevű egység
--   * 7 K00 ("egyéb") sor - 74 352 Ft, félretéve
--
-- Minden tétel ÁTUTALÁSOS és hivatalos, tehát a bankszámlát terheli: a
-- házipénztár és a tartalék egyenlegét ez a script NEM mozdítja el.
-- Az ÁFA kulcsot nem írjuk be, marad az oszlop 27%-os alapértelmezése.
--
-- Idempotens: a felvétel egység + számlaszám párra ellenőriz, a jelölés csak a
-- még jelöletleneket érinti. Semmit nem töröl.
-- =============================================================================

DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(n, ', ') INTO missing
  FROM (VALUES ('KTI'),('Szentkirályi'),('Államkincstár'),('Knorr 69'),('RSR'),('Knorr 86'),('Knorr 105')) AS v(n)
  WHERE NOT EXISTS (SELECT 1 FROM units u WHERE u.name = v.n);
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'Hiányzó egység(ek): %. Nézd meg: SELECT id, name FROM units ORDER BY name;', missing;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) Új átutalásos számlák (93 db)
-- ---------------------------------------------------------------------------
INSERT INTO expenses (
  unit_id, supplier_name, invoice_number, amount, currency, payment_method,
  invoice_date, payment_deadline, item_description, is_official,
  received, received_at, scanned, scanned_at, paid, paid_at, notes
)
SELECT
  u.id, v.supplier_name, v.invoice_number, v.amount, 'HUF', 'transfer',
  v.invoice_date, v.payment_deadline, NULLIF(v.item_description, ''), true,
  v.megvan, CASE WHEN v.megvan THEN NOW() END,
  v.megvan, CASE WHEN v.megvan THEN NOW() END,
  v.fizetett, v.paid_at,
  'Utalásos tábla alapján rögzítve (2026. augusztus)'
FROM units u
JOIN (VALUES
    ('KTI', 'Közlekedéstudományi és Építésügyi', 'V106-01525', 25400, DATE '2026-08-04', DATE '2026-08-19', 'Helyiségbérleti díj 202608 hó', true, true, DATE '2026-08-18'),
    ('KTI', 'Magyarüdítő Forg. Kft', '702661166', 115179, DATE '2026-08-27', DATE '2026-09-22', 'pepsi', true, false, NULL),
    ('Knorr 105', 'P&P Pékárú Kft', '15691/B/2026', 186038, DATE '2026-08-01', DATE '2026-08-01', 'pékárú', true, true, DATE '2026-08-01'),
    ('Knorr 105', 'Silver Tojás Kft', '12449/2026', 89595, DATE '2026-08-03', DATE '2026-08-11', 'tojás', true, true, DATE '2026-08-11'),
    ('Knorr 105', 'Pribofood Kft', '98594/2026', 63235, DATE '2026-08-03', DATE '2026-08-11', 'tej', true, true, DATE '2026-08-11'),
    ('Knorr 105', 'Pribofood Kft', '98658/2026', 163025, DATE '2026-08-03', DATE '2026-08-11', 'tej', true, true, DATE '2026-08-11'),
    ('Knorr 105', 'Pribofood Kft', '98659/2026', 47358, DATE '2026-08-03', DATE '2026-08-11', 'tej', true, true, DATE '2026-08-11'),
    ('Knorr 105', 'Kelet Higiénia Kereskedelmi és Szolgáltató Kft.', 'K09526/26', 151606, DATE '2026-08-03', DATE '2026-08-18', 'tisztitószer', true, true, DATE '2026-08-18'),
    ('Knorr 105', 'Ismeretlen szállító', 'NVHST-2026-660', 200025, DATE '2026-08-03', DATE '2026-08-21', 'NovoHost-TS NTAK modul', true, true, DATE '2026-09-02'),
    ('Knorr 105', 'Sixi 2000 Kft', 'SU12026-000416', 116747, DATE '2026-08-04', DATE '2026-08-12', 'édesség', true, true, DATE '2026-08-11'),
    ('Knorr 105', 'Magyarüdítő Forg. Kft', '702653478', 305186, DATE '2026-08-05', DATE '2026-09-02', 'pepsi', true, true, DATE '2026-09-01'),
    ('Knorr 105', 'Gastroil Mo. Zrt', 'W/2026/1702601', 75900, DATE '2026-08-05', DATE '2026-08-13', 'olaj', true, true, DATE '2026-08-13'),
    ('Knorr 105', 'Coca-Cola HBC Mo Kft', '1604974606', 342084, DATE '2026-08-06', DATE '2026-08-20', 'cola', true, true, DATE '2026-08-20'),
    ('Knorr 105', 'Ismeretlen szállító', '2026/009104', 6096, DATE '2026-08-06', DATE '2026-08-14', 'NAYAX VPOS Terminál', true, true, DATE '2026-08-11'),
    ('Knorr 105', 'Silver Tojás Kft', '12914/2026', 80514, DATE '2026-08-07', DATE '2026-08-15', 'tojás', true, true, DATE '2026-08-15'),
    ('Knorr 105', 'P&P Pékárú Kft', '15962/B/2026', 208423, DATE '2026-08-07', DATE '2026-08-07', 'pékárú', true, true, DATE '2026-08-11'),
    ('Knorr 105', 'P&P Pékárú Kft', '16165/B/2026', 254851, DATE '2026-08-07', DATE '2026-08-07', 'pékárú', true, true, DATE '2026-08-07'),
    ('Knorr 105', 'MV Gastro Kft.', 'MV-2026/33278', 375678, DATE '2026-08-07', DATE '2026-08-18', 'zöldség', true, true, DATE '2026-08-18'),
    ('Knorr 105', 'Szigeti Tojás Kft.', 'SZGT-2026-8412', 36540, DATE '2026-08-07', DATE '2026-08-14', 'tojás', true, true, DATE '2026-08-17'),
    ('Knorr 105', 'Pribofood Kft', '101414/2026', 102720, DATE '2026-08-10', DATE '2026-08-18', 'tej', true, true, DATE '2026-08-18'),
    ('Knorr 105', 'Pribofood Kft', '101481/2026', -102720, DATE '2026-08-10', DATE '2026-08-18', 'tej', true, true, DATE '2026-08-18'),
    ('Knorr 105', 'Pribofood Kft', '101482/2026', 111783, DATE '2026-08-10', DATE '2026-08-18', 'tej', true, true, DATE '2026-08-17'),
    ('Knorr 105', 'Pribofood Kft', '101606/2026', 54534, DATE '2026-08-10', DATE '2026-08-18', 'tej', true, true, DATE '2026-08-18'),
    ('Knorr 105', 'Kelet Higiénia Kereskedelmi és Szolgáltató Kft.', 'K09839/26', 90468, DATE '2026-08-10', DATE '2026-08-25', 'tisztitószer', true, true, DATE '2026-08-17'),
    ('Knorr 105', 'Silver Tojás Kft', '13237/2026', 62757, DATE '2026-08-12', DATE '2026-08-20', 'tojás', true, true, DATE '2026-08-20'),
    ('Knorr 105', 'M. L. Energy Kft.', '261079223', 309673, DATE '2026-08-12', DATE '2026-08-27', 'üditő', true, true, DATE '2026-08-17'),
    ('Knorr 105', 'Gastroil Mo. Zrt', 'W/2026/1702689', 75900, DATE '2026-08-12', DATE '2026-08-20', 'olaj', true, true, DATE '2026-08-20'),
    ('Knorr 105', 'VIWA Product Europa Kft', 'AJ-2026/00903', 78750, DATE '2026-08-13', DATE '2026-08-21', 'üdítő', true, true, DATE '2026-08-17'),
    ('Knorr 105', 'MV Gastro Kft.', 'MV-2026/33451', 349126, DATE '2026-08-13', DATE '2026-08-25', 'zöldség', true, true, DATE '2026-08-25'),
    ('Knorr 105', 'Silver Tojás Kft', '13401/2026', 26838, DATE '2026-08-14', DATE '2026-08-22', 'tojás', true, true, DATE '2026-08-22'),
    ('Knorr 105', 'Coca-Cola HBC Mo Kft', '1604981610', 353178, DATE '2026-08-14', DATE '2026-08-28', 'cola', true, true, DATE '2026-08-17'),
    ('Knorr 105', 'P&P Pékárú Kft', '16524/B/2026', 322552, DATE '2026-08-14', DATE '2026-08-14', 'pékárú', true, true, DATE '2026-08-17'),
    ('Knorr 105', 'P&P Pékárú Kft', '16954/B/2026', 146361, DATE '2026-08-17', DATE '2026-08-17', 'pékárú', true, true, DATE '2026-08-17'),
    ('Knorr 105', 'Ismeretlen szállító', 'FRIGO-2026-535', 44450, DATE '2026-08-19', DATE '2026-09-03', 'Általános karbantartás', true, true, DATE '2026-09-01'),
    ('Knorr 105', 'Ismeretlen szállító', 'EKS-2610836', 6350, DATE '2026-08-20', DATE '2026-08-20', '', true, true, DATE '2026-08-11'),
    ('Knorr 105', 'P&P Pékárú Kft', '17127/B/2026', 191190, DATE '2026-08-21', DATE '2026-08-21', 'pékárú', true, true, DATE '2026-09-01'),
    ('Knorr 105', 'P&P Pékárú Kft', '17162/B/2026', 273952, DATE '2026-08-21', DATE '2026-08-21', 'pékárú', true, true, DATE '2026-08-21'),
    ('Knorr 105', 'Biofilter', '2026-PXL4/032060', 99314, DATE '2026-08-21', DATE '2026-08-21', 'Rendelkezésre állási díj', true, true, DATE '2026-08-21'),
    ('Knorr 105', 'Alois Dallmayr Bt', 'ESZLA-2610391', 263995, DATE '2026-08-21', DATE '2026-08-21', 'Linde CO2 palack töltet 10 kg', true, false, NULL),
    ('Knorr 105', 'Pribofood Kft', '107185/2026', 126498, DATE '2026-08-24', DATE '2026-09-01', 'tej', true, true, DATE '2026-09-01'),
    ('Knorr 105', 'Pribofood Kft', '107573/2026', 7917, DATE '2026-08-24', DATE '2026-09-01', 'tej', true, true, DATE '2026-09-01'),
    ('Knorr 105', 'Magyarüdítő Forg. Kft', '702659471', 361253, DATE '2026-08-25', DATE '2026-09-18', 'pepsi', true, false, NULL),
    ('Knorr 105', 'Silver Tojás Kft', '14222/2026', 98675, DATE '2026-08-26', DATE '2026-09-03', 'tojás', true, false, NULL),
    ('Knorr 105', 'Ismeretlen szállító', 'ECR-2026-467', 20320, DATE '2026-08-26', DATE '2026-08-26', 'Datecs AEE akkumulátor', true, true, DATE '2026-09-01'),
    ('Knorr 105', 'Silver Tojás Kft', '14362/2026', 53676, DATE '2026-08-28', DATE '2026-09-05', 'tojás', true, false, NULL),
    ('Knorr 105', 'P&P Pékárú Kft', '17622/B/2026', 220285, DATE '2026-08-28', DATE '2026-08-28', 'pékárú', true, true, DATE '2026-09-01'),
    ('Knorr 105', 'P&P Pékárú Kft', '17908/B/2026', 254851, DATE '2026-08-28', DATE '2026-08-28', 'pékárú', true, true, DATE '2026-08-28'),
    ('Knorr 105', 'S.P.I.N. Kft.', 'A26/2834', 37327, DATE '2026-08-28', DATE '2026-09-05', 'üditő', true, true, DATE '2026-09-01'),
    ('Knorr 105', 'S.P.I.N. Kft.', 'A26/2876', 37327, DATE '2026-08-28', DATE '2026-09-05', 'üditő', true, false, NULL),
    ('Knorr 105', 'S.P.I.N. Kft.', 'A26/353H', -37327, DATE '2026-08-28', DATE '2026-09-05', 'üditő', true, true, DATE '2026-09-05'),
    ('Knorr 105', 'Pribofood Kft', '110707/2026', 7917, DATE '2026-08-31', DATE '2026-09-08', 'tej', true, false, NULL),
    ('Knorr 105', 'Pribofood Kft', '110755/2026', 122705, DATE '2026-08-31', DATE '2026-09-08', 'tej', true, false, NULL),
    ('Knorr 105', 'Silver Tojás Kft', '14439/2026', 62757, DATE '2026-08-31', DATE '2026-09-08', 'tojás', true, false, NULL),
    ('Knorr 105', 'Alois Dallmayr Bt', 'ESZLA-2610971', 392957, DATE '2026-08-31', DATE '2026-09-09', 'kv', true, false, NULL),
    ('Knorr 105', 'Kelet Higiénia Kereskedelmi és Szolgáltató Kft.', 'K10804/26', 313365, DATE '2026-08-31', DATE '2026-09-15', 'tisztitószer', true, false, NULL),
    ('Knorr 105', 'MV Gastro Kft.', 'MV-2026/33750', 526048, DATE '2026-08-31', DATE '2026-09-11', 'zöldség', true, false, NULL),
    ('Knorr 69', 'Alois Dallmayr Bt', 'ESZLA-2610516', 10630, DATE '2026-08-17', DATE '2026-08-25', 'kv', true, false, NULL),
    ('Knorr 69', 'Pribofood Kft', '107347/2026', 60049, DATE '2026-08-24', DATE '2026-09-01', 'tej', true, true, DATE '2026-09-01'),
    ('Knorr 69', 'Assist-Trend Bp Kft', 'B06421/2026', 82737, DATE '2026-08-25', DATE '2026-09-02', 'tisztitószer', true, true, DATE '2026-09-04'),
    ('Knorr 69', 'MV Gastro Kft.', 'MV-2026/33753', 56522, DATE '2026-08-31', DATE '2026-09-11', 'zöldség', true, false, NULL),
    ('Knorr 86', 'Ismeretlen szállító', 'FRIGO-2026-488', 44450, DATE '2026-08-04', DATE '2026-08-13', 'Hűtőkamra hibafelmérés', true, true, DATE '2026-08-11'),
    ('Knorr 86', 'Pribofood Kft', '107516/2026', 6145, DATE '2026-08-24', DATE '2026-09-01', 'tej', true, true, DATE '2026-09-01'),
    ('Knorr 86', 'Ismeretlen szállító', 'RP-2026-1722', 26925, DATE '2026-08-27', DATE '2026-09-04', 'rétes', true, true, DATE '2026-09-04'),
    ('Knorr 86', 'Ismeretlen szállító', 'RP-2026-1742', -26925, DATE '2026-08-27', DATE '2026-09-04', 'rétes', true, true, DATE '2026-09-04'),
    ('RSR', 'Ismeretlen szállító', 'E-BGNF-2026-183', 20320, DATE '2026-08-03', DATE '2026-08-11', 'rovarirtás', true, true, DATE '2026-08-11'),
    ('RSR', 'Ismeretlen szállító', 'E-2026-829', 29364, DATE '2026-08-04', DATE '2026-08-12', 'digitális nyomtatás', true, true, DATE '2026-08-11'),
    ('RSR', 'Rákosmenti Nonprofit Kft.', 'E-RKSMN-2026-120', 901700, DATE '2026-08-05', DATE '2026-08-11', 'bérleti dij', true, true, DATE '2026-08-18'),
    ('RSR', 'Magyarüdítő Forg. Kft', '702658340', 101603, DATE '2026-08-18', DATE '2026-09-16', 'pepsi', true, false, NULL),
    ('RSR', 'Fejér Food Kft.', 'FF / 2026-008029', 89154, DATE '2026-08-18', DATE '2026-08-26', 'szóda', true, true, DATE '2026-09-01'),
    ('RSR', 'Rauch Hungária Kft.', '7000495800', 61676, DATE '2026-08-19', DATE '2026-09-18', 'üditő', true, true, DATE '2026-09-18'),
    ('RSR', 'Rauch Hungária Kft.', '7000496556', -61676, DATE '2026-08-19', DATE '2026-09-18', 'üditő', true, true, DATE '2026-09-18'),
    ('RSR', 'Rauch Hungária Kft.', '7000496557', 61676, DATE '2026-08-19', DATE '2026-09-18', 'üditő', true, false, NULL),
    ('RSR', 'Szamos Marcipán Kft.', '26/14962', 48286, DATE '2026-08-24', DATE '2026-09-07', 'sütemény', true, false, NULL),
    ('RSR', 'Ismeretlen szállító', 'E-KA-2026-1', 60000, DATE '2026-08-24', DATE '2026-08-24', 'zenei szolgáltatás', true, true, DATE '2026-08-24'),
    ('Szentkirályi', 'Silver Tojás Kft', '12399/2026', 26838, DATE '2026-08-03', DATE '2026-08-11', 'tojás', true, true, DATE '2026-08-11'),
    ('Szentkirályi', 'Silver Tojás Kft', '12450/2026', -26838, DATE '2026-08-03', DATE '2026-08-11', 'tojás', true, true, DATE '2026-08-11'),
    ('Szentkirályi', 'MV Gastro Kft.', 'MV-2026/33283', 39116, DATE '2026-08-05', DATE '2026-08-18', 'zöldség', true, true, DATE '2026-08-18'),
    ('Szentkirályi', 'Silver Tojás Kft', '13457/2026', 26838, DATE '2026-08-17', DATE '2026-08-25', 'tojás', true, true, DATE '2026-08-25'),
    ('Szentkirályi', 'Silver Tojás Kft', '13566/2026', -26838, DATE '2026-08-17', DATE '2026-08-25', 'tojás', true, true, DATE '2026-08-25'),
    ('Államkincstár', 'Magyar Államkincstár', 'V106-02225', 88900, DATE '2026-08-06', DATE '2026-09-07', 'Üzemeltetési átalánydíj 2026. szeptember', true, true, DATE '2026-08-18'),
    ('Államkincstár', 'Gastroil Mo. Zrt', 'W/2026/1702629', 66420, DATE '2026-08-06', DATE '2026-08-14', 'olaj', true, true, DATE '2026-08-14'),
    ('Államkincstár', 'MV Gastro Kft.', 'MV-2026/33257', 147597, DATE '2026-08-07', DATE '2026-08-18', 'zöldség', true, true, DATE '2026-08-17'),
    ('Államkincstár', 'Assist-Trend Bp Kft', 'B06236/2026', 86319, DATE '2026-08-14', DATE '2026-08-22', 'tisztitószer', true, true, DATE '2026-08-17'),
    ('Államkincstár', 'MV Gastro Kft.', 'MV-2026/33449', 184208, DATE '2026-08-14', DATE '2026-08-25', 'zöldség', true, true, DATE '2026-09-01'),
    ('Államkincstár', 'MV Gastro Kft.', 'MV-2026/33583', 43577, DATE '2026-08-18', DATE '2026-08-31', 'zöldség', true, true, DATE '2026-09-01'),
    ('Államkincstár', 'Biofilter', '2026-PXL4/032149', 21812, DATE '2026-08-21', DATE '2026-08-21', 'Rendelkezésre állási díj', true, true, DATE '2026-08-21'),
    ('Államkincstár', 'Gastroil Mo. Zrt', 'W/2026/1702814', 56920, DATE '2026-08-24', DATE '2026-09-01', 'olaj', true, true, DATE '2026-09-01'),
    ('Államkincstár', 'Coca-Cola HBC Mo Kft', '1604991068', 70931, DATE '2026-08-31', DATE '2026-09-14', 'cola', true, true, DATE '2026-09-01'),
    ('Államkincstár', 'Benei és Társa Vagyonkezelő Kft', '2256/VBG/2026', 46653, DATE '2026-08-31', DATE '2026-08-31', 'sütemény', true, true, DATE '2026-09-01'),
    ('Államkincstár', 'Assist-Trend Bp Kft', 'B06601/2026', 92732, DATE '2026-08-31', DATE '2026-09-08', 'tisztitószer', true, true, DATE '2026-09-08'),
    ('Államkincstár', 'MV Gastro Kft.', 'MV-2026/33746', 235919, DATE '2026-08-31', DATE '2026-09-11', 'zöldség', true, false, NULL),
    ('Knorr 105', 'Knorr-Bremse Vasúti Jármű Rv', '120682459', 381000, DATE '2026-08-05', NULL, 'bérleti dij', true, true, DATE '2026-08-18'),
    ('RSR', 'Ismeretlen szállító', 'E-KA-2026-2', -60000, DATE '2026-08-24', NULL, 'zenei szolgáltatás', true, true, NULL)
) AS v(unit_name, supplier_name, invoice_number, amount, invoice_date,
       payment_deadline, item_description, megvan, fizetett, paid_at)
  ON u.name = v.unit_name
WHERE NOT EXISTS (
  SELECT 1 FROM expenses e
   WHERE e.unit_id = u.id
     AND e.invoice_number = v.invoice_number
);

-- ---------------------------------------------------------------------------
-- 2) Állapot jelölések pótlása a már online lévő számlákon (46 db)
--    Meglévő jelölést nem vesz vissza, csak hiányzót állít be.
-- ---------------------------------------------------------------------------
UPDATE expenses e
   SET received    = e.received OR v.megvan,
       received_at = CASE WHEN v.megvan AND e.received_at IS NULL THEN NOW() ELSE e.received_at END,
       scanned     = e.scanned OR v.megvan,
       scanned_at  = CASE WHEN v.megvan AND e.scanned_at IS NULL THEN NOW() ELSE e.scanned_at END,
       paid        = e.paid OR v.fizetett,
       paid_at     = CASE WHEN v.fizetett AND e.paid_at IS NULL THEN v.paid_at ELSE e.paid_at END
  FROM units u, (VALUES
    ('KTI', '107275/2026', true, true, DATE '2026-09-01'),
    ('Knorr 69', 'B05892/2026', true, true, DATE '2026-08-12'),
    ('Knorr 69', 'MV-2026/33287', true, true, DATE '2026-08-18'),
    ('Knorr 69', 'MV-2026/33453', true, true, DATE '2026-08-25'),
    ('Knorr 69', 'ESZLA-2610466', true, false, NULL),
    ('Knorr 69', 'ECRSZ-2026-335', true, true, DATE '2026-08-18'),
    ('Knorr 69', '2026-PXL4/032057', true, true, DATE '2026-09-01'),
    ('Knorr 86', '98623/2026', true, true, DATE '2026-08-11'),
    ('Knorr 86', '98624/2026', true, true, DATE '2026-08-11'),
    ('Knorr 86', 'B05967/2026', true, true, DATE '2026-08-11'),
    ('Knorr 86', '12880/2026', true, true, DATE '2026-08-17'),
    ('Knorr 86', 'MV-2026/33262', true, true, DATE '2026-08-18'),
    ('Knorr 86', '101553/2026', true, true, DATE '2026-08-18'),
    ('Knorr 86', '101555/2026', true, true, DATE '2026-08-18'),
    ('Knorr 86', '1604978658', true, true, DATE '2026-08-26'),
    ('Knorr 86', 'MV-2026/33450', true, true, DATE '2026-08-25'),
    ('Knorr 86', '13398/2026', true, true, DATE '2026-09-01'),
    ('Knorr 86', '2026-PXL4/032038', true, true, DATE '2026-08-21'),
    ('Knorr 86', '107348/2026', true, true, DATE '2026-09-01'),
    ('Knorr 86', '107760/2026', true, true, DATE '2026-09-01'),
    ('Knorr 86', '702659468', true, false, NULL),
    ('Knorr 86', '14221/2026', true, false, NULL),
    ('Knorr 86', 'MV-2026/33752', true, false, NULL),
    ('Knorr 86', '110708/2026', true, false, NULL),
    ('Knorr 86', '110767/2026', true, false, NULL),
    ('RSR', '702652424', true, true, DATE '2026-08-29'),
    ('RSR', 'FF / 2026-007660', true, true, DATE '2026-08-18'),
    ('RSR', 'B06193/2026', true, true, DATE '2026-08-21'),
    ('RSR', 'ECRER-2026-141', true, true, DATE '2026-09-01'),
    ('RSR', 'A-003622-LI/2026', true, true, DATE '2026-09-01'),
    ('Szentkirályi', '702652421', true, true, DATE '2026-08-29'),
    ('Szentkirályi', '702652422', true, true, DATE '2026-08-29'),
    ('Szentkirályi', 'W/2026/1702597', true, true, DATE '2026-08-11'),
    ('Szentkirályi', '101627/2026', true, true, DATE '2026-08-18'),
    ('Szentkirályi', '13032/2026', true, true, DATE '2026-08-18'),
    ('Szentkirályi', 'B06081/2026', true, true, DATE '2026-08-18'),
    ('Szentkirályi', 'MV-2026/33452', true, true, DATE '2026-08-25'),
    ('Szentkirályi', 'ESZLA-2610463', true, false, NULL),
    ('Szentkirályi', '104693/2026', true, true, DATE '2026-08-25'),
    ('Szentkirályi', '105820/2026', true, true, DATE '2026-09-01'),
    ('Szentkirályi', '2026-PXL4/031643', true, true, DATE '2026-08-21'),
    ('Szentkirályi', '702659469', true, false, NULL),
    ('Szentkirályi', '261083912', true, false, NULL),
    ('Szentkirályi', '110817/2026', true, false, NULL),
    ('Szentkirályi', '14468/2026', true, false, NULL),
    ('Szentkirályi', 'MV-2026/33772', true, false, NULL)
) AS v(unit_name, invoice_number, megvan, fizetett, paid_at)
 WHERE e.unit_id = u.id
   AND u.name = v.unit_name
   AND e.invoice_number = v.invoice_number
   AND ((v.megvan AND NOT (e.received AND e.scanned)) OR (v.fizetett AND NOT e.paid));

-- ---------------------------------------------------------------------------
-- 3) Ellenőrzés
-- ---------------------------------------------------------------------------
SELECT
  u.name                                                   AS egyseg,
  count(*)                                                 AS atutalasos_szamla,
  count(*) FILTER (WHERE e.received)                       AS beerkezett,
  count(*) FILTER (WHERE e.scanned)                         AS szkennelt,
  count(*) FILTER (WHERE e.paid)                            AS fizetett,
  sum(e.amount)                                            AS osszeg
FROM expenses e
JOIN units u ON u.id = e.unit_id
WHERE e.invoice_date BETWEEN DATE '2026-08-01' AND DATE '2026-08-31'
  AND e.is_official
  AND e.payment_method = 'transfer'
GROUP BY u.name
ORDER BY u.name;
