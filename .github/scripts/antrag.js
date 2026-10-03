// Gemeinsame Logik für die VM-Antrags-Workflows.
// Wird aus actions/github-script per require() geladen.

// Feld-Labels beider Formulare (vm-antrag.yaml / vm-request.yaml) → Feld-ID.
// Bei jeder Feldänderung hier nachziehen!
const FIELD_LABELS = {
  'Projektname': 'projektname', 'Project name': 'projektname',
  'Projektbeschreibung': 'projektbeschreibung', 'Project description': 'projektbeschreibung',
  'GitHub-Name der betreuenden Lehrkraft': 'lehrkraft', "Supervising teacher's GitHub username": 'lehrkraft',
  'Betreuende Lehrkraft': 'lehrkraft', 'Supervising teacher': 'lehrkraft', // alte Formulare (bis 10/2026)
  'Teammitglieder': 'team', 'Team members': 'team',
  'Nutzungsdauer': 'nutzungsdauer', 'Usage period': 'nutzungsdauer',
  'Typ': 'typ', 'Type': 'typ',
  'CPU-Kerne': 'cpu', 'CPU cores': 'cpu',
  'RAM (GB)': 'ram',
  'Disk (GB)': 'disk',
  'Internet': 'internet',
  'Public Ports': 'ports', 'Public ports': 'ports',
  'DNS Name': 'dns', 'DNS name': 'dns',
  'Spezielle Anforderungen': 'spezielles', 'Special requirements': 'spezielles',
  'Bestätigung': 'bestaetigung', 'Confirmation': 'bestaetigung',
};

const LABEL = {
  antrag: 'vm-antrag',
  english: 'english',
  neu: 'status: neu',
  betreuerFreigegeben: 'status: betreuer-freigegeben',
  avFreigegeben: 'status: av-freigegeben',
  ipVergeben: 'status: ip-vergeben',
  erstellt: 'status: erstellt',
  abgelehnt: 'abgelehnt',
  ungueltig: 'ungültig',
  laeuftAb: 'läuft ab',
  abgelaufen: 'abgelaufen',
};
// Status-Labels vor „erstellt“ (werden bei erstellt/abgelehnt entfernt).
const OPEN_STATUS_LABELS = [LABEL.neu, LABEL.betreuerFreigegeben, LABEL.avFreigegeben, LABEL.ipVergeben];
const STATUS_LABELS = [...OPEN_STATUS_LABELS, LABEL.erstellt, LABEL.abgelehnt];
// Ab diesem Status ist der Antrag freigegeben – Änderungen müssen die Admins sehen.
const APPROVED_LABELS = [LABEL.betreuerFreigegeben, LABEL.avFreigegeben, LABEL.ipVergeben, LABEL.erstellt];
// Nutzungsdauer: Standard ab Erstellung, Verlängerung pro Kommando, Vorwarnung vor Ablauf.
const EXPIRY_MONTHS = 12;
const EXTEND_MAX_MONTHS = 12;
const EXPIRY_WARN_DAYS = 30;

// Deutsche Feldnamen für Admin-Kommentare.
const FIELD_NAMES = {
  projektname: 'Projektname', projektbeschreibung: 'Projektbeschreibung', lehrkraft: 'Betreuende Lehrkraft (GitHub)',
  team: 'Teammitglieder', nutzungsdauer: 'Nutzungsdauer', typ: 'Typ', cpu: 'CPU-Kerne', ram: 'RAM (GB)',
  disk: 'Disk (GB)', internet: 'Internet', ports: 'Public Ports', dns: 'DNS Name', spezielles: 'Spezielle Anforderungen',
};

const NAME_RE = /^[a-z][a-z0-9-]{2,29}$/;
const HOST_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const IPV4_RE = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const RISKY_PORTS = [22, 3306, 5432, 6379, 27017];
// Schul-Benutzernamen: ad=Abendschule, kd=Kolleg, if=Informatik, it=Medientechnik, el=Elektronik, bg=Biomedizin
const USERNAME_RE = /^(ad|kd|if|it|el|bg)\d{6}$/;
const GITHUB_USER_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
const EXPIRY_RE = /<!-- ablauf: (\d{4}-\d{2}-\d{2}) -->/;
const SECURITY_MARKER = '<!-- vm-antrag:security -->';

// Issue-Form-Body ("### Label\n\nWert") → { feldId: wert }
function parseBody(body) {
  const fields = {};
  const parts = (body || '').replace(/\r\n/g, '\n').split(/^### /m).slice(1);
  for (const part of parts) {
    const nl = part.indexOf('\n');
    const label = (nl < 0 ? part : part.slice(0, nl)).trim();
    const id = FIELD_LABELS[label];
    if (!id) continue;
    let value = nl < 0 ? '' : part.slice(nl + 1).trim();
    if (value === '_No response_' || value === 'None') value = '';
    fields[id] = value;
  }
  return fields;
}

const labelNames = (issue) => issue.labels.map((l) => (typeof l === 'string' ? l : l.name));
const isEnglish = (issue) => labelNames(issue).includes(LABEL.english);
const wantsInternet = (f) => /^yes/i.test(f.internet || '');
const splitPorts = (s) => (s || '').split(/[\s,;]+/).filter(Boolean);
const mention = (users) => (users || '').split(/[\s,]+/).filter(Boolean).map((u) => `@${u.replace(/^@/, '')}`).join(' ');
const isIPv4 = (s) => IPV4_RE.test(s);
const splitUsers = (s) => (s || '').split(/[\s,;]+/).filter(Boolean);

// GitHub-Name der Lehrkraft aus dem Formular (ohne @), oder '' wenn kein gültiger Username.
function teacherLogin(f) {
  const login = (f.lehrkraft || '').trim().replace(/^@/, '');
  return GITHUB_USER_RE.test(login) ? login : '';
}
// Eingetragene Lehrkraft (nie die Antragsteller*in selbst).
const isTeacher = (issue, login) => {
  const teacher = teacherLogin(parseBody(issue.body)).toLowerCase();
  return !!teacher && teacher === login.toLowerCase() && login.toLowerCase() !== issue.user.login.toLowerCase();
};

async function userExists(github, login) {
  try {
    const { data } = await github.rest.users.getByUsername({ username: login });
    return data.type === 'User';
  } catch (e) {
    if (e.status === 404) return false;
    throw e;
  }
}

// Datum als ISO-String (JJJJ-MM-TT, UTC).
const today = () => new Date().toISOString().slice(0, 10);
function addMonths(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate(); // letzter Tag des Zielmonats
  return new Date(Date.UTC(y, m - 1 + n, Math.min(d, last))).toISOString().slice(0, 10);
}
const daysUntil = (iso) => Math.round((Date.parse(iso) - Date.parse(today())) / 86400000);
const formatDate = (iso, en) => {
  const [y, m, d] = iso.split('-').map(Number);
  return en ? iso : `${d}.${m}.${y}`;
};
const expiryMarker = (iso) => `<!-- ablauf: ${iso} -->`;

// Aktuelles Ablaufdatum = Marker im letzten Bot-Kommentar, oder null.
async function findExpiry(github, context, number) {
  const comments = await github.paginate(github.rest.issues.listComments, { ...context.repo, issue_number: number, per_page: 100 });
  const found = comments.filter((c) => c.user.type === 'Bot').map((c) => c.body.match(EXPIRY_RE)?.[1]).filter(Boolean);
  return found.length ? found[found.length - 1] : null;
}

// Security-Checkliste, wird bei „erstellt“ an den Issue-Body angehängt (Antragsteller*in kann abhaken).
function securityChecklist(en) {
  const link = `https://github.com/htl-leo-infra/vm-antraege/blob/main/${en ? 'schueler-guide' : 'schueler-leitfaden'}.adoc#security`;
  return `${SECURITY_MARKER}\n` + (en
    ? `### Security checklist\n\nTick off what is done (click the box or edit the issue). Details: [guide, section Security](${link}).\n\n` +
      '- [ ] Lynis audit run, recommendations worked through\n' +
      '- [ ] Fail2Ban active (`fail2ban-client status`)\n' +
      '- [ ] ClamAV signatures up to date, regular scan scheduled\n' +
      '- [ ] WAF (ModSecurity + OWASP CRS) set up – web server reachable from the internet only\n' +
      '- [ ] SSH hardened (weak ciphers and outdated algorithms disabled)'
    : `### Security-Checkliste\n\nHakt ab, was erledigt ist (Kästchen anklicken oder Issue bearbeiten). Details: [Leitfaden, Abschnitt Security](${link}).\n\n` +
      '- [ ] Lynis-Audit ausgeführt, Empfehlungen abgearbeitet\n' +
      '- [ ] Fail2Ban aktiv (`fail2ban-client status`)\n' +
      '- [ ] ClamAV-Signaturen aktuell, regelmäßiger Scan eingeplant\n' +
      '- [ ] WAF (ModSecurity + OWASP CRS) eingerichtet – nur bei Webserver mit Internet „Yes“\n' +
      '- [ ] SSH gehärtet (schwache Cipher-Suiten und veraltete Algorithmen deaktiviert)');
}

// IPv4 mit optionalem Präfix, z.B. 10.9.32.1 oder 10.9.32.1/24
function isIPv4Cidr(s) {
  const [ip, prefix, ...rest] = (s || '').split('/');
  if (rest.length || !isIPv4(ip)) return false;
  return prefix === undefined || (/^\d{1,2}$/.test(prefix) && +prefix <= 32);
}

// "/ip <intern>[/prefix] [/public|public <öffentlich>[/prefix]]" → { intern, public } oder null
function parseIpCommand(line) {
  const m = (line || '').trim().match(/^\/ip\s+(\S+)(?:\s+\/?public\s+(\S+))?\s*$/i);
  if (!m || !isIPv4Cidr(m[1]) || (m[2] && !isIPv4Cidr(m[2]))) return null;
  return { intern: m[1], public: m[2] || '' };
}

// Geänderte Felder zwischen zwei Formularständen (ohne Bestätigung).
function diffFields(oldF, newF) {
  return Object.keys(FIELD_NAMES)
    .filter((id) => (oldF[id] || '') !== (newF[id] || ''))
    .map((id) => ({ id, name: FIELD_NAMES[id], old: oldF[id] || '', new: newF[id] || '' }));
}

// Prüft die Formularwerte. others: Felder (parseBody) anderer offener Anträge.
// author: GitHub-Login der Antragsteller*in (darf nicht selbst Lehrkraft sein).
function validate(f, others, en, author) {
  const t = (de, e) => (en ? e : de);
  const errors = [];
  const warnings = [];
  const name = f.projektname || '';

  if (!NAME_RE.test(name)) {
    errors.push(t(
      `Projektname \`${name}\` ist ungültig: nur a–z, 0–9 und \`-\`, beginnt mit einem Buchstaben, 3–30 Zeichen.`,
      `Project name \`${name}\` is invalid: only a–z, 0–9 and \`-\`, must start with a letter, 3–30 characters.`));
  } else if (others.some((o) => o.projektname === name)) {
    errors.push(t(
      `Projektname \`${name}\` ist bereits von einem anderen offenen Antrag belegt. Bitte einen anderen Namen wählen.`,
      `Project name \`${name}\` is already used by another open request. Please choose a different name.`));
  }

  const teacher = teacherLogin(f);
  if (!teacher) {
    errors.push(t(
      `Betreuende Lehrkraft: \`${f.lehrkraft || ''}\` ist kein GitHub-Benutzername. Bitte den GitHub-Namen eintragen, nicht den echten Namen.`,
      `Supervising teacher: \`${f.lehrkraft || ''}\` is not a GitHub username. Please enter the GitHub username, not the real name.`));
  } else if (author && teacher.toLowerCase() === author.toLowerCase()) {
    errors.push(t(
      'Betreuende Lehrkraft: ihr könnt euch nicht selbst eintragen.',
      'Supervising teacher: you cannot enter yourself.'));
  }

  const users = splitUsers(f.team);
  const badUsers = users.filter((u) => !USERNAME_RE.test(u));
  if (!users.length) {
    errors.push(t('Teammitglieder: bitte die Schul-Benutzernamen angeben.', 'Team members: please enter the school usernames.'));
  } else if (badUsers.length) {
    errors.push(t(
      `Teammitglieder: \`${badUsers.join(', ')}\` ist kein gültiger Schul-Benutzername. Erwartet z.B. \`if123456\` (Kürzel ad/kd/if/it/el/bg + 6 Ziffern, klein geschrieben), einer pro Zeile.`,
      `Team members: \`${badUsers.join(', ')}\` is not a valid school username. Expected e.g. \`if123456\` (prefix ad/kd/if/it/el/bg + 6 digits, lowercase), one per line.`));
  }

  if (wantsInternet(f)) {
    if (!f.ports) errors.push(t('Internet „Yes“: bitte **Public Ports** angeben.', 'Internet "Yes": please specify **Public ports**.'));
    if (!f.dns) errors.push(t('Internet „Yes“: bitte **DNS Name** angeben.', 'Internet "Yes": please specify **DNS name**.'));
  } else if (f.ports || f.dns) {
    warnings.push(t(
      'Internet „No“: Public Ports und DNS Name werden ignoriert.',
      'Internet "No": Public ports and DNS name will be ignored.'));
  }

  if (f.ports) {
    const ports = splitPorts(f.ports);
    const bad = ports.filter((p) => !/^\d+$/.test(p) || +p < 1 || +p > 65535);
    if (bad.length) {
      errors.push(t(
        `Ungültige Ports: \`${bad.join(', ')}\`. Bitte nur Portnummern (1–65535), getrennt durch Beistrich.`,
        `Invalid ports: \`${bad.join(', ')}\`. Please use port numbers only (1–65535), separated by commas.`));
    }
    const risky = ports.filter((p) => RISKY_PORTS.includes(+p));
    if (risky.length && wantsInternet(f)) {
      warnings.push(t(
        `Port \`${risky.join(', ')}\` (SSH/Datenbank) öffentlich freizugeben ist riskant – wird bei der Freigabe genau geprüft.`,
        `Exposing port \`${risky.join(', ')}\` (SSH/database) publicly is risky – it will be reviewed carefully.`));
    }
  }

  if (f.dns && !HOST_RE.test(f.dns)) {
    errors.push(t(`DNS Name \`${f.dns}\` ist ungültig.`, `DNS name \`${f.dns}\` is invalid.`));
  } else if (f.dns && wantsInternet(f) && others.some((o) => wantsInternet(o) && (o.dns || '').toLowerCase() === f.dns.toLowerCase())) {
    errors.push(t(
      `DNS Name \`${f.dns}\` ist bereits von einem anderen offenen Antrag belegt.`,
      `DNS name \`${f.dns}\` is already used by another open request.`));
  }

  return { errors, warnings };
}

// Zusammenfassung für die Admins (immer deutsch).
function summary(f, ip, publicIp) {
  const rows = [
    ['Projektname', f.projektname],
    ['IP-Adresse', ip],
    ['Öffentliche IP', publicIp],
    ['Typ', f.typ],
    ['CPU / RAM / Disk', `${f.cpu} Kerne / ${f.ram} GB / ${f.disk} GB`],
    ['Internet', f.internet],
    ['Public Ports', f.ports],
    ['DNS Name', f.dns],
    ['Betreuende Lehrkraft', teacherLogin(f) || f.lehrkraft],
    ['Nutzungsdauer', f.nutzungsdauer],
  ].filter(([, v]) => v);
  const esc = (v) => String(v).replace(/\|/g, '\\|').replace(/\n+/g, '<br>');
  const table = ['| Feld | Wert |', '|---|---|', ...rows.map(([k, v]) => `| ${k} | ${esc(v)} |`)].join('\n');
  const extra = [
    ['Projektbeschreibung', f.projektbeschreibung],
    ['Teammitglieder (Proxmox-Zugriff)', f.team],
    ['Spezielle Anforderungen', f.spezielles],
  ].filter(([, v]) => v).map(([k, v]) => `**${k}:**\n${v}`).join('\n\n');
  return extra ? `${table}\n\n${extra}` : table;
}

// Label entfernen, ohne Fehler, falls es nicht gesetzt ist.
async function removeLabel(github, context, number, name) {
  try {
    await github.rest.issues.removeLabel({ ...context.repo, issue_number: number, name });
  } catch (e) {
    if (e.status !== 404) throw e;
  }
}

async function addLabels(github, context, number, labels) {
  await github.rest.issues.addLabels({ ...context.repo, issue_number: number, labels });
}

async function comment(github, context, number, body) {
  await github.rest.issues.createComment({ ...context.repo, issue_number: number, body });
}

// Bot-Kommentar mit Marker anlegen oder aktualisieren (verhindert Kommentar-Flut bei Edits).
// onlyIfExists: nur aktualisieren, nicht neu anlegen.
async function upsertComment(github, context, number, marker, body, onlyIfExists = false) {
  const tag = `<!-- ${marker} -->`;
  const comments = await github.paginate(github.rest.issues.listComments, { ...context.repo, issue_number: number, per_page: 100 });
  const existing = comments.find((c) => c.user.type === 'Bot' && c.body.includes(tag));
  if (existing) {
    await github.rest.issues.updateComment({ ...context.repo, comment_id: existing.id, body: `${tag}\n${body}` });
  } else if (!onlyIfExists) {
    await comment(github, context, number, `${tag}\n${body}`);
  }
}

// Nur Triage oder höher darf Kommandos ausführen.
async function hasTriage(github, context, username) {
  try {
    const { data } = await github.rest.repos.getCollaboratorPermissionLevel({ ...context.repo, username });
    return ['triage', 'write', 'maintain', 'admin'].includes(data.role_name);
  } catch (e) {
    if (e.status === 404) return false;
    throw e;
  }
}

// Antrag ablehnen: Status-Labels weg, Label abgelehnt, Kommentar, Issue schließen.
// reason: Begründung aus /ablehnen, oder null (nur Label gesetzt → Verweis auf Kommentare).
// ipVergabe: wird erwähnt, falls die IP schon vergeben war.
async function reject(github, context, issue, actor, reason, ipVergabe) {
  const nr = issue.number;
  const labels = labelNames(issue);
  const f = parseBody(issue.body);
  const t = (de, e) => (isEnglish(issue) ? e : de);

  if (labels.includes(LABEL.erstellt)) {
    await comment(github, context, nr,
      `⚠️ Antrag \`${f.projektname}\` soll abgelehnt werden, die VM existiert aber bereits (\`${LABEL.erstellt}\`). ` +
      'Bitte die VM zuerst in Proxmox löschen und das Issue danach manuell schließen.');
    return;
  }

  const hadIp = labels.includes(LABEL.ipVergeben);
  for (const l of OPEN_STATUS_LABELS) {
    if (labels.includes(l)) await removeLabel(github, context, nr, l);
  }
  if (!labels.includes(LABEL.abgelehnt)) await addLabels(github, context, nr, [LABEL.abgelehnt]);

  const why = reason
    ? t(`**Begründung:** ${reason}`, `**Reason:** ${reason}`)
    : t('Die Begründung findet ihr in den Kommentaren oben.', 'You can find the reason in the comments above.');
  let body = `@${issue.user.login} ` + t(
    `❌ Euer Antrag wurde von @${actor} abgelehnt.\n\n${why}\n\nIhr könnt gerne einen neuen, korrigierten Antrag stellen.`,
    `❌ Your request was rejected by @${actor}.\n\n${why}\n\nFeel free to submit a new, corrected request.`);
  if (hadIp) {
    body += `\n\n---\n\n${mention(ipVergabe)} Für \`${f.projektname}\` war bereits eine IP-Adresse vergeben – bitte wieder freigeben.`;
  }
  await comment(github, context, nr, body);
  await github.rest.issues.update({ ...context.repo, issue_number: nr, state: 'closed', state_reason: 'not_planned' });
}

module.exports = {
  LABEL, OPEN_STATUS_LABELS, STATUS_LABELS, APPROVED_LABELS, EXPIRY_MONTHS, EXTEND_MAX_MONTHS, EXPIRY_WARN_DAYS, SECURITY_MARKER,
  parseBody, labelNames, isEnglish, wantsInternet, mention, isIPv4, isIPv4Cidr, parseIpCommand, diffFields, validate, summary,
  teacherLogin, isTeacher, userExists, today, addMonths, daysUntil, formatDate, expiryMarker, findExpiry, securityChecklist,
  removeLabel, addLabels, comment, upsertComment, hasTriage, reject,
};
