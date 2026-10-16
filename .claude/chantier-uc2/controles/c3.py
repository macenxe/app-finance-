# Contrôle du lot 3 — intégration des 10 fonds (D1 : Mut seulement ; D3 : rangs 58-67 en fin de catalogue).
# Usage : python3 .claude/chantier-uc2/controles/c3.py <borne>   (depuis la racine du dépôt)
# Mesure :
#   .claude/chantier-uc2/{referentiel,identifiants}.json (attendus) ; front/data.js (UC_CATALOGUE) ;
#   back/src/{fonds-meta,uc-history,uc-managers,news}.ts ; front/data/{fonds-meta,uc-managers,uc-vl-hebdo}.json ;
#   front/data/uc-compo/<ISIN>.json ; front/data/history/uc/<graphId>.json ; tsc --noEmit ; node --check data.js.
# Exigences : 63 UC, Mut 61, Fin 28 ; chaque ajout présent partout, cohérent avec le référentiel ;
#   tout le reste identique à la borne ; aucune trace des 4 fonds retirés au lot 1 (non-régression).
import json, re, subprocess, sys

borne = sys.argv[1] if len(sys.argv) > 1 else sys.exit('borne manquante')
C = '.claude/chantier-uc2/'
lire = lambda f: open(f, encoding='utf-8').read()
def a_la_borne(f): return subprocess.run(['git', 'show', f'{borne}:{f}'], capture_output=True, text=True).stdout
ecarts = []
try:
    ref = {f['isin']: f for f in json.load(open(C + 'referentiel.json', encoding='utf-8'))}
except Exception as e:
    print('ÉCART referentiel.json illisible ou absent :', e); print('NON CONFORME'); sys.exit(1)
ids = json.load(open(C + 'identifiants.json', encoding='utf-8'))
AJOUTS = list(ids)
gid = lambda i: ids[i]['yahoo']['graphId']
RETIRES = ['FR0010479931', 'LU1103305709', 'LU1752460292', 'FR001400U512', '0P000018ZI', '0P000172SH', '0P0001EITS', '0P0001UVBG']

# 1. Catalogue : décomptes et entrées des ajouts.
js = lire('front/data.js')
cat = re.search(r'const UC_CATALOGUE = \[([\s\S]*?)\n\];', js).group(1)
mesure = {'uc': len(re.findall(r'\{ rang:', cat)), 'mut': cat.count('mut:true'), 'fin': cat.count('fin:true')}
for k, v in {'uc': 63, 'mut': 61, 'fin': 28}.items():
    if mesure[k] != v: ecarts.append(f'catalogue : {k} = {mesure[k]} (attendu {v})')
rangs = []
for i in AJOUTS:
    m = re.search(r'\{ rang:(\d+), gerant:"([^"]*)", nom:"([^"]*)", isin:"' + i + r'", categorie:"([^"]*)", srri:(\w+), equity:([\w.]+), '
                  r'graphId:"([^"]*)", mut:(\w+), fin:(\w+),\n    strategie:"((?:[^"\\]|\\.)*)" \},', cat)
    if not m: ecarts.append(f'{i} : entrée catalogue absente ou mal formée'); continue
    rang, ger, nom, categ, srri, eq, g, mut, fin, strat = m.groups()
    r = ref.get(i, {})
    rangs.append(int(rang))
    attendu = {'gerant': r.get('gerant'), 'nom': r.get('nom'), 'categorie': r.get('categorie'), 'srri': str(r.get('srri')),
               'graphId': gid(i), 'mut': 'true', 'fin': 'false', 'strategie': (r.get('strategie') or '').replace('"', '\\"')}
    for k, v in {'gerant': ger, 'nom': nom, 'categorie': categ, 'srri': srri, 'graphId': g, 'mut': mut, 'fin': fin, 'strategie': strat}.items():
        if v != attendu[k]: ecarts.append(f'{i} : {k} {v[:60]!r} ≠ attendu {str(attendu[k])[:60]!r}')
    if eq != 'null' and not (re.fullmatch(r'\d+', eq) and 0 <= int(eq) <= 100): ecarts.append(f'{i} : equity {eq!r}')
if sorted(rangs) != list(range(58, 68)): ecarts.append(f'rangs des ajouts {sorted(rangs)} ≠ 58-67')

# 2. Listes back et flux d'actualités.
lignes_attendues = {
    'back/src/fonds-meta.ts': lambda i: f'  ["{i}", "{gid(i)}"],',
    'back/src/uc-history.ts': lambda i: f'  {{ isin: "{i}", graphId: "{gid(i)}", xidRepli: "{ids[i]["xid"]}" }},',
    'back/src/uc-managers.ts': lambda i: f'  ["{i}", "{ids[i]["msId"]}", "{ref.get(i, {}).get("nom_officiel_court") or ids[i]["ms_nom"]}"],',
}
for f, ligne in lignes_attendues.items():
    s = lire(f).split('\n')
    for i in AJOUTS:
        trouvees = [l for l in s if f'"{i}"' in l]
        if len(trouvees) != 1 or (f != 'back/src/uc-managers.ts' and trouvees[0] != ligne(i)) \
           or (f == 'back/src/uc-managers.ts' and not trouvees[0].startswith(f'  ["{i}", "{ids[i]["msId"]}", "')):
            ecarts.append(f'{f} : ligne de {i} absente ou incorrecte')
    # Reste identique à la borne.
    if [l for l in s if not any(f'"{i}"' in l for i in AJOUTS)] != a_la_borne(f).split('\n'):
        ecarts.append(f'{f} : diffère de la borne au-delà des ajouts')
re_liste = re.compile(r'const FLUX_UC_FONDS = \[([\s\S]*?)\];')
liste = lambda s: re.findall(r"'([^']+)'", re_liste.search(s).group(1))
n, b = lire('back/src/news.ts'), a_la_borne('back/src/news.ts')
if liste(n) != liste(b) + [ref[i]['nom_flux'] for i in AJOUTS if i in ref]: ecarts.append('news.ts : FLUX_UC_FONDS ≠ borne + nom_flux des ajouts (ordre des identifiants)')
if re_liste.sub('', n) != re_liste.sub('', b): ecarts.append('news.ts : modifié hors FLUX_UC_FONDS')

# 3. data.js hors entrées ajoutées : identique à la borne.
sans_ajouts = re.sub(r'\n  \{ rang:\d+, [^\n]*isin:"(' + '|'.join(AJOUTS) + r')"[^\n]*\n    strategie:[^\n]*', '', js)
if sans_ajouts != a_la_borne('front/data.js'): ecarts.append('front/data.js : diffère de la borne au-delà des ajouts')

# 4. Données générées.
for f, cle in (('front/data/fonds-meta.json', 'isin'), ('front/data/uc-managers.json', 'isin'), ('front/data/uc-vl-hebdo.json', 'gid')):
    c, b = json.loads(lire(f)), json.loads(a_la_borne(f))
    for i in AJOUTS:
        k = i if cle == 'isin' else gid(i)
        if k not in c['fonds']: ecarts.append(f'{f} : {k} absent')
        c['fonds'].pop(k, None)
    if c != b: ecarts.append(f'{f} : diffère de la borne au-delà des ajouts')
for i in AJOUTS:
    try:
        if json.loads(lire(f'front/data/uc-compo/{i}.json')).get('isin') != i: ecarts.append(f'uc-compo/{i}.json : isin incohérent')
    except Exception: ecarts.append(f'uc-compo/{i}.json absent ou illisible')
    try:
        if len(json.loads(lire(f'front/data/history/uc/{gid(i)}.json'))['points']) < 2: ecarts.append(f'historique {gid(i)} < 2 points')
    except Exception: ecarts.append(f'history/uc/{gid(i)}.json absent ou illisible')

# 5. Non-régression du lot 1 et validité du code.
for f in ['front/data.js', 'back/src/fonds-meta.ts', 'back/src/uc-history.ts', 'back/src/uc-managers.ts',
          'front/data/fonds-meta.json', 'front/data/uc-managers.json', 'front/data/uc-vl-hebdo.json']:
    for r in RETIRES:
        if r in lire(f): ecarts.append(f'{f} contient de nouveau {r} (lot 1)')
if subprocess.run(['node', '--check', 'front/data.js'], capture_output=True).returncode: ecarts.append('node --check front/data.js échoue')
if subprocess.run(['node_modules/.bin/tsc', '--noEmit'], cwd='back', capture_output=True).returncode: ecarts.append('tsc --noEmit échoue')

print(f'c3 — mesure {mesure}')
for e in ecarts: print('ÉCART', e)
print('CONFORME' if not ecarts else f'NON CONFORME ({len(ecarts)} écarts)')
sys.exit(1 if ecarts else 0)
