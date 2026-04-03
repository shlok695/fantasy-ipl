BEGIN TRANSACTION;
CREATE TABLE "AuctionState" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "currentPlayerId" TEXT,
    "highestBid" REAL NOT NULL DEFAULT 0,
    "highestBidderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "readyTeams" TEXT, "updatedAt" DATETIME,
    CONSTRAINT "AuctionState_currentPlayerId_fkey" FOREIGN KEY ("currentPlayerId") REFERENCES "Player" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AuctionState_highestBidderId_fkey" FOREIGN KEY ("highestBidderId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "AuctionState" VALUES('global',NULL,0.0,NULL,'WAITING',NULL,1774308360098);
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" INTEGER,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "acquisition" TEXT,
    "type" TEXT,
    "role" TEXT,
    "iplTeam" TEXT,
    "basePrice" TEXT,
    "auctionPrice" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT,
    CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "Player" VALUES('3ee002b8-d676-495f-a277-e7b3bdaddb3a',NULL,'CSK',NULL,NULL,NULL,'IPL TEAM',NULL,'2.00 Cr',NULL,1774061702984,1774308359986,NULL);
INSERT INTO "Player" VALUES('77b0d67b-92c0-4a8d-badc-db568f342684',NULL,'DC',NULL,NULL,NULL,'IPL TEAM',NULL,'2.00 Cr',NULL,1774061703075,1774308359986,NULL);
INSERT INTO "Player" VALUES('5572ef66-6808-47d0-8695-d5098a95539c',NULL,'GT',NULL,NULL,NULL,'IPL TEAM',NULL,'2.00 Cr',NULL,1774061703166,1774308359986,NULL);
INSERT INTO "Player" VALUES('15ff5c5c-6e1f-463b-9873-9f25636d4b54',NULL,'KKR',NULL,NULL,NULL,'IPL TEAM',NULL,'2.00 Cr',NULL,1774061703256,1774308359986,NULL);
INSERT INTO "Player" VALUES('95b87cbf-8192-4677-bbf8-420e14f5d420',NULL,'LSG',NULL,NULL,NULL,'IPL TEAM',NULL,'2.00 Cr',NULL,1774061703347,1774308359986,NULL);
INSERT INTO "Player" VALUES('7a0c3fc7-3f75-47d3-b9e9-63c8ec576874',NULL,'MI',NULL,NULL,NULL,'IPL TEAM',NULL,'2.00 Cr',NULL,1774061703438,1774308359986,NULL);
INSERT INTO "Player" VALUES('8538694a-399d-47e2-b0a4-3d3921b7ead3',NULL,'PBKS',NULL,NULL,NULL,'IPL TEAM',NULL,'2.00 Cr',NULL,1774061703530,1774308359986,NULL);
INSERT INTO "Player" VALUES('186b0d63-6701-412c-8b34-498b6dbf6c2d',NULL,'RR',NULL,NULL,NULL,'IPL TEAM',NULL,'2.00 Cr',NULL,1774061703620,1774308359986,NULL);
INSERT INTO "Player" VALUES('2c0c57d5-5b2b-40ff-a270-187f2b889723',NULL,'RCB',NULL,NULL,NULL,'IPL TEAM',NULL,'2.00 Cr',NULL,1774061703711,1774308359986,NULL);
INSERT INTO "Player" VALUES('12b3ceb0-96cc-4df8-b3ba-c9f9fbc77702',NULL,'SRH',NULL,NULL,NULL,'IPL TEAM',NULL,'2.00 Cr',NULL,1774061703802,1774308359986,NULL);
INSERT INTO "Player" VALUES('ce64d609-d18c-432e-98a2-7763a6a42005',1,'Ruturaj Gaikwad','Indian','Sold','Indian (capped)','Batter','CSK','2.00 Cr',1.129999999999999e+01,1774061703956,1774308359986,'55cb9368-0165-419a-a01f-a04c270b5b9e');
INSERT INTO "Player" VALUES('779db798-9549-43f1-9326-346bb99c6063',2,'MS Dhoni','Indian','Sold','Indian (uncapped)','Wicketkeeper','CSK','2.00 Cr',5.4,1774061704050,1774308359986,'2e112e76-dec4-4c19-8fe2-835b70222b5d');
INSERT INTO "Player" VALUES('3fb50ff4-d14f-4609-bc88-9fe9c5193ba2',3,'Dewald Brevis','South African','Sold','Overseas (capped)','Batter','CSK','2.00 Cr',6.0,1774061704142,1774308359986,'5181196d-01b3-498c-bf32-bbd679e87efb');
INSERT INTO "Player" VALUES('4980ae21-33ea-4775-b021-658b28ebb13f',4,'Ayush Mhatre','Indian','Sold','Indian (uncapped)','Batter','CSK','2.00 Cr',3.2,1774061704233,1774308359986,'c2abbdc5-7fda-4f5c-982a-8f39bea7ea6e');
INSERT INTO "Player" VALUES('9507fa03-da20-4106-a8cc-8aef30e38615',5,'Urvil Patel','Indian','Unsold','Indian (uncapped)','Wicketkeeper','CSK','2.00 Cr',NULL,1774061704323,1774308359986,NULL);
INSERT INTO "Player" VALUES('67d0386d-a14e-4ccf-a4ef-1ee9c013678b',6,'Anshul Kamboj','Indian','Sold','Indian (capped)','All-rounder','CSK','2.00 Cr',3.6,1774061704514,1774308359986,'5181196d-01b3-498c-bf32-bbd679e87efb');
INSERT INTO "Player" VALUES('489d2983-b247-4fff-a8ad-2c61956f0667',7,'Jamie Overton','English',NULL,'Overseas (capped)','Bowler','CSK','2.00 Cr',NULL,1774061704605,1774308359986,NULL);
INSERT INTO "Player" VALUES('a5872b1c-d7cf-4f76-acea-adee9a846796',8,'Ramakrishna Ghosh','Indian',NULL,'Indian (uncapped)','All-rounder','CSK','2.00 Cr',NULL,1774061704695,1774308359986,NULL);
INSERT INTO "Player" VALUES('d7f5a7bc-88bc-49d1-962b-7eb898bc82a2',9,'Shivam Dube','Indian','Sold','Indian (capped)','All-rounder','CSK','2.00 Cr',10.9,1774061704786,1774308359986,'55cb9368-0165-419a-a01f-a04c270b5b9e');
INSERT INTO "Player" VALUES('66e00708-5186-44dd-b716-839026ef7ba5',10,'Khaleel Ahmed','Indian',NULL,'Indian (capped)','Bowler','CSK','2.00 Cr',NULL,1774061704879,1774308359986,NULL);
INSERT INTO "Player" VALUES('27bdba4c-fe76-4d1f-9e4c-b313261acc93',11,'Noor Ahmad','Afghan','Sold','Overseas (capped)','Bowler','CSK','2.00 Cr',7.30000000000000159e+00,1774061704969,1774308359986,'6466aaec-54c0-4f74-970f-9773c630f0ce');
INSERT INTO "Player" VALUES('d4e24ed7-edc2-4204-a0ff-1b9957914a0f',12,'Mukesh Choudhary','Indian','Unsold','Indian (uncapped)','Bowler','CSK','2.00 Cr',NULL,1774061705060,1774308359986,NULL);
INSERT INTO "Player" VALUES('f1377d7d-6508-4ba8-8a02-82e997e8e53f',13,'Nathan Ellis','Australian','Unsold','Overseas (capped)','Bowler','CSK','2.00 Cr',NULL,1774061705151,1774308359986,NULL);
INSERT INTO "Player" VALUES('da5c24ef-9fb3-4cd2-bfa0-557d75cc0418',14,'Shreyas Gopal','Indian','Sold','Indian (uncapped)','Bowler','CSK','2.00 Cr',3.5,1774061705241,1774308359986,'6466aaec-54c0-4f74-970f-9773c630f0ce');
INSERT INTO "Player" VALUES('ca67996b-71c2-4fe9-8a2e-8843aae02557',15,'Gurjapneet Singh','Indian','Unsold','Indian (uncapped)','Bowler','CSK','2.00 Cr',NULL,1774061705332,1774308359986,NULL);
INSERT INTO "Player" VALUES('e7b89ba7-f560-4a2e-8fcc-5b6d35f7ffde',16,'Sanju Samson','Indian','Sold','Indian (capped)','Wicketkeeper','CSK','2.00 Cr',12.0,1774061705424,1774308359986,'d5c4b13c-ad36-41f4-b9bd-8d37c688b1e4');
INSERT INTO "Player" VALUES('39c29c94-cc62-4f3b-943c-e265c2d66564',17,'Akeal Hosein','West Indian','Unsold','Overseas (capped)','Bowler','CSK','0.50 Cr',NULL,1774061705515,1774308359986,NULL);
INSERT INTO "Player" VALUES('762b3c33-fa9f-4a29-b01c-5979df845f08',18,'Prashant Veer','Indian','Sold','Indian (uncapped)','All-rounder','CSK','2.00 Cr',5.4,1774061705605,1774308359986,'c2abbdc5-7fda-4f5c-982a-8f39bea7ea6e');
INSERT INTO "Player" VALUES('9a533a91-d87f-43ef-b9eb-d3cb50d66dc3',19,'Kartik Sharma','Indian','Sold','Indian (uncapped)','Wicketkeeper','CSK','2.00 Cr',2.2,1774061705696,1774308359986,'5181196d-01b3-498c-bf32-bbd679e87efb');
INSERT INTO "Player" VALUES('8d492dce-644e-4d4d-bbac-9fc6156b3ef2',20,'Matthew Short','Australian','Unsold','Overseas (capped)','All-rounder','CSK','0.50 Cr',NULL,1774061705787,1774308359986,NULL);
INSERT INTO "Player" VALUES('280398d1-180e-496f-babb-ef92d08f0c0b',21,'Aman Khan','Indian',NULL,'Indian (uncapped)','All-rounder','CSK','0.20 Cr',NULL,1774061705877,1774308359986,NULL);
INSERT INTO "Player" VALUES('d480ac7c-9eac-47b8-b026-137b48a5b22f',22,'Sarfaraz Khan','Indian','Sold','Indian (capped)','Batter','CSK','0.20 Cr',5.7,1774061706081,1774308359986,'55cb9368-0165-419a-a01f-a04c270b5b9e');
INSERT INTO "Player" VALUES('3ac21b03-8734-490d-a2de-cd52869edbd2',23,'Rahul Chahar','Indian','Sold','Indian (capped)','Bowler','CSK','0.20 Cr',6.00000000000000088e-01,1774061706172,1774308359986,'2e112e76-dec4-4c19-8fe2-835b70222b5d');
INSERT INTO "Player" VALUES('6354600a-0b8a-4cd8-bcef-9bf46eb8283e',24,'Matt Henry','New Zealander','Sold','Overseas (capped)','Bowler','CSK','0.50 Cr',5.40000000000000213e+00,1774061706263,1774308359986,'c2abbdc5-7fda-4f5c-982a-8f39bea7ea6e');
INSERT INTO "Player" VALUES('36ddcd03-f637-4e88-aed7-ddb52acdc1f4',25,'Zak Foulkes','New Zealander',NULL,'Overseas (capped)','All-rounder','CSK','0.20 Cr',NULL,1774061706353,1774308359986,NULL);
INSERT INTO "Player" VALUES('054e228b-e085-43ae-bc32-223ecb2df29a',1,'KL Rahul','Indian','Sold','Indian (capped)','Wicketkeeper','DC','2.00 Cr',18.6,1774061706443,1774308359986,'d5c4b13c-ad36-41f4-b9bd-8d37c688b1e4');
INSERT INTO "Player" VALUES('dda4b7c3-b94c-43be-b195-fb86bf445af3',2,'Karun Nair','Indian','Unsold','Indian (capped)','Batter','DC','2.00 Cr',NULL,1774061706535,1774308359986,NULL);
INSERT INTO "Player" VALUES('4f06de68-2aab-4744-a908-d145baa653dc',3,'Abishek Porel','Indian','Sold','Idian (uncapped)','Wicketkeeper','DC','2.00 Cr',2.4,1774061706631,1774308359986,'6466aaec-54c0-4f74-970f-9773c630f0ce');
INSERT INTO "Player" VALUES('154be2e6-ea24-4103-a759-c878894dec4b',4,'Tristan Stubbs','South African','Sold','Overseas (capped)','Batter','DC','2.00 Cr',5.0,1774061706777,1774308359986,'d5c4b13c-ad36-41f4-b9bd-8d37c688b1e4');
INSERT INTO "Player" VALUES('659c005c-15fe-4253-9c63-12c333390ff0',5,'Axar Patel','Indian','Sold','Indian (capped)','All-rounder','DC','2.00 Cr',17.0,1774061706868,1774308359986,'d5c4b13c-ad36-41f4-b9bd-8d37c688b1e4');
INSERT INTO "Player" VALUES('89043c68-6100-4ff4-9fb8-526641826716',6,'Sameer Rizvi','Indian','Unsold','Indian (uncapped)','Batter','DC','2.00 Cr',NULL,1774061706959,1774308359986,NULL);
INSERT INTO "Player" VALUES('2cd77f0c-9cef-4fb6-a374-51e68281ac8b',7,'Ashutosh Sharma','Indian','Sold','Indian (uncapped)','Batter','DC','2.00 Cr',5.00000000000000177e+00,1774061707050,1774308359986,'52523a52-1e7e-4ce5-83f4-53dcba2fce17');
INSERT INTO "Player" VALUES('ce261a36-1fa4-4e30-8b84-372dcd01cded',8,'Vipraj Nigam','Indian','Unsold','Indian (uncapped)','All-rounder','DC','2.00 Cr',NULL,1774061707140,1774308359986,NULL);
INSERT INTO "Player" VALUES('2231814a-540d-4f73-a3df-74404736329c',9,'Ajay Mandal','Indian','Unsold','Indian (uncapped)','All-rounder','DC','2.00 Cr',NULL,1774061707231,1774308359986,NULL);
INSERT INTO "Player" VALUES('a24c36b3-3e7f-4a7b-8028-ddc294113aeb',10,'Tripurana Vijay','Indian','Unsold','Indian (uncapped)','All-rounder','DC','2.00 Cr',NULL,1774061707323,1774308359986,NULL);
INSERT INTO "Player" VALUES('c5eaa42b-999c-4c2a-bd73-44fb44ad13d2',11,'Madhav Tiwari','Indian','Unsold','Indian (uncapped)','All-rounder','DC','2.00 Cr',NULL,1774061707414,1774308359986,NULL);
INSERT INTO "Player" VALUES('2ee0e28a-9323-4615-accb-68ddb33ec3ce',12,'Mitchell Starc','Australian','Sold','Overseas (capped)','Bowler','DC','2.00 Cr',13.8,1774061707507,1774308359986,'2e112e76-dec4-4c19-8fe2-835b70222b5d');
INSERT INTO "Player" VALUES('f35c3e5e-ce60-4079-9c98-582cc7d4ec9f',13,'T. Natarajan','Indian','Unsold','Indian (capped)','Bowler','DC','2.00 Cr',NULL,1774061707685,1774308359986,NULL);
INSERT INTO "Player" VALUES('9d00ce0b-d38f-4b30-9839-a03f13ce9e7c',14,'Mukesh Kumar','Indian','Sold','Indian (capped)','Bowler','DC','2.00 Cr',4.0,1774061707775,1774308359986,'2e112e76-dec4-4c19-8fe2-835b70222b5d');
INSERT INTO "Player" VALUES('226ac50d-400e-40d2-b99f-cec6507208b3',15,'Dushmantha Chameera','Sri Lankan',NULL,'Overseas (capped)','Bowler','DC','2.00 Cr',NULL,1774061707866,1774308359986,NULL);
INSERT INTO "Player" VALUES('8ce240a7-5759-42f8-a13e-321a4f0c95d1',16,'Kuldeep Yadav','Indian','Sold','Indian (capped)','Bowler','DC','2.00 Cr',8.89999999999999857e+00,1774061707959,1774308359986,'e517ed6a-f2d5-458e-ab9f-326d57208ee5');
INSERT INTO "Player" VALUES('5bbdd1c7-9560-489b-a9f3-0a24e8f502ec',17,'Nitish Rana','Indian','Sold','Indian (capped)','Batter','DC','2.00 Cr',2.2,1774061708049,1774308359986,'52523a52-1e7e-4ce5-83f4-53dcba2fce17');
INSERT INTO "Player" VALUES('64268d85-3cbf-4cbc-94ee-9f188041f719',18,'Auqib Dar','Indian','Sold','Indian (uncapped)','All-rounder','DC','1.00 Cr',4.4,1774061708140,1774308359986,'c2abbdc5-7fda-4f5c-982a-8f39bea7ea6e');
INSERT INTO "Player" VALUES('9c7d7573-5aa5-4697-8914-c5a69dd55c8e',19,'Ben Duckett','English','Sold','Overseas (capped)','Wicketkeeper','DC','0.50 Cr',8.00000000000000177e+00,1774061708231,1774308359986,'c2abbdc5-7fda-4f5c-982a-8f39bea7ea6e');
INSERT INTO "Player" VALUES('26f376de-21a3-42e6-ab1d-760bec3a2eea',20,'David Miller','South African','Sold','Overseas (capped)','Batter','DC','0.50 Cr',4.1,1774061708322,1774308359986,'2e112e76-dec4-4c19-8fe2-835b70222b5d');
INSERT INTO "Player" VALUES('e7936c4e-d27b-4045-be78-d5a7203f24f2',21,'Pathum Nissanka','Sri Lankan','Unsold','Overseas (capped)','Batter','DC','0.50 Cr',NULL,1774061708413,1774308359986,NULL);
INSERT INTO "Player" VALUES('2d55fbb6-f459-4687-a582-98bd9208523f',22,'Lungi Ngidi','South African','Sold','Overseas (capped)','Bowler','DC','0.50 Cr',3.5,1774061708505,1774308359986,'5181196d-01b3-498c-bf32-bbd679e87efb');
INSERT INTO "Player" VALUES('7f976cfd-0661-4073-ac6b-4fd3db26f985',23,'Sahil Parakh','Indian','Unsold','Indian (uncapped)','Batter','DC','0.20 Cr',NULL,1774061708596,1774308359986,NULL);
INSERT INTO "Player" VALUES('33ff4e7e-352e-40f5-9f07-75a75b9c935a',24,'Prithvi Shaw','Indian','Sold','Indian (capped)','Batter','DC','0.20 Cr',3.0,1774061708686,1774308359986,'52523a52-1e7e-4ce5-83f4-53dcba2fce17');
INSERT INTO "Player" VALUES('15e6cc79-f0bf-44e8-9cde-ea9a4a897e5e',25,'Kyle Jamieson','New Zealander',NULL,'Overseas (capped)','Bowler','DC','0.50 Cr',NULL,1774061708777,1774308359986,NULL);
INSERT INTO "Player" VALUES('329ab755-264d-4759-b6e9-aef8200031dd',1,'Shubman Gill','Indian','Sold','Indian (capped)','Batter','GT','2.00 Cr',16.1,1774061708868,1774308359986,'2e112e76-dec4-4c19-8fe2-835b70222b5d');
INSERT INTO "Player" VALUES('0daafb16-57c4-42f9-8466-3d1c56bdd01a',2,'Sai Sudharsan','Indian','Sold','Indian (capped)','Batter','GT','2.00 Cr',8.79999999999999715e+00,1774061708959,1774308359986,'5181196d-01b3-498c-bf32-bbd679e87efb');
INSERT INTO "Player" VALUES('2e2fcb8c-edf6-4965-9746-b6d285b63253',3,'Kumar Kushagra','Indian','Sold','Indian (uncapped)','Wicketkeeper','GT','2.00 Cr',2.4,1774061709051,1774308359986,'e517ed6a-f2d5-458e-ab9f-326d57208ee5');
INSERT INTO "Player" VALUES('5bce1486-2807-4a96-bcda-1c0ca03aa434',4,'Anuj Rawat','Indian','Unsold','Indian (uncapped)','Wicketkeeper','GT','2.00 Cr',NULL,1774061709253,1774308359986,NULL);
INSERT INTO "Player" VALUES('0b1994ba-4f7d-4957-9306-0cdf882d0e4c',5,'Jos Buttler','English','Sold','Overseas (capped)','Wicketkeeper','GT','2.00 Cr',3.4,1774061709344,1774308359986,'6466aaec-54c0-4f74-970f-9773c630f0ce');
INSERT INTO "Player" VALUES('d17a934d-ae0f-4c2a-bddf-a2c7f20709cd',6,'Nishant Sindhu','Indian','Unsold','Indian (uncapped)','All-rounder','GT','2.00 Cr',NULL,1774061709435,1774308359986,NULL);
INSERT INTO "Player" VALUES('93faf4a1-280a-4caf-82c4-3ffc25cc4211',7,'Glenn Phillips','New Zealander','Sold','Overseas (capped)','All-rounder','GT','2.00 Cr',5.10000000000000142e+00,1774061709526,1774308359986,'d5c4b13c-ad36-41f4-b9bd-8d37c688b1e4');
INSERT INTO "Player" VALUES('fededea9-7352-499a-9c18-7551e149294c',8,'Washington Sundar','Indian','Sold','Indian (capped)','All-rounder','GT','2.00 Cr',5.70000000000000195e+00,1774061709618,1774308359986,'d5c4b13c-ad36-41f4-b9bd-8d37c688b1e4');
INSERT INTO "Player" VALUES('46d3e7d7-4320-435b-945e-946e1a1cb667',9,'Arshad Khan','Indian','Unsold','Indian (uncapped)','Bowler','GT','2.00 Cr',NULL,1774061709709,1774308359986,NULL);
INSERT INTO "Player" VALUES('d2b48dc9-987f-4556-98f7-611432c9d63e',10,'Shahrukh Khan','Indian','Sold','Indian (uncapped)','Batter','GT','2.00 Cr',2.8,1774061709800,1774308359986,'6466aaec-54c0-4f74-970f-9773c630f0ce');
INSERT INTO "Player" VALUES('1a39feb4-6d8a-4f23-921d-16a0cf7f8e25',11,'Rahul Tewatia','Indian',NULL,'Indian (uncapped)','All-rounder','GT','2.00 Cr',NULL,1774061709891,1774308359986,NULL);
INSERT INTO "Player" VALUES('95987773-c3f2-49f4-bb32-f21bb625dcf2',12,'Kagiso Rabada','South African','Sold','Overseas (capped)','Bowler','GT','2.00 Cr',9.0,1774061709981,1774308359986,'e517ed6a-f2d5-458e-ab9f-326d57208ee5');
INSERT INTO "Player" VALUES('36aa46c8-66be-4279-83e0-f3fda25ecde7',13,'Mohammed Siraj','Indian','Sold','Indian (capped)','Bowler','GT','2.00 Cr',11.2,1774061710072,1774308359986,'55cb9368-0165-419a-a01f-a04c270b5b9e');
INSERT INTO "Player" VALUES('f37c2844-406d-4909-9291-7f8396e85739',14,'Prasidh Krishna','Indian','Sold','Indian (capped)','Bowler','GT','2.00 Cr',5.80000000000000159e+00,1774061710164,1774308359986,'6466aaec-54c0-4f74-970f-9773c630f0ce');
INSERT INTO "Player" VALUES('f89a204e-84f5-4f6c-97a0-5b9aa4864bc7',15,'Ishant Sharma','Indian','Sold','Indian (capped)','Bowler','GT','2.00 Cr',3.3,1774061710255,1774308359986,'52523a52-1e7e-4ce5-83f4-53dcba2fce17');
INSERT INTO "Player" VALUES('9ca1fafe-d93f-4fa7-bb9a-a2376e0e3c1e',16,'Gurnoor Singh Brar','Indian','Unsold','Indian (uncapped)','Bowler','GT','2.00 Cr',NULL,1774061710346,1774308359986,NULL);
INSERT INTO "Player" VALUES('48ea2be1-15af-4bf9-9ff8-75cd7dfb65de',17,'Rashid Khan','Afghan','Sold','Overseas (capped)','Bowler','GT','2.00 Cr',2.2,1774061710437,1774308359986,'c2abbdc5-7fda-4f5c-982a-8f39bea7ea6e');
INSERT INTO "Player" VALUES('79d34f4d-3a96-4db5-95e3-0b933e426af3',18,'Manav Suthar','Indian','Unsold','Indian (uncapped)','Bowler','GT','2.00 Cr',NULL,1774061710528,1774308359986,NULL);
INSERT INTO "Player" VALUES('7f37ffdb-76f6-47e4-9431-ec69c068b017',19,'Sai Kishore','Indian','Unsold','Indian (capped)','Bowler','GT','2.00 Cr',NULL,1774061710618,1774308359986,NULL);
INSERT INTO "Player" VALUES('4a81c5d6-f877-4bbd-9615-0aa487aceb36',20,'Jayant Yadav','Indian','Unsold','Indian (capped)','Bowler','GT','2.00 Cr',NULL,1774061710800,1774308359986,NULL);
INSERT INTO "Player" VALUES('01c5d38a-6f1b-44e6-83be-d77a180aee17',21,'Ashok Sharma','Indian','Unsold','Indian (uncapped)','Bowler','GT','0.20 Cr',NULL,1774061710891,1774308359986,NULL);
INSERT INTO "Player" VALUES('22676862-afb5-4402-8515-d6cda44a76ad',22,'Jason Holder','West Indian','Sold','Overseas (capped)','All-rounder','GT','1.00 Cr',1.2,1774061710982,1774308359986,'e517ed6a-f2d5-458e-ab9f-326d57208ee5');
INSERT INTO "Player" VALUES('1cb09b2b-65f4-4d72-b62b-ed8e1a427479',23,'Tom Banton','English','Unsold','Overseas (capped)','Batter','GT','0.50 Cr',NULL,1774061711072,1774308359986,NULL);
INSERT INTO "Player" VALUES('85f239c9-3c74-4eba-8b4d-b5c0b63e2b37',24,'Luke Wood','English','Unsold','Overseas (capped)','Bowler','GT','0.20 Cr',NULL,1774061711163,1774308359986,NULL);
INSERT INTO "Player" VALUES('8a7f37b0-d6b5-4bbd-94f9-af2a7eac6dbf',25,'Prithviraj Yarra','Indian','Unsold','Indian (uncapped)','Bowler','GT','0.20 Cr',NULL,1774061711254,1774308359986,NULL);
INSERT INTO "Player" VALUES('6063559c-91d0-44ae-bb42-1e0bec69ac77',1,'Ajinkya Rahane','Indian','Sold','Indian (capped)','Batter','KKR','2.00 Cr',4.2,1774061711346,1774308359986,'2e112e76-dec4-4c19-8fe2-835b70222b5d');
INSERT INTO "Player" VALUES('a39e9214-ec2f-4a47-8248-08f6447ec91e',2,'Rinku Singh','Indian','Sold','Indian (capped)','Batter','KKR','2.00 Cr',11.0,1774061711437,1774308359986,'d5c4b13c-ad36-41f4-b9bd-8d37c688b1e4');
INSERT INTO "Player" VALUES('ea297e49-96c8-4b66-93a2-ad3d4a10c390',3,'Angkrish Raghuvanshi','Indian','Sold','Indian (uncapped)','Batter','KKR','2.00 Cr',5.0,1774061711528,1774308359986,'e517ed6a-f2d5-458e-ab9f-326d57208ee5');
INSERT INTO "Player" VALUES('8d3d2852-1b5d-4069-8fa7-5046786a20fc',4,'Manish Pandey','Indian','Sold','Indian (capped)','Batter','KKR','2.00 Cr',2.2,1774061711618,1774308359986,'e517ed6a-f2d5-458e-ab9f-326d57208ee5');
INSERT INTO "Player" VALUES('ff721979-3e77-4f70-8706-8ca646b89a16',5,'Rovman Powell','West Indian',NULL,'Overseas (capped)','All-rounder','KKR','2.00 Cr',NULL,1774061711709,1774308359986,NULL);
INSERT INTO "Player" VALUES('d68fd9a4-a772-47bd-b274-24999dd19a00',6,'Anukul Roy','Indian','Unsold','Indian (uncapped)','All-rounder','KKR','2.00 Cr',NULL,1774061711802,1774308359986,NULL);
INSERT INTO "Player" VALUES('a4ee4b86-f073-4d8a-a4fd-b2f1c1ac81a9',7,'Ramandeep Singh','Indian','Sold','Indian (capped)','Batter','KKR','2.00 Cr',4.0,1774061711892,1774308359986,'55cb9368-0165-419a-a01f-a04c270b5b9e');
INSERT INTO "Player" VALUES('bc218121-9863-4d3c-961d-c98e78ae6c99',8,'Vaibhav Arora','Indian',NULL,'Indian (uncapped)','Bowler','KKR','2.00 Cr',NULL,1774061711983,1774308359986,NULL);
INSERT INTO "Player" VALUES('c70296ac-8b48-4ef4-922a-74f449fd5b88',9,'Sunil Narine','West Indian','Sold','Overseas (capped)','All-rounder','KKR','2.00 Cr',12.8,1774061712133,1774308359986,'2e112e76-dec4-4c19-8fe2-835b70222b5d');
INSERT INTO "Player" VALUES('d1ec198b-1001-44b9-9127-87f41f89b08d',10,'Varun Chakaravarthy','Indian','Sold','Indian (capped)','Bowler','KKR','2.00 Cr',12.2,1774061712224,1774308359986,'52523a52-1e7e-4ce5-83f4-53dcba2fce17');
INSERT INTO "Player" VALUES('addb05e4-9d76-463a-b138-a4b14936716a',11,'Harshit Rana','Indian','Unsold','Indian (capped)','Bowler','KKR','2.00 Cr',NULL,1774061712426,1774308359986,NULL);
INSERT INTO "Player" VALUES('5cbffe0c-c9c1-40ee-bf97-ca24bfe686cb',12,'Umran Malik','Indian','Unsold','Indian (capped)','Bowler','KKR','2.00 Cr',NULL,1774061712517,1774308359986,NULL);
INSERT INTO "Player" VALUES('a12e676f-f879-4f04-89a9-6334199d29db',13,'Cameron Green','Australian','Sold','Overseas (capped)','All-rounder','KKR','2.00 Cr',15.3,1774061712609,1774308359986,'6466aaec-54c0-4f74-970f-9773c630f0ce');
INSERT INTO "Player" VALUES('302f6e0b-44ab-4424-805a-bf0c9d50b988',14,'Matheesha Pathirana','Sri Lankan','Unsold','Overseas (capped)','Bowler','KKR','2.00 Cr',NULL,1774061712705,1774308359986,NULL);
INSERT INTO "Player" VALUES('b6d69baf-5057-4d4a-8084-31b6303b5a3e',15,'Finn Allen','New Zealander','Sold','Overseas (capped)','Wicketkeeper','KKR','0.50 Cr',1.06999999999999904e+01,1774061712769,1774308359986,'55cb9368-0165-419a-a01f-a04c270b5b9e');
INSERT INTO "Player" VALUES('17a3b0eb-1353-43d9-b318-7435b21f8448',16,'Tejasvi Singh','Indian','Unsold','Indian (uncapped)','Wicketkeeper','KKR','0.50 Cr',NULL,1774061712860,1774308359986,NULL);
INSERT INTO "Player" VALUES('8922c1a9-3de7-4cd8-a5f0-370f3d18f3d4',17,'Prashant Solanki','Indian','Unsold','Indian (uncapped)','Bowler','KKR','0.20 Cr',NULL,1774061712950,1774308359986,NULL);
INSERT INTO "Player" VALUES('52f9f218-f021-4b51-bc24-2b7e70aba08c',18,'Kartik Tyagi','Indian','Sold','Indian (uncapped)','Bowler','KKR','0.20 Cr',6.00000000000000088e-01,1774061713041,1774308359986,'c2abbdc5-7fda-4f5c-982a-8f39bea7ea6e');
INSERT INTO "Player" VALUES('99c1c172-3b59-4e7a-87a9-dc5f64d69308',19,'Rahul Tripathi','Indian','Unsold','Indian (capped)','Batter','KKR','0.20 Cr',NULL,1774061713133,1774308359986,NULL);
INSERT INTO "Player" VALUES('9d26104d-a693-4be0-8305-30b386e3d8c6',20,'Tim Seifert','New Zealander','Sold','Overseas (capped)','Wicketkeeper','KKR','0.50 Cr',5.20000000000000195e+00,1774061713224,1774308359986,'e517ed6a-f2d5-458e-ab9f-326d57208ee5');
INSERT INTO "Player" VALUES('a4c2c6ed-86ef-4029-8f04-55ae3aa47ed3',21,'Sarthak Ranjan','Indian','Unsold','Indian (uncapped)','All-rounder','KKR','0.20 Cr',NULL,1774061713314,1774308359986,NULL);
INSERT INTO "Player" VALUES('3bbd65cd-7372-4eb0-8dea-c86c18acf569',22,'Daksh Kamra','Indian','Unsold','Indian (uncapped)','All-rounder','KKR','0.20 Cr',NULL,1774061713405,1774308359986,NULL);
INSERT INTO "Player" VALUES('88399d06-ba71-4620-b05f-1f83302c4230',23,'Akash Deep','Indian','Unsold','Indian (capped)','Bowler','KKR','0.20 Cr',NULL,1774061713496,1774308359986,NULL);
INSERT INTO "Player" VALUES('3b362858-4e68-4912-8005-7215f520369c',24,'Rachin Ravindra','New Zealander','Sold','Overseas (capped)','All-rounder','KKR','0.50 Cr',6.20000000000000195e+00,1774061713587,1774308359986,'2e112e76-dec4-4c19-8fe2-835b70222b5d');
INSERT INTO "Player" VALUES('33401fa5-07dc-457e-b141-b84031a6a75a',1,'Rishabh Pant','Indian','Sold','Indian (capped)','Wicketkeeper','LSG','2.00 Cr',14.0,1774061713677,1774308359986,'6466aaec-54c0-4f74-970f-9773c630f0ce');
INSERT INTO "Player" VALUES('31e58c96-0dd9-4de0-82ae-806ab6b85a49',2,'Ayush Badoni','Indian','Sold','Indian (uncapped)','All-rounder','LSG','2.00 Cr',3.2,1774061713769,1774308359986,'55cb9368-0165-419a-a01f-a04c270b5b9e');
INSERT INTO "Player" VALUES('12013265-df6a-4188-aad0-bca2c227b465',3,'Abdul Samad','Indian','Sold','Indian (uncapped)','Batter','LSG','2.00 Cr',4.0,1774061713960,1774308359986,'6466aaec-54c0-4f74-970f-9773c630f0ce');
INSERT INTO "Player" VALUES('e3414fc4-5e33-4852-9a29-0675c7b15ccc',4,'Aiden Markram','South African','Sold','Overseas (capped)','Batter','LSG','2.00 Cr',5.8,1774061714051,1774308359986,'c2abbdc5-7fda-4f5c-982a-8f39bea7ea6e');
INSERT INTO "Player" VALUES('83a15cdc-8fb7-4d1a-9f24-ece524aeaa2f',5,'Himmat Singh','Indian','Unsold','Indian (uncapped)','Batter','LSG','2.00 Cr',NULL,1774061714142,1774308359986,NULL);
INSERT INTO "Player" VALUES('1d2fc34b-4278-4516-bfb6-f0729df977fe',6,'Matthew Breetzke','South African','Unsold','Overseas (capped)','Batter','LSG','2.00 Cr',NULL,1774061714232,1774308359986,NULL);
INSERT INTO "Player" VALUES('20ee6950-c505-4a17-a574-dcc0cc9786c0',7,'Nicholas Pooran','West Indian','Sold','Overseas (capped)','Wicketkeeper','LSG','2.00 Cr',2.2,1774061714323,1774308359986,'2e112e76-dec4-4c19-8fe2-835b70222b5d');
INSERT INTO "Player" VALUES('63abed9b-bac1-49cf-97e1-32d19bbf33b1',8,'Mitchell Marsh','Australian','Sold','Overseas (capped)','Batter','LSG','2.00 Cr',12.2,1774061714415,1774308359986,'e517ed6a-f2d5-458e-ab9f-326d57208ee5');
INSERT INTO "Player" VALUES('1b4d2662-93a7-4785-92b5-0b9be41c0e5b',9,'Shahbaz Ahamad','Indian','Unsold','Indian (uncapped)','All-rounder','LSG','2.00 Cr',NULL,1774061714506,1774308359986,NULL);
INSERT INTO "Player" VALUES('2492f933-e016-456a-a1bc-9431ca545b3e',10,'Arshin Kulkarni','Indian','Unsold','Indian (uncapped)','All-rounder','LSG','2.00 Cr',NULL,1774061714597,1774308359986,NULL);
INSERT INTO "Player" VALUES('87362a00-593a-4a85-bbb4-96fd9bbf7c38',11,'Mayank Yadav','Indian','Unsold','Indian (capped)','Bowler','LSG','2.00 Cr',NULL,1774061714688,1774308359986,NULL);
INSERT INTO "Player" VALUES('1641409d-6e4b-43fe-a257-a3946effbe21',12,'Avesh Khan','Indian','Sold','Indian (capped)','Bowler','LSG','2.00 Cr',2.2,1774061714779,1774308359986,'e517ed6a-f2d5-458e-ab9f-326d57208ee5');
INSERT INTO "Player" VALUES('30919f17-c3ad-402d-aad7-c8c991fd7670',13,'Mohsin Khan','Indian','Unsold','Indian (uncapped)','Bowler','LSG','2.00 Cr',NULL,1774061714871,1774308359986,NULL);
INSERT INTO "Player" VALUES('58fed444-f6be-44b7-8207-8a131182839a',14,'M. Siddharth','Indian','Unsold','Indian (uncapped)','Bowler','LSG','2.00 Cr',NULL,1774061714962,1774308359986,NULL);
INSERT INTO "Player" VALUES('0b9d00b5-0d0a-42d0-a394-d778f724a644',15,'Digvesh Rathi','Indian','Sold','Indian (uncapped)','Bowler','LSG','2.00 Cr',2.2,1774061715053,1774308359986,'5181196d-01b3-498c-bf32-bbd679e87efb');
INSERT INTO "Player" VALUES('b0364d5c-b1a3-4225-bb5b-c69bd266bd59',16,'Prince Yadav','Indian','Unsold','Indian (uncapped)','Bowler','LSG','2.00 Cr',NULL,1774061715143,1774308359986,NULL);
INSERT INTO "Player" VALUES('cbb303c2-5ad2-4660-ae05-f9384cdd7fdb',17,'Akash Singh','Indian','Unsold','Indian (uncapped)','Bowler','LSG','2.00 Cr',NULL,1774061715234,1774308359986,NULL);
INSERT INTO "Player" VALUES('9a96344d-2f5a-40ec-8c25-90a45345f055',18,'Arjun Tendulkar','Indian','Unsold','Indian (uncapped)','Bowler','LSG','2.00 Cr',NULL,1774061715325,1774308359986,NULL);
INSERT INTO "Player" VALUES('ae575888-dbf5-41aa-85cb-ee3b99f59455',19,'Mohammed Shami','Indian','Sold','Indian (capped)','Bowler','LSG','2.00 Cr',10.9,1774061715528,1774308359986,'e517ed6a-f2d5-458e-ab9f-326d57208ee5');
INSERT INTO "Player" VALUES('32bd5f4a-6a56-436c-bb28-34ff115dd31a',20,'Anrich Nortje','South African','Sold','Overseas (capped)','Bowler','LSG','0.50 Cr',3.1,1774061715619,1774308359986,'c2abbdc5-7fda-4f5c-982a-8f39bea7ea6e');
INSERT INTO "Player" VALUES('54b13f16-7fc9-45c0-9edd-b83105fa0a6c',21,'Wanindu Hasaranga','Sri Lankan','Sold','Overseas (capped)','All-rounder','LSG','0.50 Cr',4.3,1774061715710,1774308359986,'2e112e76-dec4-4c19-8fe2-835b70222b5d');
INSERT INTO "Player" VALUES('55c21963-64d7-491d-b916-d75ec6f4f45d',22,'Mukul Choudhary','Indian','Unsold','Indian (uncapped)','Wicketkeeper','LSG','0.50 Cr',NULL,1774061715801,1774308359986,NULL);
INSERT INTO "Player" VALUES('2c66a2f2-4861-4bf6-9780-48ac1926d611',23,'Naman Tiwari','Indian','Unsold','Indian (uncapped)','All-rounder','LSG','0.20 Cr',NULL,1774061715891,1774308359986,NULL);
INSERT INTO "Player" VALUES('e47ec7ca-c07a-4640-bca1-2298d758eba5',24,'Akshat Raghuwanshi','Indian','Unsold','Indian (uncapped)','Batter','LSG','0.50 Cr',NULL,1774061715982,1774308359986,NULL);
INSERT INTO "Player" VALUES('270cce0d-f047-4695-bd20-f485fa5e4708',25,'Josh Inglis','Australian','Unsold','Overseas (capped)','Batter','LSG','1.00 Cr',NULL,1774061716131,1774308359986,NULL);
INSERT INTO "Player" VALUES('20584a70-8552-4646-b928-d41c977ac98e',1,'Rohit Sharma','Indian','Sold','Indian (capped)','Batter','MI','2.00 Cr',14.4,1774061716222,1774308359986,'2e112e76-dec4-4c19-8fe2-835b70222b5d');
INSERT INTO "Player" VALUES('ed375813-1e56-472b-af06-c8673d87d38a',2,'Surya Kumar Yadav','Indian','Sold','Indian (capped)','Batter','MI','2.00 Cr',16.8,1774061716313,1774308359986,'52523a52-1e7e-4ce5-83f4-53dcba2fce17');
INSERT INTO "Player" VALUES('ba35368d-7b45-4575-ad1e-3845ed188876',3,'Robin Minz','Indian','Unsold','Indian (uncapped)','Wicketkeeper','MI','2.00 Cr',NULL,1774061716404,1774308359986,NULL);
INSERT INTO "Player" VALUES('eb4e084d-d92e-4705-8f35-1dc4c76b6936',4,'Ryan Rickelton','South African','Unsold','Overseas (capped)','Wicketkeeper','MI','2.00 Cr',NULL,1774061716495,1774308359986,NULL);
INSERT INTO "Player" VALUES('f62987f5-a08b-454f-8953-e8e2b2c27ce2',5,'Tilak Varma','Indian','Sold','Indian (capped)','Batter','MI','2.00 Cr',18.8,1774061716587,1774308359986,'2e112e76-dec4-4c19-8fe2-835b70222b5d');
INSERT INTO "Player" VALUES('dc53bf81-e43a-4b49-aff2-18c4f1217cfd',6,'Hardik Pandya','Indian','Sold','Indian (capped)','All-rounder','MI','2.00 Cr',22.2,1774061716677,1774308359986,'5181196d-01b3-498c-bf32-bbd679e87efb');
INSERT INTO "Player" VALUES('fa181e52-f5bb-4676-9e36-d363c48181cb',7,'Naman Dhir','Indian','Unsold','Indian (uncapped)','All-rounder','MI','2.00 Cr',NULL,1774061716768,1774308359986,NULL);
INSERT INTO "Player" VALUES('7921718b-d2fd-4967-873a-ba429ddcaffe',8,'Mitchell Santner','New Zealander','Sold','Overseas (capped)','All-rounder','MI','2.00 Cr',5.80000000000000159e+00,1774061716859,1774308359986,'6466aaec-54c0-4f74-970f-9773c630f0ce');
INSERT INTO "Player" VALUES('93fdc81d-0458-4fa2-8923-a4f2ba925789',9,'Will Jacks','Australian','Sold','Overseas (capped)','All-rounder','MI','2.00 Cr',11.2,1774061716950,1774308359986,'d5c4b13c-ad36-41f4-b9bd-8d37c688b1e4');
INSERT INTO "Player" VALUES('15136af2-6443-478d-b6fb-1b0ca70d39bd',10,'Corbin Bosch','South African','Unsold','Overseas (capped)','All-rounder','MI','2.00 Cr',NULL,1774061717270,1774308359986,NULL);
INSERT INTO "Player" VALUES('84b4a06e-cb0b-4f52-9983-042bfa1004ab',11,'Raj Bawa','Indian',NULL,'Indian (uncapped)','All-rounder','MI','2.00 Cr',NULL,1774061717361,1774308359986,NULL);
INSERT INTO "Player" VALUES('d461b18f-addc-4855-9c25-923ae060c78d',12,'Trent Boult','New Zealander','Sold','Overseas (capped)','Bowler','MI','2.00 Cr',4.4,1774061717452,1774308359986,'6466aaec-54c0-4f74-970f-9773c630f0ce');
INSERT INTO "Player" VALUES('fed7e8be-50ce-4415-8a41-15288c7ac5b1',13,'Jasprit Bumrah','Indian','Sold','Indian (capped)','Bowler','MI','2.00 Cr',23.4,1774061717543,1774308359986,'c2abbdc5-7fda-4f5c-982a-8f39bea7ea6e');
INSERT INTO "Player" VALUES('5deec4aa-fe2f-4fcd-9950-24519be3fe66',14,'Deepak Chahar','Indian','Sold','Indian (capped)','Bowler','MI','2.00 Cr',4.2,1774061717635,1774308359986,'55cb9368-0165-419a-a01f-a04c270b5b9e');
INSERT INTO "Player" VALUES('b7ca168b-870e-4ad5-8550-961f5bf4ca08',15,'Ashwani Kumar','Indian','Unsold','Indian (uncapped)','Bowler','MI','2.00 Cr',NULL,1774061717726,1774308359986,NULL);
INSERT INTO "Player" VALUES('92597f4a-b042-4291-9b23-ae193aaa29aa',16,'Raghu Sharma','Indian','Unsold','Indian (uncapped)','Bowler','MI','2.00 Cr',NULL,1774061717817,1774308359986,NULL);
INSERT INTO "Player" VALUES('f938ce61-e29c-4882-9fe0-30caa193c68d',17,'Allah Ghazanfar','Afghan','Unsold','Overseas (capped)','Bowler','MI','2.00 Cr',NULL,1774061717908,1774308359986,NULL);
INSERT INTO "Player" VALUES('e076c544-7d4e-4115-a04b-bb9be4a1ab9c',18,'Mayank Markande','Indian',NULL,'Indian (uncapped)','Bowler','MI','2.00 Cr',NULL,1774061717998,1774308359986,NULL);
INSERT INTO "Player" VALUES('838d2cc5-f722-47e8-bdf4-b4cbd3a11a69',19,'Shardul Thakur','Indian','Sold','Indian (capped)','All-rounder','MI','2.00 Cr',4.0,1774061718089,1774308359986,'e517ed6a-f2d5-458e-ab9f-326d57208ee5');
INSERT INTO "Player" VALUES('22112ebb-efd8-43c7-b292-b91197fecddb',20,'Sherfane Rutherford','West Indian','Sold','Overseas (capped)','Batter','MI','2.00 Cr',8.79999999999999715e+00,1774061718181,1774308359986,'52523a52-1e7e-4ce5-83f4-53dcba2fce17');
INSERT INTO "Player" VALUES('948b31cd-49ee-463f-a94d-8496d6f9cf50',21,'Quinton De Kock','South African','Sold','Overseas (capped)','Wicketkeeper','MI','0.20 Cr',5.0,1774061718272,1774308359986,'5181196d-01b3-498c-bf32-bbd679e87efb');
INSERT INTO "Player" VALUES('d9375b00-4ce4-40c0-9528-be4c76030a10',22,'Atharva Ankolekar','Indian','Unsold','Indian (uncapped)','All-rounder','MI','0.20 Cr',NULL,1774061718363,1774308359986,NULL);
INSERT INTO "Player" VALUES('2981f04c-63ad-4d7f-aeef-2cd4ae0ed865',23,'Mohammad Izhar','Indian','Unsold','Indian (uncapped)','Bowler','MI','0.20 Cr',NULL,1774061718454,1774308359986,NULL);
INSERT INTO "Player" VALUES('9e4d217b-72d5-4f97-b18f-eac0615518f9',24,'Danish Malewar','Indian','Unsold','Indian (uncapped)','Batter','MI','0.20 Cr',NULL,1774061718667,1774308359986,NULL);
INSERT INTO "Player" VALUES('0e3379fa-af50-4652-904c-fe25802b9687',25,'Mayank Rawat','Indian','Unsold','Indian (uncapped)','All-rounder','MI','0.20 Cr',NULL,1774061718759,1774308359986,NULL);
INSERT INTO "Player" VALUES('f977432d-c1ec-4929-84d0-b29077a97901',1,'Shreyas Iyer','Indian','Sold','Indian (capped)','Batter','PBKS','2.00 Cr',5.0,1774061718850,1774308359986,'55cb9368-0165-419a-a01f-a04c270b5b9e');
INSERT INTO "Player" VALUES('89bfe096-81a1-45c3-9437-1be9788712e6',2,'Nehal Wadhera','Indian','Sold','Indian (uncapped)','Batter','PBKS','2.00 Cr',5.6000000000000023e+00,1774061718941,1774308359986,'52523a52-1e7e-4ce5-83f4-53dcba2fce17');
INSERT INTO "Player" VALUES('f23055d9-b1a0-4f99-92f4-cf53d718d43f',3,'Vishnu Vinod','Indian',NULL,'Indian (uncapped)','Wicketkeeper','PBKS','2.00 Cr',NULL,1774061719032,1774308359986,NULL);
INSERT INTO "Player" VALUES('fec6f0c5-428c-4535-8357-6c11fe48c47d',4,'Harnoor Pannu','Indian','Unsold','Indian (uncapped)','Batter','PBKS','2.00 Cr',NULL,1774061719123,1774308359986,NULL);
INSERT INTO "Player" VALUES('0b933fff-1650-4a81-92e5-c325cf49a814',5,'Pyla Avinash','Indian','Unsold','Indian (uncapped)','Batter','PBKS','2.00 Cr',NULL,1774061719214,1774308359986,NULL);
INSERT INTO "Player" VALUES('e94675d7-9929-4853-b28f-ede6be5facbe',6,'Prabhsimran Singh','Indian','Sold','Indian (uncapped)','Wicketkeeper','PBKS','2.00 Cr',8.20000000000000106e+00,1774061719306,1774308359986,'52523a52-1e7e-4ce5-83f4-53dcba2fce17');
INSERT INTO "Player" VALUES('cb7ae8f4-e98b-4f0f-9303-a48af6e73fb9',7,'Shashank Singh','Indian','Sold','Indian (uncapped)','Batter','PBKS','2.00 Cr',2.2,1774061719397,1774308359986,'5181196d-01b3-498c-bf32-bbd679e87efb');
INSERT INTO "Player" VALUES('87d0baea-d848-4b0d-a5f2-aecfe41f4e7c',8,'Marcus Stoinis','Australian','Sold','Overseas (capped)','All-rounder','PBKS','2.00 Cr',13.2,1774061719489,1774308359986,'52523a52-1e7e-4ce5-83f4-53dcba2fce17');
INSERT INTO "Player" VALUES('4e1769a6-536f-4062-ab7a-d1e9d8b1d98d',9,'Harpreet Brar','Indian','Unsold','Indian (uncapped)','All-rounder','PBKS','2.00 Cr',NULL,1774061719578,1774308359986,NULL);
INSERT INTO "Player" VALUES('31909a24-72c3-429d-bb92-93d7f652378f',10,'Marco Jansen','South African','Sold','Overseas (capped)','All-rounder','PBKS','2.00 Cr',8.0,1774061719669,1774308359986,'5181196d-01b3-498c-bf32-bbd679e87efb');
INSERT INTO "Player" VALUES('fd13463a-4db0-4ff6-82af-76d4e04c1b2f',11,'Azmatullah Omarzai','Afghan','Sold','Overseas (capped)','All-rounder','PBKS','2.00 Cr',2.2,1774061719760,1774308359986,'d5c4b13c-ad36-41f4-b9bd-8d37c688b1e4');
INSERT INTO "Player" VALUES('f702cf20-8612-4859-9c00-6ce6515a6dc7',12,'Priyansh Arya','Indian','Sold','Indian (uncapped)','All-rounder','PBKS','2.00 Cr',4.2,1774061719854,1774308359986,'55cb9368-0165-419a-a01f-a04c270b5b9e');
INSERT INTO "Player" VALUES('8a2b16a5-f853-4c4f-962b-1af856273372',13,'Musheer Khan','Indian','Unsold','Indian (uncapped)','All-rounder','PBKS','2.00 Cr',NULL,1774061719943,1774308359986,NULL);
INSERT INTO "Player" VALUES('b21e0fe4-9f0f-48c5-a197-74b90116b783',14,'Suryansh Shedge','Indian','Unsold','Indian (uncapped','All-rounder','PBKS','2.00 Cr',NULL,1774061720034,1774308359986,NULL);
INSERT INTO "Player" VALUES('54d5ca97-26f0-4784-97f9-405636680ec2',15,'Mitch Owen','Australian','Unsold','Overseas (capped)','All-rounder','PBKS','2.00 Cr',NULL,1774061720214,1774308359986,NULL);
INSERT INTO "Player" VALUES('6b39a398-51a5-4804-8bf9-43f102313cc7',16,'Arshdeep Singh','Indian','Sold','Indian (capped)','Bowler','PBKS','2.00 Cr',10.6,1774061720304,1774308359986,'c2abbdc5-7fda-4f5c-982a-8f39bea7ea6e');
INSERT INTO "Player" VALUES('e7abab1b-413a-4741-9ab2-653ae2192ca4',17,'Yuzvendra Chahal','Indian','Unsold','Indian (capped','Bowler','PBKS','2.00 Cr',NULL,1774061720395,1774308359986,NULL);
INSERT INTO "Player" VALUES('b34afa54-40b4-4e7b-ab05-cf92a3c29917',18,'Vyshak Vijaykumar','Indian','Unsold','Indian (uncapped)','Bowler','PBKS','2.00 Cr',NULL,1774061720488,1774308359986,NULL);
INSERT INTO "Player" VALUES('6ae4f3db-495b-4ab1-80c8-dd4c8c67b98d',19,'Yash Thakur','Indian','Sold','Indian (uncapped)','Bowler','PBKS','2.00 Cr',4.7,1774061720578,1774308359986,'e517ed6a-f2d5-458e-ab9f-326d57208ee5');
INSERT INTO "Player" VALUES('71de1e40-a50a-4844-a13f-3cc4cec146f1',20,'Xavier Bartlett','Australian','Unsold','Overseas (capped)','Bowler','PBKS','2.00 Cr',NULL,1774061720669,1774308359986,NULL);
INSERT INTO "Player" VALUES('793d8802-e635-4d7c-b046-966847b2e909',21,'Lockie Ferguson','New Zealander','Sold','Overseas (capped)','Bowler','PBKS','2.00 Cr',2.2,1774061720760,1774308359986,'d5c4b13c-ad36-41f4-b9bd-8d37c688b1e4');
INSERT INTO "Player" VALUES('cc63bdf4-8da7-4e59-a941-43e18decdd5f',22,'Cooper Connolly','Australian','Unsold','Overseas (capped)','All-rounder','PBKS','0.50 Cr',NULL,1774061720851,1774308359986,NULL);
INSERT INTO "Player" VALUES('c7aa65b3-15b5-4d01-9f70-0cc82a3cebef',23,'Ben Dwarshuis','Australian','Unsold','Overseas (capped)','All-rounder','PBKS','0.50 Cr',NULL,1774061720943,1774308359986,NULL);
INSERT INTO "Player" VALUES('701b55a1-bd9c-4de1-94a2-51648d3d7d6b',24,'Vishal Nishad','Indian','Unsold','Indian (uncapped)','Bowler','PBKS','0.20 Cr',NULL,1774061721034,1774308359986,NULL);
INSERT INTO "Player" VALUES('685ba1a6-1551-4f61-8e9c-d76173b3c51b',25,'Pravin Dubey','Indian','Unsold','Indian (uncapped)','Bowler','PBKS','0.20 Cr',NULL,1774061721125,1774308359986,NULL);
INSERT INTO "Player" VALUES('52663e0f-3b3e-4836-9d19-0a7d8cd15525',1,'Shubham Dubey','Indian','Unsold','Indian (uncapped)','Batter','RR','2.00 Cr',NULL,1774061721216,1774308359986,NULL);
INSERT INTO "Player" VALUES('f2cb47c9-26a0-459f-9a5d-ad5f92238ed1',2,'Vaibhav Suryavanshi','Indian','Sold','Indian (uncapped)','Batter','RR','2.00 Cr',11.4,1774061721307,1774308359986,'c2abbdc5-7fda-4f5c-982a-8f39bea7ea6e');
INSERT INTO "Player" VALUES('feb139de-2ec3-426e-8a44-49922a874362',3,'Lhuan-dre Pretorius','South African','Unsold','Overseas (capped)','Batter','RR','2.00 Cr',NULL,1774061721397,1774308359986,NULL);
INSERT INTO "Player" VALUES('a6b99883-972a-4877-a6ff-f5b5996cc892',4,'Shimron Hetmyer','West Indian','Sold','Overseas (capped)','Batter','RR','2.00 Cr',4.60000000000000142e+00,1774061721490,1774308359986,'55cb9368-0165-419a-a01f-a04c270b5b9e');
INSERT INTO "Player" VALUES('effb62d4-a398-40fb-b7fc-93f05f41667f',5,'Yashasvi Jaiswal','Indian','Sold','Indian (capped)','Batter','RR','2.00 Cr',1.13999999999999896e+01,1774061721580,1774308359986,'6466aaec-54c0-4f74-970f-9773c630f0ce');
INSERT INTO "Player" VALUES('c285f2fa-fe0c-4903-b6d9-324e3a3010ee',6,'Dhruv Jurel','Indian','Sold','Indian (capped)','Wicketkeeper','RR','2.00 Cr',8.89999999999999857e+00,1774061721782,1774308359986,'6466aaec-54c0-4f74-970f-9773c630f0ce');
INSERT INTO "Player" VALUES('260c4f18-a5b9-4312-92fb-655d3da8da39',7,'Riyan Parag','Indian','Sold','Indian (capped)','Batter','RR','2.00 Cr',6.00000000000000177e+00,1774061721874,1774308359986,'52523a52-1e7e-4ce5-83f4-53dcba2fce17');
INSERT INTO "Player" VALUES('2a843755-85f8-4795-882c-078f085bde93',8,'Yudhvir Singh Charak','Indian','Unsold','Indian (uncapped)','All-rounder','RR','2.00 Cr',NULL,1774061721964,1774308359986,NULL);
INSERT INTO "Player" VALUES('44259624-03ff-4dc9-aa2f-74aaa48ae2a2',9,'Jofra Archer','English','Sold','Overseas (capped)','Bowler','RR','2.00 Cr',8.20000000000000106e+00,1774061722055,1774308359986,'6466aaec-54c0-4f74-970f-9773c630f0ce');
INSERT INTO "Player" VALUES('5db394e9-2e70-48e2-9237-f1d3e76a0441',10,'Tushar Deshpande','Indian','Unsold','Indian (capped)','Bowler','RR','2.00 Cr',NULL,1774061722148,1774308359986,NULL);
INSERT INTO "Player" VALUES('0c9d95d4-2317-4840-8a05-a5a4b6e6901b',11,'Sandeep Sharma','Indian',NULL,'Indian (uncapped)','Bowler','RR','2.00 Cr',NULL,1774061722238,1774308359986,NULL);
INSERT INTO "Player" VALUES('e6cff7c5-8bbf-469a-ad67-a63193a58cf1',12,'Kwena Maphaka','South African','Unsold','Overseas (capped)','Bowler','RR','2.00 Cr',NULL,1774061722329,1774308359986,NULL);
INSERT INTO "Player" VALUES('e6ea5711-5ae6-4bea-bc6d-5a09647196ad',13,'Nandre Burger','South African','Unsold','Overseas (capped)','Bowler','RR','2.00 Cr',NULL,1774061722420,1774308359986,NULL);
INSERT INTO "Player" VALUES('a330d584-76fe-48c2-b36b-cfad05eaad5e',14,'Ravindra Jadeja','Indian','Sold','Indian (capped)','All-rounder','RR','2.00 Cr',17.0,1774061722511,1774308359986,'6466aaec-54c0-4f74-970f-9773c630f0ce');
INSERT INTO "Player" VALUES('e7d30e94-8f2a-4bdb-8ce0-20c4e80e9026',15,'Sam Curran','English','Unsold','Overseas (capped)','All-rounder','RR','2.00 Cr',NULL,1774061722602,1774308359986,NULL);
INSERT INTO "Player" VALUES('efabbfce-7663-45cb-bb4e-3bd9017c7f45',16,'Donovan Ferreira','South African','Sold','Overseas (capped)','Wicketkeeper','RR','2.00 Cr',6.0,1774061722751,1774308359986,'c2abbdc5-7fda-4f5c-982a-8f39bea7ea6e');
INSERT INTO "Player" VALUES('872891b6-7c1d-42fa-a325-e2d20bbce8ca',17,'Ravi Bishnoi','Indian','Sold','Indian (capped)','Bowler','RR','1.00 Cr',1.2,1774061722846,1774308359986,'55cb9368-0165-419a-a01f-a04c270b5b9e');
INSERT INTO "Player" VALUES('a37119e6-1947-4332-a041-3445105e2546',18,'Sushant Mishra','Indian','Unsold','Indian (uncapped)','Bowler','RR','0.20 Cr',NULL,1774061723029,1774308359986,NULL);
INSERT INTO "Player" VALUES('f0ee9caa-c72d-42d7-92c4-db2a85440be7',19,'Vignesh Puthur','Indian','Unsold','Indian (uncapped)','Bowler','RR','0.20 Cr',NULL,1774061723209,1774308359986,NULL);
INSERT INTO "Player" VALUES('570f40b0-0607-413b-a8f4-a9e1e6dbd4ef',20,'Yash Raj Punja','Indian','Unsold','Indian (uncapped)','Bowler','RR','0.20 Cr',NULL,1774061723300,1774308359986,NULL);
INSERT INTO "Player" VALUES('34c3fbe5-f102-40a2-b64b-5fed6e83f8e1',21,'Ravi Singh','Indian','Sold','Indian (uncapped)','Wicketkeeper','RR','0.20 Cr',0.4,1774061723391,1774308359986,'e517ed6a-f2d5-458e-ab9f-326d57208ee5');
INSERT INTO "Player" VALUES('3737fd07-8bcf-4449-85e6-f0136bfa5239',22,'Brijesh Sharma','Indian','Unsold','Indian (uncapped)','Bowler','RR','0.20 Cr',NULL,1774061723481,1774308359986,NULL);
INSERT INTO "Player" VALUES('36c667d7-2a75-4058-a15d-c5715bf0e61b',23,'Aman Rao','Indian','Unsold','Indian (uncapped)','Batter','RR','0.20 Cr',NULL,1774061723574,1774308359986,NULL);
INSERT INTO "Player" VALUES('fb324b6a-bebf-46be-814a-d2aa379552a7',24,'Adam Milne','New Zealander','Unsold','Overseas (capped)','Bowler','RR','0.50 Cr',NULL,1774061723665,1774308359986,NULL);
INSERT INTO "Player" VALUES('6e4bc385-0c72-45ab-aa8d-5114eaef31c1',25,'Kuldeep Sen','Indian','Unsold','Indian (capped)','Bowler','RR','0.20 Cr',NULL,1774061723755,1774308359986,NULL);
INSERT INTO "Player" VALUES('e554a720-3150-4d72-8d3a-2e05b489aa14',1,'Rajat Patidar','Indian','Sold','Indian (capped','Batter','RCB','2.00 Cr',9.59999999999999786e+00,1774061723846,1774308359986,'c2abbdc5-7fda-4f5c-982a-8f39bea7ea6e');
INSERT INTO "Player" VALUES('4d850f74-bb81-4615-9ade-22b8685f1f14',2,'Virat Kohli','Indian','Sold','Indian (capped)','Batter','RCB','2.00 Cr',28.0,1774061723936,1774308359986,'55cb9368-0165-419a-a01f-a04c270b5b9e');
INSERT INTO "Player" VALUES('c7af54c9-99d2-4ecd-badb-83f3a81f6e74',3,'Tim David','Australian','Sold','Overseas (capped)','All-rounder','RCB','2.00 Cr',2.2,1774061724027,1774308359986,'2e112e76-dec4-4c19-8fe2-835b70222b5d');
INSERT INTO "Player" VALUES('423c1f40-9d94-4738-ab10-b7122578ed2c',4,'Devdutt Padikkal','Indian','Sold','Indian (capped)','Batter','RCB','2.00 Cr',7.20000000000000195e+00,1774061724119,1774308359986,'d5c4b13c-ad36-41f4-b9bd-8d37c688b1e4');
INSERT INTO "Player" VALUES('80bc310d-6697-447f-b67c-b5b5a0ee63ce',5,'Phil Salt','English',NULL,'Overseas (capped)','Wicketkeeper','RCB','2.00 Cr',NULL,1774061724210,1774308359986,NULL);
INSERT INTO "Player" VALUES('17d166cf-de6c-4c52-b4ca-ee4a5450ccc1',6,'Jitesh Sharma','Indian','Sold','Indian (capped)','Wicketkeeper','RCB','2.00 Cr',11.2,1774061724301,1774308359986,'5181196d-01b3-498c-bf32-bbd679e87efb');
INSERT INTO "Player" VALUES('fac78dec-b06d-4004-91e2-deffcd62c9bf',7,'Krunal Pandya','Indian','Sold','Indian (capped)','All-rounder','RCB','2.00 Cr',8.89999999999999857e+00,1774061724394,1774308359986,'5181196d-01b3-498c-bf32-bbd679e87efb');
INSERT INTO "Player" VALUES('d5857526-5b36-4832-b9be-4d5c1f9a1b40',8,'Jacob Bethell','English','Sold','Overseas (capped)','All-rounder','RCB','2.00 Cr',5.60000000000000142e+00,1774061724482,1774308359986,'52523a52-1e7e-4ce5-83f4-53dcba2fce17');
INSERT INTO "Player" VALUES('1625e995-daea-4358-a911-30a2586bbfc6',9,'Romario Shepherd','West Indian','Sold','Overseas (capped)','All-rounder','RCB','2.00 Cr',8.1,1774061724573,1774308359986,'55cb9368-0165-419a-a01f-a04c270b5b9e');
INSERT INTO "Player" VALUES('9f663ca0-b526-44a2-973e-b7f31947c558',10,'Swapnil Singh','Indian','Unsold','Indian (uncapped)','All-rounder','RCB','2.00 Cr',NULL,1774061724777,1774308359986,NULL);
INSERT INTO "Player" VALUES('6e0173a8-6282-4c26-bc28-4661b2feb26e',11,'Josh Hazlewood','Australian',NULL,'Overseas (capped)','Bowler','RCB','2.00 Cr',NULL,1774061724867,1774308359986,NULL);
INSERT INTO "Player" VALUES('7e8f6315-9f18-4b88-8f23-1e40997be149',12,'Bhuvneshwar Kumar','Indian',NULL,'Indian (capped)','Bowler','RCB','2.00 Cr',NULL,1774061724959,1774308359986,NULL);
INSERT INTO "Player" VALUES('36d84776-6a8b-4302-9ea4-2705a46b926e',13,'Rasikh Salam','Indian','Unsold','Indian (uncapped)','Bowler','RCB','2.00 Cr',NULL,1774061725050,1774308359986,NULL);
INSERT INTO "Player" VALUES('654a513e-ccc5-4031-9f58-03d0f3113df7',14,'Yash Dayal','Indian','Unsold','Indian (uncapped)','Bowler','RCB','2.00 Cr',NULL,1774061725140,1774308359986,NULL);
INSERT INTO "Player" VALUES('225d29ed-b37b-471d-b453-ae49a4259a2c',15,'Suyash Sharma','Indian','Sold','Indian (uncapped)','Bowler','RCB','2.00 Cr',2.4,1774061725231,1774308359986,'52523a52-1e7e-4ce5-83f4-53dcba2fce17');
INSERT INTO "Player" VALUES('4fc60410-beac-4706-842e-2623227db12f',16,'Nuwan Thushara','Sri Lankan','Unsold','Overseas (capped)','Bowler','RCB','2.00 Cr',NULL,1774061725323,1774308359986,NULL);
INSERT INTO "Player" VALUES('2a27f5a3-352b-4af5-b3e9-27bfffce86da',17,'Abhinandan Singh','Indian',NULL,'Indian (uncapped)','Bowler','RCB','2.00 Cr',NULL,1774061725414,1774308359986,NULL);
INSERT INTO "Player" VALUES('751cd97c-0b10-4762-a5dd-b2abef115059',18,'Venkatesh Iyer','Indian','Sold','Indian (capped)','All-rounder','RCB','1.00 Cr',1.079999999999999e+01,1774061725505,1774308359986,'d5c4b13c-ad36-41f4-b9bd-8d37c688b1e4');
INSERT INTO "Player" VALUES('668a35f8-369a-4d09-9e1d-8d24af483111',19,'Jacob Duffy','New Zealander','Sold','Overseas (capped)','Bowler','RCB','0.50 Cr',8.99999999999999911e-01,1774061725595,1774308359986,'5181196d-01b3-498c-bf32-bbd679e87efb');
INSERT INTO "Player" VALUES('e87af636-deb7-4ef5-9500-5b1029d7db31',20,'Mangesh Yadav','Indian','Unsold','Indian (uncapped)','All-rounder','RCB','1.00 Cr',NULL,1774061725686,1774308359986,NULL);
INSERT INTO "Player" VALUES('dca55517-7aa5-4af4-95e3-157498a04656',21,'Satvik Deswal','Indian',NULL,'Indian (uncapped)','All-rounder','RCB','0.20 Cr',NULL,1774061725777,1774308359986,NULL);
INSERT INTO "Player" VALUES('72b444de-9b13-42f2-b0ca-08caa7b37962',22,'Jordan Cox','English','Unsold','Overseas (capped)','Batter','RCB','0.20 Cr',NULL,1774061725870,1774308359986,NULL);
INSERT INTO "Player" VALUES('eeea0c95-32f8-4905-9eb9-db14070d5af7',23,'Kanishk Chouhan','Indian','Unsold','Indian (uncapped)','All-rounder','RCB','0.20 Cr',NULL,1774061725960,1774308359986,NULL);
INSERT INTO "Player" VALUES('5305733e-b1c5-4a67-8f0d-fc7df6ba3d4a',24,'Vihaan Malhotra','Indian','Unsold','Indian (uncapped)','All-rounder','RCB','0.20 Cr',NULL,1774061726051,1774308359986,NULL);
INSERT INTO "Player" VALUES('e581e2f0-dd92-4e80-b611-296c98490981',25,'Vicky Ostwal','Indian','Unsold','Indian (uncapped)','All-rounder','RCB','0.20 Cr',NULL,1774061726141,1774308359986,NULL);
INSERT INTO "Player" VALUES('06c20bba-ad5d-4dbc-82c0-fbffad7b61ba',1,'Travis Head','Australian','Sold','Overseas (capped','Batter','SRH','2.00 Cr',16.7,1774061726321,1774308359986,'5181196d-01b3-498c-bf32-bbd679e87efb');
INSERT INTO "Player" VALUES('887c1690-ae99-4051-9988-5d561f93cce7',2,'Abhishek Sharma','Indian','Sold','Indian (capped','All-rounder','SRH','2.00 Cr',18.2,1774061726412,1774308359986,'5181196d-01b3-498c-bf32-bbd679e87efb');
INSERT INTO "Player" VALUES('8649ff5c-062d-4029-8da1-92549b761f27',3,'Aniket Verma','Indian','Sold','Indian (uncapped)','Batter','SRH','2.00 Cr',3.6,1774061726506,1774308359986,'c2abbdc5-7fda-4f5c-982a-8f39bea7ea6e');
INSERT INTO "Player" VALUES('a23ef4d2-43e4-4871-975d-6aaa310da105',4,'R Smaran','Indian','Unsold','Indian (uncapped)','Batter','SRH','2.00 Cr',NULL,1774061726596,1774308359986,NULL);
INSERT INTO "Player" VALUES('13557c68-f086-4e3c-a627-5a1627788866',5,'Ishan Kishan','Indian','Sold','Indian (capped)','Wicketkeeper','SRH','2.00 Cr',18.0,1774061726686,1774308359986,'e517ed6a-f2d5-458e-ab9f-326d57208ee5');
INSERT INTO "Player" VALUES('6a9d6abd-8c74-4522-8f15-81beb83739a3',6,'Heinrich Klaasen','South African','Sold','Overseas (capped)','Wicketkeeper','SRH','2.00 Cr',13.4,1774061726777,1774308359986,'e517ed6a-f2d5-458e-ab9f-326d57208ee5');
INSERT INTO "Player" VALUES('04ded6a8-6b5a-4663-b1c9-04dc17e4e0a5',7,'Nitish Kumar Reddy','Indian','Sold','Indian (capped)','All-rounder','SRH','2.00 Cr',8.4,1774061726868,1774308359986,'55cb9368-0165-419a-a01f-a04c270b5b9e');
INSERT INTO "Player" VALUES('7663f1e1-5b87-4532-8d2a-31590efb7765',8,'Harsh Dubey','Indian','Unsold','Indian (uncapped)','All-rounder','SRH','2.00 Cr',NULL,1774061726960,1774308359986,NULL);
INSERT INTO "Player" VALUES('00f638ae-aceb-4b9b-97fd-4e8ae28579df',9,'Kamindu Mendis','Sri Lankan','Sold','Overseas (capped)','All-rounder','SRH','2.00 Cr',2.2,1774061727051,1774308359986,'52523a52-1e7e-4ce5-83f4-53dcba2fce17');
INSERT INTO "Player" VALUES('7c4f4776-8736-49a9-8dbb-3c97e20ce8bf',10,'Harshal Patel','Indian','Sold','Indian (capped)','All-rounder','SRH','2.00 Cr',6.6000000000000023e+00,1774061727141,1774308359986,'2e112e76-dec4-4c19-8fe2-835b70222b5d');
INSERT INTO "Player" VALUES('f5b5665e-f8f2-40e1-a2aa-4dc84e6132ae',11,'Brydon Carse','English','Sold','Overseas (capped)','All-rounder','SRH','2.00 Cr',2.2,1774061727232,1774308359986,'d5c4b13c-ad36-41f4-b9bd-8d37c688b1e4');
INSERT INTO "Player" VALUES('8de6ced1-8095-45fa-a008-724ef1acdbc0',12,'Pat Cummins','Australian',NULL,'Overseas (capped)','Bowler','SRH','2.00 Cr',NULL,1774061727323,1774308359986,NULL);
INSERT INTO "Player" VALUES('0d6ec705-6198-42ae-9c16-190ab7203b70',13,'Jaydev Unadkat','Indian','Sold','Indian (capped)','Bowler','SRH','2.00 Cr',2.4,1774061727414,1774308359986,'d5c4b13c-ad36-41f4-b9bd-8d37c688b1e4');
INSERT INTO "Player" VALUES('1e639ceb-64a3-453b-a752-d0c6e47930e5',14,'Eshan Malinga','Sri Lankan','Sold','Overseas (capped)','Bowler','SRH','2.00 Cr',3.0,1774061727564,1774308359986,'52523a52-1e7e-4ce5-83f4-53dcba2fce17');
INSERT INTO "Player" VALUES('c7853296-67d6-41fc-a7f5-40dd9f9d3266',15,'Zeeshan Ansari','Indian','Unsold','Indian (uncapped)','Bowler','SRH','2.00 Cr',NULL,1774061727657,1774308359986,NULL);
INSERT INTO "Player" VALUES('aad28152-e22f-4b76-928f-311e9fbe1225',16,'Shivang Kumar','Indian','Unsold','Indian (uncapped)','All-rounder','SRH','0.20 Cr',NULL,1774061727858,1774308359986,NULL);
INSERT INTO "Player" VALUES('b49c79f3-42aa-4f7f-a28b-7029b4e696f4',17,'Salil Arora','Indian','Unsold','Indian (uncapped)','Wicketkeeper','SRH','0.50 Cr',NULL,1774061727949,1774308359986,NULL);
INSERT INTO "Player" VALUES('f4663242-dbb9-4ae2-996d-55a5d9bfe219',18,'Krains Fuletra','Indian','Unsold','Indian (uncapped)','Bowler','SRH','0.20 Cr',NULL,1774061728040,1774308359986,NULL);
INSERT INTO "Player" VALUES('b2b6335c-e7c9-40b1-aee5-0c68dd6adcc1',19,'Praful Hinge','Indian','Unsold','Indian (uncapped)','Bowler','SRH','0.20 Cr',NULL,1774061728135,1774308359986,NULL);
INSERT INTO "Player" VALUES('38e45620-5a40-44ac-9691-b094277fc6b6',20,'Amit Kumar','Indian','Unsold','Indian (uncapped)','Bowler','SRH','0.20 Cr',NULL,1774061728225,1774308359986,NULL);
INSERT INTO "Player" VALUES('59ba71c3-a556-434c-b46a-c6f4d436b136',21,'Onkar Tarmale','Indian','Unsold','Indian (uncapped)','Bowler','SRH','0.20 Cr',NULL,1774061728316,1774308359986,NULL);
INSERT INTO "Player" VALUES('5cdb6917-9a0a-4099-9024-84e319a48a7e',22,'Sakib Hussain','Indian','Unsold','Indian (uncapped)','Bowler','SRH','0.20 Cr',NULL,1774061728406,1774308359986,NULL);
INSERT INTO "Player" VALUES('c1c0db6d-c2f6-4add-96a3-6e11681ed0c7',23,'Liam Livingstone','English',NULL,'Overseas (capped)','All-rounder','SRH','2.00 Cr',NULL,1774061728498,1774308359986,NULL);
INSERT INTO "Player" VALUES('7ad8946d-5b8d-4e05-9056-07c1d001e016',24,'Shivam Mavi','Indian','Unsold','Indian (capped)','Bowler','SRH','0.20 Cr',NULL,1774061728588,1774308359986,NULL);
INSERT INTO "Player" VALUES('4ea75a3b-aa39-4704-904b-8209956db235',25,'Jack Edwards','Australian','Unsold','Overseas (uncapped)','All-rounder','SRH','0.50 Cr',NULL,1774061728679,1774308359986,NULL);
INSERT INTO "Player" VALUES('b87fa4d9-44b2-49e4-af47-db1d870b1222',NULL,'Blessing Muzarbani','Zimbabwe','Sold',NULL,'Bowler','KKR','0.75 Cr',0.95,1774075085249,1774308359986,'d5c4b13c-ad36-41f4-b9bd-8d37c688b1e4');
CREATE TABLE "PlayerPoints" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "matchId" TEXT,
    "points" REAL NOT NULL DEFAULT 0.0,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "ballsFaced" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "dotBalls" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerPoints_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "budget" REAL NOT NULL DEFAULT 125.0,
    "totalPoints" REAL NOT NULL DEFAULT 0.0,
    "bonusPoints" REAL NOT NULL DEFAULT 0.0,
    "iplTeam" TEXT,
    "rtmUsed" BOOLEAN NOT NULL DEFAULT false,
    "lastActive" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "User" VALUES('e517ed6a-f2d5-458e-ab9f-326d57208ee5','Shlok Knight Rider','$2b$10$iio0FkhJsOvSlaWl.TvPBer1i5YXvEa8UIAlUkKK3w2CPgpQyIoCW',1.46999999999999904e+01,0.0,0.0,'SRH',1,1774224467689,1774060418468,1774224467690);
INSERT INTO "User" VALUES('0f67e6cd-9e73-4dd2-9049-d7d73e368657','admin','$2b$10$rRs1r0Mxs8rzCAIQ.JNJ7.9keUKuhevkJ7H1XevYXfTrRYyZhvGPe',999.0,0.0,0.0,NULL,0,1774238923334,1774060454765,1774238923336);
INSERT INTO "User" VALUES('c2abbdc5-7fda-4f5c-982a-8f39bea7ea6e','Raashi''s Royals','$2b$10$3/qejwhT8wHMTeN89gqx0OA8peSl0ZP2tLu1gF6P2aLteTnIp5nbe',1.30000000000000106e+01,0.0,0.0,'RCB',0,1774223123345,1774069757812,1774223123347);
INSERT INTO "User" VALUES('55cb9368-0165-419a-a01f-a04c270b5b9e','Anshi''s Warriors','$2b$10$xa3ueCtNZhjn/rE9Zy8WLuIzW0R9ntZjs6qMdVF9Uch7.q2rLOgu2',1.00000000000008498e-01,0.0,0.0,'PBKS',1,1774223317000,1774069792254,1774223317001);
INSERT INTO "User" VALUES('52523a52-1e7e-4ce5-83f4-53dcba2fce17','Diya''s Daredevils','$2b$10$v3pMqf2nbOToZUhk99j1aeb9AodcizQHSIRDpOuWsZ40LdLzbU.pW',5.49999999999998934e+00,0.0,0.0,'MI',1,1774223398399,1774069855640,1774223398400);
INSERT INTO "User" VALUES('d5c4b13c-ad36-41f4-b9bd-8d37c688b1e4','mithi_nagai','$2b$10$rvjImn.9gundddIyUfVaWu/t.mfosQ3IRa/vQQ.m8/tWoWS93f5ei',8.49999999999988098e-01,0.0,0.0,'CSK',1,1774309820009,1774070056014,1774309820010);
INSERT INTO "User" VALUES('2e112e76-dec4-4c19-8fe2-835b70222b5d','Diogo Dominators','$2b$10$4BJb7ah.b97dT58/iG1IdOiwDQ/OjwzP.fbOw.B65FG1OJiEWjnou',9.99999999999907629e-02,0.0,0.0,'KKR',1,1774223995151,1774070077854,1774223995152);
INSERT INTO "User" VALUES('5181196d-01b3-498c-bf32-bbd679e87efb','Shikhar Super Kings','$2b$10$T8tfEfiJyDog6s4F2n.UzeaJo/1fQjVOtBKxCmQ8ovBQ7Wmw0F4Ta',1.06581410364015e-14,0.0,0.0,'GT',1,1774237815851,1774070219672,1774237815853);
INSERT INTO "User" VALUES('6466aaec-54c0-4f74-970f-9773c630f0ce','Shrey Strikers','$2b$10$hfRtjlmsiy0VpjNExodurOJYPKN10jSnfowKJbRHSa2njFreoa6Fu',2.00000000000029903e-01,0.0,0.0,'RR',1,1774222895904,1774072176913,1774222895905);
CREATE TABLE "_prisma_migrations" (
    "id"                    TEXT PRIMARY KEY NOT NULL,
    "checksum"              TEXT NOT NULL,
    "finished_at"           DATETIME,
    "migration_name"        TEXT NOT NULL,
    "logs"                  TEXT,
    "rolled_back_at"        DATETIME,
    "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
    "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "AuctionState_currentPlayerId_key" ON "AuctionState"("currentPlayerId");
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");
COMMIT;
