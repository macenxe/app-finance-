# Contrôle C1 — lot 1 (identifiants & éditorial).
# Mesure : .claude/chantier-uc/referentiel.json (uniquement).
# Conforme si, pour chacune des 56 UC :
#  - gerant non vide ;
#  - graphId ~ ^0P\w+\.F$ OU null accompagné de graphId_note (D5) ;
#  - xid ~ ^\d+$ OU null accompagné de xid_note ;
#  - srri entier ∈ [1..7] OU null accompagné de srri_note (D4) ;
#  - strategie ≥ 40 caractères OU null accompagné de strategie_note ;
#  - equity entier ∈ [0..100] (amorce, D10).
# Et : 0 doublon ISIN / graphId ; les 15 UC déjà en production gardent leur graphId
# d'avant-chantier (non-régression, valeurs figées ci-dessous). Un référentiel non enrichi échoue.
import json, re, sys, collections

CHEMIN = '/Users/maxenceevrard/Documents/claude/application finance/.claude/chantier-uc/referentiel.json'
GRAPH_EXISTANTS = {
    'FR0011253624': '0P00017T6E.F', 'LU1819480192': '0P0001DYQM.F', 'LU1244893696': '0P00016P7T.F',
    'LU0280435388': '0P00008OBQ.F', 'LU0217139020': '0P000021C4.F', 'FR0010564229': '0P0000INCI.F',
    'FR0000295230': '0P00000PM8.F', 'LU1261432659': '0P00016FY4.F', 'FR0013256930': '0P0001HI3U.F',
    'FR0010489542': '0P0000JZWP.F', 'FR0013087152': '0P00019OMO.F', 'FR0010564336': '0P0000JLHZ.F',
    'LU1694790202': '0P0001CH1A.F', 'FR0011461326': '0P0000ZL7Q.F', 'FR0013287315': '0P0001CB5C.F',
}

def echec(msg):
    print(f'C1 NON CONFORME : {msg}')
    sys.exit(1)

try:
    ucs = json.load(open(CHEMIN))['ucs']
except Exception as e:
    echec(f'referentiel.json illisible ({e})')
if len(ucs) != 56:
    echec(f'{len(ucs)} entrées, 56 attendues')

for u in ucs:
    isin = u.get('isin', '?')
    if not u.get('gerant'):
        echec(f'{isin} : gerant vide')
    g = u.get('graphId', 'ABSENT')
    if g == 'ABSENT' or (g is not None and not re.fullmatch(r'0P\w+\.F', g)) or (g is None and not u.get('graphId_note')):
        echec(f'{isin} : graphId invalide ou null sans note ({g!r})')
    x = u.get('xid', 'ABSENT')
    if x == 'ABSENT' or (x is not None and not re.fullmatch(r'\d+', str(x))) or (x is None and not u.get('xid_note')):
        echec(f'{isin} : xid invalide ou null sans note ({x!r})')
    s = u.get('srri', 'ABSENT')
    if s == 'ABSENT' or (s is not None and (not isinstance(s, int) or not 1 <= s <= 7)) or (s is None and not u.get('srri_note')):
        echec(f'{isin} : srri invalide ou null sans note ({s!r})')
    st = u.get('strategie', 'ABSENT')
    if st == 'ABSENT' or (st is not None and len(str(st)) < 40) or (st is None and not u.get('strategie_note')):
        echec(f'{isin} : strategie invalide ou null sans note')
    e = u.get('equity')
    if not isinstance(e, int) or not 0 <= e <= 100:
        echec(f'{isin} : equity amorce invalide ({e!r})')

for cle in ('isin', 'graphId'):
    vals = [u[cle] for u in ucs if u.get(cle)]
    doublons = [v for v, n in collections.Counter(vals).items() if n > 1]
    if doublons:
        echec(f'doublons {cle} : {doublons}')

for isin, attendu in GRAPH_EXISTANTS.items():
    u = next((x for x in ucs if x['isin'] == isin), None)
    if not u or u.get('graphId') != attendu:
        echec(f'{isin} : graphId {u.get("graphId") if u else "ABSENT"!r} ≠ production {attendu} (non-régression)')

resolus = sum(1 for u in ucs if u.get('graphId'))
srri_ok = sum(1 for u in ucs if u.get('srri') is not None)
print(f'C1 CONFORME : 56 UC, {resolus} graphId résolus, {srri_ok} SRI renseignés (null justifiés pour le reste).')
sys.exit(0)
