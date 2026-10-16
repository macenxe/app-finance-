# Lot 1 — retrait complet des 4 UC (D2) : 5 listes sources, 3 JSON générés, 7 fichiers par fonds.
import json, re, subprocess
RETRAITS = {'FR0010479931': '0P000018ZI', 'LU1103305709': '0P000172SH', 'LU1752460292': '0P0001EITS', 'FR001400U512': '0P0001UVBG'}
NOMS_FLUX = {'EdR India', 'EdR Fund US Value', 'ODDO BHF Sustainable Credit Opportunities', 'Conservateur Investissement Proximité'}
lire = lambda f: open(f, encoding='utf-8').read()
ecrire = lambda f, s: open(f, 'w', encoding='utf-8').write(s)

for f in ('front/data.js', 'back/src/fonds-meta.ts', 'back/src/uc-history.ts', 'back/src/uc-managers.ts'):
    garde, sauter = [], False
    for l in lire(f).split('\n'):
        if sauter and l.startswith('    strategie:'): sauter = False; continue
        sauter = False
        if any(i in l for i in RETRAITS): sauter = f == 'front/data.js'; continue
        garde.append(l)
    ecrire(f, '\n'.join(garde))

# news.ts : seules les lignes de FLUX_UC_FONDS portant un nom retiré sont recomposées.
s = lire('back/src/news.ts')
m = re.search(r'(const FLUX_UC_FONDS = \[\n)([\s\S]*?)(\n\];)', s)
lignes = []
for l in m.group(2).split('\n'):
    noms = re.findall(r"'[^']+'", l)
    if any(n.strip("'") in NOMS_FLUX for n in noms):
        noms = [n for n in noms if n.strip("'") not in NOMS_FLUX]
        if not noms: continue
        l = '  ' + ', '.join(noms) + ','
    lignes.append(l)
ecrire('back/src/news.ts', s[:m.start(2)] + '\n'.join(lignes) + s[m.end(2):])

for f, par_isin in (('front/data/fonds-meta.json', True), ('front/data/uc-managers.json', True), ('front/data/uc-vl-hebdo.json', False)):
    brut = lire(f); d = json.loads(brut)
    for isin, gid in RETRAITS.items(): d['fonds'].pop(isin if par_isin else gid + '.F', None)
    txt = json.dumps(d, ensure_ascii=False, separators=(',', ':')) if '\n' not in brut.strip() else json.dumps(d, ensure_ascii=False, indent=1)
    ecrire(f, txt + ('\n' if brut.endswith('\n') else ''))

a_supprimer = [f'front/data/history/uc/{g}.F.json' for g in RETRAITS.values()] + \
              [f'front/data/uc-compo/{i}.json' for i in RETRAITS if subprocess.run(['git', 'ls-files', '--error-unmatch', f'front/data/uc-compo/{i}.json'], capture_output=True).returncode == 0]
subprocess.run(['git', 'rm', '-q', *a_supprimer], check=True)
print('supprimés :', a_supprimer)
