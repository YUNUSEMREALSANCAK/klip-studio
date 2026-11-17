"""Cue sayfasına elle düzeltmeler (from_cues her çalıştığında sıfırlar, bu yüzden betikte)."""
import json, sys
p = sys.argv[1]
c = json.load(open(p))
# Konuşmanın üstüne çıkan geçişler (2. tur eleştirisi)
EXTRA = {26.0: -9, 49.79: 5, 34.88: -4, 58.0: -9, 34.0: -12, 51.83: -9, 16.64: -5, 15.35: -2, 41.56: 4, 19.95: 6, 45.2: 4}
# Küçük sesler elle dağıtıldı: kütüphanede 6 pop + 10 arayüz sesi var; her kayıt en fazla 2 kez (5. tur)
PIN = {0.42: 47, 38.19: 47, 0.67: 50, 63.72: 50, 14.86: 52, 4.23: 28, 59.59: 28, 12.09: 42, 47.43: 42,
       13.13: 45, 29.06: 45, 14.39: 43, 60.88: 43, 23.48: 53, 53.2: 53, 24.31: 51, 64.4: 54, 36.11: 30,
       28.05: 35, 62.15: 32, 24.81: 41}
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
# 22,15 geçişi konuşmaya (22,44) taşmasın: öne al, kısalt. 35,3 sayacı: kısık kayıt yerine başka arayüz sesi.
for x in c['cues']:
    if abs(x['t'] - 26.0) < 0.03:
        x['t'] = 25.82
        x['fit_dur'] = 0.4
    # Konuşmaya taşan iki an: kısaltılır (yeni zamanlamada seçilen kayıtlar uzun)
    if abs(x['t'] - 34.0) < 0.03:
        x['fit_dur'] = 0.4
    if abs(x['t'] - 51.83) < 0.03:
        x['t'] = 51.75
        x['fit_dur'] = 0.35
    if abs(x['t'] - 41.56) < 0.03:
        for key in ('pick', 'file', 'slice'):
            x.pop(key, None)
        x['id'] = 35
# Kapanışta logo pop'u inişle üst üste (180 ms): çıkar
c['cues'] = [x for x in c['cues'] if not (abs(x['t'] - 63.9) < 0.03 and x.get('label', '').startswith('pop'))]
json.dump(c, open(p, 'w'), ensure_ascii=False, indent=1)
