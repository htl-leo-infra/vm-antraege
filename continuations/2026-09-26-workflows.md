# Continuation: VM-Anträge – Team & Workflows

Wir arbeiten weiter am Antragsverfahren für VMs/LXC-Container (Proxmox, HTL Leonding) über GitHub Issues im Repo `htl-leo-infra/vm-antraege` (lokal: `~/work/vm-antraege`).

Lies zuerst `CLAUDE.md` und `docs/anforderungen.md`.

## Arbeitsweise (wichtig)

- **Vor jeder ändernden Aktion** (Dateien, commit, push, gh-API-Änderungen) konkret vorschlagen und auf mein OK warten. Lesende Abfragen ohne Rückfrage.
- Vor einem Push anhalten, wenn ich das verlange.
- YAML-Dateien `.yaml`, Ausnahme `.github/ISSUE_TEMPLATE/config.yml`.

## Erledigt (26.09.2026)

- Org `htl-leonding-infrastructure` → `htl-leo-infra` umbenannt, Basisrecht `none`
- Lokale Remotes `~/work/htl-pv-solax`, `~/work/leoenergy` auf neuen Org-Namen umgestellt
- Repo `htl-leonding/vm-antraege` → `htl-leo-infra/vm-antraege` transferiert (public)
- Gepusht: Issue-Form `vm-antrag.yaml`, `config.yml`, `README.adoc`, `schueler-leitfaden.adoc`, `CLAUDE.md`, `docs/anforderungen.md` – Formular im Web geprüft, funktioniert
- Labels: `vm-antrag`, `status: neu`, `status: freigegeben`, `status: ip-vergeben`, `status: erstellt`, `abgelehnt`, `ungültig` (Standardlabels gelöscht)

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
- Himmelbauer einladen, sobald Username bekannt
- Stand 26.09.: nur `htl-leonding` Mitglied, keine Teams, keine Einladungen
- Workflows (Schritt 5) funktionieren auch ohne Team: @-Mentions erreichen auch Nicht-Mitglieder, die `/ip`-Berechtigungsprüfung braucht aber Triage → Test vorerst mit `htl-leonding`

### Schritt 5: Workflows `.github/workflows/*.yaml`
| Datei | Trigger | Aktion |
|---|---|---|
| `antrag-pruefen.yaml` | `issues: opened, edited` (Label `vm-antrag`) | Projektname `^[a-z][a-z0-9-]{2,29}$` + eindeutig; bei Internet „Yes“ Ports + DNS Pflicht → ok: `status: neu` + Kommentar @bauepete · Fehler: `ungültig` + Hinweis (bei Korrektur Label wieder entfernen) |
| `freigabe.yaml` | `issues: labeled` = `status: freigegeben` | `status: neu` entfernen, Kommentar @Himmelbauer „IP mit `/ip <adresse>` eintragen“ |
| `ip-eintragen.yaml` | `issue_comment: created`, beginnt mit `/ip` | Berechtigung (`collaborators/{user}/permission` ≥ triage) + IPv4 prüfen → `status: freigegeben` → `status: ip-vergeben`, Kommentar mit Zusammenfassung aller Felder + IP und @MWagnerOE5AOO @Master-Andi. Nicht-Admins ignorieren |
| `erstellt.yaml` | `issues: labeled` = `status: erstellt` | `status: ip-vergeben` entfernen, Kommentar an Antragsteller*in „VM ist bereit“ |

- **Zweisprachig:** Formulare `vm-antrag.yaml` (DE) + `vm-request.yaml` (EN, Label `english`). Parser braucht Label-Map DE+EN → Feld-ID (inkl. Dropdown-Werte „No – school network only“ usw.). Bot-Kommentare an Schüler*innen englisch bei Label `english`, an Admins immer deutsch.
- `antrag-pruefen.yaml` setzt Titel automatisch auf `[VM] <projektname>` (Wert aus Feld Projektname)
- `actions/github-script` zum Parsen des Issue-Form-Bodys (`### <Label>\n\n<Wert>`), Feld-Labels siehe `vm-antrag.yaml`
- Minimale `permissions` (`issues: write`, `contents: read`)
- Danach End-to-End-Test mit Test-Issues (ungültiger Name, gültiger Antrag, Freigabe, `/ip` von Admin und Nicht-Admin), Test-Issues schließen

## Offen

- GitHub-Username Thomas Himmelbauer (bis dahin Platzhalter im Workflow)
- Stufen CPU/RAM/Disk mit Michael Wagner abstimmen
- Leitfaden verspricht „Zugangsinfos per Kommentar“ und „Löschen nach Nutzungsdauer“ – mit Michael abstimmen
- Echter Mailverteiler später (Office365 via Graph API, Funktionspostfach, Schul-IT)
- Später: automatische VM-Erstellung (Self-hosted Runner im Schulnetz + Proxmox-API)
