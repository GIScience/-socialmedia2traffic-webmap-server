import osgeo.ogr, os, json
import names
from random import choice, randint
from string import ascii_lowercase
from string import ascii_uppercase
import random
import string

exportDir = '/Users/zzz/exp/' # Export dir
regions_list = 'login_credential.json' # Export file name 

loginCred = []

TLDS = ('com net org mil edu de biz de ch at ru de tv com'
    'st br fr de nl dk ar jp eu it es com us ca pl').split()

for i in range(100):
    singleCred = {}
    singleCred['firstName'] = names.get_first_name()
    singleCred['lastName'] = names.get_last_name()
    user = ''.join(choice(ascii_lowercase) for i in range(12))
    host = ''.join(choice(ascii_lowercase) for i in range(5))
    singleCred['email'] = '%s@%s.%s' % (user, host, choice(TLDS))
    singleCred['apiToken'] = ''.join(random.choice(string.ascii_uppercase + string.digits) for _ in range(30))

    loginCred.append(singleCred)
    
f = open(os.path.join(exportDir, regions_list), "a")
f.write(json.dumps(loginCred))
f.close()