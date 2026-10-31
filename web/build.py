import sys
shell=open('src/shell.html').read()
sim=open('src/sim.js').read(); ui=open('src/ui.js').read()
out=shell.replace('/*__SIM__*/',sim).replace('/*__UI__*/',ui)
open('dist/index.html','w').write(out)
print(len(out))
