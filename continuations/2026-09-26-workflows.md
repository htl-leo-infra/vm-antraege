# Continuation: VM-Anträge – Stand nach Workflows

Wir arbeiten weiter am Antragsverfahren für VMs/LXC-Container (Proxmox, HTL Leonding) über GitHub Issues im Repo `htl-leo-infra/vm-antraege` (lokal: `~/work/vm-antraege`).

Lies zuerst `CLAUDE.md` und `docs/anforderungen.md`.

## Arbeitsweise (wichtig)

- **Vor jeder ändernden Aktion** (Dateien, commit, push, gh-API-Änderungen) konkret vorschlagen und auf mein OK warten. Lesende Abfragen ohne Rückfrage.
- Vor einem Push anhalten, wenn ich das verlange.
- YAML-Dateien `.yaml`, Ausnahme `.github/ISSUE_TEMPLATE/config.yml` (GitHub erkennt nur `.yml`).
- Tests nie mit echten Personen: vorher Repo-Variablen `FREIGABE`/`VM_ERSTELLUNG` auf `htl-leonding` setzen, danach löschen.

## Erledigt (26.09.2026)

- Org `htl-leonding-infrastructure` → `htl-leo-infra` umbenannt, Basisrecht `none`
- Lokale Remotes `~/work/htl-pv-solax`, `~/work/leoenergy` umgestellt
- Repo `htl-leo-infra/vm-antraege` (public), transferiert von `htl-leonding`
- Formulare: `vm-antrag.yaml` (DE) + `vm-request.yaml` (EN, Label `english`), Titel `[VM] <projektname>`
- Doku: `README.adoc`, `schueler-leitfaden.adoc` (DE), `schueler-guide.adoc` (EN), inkl. Verweis auf `htl-leonding-college/keycloak-antraege`
- Labels: `vm-antrag`, `english`, `status: neu|freigegeben|ip-vergeben|erstellt`, `abgelehnt`, `ungültig`
- Workflows (`.github/workflows/`), Logik in `.github/scripts/antrag.js`:
  - `antrag-pruefen.yaml` – Titel setzen, validieren (Name, Eindeutigkeit, Ports/DNS bei Internet „Yes“), `ungültig` bzw. `status: neu` + @FREIGABE
  - `freigabe.yaml` – bei `status: freigegeben` → @IP_VERGABE
  - `ip-eintragen.yaml` – `/ip x.x.x.x` (nur Triage+) → `status: ip-vergeben` + Zusammenfassung an @VM_ERSTELLUNG
  - `erstellt.yaml` – bei `status: erstellt` → Nachricht an Antragsteller*in
- Repo-Variablen (optional, Defaults im Workflow): `FREIGABE`=bauepete, `IP_VERGABE`=htl-leonding (Platzhalter), `VM_ERSTELLUNG`=`MWagnerOE5AOO Master-Andi`
- End-to-End-Test bestanden (Issues #1, #2, geschlossen „not planned“); Test-Variablen gelöscht
- Actions: `checkout@v7`, `github-script@v9`

## Nächste Schritte

### Schritt 4: Team `vm-admins` – ⏸ ZURÜCKGESTELLT (auf mein Signal warten)
Befehle vorbereitet, **noch nicht ausführen**:
```bash
# a) Team anlegen
gh api -X POST orgs/htl-leo-infra/teams -f name=vm-admins -f privacy=closed -f description="Bearbeitung der VM-Anträge"
# b) Rolle Triage auf vm-antraege
gh api -X PUT orgs/htl-leo-infra/teams/vm-admins/repos/htl-leo-infra/vm-antraege -f permission=triage
# c) Mitglieder einladen (verschickt Einladungs-Mails!)
gh api -X PUT orgs/htl-leo-infra/teams/vm-admins/memberships/bauepete -f role=member
gh api -X PUT orgs/htl-leo-infra/teams/vm-admins/memberships/MWagnerOE5AOO -f role=member
gh api -X PUT orgs/htl-leo-infra/teams/vm-admins/memberships/Master-Andi -f role=member
# d) optional: Mitglieder dürfen keine Repos in der Org anlegen – noch nicht entschieden
gh api -X PATCH orgs/htl-leo-infra -F members_can_create_repositories=false
```
- Ohne Team können Peter & Co. keine Labels setzen und kein `/ip` ausführen.

### Weitere offene Punkte
- GitHub-Username Thomas Himmelbauer → einladen + `gh variable set IP_VERGABE -R htl-leo-infra/vm-antraege --body <user>`
- Workflow für Label `abgelehnt` (Kommentar + Issue schließen)
- Hinweis an Admins, wenn Antrag nach Freigabe (Status ≥ `freigegeben`) bearbeitet wird – in `antrag-pruefen.yaml`
- Optional: übersprungene Label-Workflow-Läufe reduzieren (Freigabe/Erstellt in einen Workflow `status.yaml` zusammenlegen)
- Nicht getestet: `/ip` von Nicht-Admin wird ignoriert (braucht zweiten Account)
- Stufen CPU/RAM/Disk mit Michael Wagner abstimmen
- „Löschen nach Nutzungsdauer“ (Leitfaden) mit Michael abstimmen
- Echter Mailverteiler später (Office365 via Graph API, Funktionspostfach, Schul-IT)
- Später: automatische VM-Erstellung (Self-hosted Runner im Schulnetz + Proxmox-API)
