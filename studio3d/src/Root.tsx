import {Composition, Still} from 'remotion';
import {FPS, HEIGHT, WIDTH} from './kit/theme';
import {Cover as InternetCover} from './reels/internet/Cover';
import {Reel as InternetReel, type ReelProps} from './reels/internet/Reel';
import {TOTAL_FRAMES as INTERNET_FRAMES} from './reels/internet/timeline';

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
    </>
  );
};
