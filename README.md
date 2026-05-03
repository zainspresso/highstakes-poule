# WK 2026 Poule

Voorspellingspoule voor het WK 2026 met een groep vrienden. Eigen leaderboard, voorspelling per wedstrijd, knock-out doorgaander, en losse bonusvragen (top-3 wereldkampioen, topscorer, goals in finale).

## Stack

- **Next.js 15** (App Router) + React 19 + Tailwind
- **Supabase** Postgres als enige backend store
- **football-data.org** voor schema + uitslagen (gratis tier, competitie `WC`)
- **Vercel** voor hosting + cron

## Eerste keer opzetten

### 1. Supabase project

1. Maak een nieuw project op https://supabase.com (free tier).
2. Open de **SQL Editor** en plak de inhoud van [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). Run.
3. Pak de URL en `service_role` key uit Project Settings → API.

### 2. football-data.org key

Registreer gratis op https://www.football-data.org/client/register en pak je API token.

### 3. Lokaal draaien

```bash
cp .env.example .env.local
# vul SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FOOTBALL_DATA_API_KEY,
# SESSION_SECRET (32+ random chars), CRON_SECRET (random)
npm install
npm run dev
```

Open http://localhost:3000.

### 4. Eerste admin aanmaken

In Supabase SQL Editor:

```sql
insert into users (display_name, is_admin) values ('Zain', true);
```

Ga naar `/`, selecteer je naam, kies een PIN (eerste login = PIN instellen).

### 5. Eerste match-sync

In het admin paneel knop "Nu synchroniseren" — of via curl:

```bash
curl "http://localhost:3000/api/cron/sync-matches?secret=$CRON_SECRET"
```

Daarna staat het hele WK-schema in de DB.

## Deploy naar Vercel

1. Push naar GitHub, koppel repo aan Vercel (Hobby plan).
2. Vul dezelfde env vars in (Project Settings → Environment Variables).
3. Stuur je vrienden de URL — admin maakt hun namen aan in `/admin`.

**Kosten:** €0/maand op de gratis tiers van Vercel + Supabase + football-data.org. Eigen domein optioneel (~€10/jaar).

### Cron via Supabase pg_cron

Vercel Hobby beperkt cron tot 1× per dag — onbruikbaar voor live uitslagen. We gebruiken in plaats daarvan **Supabase pg_cron** (gratis, in de DB zelf). Na de eerste deploy:

1. Open Supabase SQL Editor en run [supabase/migrations/0002_pgcron.sql](supabase/migrations/0002_pgcron.sql).
2. Seed de twee vault-secrets met je eigen waardes:

   ```sql
   select vault.create_secret('https://your-app.vercel.app', 'app_url');
   select vault.create_secret('your-cron-secret-here',       'cron_secret');
   ```

   `cron_secret` moet **exact** matchen met `CRON_SECRET` in je Vercel env vars.

3. Verifieer:

   ```sql
   select * from cron.job;
   select public.trigger_match_sync();              -- handmatig testen
   select * from net._http_response order by created desc limit 5;
   ```

   Het laatste zou een `200` response moeten tonen.

Cron draait daarna elke 10 min en synct match-data + uitslagen.

## Hoe het werkt

### Voorspellingen
- Voor elke wedstrijd: thuis-score, uit-score.
- Knock-out: ook "wie gaat door".
- Lock: bij kickoff van die wedstrijd.
- Knock-out wedstrijden zonder bekende teams (bv. "Winnaar Groep A") tonen een placeholder en zijn niet voorspelbaar tot teams bekend zijn — de sync vult dat automatisch.

### Punten (default, admin-aanpasbaar in `/admin`)
- Exacte score: **5**
- Juist doelsaldo (niet exact): **3**
- Juiste uitkomst (1/X/2): **1**
- Juiste doorgaander (knock-out, los): **+2**
- Bonusvragen tellen los — eigen klassement.

### Bonusvragen
1. **Top-3 wereldkampioen** — sluit bij eerste WK-wedstrijd.
2. **Topscorer toernooi** — sluit bij eerste WK-wedstrijd.
3. **Aantal goals in finale** — sluit bij kickoff finale.

Admin lost ze op via `/admin` (JSON in geven, zie placeholder daar).

## Belangrijke routes

| Route | Doel |
|---|---|
| `/` | Login (naam + PIN) |
| `/predictions` | Alle wedstrijden invullen |
| `/matches/[id]` | Detail + andere voorspellingen (na kickoff) |
| `/leaderboard` | Hoofdklassement + bonusklassement |
| `/bonus` | Bonusvragen invullen |
| `/me` | Eigen overzicht |
| `/admin` | Admin paneel |
| `/api/cron/sync-matches` | Cron endpoint, beschermd met `CRON_SECRET` |

## Beperkingen / bewust niet ingebouwd

- Geen email/wachtwoord auth. PIN-based, prima voor vriendengroep.
- Geen email reminders / push notifications.
- Eén poule, geen sub-groepen.
- Alleen WK 2026 (schema is wel zo opgezet dat je later een ander toernooi kunt toevoegen).
