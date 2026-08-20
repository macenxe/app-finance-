# Contrôle C2 — lot 2 (catalogue front + listes back).
# Mesure : front/data.js (UC_CATALOGUE, UC_FAVORIS), front/pages.js (CAT_MAP),
#          back/src/fonds-meta.ts, back/src/uc-history.ts, back/src/uc-managers.ts,
#          syntaxe des 4 fichiers front (node --check), referentiel.json en référence.
# Conforme si :
#  - UC_CATALOGUE = 56 entrées, même ordre que le référentiel, categorie ∈ {Actions,
#    Mixte / Flexible, Obligataire, Monétaire} conforme à la section, mut/fin booléens
#    = éligibilités du référentiel, srri/graphId = référentiel ;
#  - comptes par catégorie : Actions 34, Mixte / Flexible 14, Obligataire 5, Monétaire 3 ;
#  - compte « Conservateur » dans le nom = compte du référentiel (onglet C, D6) ;
#  - UC_FAVORIS = exactement les 14 ISIN d'avant-chantier (intouché) ;
#  - listes back = tous les ISIN du référentiel AVEC graphId (55), aucune autre entrée ;
#  - node --check passe sur data.js, pages.js, app.js, api.js.
# Un catalogue resté à 15 entrées échoue (non traité ≠ conforme).
import json, re, subprocess, sys, collections

BASE = '/Users/maxenceevrard/Documents/claude/application finance'
REF = json.load(open(f'{BASE}/.claude/chantier-uc/referentiel.json'))['ucs']
CAT = {'Actions': 'Actions', 'Obligations': 'Obligataire', 'Mixtes': 'Mixte / Flexible', 'Monétaires': 'Monétaire'}
FAVORIS_FIGES = ['FR0011253624', 'LU1819480192', 'LU1244893696', 'LU0280435388', 'LU0217139020',
                 'FR0010564229', 'FR0000295230', 'LU1261432659', 'FR0013256930', 'FR0010489542',
                 'FR0013087152', 'FR0010564336', 'FR0011461326', 'FR0013287315']

def echec(msg):
    print(f'C2 NON CONFORME : {msg}')
    sys.exit(1)

for f in ('data.js', 'pages.js', 'app.js', 'api.js'):
    r = subprocess.run(['node', '--check', f'{BASE}/front/{f}'], capture_output=True, text=True)
    if r.returncode != 0:
        echec(f'node --check {f} : {r.stderr.strip()[:300]}')

# Catalogue et favoris lus par évaluation Node de data.js (fichier de constantes).
lecture = subprocess.run(['node', '-e', '''
const vm = require('vm'); const fs = require('fs');
const ctx = vm.createContext({});
const res = vm.runInContext(fs.readFileSync(process.argv[1], 'utf8') + '\\n;JSON.stringify({cat: UC_CATALOGUE, fav: UC_FAVORIS});', ctx);
console.log(res);
''', f'{BASE}/front/data.js'], capture_output=True, text=True)
if lecture.returncode != 0:
    echec(f'évaluation data.js impossible : {lecture.stderr.strip()[:300]}')
data = json.loads(lecture.stdout)
cat, fav = data['cat'], data['fav']

if len(cat) != 56:
    echec(f'UC_CATALOGUE : {len(cat)} entrées, 56 attendues')
if fav != FAVORIS_FIGES:
    echec(f'UC_FAVORIS modifié : {fav}')

for i, (u, r) in enumerate(zip(cat, REF)):
    if u['isin'] != r['isin']:
        echec(f'ordre : position {i} = {u["isin"]}, référentiel = {r["isin"]}')
    if u.get('categorie') != CAT[r['section']]:
        echec(f'{u["isin"]} : categorie {u.get("categorie")!r} ≠ {CAT[r["section"]]!r}')
    if u.get('mut') is not (r['mutuelle'] == 'Ouvert') or u.get('fin') is not (r['cto'] == 'Ouvert'):
        echec(f'{u["isin"]} : mut/fin ({u.get("mut")}, {u.get("fin")}) ≠ référentiel')
    if u.get('srri', 'X') != r.get('srri') or u.get('graphId', 'X') != r.get('graphId'):
        echec(f'{u["isin"]} : srri/graphId ≠ référentiel')

comptes = collections.Counter(u['categorie'] for u in cat)
if dict(comptes) != {'Actions': 34, 'Mixte / Flexible': 14, 'Obligataire': 5, 'Monétaire': 3}:
    echec(f'comptes par catégorie : {dict(comptes)}')
nb_c = sum(1 for u in cat if 'Conservateur' in u['nom'])
nb_c_ref = sum(1 for r in REF if 'Conservateur' in r['libelle'])
if nb_c != nb_c_ref:
    echec(f'onglet C : {nb_c} noms « Conservateur » au catalogue, {nb_c_ref} au référentiel')

# Listes back : tous les ISIN avec graphId, aucune autre entrée.
attendu = sorted(r['isin'] for r in REF if r.get('graphId'))
for fichier, motif in (
    ('fonds-meta.ts', r"\[['\"]([A-Z0-9]{12})['\"],\s*['\"]0P\w+\.F['\"]\]"),
    ('uc-history.ts', r"isin:\s*['\"]([A-Z0-9]{12})['\"]"),
    ('uc-managers.ts', r"\[['\"]([A-Z0-9]{12})['\"],\s*['\"]0P\w+['\"],"),
):
    src = open(f'{BASE}/back/src/{fichier}').read()
    trouves = sorted(set(re.findall(motif, src)))
    if trouves != attendu:
        manque = set(attendu) - set(trouves); trop = set(trouves) - set(attendu)
        echec(f'{fichier} : manque {sorted(manque)[:5]}…({len(manque)}) / en trop {sorted(trop)[:5]}…({len(trop)})')

print(f'C2 CONFORME : catalogue 56, catégories {dict(comptes)}, onglet C {nb_c}, favoris figés, listes back {len(attendu)}.')
sys.exit(0)
