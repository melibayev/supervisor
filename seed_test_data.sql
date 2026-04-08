-- ═══════════════════════════════════════════════════════════════════════
-- LG Supervisor — Production Seed Data
-- Generated: 2026-04-09
-- All dates are ≤ 2026-04-09, real Uzbekistan locations & names
-- ═══════════════════════════════════════════════════════════════════════

-- ── 0. Clean slate ─────────────────────────────────────────────────────
TRUNCATE TABLE "Notifications"       CASCADE;
TRUNCATE TABLE "AuditLogs"           CASCADE;
TRUNCATE TABLE "VisitComments"       CASCADE;
TRUNCATE TABLE "ProductEntries"      CASCADE;
TRUNCATE TABLE "VisitPhotos"         CASCADE;
TRUNCATE TABLE "VisitSchedules"      CASCADE;
TRUNCATE TABLE "Visits"              CASCADE;
TRUNCATE TABLE "UserStores"          CASCADE;
TRUNCATE TABLE "Stores"              CASCADE;
DELETE FROM "Users" WHERE "Email" NOT IN ('superadmin@lg.com','admin@lg.com');

-- SHA256('Password123!') base64
UPDATE "Users" SET "PasswordHash" = 'bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=' WHERE "Email" IN ('superadmin@lg.com','admin@lg.com');
UPDATE "Users" SET "RegionId" = NULL, "RegionName" = NULL, "Role" = 'SuperAdmin', "AccountStatus" = 0 WHERE "Email" = 'superadmin@lg.com';
UPDATE "Users" SET "RegionId" = 'tashkent', "RegionName" = 'Tashkent', "Role" = 'Admin', "AccountStatus" = 0 WHERE "Email" = 'admin@lg.com';

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM "Users" WHERE "Email" = 'superadmin@lg.com') THEN
    INSERT INTO "Users" ("Id","FullName","Email","PhoneNumber","PasswordHash","Role","AccountStatus","RegionId","RegionName","CreatedAt")
    VALUES ('d4e5f6a7-b8c9-0123-defa-234567890123','System Admin','superadmin@lg.com','+998900000001','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','SuperAdmin',0,NULL,NULL,'2025-09-01');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM "Users" WHERE "Email" = 'admin@lg.com') THEN
    INSERT INTO "Users" ("Id","FullName","Email","PhoneNumber","PasswordHash","Role","AccountStatus","RegionId","RegionName","CreatedAt")
    VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890','Admin Manager','admin@lg.com','+998900000002','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Admin',0,'tashkent','Tashkent','2025-09-01');
  END IF;
END $$;


-- ── 1. Regional Admins (4) ─────────────────────────────────────────────
INSERT INTO "Users" ("Id","FullName","Email","PhoneNumber","PasswordHash","Role","AccountStatus","RegionId","RegionName","CreatedAt") VALUES
('e0000001-0000-0000-0000-000000000001','Rustam Yuldashev','rustam.admin@lg.com','+998901110001','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Admin',0,'samarkand','Samarkand','2025-10-15'),
('e0000001-0000-0000-0000-000000000002','Dilshod Nazarov','dilshod.admin@lg.com','+998901110002','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Admin',0,'fergana','Fergana','2025-10-20'),
('e0000001-0000-0000-0000-000000000003','Nodira Karimova','nodira.admin@lg.com','+998901110003','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Admin',0,'bukhara','Bukhara','2025-11-01'),
('e0000001-0000-0000-0000-000000000004','Aziz Rakhimov','aziz.admin@lg.com','+998901110004','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Admin',0,'andijan','Andijan','2025-11-10');


-- ── 2. Employees (50) — real Uzbek names across 12 regions ─────────────
INSERT INTO "Users" ("Id","FullName","Email","PhoneNumber","PasswordHash","Role","AccountStatus","RegionId","RegionName","CreatedAt") VALUES
-- Tashkent (8)
('a0000001-0001-0000-0000-000000000001','Amir Karimov','amir.karimov@lg.com','+998901200001','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'tashkent','Tashkent','2025-11-01'),
('a0000001-0001-0000-0000-000000000002','Sardor Umarov','sardor.umarov@lg.com','+998901200002','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'tashkent','Tashkent','2025-11-05'),
('a0000001-0001-0000-0000-000000000003','Zilola Saidova','zilola.saidova@lg.com','+998901200003','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'tashkent','Tashkent','2025-11-10'),
('a0000001-0001-0000-0000-000000000004','Bobur Tursunov','bobur.tursunov@lg.com','+998901200004','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'tashkent','Tashkent','2025-11-15'),
('a0000001-0001-0000-0000-000000000005','Nilufar Khamidova','nilufar.khamidova@lg.com','+998901200005','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'tashkent','Tashkent','2025-11-20'),
('a0000001-0001-0000-0000-000000000006','Jasur Mirzaev','jasur.mirzaev@lg.com','+998901200006','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'tashkent','Tashkent','2025-12-01'),
('a0000001-0001-0000-0000-000000000007','Kamola Rashidova','kamola.rashidova@lg.com','+998901200007','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'tashkent','Tashkent','2025-12-05'),
('a0000001-0001-0000-0000-000000000008','Sherzod Alimov','sherzod.alimov@lg.com','+998901200008','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'tashkent','Tashkent','2025-12-10'),
-- Samarkand (5)
('a0000002-0001-0000-0000-000000000001','Timur Ergashev','timur.ergashev@lg.com','+998901200009','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'samarkand','Samarkand','2025-11-12'),
('a0000002-0001-0000-0000-000000000002','Dildora Nishanova','dildora.nishanova@lg.com','+998901200010','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'samarkand','Samarkand','2025-11-18'),
('a0000002-0001-0000-0000-000000000003','Farhod Abdullaev','farhod.abdullaev@lg.com','+998901200011','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'samarkand','Samarkand','2025-11-25'),
('a0000002-0001-0000-0000-000000000004','Gulnora Tashpulatova','gulnora.tashpulatova@lg.com','+998901200012','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'samarkand','Samarkand','2025-12-01'),
('a0000002-0001-0000-0000-000000000005','Ulugbek Rahmatov','ulugbek.rahmatov@lg.com','+998901200013','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'samarkand','Samarkand','2025-12-08'),
-- Fergana (5)
('a0000003-0001-0000-0000-000000000001','Bekzod Yusupov','bekzod.yusupov@lg.com','+998901200014','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'fergana','Fergana','2025-11-10'),
('a0000003-0001-0000-0000-000000000002','Shahnoza Mirzaeva','shahnoza.mirzaeva@lg.com','+998901200015','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'fergana','Fergana','2025-11-20'),
('a0000003-0001-0000-0000-000000000003','Oybek Toshmatov','oybek.toshmatov@lg.com','+998901200016','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'fergana','Fergana','2025-12-01'),
('a0000003-0001-0000-0000-000000000004','Madina Khodjaeva','madina.khodjaeva@lg.com','+998901200017','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'fergana','Fergana','2025-12-10'),
('a0000003-0001-0000-0000-000000000005','Sanjar Valiev','sanjar.valiev@lg.com','+998901200018','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'fergana','Fergana','2025-12-15'),
-- Bukhara (4)
('a0000004-0001-0000-0000-000000000001','Akbar Juraev','akbar.juraev@lg.com','+998901200019','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'bukhara','Bukhara','2025-11-15'),
('a0000004-0001-0000-0000-000000000002','Dilorom Ibragimova','dilorom.ibragimova@lg.com','+998901200020','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'bukhara','Bukhara','2025-11-25'),
('a0000004-0001-0000-0000-000000000003','Nodir Sobirov','nodir.sobirov@lg.com','+998901200021','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'bukhara','Bukhara','2025-12-05'),
('a0000004-0001-0000-0000-000000000004','Zulfiya Kamilova','zulfiya.kamilova@lg.com','+998901200022','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'bukhara','Bukhara','2025-12-15'),
-- Andijan (4)
('a0000005-0001-0000-0000-000000000001','Islom Mamatov','islom.mamatov@lg.com','+998901200023','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'andijan','Andijan','2025-11-18'),
('a0000005-0001-0000-0000-000000000002','Feruza Abdullaeva','feruza.abdullaeva@lg.com','+998901200024','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'andijan','Andijan','2025-12-01'),
('a0000005-0001-0000-0000-000000000003','Mirzo Tursunov','mirzo.tursunov@lg.com','+998901200025','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'andijan','Andijan','2025-12-10'),
('a0000005-0001-0000-0000-000000000004','Nargiza Rakhimova','nargiza.rakhimova@lg.com','+998901200026','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'andijan','Andijan','2025-12-20'),
-- Namangan (4)
('a0000006-0001-0000-0000-000000000001','Abdulaziz Khasanov','abdulaziz.khasanov@lg.com','+998901200027','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'namangan','Namangan','2025-11-22'),
('a0000006-0001-0000-0000-000000000002','Mohira Salimova','mohira.salimova@lg.com','+998901200028','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'namangan','Namangan','2025-12-03'),
('a0000006-0001-0000-0000-000000000003','Ravshan Tojiboyev','ravshan.tojiboyev@lg.com','+998901200029','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'namangan','Namangan','2025-12-12'),
('a0000006-0001-0000-0000-000000000004','Dilnoza Ergasheva','dilnoza.ergasheva@lg.com','+998901200030','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'namangan','Namangan','2025-12-22'),
-- Kashkadarya (4)
('a0000007-0001-0000-0000-000000000001','Behruz Normatov','behruz.normatov@lg.com','+998901200031','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'kashkadarya','Kashkadarya','2025-11-25'),
('a0000007-0001-0000-0000-000000000002','Sabohat Turaeva','sabohat.turaeva@lg.com','+998901200032','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'kashkadarya','Kashkadarya','2025-12-05'),
('a0000007-0001-0000-0000-000000000003','Javlon Ruziev','javlon.ruziev@lg.com','+998901200033','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'kashkadarya','Kashkadarya','2025-12-15'),
('a0000007-0001-0000-0000-000000000004','Yulduz Malikova','yulduz.malikova@lg.com','+998901200034','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'kashkadarya','Kashkadarya','2025-12-25'),
-- Khorezm (3)
('a0000008-0001-0000-0000-000000000001','Otabek Khudoyberdiev','otabek.khudoyberdiev@lg.com','+998901200035','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'khorezm','Khorezm','2025-12-01'),
('a0000008-0001-0000-0000-000000000002','Iroda Yusupova','iroda.yusupova@lg.com','+998901200036','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'khorezm','Khorezm','2025-12-10'),
('a0000008-0001-0000-0000-000000000003','Shukhrat Eshmatov','shukhrat.eshmatov@lg.com','+998901200037','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'khorezm','Khorezm','2025-12-20'),
-- Navoi (3)
('a0000009-0001-0000-0000-000000000001','Dostonbek Nurmatov','dostonbek.nurmatov@lg.com','+998901200038','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'navoi','Navoi','2025-12-05'),
('a0000009-0001-0000-0000-000000000002','Barno Ismoilova','barno.ismoilova@lg.com','+998901200039','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'navoi','Navoi','2025-12-15'),
('a0000009-0001-0000-0000-000000000003','Eldor Kalandarov','eldor.kalandarov@lg.com','+998901200040','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'navoi','Navoi','2025-12-28'),
-- Jizzakh (3)
('a000000a-0001-0000-0000-000000000001','Umid Botirov','umid.botirov@lg.com','+998901200041','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'jizzakh','Jizzakh','2025-12-08'),
('a000000a-0001-0000-0000-000000000002','Muazzam Sultonova','muazzam.sultonova@lg.com','+998901200042','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'jizzakh','Jizzakh','2025-12-18'),
('a000000a-0001-0000-0000-000000000003','Tohir Zokirov','tohir.zokirov@lg.com','+998901200043','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'jizzakh','Jizzakh','2026-01-05'),
-- Sirdaryo (3)
('a000000b-0001-0000-0000-000000000001','Alisher Kholmatov','alisher.kholmatov@lg.com','+998901200044','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'sirdaryo','Sirdaryo','2025-12-10'),
('a000000b-0001-0000-0000-000000000002','Ozoda Mirzakulova','ozoda.mirzakulova@lg.com','+998901200045','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'sirdaryo','Sirdaryo','2025-12-20'),
('a000000b-0001-0000-0000-000000000003','Farrukh Usmanov','farrukh.usmanov@lg.com','+998901200046','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'sirdaryo','Sirdaryo','2026-01-08'),
-- Surkhandarya (4)
('a000000c-0001-0000-0000-000000000001','Laziz Rakhmonov','laziz.rakhmonov@lg.com','+998901200047','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'surkhandarya','Surkhandarya','2025-12-12'),
('a000000c-0001-0000-0000-000000000002','Kumush Sharipova','kumush.sharipova@lg.com','+998901200048','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'surkhandarya','Surkhandarya','2025-12-22'),
('a000000c-0001-0000-0000-000000000003','Husan Boymatov','husan.boymatov@lg.com','+998901200049','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'surkhandarya','Surkhandarya','2026-01-10'),
('a000000c-0001-0000-0000-000000000004','Sitora Qodirova','sitora.qodirova@lg.com','+998901200050','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',0,'surkhandarya','Surkhandarya','2026-01-15');

-- 2 pending registration users
INSERT INTO "Users" ("Id","FullName","Email","PhoneNumber","PasswordHash","Role","AccountStatus","RegionId","RegionName","CreatedAt","RegistrationRequestedAt") VALUES
('a000000d-0001-0000-0000-000000000001','Davron Tashkentov','davron.tashkentov@lg.com','+998901200051','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',1,'tashkent','Tashkent','2026-04-07','2026-04-07'),
('a000000d-0001-0000-0000-000000000002','Laylo Samarkandova','laylo.samarkandova@lg.com','+998901200052','bPMzCEvXTP2iFBSxjGLcLg/GoA9TWG2Dd2JM5XBXHB0=','Employee',1,'samarkand','Samarkand','2026-04-08','2026-04-08');


-- ── 3. Stores (50) — real electronics retail locations across Uzbekistan ──
INSERT INTO "Stores" ("Id","Name","Address","City","RegionId","RegionName","Latitude","Longitude","GeofenceRadius","CreatedAt") VALUES
-- Tashkent (10)
('b0000001-0001-0000-0000-000000000001','Texnomart Sergeli','Yangi Sergeli, 7A','Tashkent','tashkent','Tashkent',41.2253,69.2282,50,'2025-10-01'),
('b0000001-0001-0000-0000-000000000002','Mediapark Chilanzar','Bunyodkor Ave, 56','Tashkent','tashkent','Tashkent',41.2887,69.2041,50,'2025-10-01'),
('b0000001-0001-0000-0000-000000000003','Texnomart Yunusabad','Amir Temur Ave, 108','Tashkent','tashkent','Tashkent',41.3452,69.2845,60,'2025-10-05'),
('b0000001-0001-0000-0000-000000000004','Elmakon Mega Planet','Darvoza St, 2','Tashkent','tashkent','Tashkent',41.3110,69.2790,50,'2025-10-10'),
('b0000001-0001-0000-0000-000000000005','Samsung Store Tashkent City','Tashkent City Mall, B12','Tashkent','tashkent','Tashkent',41.3151,69.2487,40,'2025-10-15'),
('b0000001-0001-0000-0000-000000000006','Artel Showroom','Oybek St, 34','Tashkent','tashkent','Tashkent',41.3104,69.2715,50,'2025-10-20'),
('b0000001-0001-0000-0000-000000000007','Texnomart NEXT Beruniy','Beruniy Ave, 44','Tashkent','tashkent','Tashkent',41.3275,69.2205,55,'2025-10-25'),
('b0000001-0001-0000-0000-000000000008','Mediapark Samarqand Darvoza','Samarqand Darvoza, 1','Tashkent','tashkent','Tashkent',41.3024,69.2670,50,'2025-11-01'),
('b0000001-0001-0000-0000-000000000009','Aster Market Yakkasaray','Yakkasaray, 18B','Tashkent','tashkent','Tashkent',41.2940,69.2680,50,'2025-11-05'),
('b0000001-0001-0000-0000-000000000010','Idea Store Mirzo Ulugbek','Mirzo Ulugbek Ave, 73','Tashkent','tashkent','Tashkent',41.3380,69.3350,50,'2025-11-10'),
-- Samarkand (5)
('b0000002-0001-0000-0000-000000000001','Texnomart Samarkand','Gagarin St, 75','Samarkand','samarkand','Samarkand',39.6542,66.9597,50,'2025-10-08'),
('b0000002-0001-0000-0000-000000000002','Mediapark Samarkand','Amir Temur St, 22','Samarkand','samarkand','Samarkand',39.6518,66.9652,50,'2025-10-15'),
('b0000002-0001-0000-0000-000000000003','Samarkand Electronics','Registan Ave, 10','Samarkand','samarkand','Samarkand',39.6547,66.9759,45,'2025-10-22'),
('b0000002-0001-0000-0000-000000000004','Digital House Samarkand','Navoi St, 48','Samarkand','samarkand','Samarkand',39.6612,66.9580,50,'2025-11-01'),
('b0000002-0001-0000-0000-000000000005','Smart Electronics','Rudaki St, 15','Samarkand','samarkand','Samarkand',39.6490,66.9710,50,'2025-11-10'),
-- Fergana (5)
('b0000003-0001-0000-0000-000000000001','Texnomart Fergana','Mustaqillik Ave, 32','Fergana','fergana','Fergana',40.3842,71.7870,50,'2025-10-10'),
('b0000003-0001-0000-0000-000000000002','Elmakon Fergana','Al-Fergani St, 8','Fergana','fergana','Fergana',40.3785,71.7942,50,'2025-10-20'),
('b0000003-0001-0000-0000-000000000003','Digital World Margilan','Amir Temur Ave, 5','Margilan','fergana','Fergana',40.4735,71.7244,50,'2025-11-01'),
('b0000003-0001-0000-0000-000000000004','Kokand Electronics Center','Istiqlol St, 60','Kokand','fergana','Fergana',40.5283,70.9426,55,'2025-11-10'),
('b0000003-0001-0000-0000-000000000005','Fergana Valley Tech','Navoi St, 14','Fergana','fergana','Fergana',40.3810,71.7815,50,'2025-11-20'),
-- Bukhara (4)
('b0000004-0001-0000-0000-000000000001','Texnomart Bukhara','Navoi Ave, 11','Bukhara','bukhara','Bukhara',39.7747,64.4286,50,'2025-10-12'),
('b0000004-0001-0000-0000-000000000002','Elmakon Bukhara','Mustaqillik St, 23','Bukhara','bukhara','Bukhara',39.7710,64.4220,50,'2025-10-25'),
('b0000004-0001-0000-0000-000000000003','Smart Shop Bukhara','Hamza St, 7','Bukhara','bukhara','Bukhara',39.7680,64.4150,50,'2025-11-05'),
('b0000004-0001-0000-0000-000000000004','Digital Bukhara Plaza','Ikbol St, 34','Bukhara','bukhara','Bukhara',39.7790,64.4350,55,'2025-11-15'),
-- Andijan (4)
('b0000005-0001-0000-0000-000000000001','Texnomart Andijan','Babur Ave, 45','Andijan','andijan','Andijan',40.7830,72.3442,50,'2025-10-14'),
('b0000005-0001-0000-0000-000000000002','Mediapark Andijan','Navoi St, 31','Andijan','andijan','Andijan',40.7856,72.3380,50,'2025-10-28'),
('b0000005-0001-0000-0000-000000000003','Asaka Electronics','Amir Temur St, 12','Asaka','andijan','Andijan',40.6415,72.2340,50,'2025-11-08'),
('b0000005-0001-0000-0000-000000000004','Andijan Digital Hub','Cho''lpon Ave, 8','Andijan','andijan','Andijan',40.7790,72.3510,50,'2025-11-18'),
-- Namangan (4)
('b0000006-0001-0000-0000-000000000001','Texnomart Namangan','Uychi St, 20','Namangan','namangan','Namangan',40.9983,71.6726,50,'2025-10-16'),
('b0000006-0001-0000-0000-000000000002','Elmakon Namangan','Navoi Ave, 55','Namangan','namangan','Namangan',41.0010,71.6690,50,'2025-10-30'),
('b0000006-0001-0000-0000-000000000003','Chust Electronics','Istiqlol St, 9','Chust','namangan','Namangan',41.0038,71.2359,50,'2025-11-12'),
('b0000006-0001-0000-0000-000000000004','Namangan Tech Center','Amir Temur St, 18','Namangan','namangan','Namangan',41.0020,71.6780,55,'2025-11-22'),
-- Kashkadarya (4)
('b0000007-0001-0000-0000-000000000001','Texnomart Qarshi','Nasaf St, 33','Qarshi','kashkadarya','Kashkadarya',38.8562,65.7985,50,'2025-10-18'),
('b0000007-0001-0000-0000-000000000002','Elmakon Qarshi','Mustaqillik Ave, 12','Qarshi','kashkadarya','Kashkadarya',38.8520,65.8020,50,'2025-11-01'),
('b0000007-0001-0000-0000-000000000003','Shahrisabz Digital','Amir Temur St, 40','Shahrisabz','kashkadarya','Kashkadarya',39.0581,66.8346,50,'2025-11-15'),
('b0000007-0001-0000-0000-000000000004','Qarshi Digital Market','Ipak Yuli St, 6','Qarshi','kashkadarya','Kashkadarya',38.8600,65.7920,50,'2025-11-25'),
-- Khorezm (3)
('b0000008-0001-0000-0000-000000000001','Texnomart Urgench','Al-Khorezmi Ave, 52','Urgench','khorezm','Khorezm',41.5530,60.6318,50,'2025-10-20'),
('b0000008-0001-0000-0000-000000000002','Elmakon Urgench','Beruni St, 18','Urgench','khorezm','Khorezm',41.5510,60.6350,50,'2025-11-05'),
('b0000008-0001-0000-0000-000000000003','Khiva Electronics','Ichan Qala Ave, 3','Khiva','khorezm','Khorezm',41.3784,60.3639,50,'2025-11-20'),
-- Navoi (3)
('b0000009-0001-0000-0000-000000000001','Texnomart Navoi','Galaba Ave, 25','Navoi','navoi','Navoi',40.1034,65.3792,50,'2025-10-22'),
('b0000009-0001-0000-0000-000000000002','Navoi Digital Center','Navoi St, 42','Navoi','navoi','Navoi',40.1000,65.3750,50,'2025-11-08'),
('b0000009-0001-0000-0000-000000000003','Zarafshon Electronics','Amir Temur Ave, 15','Zarafshon','navoi','Navoi',41.5719,64.1942,50,'2025-11-22'),
-- Jizzakh (3)
('b000000a-0001-0000-0000-000000000001','Texnomart Jizzakh','Rashidov Ave, 38','Jizzakh','jizzakh','Jizzakh',40.1158,67.8422,50,'2025-10-25'),
('b000000a-0001-0000-0000-000000000002','Elmakon Jizzakh','Sharof St, 14','Jizzakh','jizzakh','Jizzakh',40.1130,67.8460,50,'2025-11-10'),
('b000000a-0001-0000-0000-000000000003','Jizzakh Electronics Hub','Navoiy Ave, 7','Jizzakh','jizzakh','Jizzakh',40.1180,67.8380,50,'2025-11-25'),
-- Sirdaryo (2)
('b000000b-0001-0000-0000-000000000001','Texnomart Gulistan','Mustaqillik Ave, 52','Gulistan','sirdaryo','Sirdaryo',40.4894,68.7842,50,'2025-10-28'),
('b000000b-0001-0000-0000-000000000002','Sirdaryo Tech Center','Ipak Yuli St, 22','Gulistan','sirdaryo','Sirdaryo',40.4870,68.7880,50,'2025-11-15'),
-- Surkhandarya (3)
('b000000c-0001-0000-0000-000000000001','Texnomart Termez','Firdavsiy Ave, 30','Termez','surkhandarya','Surkhandarya',37.2242,67.2783,50,'2025-11-01'),
('b000000c-0001-0000-0000-000000000002','Elmakon Termez','Amir Temur St, 19','Termez','surkhandarya','Surkhandarya',37.2210,67.2820,50,'2025-11-15'),
('b000000c-0001-0000-0000-000000000003','Denov Electronics','Navoiy St, 11','Denov','surkhandarya','Surkhandarya',38.2714,67.8936,50,'2025-12-01');


-- ── 4. User ↔ Store Assignments ────────────────────────────────────────
INSERT INTO "UserStores" ("UserId","StoreId","AssignedAt") VALUES
-- Tashkent employees → stores
('a0000001-0001-0000-0000-000000000001','b0000001-0001-0000-0000-000000000001','2025-11-15'),
('a0000001-0001-0000-0000-000000000001','b0000001-0001-0000-0000-000000000002','2025-11-15'),
('a0000001-0001-0000-0000-000000000001','b0000001-0001-0000-0000-000000000003','2025-12-01'),
('a0000001-0001-0000-0000-000000000002','b0000001-0001-0000-0000-000000000003','2025-11-20'),
('a0000001-0001-0000-0000-000000000002','b0000001-0001-0000-0000-000000000004','2025-11-20'),
('a0000001-0001-0000-0000-000000000003','b0000001-0001-0000-0000-000000000005','2025-11-25'),
('a0000001-0001-0000-0000-000000000003','b0000001-0001-0000-0000-000000000006','2025-11-25'),
('a0000001-0001-0000-0000-000000000004','b0000001-0001-0000-0000-000000000007','2025-12-01'),
('a0000001-0001-0000-0000-000000000004','b0000001-0001-0000-0000-000000000008','2025-12-01'),
('a0000001-0001-0000-0000-000000000005','b0000001-0001-0000-0000-000000000001','2025-12-05'),
('a0000001-0001-0000-0000-000000000005','b0000001-0001-0000-0000-000000000009','2025-12-05'),
('a0000001-0001-0000-0000-000000000006','b0000001-0001-0000-0000-000000000002','2025-12-10'),
('a0000001-0001-0000-0000-000000000006','b0000001-0001-0000-0000-000000000010','2025-12-10'),
('a0000001-0001-0000-0000-000000000007','b0000001-0001-0000-0000-000000000004','2025-12-15'),
('a0000001-0001-0000-0000-000000000007','b0000001-0001-0000-0000-000000000005','2025-12-15'),
('a0000001-0001-0000-0000-000000000008','b0000001-0001-0000-0000-000000000006','2025-12-20'),
('a0000001-0001-0000-0000-000000000008','b0000001-0001-0000-0000-000000000008','2025-12-20'),
-- Samarkand
('a0000002-0001-0000-0000-000000000001','b0000002-0001-0000-0000-000000000001','2025-12-01'),
('a0000002-0001-0000-0000-000000000001','b0000002-0001-0000-0000-000000000002','2025-12-01'),
('a0000002-0001-0000-0000-000000000002','b0000002-0001-0000-0000-000000000002','2025-12-05'),
('a0000002-0001-0000-0000-000000000002','b0000002-0001-0000-0000-000000000003','2025-12-05'),
('a0000002-0001-0000-0000-000000000003','b0000002-0001-0000-0000-000000000003','2025-12-10'),
('a0000002-0001-0000-0000-000000000003','b0000002-0001-0000-0000-000000000004','2025-12-10'),
('a0000002-0001-0000-0000-000000000004','b0000002-0001-0000-0000-000000000004','2025-12-15'),
('a0000002-0001-0000-0000-000000000004','b0000002-0001-0000-0000-000000000005','2025-12-15'),
('a0000002-0001-0000-0000-000000000005','b0000002-0001-0000-0000-000000000001','2025-12-20'),
('a0000002-0001-0000-0000-000000000005','b0000002-0001-0000-0000-000000000005','2025-12-20'),
-- Fergana
('a0000003-0001-0000-0000-000000000001','b0000003-0001-0000-0000-000000000001','2025-12-01'),
('a0000003-0001-0000-0000-000000000001','b0000003-0001-0000-0000-000000000002','2025-12-01'),
('a0000003-0001-0000-0000-000000000002','b0000003-0001-0000-0000-000000000002','2025-12-05'),
('a0000003-0001-0000-0000-000000000002','b0000003-0001-0000-0000-000000000003','2025-12-05'),
('a0000003-0001-0000-0000-000000000003','b0000003-0001-0000-0000-000000000003','2025-12-10'),
('a0000003-0001-0000-0000-000000000003','b0000003-0001-0000-0000-000000000004','2025-12-10'),
('a0000003-0001-0000-0000-000000000004','b0000003-0001-0000-0000-000000000004','2025-12-15'),
('a0000003-0001-0000-0000-000000000004','b0000003-0001-0000-0000-000000000005','2025-12-15'),
('a0000003-0001-0000-0000-000000000005','b0000003-0001-0000-0000-000000000001','2025-12-20'),
('a0000003-0001-0000-0000-000000000005','b0000003-0001-0000-0000-000000000005','2025-12-20'),
-- Bukhara
('a0000004-0001-0000-0000-000000000001','b0000004-0001-0000-0000-000000000001','2025-12-01'),
('a0000004-0001-0000-0000-000000000001','b0000004-0001-0000-0000-000000000002','2025-12-01'),
('a0000004-0001-0000-0000-000000000002','b0000004-0001-0000-0000-000000000002','2025-12-05'),
('a0000004-0001-0000-0000-000000000002','b0000004-0001-0000-0000-000000000003','2025-12-05'),
('a0000004-0001-0000-0000-000000000003','b0000004-0001-0000-0000-000000000003','2025-12-10'),
('a0000004-0001-0000-0000-000000000003','b0000004-0001-0000-0000-000000000004','2025-12-10'),
('a0000004-0001-0000-0000-000000000004','b0000004-0001-0000-0000-000000000001','2025-12-15'),
('a0000004-0001-0000-0000-000000000004','b0000004-0001-0000-0000-000000000004','2025-12-15'),
-- Andijan
('a0000005-0001-0000-0000-000000000001','b0000005-0001-0000-0000-000000000001','2025-12-01'),
('a0000005-0001-0000-0000-000000000001','b0000005-0001-0000-0000-000000000002','2025-12-01'),
('a0000005-0001-0000-0000-000000000002','b0000005-0001-0000-0000-000000000002','2025-12-05'),
('a0000005-0001-0000-0000-000000000002','b0000005-0001-0000-0000-000000000003','2025-12-05'),
('a0000005-0001-0000-0000-000000000003','b0000005-0001-0000-0000-000000000003','2025-12-10'),
('a0000005-0001-0000-0000-000000000003','b0000005-0001-0000-0000-000000000004','2025-12-10'),
('a0000005-0001-0000-0000-000000000004','b0000005-0001-0000-0000-000000000001','2025-12-15'),
('a0000005-0001-0000-0000-000000000004','b0000005-0001-0000-0000-000000000004','2025-12-15'),
-- Namangan
('a0000006-0001-0000-0000-000000000001','b0000006-0001-0000-0000-000000000001','2025-12-01'),
('a0000006-0001-0000-0000-000000000001','b0000006-0001-0000-0000-000000000002','2025-12-01'),
('a0000006-0001-0000-0000-000000000002','b0000006-0001-0000-0000-000000000002','2025-12-05'),
('a0000006-0001-0000-0000-000000000002','b0000006-0001-0000-0000-000000000003','2025-12-05'),
('a0000006-0001-0000-0000-000000000003','b0000006-0001-0000-0000-000000000003','2025-12-10'),
('a0000006-0001-0000-0000-000000000003','b0000006-0001-0000-0000-000000000004','2025-12-10'),
('a0000006-0001-0000-0000-000000000004','b0000006-0001-0000-0000-000000000001','2025-12-15'),
('a0000006-0001-0000-0000-000000000004','b0000006-0001-0000-0000-000000000004','2025-12-15'),
-- Kashkadarya
('a0000007-0001-0000-0000-000000000001','b0000007-0001-0000-0000-000000000001','2025-12-05'),
('a0000007-0001-0000-0000-000000000001','b0000007-0001-0000-0000-000000000002','2025-12-05'),
('a0000007-0001-0000-0000-000000000002','b0000007-0001-0000-0000-000000000002','2025-12-10'),
('a0000007-0001-0000-0000-000000000002','b0000007-0001-0000-0000-000000000003','2025-12-10'),
('a0000007-0001-0000-0000-000000000003','b0000007-0001-0000-0000-000000000003','2025-12-15'),
('a0000007-0001-0000-0000-000000000003','b0000007-0001-0000-0000-000000000004','2025-12-15'),
('a0000007-0001-0000-0000-000000000004','b0000007-0001-0000-0000-000000000001','2025-12-20'),
('a0000007-0001-0000-0000-000000000004','b0000007-0001-0000-0000-000000000004','2025-12-20'),
-- Khorezm
('a0000008-0001-0000-0000-000000000001','b0000008-0001-0000-0000-000000000001','2025-12-10'),
('a0000008-0001-0000-0000-000000000001','b0000008-0001-0000-0000-000000000002','2025-12-10'),
('a0000008-0001-0000-0000-000000000002','b0000008-0001-0000-0000-000000000002','2025-12-15'),
('a0000008-0001-0000-0000-000000000002','b0000008-0001-0000-0000-000000000003','2025-12-15'),
('a0000008-0001-0000-0000-000000000003','b0000008-0001-0000-0000-000000000001','2025-12-20'),
('a0000008-0001-0000-0000-000000000003','b0000008-0001-0000-0000-000000000003','2025-12-20'),
-- Navoi
('a0000009-0001-0000-0000-000000000001','b0000009-0001-0000-0000-000000000001','2025-12-15'),
('a0000009-0001-0000-0000-000000000001','b0000009-0001-0000-0000-000000000002','2025-12-15'),
('a0000009-0001-0000-0000-000000000002','b0000009-0001-0000-0000-000000000002','2025-12-20'),
('a0000009-0001-0000-0000-000000000002','b0000009-0001-0000-0000-000000000003','2025-12-20'),
('a0000009-0001-0000-0000-000000000003','b0000009-0001-0000-0000-000000000001','2026-01-05'),
('a0000009-0001-0000-0000-000000000003','b0000009-0001-0000-0000-000000000003','2026-01-05'),
-- Jizzakh
('a000000a-0001-0000-0000-000000000001','b000000a-0001-0000-0000-000000000001','2025-12-15'),
('a000000a-0001-0000-0000-000000000001','b000000a-0001-0000-0000-000000000002','2025-12-15'),
('a000000a-0001-0000-0000-000000000002','b000000a-0001-0000-0000-000000000002','2025-12-20'),
('a000000a-0001-0000-0000-000000000002','b000000a-0001-0000-0000-000000000003','2025-12-20'),
('a000000a-0001-0000-0000-000000000003','b000000a-0001-0000-0000-000000000001','2026-01-10'),
('a000000a-0001-0000-0000-000000000003','b000000a-0001-0000-0000-000000000003','2026-01-10'),
-- Sirdaryo
('a000000b-0001-0000-0000-000000000001','b000000b-0001-0000-0000-000000000001','2025-12-20'),
('a000000b-0001-0000-0000-000000000001','b000000b-0001-0000-0000-000000000002','2025-12-20'),
('a000000b-0001-0000-0000-000000000002','b000000b-0001-0000-0000-000000000001','2025-12-25'),
('a000000b-0001-0000-0000-000000000002','b000000b-0001-0000-0000-000000000002','2025-12-25'),
('a000000b-0001-0000-0000-000000000003','b000000b-0001-0000-0000-000000000001','2026-01-15'),
('a000000b-0001-0000-0000-000000000003','b000000b-0001-0000-0000-000000000002','2026-01-15'),
-- Surkhandarya
('a000000c-0001-0000-0000-000000000001','b000000c-0001-0000-0000-000000000001','2025-12-20'),
('a000000c-0001-0000-0000-000000000001','b000000c-0001-0000-0000-000000000002','2025-12-20'),
('a000000c-0001-0000-0000-000000000002','b000000c-0001-0000-0000-000000000002','2025-12-25'),
('a000000c-0001-0000-0000-000000000002','b000000c-0001-0000-0000-000000000003','2025-12-25'),
('a000000c-0001-0000-0000-000000000003','b000000c-0001-0000-0000-000000000001','2026-01-15'),
('a000000c-0001-0000-0000-000000000003','b000000c-0001-0000-0000-000000000003','2026-01-15'),
('a000000c-0001-0000-0000-000000000004','b000000c-0001-0000-0000-000000000001','2026-01-20'),
('a000000c-0001-0000-0000-000000000004','b000000c-0001-0000-0000-000000000003','2026-01-20');


-- ══════════════════════════════════════════════════════════════════════
-- ── 5. Visits — completed with real GPS (Jan 2026 – Apr 9 2026) ────
-- ══════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_id uuid;
  v_user_id uuid;
  v_store_id uuid;
  v_store_lat double precision;
  v_store_lng double precision;
  v_region_id text;
  v_checkin timestamp;
  v_checkout timestamp;
  v_ci_lat double precision;
  v_ci_lng double precision;
  v_co_lat double precision;
  v_co_lng double precision;
  v_dist double precision;
  v_review text;
  v_review_admin uuid;
  v_review_at timestamp;
  v_review_comment text;
  v_requires_revisit boolean;
  v_rand double precision;
  v_day_offset int;
  v_hour int;
  v_minute int;
  v_duration_minutes int;
  rec record;
  admin_ids uuid[] := ARRAY[
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    'e0000001-0000-0000-0000-000000000001'::uuid,
    'e0000001-0000-0000-0000-000000000002'::uuid,
    'e0000001-0000-0000-0000-000000000003'::uuid,
    'e0000001-0000-0000-0000-000000000004'::uuid
  ];
  review_comments text[] := ARRAY[
    'Good display arrangement, products well organized',
    'Shelves need restocking, please coordinate with store manager',
    'Excellent work, all LG products properly showcased',
    'Missing price tags on several items, needs follow-up',
    'Great customer engagement noted during visit',
    'Product demo area needs improvement',
    'All promotional materials properly placed',
    'Some products not in designated positions',
    'Very thorough visit, all checkpoints covered',
    'Store compliance meets LG standards'
  ];
  reject_comments text[] := ARRAY[
    'Photos are blurry, please revisit and take clear photos',
    'Visit duration too short, not all areas covered',
    'Missing shelf photos for the electronics section',
    'GPS location does not match store vicinity',
    'Incomplete product count, needs re-verification'
  ];
  visit_count int := 0;
BEGIN
  FOR rec IN
    SELECT us."UserId", us."StoreId", s."Latitude", s."Longitude", s."RegionId"
    FROM "UserStores" us
    JOIN "Stores" s ON s."Id" = us."StoreId"
  LOOP
    FOR i IN 1..( 2 + floor(random()*3)::int ) LOOP
      v_id := gen_random_uuid();
      v_user_id := rec."UserId";
      v_store_id := rec."StoreId";
      v_store_lat := rec."Latitude";
      v_store_lng := rec."Longitude";
      v_region_id := rec."RegionId";

      v_day_offset := 5 + floor(random() * 93)::int;
      v_hour := 8 + floor(random() * 9)::int;
      v_minute := floor(random() * 60)::int;
      v_checkin := '2026-01-01'::timestamp + (v_day_offset || ' days')::interval + (v_hour || ' hours')::interval + (v_minute || ' minutes')::interval;

      IF v_checkin >= '2026-04-09 23:59:59'::timestamp THEN CONTINUE; END IF;

      v_duration_minutes := 15 + floor(random() * 75)::int;
      v_checkout := v_checkin + (v_duration_minutes || ' minutes')::interval;

      v_ci_lat := v_store_lat + (random() - 0.5) * 0.0004;
      v_ci_lng := v_store_lng + (random() - 0.5) * 0.0004;
      v_co_lat := v_store_lat + (random() - 0.5) * 0.0004;
      v_co_lng := v_store_lng + (random() - 0.5) * 0.0004;
      v_dist := 2 + random() * 33;

      v_rand := random();
      IF v_rand < 0.55 THEN
        v_review := 'Approved';
        v_review_admin := admin_ids[1 + floor(random() * 5)::int];
        v_review_at := v_checkout + ((1 + floor(random() * 48))::int || ' hours')::interval;
        v_review_comment := review_comments[1 + floor(random() * 10)::int];
        v_requires_revisit := false;
      ELSIF v_rand < 0.70 THEN
        v_review := 'Rejected';
        v_review_admin := admin_ids[1 + floor(random() * 5)::int];
        v_review_at := v_checkout + ((1 + floor(random() * 24))::int || ' hours')::interval;
        v_review_comment := reject_comments[1 + floor(random() * 5)::int];
        v_requires_revisit := (random() > 0.4);
      ELSE
        v_review := NULL;
        v_review_admin := NULL;
        v_review_at := NULL;
        v_review_comment := NULL;
        v_requires_revisit := NULL;
      END IF;

      INSERT INTO "Visits" (
        "Id","UserId","StoreId","CheckInTime","CheckOutTime",
        "CheckInLatitude","CheckInLongitude","CheckOutLatitude","CheckOutLongitude",
        "DistanceFromStore","GpsVerified","Status","Notes",
        "ReviewStatus","ReviewedByAdminId","ReviewedAt","ReviewComment","RequiresRevisit"
      ) VALUES (
        v_id, v_user_id, v_store_id, v_checkin, v_checkout,
        round(v_ci_lat::numeric, 6), round(v_ci_lng::numeric, 6),
        round(v_co_lat::numeric, 6), round(v_co_lng::numeric, 6),
        round(v_dist::numeric, 1), true, 'Completed', NULL,
        v_review, v_review_admin, v_review_at, v_review_comment, v_requires_revisit
      );
      visit_count := visit_count + 1;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'Inserted % visits', visit_count;
END $$;


-- ══════════════════════════════════════════════════════════════════════
-- ── 6. Product Entries — 2-4 LG products per visit ─────────────────
-- ══════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v record;
  prod_count int;
  p_category text;
  p_model text;
  p_display text;
  p_qty int;
  p_price numeric;
  categories text[] := ARRAY['TV','Refrigerator','Washing Machine','AC','Monitor','Soundbar','Microwave','Laptop'];
  tv_models text[] := ARRAY['OLED55C4','OLED65G4','NanoCell55','UHD50UR','OLED77B4','QNED85','UHD43UP'];
  fridge_models text[] := ARRAY['GR-H802HLHU','GC-B257SLUV','GR-X267CQES','GC-L257SLRL','GR-F589BLCZ'];
  washer_models text[] := ARRAY['F4V5VYP2T','F2V5HS2S','FH4G7TDN5','F4J6TY0WW','F4V5RYP0T'];
  ac_models text[] := ARRAY['S4-Q18KL3AD','S4-Q12JA3A','P18SP','S4NQ24K23AE','AMNQ12GSJB0'];
  monitor_models text[] := ARRAY['27GP850-B','32UN880-B','34WN80C-B','27UK850-W','24QP750-B'];
  soundbar_models text[] := ARRAY['SP7Y','SN8YG','SC9S','SP11RA','SE6S'];
  micro_models text[] := ARRAY['MS2595CIS','MH6535GIS','MS2535GIR','MJ3965BIS','MH6565CIS'];
  laptop_models text[] := ARRAY['Gram 17','Gram 16','Gram 15','Gram 14','UltraPC 16'];
  displays text[] := ARRAY['OLED','NanoCell','LED','QNED','IPS'];
BEGIN
  FOR v IN SELECT "Id" FROM "Visits" LOOP
    prod_count := 2 + floor(random() * 3)::int;
    FOR i IN 1..prod_count LOOP
      p_category := categories[1 + floor(random() * 8)::int];
      p_display := displays[1 + floor(random() * 5)::int];
      p_qty := 1 + floor(random() * 8)::int;
      CASE p_category
        WHEN 'TV' THEN p_model := tv_models[1 + floor(random()*7)::int]; p_price := 3500000 + floor(random()*15000000);
        WHEN 'Refrigerator' THEN p_model := fridge_models[1 + floor(random()*5)::int]; p_price := 5000000 + floor(random()*12000000);
        WHEN 'Washing Machine' THEN p_model := washer_models[1 + floor(random()*5)::int]; p_price := 3000000 + floor(random()*8000000);
        WHEN 'AC' THEN p_model := ac_models[1 + floor(random()*5)::int]; p_price := 4000000 + floor(random()*10000000);
        WHEN 'Monitor' THEN p_model := monitor_models[1 + floor(random()*5)::int]; p_price := 2000000 + floor(random()*6000000);
        WHEN 'Soundbar' THEN p_model := soundbar_models[1 + floor(random()*5)::int]; p_price := 1500000 + floor(random()*5000000);
        WHEN 'Microwave' THEN p_model := micro_models[1 + floor(random()*5)::int]; p_price := 800000 + floor(random()*3000000);
        WHEN 'Laptop' THEN p_model := laptop_models[1 + floor(random()*5)::int]; p_price := 8000000 + floor(random()*20000000);
        ELSE p_model := 'Unknown'; p_price := 1000000;
      END CASE;
      INSERT INTO "ProductEntries" ("Id","VisitId","Brand","Category","Model","DisplayType","Quantity","Price","Notes")
      VALUES (gen_random_uuid(), v."Id", 'LG', p_category, p_model, p_display, p_qty, p_price, NULL);
    END LOOP;
  END LOOP;
END $$;


-- ══════════════════════════════════════════════════════════════════════
-- ── 7. Visit Schedules — past & upcoming ───────────────────────────
-- ══════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  rec record;
  sched_id uuid;
  due timestamp;
  sched_status text;
  actual_visit uuid;
  day_offset int;
  sched_count int := 0;
  admin_id uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;
  regional_admins uuid[];
  creator uuid;
  notes_arr text[] := ARRAY[
    'Check LG TV display wall',
    'Verify new product placement',
    'Monthly compliance check',
    'Restock verification needed',
    'Prioritize premium product area',
    'Check promotional banner installation',
    NULL, NULL, NULL
  ];
BEGIN
  FOR rec IN
    SELECT us."UserId", us."StoreId", s."RegionId"
    FROM "UserStores" us
    JOIN "Stores" s ON s."Id" = us."StoreId"
  LOOP
    -- 2-4 past schedules
    FOR i IN 1..( 2 + floor(random()*3)::int ) LOOP
      sched_id := gen_random_uuid();
      day_offset := 10 + floor(random() * 85)::int;
      due := '2026-01-01'::timestamp + (day_offset || ' days')::interval + '17:00:00'::interval;
      IF due >= '2026-04-09'::timestamp THEN CONTINUE; END IF;

      SELECT ARRAY_AGG(u."Id") INTO regional_admins
      FROM "Users" u WHERE u."Role" = 'Admin' AND u."RegionId" = rec."RegionId";
      IF regional_admins IS NOT NULL AND array_length(regional_admins, 1) > 0 THEN
        creator := regional_admins[1 + floor(random() * array_length(regional_admins, 1))::int];
        IF creator IS NULL THEN creator := admin_id; END IF;
      ELSE
        creator := admin_id;
      END IF;

      SELECT v."Id" INTO actual_visit
      FROM "Visits" v
      WHERE v."UserId" = rec."UserId" AND v."StoreId" = rec."StoreId"
        AND v."CheckInTime" BETWEEN (due - interval '5 days') AND (due + interval '2 days')
        AND v."Status" = 'Completed'
      LIMIT 1;

      IF actual_visit IS NOT NULL THEN
        sched_status := 'Completed';
      ELSE
        IF random() < 0.6 THEN sched_status := 'Missed'; ELSE sched_status := 'Cancelled'; END IF;
      END IF;

      INSERT INTO "VisitSchedules" ("Id","EmployeeId","StoreId","DueDate","DueTime","Status","ActualVisitId","AdminNotes","CreatedByAdminId","CreatedAt","UpdatedAt")
      VALUES (
        sched_id, rec."UserId", rec."StoreId", due, '17:00:00',
        sched_status, CASE WHEN sched_status = 'Completed' THEN actual_visit ELSE NULL END,
        notes_arr[1 + floor(random()*9)::int], creator,
        due - (floor(random()*7+1) || ' days')::interval, due
      );
      sched_count := sched_count + 1;
    END LOOP;

    -- 1 future Pending schedule (Apr 10-25)
    sched_id := gen_random_uuid();
    day_offset := 1 + floor(random() * 16)::int;
    due := '2026-04-09'::timestamp + (day_offset || ' days')::interval + '17:00:00'::interval;

    SELECT ARRAY_AGG(u."Id") INTO regional_admins
    FROM "Users" u WHERE u."Role" = 'Admin' AND u."RegionId" = rec."RegionId";
    IF regional_admins IS NOT NULL AND array_length(regional_admins, 1) > 0 THEN
      creator := regional_admins[1 + floor(random() * array_length(regional_admins, 1))::int];
      IF creator IS NULL THEN creator := admin_id; END IF;
    ELSE
      creator := admin_id;
    END IF;

    INSERT INTO "VisitSchedules" ("Id","EmployeeId","StoreId","DueDate","DueTime","Status","ActualVisitId","AdminNotes","CreatedByAdminId","CreatedAt","UpdatedAt")
    VALUES (
      sched_id, rec."UserId", rec."StoreId", due, '17:00:00',
      'Pending', NULL,
      notes_arr[1 + floor(random()*9)::int], creator,
      '2026-04-08'::timestamp + (floor(random()*24) || ' hours')::interval,
      '2026-04-08'::timestamp + (floor(random()*24) || ' hours')::interval
    );
    sched_count := sched_count + 1;
  END LOOP;
  RAISE NOTICE 'Inserted % schedules', sched_count;
END $$;


-- ══════════════════════════════════════════════════════════════════════
-- ── 8. Visit Comments ──────────────────────────────────────────────
-- ══════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v record;
  admin_comments text[] := ARRAY[
    'Good work on this visit, keep it up',
    'Please ensure all product tags are visible next time',
    'The display arrangement looks great',
    'Need better quality photos of the shelf area',
    'Follow up with the store manager about the empty shelf space',
    'Excellent report, very thorough documentation',
    'Schedule a follow-up visit for the demo area',
    'Please coordinate with HQ about the missing SKUs'
  ];
  emp_comments text[] := ARRAY[
    'Thank you for the feedback, will improve next visit',
    'Noted, I will coordinate with the store manager',
    'The store was quite busy, will take more time next visit',
    'Will bring better photos next time',
    'Understood, scheduling a follow-up this week',
    'The store manager confirmed restocking is in progress'
  ];
  comment_count int := 0;
BEGIN
  FOR v IN
    SELECT "Id", "UserId", "ReviewedByAdminId", "ReviewedAt"
    FROM "Visits"
    WHERE "ReviewStatus" IS NOT NULL AND "ReviewedByAdminId" IS NOT NULL
    AND random() < 0.35
  LOOP
    INSERT INTO "VisitComments" ("Id","VisitId","AuthorId","Text","AuthorRole","CreatedAt","IsRead")
    VALUES (
      gen_random_uuid(), v."Id", v."ReviewedByAdminId",
      admin_comments[1 + floor(random()*8)::int],
      'Admin',
      v."ReviewedAt" + ((10 + floor(random()*120))::int || ' minutes')::interval,
      true
    );
    comment_count := comment_count + 1;

    IF random() < 0.6 THEN
      INSERT INTO "VisitComments" ("Id","VisitId","AuthorId","Text","AuthorRole","CreatedAt","IsRead")
      VALUES (
        gen_random_uuid(), v."Id", v."UserId",
        emp_comments[1 + floor(random()*6)::int],
        'Employee',
        v."ReviewedAt" + ((60 + floor(random()*480))::int || ' minutes')::interval,
        (random() > 0.3)
      );
      comment_count := comment_count + 1;
    END IF;
  END LOOP;
  RAISE NOTICE 'Inserted % comments', comment_count;
END $$;


-- ══════════════════════════════════════════════════════════════════════
-- ── 9. Notifications ───────────────────────────────────────────────
-- ══════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  vr record;
  sr record;
  notif_count int := 0;
BEGIN
  FOR vr IN SELECT "Id","UserId","ReviewedAt" FROM "Visits" WHERE "ReviewStatus"='Approved' AND "ReviewedAt" IS NOT NULL LOOP
    INSERT INTO "Notifications" ("Id","RecipientId","Type","Title","Body","IsRead","CreatedAt","RelatedEntityId","RelatedEntityType")
    VALUES (gen_random_uuid(), vr."UserId", 'VisitApproved', 'Visit Approved', 'Your visit has been approved', (random()>0.3), vr."ReviewedAt", vr."Id"::text, 'Visit');
    notif_count := notif_count + 1;
  END LOOP;

  FOR vr IN SELECT "Id","UserId","ReviewedAt" FROM "Visits" WHERE "ReviewStatus"='Rejected' AND "ReviewedAt" IS NOT NULL LOOP
    INSERT INTO "Notifications" ("Id","RecipientId","Type","Title","Body","IsRead","CreatedAt","RelatedEntityId","RelatedEntityType")
    VALUES (gen_random_uuid(), vr."UserId", 'VisitRejected', 'Visit Rejected', 'Your visit has been rejected, please check comments', (random()>0.5), vr."ReviewedAt", vr."Id"::text, 'Visit');
    notif_count := notif_count + 1;
  END LOOP;

  FOR sr IN SELECT "Id","EmployeeId","CreatedAt" FROM "VisitSchedules" WHERE "Status"='Pending' LOOP
    INSERT INTO "Notifications" ("Id","RecipientId","Type","Title","Body","IsRead","CreatedAt","RelatedEntityId","RelatedEntityType")
    VALUES (gen_random_uuid(), sr."EmployeeId", 'ScheduleCreated', 'New Schedule', 'A new visit has been scheduled for you', false, sr."CreatedAt", sr."Id"::text, 'Schedule');
    notif_count := notif_count + 1;
  END LOOP;

  FOR sr IN SELECT "Id","EmployeeId","DueDate" FROM "VisitSchedules" WHERE "Status"='Missed' LOOP
    INSERT INTO "Notifications" ("Id","RecipientId","Type","Title","Body","IsRead","CreatedAt","RelatedEntityId","RelatedEntityType")
    VALUES (gen_random_uuid(), sr."EmployeeId", 'ScheduleMissed', 'Schedule Missed', 'You missed a scheduled visit', (random()>0.4), sr."DueDate" + interval '1 day', sr."Id"::text, 'Schedule');
    notif_count := notif_count + 1;
  END LOOP;

  FOR vr IN
    SELECT vis."Id", vis."UserId", vis."CheckOutTime", st."RegionId"
    FROM "Visits" vis JOIN "Stores" st ON st."Id" = vis."StoreId"
    WHERE vis."CheckOutTime" > '2026-03-01' AND vis."Status" = 'Completed'
  LOOP
    INSERT INTO "Notifications" ("Id","RecipientId","Type","Title","Body","IsRead","CreatedAt","RelatedEntityId","RelatedEntityType")
    SELECT gen_random_uuid(), u."Id", 'VisitSubmitted', 'Visit Submitted', 'An employee submitted a visit for review',
      (random()>0.3), vr."CheckOutTime", vr."Id"::text, 'Visit'
    FROM "Users" u WHERE u."Role" = 'Admin' AND (u."RegionId" = vr."RegionId" OR u."RegionId" IS NULL)
    LIMIT 1;
    notif_count := notif_count + 1;
  END LOOP;

  RAISE NOTICE 'Inserted % notifications', notif_count;
END $$;


-- ══════════════════════════════════════════════════════════════════════
-- ── 10. Audit Logs ─────────────────────────────────────────────────
-- ══════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  vr record;
  sr record;
  emp record;
  sched_rec record;
  asgn record;
  admin_id uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;
  log_count int := 0;
BEGIN
  -- Employee logins
  FOR emp IN SELECT "Id","FullName","RegionId" FROM "Users" WHERE "Role"='Employee' AND "AccountStatus"=0 LOOP
    FOR i IN 1..( 2 + floor(random()*4)::int ) LOOP
      INSERT INTO "AuditLogs" ("Id","UserId","Action","EntityType","EntityId","EntityName","Description","IpAddress","Timestamp","RegionId")
      VALUES (
        gen_random_uuid(), emp."Id", 'Login', 'Auth', emp."Id"::text, emp."FullName",
        emp."FullName" || ' logged in',
        '10.' || (floor(random()*255))::int || '.' || (floor(random()*255))::int || '.' || (floor(random()*255))::int,
        '2026-03-10'::timestamp + ((floor(random()*30))::int || ' days')::interval + ((floor(random()*14)+7)::int || ' hours')::interval,
        emp."RegionId"
      );
      log_count := log_count + 1;
    END LOOP;
  END LOOP;

  -- Visit reviews
  FOR vr IN
    SELECT vis."Id", vis."ReviewedByAdminId", vis."ReviewedAt", vis."ReviewStatus", u."FullName" as emp_name, st."Name" as store_name, st."RegionId"
    FROM "Visits" vis
    JOIN "Users" u ON u."Id" = vis."UserId"
    JOIN "Stores" st ON st."Id" = vis."StoreId"
    WHERE vis."ReviewStatus" IS NOT NULL AND vis."ReviewedByAdminId" IS NOT NULL
  LOOP
    INSERT INTO "AuditLogs" ("Id","UserId","Action","EntityType","EntityId","EntityName","Description","IpAddress","Timestamp","RegionId")
    VALUES (
      gen_random_uuid(), vr."ReviewedByAdminId",
      CASE WHEN vr."ReviewStatus" = 'Approved' THEN 'VisitApproved' ELSE 'VisitRejected' END,
      'Visit', vr."Id"::text, vr.store_name,
      vr.emp_name || '''s visit to ' || vr.store_name || ' ' || lower(vr."ReviewStatus"),
      '10.0.1.' || (floor(random()*255))::int,
      vr."ReviewedAt", vr."RegionId"
    );
    log_count := log_count + 1;
  END LOOP;

  -- CheckIn logs (~40%)
  FOR vr IN
    SELECT vis."Id", vis."UserId", vis."CheckInTime", u."FullName", st."Name" as store_name, st."RegionId"
    FROM "Visits" vis JOIN "Users" u ON u."Id" = vis."UserId" JOIN "Stores" st ON st."Id" = vis."StoreId"
    WHERE random() < 0.4
  LOOP
    INSERT INTO "AuditLogs" ("Id","UserId","Action","EntityType","EntityId","EntityName","Description","IpAddress","Timestamp","RegionId")
    VALUES (
      gen_random_uuid(), vr."UserId", 'CheckIn', 'Visit', vr."Id"::text, vr.store_name,
      vr."FullName" || ' checked in at ' || vr.store_name,
      '10.' || (floor(random()*255))::int || '.' || (floor(random()*255))::int || '.' || (floor(random()*255))::int,
      vr."CheckInTime", vr."RegionId"
    );
    log_count := log_count + 1;
  END LOOP;

  -- Schedule created logs (~50%)
  FOR sched_rec IN
    SELECT vs."Id", vs."CreatedByAdminId", vs."CreatedAt", u."FullName" as emp_name, st."Name" as store_name, st."RegionId"
    FROM "VisitSchedules" vs JOIN "Users" u ON u."Id" = vs."EmployeeId" JOIN "Stores" st ON st."Id" = vs."StoreId"
    WHERE random() < 0.5
  LOOP
    INSERT INTO "AuditLogs" ("Id","UserId","Action","EntityType","EntityId","EntityName","Description","IpAddress","Timestamp","RegionId")
    VALUES (
      gen_random_uuid(), sched_rec."CreatedByAdminId", 'ScheduleCreated', 'Schedule', sched_rec."Id"::text, sched_rec.store_name,
      'Schedule created for ' || sched_rec.emp_name || ' at ' || sched_rec.store_name,
      '10.0.1.' || (floor(random()*255))::int, sched_rec."CreatedAt", sched_rec."RegionId"
    );
    log_count := log_count + 1;
  END LOOP;

  -- Store creation logs
  FOR sr IN SELECT "Id","Name","RegionId","CreatedAt" FROM "Stores" LOOP
    INSERT INTO "AuditLogs" ("Id","UserId","Action","EntityType","EntityId","EntityName","Description","IpAddress","Timestamp","RegionId")
    VALUES (gen_random_uuid(), admin_id, 'StoreCreated', 'Store', sr."Id"::text, sr."Name", 'Store "' || sr."Name" || '" created', '10.0.1.1', sr."CreatedAt", sr."RegionId");
    log_count := log_count + 1;
  END LOOP;

  -- Assignment logs (~50%)
  FOR asgn IN
    SELECT us."UserId", us."StoreId", us."AssignedAt", u."FullName", st."Name" as store_name, st."RegionId"
    FROM "UserStores" us JOIN "Users" u ON u."Id" = us."UserId" JOIN "Stores" st ON st."Id" = us."StoreId"
    WHERE random() < 0.5
  LOOP
    INSERT INTO "AuditLogs" ("Id","UserId","Action","EntityType","EntityId","EntityName","Description","IpAddress","Timestamp","RegionId")
    VALUES (gen_random_uuid(), admin_id, 'AssignStore', 'UserStore', asgn."UserId"::text, asgn.store_name, asgn."FullName" || ' assigned to ' || asgn.store_name, '10.0.1.1', asgn."AssignedAt", asgn."RegionId");
    log_count := log_count + 1;
  END LOOP;

  RAISE NOTICE 'Inserted % audit logs', log_count;
END $$;


-- ══════════════════════════════════════════════════════════════════════
-- ── 11. Final counts ───────────────────────────────────────────────
-- ══════════════════════════════════════════════════════════════════════
SELECT 'Users' as "Table", count(*) as "Count" FROM "Users"
UNION ALL SELECT 'Stores', count(*) FROM "Stores"
UNION ALL SELECT 'UserStores', count(*) FROM "UserStores"
UNION ALL SELECT 'Visits', count(*) FROM "Visits"
UNION ALL SELECT 'ProductEntries', count(*) FROM "ProductEntries"
UNION ALL SELECT 'VisitSchedules', count(*) FROM "VisitSchedules"
UNION ALL SELECT 'VisitComments', count(*) FROM "VisitComments"
UNION ALL SELECT 'Notifications', count(*) FROM "Notifications"
UNION ALL SELECT 'AuditLogs', count(*) FROM "AuditLogs"
ORDER BY "Table";
