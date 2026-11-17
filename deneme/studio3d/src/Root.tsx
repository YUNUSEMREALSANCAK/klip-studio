import {Composition, Still} from 'remotion';
import {FPS, HEIGHT, WIDTH} from './kit/theme';
import {B} from './kit2d/brand';
import {FitiOyuncakAvatar, FitiOyuncakTamBoy} from './oyuncak/ToyStudio';
import {Cover as InternetCover} from './reels/internet/Cover';
import {Reel as InternetReel, type ReelProps} from './reels/internet/Reel';
import {TOTAL_FRAMES as INTERNET_FRAMES} from './reels/internet/timeline';
import {Cover as YapayZekaCover} from './reels/yapayzeka/Cover';
import {Reel as YapayZekaReel, type ReelProps as YapayZekaProps} from './reels/yapayzeka/Reel';
import {TOTAL_FRAMES as YAPAYZEKA_FRAMES} from './reels/yapayzeka/timeline';
import {Cover as TokenCover} from './reels/token/Cover';
import {Reel as TokenReel, type ReelProps as TokenProps} from './reels/token/Reel';
import {TOTAL_FRAMES as TOKEN_FRAMES} from './reels/token/timeline';
import {Cover as VibecodeCover} from './reels/vibecode/Cover';
import {Reel as VibecodeReel, type ReelProps as VibecodeProps} from './reels/vibecode/Reel';
import {TOTAL_FRAMES as VIBECODE_FRAMES} from './reels/vibecode/timeline';

/* Her reel kendi klasöründe (src/reels/<ad>); burada kompozisyon olarak kaydedilir. */

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="InternetReel"
        component={InternetReel}
        durationInFrames={INTERNET_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{mode: 'full'} as ReelProps}
      />
      <Still id="InternetKapak" component={InternetCover} width={WIDTH} height={HEIGHT} />
      <Composition
        id="YapayZekaReel"
        component={YapayZekaReel}
        durationInFrames={YAPAYZEKA_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{mode: 'full'} as YapayZekaProps}
      />
      <Still id="YapayZekaKapak" component={YapayZekaCover} width={WIDTH} height={HEIGHT} />
      <Composition
        id="TokenReel"
        component={TokenReel}
        durationInFrames={TOKEN_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{mode: 'full'} as TokenProps}
      />
      <Still id="TokenKapak" component={TokenCover} width={WIDTH} height={HEIGHT} />
      <Composition
        id="VibecodeReel"
        component={VibecodeReel}
        durationInFrames={VIBECODE_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{mode: 'full'} as VibecodeProps}
      />
      <Still id="VibecodeKapak" component={VibecodeCover} width={WIDTH} height={HEIGHT} />
      <Still id="FitiOyuncakAvatar" component={FitiOyuncakAvatar} width={1080} height={1080} defaultProps={{bg: B.lemon}} />
      <Still id="FitiOyuncakTamBoy" component={FitiOyuncakTamBoy} width={1080} height={1350} defaultProps={{bg: B.paper}} />
    </>
  );
};
