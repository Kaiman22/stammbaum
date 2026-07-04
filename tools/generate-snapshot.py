#!/usr/bin/env python3
"""Erzeugt js/data-snapshot.js — den gebündelten Offline-Datenbestand der App.

Zwei Quellen, je nachdem was verfügbar ist:

1) LIVE-DB (bevorzugt, wenn das Supabase-Projekt läuft):
     export SUPABASE_URL="https://<projekt-ref>.supabase.co"
     export SUPABASE_SERVICE_KEY="<service-role-key>"
     python3 tools/generate-snapshot.py --from-db

2) IMPORT-SKRIPT (Fallback ohne Backend, Stand des letzten Gotha-Imports):
     python3 tools/generate-snapshot.py

Nach jeder relevanten Datenänderung neu ausführen und die Versionsnummer
von js/data-snapshot.js in index.html erhöhen.
"""
import sys, os, json, types
from datetime import date

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, 'js', 'data-snapshot.js')

# ── Gender-Zuordnung nach Vornamen (für Quelle 2; Quelle 1 hat gender in der DB) ──
FEMALE = {
    'thusnelda','gertrud','alexandra','olga','margarete','madlene','marie-liane',
    'annaliese','henny','josi','elsa','karoline','roswitha','christa','martha',
    'christiane','elke','jutta','jutta gudrun','jutta-dorothee','maria-madlene',
    'marilyn','nita','maria','heike','renate','katharina','franziska','antje',
    'birgit','marietta','kathryn','pamela','iris','caroline','constanze','gabriele',
    'beate','barbara','adelheid','marianne','eva','kirsten','anne','christina',
    'julia','anna','laura','sophie','marie','emma','lena','johanna','charlotte',
    'luisa','griet','tabea','leonie','lara','sophia','ella','freya','helena',
}
MALE = {
    'hans leo','adolf friedrich','hans karl','eckhard','georg','georg hans ludolf',
    'werner','hans engel ludolf peter','heyno','friedo','peter ernst diedrich',
    'winand','kurt','heinfred','ulrich','friedrich christian','friedrich','albrecht',
    'ernst-christof','henning','stephan','thomas','klaus','eberhard','axel','ralf',
    'volker','paul','robert','daniel','hilmar','hans','edward','kenneth','timothy',
    'david','gerhard','jens','stevan','henrik','kai','maximilian','moritz','felix',
    'lukas','jonas','leon','bernd','joachim','christoph','tilman','claudius',
    'ralph','eric','jobst','jurek','jost','jasper','jakob','michael','andreas',
}

def guess_gender(first_name, birth_name):
    fn = (first_name or '').strip().lower()
    if fn in FEMALE: return 'f'
    if fn in MALE: return 'm'
    fw = fn.split(' ')[0].split('-')[0]
    if fw in FEMALE: return 'f'
    if fw in MALE: return 'm'
    if birth_name: return 'f'  # Eingeheiratete mit Geburtsname sind in dieser Linie Frauen
    return None

def normalize_gender(g):
    if not g: return None
    g = str(g).strip().lower()
    if g in ('m', 'male', 'mann', 'männlich'): return 'm'
    if g in ('f', 'female', 'frau', 'weiblich'): return 'f'
    if g in ('d', 'divers'): return 'd'
    return None

def from_import_script():
    sys.modules.setdefault('requests', types.ModuleType('requests'))
    sys.path.insert(0, REPO)
    import import_data as src

    members = []
    for (code, first, last, birth_name, bdate, ddate, blood) in src.members:
        members.append({
            'id': src.make_id(code),
            'first_name': first, 'last_name': last,
            'birth_name': birth_name or '',
            'birth_date': bdate, 'death_date': ddate,
            'is_deceased': bool(ddate), 'is_placeholder': True,
            'claimed_by_uid': None, 'created_by': None,
            'photo': '', 'contact': '', 'phone': '', 'email': '',
            'location': '', 'notes': '',
            'gender': guess_gender(first, birth_name),
            'occupation': '',
            'created_at': None, 'updated_at': None,
            'gotha_code': code, 'is_blood_line': bool(blood),
        })

    rels, n = [], 0
    for (a, b, mdate, ddate) in src.spouses:
        n += 1
        rels.append({'id': f'local-rel-{n:04d}', 'from_id': src.make_id(a), 'to_id': src.make_id(b),
                     'rel_type': 'spouse', 'marriage_date': mdate, 'divorce_date': ddate})
    for (p, c) in src.parent_child:
        n += 1
        rels.append({'id': f'local-rel-{n:04d}', 'from_id': src.make_id(p), 'to_id': src.make_id(c),
                     'rel_type': 'parent_child', 'marriage_date': None, 'divorce_date': None})
    return members, rels, 'import_data.py (Gotha-Import)'

def from_db():
    import urllib.request
    url = os.environ.get('SUPABASE_URL', '').rstrip('/')
    key = os.environ.get('SUPABASE_SERVICE_KEY', '')
    if not url or not key:
        sys.exit('SUPABASE_URL und SUPABASE_SERVICE_KEY setzen für --from-db.')

    def get(path):
        req = urllib.request.Request(f'{url}/rest/v1/{path}',
            headers={'apikey': key, 'Authorization': f'Bearer {key}'})
        with urllib.request.urlopen(req) as r:
            return json.load(r)

    members = get('members?select=*&limit=2000')
    rels = get('relationships?select=*&limit=5000')
    # Auth-Verknüpfungen und Kontaktdaten gehören nicht in den öffentlichen Snapshot
    for m in members:
        m['claimed_by_uid'] = None
        m['created_by'] = None
        m['contact'] = ''
        m['phone'] = ''
        m['email'] = ''
        m['gender'] = normalize_gender(m.get('gender')) or guess_gender(m.get('first_name'), m.get('birth_name'))
    return members, rels, 'Live-DB-Export'

def main():
    if '--from-db' in sys.argv:
        members, rels, source = from_db()
    else:
        members, rels, source = from_import_script()

    ids = {m['id'] for m in members}
    bad = [r for r in rels if r['from_id'] not in ids or r['to_id'] not in ids]
    if bad:
        sys.exit(f'{len(bad)} Beziehungen zeigen auf unbekannte Personen — Abbruch.')

    snapshot = {
        'snapshot_date': str(date.today()),
        'source': source,
        'members': members,
        'relationships': rels,
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('/* ═══════════════════════════════════════════════════════════\n')
        f.write('   STAMMBAUM – Lokaler Daten-Snapshot (Offline-Fallback)\n')
        f.write('   GENERIERT – nicht von Hand bearbeiten.\n')
        f.write(f'   Quelle: {source}\n')
        f.write('   Neu erzeugen: python3 tools/generate-snapshot.py (siehe RESTORE.md)\n')
        f.write('   ═══════════════════════════════════════════════════════════ */\n')
        f.write('const LocalSnapshot = ')
        json.dump(snapshot, f, ensure_ascii=False, indent=1)
        f.write(';\n')
    print(f'{OUT}: {len(members)} Personen, {len(rels)} Beziehungen (Quelle: {source})')
    print('Nicht vergessen: data-snapshot.js-Version in index.html erhöhen!')

if __name__ == '__main__':
    main()
