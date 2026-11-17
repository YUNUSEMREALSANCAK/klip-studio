#!/usr/bin/env bash
# 05 reels ses tasarımı: olay listesi → cue → düzeltmeler → karışım → eleştiri. Kullanım: build.sh <tur>
set -euo pipefail
export PATH="$(brew --prefix ffmpeg-full)/bin:$PATH"
D=/Users/yunusemre/Desktop/Fityazilim_Instagram/reels/05_Reels_tokenlari_paraya_cevirmek/ses_tasarimi
V=/Users/yunusemre/Desktop/side_project/deneme/studio3d/out/token/TokenReel_seslendirme.mp4
EV=/Users/yunusemre/Desktop/side_project/deneme/studio3d/src/reels/token/ses/events.json
cd ~/.claude/skills/real-sfx
python3 scripts/from_cues.py "$EV" --video "$V" --out "$D/work/cues.json" --ui library --tone heavy --no-check \
  --kind coin=chime --kind thump=role:pop,max_dur=0.5 --kind hit=role:hit,max_dur=1.5 \
  --kind paper=role:whoosh,max_dur=0.5,dark=true --kind ui=role:ui,max_dur=0.4 | grep -E "routed|NOT|declared"
python3 "$D/work/duzelt.py" "$D/work/cues.json"
python3 scripts/mix.py "$D/work/cues.json" --out "$D/result/film_sfx.mp4" --voice-safe --voice-depth light --target-lufs -14 | grep -E "WARN|loudness"
python3 scripts/critique.py "$D/result/film_sfx_resolved_cues.json" "$D/result/film_sfx_sfx_track.wav" --rounds "$1" --out "$D/result/critique.md" --append | sed -n '/| axis/,/^Listen to/p'
