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
  - `status.yaml` – Label `status: freigegeben` → @IP_VERGABE · `status: erstellt` → Nachricht an Antragsteller*in · `abgelehnt` → Ablehnung ohne Begründung (Rückfall)
  - `kommandos.yaml` – nur Triage+: `/ip x.x.x.x` → `status: ip-vergeben` + Zusammenfassung an @VM_ERSTELLUNG · `/ablehnen <Begründung>` → Ablehnung mit Begründung
  - Ablehnung (`reject()` in `antrag.js`): Status-Labels weg, `abgelehnt`, Kommentar, schließen (not planned); bei `ip-vergeben` @IP_VERGABE; bei `erstellt` nur Hinweis, nicht schließen
- Repo-Variablen **gesetzt (29.09.)**: `FREIGABE`=bauepete, `IP_VERGABE`=ghbugfinder (Sysadmin Himmelbauer, ab 30.09.; Einladung am 03.10. noch offen), `VM_ERSTELLUNG`=`Master-Andi MWagnerOE5AOO`
- End-to-End-Test bestanden (Issues #1, #2, geschlossen „not planned“); Test-Variablen gelöscht
- Workflows zusammengelegt (freigabe/erstellt/ip-eintragen → status + kommandos), `/ablehnen` ergänzt – end-to-end getestet (#3–#5); nur „Ablehnen bei erstellt“ lediglich lokal getestet
- DNS Name muss unter offenen Anträgen mit Internet „Yes“ eindeutig sein
- Actions: `checkout@v7`, `github-script@v9`
- Team `vm-admins` (Triage auf vm-antraege), Stand 01.10.: aktiv `htl-leonding` (Maintainer), `MWagnerOE5AOO` (hat getestet: #8, #9), `bauepete`, `Master-Andi`; **`ghbugfinder` (Sysadmin Himmelbauer) eingeladen 30.09., noch nicht angenommen** – bis dahin wird sein `/ip` ignoriert, Michael kann einspringen
- Leitfäden DE/EN: eigener Abschnitt `[[security]]` „Security“ aus Michaels Kurzanleitung (Lynis, ClamAV, Fail2Ban, WAF Apache/Nginx, SSH-Härtung, Ablaufempfehlung); „Backup-Prozess“ umformuliert zu „beim Anlegen des Containers mitinstalliert“ (30.09.)
- Mail Michael 29.09. umgesetzt: Leitfaden-Abschnitt „Absicherung und Überwachung“ (DE/EN); Teammitglieder = Schul-Benutzernamen (`^(ad|kd|if|it|el|bg)\d{6}$`) mit Validierung; Hinweis an Admins bei Änderung nach Freigabe (Diff-Tabelle); `/ip` mit Präfix + optional `public <ip>`; `status: erstellt` entfernt alle vorherigen Status-Labels
- Mail Michael 02.10. (nach Vorstellung) in `docs/anforderungen.md` dokumentiert (Originaltext + Umsetzungspunkte); Entscheidungen 03.10.: Lehrkraft-Freigabe per Kommando `/freigeben`, Feld „Nutzungsdauer“ bleibt vorläufig (nur Info); Ablauf/Verlängerung festgelegt (30 Tage Vorwarnung, ohne Abstimmung mit Michael); Labels `status: betreuer-freigegeben`, `status: av-freigegeben`
- Stand 03.10.: Issue #12 `[VM] meine-erste-vm` offen mit `status: erstellt` (Test oder echt? klären)

## Nächste Schritte

### Schritt 5: Anforderungen Mail Michael 02.10. umsetzen (siehe `docs/anforderungen.md`)
Jede Feldänderung in beiden Formularen + Leitfäden DE/EN + Label-Map in `antrag.js`.
1. Feld „Betreuende Lehrkraft“ → GitHub-Username (Prüfung, ob Account existiert); Lehrkraft per @-Mention benachrichtigen
2. Zweistufige Freigabe: `/freigeben` (nur eingetragene Lehrkraft) → Label `status: betreuer-freigegeben`, danach Peter → Label `status: av-freigegeben` (ersetzt `status: freigegeben`); erst dann IP-Vergabe
3. Security-Checkliste (Lynis, Fail2Ban, ClamAV, WAF, SSH-Härtung) als Kommentar bei `status: erstellt`
4. Nutzungsdauer Standard 1 Jahr, `/verlaengern [Monate]` + täglicher Workflow `ablauf.yaml` (Labels `läuft ab`, `abgelaufen`) – festgelegt, siehe `docs/anforderungen.md`
5. ✅ DNS-Domain: keine Domain-Einschränkung vorhanden (nur Hostname-Format + Eindeutigkeit) – keine Änderung nötig

### Schritt 4: Team `vm-admins` – ✅ weitgehend erledigt (Befehle zur Referenz)
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
- Optional d): `members_can_create_repositories=false`
- Nicht getestet: `/ip`/`/ablehnen` von Nicht-Admin wird ignoriert (braucht zweiten Account)
- Einladung `ghbugfinder` angenommen? `gh api orgs/htl-leo-infra/invitations`
- Stufen CPU/RAM/Disk mit Michael Wagner abstimmen
- Leitfaden „Löschen nach Nutzungsdauer“ bei Umsetzung von Schritt 5.4 anpassen
- Echter Mailverteiler später (Office365 via Graph API, Funktionspostfach, Schul-IT)
- Später: automatische VM-Erstellung (Self-hosted Runner im Schulnetz + Proxmox-API)
