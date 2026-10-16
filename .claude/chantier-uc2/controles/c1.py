# Contrôle du lot 1 — retrait des 4 UC (D2 : retrait complet).
# Usage : python3 .claude/chantier-uc2/controles/c1.py <borne> [<fin>]   (depuis la racine du dépôt)
#   <fin> absent : mesure l'arbre de travail ; <fin> = commit du lot : mesure ce commit (périmètre entre les
#   bornes du lot, D7) — c'est la forme à relancer au bilan, les lots suivants ajoutant des UC.
# Mesure :
#   front/data.js (UC_CATALOGUE, drapeaux mut/fin), back/src/{fonds-meta,uc-history,uc-managers,news}.ts,
#   front/data/{fonds-meta,uc-managers,uc-vl-hebdo}.json, front/data/uc-compo/<ISIN>.json,
#   front/data/history/uc/<graphId>.json ; tsc --noEmit (back), node --check front/data.js.
# Exigences : aucune trace des 4 fonds ; 53 UC, Mut 51, Fin 28 ; tout le reste identique à la borne.
import json, re, subprocess, sys

RETRAITS = {  # ISIN : (graphId, noms à proscrire)
    'FR0010479931': ('0P000018ZI', ['EdR India']),
    'LU1103305709': ('0P000172SH', ['EdR Fund - US Value', 'EdR Fund US Value']),
    'LU1752460292': ('0P0001EITS', ['ODDO BHF Sust Credit Opportunities', 'ODDO BHF Sustainable Credit Opportunities']),
    'FR001400U512': ('0P0001UVBG', ['Conservateur Investissement Proximité']),
}
SOURCES = ['front/data.js', 'back/src/fonds-meta.ts', 'back/src/uc-history.ts', 'back/src/uc-managers.ts', 'back/src/news.ts']
JSONS = {'front/data/fonds-meta.json': 'isin', 'front/data/uc-managers.json': 'isin', 'front/data/uc-vl-hebdo.json': 'gid'}
ATTENDU = {'uc': 53, 'mut': 51, 'fin': 28}

ecarts = []
borne = sys.argv[1] if len(sys.argv) > 1 else sys.exit('borne manquante')
fin = sys.argv[2] if len(sys.argv) > 2 else None
lire = (lambda f: subprocess.run(['git', 'show', f'{fin}:{f}'], capture_output=True, text=True).stdout) if fin \
    else (lambda f: open(f, encoding='utf-8').read())
existe = (lambda f: subprocess.run(['git', 'cat-file', '-e', f'{fin}:{f}'], capture_output=True).returncode == 0) if fin \
    else (lambda f: subprocess.run(['test', '-e', f]).returncode == 0)
def a_la_borne(f):
    r = subprocess.run(['git', 'show', f'{borne}:{f}'], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None

# 1. Aucune trace des 4 fonds dans les fichiers mesurés.
for f in SOURCES + list(JSONS):
    s = lire(f)
    for isin, (gid, noms) in RETRAITS.items():
        for motif in [isin, gid] + noms:
            if motif in s: ecarts.append(f'{f} contient encore {motif!r}')
for isin, (gid, _) in RETRAITS.items():
    for f in (f'front/data/uc-compo/{isin}.json', f'front/data/history/uc/{gid}.F.json'):
        if existe(f): ecarts.append(f'{f} existe encore')

# 2. Décomptes du catalogue.
cat = re.search(r'const UC_CATALOGUE = \[([\s\S]*?)\n\];', lire('front/data.js')).group(1)
mesure = {'uc': len(re.findall(r'\{ rang:', cat)), 'mut': len(re.findall(r'mut:true', cat)), 'fin': len(re.findall(r'fin:true', cat))}
for k, v in ATTENDU.items():
    if mesure[k] != v: ecarts.append(f'catalogue : {k} = {mesure[k]} (attendu {v})')

# 3. Sources : identiques à la borne, lignes des 4 fonds en moins (data.js : ligne strategie suivante incluse).
for f in SOURCES[:-1]:
    lignes, attendu, sauter = a_la_borne(f).split('\n'), [], False
    for l in lignes:
        if sauter and l.startswith('    strategie:'): sauter = False; continue
        sauter = False
        if any(i in l for i in RETRAITS): sauter = f == 'front/data.js'; continue
        attendu.append(l)
    if lire(f) != '\n'.join(attendu): ecarts.append(f'{f} : diffère de la borne au-delà des 4 retraits')
# news.ts : liste FLUX_UC_FONDS = borne moins les 4 noms, hors liste identique.
re_liste = re.compile(r'const FLUX_UC_FONDS = \[([\s\S]*?)\];')
noms_proscrits = {n for _, ns in RETRAITS.values() for n in ns}
b, c = a_la_borne('back/src/news.ts'), lire('back/src/news.ts')
liste = lambda s: re.findall(r"'([^']+)'", re_liste.search(s).group(1))
if liste(c) != [n for n in liste(b) if n not in noms_proscrits]: ecarts.append('news.ts : FLUX_UC_FONDS ≠ borne moins les 4 noms')
if re_liste.sub('', b) != re_liste.sub('', c): ecarts.append('news.ts : modifié hors FLUX_UC_FONDS')

# 4. JSON générés : borne moins les 4 clés, le reste identique (genere compris).
for f, cle in JSONS.items():
    b, c = json.loads(a_la_borne(f)), json.loads(lire(f))
    for isin, (gid, _) in RETRAITS.items():
        b['fonds'].pop(isin if cle == 'isin' else f'{gid}.F', None)
    if b != c: ecarts.append(f'{f} : diffère de la borne au-delà des 4 retraits')

# 5. Validité du code (arbre de travail seulement).
if not fin:
  if subprocess.run(['node', '--check', 'front/data.js'], capture_output=True).returncode: ecarts.append('node --check front/data.js échoue')
  if subprocess.run(['node_modules/.bin/tsc', '--noEmit'], cwd='back', capture_output=True).returncode: ecarts.append('tsc --noEmit échoue')

print(f'c1 — mesure {mesure}')
for e in ecarts: print('ÉCART', e)
print('CONFORME' if not ecarts else f'NON CONFORME ({len(ecarts)} écarts)')
sys.exit(1 if ecarts else 0)
