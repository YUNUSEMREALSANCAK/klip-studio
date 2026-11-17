"""Cue sayfasına elle düzeltmeler (from_cues her çalıştığında sıfırlar, bu yüzden betikte)."""
import json, sys
p = sys.argv[1]
c = json.load(open(p))
# Konuşmanın üstüne çıkan anlar (1. tur eleştirisi)
EXTRA = {19.09: 6, 4.41: -2, 8.58: -6, 12.6: -7, 37.54: -12, 40.57: -4}
# Küçük sesler elle dağıtıldı (kütüphanede az pop var): her kayıt en fazla 2 kez
PIN = {0.2: 47, 0.62: 32, 0.67: 50, 3.66: 28, 3.95: 41, 4.41: 53, 10.48: 45, 14.61: 28, 16.82: 42, 19.75: 47,
       22.0: 52, 24.56: 50, 26.52: 53, 27.05: 42, 27.8: 30, 29.94: 45, 32.05: 51, 34.02: 35, 34.42: 43,
       36.3: 32, 40.42: 30, 42.69: 35, 44.66: 52, 45.34: 43}
for x in c['cues']:
    for t, sound in PIN.items():
        if abs(x['t'] - t) < 0.03 and x.get('label', '').split()[0] in ('pop', 'thump', 'ui'):
            for key in ('pick', 'file', 'slice'):
                x.pop(key, None)
            x['id'] = sound
    kind = x.get('label', '').split()[0]
    if kind == 'thump':
        x['lowpass'] = 1800
        x['gain_db'] = min(x.get('gain_db', 0), -2)
    if kind == 'hit':
        x['highpass'] = 200
        x['gain_db'] = x.get('gain_db', 0) - 4
    if kind in ('wipe', 'whoosh', 'paper'):
        x['lowpass'] = min(x.get('lowpass', 5500), 5500)
    if kind in ('key', 'data'):
        x['gain_db'] = x.get('gain_db', 0) + 5
    for t, db in EXTRA.items():
        if abs(x['t'] - t) < 0.03:
            x['gain_db'] = x.get('gain_db', 0) + db
json.dump(c, open(p, 'w'), ensure_ascii=False, indent=1)
