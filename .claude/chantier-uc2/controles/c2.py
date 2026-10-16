# Contrôle du lot 2 — référentiel des 10 fonds à ajouter.
# Usage : python3 .claude/chantier-uc2/controles/c2.py   (depuis la racine du dépôt ; réseau requis)
# Mesure : .claude/chantier-uc2/referentiel.json ; back/src/news.ts (FLUX_UC_FONDS, unicité des noms) ;
#   FT chartapi (historique par XID) ; Yahoo chart (graphId renseignés).
# Exigences : 10 entrées complètes, SRI 1-7 sourcé, catégorie d'affichage valide, stratégie 150-900
#   caractères, historique FT ≥ 20 points, graphId valide quand il est renseigné. Fichier absent = échec.
import json, re, sys, urllib.request

ISINS = ['FR0013367265', 'FR0010871830', 'IE000S1JLOI7', 'FR0014014FK3', 'LU1317704051',
         'LU1833929729', 'LU0255976994', 'LU0270904781', 'LU0104884860', 'FR0010380675']
CATEGORIES = {'Actions', 'Mixte / Flexible', 'Obligataire', 'Monétaire'}
GERANTS = {'R·co', 'Mon', 'Laz', 'Carm', 'ODDO', 'Pct'}  # D6
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'}
ecarts = []

def points_ft(xid):
    corps = json.dumps({'days': 400, 'dataNormalized': False, 'dataPeriod': 'Day', 'dataInterval': 1, 'realtime': False,
                        'yFormat': '0.###', 'timeServiceFormat': 'JSON', 'returnDateType': 'ISO8601',
                        'elements': [{'Type': 'price', 'Symbol': xid, 'OverlayIndicators': [], 'Params': {}}]}).encode()
    req = urllib.request.Request('https://markets.ft.com/data/chartapi/series', corps, {**UA, 'Content-Type': 'application/json'})
    cs = json.load(urllib.request.urlopen(req, timeout=30))['Elements'][0]['ComponentSeries']
    return sum(v is not None for v in next(s for s in cs if s['Type'] == 'Close')['Values'])

def points_yahoo(gid):
    req = urllib.request.Request(f'https://query2.finance.yahoo.com/v8/finance/chart/{gid}?range=1y&interval=1d', headers=UA)
    r = json.load(urllib.request.urlopen(req, timeout=30))['chart']['result'][0]
    return sum(c is not None for c in r['indicators']['quote'][0]['close'])

try:
    ref = json.load(open('.claude/chantier-uc2/referentiel.json', encoding='utf-8'))
except Exception as e:
    print('ÉCART referentiel.json illisible ou absent :', e); print('NON CONFORME'); sys.exit(1)

if sorted(f.get('isin') for f in ref) != sorted(ISINS): ecarts.append(f'ISIN du référentiel ≠ les 10 attendus')
flux = set(re.findall(r"'([^']+)'", re.search(r'const FLUX_UC_FONDS = \[([\s\S]*?)\];', open('back/src/news.ts', encoding='utf-8').read()).group(1)))
vus = set()
for f in ref:
    i = f.get('isin', '?')
    for champ in ('nom', 'nom_officiel', 'societe', 'duree_recommandee', 'nom_flux'):
        if not str(f.get(champ) or '').strip(): ecarts.append(f'{i} : {champ} vide')
    if f.get('gerant') not in GERANTS: ecarts.append(f'{i} : gerant {f.get("gerant")!r} hors D6')
    if f.get('categorie') not in CATEGORIES: ecarts.append(f'{i} : categorie {f.get("categorie")!r}')
    if not (isinstance(f.get('srri'), int) and 1 <= f['srri'] <= 7): ecarts.append(f'{i} : srri {f.get("srri")!r}')
    src = f.get('srri_source') or {}
    if not str(src.get('url', '')).startswith('http') or not src.get('date_dic') or not src.get('citation'):
        ecarts.append(f'{i} : srri_source incomplète')
    n = len(f.get('strategie') or '')
    if not 150 <= n <= 900: ecarts.append(f'{i} : strategie de {n} caractères')
    if not str((f.get('strategie_source') or {}).get('url', '')).startswith('http'): ecarts.append(f'{i} : strategie_source sans URL')
    nf = f.get('nom_flux')
    if nf in flux or nf in vus: ecarts.append(f'{i} : nom_flux {nf!r} déjà pris')
    vus.add(nf)
    if not re.fullmatch(r'\d+', str(f.get('xid', ''))): ecarts.append(f'{i} : xid {f.get("xid")!r}')
    else:
        try:
            p = points_ft(f['xid'])
            if p < 20: ecarts.append(f'{i} : historique FT de {p} points')
        except Exception as e: ecarts.append(f'{i} : historique FT illisible ({e})')
    gid = f.get('graphId')
    if gid is not None:
        if not re.fullmatch(r'0P\w{8}\.F', gid): ecarts.append(f'{i} : graphId {gid!r} mal formé')
        else:
            try:
                p = points_yahoo(gid)
                if p < 20: ecarts.append(f'{i} : Yahoo {gid} {p} points')
            except Exception as e: ecarts.append(f'{i} : Yahoo {gid} illisible ({e})')
    ms = f.get('msId')
    if ms is not None and not re.fullmatch(r'0P\w{8}', ms): ecarts.append(f'{i} : msId {ms!r} mal formé')

print(f'c2 — {len(ref)} entrées')
for e in ecarts: print('ÉCART', e)
print('CONFORME' if not ecarts else f'NON CONFORME ({len(ecarts)} écarts)')
sys.exit(1 if ecarts else 0)
