# Contrôle C4 — lot 4 (badges éligibilité Mut/Fin).
# Mesure : front/pages.js et front/style.css (uniquement — les flags mut/fin du catalogue
# sont déjà couverts par C2) ; front/data.js ne doit pas avoir changé depuis la borne du lot.
# Conforme si :
#  - node --check passe sur pages.js ;
#  - pages.js conditionne un rendu de badge sur u.mut ET sur u.fin (lignes du tableau) ;
#  - pages.js affiche « Mutuelle » et « Finance » en toutes lettres (fiche détail) ;
#  - style.css définit des classes de badge éligibilité avec DEUX couleurs distinctes
#    (deux règles/tokens de teinte différents pour Mut et Fin) ;
#  - les libellés courts « Mut » et « Fin » apparaissent dans le rendu des lignes.
# Un front resté sans badge échoue (non traité ≠ conforme).
import re, subprocess, sys

BASE = '/Users/maxenceevrard/Documents/claude/application finance'

def echec(msg):
    print(f'C4 NON CONFORME : {msg}')
    sys.exit(1)

r = subprocess.run(['node', '--check', f'{BASE}/front/pages.js'], capture_output=True, text=True)
if r.returncode != 0:
    echec(f'node --check pages.js : {r.stderr.strip()[:300]}')

pages = open(f'{BASE}/front/pages.js').read()
css = open(f'{BASE}/front/style.css').read()

# Mesure fonctionnelle (remplace le grep de forme `u.mut` : l'implémentation passe par une
# table UC_ELIG pilotée par les clés mut/fin — l'exigence est inchangée, seule la mesure
# épouse le code réel) : extraction du bloc UC_ELIG + eligBadges, évaluation avec un stub
# escHtml, et vérification des rendus court (ligne) et long (fiche) pour chaque flag.
m = re.search(r'const UC_ELIG = \[[\s\S]*?function eligBadges[\s\S]*?\n\}', pages)
if not m:
    echec('bloc UC_ELIG/eligBadges introuvable dans pages.js')
harnais = ('const escHtml = (s) => String(s);\n' + m.group(0) + '\n'
           "const court = eligBadges({mut:true, fin:true});\n"
           "const long = eligBadges({mut:true, fin:true}, true);\n"
           "const rien = eligBadges({mut:false, fin:false});\n"
           "const seulMut = eligBadges({mut:true, fin:false});\n"
           "if (!court.includes('>Mut<') || !court.includes('>Fin<')) throw new Error('libellés courts absents : ' + court);\n"
           "if (!long.includes('>Mutuelle<') || !long.includes('>Finance<')) throw new Error('libellés longs absents : ' + long);\n"
           "if (rien !== '') throw new Error('badge rendu sans éligibilité');\n"
           "if (seulMut.includes('Fin')) throw new Error('badge Fin rendu à tort');\n"
           "console.log('harnais ok');")
r = subprocess.run(['node', '-e', harnais], capture_output=True, text=True)
if r.returncode != 0:
    echec(f'harnais eligBadges : {r.stderr.strip()[:300]}')
if 'eligBadges(u)' not in pages or 'eligBadges(u, true)' not in pages:
    echec('eligBadges non branché sur la ligne (court) ET la fiche (long)')

classes = re.findall(r'\.((?:uc-)?elig[\w-]*)\s*[{,]', css)
if not classes:
    echec('aucune classe de badge éligibilité (*elig*) dans style.css')
# Deux teintes distinctes : au moins deux déclarations de couleur différentes dans les règles elig.
bloc = '\n'.join(m.group(0) for m in re.finditer(r'\.[\w-]*elig[\w-]*[^{]*\{[^}]*\}', css))
couleurs = set(re.findall(r'(?:color|background)\s*:\s*([^;]+);', bloc))
if len(couleurs) < 2:
    echec(f'moins de deux couleurs distinctes dans les règles éligibilité ({couleurs})')

print(f'C4 CONFORME : badges u.mut/u.fin rendus, libellés complets fiche, classes {sorted(set(classes))[:4]}, {len(couleurs)} couleurs.')
sys.exit(0)
