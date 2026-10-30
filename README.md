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
