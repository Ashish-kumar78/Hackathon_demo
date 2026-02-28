import urllib.request as r
import urllib.error as e
try:
    print(r.urlopen('http://localhost:8000/api/market/quotes').read())
except e.HTTPError as err:
    print(err.read().decode())
