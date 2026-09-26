# vm-antraege

Antragsverfahren für VMs/LXC-Container in der Proxmox-Umgebung der HTL Leonding über GitHub Issues.
Repo: `htl-leo-infra/vm-antraege` (public). Anforderungen: `docs/anforderungen.md`.

## Arbeitsweise

- **Vor jeder ändernden Aktion bestätigen lassen** (Dateien, git commit/push, gh-API-Änderungen, Labels, Teams). Nur lesende Abfragen ohne Rückfrage.
- Doku in AsciiDoc (`.adoc`), Anforderungen in Markdown.
- Sprache: Deutsch, gendern mit `*` (Schüler*innen).

## Personen

| Rolle | Person | GitHub |
|---|---|---|
| Auftraggeber, VM anlegen | Michael Wagner | `MWagnerOE5AOO` |
| Freigabe | Peter Bauer | `bauepete` |
| IP-Vergabe | Thomas Himmelbauer | _offen_ |
| VM anlegen | Andreas Brückner | `Master-Andi` |
| Repo-Betreuung | Thomas Stütz | `htl-leonding` |

Team `vm-admins` (Rolle Triage): alle obigen. Schüler*innen bearbeiten nur eigene Issues.

## Ablauf

1. Issue über Formular `.github/ISSUE_TEMPLATE/vm-antrag.yaml` → Label `vm-antrag`
2. Workflow prüft Projektname (`^[a-z][a-z0-9-]{2,29}$`) → `status: neu` + @bauepete, sonst `ungültig`
3. Peter setzt `status: freigegeben` → Workflow erwähnt Himmelbauer
4. Himmelbauer kommentiert `/ip <adresse>` → `status: ip-vergeben` + @MWagnerOE5AOO @Master-Andi
5. VM angelegt → Label `status: erstellt` → Workflow informiert Antragsteller*in

Benachrichtigung ausschließlich per @-Mention (GitHub-Mail), einzelne Personen, kein Team-Mention. SMTP/Graph-API evtl. später.

## Konventionen

- Zwei Formulare: `vm-antrag.yaml` (DE) und `vm-request.yaml` (EN, zusätzliches Label `english`). Gleiche Feld-IDs, gleiche Reihenfolge. **Jede Feldänderung in beiden Formularen + Leitfäden (`schueler-leitfaden.adoc`, `schueler-guide.adoc`) + Label-Map im Workflow.**
- Workflows parsen den Issue-Body über die Feld-Labels (`### Projektname` / `### Project name`) → Map DE/EN-Label → Feld-ID. Bot-Kommentare auf Englisch, wenn Label `english`.
- Admin-Seite (Status-Labels, `/ip`, Kommentare an Admins) bleibt deutsch.
- Feld-Labels exakt nach Michael Wagners Vorgabe (siehe `docs/anforderungen.md`).
- YAML-Dateien mit Endung `.yaml` – Ausnahme `.github/ISSUE_TEMPLATE/config.yml` (GitHub erkennt nur `.yml`).
- Gemeinsame Workflow-Logik in `.github/scripts/antrag.js` (Parser, Validierung, Label-Konstanten, Kommentar-Helfer).
- Zuständige Personen über Repo-Variablen `FREIGABE`, `IP_VERGABE`, `VM_ERSTELLUNG` (Usernamen, leerzeichengetrennt), Defaults im Workflow.
- Workflows: minimale `permissions`, Parsing mit `actions/github-script`, keine Fremd-Actions ohne Grund.
- Repo ist öffentlich: keine Secrets/Zugangsdaten in Issues oder Code. IP-Adressen (privat) im Issue sind ok.
