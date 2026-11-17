import React from 'react';
import {AbsoluteFill} from 'remotion';
import {B, pop} from '../../../kit2d/brand';
import {DotGrid, Sparkle, Stage} from '../../../kit2d/ui';
import {DETAY, SCENES, useSceneTime} from '../timeline';
import {Browser, Mark, SITE_GREEN} from './Browser';

/* 27,9–36,2 sn · "Uygulamanın hangi özelliklerini kolayca geliştirebileceğini, nerelerde zorlanacağını
   ve neden hâlâ o ürüne ihtiyaç duyabileceğini açıklıyor."
   CapCut sayfasında gezilir: "kolayca"da yapılabilir kısım yeşil, "zorlanacağını"da zor kısımlar turuncu,
   "ihtiyaç"ta "neden hâlâ ödüyorlar" ve kaybedilenler listesi sarı çerçevelenir. */

export const Detay: React.FC = () => {
  const t = useSceneTime('detay');
  return (
    <AbsoluteFill>
      <DotGrid bg={B.lemon} />
      <Browser
        t={t}
        enter={SCENES.detay[0] + 0.2}
        pages={[{at: 0, src: 'capcut_page.png', url: 'canivibecodeit.com/capcut'}]}
        views={[
          {t: 0, x: 0, y: 40, w: 800},
          {t: DETAY.kolayca - 0.45, x: 0, y: 380, w: 720, dur: 0.6},
          {t: DETAY.neden - 0.2, x: 0, y: 1290, w: 760, dur: 0.8},
        ]}
      >
        <Mark t={t} at={DETAY.kolayca + 0.05} to={DETAY.neden - 0.2} x={12} y={480} w={420} h={32} color={SITE_GREEN} />
        <Mark t={t} at={DETAY.zorlanacagini - 0.05} to={DETAY.neden - 0.2} x={12} y={424} w={540} h={42} color={B.orange} />
        <Mark t={t} at={DETAY.zorlanacagini + 0.15} to={DETAY.neden - 0.2} x={12} y={506} w={700} h={56} color={B.orange} />
        <Mark t={t} at={DETAY.ihtiyac - 0.1} x={10} y={1334} w={720} h={64} color={B.lemon} />
        <Mark t={t} at={DETAY.duyabilecegini} x={10} y={1436} w={300} h={232} color="#F2484B" />
      </Browser>
      <Stage>
        <Sparkle x={980} y={560} r={24} spin={t * 60} scale={pop(t, DETAY.kolayca + 0.1)} />
        <Sparkle x={70} y={1200} r={20} color={B.orange} spin={-t * 60} scale={pop(t, DETAY.zorlanacagini + 0.1)} />
      </Stage>
    </AbsoluteFill>
  );
};
