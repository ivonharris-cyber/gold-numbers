import re, subprocess, json
env = open('/data/profiles/winston/.env').read()
m = re.search(r'^GITHUB_TOKEN=*** env, re.M)
tok = m.group(1).strip().strip('"').strip("'") if m else ''
print('token len:', len(tok))
def api(method, url, payload=None):
    cmd = ['curl','-s','-X',method,'-H','Authorization: Bearer '+tok,...ept: application/vnd.github+json',url]
    if payload is not None:
        cmd += ['-d', json.dumps(payload)]
    out = subprocess.run(cmd, capture_output=True, text=True).stdout
    try: return json.loads(out)
    except Exception: return {'raw': out[:300]}
u = api('GET','https://api.github.com/user')
print('user:', u.get('login') or u.get('message'))
r = api('POST','https://api.github.com/user/repos',{'name':'gold-numbers','description':'Thai lottery lucky numbers - entertainment only','private':False})
print('repo:', r.get('full_name') or r.get('errors') or r.get('message'))
