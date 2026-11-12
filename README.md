# Il mio piano — Webapp V1.1

Aggiornamento della webapp personale Next.js + Supabase.

## Novità V1.1

- 5 slot giornalieri fissi:
  1. Colazione
  2. Spuntino metà mattina
  3. Pranzo
  4. Spuntino metà pomeriggio
  5. Cena
- La Home mostra il menu completo scelto per colazione e spuntini.
- Ogni scelta può essere cambiata o eliminata.
- Ogni slot può essere registrato come **Secondo il piano / Modificato / Libero**.
- Calendario cliccabile con dettaglio completo di ciò che è stato mangiato.
- Statistiche: aderenza sui pasti registrati, completezza diario, piano vs liberi, allenamenti.
- Modifica manuale degli alimenti/quantità del piano dalla sezione Dieta.
- Storico delle modifiche al piano.
- Equivalenze visibili in sezioni espandibili.
- Restyling mobile-first.

## 1. Prima del deploy: migrazione Supabase

In Supabase apri **SQL Editor → New snippet** e incolla il contenuto di:

`supabase/migration_v1_1.sql`

Poi premi **Run**.

La migrazione aggiunge lo stato `free` ai pasti. Non elimina né modifica i dati esistenti.

## 2. Variabili Vercel

Mantieni le variabili già configurate:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Non inserire secret/service-role keys nel frontend.

## 3. Deploy

Il progetto è pronto per Vercel/Next.js.

Nota importante: Vercel Drop crea un nuovo progetto ad ogni upload. Per mantenere sempre lo stesso URL durante gli aggiornamenti conviene collegare il progetto a un repository GitHub/GitLab/Bitbucket.

## 4. Logica aderenza

- `Secondo il piano` contribuisce all'aderenza.
- `Modificato` viene mostrato separatamente.
- `Libero` viene mostrato separatamente.
- Un pasto non registrato NON viene classificato come fuori piano.
- La completezza del diario è una metrica separata (slot registrati / 5 slot previsti).


## Patch 1.1.1
- gestione errori di salvataggio senza crash pagina
- pasto libero uniforme su tutti e 5 gli slot
- pasto modificato parte sempre da una opzione/pasto del piano
- colazione e spuntini modificati richiedono l'opzione di partenza
- il menu di partenza resta visibile e la modifica viene salvata come nota
- visualizzazione `* nota registrata` in Home e Calendario

## V1.1.3
- Login server-side più robusto con Supabase SSR
- Branding login: ASTARTE / 1% better, everyday


## ASTARTE v1.2.0

Nuove funzioni:
- Calendario mensile a caselle
- Verde solo se i 5 pasti sono tutti "Secondo il piano"
- Highlight della giornata corrente
- Dettaglio giornaliero dal calendario
- Flag Acqua ≥ 2 L
- Mindfulness multi-selezione: Respirazione, Meditazione, Journaling, Off Grid
- Statistiche per acqua e mindfulness

### Prima del deploy

Eseguire in Supabase SQL Editor:

`supabase/migration_v1_2.sql`

Poi caricare i file su GitHub e fare commit su `main`. Vercel farà il deploy automatico.


## ASTARTE v1.3.0 — nuova dieta ogni 6 settimane

Prima del deploy eseguire `supabase/migration_v1_3.sql`.

Funzioni:
- upload PDF privato nella sezione Dieta;
- creazione automatica di una nuova versione in bozza;
- clonazione della dieta attiva come base della bozza;
- revisione/modifica manuale della bozza;
- attivazione con archiviazione automatica della dieta precedente;
- eliminazione della bozza e del PDF caricato.

Nota: questa versione NON interpreta automaticamente il contenuto del PDF. La bozza parte dalla dieta attuale e permette di applicare manualmente le modifiche del nutrizionista prima dell'attivazione. L'estrazione automatica dal PDF richiede un servizio di parsing/AI separato e verrà aggiunta come funzione successiva.


## v1.3.1 — Stability patch
- Gli errori di salvataggio pasti e nuova dieta vengono mostrati con il messaggio reale Supabase, non più come React #441.
- "Libero" usa un salvataggio più sicuro: la vecchia registrazione viene rimossa solo dopo il successo della nuova.
- Inversione pranzo/cena: rollback visivo se il database rifiuta il salvataggio.
- Calendario: ogni giorno è apribile, anche senza registrazioni.
- Evidenza più netta per oggi e per giornate verdi 5/5.
- Creazione bozza dieta più robusta e protezione contro bozze duplicate.

## v1.3.2 — Colori calendario
- Verde: tutti i 5 pasti registrati, ciascuno secondo piano o modificato.
- Giallo: tutti i 5 pasti registrati, almeno uno libero.
- Grigio: almeno un pasto mancante (anche se altri sono liberi).
- Oggi: bordo dedicato indipendente dallo stato.
- Modifica solo frontend, non richiede migrazioni Supabase.


## ASTARTE v1.3.3 — Statistiche allineate al calendario
- KPI in alto relativi alla settimana corrente (lunedì-oggi): giorni allenamento, giorni verdi 5/5, mindfulness, acqua ≥ 2 L.
- Secondo il piano e Modificato sono entrambi buoni.
- Lo streak conta i giorni verdi, si azzera su giallo e non cambia su grigio. Non considera giorni futuri.
- Rimosso il blocco «Distribuzione pasti»; mantenuta una barra Piano/modificati vs Liberi.
- Frase motivazionale deterministica, diversa al variare del giorno.
- Nessuna migrazione Supabase necessaria.


## v1.3.4
- Modifica i giorni passati da Calendario → Modifica questa giornata (pasti, workout, acqua e mindfulness).
- In Dieta: elenco Extra giornalieri (inserimento/rimozione) e flag No alcohol.
- Extra spezza lo streak verde; giallo se 5 pasti registrati e almeno un extra.
- Streak No alcohol nelle statistiche basato sui flag giornalieri consecutivi.
- Allenamenti Zona 2 e Zona 5.

Eseguire **supabase/migration_v1_3_4.sql** prima del deploy.

Nota: per modificare una giornata passata, la selezione delle opzioni segue il piano attivo nel momento dell'editing. Gli alimenti storicamente salvati restano snapshot.


## v1.3.5 - TypeScript build fix
- Passa `initialTab` e `initialEditDate` dalla Home alla Dashboard.
- Garantisce che `initialEditDate` sia `string | null` (mai `undefined`).
- IMPORTANTE: Il progetto Vercel deve usare la root del repository e non una cartella annidata `Astarte 1.3.3`.
