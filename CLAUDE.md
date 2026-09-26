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

- Issue-Form-Feld-IDs sind Schnittstelle zu den Workflows — nicht umbenennen ohne Workflows anzupassen.
- Feld-Labels exakt nach Michael Wagners Vorgabe (siehe `docs/anforderungen.md`).
- Workflows: minimale `permissions`, Parsing mit `actions/github-script`, keine Fremd-Actions ohne Grund.
- Repo ist öffentlich: keine Secrets/Zugangsdaten in Issues oder Code. IP-Adressen (privat) im Issue sind ok.
