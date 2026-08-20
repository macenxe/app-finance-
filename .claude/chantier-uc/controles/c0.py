# Contrôle C0 — lot 0 (référentiel brut).
# Mesure : .claude/chantier-uc/referentiel.json (uniquement).
# Mis à jour au titre de la décision D7 (journal des décisions) : les deux ISIN « FF » du
# fichier sont deux FONDS distincts (LU0528228074 = FF Global Demographics A-Acc-EUR hedged,
# libellé erroné dans l'Excel ; LU1892829828 = FF Water & Waste A-Acc) — pas un doublon.
# Les deux entrent : 56 entrées attendues (Actions 34), plus d'exclusion FF.
# Conforme si : 56 entrées ; comptes par section = fichier (Actions 34, Obligations 5,
# Mixtes 14, Monétaires 3) ; mutuelle/cto ∈ {Ouvert, Non éligible} partout ; 0 doublon ISIN ;
# meta.ff_note documente la résolution du faux doublon. Un référentiel absent échoue.
import json, sys, collections

CHEMIN = '/Users/maxenceevrard/Documents/claude/application finance/.claude/chantier-uc/referentiel.json'
ATTENDU = {'Actions': 34, 'Obligations': 5, 'Mixtes': 14, 'Monétaires': 3}

def echec(msg):
    print(f'C0 NON CONFORME : {msg}')
    sys.exit(1)

try:
    doc = json.load(open(CHEMIN))
except Exception as e:
    echec(f'referentiel.json illisible ({e})')

ucs = doc.get('ucs')
if not isinstance(ucs, list) or len(ucs) != 56:
    echec(f'{len(ucs) if isinstance(ucs, list) else "aucune"} entrées, 56 attendues')

isins = [u.get('isin') for u in ucs]
doublons = [i for i, n in collections.Counter(isins).items() if n > 1]
if doublons:
    echec(f'ISIN en doublon : {doublons}')

sections = collections.Counter(u.get('section') for u in ucs)
if dict(sections) != ATTENDU:
    echec(f'comptes par section {dict(sections)} ≠ attendu {ATTENDU}')

for u in ucs:
    for champ in ('isin', 'libelle', 'societe', 'section', 'mutuelle', 'cto'):
        if not u.get(champ):
            echec(f'{u.get("isin", "?")} : champ {champ} vide')
    if u['mutuelle'] not in ('Ouvert', 'Non éligible') or u['cto'] not in ('Ouvert', 'Non éligible'):
        echec(f'{u["isin"]} : éligibilité hors domaine ({u["mutuelle"]!r}, {u["cto"]!r})')

if {'LU0528228074', 'LU1892829828'} - set(isins):
    echec('les deux ISIN FF (D7) doivent être présents')
if 'Demographics' not in next(u['libelle'] for u in ucs if u['isin'] == 'LU0528228074'):
    echec('libellé de LU0528228074 non corrigé (doit refléter Global Demographics, D7)')
if not doc.get('meta', {}).get('ff_note'):
    echec('meta.ff_note absent (résolution du faux doublon non documentée)')

print(f'C0 CONFORME : 56 UC, sections {dict(sections)}, faux doublon FF documenté.')
sys.exit(0)
