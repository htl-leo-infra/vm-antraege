# vm-antraege

Antragsverfahren für VMs/LXC-Container in der Proxmox-Umgebung der HTL Leonding über GitHub Issues.
Repo: `htl-leo-infra/vm-antraege` (public). Anforderungen: `docs/anforderungen.md`. Workflow-Ablauf im Detail: `docs/ablauf.adoc`.

## Arbeitsweise

- **Vor jeder ändernden Aktion bestätigen lassen** (Dateien, git commit/push, gh-API-Änderungen, Labels, Teams). Nur lesende Abfragen ohne Rückfrage.
- Doku in AsciiDoc (`.adoc`), Anforderungen in Markdown.
- Sprache: Deutsch, gendern mit `*` (Schüler*innen).

## Personen

| Rolle | Person | GitHub |
|---|---|---|
| Auftraggeber, VM anlegen | Michael Wagner | `MWagnerOE5AOO` |
| Freigabe | Peter Bauer | `bauepete` |
| IP-Vergabe (Sysadmin) | Thomas Himmelbauer | `ghbugfinder` |
| VM anlegen | Andreas Brückner | `Master-Andi` |
| Repo-Betreuung | Thomas Stütz | `htl-leonding` |

Team `vm-admins` (Rolle Triage): alle obigen. Schüler*innen bearbeiten nur eigene Issues.

## Ablauf

1. Issue über Formular `.github/ISSUE_TEMPLATE/vm-antrag.yaml` → Label `vm-antrag`
2. Workflow prüft Formular (Projektname `^[a-z][a-z0-9-]{2,29}$`, Lehrkraft = existierender GitHub-User ≠ Antragsteller*in, …) → `status: neu` + @Lehrkraft, sonst `ungültig`
3. Lehrkraft kommentiert `/freigeben` → `status: betreuer-freigegeben` + @bauepete
4. Peter setzt `status: av-freigegeben` (normal nach Lehrkraft, darf auch direkt) → Workflow erwähnt Himmelbauer
5. Himmelbauer kommentiert `/ip <intern>[/prefix] [public <öffentlich>[/prefix]]` → `status: ip-vergeben` + @MWagnerOE5AOO @Master-Andi
6. VM angelegt → Label `status: erstellt` → Security-Checkliste an Issue-Body, Ablaufdatum +12 Monate (Marker `<!-- ablauf: … -->` im Bot-Kommentar), Antragsteller*in informiert
7. Täglich: 30 Tage vor Ablauf `läuft ab`, am Ablauftag `abgelaufen` (keine Auto-Löschung); Lehrkraft verlängert mit `/verlaengern [Monate]` (1–12)
8. Jederzeit vor „erstellt“: `/ablehnen <Begründung>` (oder nur Label `abgelehnt` als Rückfall) → Status-Labels weg, `abgelehnt`, Kommentar, Issue geschlossen

Kommandos `/freigeben`, `/ablehnen`, `/verlaengern`: eingetragene Lehrkraft oder Triage; `/ip`: nur Triage. Lehrkräfte brauchen keine Repo-Rechte.

Workflows: `antrag-pruefen.yaml` (opened/edited), `status.yaml` (labeled), `kommandos.yaml` (`/freigeben`, `/ip`, `/ablehnen`, `/verlaengern`), `ablauf.yaml` (täglich).

Benachrichtigung ausschließlich per @-Mention (GitHub-Mail), einzelne Personen, kein Team-Mention. SMTP/Graph-API evtl. später.

## Konventionen

- Zwei Formulare: `vm-antrag.yaml` (DE) und `vm-request.yaml` (EN, zusätzliches Label `english`). Gleiche Feld-IDs, gleiche Reihenfolge. **Jede Feldänderung in beiden Formularen + Leitfäden (`schueler-leitfaden.adoc`, `schueler-guide.adoc`) + Label-Map im Workflow.**
- Workflows parsen den Issue-Body über die Feld-Labels (`### Projektname` / `### Project name`) → Map DE/EN-Label → Feld-ID. Bot-Kommentare auf Englisch, wenn Label `english`.
- Admin-Seite (Status-Labels, `/ip`, Kommentare an Admins) bleibt deutsch.
- Teammitglieder = Schul-Benutzernamen (`^(ad|kd|if|it|el|bg)\d{6}$`) → Proxmox-Zugriff. Änderungen nach Freigabe werden an Admins gemeldet.
- Feld-Labels exakt nach Michael Wagners Vorgabe (siehe `docs/anforderungen.md`).
- YAML-Dateien mit Endung `.yaml` – Ausnahme `.github/ISSUE_TEMPLATE/config.yml` (GitHub erkennt nur `.yml`).
- Gemeinsame Workflow-Logik in `.github/scripts/antrag.js` (Parser, Validierung, Label-Konstanten, Kommentar-Helfer).
- Zuständige Personen über Repo-Variablen `FREIGABE`, `IP_VERGABE`, `VM_ERSTELLUNG` (Usernamen, leerzeichengetrennt), Defaults im Workflow.
- Workflows: minimale `permissions`, Parsing mit `actions/github-script`, keine Fremd-Actions ohne Grund.
- Repo ist öffentlich: keine Secrets/Zugangsdaten in Issues oder Code. IP-Adressen (privat) im Issue sind ok.
