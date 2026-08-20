# Contrôle C5 — lot 5 (actus UC étendues au catalogue).
# Mesure : back/src/news.ts (FLUX_UC_FONDS, générateur FLUX_UC), .claude/chantier-uc/actus-noms.json
# (table isin → nom de recherche émise par le codegen), referentiel.json en référence, tsc.
# Conforme si :
#  - actus-noms.json couvre les 56 ISIN du référentiel ; noms uniques = contenu exact de
#    FLUX_UC_FONDS (l'unicité absorbe les parts multiples d'un même fonds) ;
#  - FLUX_UC_FONDS compte ≥ 50 noms, sans doublon ;
#  - regroupement par tranches de 7 → nombre de requêtes = ceil(n/7) ≤ 10 (code de découpe
#    par pas de 7 présent) ;
#  - anti-collision : tagParMot construit en triant chaque groupe par longueur décroissante
#    (un nom court préfixe d'un nom long ne capte plus les titres du long) ;
#  - npm run typecheck passe.
# Un news.ts resté aux 15 fonds échoue.
import json, math, re, subprocess, sys

BASE = '/Users/maxenceevrard/Documents/claude/application finance'

def echec(msg):
    print(f'C5 NON CONFORME : {msg}')
    sys.exit(1)

REF = json.load(open(f'{BASE}/.claude/chantier-uc/referentiel.json'))['ucs']
try:
    noms_map = json.load(open(f'{BASE}/.claude/chantier-uc/actus-noms.json'))
except Exception as e:
    echec(f'actus-noms.json illisible ({e})')

if set(noms_map) != {u['isin'] for u in REF}:
    echec('actus-noms.json ne couvre pas exactement les 56 ISIN du référentiel')
noms_attendus = sorted(set(noms_map.values()))

src = open(f'{BASE}/back/src/news.ts').read()
m = re.search(r'const FLUX_UC_FONDS = \[([\s\S]*?)\];', src)
if not m:
    echec('FLUX_UC_FONDS introuvable')
noms = re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(1))
noms = [n.replace("\\'", "'") for n in noms]
if len(noms) != len(set(noms)):
    echec('doublons dans FLUX_UC_FONDS')
if len(noms) < 50:
    echec(f'{len(noms)} noms, ≥ 50 attendus (56 UC moins les parts fusionnées)')
if sorted(noms) != noms_attendus:
    echec(f'FLUX_UC_FONDS ≠ noms attendus (diff : {sorted(set(noms) ^ set(noms_attendus))[:6]})')

if not re.search(r'i \+= 7|i\+=7', src):
    echec('découpe par tranches de 7 absente du générateur FLUX_UC')
if not re.search(r'sort\(\(a, b\) => b\.length - a\.length\)', src):
    echec('tri anti-collision (longueur décroissante) absent du générateur tagParMot')

r = subprocess.run(['npm', 'run', 'typecheck'], cwd=f'{BASE}/back', capture_output=True, text=True)
if r.returncode != 0:
    echec(f'typecheck : {(r.stdout + r.stderr).strip()[:300]}')

print(f'C5 CONFORME : {len(noms)} noms, {math.ceil(len(noms) / 7)} requêtes, anti-collision en place.')
sys.exit(0)
