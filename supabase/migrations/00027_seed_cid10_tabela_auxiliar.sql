-- ============================================================
-- TFD — Migration 027: Popular tabelas_auxiliares com CIDs
-- Substitui os 10 "CIDs frequentes" por uma seleção abrangente
-- dos códigos mais utilizados no SUS/TFD
-- ============================================================

DELETE FROM tabelas_auxiliares WHERE categoria = 'cid10';

INSERT INTO tabelas_auxiliares (categoria, codigo, nome, descricao, ativo, ordem) VALUES

-- ─── ONCOLOGIA (os mais prevalentes no Brasil) ──────────────────
('cid10', 'C50', 'C50', 'Neoplasia maligna da mama', true, 1),
('cid10', 'C50.4', 'C50.4', 'Neoplasia maligna do quadrante superior externo da mama', true, 2),
('cid10', 'C50.9', 'C50.9', 'Neoplasia maligna da mama não especificada', true, 3),
('cid10', 'C61', 'C61', 'Neoplasia maligna da próstata', true, 4),
('cid10', 'C18.9', 'C18.9', 'Neoplasia maligna do cólon não especificado', true, 5),
('cid10', 'C20', 'C20', 'Neoplasia maligna do reto', true, 6),
('cid10', 'C34.9', 'C34.9', 'Neoplasia maligna dos brônquios ou pulmões não especificado', true, 7),
('cid10', 'C16.9', 'C16.9', 'Neoplasia maligna do estômago não especificado', true, 8),
('cid10', 'C53.9', 'C53.9', 'Neoplasia maligna do colo do útero não especificado', true, 9),
('cid10', 'C73', 'C73', 'Neoplasia maligna da glândula tireoide', true, 10),
('cid10', 'C22.0', 'C22.0', 'Carcinoma de células hepáticas', true, 11),
('cid10', 'C25.9', 'C25.9', 'Neoplasia maligna do pâncreas não especificado', true, 12),
('cid10', 'C71.9', 'C71.9', 'Neoplasia maligna do encéfalo não especificado', true, 13),
('cid10', 'C67.9', 'C67.9', 'Neoplasia maligna da bexiga não especificada', true, 14),
('cid10', 'C56', 'C56', 'Neoplasia maligna do ovário', true, 15),
('cid10', 'C15', 'C15', 'Neoplasia maligna do esôfago', true, 16),
('cid10', 'C32', 'C32', 'Neoplasia maligna da laringe', true, 17),
('cid10', 'C43.9', 'C43.9', 'Melanoma maligno de pele não especificado', true, 18),
('cid10', 'C64', 'C64', 'Neoplasia maligna do rim exceto pelve renal', true, 19),
('cid10', 'C54.1', 'C54.1', 'Neoplasia maligna do endométrio', true, 20),

-- ─── HEMATOLOGIA / LEUCEMIAS / LINFOMAS ─────────────────────────
('cid10', 'C91.0', 'C91.0', 'Leucemia linfoblástica aguda (LLA)', true, 21),
('cid10', 'C91.1', 'C91.1', 'Leucemia linfocítica crônica', true, 22),
('cid10', 'C92.0', 'C92.0', 'Leucemia mieloide aguda (LMA)', true, 23),
('cid10', 'C92.1', 'C92.1', 'Leucemia mieloide crônica (LMC)', true, 24),
('cid10', 'C83.3', 'C83.3', 'Linfoma difuso de grandes células', true, 25),
('cid10', 'C85.9', 'C85.9', 'Linfoma não-Hodgkin de tipo não especificado', true, 26),
('cid10', 'C81.9', 'C81.9', 'Doença de Hodgkin não especificada', true, 27),
('cid10', 'C90.0', 'C90.0', 'Mieloma múltiplo', true, 28),
('cid10', 'D46', 'D46', 'Síndromes mielodisplásicas', true, 29),
('cid10', 'D57.0', 'D57.0', 'Anemia falciforme com crise', true, 30),
('cid10', 'D57.1', 'D57.1', 'Anemia falciforme sem crise', true, 31),
('cid10', 'D61.9', 'D61.9', 'Anemia aplástica não especificada', true, 32),
('cid10', 'D66', 'D66', 'Hemofilia A', true, 33),

-- ─── CARDIOLOGIA ────────────────────────────────────────────────
('cid10', 'I10', 'I10', 'Hipertensão essencial (primária)', true, 34),
('cid10', 'I21.9', 'I21.9', 'Infarto agudo do miocárdio não especificado', true, 35),
('cid10', 'I25.1', 'I25.1', 'Doença aterosclerótica do coração', true, 36),
('cid10', 'I35.0', 'I35.0', 'Estenose (da valva) aórtica', true, 37),
('cid10', 'I35.2', 'I35.2', 'Estenose aórtica com insuficiência', true, 38),
('cid10', 'I34.0', 'I34.0', 'Insuficiência (da valva) mitral', true, 39),
('cid10', 'I05.0', 'I05.0', 'Estenose mitral', true, 40),
('cid10', 'I42.0', 'I42.0', 'Cardiomiopatia dilatada', true, 41),
('cid10', 'I42.1', 'I42.1', 'Cardiomiopatia obstrutiva hipertrófica', true, 42),
('cid10', 'I48', 'I48', 'Flutter e fibrilação atrial', true, 43),
('cid10', 'I50.0', 'I50.0', 'Insuficiência cardíaca congestiva', true, 44),
('cid10', 'I50.9', 'I50.9', 'Insuficiência cardíaca não especificada', true, 45),
('cid10', 'I27.0', 'I27.0', 'Hipertensão pulmonar primária', true, 46),
('cid10', 'I44.2', 'I44.2', 'Bloqueio atrioventricular total', true, 47),
('cid10', 'I71.4', 'I71.4', 'Aneurisma da aorta abdominal sem ruptura', true, 48),
('cid10', 'I71.0', 'I71.0', 'Dissecção da aorta', true, 49),
('cid10', 'I20.0', 'I20.0', 'Angina instável', true, 50),

-- ─── AVC / NEUROLOGIA VASCULAR ──────────────────────────────────
('cid10', 'I63.9', 'I63.9', 'Infarto cerebral não especificado', true, 51),
('cid10', 'I64', 'I64', 'AVC não especificado como hemorrágico ou isquêmico', true, 52),
('cid10', 'I61.9', 'I61.9', 'Hemorragia intracerebral não especificada', true, 53),
('cid10', 'I69.4', 'I69.4', 'Sequelas de AVC não especificado', true, 54),
('cid10', 'I67.1', 'I67.1', 'Aneurisma cerebral não-roto', true, 55),

-- ─── NEFROLOGIA ─────────────────────────────────────────────────
('cid10', 'N18.0', 'N18.0', 'Doença renal em estágio final', true, 56),
('cid10', 'N18.3', 'N18.3', 'Doença renal crônica estágio 3', true, 57),
('cid10', 'N18.4', 'N18.4', 'Doença renal crônica estágio 4', true, 58),
('cid10', 'N18.5', 'N18.5', 'Doença renal crônica estágio 5', true, 59),
('cid10', 'N18.9', 'N18.9', 'Insuficiência renal crônica não especificada', true, 60),
('cid10', 'N19', 'N19', 'Insuficiência renal não especificada', true, 61),
('cid10', 'N04', 'N04', 'Síndrome nefrótica', true, 62),
('cid10', 'N20.0', 'N20.0', 'Cálculo do rim', true, 63),

-- ─── NEUROLOGIA ─────────────────────────────────────────────────
('cid10', 'G40.0', 'G40.0', 'Epilepsia idiopática definida por localização (focal)', true, 64),
('cid10', 'G40.9', 'G40.9', 'Epilepsia não especificada', true, 65),
('cid10', 'G35', 'G35', 'Esclerose múltipla', true, 66),
('cid10', 'G20', 'G20', 'Doença de Parkinson', true, 67),
('cid10', 'G30.9', 'G30.9', 'Doença de Alzheimer não especificada', true, 68),
('cid10', 'G12.2', 'G12.2', 'Doença do neurônio motor (ELA)', true, 69),
('cid10', 'G80.9', 'G80.9', 'Paralisia cerebral não especificada', true, 70),
('cid10', 'G82.1', 'G82.1', 'Paraplegia espástica', true, 71),
('cid10', 'G70.0', 'G70.0', 'Miastenia gravis', true, 72),
('cid10', 'G71.0', 'G71.0', 'Distrofia muscular', true, 73),
('cid10', 'G91.9', 'G91.9', 'Hidrocefalia não especificada', true, 74),
('cid10', 'G61.0', 'G61.0', 'Síndrome de Guillain-Barré', true, 75),
('cid10', 'G10', 'G10', 'Doença de Huntington', true, 76),

-- ─── OFTALMOLOGIA ───────────────────────────────────────────────
('cid10', 'H25.0', 'H25.0', 'Catarata senil incipiente', true, 77),
('cid10', 'H25.9', 'H25.9', 'Catarata senil não especificada', true, 78),
('cid10', 'H26.9', 'H26.9', 'Catarata não especificada', true, 79),
('cid10', 'H40.1', 'H40.1', 'Glaucoma primário de ângulo aberto', true, 80),
('cid10', 'H40.9', 'H40.9', 'Glaucoma não especificado', true, 81),
('cid10', 'H33.0', 'H33.0', 'Descolamento da retina com defeito retiniano', true, 82),
('cid10', 'H35.3', 'H35.3', 'Degeneração da mácula e do polo posterior', true, 83),
('cid10', 'H36.0', 'H36.0', 'Retinopatia diabética', true, 84),
('cid10', 'H54.0', 'H54.0', 'Cegueira binocular', true, 85),
('cid10', 'H18.6', 'H18.6', 'Ceratocone', true, 86),

-- ─── ORTOPEDIA ──────────────────────────────────────────────────
('cid10', 'M17.0', 'M17.0', 'Gonartrose primária bilateral', true, 87),
('cid10', 'M17.1', 'M17.1', 'Gonartrose primária unilateral', true, 88),
('cid10', 'M16.0', 'M16.0', 'Coxartrose primária bilateral', true, 89),
('cid10', 'M16.1', 'M16.1', 'Coxartrose primária unilateral', true, 90),
('cid10', 'M51.1', 'M51.1', 'Hérnia de disco lombar com radiculopatia', true, 91),
('cid10', 'M48.0', 'M48.0', 'Estenose da coluna vertebral', true, 92),
('cid10', 'M41', 'M41', 'Escoliose', true, 93),
('cid10', 'M45', 'M45', 'Espondilite anquilosante', true, 94),
('cid10', 'M75.1', 'M75.1', 'Síndrome do manguito rotador', true, 95),
('cid10', 'M87.0', 'M87.0', 'Necrose asséptica idiopática do osso', true, 96),
('cid10', 'S72.0', 'S72.0', 'Fratura do colo do fêmur', true, 97),

-- ─── REUMATOLOGIA / AUTOIMUNE ───────────────────────────────────
('cid10', 'M05', 'M05', 'Artrite reumatoide soropositiva', true, 98),
('cid10', 'M06.9', 'M06.9', 'Artrite reumatoide não especificada', true, 99),
('cid10', 'M32.9', 'M32.9', 'Lúpus eritematoso sistêmico não especificado', true, 100),
('cid10', 'M34.9', 'M34.9', 'Esclerose sistêmica não especificada', true, 101),

-- ─── CARDIOPATIAS CONGÊNITAS ────────────────────────────────────
('cid10', 'Q21.0', 'Q21.0', 'Defeito do septo ventricular (CIV)', true, 102),
('cid10', 'Q21.1', 'Q21.1', 'Defeito do septo atrial (CIA)', true, 103),
('cid10', 'Q21.3', 'Q21.3', 'Tetralogia de Fallot', true, 104),
('cid10', 'Q25.0', 'Q25.0', 'Persistência do canal arterial (PCA)', true, 105),
('cid10', 'Q25.1', 'Q25.1', 'Coarctação da aorta', true, 106),
('cid10', 'Q23', 'Q23', 'Malformações congênitas das valvas aórtica e mitral', true, 107),

-- ─── OUTRAS MALFORMAÇÕES CONGÊNITAS ─────────────────────────────
('cid10', 'Q05', 'Q05', 'Espinha bífida', true, 108),
('cid10', 'Q03', 'Q03', 'Hidrocefalia congênita', true, 109),
('cid10', 'Q35', 'Q35', 'Fenda palatina', true, 110),
('cid10', 'Q37', 'Q37', 'Fenda palatina com lábio leporino', true, 111),
('cid10', 'Q90.9', 'Q90.9', 'Síndrome de Down não especificada', true, 112),
('cid10', 'Q61.2', 'Q61.2', 'Doença renal policística autossômica dominante', true, 113),
('cid10', 'Q79.0', 'Q79.0', 'Hérnia diafragmática congênita', true, 114),

-- ─── TRANSPLANTES / PÓS-TRANSPLANTE ────────────────────────────
('cid10', 'Z94.0', 'Z94.0', 'Rim transplantado', true, 115),
('cid10', 'Z94.1', 'Z94.1', 'Coração transplantado', true, 116),
('cid10', 'Z94.4', 'Z94.4', 'Fígado transplantado', true, 117),
('cid10', 'Z94.7', 'Z94.7', 'Córnea transplantada', true, 118),
('cid10', 'Z94.8', 'Z94.8', 'Outros órgãos e tecidos transplantados', true, 119),
('cid10', 'T86.1', 'T86.1', 'Falha e rejeição de transplante de rim', true, 120),
('cid10', 'T86.2', 'T86.2', 'Falha e rejeição de transplante de coração', true, 121),
('cid10', 'T86.4', 'T86.4', 'Falha e rejeição de transplante de fígado', true, 122),

-- ─── DIÁLISE / QUIMIO / RADIOTERAPIA ───────────────────────────
('cid10', 'Z49.1', 'Z49.1', 'Diálise extracorpórea', true, 123),
('cid10', 'Z51.0', 'Z51.0', 'Sessão de radioterapia', true, 124),
('cid10', 'Z51.1', 'Z51.1', 'Sessão de quimioterapia por neoplasia', true, 125),
('cid10', 'Z95.0', 'Z95.0', 'Presença de marcapasso cardíaco', true, 126),
('cid10', 'Z95.1', 'Z95.1', 'Presença de ponte (bypass) aortocoronária', true, 127),
('cid10', 'Z95.2', 'Z95.2', 'Presença de prótese de valva cardíaca', true, 128),

-- ─── ENDÓCRINO / METABÓLICO ────────────────────────────────────
('cid10', 'E10.9', 'E10.9', 'Diabetes mellitus tipo 1 sem complicações', true, 129),
('cid10', 'E10.2', 'E10.2', 'Diabetes mellitus tipo 1 com complicações renais', true, 130),
('cid10', 'E11.9', 'E11.9', 'Diabetes mellitus tipo 2 sem complicações', true, 131),
('cid10', 'E11.2', 'E11.2', 'Diabetes mellitus tipo 2 com complicações renais', true, 132),
('cid10', 'E84.9', 'E84.9', 'Fibrose cística não especificada', true, 133),
('cid10', 'E85', 'E85', 'Amiloidose', true, 134),

-- ─── HEPATOLOGIA ────────────────────────────────────────────────
('cid10', 'K74.6', 'K74.6', 'Cirrose hepática não especificada', true, 135),
('cid10', 'K70.3', 'K70.3', 'Cirrose hepática alcoólica', true, 136),
('cid10', 'K72', 'K72', 'Insuficiência hepática', true, 137),
('cid10', 'B18.2', 'B18.2', 'Hepatite viral crônica C', true, 138),
('cid10', 'B18.1', 'B18.1', 'Hepatite viral crônica B sem agente delta', true, 139),

-- ─── PNEUMOLOGIA ────────────────────────────────────────────────
('cid10', 'J44.9', 'J44.9', 'DPOC não especificada', true, 140),
('cid10', 'J84.1', 'J84.1', 'Doenças pulmonares intersticiais com fibrose', true, 141),
('cid10', 'J45.9', 'J45.9', 'Asma não especificada', true, 142),
('cid10', 'J96.1', 'J96.1', 'Insuficiência respiratória crônica', true, 143),

-- ─── OTORRINOLARINGOLOGIA ───────────────────────────────────────
('cid10', 'H90.3', 'H90.3', 'Perda de audição neurossensorial bilateral', true, 144),
('cid10', 'H90.5', 'H90.5', 'Perda de audição neurossensorial não especificada', true, 145),
('cid10', 'H80', 'H80', 'Otosclerose', true, 146),

-- ─── INFECTOLOGIA ───────────────────────────────────────────────
('cid10', 'B20', 'B20', 'Doença pelo HIV', true, 147),
('cid10', 'B57.2', 'B57.2', 'Doença de Chagas crônica com comprometimento cardíaco', true, 148),
('cid10', 'A15.0', 'A15.0', 'Tuberculose pulmonar confirmada por microscopia', true, 149),

-- ─── PRÓTESES / IMPLANTES ───────────────────────────────────────
('cid10', 'T84.0', 'T84.0', 'Complicação mecânica de prótese articular interna', true, 150),
('cid10', 'Z96.6', 'Z96.6', 'Presença de implante ortopédico articular', true, 151),
('cid10', 'Z96.1', 'Z96.1', 'Presença de lente intraocular', true, 152);
