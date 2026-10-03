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
- Mit Michael nichts mehr offen (Stufen CPU/RAM/Disk akzeptiert, 03.10.)
- Stand 03.10.: Issue #12 `[VM] meine-erste-vm` offen mit `status: erstellt` (Test oder echt? klären)

## Nächste Schritte

### Schritt 5: Anforderungen Mail Michael 02.10. – ✅ umgesetzt (03.10.), Live-Test offen
Umgesetzt (Details `docs/ablauf.adoc`, Simulation mit gemocktem API lokal bestanden):
1. Feld „GitHub-Name der betreuenden Lehrkraft“ (alte Feld-Labels bleiben in der Map); Prüfung: gültiger Username, existiert (API), ≠ Antragsteller*in; Lehrkraft wird erwähnt, bei Wechsel vor Freigabe die neue
2. `/freigeben` (Lehrkraft oder Triage stellvertretend) → `status: betreuer-freigegeben` + @FREIGABE; Peter setzt `status: av-freigegeben` (normal danach, darf aber auch direkt – Vermerk im Kommentar); `/ip` nur bei `av-freigegeben`; Lehrkraft darf auch `/ablehnen`
3. Security-Checkliste wird bei `status: erstellt` an den Issue-Body gehängt (Marker `<!-- vm-antrag:security -->`), Schüler*innen haken selbst ab
4. Ablaufdatum +12 Monate (Marker `<!-- ablauf: JJJJ-MM-TT -->` im letzten Bot-Kommentar); `/verlaengern [1–12]` (Lehrkraft/Triage); `ablauf.yaml` täglich 05:17 UTC: ≤30 Tage → `läuft ab`, Ablauftag → `abgelaufen` + @VM_ERSTELLUNG, keine Auto-Löschung; Anträge ohne Marker (z.B. #12) bekommen beim ersten Lauf heute+12 Monate
5. ✅ DNS-Domain: keine Domain-Einschränkung vorhanden – keine Änderung nötig

Noch zu tun:
- Labels (gh API, nach OK): `status: freigegeben` → `status: av-freigegeben` umbenennen; neu `status: betreuer-freigegeben`, `läuft ab`, `abgelaufen`
- End-to-End-Test live (Variablen auf `htl-leonding` setzen; Lehrkraft-Schritt mit zweitem Account oder `/freigeben` als Triage)
- Peter, Lehrkräfte informieren: neuer Ablauf, Peter setzt jetzt `status: av-freigegeben`

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
- Nicht live getestet: Kommandos von Nicht-Berechtigten werden ignoriert (braucht zweiten Account; in Simulation ok)
- Einladung `ghbugfinder` angenommen? `gh api orgs/htl-leo-infra/invitations`
- Echter Mailverteiler später (Office365 via Graph API, Funktionspostfach, Schul-IT)
- Später: automatische VM-Erstellung (Self-hosted Runner im Schulnetz + Proxmox-API)
