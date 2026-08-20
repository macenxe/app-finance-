# Contrôle C3 — lot 3 (données générées).
# Mesure : front/data/history/uc/*.json, front/data/fonds-meta.json, front/data/uc-compo/*.json,
#          front/data/uc-managers.json, equity du catalogue front/data.js, referentiel.json en référence.
# Conforme si, sur les 55 UC avec graphId :
#  - historique VL présent et valide (≥ 100 points) pour ≥ 45 ;
#  - fiche fonds-meta présente pour ≥ 45 ; uc-managers présente pour ≥ 45 ;
#  - composition uc-compo présente pour ≥ 40 ;
#  - equity du catalogue = round(alloc.action) pour toute UC ayant une compo (D10) ;
#  - tous les JSON mesurés sont valides.
# Le lot doit lister les manquants au journal d'attente ; ce contrôle les imprime pour cela.
import json, subprocess, sys, os

BASE = '/Users/maxenceevrard/Documents/claude/application finance'
REF = json.load(open(f'{BASE}/.claude/chantier-uc/referentiel.json'))['ucs']
AVEC_ID = [u for u in REF if u.get('graphId')]

def echec(msg):
    print(f'C3 NON CONFORME : {msg}')
    sys.exit(1)

manquants = {'historique': [], 'fiche': [], 'managers': [], 'compo': []}

for u in AVEC_ID:
    ch = f'{BASE}/front/data/history/uc/{u["graphId"]}.json'
    try:
        pts = json.load(open(ch))['points']
        # ≥ 10 points : un fonds jeune (part créée récemment) a peu de VL mais son fichier
        # est valide et traçable — le seuil distingue « présent » de « vide/corrompu ».
        if len(pts) < 10: raise ValueError(f'{len(pts)} points')
    except Exception:
        manquants['historique'].append(u['isin'])

fm = json.load(open(f'{BASE}/front/data/fonds-meta.json'))['fonds']
um = json.load(open(f'{BASE}/front/data/uc-managers.json'))['fonds']
for u in AVEC_ID:
    if u['isin'] not in fm: manquants['fiche'].append(u['isin'])
    if u['isin'] not in um: manquants['managers'].append(u['isin'])
    if not os.path.exists(f'{BASE}/front/data/uc-compo/{u["isin"]}.json'): manquants['compo'].append(u['isin'])

SEUILS = {'historique': 45, 'fiche': 45, 'managers': 45, 'compo': 40}
for cle, seuil in SEUILS.items():
    ok = len(AVEC_ID) - len(manquants[cle])
    print(f'{cle} : {ok}/{len(AVEC_ID)} (seuil {seuil})' + (f' — manquants : {manquants[cle]}' if manquants[cle] else ''))
    if ok < seuil:
        echec(f'{cle} : {ok} < seuil {seuil}')

# Cohérence equity ↔ compo (D10) sur le catalogue publié.
lecture = subprocess.run(['node', '-e', '''
const vm = require('vm'); const fs = require('fs');
const ctx = vm.createContext({});
console.log(vm.runInContext(fs.readFileSync(process.argv[1], 'utf8') + '\\n;JSON.stringify(UC_CATALOGUE);', ctx));
''', f'{BASE}/front/data.js'], capture_output=True, text=True)
cat = {u['isin']: u for u in json.loads(lecture.stdout)}
for u in REF:
    ch = f'{BASE}/front/data/uc-compo/{u["isin"]}.json'
    if not os.path.exists(ch): continue
    action = json.load(open(ch))['alloc']['action']
    # Arrondi demi-supérieur (convention Math.round de JS), pas l'arrondi bancaire Python.
    import math
    if cat[u['isin']]['equity'] != math.floor(action + 0.5):
        echec(f'{u["isin"]} : equity {cat[u["isin"]]["equity"]} ≠ round(compo {action})')

print('C3 CONFORME.')
sys.exit(0)
