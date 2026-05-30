#!/usr/bin/env python3
"""Patch the frontend HTML to add multi-user registration modal and updated script"""
import os, glob

html_path = os.path.join(os.path.dirname(__file__), 'public', 'index.html')
with open(html_path, 'r') as f:
    c = f.read()

# Add welcome modal HTML before </body>
welcome_html = '''
<!-- WELCOME / REGISTER MODAL -->
<div id="welcomeModal" class="modal-overlay hidden modal-sm">
  <div class="modal-card">
    <div class="modal-head"><h3>👋 Bienvenido a Job Agent</h3><button class="close" onclick="continueAsGuest()">✕</button></div>
    <div class="modal-body">
      <p style="font-size:12px;color:var(--text-dim);margin-bottom:12px;line-height:1.5">Crea tu perfil para guardar tus datos en la nube. O continúa como invitado.</p>
      <label>Nombre completo</label>
      <input id="regName" placeholder="Tu nombre" />
      <label>Email</label>
      <input id="regEmail" placeholder="email@ejemplo.com" type="email" />
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-p" onclick="submitRegister()" style="flex:1;justify-content:center">🚀 Crear Perfil</button>
        <button class="btn btn-o" onclick="continueAsGuest()">Invitado</button>
      </div>
    </div>
  </div>
</div>
'''

if 'welcomeModal' not in c:
    body_tag = '</body>'
    c = c.replace(body_tag, welcome_html + '\n' + body_tag)
    print("Added welcome modal HTML")

# Now replace the script content
sp = c.find('<script>')
ep = c.find('</script>')
if sp == -1 or ep == -1:
    print("ERROR: No script tags found")
    exit(1)

# Read the new script from a separate file if it exists, otherwise build inline
script_file = os.path.join(os.path.dirname(__file__), '_new_script.js')
if os.path.exists(script_file):
    with open(script_file, 'r') as f:
        new_script = '<script>\n' + f.read() + '\n</script>'
    c = c[:sp] + new_script + c[ep+9:]
    print(f"Replaced script with content from {script_file}")
else:
    print("No _new_script.js found, checking if script already has profile features...")
    if 'profileId' in c[sp:ep]:
        print("Script already has profileId - checking further...")
        if 'ensureProfile' in c[sp:ep]:
            print("Script already has multi-user features - no changes needed")
        else:
            print("ProfileId present but no ensureProfile - partial update needed")
    else:
        print("Script needs multi-user update but no replacement script found")
        print("Creating _new_script.js template...")
        with open(script_file, 'w') as f:
            f.write("// Multi-user addition would go here")
        print("Template created at _new_script.js - please fill it in")

with open(html_path, 'w') as f:
    f.write(c)
print(f"Done. File: {len(c)} bytes")
