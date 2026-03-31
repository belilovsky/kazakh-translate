# Kazakh Linguistics Research Report
## For the Қазтілші Machine Translation System (RU→KK, EN→KK)

**Prepared:** March 2026  
**Scope:** Comprehensive linguistic, sociolinguistic, and NLP-focused research for improving RU→KK and EN→KK machine translation quality.

---

## Table of Contents

1. [Kazakh Dialects and Regional Variations](#1-kazakh-dialects-and-regional-variations)
2. [Historical Evolution of the Kazakh Language](#2-historical-evolution-of-the-kazakh-language)
3. [Modern Kazakh vs Literary Kazakh](#3-modern-kazakh-vs-literary-kazakh)
4. [Key Linguistic Features MT Systems Get Wrong](#4-key-linguistic-features-mt-systems-get-wrong)
5. [Academic Resources and Corpora](#5-academic-resources-and-corpora)
6. [Cultural and Pragmatic Considerations](#6-cultural-and-pragmatic-considerations)
7. [Practical Recommendations for Қазтілші](#7-practical-recommendations-for-қазтілші)

---

## 1. Kazakh Dialects and Regional Variations

### 1.1 The Three-Dialect Classification

The canonical academic classification, established by linguist Sarsen Amanzholov (1959) and confirmed by the LDC Language Specific Peculiarities document for Kazakh, divides the language into **three main dialect areas**:

| Dialect | Zhuz Historical Basis | Primary Regions | Key Cities |
|---|---|---|---|
| **Northeastern** | Orta Zhuz (Middle Horde) | Akmola, Kostanay, Karaganda, Pavlodar, East Kazakhstan | Astana, Karaganda, Semey, Oskemen, Pavlodar |
| **Southern** | Uly Zhuz (Great Horde) | Almaty, Zhambyl, South Kazakhstan, Kyzylorda, Taraz | Almaty, Shymkent, Taraz, Türkestan |
| **Western** | Kishi Zhuz (Little Horde) | Atyrau, Mangystau, Aktobe, West Kazakhstan | Aktau, Atyrau, Oral, Aktobe |

An alternative two-way classification (Doskaraev, 1954) groups these into **south-eastern** and **north-western** dialect families.

**Critical fact for MT systems:** The **Northeastern dialect** forms the basis of standard literary Kazakh (ádebı tıl). However, due to large-scale internal migration to Almaty and Astana, the traditional dialects of these cities are no longer representative — urban speech is heavily influenced by multiple regional varieties and Russian.

### 1.2 Phonological Differences by Dialect

| Feature | Northeastern (Standard) | Southern | Western |
|---|---|---|---|
| **Ch/Sh substitution** | ш [ʃ] | ч [tʃ] instead of ш (Kyrgyz influence) | standard ш |
| **Vowel openness** | More closed | More open (Uzbek influence) | Broadly open, clear articulation |
| **Intonation** | Flatter, "hard sounds" (per Reddit users) | Softer, melodic | Very open, clear |
| **Russian influence** | High (urban) | Moderate | Moderate |

Notable: Atyrau (Western) speakers often cited as having the clearest, most "open" pronunciation. Almaty speakers (Southern) described as having a Russian-influenced rhythm. Eastern Kazakhs use ч/дж sounds instead of ш/ж.

### 1.3 Lexical Differences by Region

The most practically important vocabulary differences for an MT system targeting multiple regions:

| Standard | Southern (Almaty/Shymkent region) | Western | Meaning |
|---|---|---|---|
| пияз | жуа (жуа is western Kyzylorda) | жуа | onion |
| ата | — | — | grandfather/elder |
| тате (aunt, standard) | апше | — | aunt |
| ага (older male, standard) | көке | — | uncle/older male |
| Солай ше? | — | — | "Isn't that so?" (Southern sentence-final particle) |
| Не хабар? | — | Не хайар? | What news/how are you? |
| Сау болыңыз | — | Сай бош (=goodbye or thank you in Aktau) | goodbye |
| Немене? | — | Не зат? | What? |

**Southern dialect** shows absorption of Uzbek vocabulary (e.g., "ойакта" for "оl жакта" = "there"), Persian words, and specific interjections ("Оліяа!" vs. standard "Ойбай!").

**Western dialect** distinctive vocabulary: "гой/гоо" (emphasis particle), specific farewell and greeting forms, Tatar/Bashkir loanwords not found elsewhere.

### 1.4 Morphological and Syntactic Dialect Features

Dialectal differences in vowel harmony rules are the primary morphological variation — this was identified in 19th-century texts as the **main distinguishing feature between dialects** (Normanskaya, 2022). Specifically, the rules governing plural suffix selection (тырнақтар vs. тырнақлар in older forms) diverge between dialects. The standard literary form consistently uses vowel-harmony-governed plurals.

**For MT:** Dialectal forms are unlikely to appear in training corpora (which skew heavily literary/journalistic). The risk is in the output direction — the system may produce standard forms that sound unnatural to regional speakers. Aiming for Northeastern standard is appropriate for official/written output.

### 1.5 Diaspora Kazakh

Kazakh in China and Mongolia largely belongs to the Northeastern dialect group with additional local features. Kazakhstan diaspora in Turkey uses a Latin-based orthography and shows Turkish lexical influence. These varieties are distinct enough to warrant separate treatment in any dialect-aware system.

---

## 2. Historical Evolution of the Kazakh Language

### 2.1 Script Chronology

Kazakh has undergone four major script changes — making it one of the most frequently re-scripted languages in the world:

| Period | Script | Notes |
|---|---|---|
| Pre-10th century | Old Turkic (runic) | Orkhon-Yenisei inscriptions |
| ~10th century – 1929 | Arabic (Perso-Arabic) | Modified by Akhmet Baitursynov in 1924 to better represent Kazakh phonology |
| 1929 – 1940 | Latin (Yañalif/Yangi alifba) | Soviet-introduced unified Turkic Latin script; Kazakh-specific variant |
| 1940 – present | Cyrillic | Soviet-mandated; accepted current form by Sarsen Amanzholov in 1940; 42 letters |
| 2017 – ongoing | New Latin (in transition) | Presidential decree by Nazarbayev 2017; deadline moved from 2025 to 2031; 2021 version uses diacritics (umlauts, breves, cedillas); currently used in education only |

**The 2026 situation:** As of early 2026, Kazakhstan is still using Cyrillic for official documents, media, and most public communications. The Latin alphabet is being introduced in schools and some official contexts but mass transition has not occurred. A new constitution (February 2026 draft) reaffirms Kazakh as state language while retaining Russian's official use "along with" Kazakh — a subtle weakening of Russian's previous "on equal footing" language.

**Key implication for MT:** Қазтілші should output Cyrillic as the primary script. However, implementing a Cyrillic↔Latin transliteration module is strongly recommended given the ongoing transition. The 2021 Latin variant uses: Á á, Ä ä, É é, Ğ ğ, İ i, Ń ń, Ö ö, Ú ú, Ü ü alongside standard Latin letters.

### 2.2 Pre-Soviet Period (before 1920s)

- Kazakh oral tradition (akyns, jyrshys) had highly developed poetic/rhetorical language
- Written Kazakh in Arabic script primarily for religious/scholarly use
- Abai Qunanbaiuly (1845–1904) — foundational literary figure; his works define classical Kazakh literary register
- Ibrahim Altynsarin (1841–1889) — first attempted Cyrillic script for Kazakh pedagogical purposes
- Persian and Arabic loanwords heavily present, especially in educated/religious registers

### 2.3 Soviet Era (1920s–1991): Linguistic Impact

The Soviet period produced the most dramatic structural changes to Kazakh, many of which still affect MT system quality today:

**Positive structural effects:**
- Standardization of literary Kazakh based on Northeastern dialect
- Development of written norms, orthography, grammar descriptions
- Creation of technical, scientific, and administrative vocabulary (much through Russian loanwords or calques)
- Literacy expansion — Kazakh went from primarily oral to fully written

**Negative/distorting effects:**

1. **Mass Russian loanwords**: Technology, science, politics, daily life vocabulary flooded with Russian terms. Pairs like "дүкен/магазин" (shop) and "телефон" coexist; Russian forms dominate in cities.

2. **Syntactic shift**: Traditional Kazakh SOV order was influenced by Russian SVO. Urban speech shows increased use of Russian-style constructions, especially in conjunctions, complex sentences, and modal expressions.

3. **Calquing**: Russian idioms and compound concepts translated literally into Kazakh, creating non-native patterns. Modern written Kazakh often reflects "translated Russian" thought structure.

4. **Phonological influence**: Cyrillic alphabet introduced Russian sound representations; initial "й" sounds emerged (Yerbol → [j]erbol) mimicking Russian orthographic patterns; vowel system partially restructured in urban standard pronunciation.

5. **Translation culture**: All official texts prepared first in Russian, then translated to Kazakh. This institutionalized "translation Kazakh" (аударма қазақша) — a register characterized by Russian thought patterns encoded in Kazakh surface forms.

**Research finding (ERIC paper on Modern vs Traditional Kazakh):** Paradoxically, the Soviet-era literary lexicon is **more traditional and normative** than post-independence vocabulary. During the Soviet period, the majority of Kazakh speakers lived rurally and preserved native language patterns. Post-independence, the educated urban elite used Russian; attempts to create new Kazakh vocabulary often produced non-systematic, artificial forms.

### 2.4 Independence Period (1991–present)

**1989: Kazakh SSR Law on Languages** — First to give Kazakh "state language" status; established Kazakh as language of administration and made it mandatory in schools.

**1997: Law of the Republic of Kazakhstan "On Languages"** (Тіл туралы заң) — Kazakh as state language; Russian as official language of state bodies; created Republican Terminology Commission (Termincom). Updated with major amendments January 2025.

**Key policy milestones:**

| Year | Event |
|---|---|
| 1989 | First Law on Languages; Kazakh becomes state language of Kazakh SSR |
| 1995 | Constitution of independent Kazakhstan; Article 7 defines Kazakh as state language, Russian as official |
| 1997 | Law on Languages (Тіл туралы заң); establishes Termincom |
| 1998 | First State Program on Languages (1998–2000) |
| 2007 | Trilingualism concept introduced (Kazakh/Russian/English) |
| 2011 | State Program for Development and Use of Languages 2011–2020 |
| 2017 | Decree on transition to Latin alphabet by 2025 |
| 2021 | Latin transition deadline moved to 2031; revised alphabet approved |
| 2023 | Concept for Development of Language Policy 2023–2029 adopted |
| 2024 | Language test required for naturalization; mandate: 55% Kazakh content on TV/radio by 2025 |
| 2025 | Law on Languages amendments (January 2025) — added language policy principles and main purpose articles |
| 2026 | Constitutional revision reaffirms Kazakh state status; Russian described as used "along with" (not "on equal footing") Kazakh |

**2024 Kazakhization push**: Government is actively promoting Kazakh in all public spaces. "Qazaqsha söyle" (Speak Kazakh) has become a social media meme and real-life pressure phrase. Some ethnic Kazakh Russian-speakers report feeling socially bullied when unable to switch to Kazakh.

### 2.5 Language Purification Movement

The "language purification" movement (тілдік тазалық/тілдің тазалығы) aims to replace Russian and international loanwords with Kazakh-origin or Turkic alternatives. However, it is contested:

**Arguments for:**
- Restoring native vocabulary suppressed under Soviet rule
- Removing Russification artifacts from the language
- Aligning with Latin script transition (Cyrillic loanwords from Russian hard to adapt to new alphabet)

**Arguments against:**
- Many proposed replacements are artificial and not accepted by speakers
- Some "purified" words are actually Arabic/Persian, not native Turkic
- International technical terminology functions better when shared with other languages
- Practical impact minimal — population continues using Russian forms colloquially

**Official mechanism:** Republican Terminology Commission (Termincom) under the Government of Kazakhstan has approved **35,680 terms since 1971** (as of 2022). The Termincom.kz database holds **383,534 terminology units** as of 2022. However, official approval does not guarantee actual language use.

**Examples of purification pairs:**

| Russian/International loan | Proposed Kazakh equivalent | Adoption status |
|---|---|---|
| телефон | байланыс/сымтелефон | телефон dominates in speech |
| магазин | дүкен | дүкен widely accepted |
| компьютер | дербес компьютер/есептеуіш | компьютер dominates |
| проблема | мәселе | мәселе used in formal written |
| автобус | автобус (no replacement) | no Kazakh term gained traction |
| водка | арақ | арақ used in Kazakh contexts |
| вино | шарап | шарап used in formal contexts |

---

## 3. Modern Kazakh vs Literary Kazakh

### 3.1 The Literary/Colloquial Divide

**Literary (ádebı) Kazakh** is characterized by:
- Adherence to Northeastern dialect as codified standard
- Full pronunciation of all letters and morphemes
- Formal vocabulary following Termincom recommendations
- SOV word order strictly maintained
- Absence of Russian loanwords (aspirationally)

**Colloquial/spoken Kazakh** is characterized by:
- Heavy Russian lexical borrowings (especially in urban areas)
- Code-switching (see §3.2)
- Simplified morphophonology (dropped syllables, elision)
- Non-standard word order under Russian influence
- Regional/dialectal vocabulary

**Key observation for MT:** Dubbing and formal Kazakh media is perceived as stiff and unnatural by native speakers (Reddit/Kazakhstan, February 2025). The "every letter pronounced, slow pace, formal vocabulary" style is difficult to relate to. This creates a quality perception problem — output that is linguistically correct may feel artificial to users.

### 3.2 Code-Switching Patterns (Қазіргі тіл)

Kazakh-Russian code-switching (also called **шала қазақ** — "half Kazakh") is the dominant mode of communication for urban Kazakhs, especially in Almaty, Astana, Shymkent, and other major cities.

**Survey data** (2021 and 2024 surveys, n=100 total educated respondents age 21-40):
- 75–77% of respondents acknowledge mixing Kazakh and Russian
- 54–67% observe others mixing languages
- **Reasons for switching**: "habit and convenience" (32%), "don't know word in target language" (31%), identity/community signaling (remaining portion)

**Types of code-switching:**

| Type | Description | Example pattern |
|---|---|---|
| **Intrasentential** | Russian word(s) inside Kazakh grammatical structure | Kazakh frame + Russian lexical items |
| **Intersentential** | Complete sentence in Russian within Kazakh discourse | Alternating full sentences |
| **Tag-switching** | Russian discourse markers/interjections | "короче," "то есть," "вот" etc. in Kazakh speech |

**Domain triggers** (from research): Topics with high Russian vocabulary density trigger more switching:
- Technical/computer topics: almost entirely Russian or borrowed terms
- Medical terminology: Russian-origin terms dominate
- Legal/bureaucratic language: often Russian-first then Kazakh translation
- Everyday urban life: high switching frequency
- Traditional culture/nature: Kazakh-dominant

**Important nuance:** Code-switching in Kazakhstan is NOT viewed as deficiency — it is a social identity marker and a communicative resource. Mixing signals membership in urban educated culture. "Pure Kazakh" can mark rural origin or ostentatious purism.

### 3.3 Registers: Media vs Academic vs Legal Language

| Register | Characteristics | MT Challenges |
|---|---|---|
| **Legal** | Highest formality; Termincom-approved vocabulary; passive constructions; nominalization heavy | Extreme density of case-marked noun phrases; specialized vocabulary; many terms exist in parallel Kazakh/Russian without clear precedence |
| **Academic** | Heavy Russian influence in scientific terminology; calqued sentence structures; often feels translated | Technical terms may have multiple competing Kazakh equivalents; Russian thought patterns in syntax |
| **News/Media** | Mixed formal/informal; Termincom vocabulary used but Russian names/brands kept | Named entities; current events vocabulary; transliteration of foreign names |
| **Literary/Fiction** | Closest to traditional literary standard; proverbs; figurative language | Idioms; culturally specific vocabulary; archaic forms |
| **Social Media/Colloquial** | Heavy code-switching; abbreviations; Cyrillic/Latin/emoji mixing; borrowings from English | Non-standard morphology; internet slang; mixed scripts |

**KazParC corpus domain breakdown** (for context):
- Legal documents: 20.8% of lines but 41% of tokens (longest sentences)
- Mass media: 32.4% of lines
- General: 25.5%
- Education/science: 12.4%
- Fiction: 8.9%

### 3.4 Youth Slang and Modern Borrowings

Gen Z Kazakh slang (2020s) is characterized by three-way hybridization:

**Russian loanwords in slang:**
- тусовка (tusovka) — "party/gathering"
- бабки (babki) — "money"
- отжигать (otzhigat') — "to party hard"
- нормально (normalno) — "okay/fine"
- прикол (prikol) — "joke/cool thing"

**English internet borrowings:**
- бро (bro) — "brother/friend"
- фейк (feik) — "fake"
- лол/LOL — "laugh out loud"
- хайп (khayp) — "hype"
- мем (mem) — "meme"
- лайкату (laikatu) — "to like [social media]" (Kazakh verb suffix applied to English "like")
- свайпату (swaipatu) — "to swipe"
- байфренд/байфренд (baifrend) — "boyfriend" (Kazakh бай "rich" folk-etymology added)

**Kazakh internet neologisms:**
- Abbreviations mixed with Kazakh morphology
- Non-standard Cyrillic representations of Russian pronunciation
- Mixed Cyrillic-Latin within single words

---

## 4. Key Linguistic Features MT Systems Get Wrong

### 4.1 Agglutination: The Core Challenge

Kazakh is a **highly agglutinative language** — a single word form can encode what requires an entire English or Russian phrase. The canonical example from the KazMorphCorpus-2025 research:

> **балаларымызға** = бала + лар + ымыз + ға  
> = child + PL + 1PL.POSS + DAT  
> = "to our children"

This creates serious MT challenges:
- **Tokenization**: Naïve word-based models treat this as one token, missing the morphological content
- **Segmentation errors**: 31.5% of morphological analysis discrepancies involve incorrect segment boundaries
- **Affix chain misclassification**: 34.0% of discrepancies
- **Borrowing errors**: 14.9% — applying Kazakh morphological rules to foreign stems fails

**Error rate data** (KazMorphCorpus-2025): Even the best hybrid FST+CRF+KazRoBERTa system achieves 90.8% accuracy; mBERT achieves only 82.6%.

**Common affix confusion pairs:**

| Affix | Meaning 1 | Meaning 2 |
|---|---|---|
| -ды/-ді/-ты/-ті | Past tense marker | Accusative case marker |
| -лар/-лер/-дар/-дер/-тар/-тер | Plural suffix | Can be part of other chains |
| -(с)ы/-сі | 3rd person possessive | Can mark definiteness on verbs |
| -ған/-ген | Past participle | Part of relative clause |

### 4.2 The Seven-Case System

Kazakh has **7 cases**, all marked by suffixes with multiple allomorphs due to vowel harmony and consonant assimilation. This is a primary source of MT errors:

| Case | Name (Kazakh) | Suffixes | Main Uses |
|---|---|---|---|
| **Nominative** | Атаý септік | unmarked | Subject; *also* indefinite direct object (crucial distinction) |
| **Accusative** | Табыс септік | -ты/-ті, -ны/-ні, -н, -ды/-ді | *Definite* direct object only |
| **Genitive** | Ілік септік | -ның/-нің, -дың/-дің, -тың/-тің | Possession (triggers possessive suffix on head noun) |
| **Dative** | Барыс септік | -ға/-ге, -қа/-ке, -(н)а/-(н)е | Indirect object; destination; time duration |
| **Ablative** | Шығыс септік | -дан/-ден, -тан/-тен, -нан/-нен | Source; partitive; comparison benchmark |
| **Locative** | Жатыс септік | -да/-де, -та/-те, -нда/-нде | Location; temporal; "when" clauses with participles |
| **Instrumental** | Көмектес септік | -мен/-бен/-пен | Instrument/means; "with" comitative |

**Critical MT error: Nominative-Accusative distinction**

English and Russian both mark direct objects consistently. Kazakh marks direct objects with accusative ONLY when definite. Indefinite direct objects remain in nominative. MT systems trained on Russian→Kazakh incorrectly apply accusative to indefinite objects:

- ✓ Correct: Азамат **қалам** сатып алды (Azamat bought **a pen** — nominative, indefinite)
- ✓ Correct: Азамат **қаламды** сатып алды (Azamat bought **the pen** — accusative, definite)
- ✗ MT error: Азамат **қаламды** сатып алды when source says "a pen"

**Case suffix allomorphy** (dative example with 8 surface forms):

The dative suffix -ға/-ге has 8 allomorphs based on final phoneme of stem: -ға, -ге, -қа, -ке, -на, -не, -а, -е. Systems that fail to learn all allomorph contexts produce vowel harmony violations.

### 4.3 Vowel Harmony — Exceptions and Edge Cases

Kazakh has a **backness harmony system** with 9+ phonemic vowels. The basic rule: suffixes agree in backness with the root vowel. However:

**Systematic exceptions:**

1. **Russian loanwords** do not follow vowel harmony: компьютер (front vowels) + -ке (dative) = компьютерге ✓ (not компьютерқа). Loanwords count as transparent to harmony with the preceding context.

2. **The comitative suffix** -мен/-пен/-бен: Always surfaces with front vowels regardless of root backness. This is one of two "idiosyncratically transparent" suffixes in Kazakh.

3. **The infinitive suffix** -у/-ю: Phonetically varies but morphologically neutral in certain contexts (disputed in academic literature — Bowman & Lokshin 2014 vs. McCollum response).

4. **The polygon-forming suffix** -ген: Front vowel regardless of root; blocks harmony for following suffixes (makes following suffixes match its front quality).

5. **Lip-rounding harmony**: Present in spoken/colloquial Kazakh but NOT in written standard — rounding harmony is only literary in written texts but active phonologically.

6. **International technical terms**: Variable harmony application; speakers often apply native-language-like harmony when forced to inflect foreign stems.

**Key MT implication:** A system that does not know which stems are borrowed will apply wrong harmony variants. The 18% loanword token density in corpora (KazMorphCorpus-2025) means ~1 in 5–6 tokens requires special treatment.

### 4.4 Kazakh Verb Forms Without English/Russian Equivalents

Kazakh has a rich system of verb forms that map poorly to English (4 present forms) and Russian (1 present form):

**Present/Aspect forms:**
- **Ауыспалы осы шақ** (Habitual present): "Fish swim" (general/habitual facts) — балық жүзеді
- **Нақ осы шақ** (Progressive): "He is writing" — ол жазып отыр (writing + sitting AUX)
- **Жедел өткен шақ** (Simple past): witnessed, completed — баттым
- **Бұрынғы өткен шақ** (Remote past): reported/hearsay past — барыпты (heard that someone went)

**Future forms (3 types):**
- **Болжалды келер шақ** (Probabilistic future): "Maybe/probably will" — modal nuance
- **Мақсатты келер шақ** (Purposive future): "Intended to" — different from simple future
- **Ауыспалы келер шақ** (General/habitual future): Used in past contexts as "would" (future-in-past)

**Converb system** (especially challenging for MT):

| Converb | Suffix | Meaning | Example |
|---|---|---|---|
| Sequential | -(I)p | "and then"; durative with AUX | оқып жатыр = "is reading (ongoing)" |
| Simultaneous/manner | -а/-е/-й | "by doing"; continuous | жүре отыр = "sitting while going" |
| Purposive | -ғалы/-гелі | "in order to" | оқығалы келді = "came in order to study" |
| Ability | -а алу | "can/be able to" | сөйлей алады = "can speak" |
| Near-miss | -а жаздау | "almost did" | адаса жазды = "almost got lost" |
| Attempt/benefit | -(I)p алу | "did for oneself" | тауып алды = "found (for own benefit)" |

**Russian/English MT failure pattern:** These converb-auxiliary combinations get collapsed to simple past or present in Russian/English→Kazakh translation. The nuance of "did for oneself," "almost," "while doing," "in order to" is routinely lost.

**Verb forms unique to Kazakh that stump MT:**
- **Жате тұру** (lie down for a while/briefly): "let him lie down awhile" — no single English equivalent
- **Күте тұрсын**: "he will have to wait" OR "tell him to wait" OR "let him wait" — context-dependent
- **-а жатар** (future gradual/future discovery): "they will find out later" — not standard future
- **Causative** (-дыр/-тыр/-ыт/-т) and **passive** (-ыл/-ін) stack with tense/aspect — multilayer complexity

### 4.5 Honorifics and Respect Forms (Сіздеу/Сендеу)

Kazakh has a **T-V distinction** (like French tu/vous, German du/Sie):

| Form | Pronoun (nom) | Use Case |
|---|---|---|
| **Informal (сендеу)** | сен | Peers, younger people, close friends, children |
| **Formal (сіздеу)** | сіз | Elders, superiors, strangers, formal contexts |

**Full case paradigm:**

| Case | сен (informal) | сіз (formal) |
|---|---|---|
| Nominative | сен | сіз |
| Genitive | сенің | сіздің |
| Dative | саған | сізге |
| Accusative | сені | сізді |
| Locative | сенде | сізде |
| Ablative | сенен | сізден |
| Instrumental | сенімен | сізбен |

**Possessive form distinction:**
- Informal 2SG possessive: -ың/-ің (e.g., кітабың "your book")
- Formal 2SG possessive: -ыңыз/-іңіз (e.g., кітабыңыз "your book [formal]")
- Plural informal: -ларың/-лерің
- Plural formal: -ларыңыз/-леріңіз

**MT failure mode:** Russian and English use formal "you" (вы/you) in both polite singular and plural contexts. Kazakh splits these. When translating Russian "Вы" or English "you" to Kazakh, MT systems must determine:
1. Is this singular or plural "you"?
2. If singular, is the social context formal or informal?

MT systems typically default to formal сіз for Russian вы (correct), but fail on:
- Colloquial texts where Russian ты should map to сен
- Group contexts where plural needed (сендер/сіздер)
- Mixed documents with varying registers

Additionally, **ағай** (respectful address for older male), **апай** (respectful address for older female/teacher), **балам** (addressing younger person as "my child"), **қызым** ("my daughter") are used in Kazakh honorific address system but have no direct translation. These are sometimes collapsed to Russian-style forms or omitted entirely in MT output.

### 4.6 SOV Word Order and Structural Reordering

Kazakh is **strictly SOV (Subject-Object-Verb)**. In contrast:
- Russian: SVO (flexible but default SVO)
- English: SVO (rigid)

For MT from Russian/English, the verb must be moved from second position to final position, and the entire argument structure reorganized. This is the most fundamental structural transformation required.

**Additional complexity:**
- Modifiers (adjectives, relative clauses, possessors) **precede** their head nouns in Kazakh — opposite of English "the man who came" vs. Kazakh **келген** адам (come-PST.PTCP man)
- Postpositions replace prepositions: "in the city" = қалада (city-LOC), "from the city" = қаладан (city-ABL)
- Subordinate clauses are non-finite and precede the main clause verb

**MT consequence:** Attention mechanisms in neural MT struggle with long-distance reordering when source-target word alignment differs fundamentally. KazParC research notes that intricate syntactic structures in Kazakh-Russian alignment required 40% manual correction in prior work.

### 4.7 Numbers, Dates, and Currency Formatting

**Date format in Kazakh:**
- Short: `yyyy.dd.mm` (e.g., 2026.31.03)  
- Long format: `yyyy ж. d MMMM` (e.g., **2026 ж. 31 наурыз**)  
- Full format: `yyyy ж. dd MMMM` (e.g., **2026 ж. 31 наурыз**)

**Month names in Kazakh** (not borrowed from Russian, unlike some other Turkic languages):

| # | Kazakh | Transliteration | Meaning |
|---|---|---|---|
| 1 | Қаңтар | Qantar | January ("when rivers freeze") |
| 2 | Ақпан | Aqpan | February |
| 3 | Наурыз | Nawryz | March ("Nauryz" — new year) |
| 4 | Сәуір | Säwir | April |
| 5 | Мамыр | Mamyr | May |
| 6 | Маусым | Mawsym | June |
| 7 | Шілде | Şilde | July |
| 8 | Тамыз | Tamyz | August |
| 9 | Қыркүйек | Qyrküiek | September |
| 10 | Қазан | Qazan | October |
| 11 | Қараша | Qaraşa | November |
| 12 | Желтоқсан | Jeltöqsan | December |

**Localization marker:** When writing dates, the year requires the postparticle **"ж."** (abbreviation of **жыл** = year): "2026 ж." not just "2026".

**Currency:** Tenge = **теңге** (тг). Amount formatting: **1 500 000 теңге** (space as thousands separator in Kazakh format). Ordinal numbers: -ыншы/-інші added to cardinal: **бірінші** (1st), **екінші** (2nd).

**Ordinal/cardinal distinction important in MT:** Russian "первый" can map to either Kazakh **бірінші** (ordinal) or context demands checking whether cardinal **бір** is appropriate.

### 4.8 Kazakh Idioms and Phraseology Resisting Literal Translation

Kazakh idioms (мақал-мәтел) are deeply rooted in nomadic pastoral culture and resist literal translation:

**Nomadic/pastoral idioms:**

| Kazakh idiom | Literal translation | Actual meaning |
|---|---|---|
| Жүрегі тас төбесіне шығу | "Heart goes to the top of stone/head" | To be very scared |
| Айызы қану | "Thirst is quenched" | To be extremely happy/satisfied |
| Қанжығасына жеңісті байлау | "To tie victory to the saddlebag" | To achieve victory/succeed |
| Зығырданын қайнату | "To boil his linseed oil" | To irritate someone greatly |
| Аузына құм құйылды | "Sand poured into his mouth" | Lost ability to speak/shocked into silence |
| Бетті бері қарау | "Face turned this way" | To recover/get better |
| Жерден алып жерге салу | "Taken from ground and put back on ground" | To abuse/criticize harshly |
| Жұбайының көзіне шөп салу | "To put grass in spouse's eyes" | To commit adultery/deceive spouse |
| Пора порасы шыққанша жылау | "Cry until your pores open" | To cry uncontrollably |
| Үзеңгілес | "One who shares the stirrup" | Close companion/comrade (martial origin) |

**Proverbs with no direct equivalent:**

- **Токсан ауыз сөздің тобықтай түйіні** — "The essence of 90 words in a knucklebone" = wisdom compressed into brief form
- **Достың жылатып айтады, дұшпан күлдіртіп айтады** — "A friend tells truth making you cry; an enemy flatters making you laugh"
- **Туған жердің жусаны да тәтті** — "Even the wild onion/wormwood of one's homeland is sweet" = patriotism/homesickness
- **Кез кеткен, бар бол** — farewell blessing with no Russian/English equivalent (lit. "may your eyes leave [well/safely]")

**Key issue for MT:** These idioms cannot be computed from their parts. They require a phrasebook/lexicon approach rather than compositional translation.

---

## 5. Academic Resources and Corpora

### 5.1 Parallel Corpora for MT

**KazParC** (ISSAI, Nazarbayev University, 2024)
- **URL:** https://issai.nu.edu.kz/2024/07/01/kazparc-kazakh-parallel-corpus-for-machine-translation/
- **ACL:** https://aclanthology.org/2024.lrec-main.842/
- **Size:** 371,902 human-translated parallel sentences (KK↔EN, KK↔RU, KK↔TR)
- **Domains:** Mass media (32.4%), General (25.5%), Legal (20.8%), Education/Science (12.4%), Fiction (8.9%)
- **Quality:** 41,600 person-hours of human effort (10 translators × 26 months × 160 hrs/month)
- **Derived model:** Tilmash — NLLB-200-distilled-1.3B fine-tuned on KazParC + SynC (1.7M synthetic sentences)
- **BLEU results** (KazParC test set, higher is better, 0–1 scale):

| Direction | Tilmash (parsync) | Google Translate | Yandex Translate |
|---|---|---|---|
| EN→KK | 0.58 | 0.30 | 0.21 |
| RU→KK | 0.61 | 0.24 | 0.23 |
| KK→EN | 0.62 | 0.31 | 0.28 |
| KK→RU | 0.63 | 0.29 | 0.29 |

Note: BLEU scores for KK are inherently lower than European language pairs due to agglutination (each morphological form is a unique token). ChrF scores provide a more morphology-friendly metric.

**SynC** (synthetic corpus included with KazParC):
- 1,797,066 sentences auto-translated via Google Translate from English crawled data
- Lower quality but useful for domain coverage

### 5.2 Monolingual Kazakh Corpora

**Qazcorpora.kz / Qazcorpus.kz** (National Kazakh Language Corpus)
- Government-funded national corpus
- 43 million meta-tagged tokens as of end-2022 (actively growing)
- URL: https://qazcorpora.kz

**MDBKD** (Multi-Domain Bilingual Kazakh Dataset)
- 24,883,808+ unique texts from multiple domains
- Used for training KazRoBERTa (conversational variant)

**KazMorphCorpus-2025** (Baitenova et al., 2025)
- 150,000 sentences (~2 million word tokens)
- Manually annotated for morphological analysis
- 5 domains: fiction, news, social media, scientific, legal

### 5.3 NLP Datasets and Benchmarks

| Dataset | Task | Size | Notes |
|---|---|---|---|
| **KazNERD** (Yeshpanov et al., 2022) | Named Entity Recognition | 112,702 tokens | 25 entity classes; news, fiction, legal |
| **KazQAD** (Yeshpanov et al., 2024) | Question Answering | — | Built from Wikipedia and educational texts |
| **KazBench-KK** (2025) | Cultural knowledge QA | 7,111 questions | 17 culturally salient domains; pastoral, social hierarchies, politics |
| **KazUnified National Testing MC** | Multiple choice QA | — | Based on KZ education system |
| **SIB-200** (Kazakh subset) | Topic classification | — | Part of multilingual benchmark |
| **Belebele** (Kazakh) | Reading comprehension | — | Part of multilingual reading benchmark |

### 5.4 Language Models

| Model | Type | Strengths | Source |
|---|---|---|---|
| **KazRoBERTa** | Monolingual RoBERTa | 90.8% morphological accuracy; best for Kazakh NLP | HuggingFace: kz-transformers/kaz-roberta-conversational |
| **KazBERT** | Monolingual BERT | F1=0.947 on morphological tagging | |
| **mBERT** | Multilingual BERT | 82.6% morphological accuracy; worse than mono | Standard HuggingFace |
| **XLM-R** | Cross-lingual | Moderate QA performance | |
| **Tilmash** | Neural MT (NLLB fine-tuned) | Best public KK↔EN/RU MT | ISSAI |
| **SozKZ** (2026) | Small Kazakh LM | 600M params, 9B token training; released open | ArXiv 2603.20854 |
| **KazLLM-70B** | Large Kazakh LLM | Best on cultural benchmarks (~69% KazBench) | |
| **NLLB-200** | Multilingual MT | Decent baseline; improved by fine-tuning | Meta |

**KazRoBERTa outperforms mBERT by 8.2 percentage points** on morphological analysis — strongly recommend using KazRoBERTa-based components in any Kazakh NLP pipeline.

### 5.5 Morphological Analysis Tools

**Apertium-kaz**
- URL: https://github.com/apertium/apertium-kaz
- Rule-based FST morphological analyzer/generator and CG tagger
- Used in: KK↔TT, EN↔KK, KG↔KK, KK↔KAA, KK↔RU pairs
- Files: `kaz.lexc` (dictionary), `kaz.twol` (morphophonological rules), CG disambiguation rules
- Status: Actively maintained; foundation for many Kazakh NLP tools
- Error detection research uses Apertium platform as analysis backbone

**KazNLP** (GitHub: makazhan/kaznlp)
- URL: https://github.com/makazhan/kaznlp
- Open-source toolkit: tokenizer, language detector, morphological analyzer, tagger
- Status: Initial release ~2018; check for updates

**Hybrid FST+CRF+KazRoBERTa system** (Baitenova et al., 2025, Frontiers in AI)
- State-of-the-art: 90.8% accuracy, F1=0.907
- Three-stage pipeline: FST → CRF disambiguation → KazRoBERTa neural refinement
- Quantized version: 1.5GB memory, 1060 tokens/sec throughput

### 5.6 Official Language Resources and Standards

**Termincom.kz** (Republican Terminology Commission database)
- URL: https://termincom.kz
- 383,534 terminology units (as of 2022)
- 35,680 terms approved since 1971
- Sections: Approved Terms, Chronology, Branch Terms, Discussion
- Annual additions: 4,069 new terms approved in 2022 across legislation, healthcare, energy, agriculture, ecology, geology
- **Critical for MT:** This is the authoritative source for official Kazakh technical vocabulary. MT system should integrate Termincom-approved forms as preferred translations in technical/official domains.

**Sozdikqor.kz** (Universal dictionary platform)
- 400,000+ words, 1,243,850 linguistic units
- 60+ industry dictionaries and encyclopedias
- Includes 15-volume Dictionary of Kazakh Literary Language, Abai's dictionary, Akhmet Baitursynov's encyclopedia, phraseological dictionary
- API/bot: @Sozdikqor.kz (Telegram)

**Emle.kz** — Orthographic electronic database
**Qazgramma.kz** — Grammar reference
**Qazlatyn.kz** — Latin alphabet resources
**Atau.kz** — Onomastics (names/places)

**Baitursynov Institute of Linguistics** — Primary academic body for Kazakh linguistics; coordinates script transition working groups; produced current (2021) Latin alphabet

### 5.7 MT Quality on Standard Benchmarks

From KazParC paper (BLEU, FLoRes test set):

| Direction | Tilmash | Google | Yandex |
|---|---|---|---|
| EN→KK | 0.56 | 0.60 | 0.20 |
| RU→KK | 0.52 | 0.53 | 0.13 |
| KK→EN | 0.62 | 0.62 | 0.31 |
| KK→RU | 0.51 | 0.52 | 0.18 |

**Key insight:** Google Translate performs best on EN→KK FLoRes (0.60) but Tilmash matches or exceeds Google on KazParC test set (which reflects domain-appropriate content). RU→KK is consistently harder than EN→KK across all systems, and Tilmash shows particular strength in the KazParC legal domain.

---

## 6. Cultural and Pragmatic Considerations

### 6.1 Formal vs Informal Register Rules

**Register selection triggers:**

| Context | Register | Pronoun | Notes |
|---|---|---|---|
| Legal/government documents | Formal | Сіз | Mandatory formal; passive voice preferred |
| Official correspondence | Formal | Сіз | Full Termincom vocabulary |
| Academic writing | Formal | Сіз (if addressing) | May use impersonal constructions |
| News media | Semi-formal | — | Mix; Termincom terms but natural syntax |
| Customer service | Formal | Сіз | Business standard |
| Social media | Informal | Сен or ambiguous | Heavy code-switching |
| Literature/fiction | Variable | Character-dependent | Historical literature uses archaic forms |
| Spoken interaction | Variable | Age/status dependent | See honorifics §4.5 |

**Address forms beyond pronouns:**

- **Ағай** (aqay): Respectful address for older male teacher, colleague, or respected person — used where Russian would say "Владимир Иванович" or "уважаемый"
- **Апай** (apay): Same function for women
- **Мырза**: Formal "Mr." (from Persian; used in formal titles)
- **Ханым**: "Mrs./Ms." (formal)
- **Азамат**: "Citizen" (Soviet-era formal address still used)
- **Жолдас**: "Comrade" (Soviet era; now dated but occasionally ironic)

### 6.2 Loanwords: When to Use Kazakh Equivalents vs Accepted Loans

This is a contested area requiring nuanced MT policy. The following framework reflects current usage patterns:

**Use Kazakh Termincom equivalents when:**
- Output is for official government documents
- Domain is legal, administrative, legislative
- Target audience is formal/institutional
- Topic is covered by published Termincom terms

**Retain Russian/international loanwords when:**
- Source text is colloquial or informal
- Term is deeply embedded (no widely-recognized Kazakh equivalent)
- Technical/scientific term where international form aids precision
- Named entities (brand names, product names, institutions)

**Practical examples:**

| Domain | Loanword form | Kazakh equivalent | MT recommendation |
|---|---|---|---|
| Legal | — | заң (law), сот (court) | Use Kazakh forms (well-established) |
| Technology | компьютер | дербес компьютер/есептеуіш | компьютер in general; official docs use Termincom |
| Medical | диагноз, операция | — (no established alternatives) | Use international forms |
| Administration | министрлік | — | Казakhized borrowing acceptable |
| Transport | автобус, поезд | — | No Kazakh alternatives established |
| Modern tech | смартфон, интернет | — | International forms dominant |

### 6.3 "Қазақстандық" vs "Қазақ" — Identity and Sensitivity

This is arguably the most culturally sensitive terminological distinction for MT systems serving Kazakhstan:

**Қазақ** (Qazaq):
- Refers specifically to the **ethnic group** (Kazakh people, their culture, language)
- Ethnicity marker: "Мен қазақпын" = "I am (an ethnic) Kazakh"
- Language: "Қазақ тілі" = Kazakh language (of the Kazakh people)

**Қазақстандық** (Qazaqstandyq):
- Refers to **citizens of Kazakhstan** regardless of ethnicity
- Civic identity: "Мен қазақстандықпын" = "I am a Kazakhstani (citizen)"
- Policy documents use this when addressing all citizens
- Inclusive of ethnic Russians, Uzbeks, Koreans, Germans etc. living in Kazakhstan

**Why this matters for MT:**
- Russian "казахский" (Kazakh) can mean either — context-dependent
- English "Kazakh" similarly ambiguous
- Mistranslating "all citizens of Kazakhstan" as "қазақтар" (Kazakhs) is ethnically exclusionary
- The 2026 constitutional debate specifically highlighted this: Kazakhstan's identity is "polysynthetic" combining ethnic and civic dimensions
- Use **қазақстандық** for civic/national identity; **қазақ** for ethnic/linguistic identity

**Related terms:**
- **Қазақша** = "in Kazakh (language)" or "in the Kazakh way"
- **Қазақстан** = the country Kazakhstan
- **Шала қазақ** = "half-Kazakh" (pejorative/informal — used for Kazakhs who don't speak Kazakh)
- **Нағыз қазақ** = "true/real Kazakh" (ideological claim about ethnic authenticity)

### 6.4 Islamic Terminology in Kazakh Context

Kazakhstan is predominantly Sunni Muslim (Hanafi school), but Islamic practice is "folk" rather than orthodox — nomadic Kazakh culture synthesized Islam with pre-Islamic Tengrist beliefs. This affects terminology:

**Commonly used Islamic terms in everyday Kazakh:**

| Term | Origin | Everyday usage |
|---|---|---|
| Алла | Arabic Allah | Common exclamation; "Алла-ай!" = "Oh my God!" |
| Иншалла | Arabic Inshallah | "If God wills" — used casually |
| Рахмет | Arabic Rahmat | "Thank you" (most common thank-you word) |
| Мешіт | Arabic Masjid | Mosque |
| Намаз | Persian Namaz | Prayer (5x daily) |
| Ораза | Persian Rozah | Fasting/Ramadan fast |
| Хала | Arabic Halal | "Permissible"; also "fine/okay" colloquially |
| Иман | Arabic Iman | Faith; **has been desacralized** — now often means "morality/humanity" |
| Дүние | Arabic Dunya | "The world/life" (secular meaning dominant) |

**Key desacralization**: Many Arabic religious terms in Kazakh have lost their specifically religious meaning. "Иманды" (from Arabic iman = faith) now primarily means "a moral, decent person" rather than "a believer." MT systems trained on Arabic-Kazakh data may produce overly religious translations.

**Modern Islamic revival**: Since the 1990s, there has been a revival of explicitly Islamic vocabulary. Terms that were previously archaic (used only in pre-revolutionary texts) have re-entered active use. MT systems trained on Soviet-era corpora will under-represent this vocabulary.

**Translation notes for Qur'an-related text:**
- Standard Kazakh translation of the Qur'an by Halifa Altay uses **Кур'ан Кәрім** (following Saudi/KFQPC convention)
- Older Kazan Tatar/Soviet-era texts use **Хадис**, **Ислам** with slightly different transliterations
- Term **Пайғамбар** = Prophet (can refer to any prophet, not just Muhammad)

### 6.5 Soviet-Era vs Modern Naming Conventions

**Personal names:**

| Soviet-era naming patterns | Post-independence patterns |
|---|---|
| Russian first names with Kazakh surnames: Владимир Сейткали | Revived traditional Kazakh names: Болат, Айдар, Жансая |
| Patronymics on Russian model: Ибрагимович | Kazakh patronymic: -ұлы (son of) / -қызы (daughter of): Ибрагімұлы, Ибрагімқызы |
| Russian suffixed surnames: Сейтов, Ахметов | Traditional forms: Сейт, Ахмет (without Russian -ов/-ев) |

**Patronymic/surname changes:** Since 2021, Kazakhstanis can legally change their Russified surnames to Kazakh forms. MT systems should handle both:
- **Old form**: Назарбаев (surname with Russian -ев suffix)
- **New form**: Назарбайұлы (Nazarbay's son) or Назарбаева → Назарбайқызы

**Place names:**

| Soviet/Russian name | Kazakh name | Status |
|---|---|---|
| Алма-Ата | Алматы | Official change 1993 |
| Целиноград → Акмола → Астана → Нур-Султан | Астана (2022) | Reverted to Астана under Tokayev |
| Гурьев | Атырау | Official since 1991 |
| Чимкент | Шымкент | Official since 1993 |
| Семипалатинск | Семей | Official since 2007 |
| Усть-Каменогорск | Өскемен | Official since 1993 |

**Note:** MT systems must handle all variants — both old Russian names (which appear in historical texts and in speech of older generation) and new Kazakh names.

**Institutional naming:** Soviet-era institutions often had Russian-first names; modern equivalents have Kazakh-first names. State institutions are now officially named in Kazakh with Russian as secondary.

---

## 7. Practical Recommendations for Қазтілші

### 7.1 Training Data Strategy

**Priority 1: Domain-aware corpora**
- Prioritize KazParC (371,902 human-translated sentences) as the core training resource — it is the highest-quality available parallel corpus
- Supplement with Qazcorpora.kz for monolingual Kazakh (43M+ tokens)
- For RU→KK specifically: build a Russian-Kazakh parallel corpus focused on government documents, legal texts, and news — these are the highest-frequency official use cases

**Priority 2: Termincom integration**
- Integrate Termincom.kz (383,534 terms) as a forced translation lexicon for technical/official terminology
- Create a domain classifier to activate appropriate Termincom term sets
- Periodically sync with Termincom.kz for new approved terms (4,000+ per year)

**Priority 3: Colloquial data**
- The KazParC corpus is biased toward formal registers (legal 41% of tokens)
- Augment with social media/conversational data for natural output
- The MDBKD dataset (24.8M texts) provides good domain coverage

### 7.2 Morphological Processing Pipeline

**Required components:**

1. **Morphological analyzer**: Use Apertium-kaz FST as the rule-based backbone
2. **Neural disambiguation**: KazRoBERTa for contextual disambiguation (outperforms mBERT by 8.2pp)
3. **Loanword detection**: Flag tokens not in native Kazakh lexicon for special harmony/suffix handling
4. **Subword tokenization**: Use BPE or unigram LM tokenization that respects morpheme boundaries — avoid character-level or word-level only

**Critical**: A dedicated 50K BPE tokenizer trained on Kazakh (as in SozKZ, 2026) substantially outperforms multilingual tokenizers for topic classification and downstream tasks.

### 7.3 Key Quality Checks for MT Output

**Check 1: Vowel harmony consistency**
- All suffix vowels must harmonize with the preceding root
- Detect violations: any suffix with a back vowel following a front-vowel root (or vice versa)
- Exception list needed for: comitative (-мен/-бен/-пен — always front), Russian loanwords, international terms

**Check 2: Definite/Indefinite DO marking**
- Input English/Russian "a/один/одна" → Kazakh nominative (indefinite DO)
- Input English/Russian "the/этот/тот" → Kazakh accusative (definite DO)
- Common MT error: applying accusative to all direct objects

**Check 3: Case suffix allomorphy**
- Dative: verify -ға/-ге/-қа/-ке selection based on final consonant voicing
- Ablative: -дан/-ден/-тан/-тен/-нан/-нен selection
- Genitive: proper possessive suffix triggering on head noun

**Check 4: Honorific consistency**
- Detect source language formality level
- Consistently apply сіз OR сен throughout a document
- Do not mix formal/informal address within a single translation

**Check 5: SOV order**
- Verify predicate is clause-final
- Verify modifiers precede head nouns
- Relative clauses must precede their head nouns (participle construction)

**Check 6: Converb selection**
- Progressive: use -(I)p + otyr/jat/jür/tur (situational AUX)
- Habitual: use habitual present suffix
- Do not collapse all aspectual distinctions to simple past

### 7.4 Register and Formality Handling

**Implement a register detector** for input texts:
- Legal/official → apply full Termincom vocabulary, formal grammar
- News/media → balanced register, international names unchanged
- Conversational → accept code-switching patterns in input; output in natural colloquial register
- Technical → domain-specific terminology from Termincom sector dictionaries

**Register markers in Russian to watch:**
- Russian вы → formal сіз (default for most MT contexts)
- Russian ты in clearly personal/informal text → сен
- Russian formal titles → Kazakh honorific equivalents (ағай/апай where appropriate)

### 7.5 Handling Code-Switched Input

**~75-77% of urban Kazakh speakers mix languages.** For an MT system, this means:

- **RU→KK**: Source may already contain Kazakh words — detect and pass through, don't re-translate
- **EN→KK**: Source may have Kazakh names/terms — handle as proper nouns
- **Output normalization**: Decide policy — pure Kazakh output vs. code-switched natural Kazakh?
  - Recommendation: Pure Kazakh output for formal register; optionally allow accepted Russian loanwords (компьютер, телефон) in informal register

**Шала қазақ avoidance**: Ensure the system doesn't produce stilted "translation Kazakh" (аударма қазақша) — the unnatural register produced by direct calquing of Russian syntax into Kazakh lexemes. This requires:
- Native Kazakh syntactic patterns (converb chains, SOV order)
- Avoiding Russian-style conjunction overuse
- Using traditional Kazakh discourse markers

### 7.6 Script Handling

**Current (2026) status**: Cyrillic primary for all official output.

**Recommended architecture:**
- Primary: Cyrillic output
- Secondary module: Cyrillic↔Latin (2021 Qazaq Latin) transliteration
- Optional: Cyrillic→Arabic (for Chinese Kazakh diaspora materials)

**Latin alphabet (2021 version) character mapping for key Kazakh sounds:**

| Sound | Cyrillic | Latin (2021) |
|---|---|---|
| [æ] | ə/Ə | Ä ä |
| [ʏ] | ү | Ü ü |
| [ɣ] | ғ | Ğ ğ |
| [ŋ] | ң | Ń ń |
| [œ] | ө | Ö ö |
| [q] | қ | Q q |
| [χ] | х | H h |
| [ʃ] | ш | Ş ş |
| [ʒ] | ж | J j or Zh zh |

### 7.7 Idiom and Phraseme Handling

**Build a Kazakh phraseme lexicon** including:
- Мақал-мәтел (proverbs) with their pragmatic meanings
- Body-based idioms (жүрек/heart, аузы/mouth, қол/hand idioms)
- Pastoral idioms (animal, nomadic life references)
- Source: Kenesbayev's phraseological dictionary (available on Sozdikqor.kz)

**MT approach for idioms:**
- Detect fixed expressions using n-gram comparison against phraseme lexicon
- Do not translate component-by-component
- Provide cultural equivalent from Sozdikqor.kz phraseological database when available

### 7.8 Islamic and Cultural Sensitivity

**General policy:**
- "Қазақ" for ethnic Kazakh context; "Қазақстандық" for civic/national context
- Never use ethnic terms when source says "citizens" or "people of Kazakhstan"
- Islamic greetings: **Ассалаумалайкүм** (formal Islamic greeting) vs. **Сәлем** (informal everyday); context-dependent
- Common Islamic terms: always use accepted Kazakh forms (Алла not Allah; Намаз not Salat; Ораза not Sawm)
- Modern Islamic revival vocabulary: build a lexicon of reactivated Arabic religious terms

**Soviet-era naming:**
- Recognize both Russian-suffixed (Ахметов) and Kazakh patronymic (Ахметұлы) forms as the same entity
- Recognize both Soviet-era and modern place names
- Handle Нур-Султан/Астана ambiguity (city was Нур-Султан 2019–2022, now Астана again)

### 7.9 Evaluation Recommendations

**Beyond BLEU:** BLEU significantly underestimates Kazakh MT quality due to agglutination. Use:
- **ChrF**: Character n-gram F-score — more appropriate for morphologically rich languages
- **COMET**: Neural-based MT evaluation with reference — better semantic assessment
- **Human evaluation**: Native speaker fluency/adequacy judgment remains essential
- **KazBench-KK**: Cultural knowledge benchmark for evaluating broader Kazakh understanding

**Recommended test sets:**
1. KazParC test set (human-translated, multi-domain)
2. FLoRes-200 Kazakh test set (standard multilingual benchmark)
3. Custom legal/administrative test set (given legal is 41% of KazParC tokens)
4. Colloquial/social media test set (currently under-represented)

---

## Summary of Critical Findings

| Issue | Priority | MT Impact |
|---|---|---|
| Agglutination with long affix chains | Critical | 25-34% of morphological errors |
| Vowel harmony exceptions for loanwords | High | 18% of tokens are borrowings |
| Nom. vs Acc. for definite/indefinite DO | High | Consistent category of error |
| SOV reordering from SVO source | Critical | Fundamental structural mismatch |
| Converb/auxiliary form selection | High | Aspect/modality nuance lost |
| сіз vs сен register consistency | Medium | Social register violations |
| Termincom vocabulary for official texts | High | Compliance and naturalness |
| Қазақ vs Қазақстандық distinction | Medium | Cultural/political sensitivity |
| Code-switching input handling | Medium | Especially for RU→KK |
| Idiom/phraseme non-compositionality | Medium | Translation failures for set phrases |
| Script: Cyrillic primary + Latin support | High | 2031 transition ongoing |
| Date/number localization | Medium | Format differences from source |

---

## Key Sources

- **KazParC corpus and Tilmash MT system** (ISSAI, 2024): https://aclanthology.org/2024.lrec-main.842/
- **KazMorphCorpus-2025 hybrid analyzer** (Baitenova et al., 2025): https://pmc.ncbi.nlm.nih.gov/articles/PMC12741073/
- **LDC Kazakh Language Specific Peculiarities** (LDC, 2018): https://catalog.ldc.upenn.edu/docs/LDC2018S13/LSP_302_final.pdf
- **A Grammar of Kazakh** (Dotton & Wagner, Duke): https://slaviccenters.duke.edu/sites/slaviccenters.duke.edu/files/file-attachments/kazakh-grammar.pdf
- **Kazakh dialects regional variations** (Talkpal): https://talkpal.ai/culture/how-do-distinct-dialects-vary-across-the-different-regions-of-kazakhstan/
- **Kazakh alphabets history** (Wikipedia): https://en.wikipedia.org/wiki/Kazakh_alphabets
- **Code-switching patterns** (RUDN Journal, 2021): https://rudn.tlcjournal.org/issues/8(2)-01.html
- **Modern and Traditional Kazakh Speech** (ERIC): https://files.eric.ed.gov/fulltext/EJ1475214.pdf
- **Error analysis EN→KK MT** (ASLING TC44): https://asling.org/tc44/slides/TC44-Akmurzina-Error_Analysis_for_Machine_Translated_Text_from_English_into_Kazakh(v2-25nov).pdf
- **Vowel harmony exceptions** (McCollum, Dartmouth): https://journals.dartmouth.edu/cgi-bin/WebObjects/Journals.woa/xmlpage/1/document/1133
- **Law on Languages (1997, as amended 2025)**: https://adilet.zan.kz/eng/docs/Z970000151_
- **Termincom.kz** (Republican Terminology Commission): https://termincom.kz
- **Sozdikqor.kz** (Universal Kazakh dictionary): https://sozdikqor.kz
- **Qazcorpora.kz** (National Kazakh corpus): https://qazcorpora.kz
- **Apertium-kaz** (morphological analyzer): https://github.com/apertium/apertium-kaz
- **KazRoBERTa** (language model): https://huggingface.co/kz-transformers/kaz-roberta-conversational
- **SozKZ** (small Kazakh LM, 2026): https://arxiv.org/html/2603.20854v1
- **KazBench-KK** (cultural benchmark): https://aclanthology.org/2025.fieldmatters-1.4.pdf
- **TurkicNLP toolkit**: https://arxiv.org/html/2602.19174v4
- **Arabic-Iranian borrowings in Kazakh** (RUDN, 2023): https://journals.rudn.ru/semiotics-semantics/article/view/34172
- **Kazakh language policy** (Kazakhstan government): https://egov.kz/cms/en/articles/culture/kurs_kazakhskogo_yazika
- **Dialect variations NUW study**: https://nur.nu.edu.kz/bitstreams/9c909a49-b298-444c-b0e1-962db6cd7e22/download
- **Language policy 2023–2029 concept** (Eurasianet, 2024): https://eurasianet.org/kazakhstan-government-taking-action-to-promote-kazakh-language
- **Cyrillic-Latin decolonization** (CABAR Asia, 2023): https://cabar.asia/en/the-role-of-transition-of-kazakh-language-from-cyrillic-alphabet-in-decolonisation
- **Kazakh Future Tense Forms** (KazNU Philology): https://philart.kaznu.kz/index.php/1-FIL/article/download/3364/2776
- **Kazakh idioms and English equivalents**: http://www.rusnauka.cz/pdf/286047.pdf
- **Kazakh language policy thesis** (USC): https://scholarcommons.sc.edu/cgi/viewcontent.cgi?article=1689&context=senior_theses
- **2026 Kazakh constitution language debate** (RFE/RL): https://www.rferl.org/a/kazakhstan-constitutional-referendum-toqaev-power-language-russian-status/33675122.html
- **Kazakh proverbs cultural context** (Astana Times, 2025): https://astanatimes.com/2025/03/wisdom-in-words-enduring-power-of-kazakh-proverbs/
