// Gemeinsame Logik für die VM-Antrags-Workflows.
// Wird aus actions/github-script per require() geladen.

// Feld-Labels beider Formulare (vm-antrag.yaml / vm-request.yaml) → Feld-ID.
// Bei jeder Feldänderung hier nachziehen!
const FIELD_LABELS = {
  'Projektname': 'projektname', 'Project name': 'projektname',
  'Projektbeschreibung': 'projektbeschreibung', 'Project description': 'projektbeschreibung',
  'Betreuende Lehrkraft': 'lehrkraft', 'Supervising teacher': 'lehrkraft',
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
  freigegeben: 'status: freigegeben',
  ipVergeben: 'status: ip-vergeben',
  erstellt: 'status: erstellt',
  abgelehnt: 'abgelehnt',
  ungueltig: 'ungültig',
};
const STATUS_LABELS = [LABEL.neu, LABEL.freigegeben, LABEL.ipVergeben, LABEL.erstellt, LABEL.abgelehnt];

const NAME_RE = /^[a-z][a-z0-9-]{2,29}$/;
const HOST_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const IPV4_RE = /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/;
const RISKY_PORTS = [22, 3306, 5432, 6379, 27017];

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

// Prüft die Formularwerte. takenNames: Projektnamen anderer offener Anträge.
function validate(f, takenNames, en) {
  const t = (de, e) => (en ? e : de);
  const errors = [];
  const warnings = [];
  const name = f.projektname || '';

  if (!NAME_RE.test(name)) {
    errors.push(t(
      `Projektname \`${name}\` ist ungültig: nur a–z, 0–9 und \`-\`, beginnt mit einem Buchstaben, 3–30 Zeichen.`,
      `Project name \`${name}\` is invalid: only a–z, 0–9 and \`-\`, must start with a letter, 3–30 characters.`));
  } else if (takenNames.includes(name)) {
    errors.push(t(
      `Projektname \`${name}\` ist bereits von einem anderen offenen Antrag belegt. Bitte einen anderen Namen wählen.`,
      `Project name \`${name}\` is already used by another open request. Please choose a different name.`));
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
  }

  return { errors, warnings };
}

// Zusammenfassung für die Admins (immer deutsch).
function summary(f, ip) {
  const rows = [
    ['Projektname', f.projektname],
    ['IP-Adresse', ip],
    ['Typ', f.typ],
    ['CPU / RAM / Disk', `${f.cpu} Kerne / ${f.ram} GB / ${f.disk} GB`],
    ['Internet', f.internet],
    ['Public Ports', f.ports],
    ['DNS Name', f.dns],
    ['Betreuende Lehrkraft', f.lehrkraft],
    ['Nutzungsdauer', f.nutzungsdauer],
  ].filter(([, v]) => v);
  const esc = (v) => String(v).replace(/\|/g, '\\|').replace(/\n+/g, '<br>');
  const table = ['| Feld | Wert |', '|---|---|', ...rows.map(([k, v]) => `| ${k} | ${esc(v)} |`)].join('\n');
  const extra = [
    ['Projektbeschreibung', f.projektbeschreibung],
    ['Teammitglieder', f.team],
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
  for (const l of [LABEL.neu, LABEL.freigegeben, LABEL.ipVergeben]) {
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
  LABEL, STATUS_LABELS, parseBody, labelNames, isEnglish, wantsInternet, mention, isIPv4,
  validate, summary, removeLabel, addLabels, comment, upsertComment, hasTriage, reject,
};
