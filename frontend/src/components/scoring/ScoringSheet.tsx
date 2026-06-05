import type { Stage } from '../../types/stage';
import type { ScoreInput } from '../../types/scoring';
import IPSCScoringSheet from './sheets/IPSCScoringSheet';
import IDPAScoringSheet from './sheets/IDPAScoringSheet';
import ActionSteelScoringSheet from './sheets/ActionSteelScoringSheet';
import MultiGunScoringSheet from './sheets/MultiGunScoringSheet';
import RingScoringSheet from './sheets/RingScoringSheet';
import HitCountScoringSheet from './sheets/HitCountScoringSheet';

interface Props {
  stage: Stage;
  score: ScoreInput;
  /** @deprecated Shooter is now read from the store directly in each sheet */
  shooter?: any;
}

export default function ScoringSheet({ stage, score }: Props) {
  const scoringType = stage.scoring_type;
  const config = stage.config || {};

  // All sheets read shooter from the store directly (principle: no prop drilling)
  const sheetProps = { stage, score };

  switch (scoringType) {
    case 'idpa':
      return <IDPAScoringSheet {...sheetProps} />;

    case 'action_steel':
      return <ActionSteelScoringSheet {...sheetProps} />;

    case 'multi_gun':
      return <MultiGunScoringSheet {...sheetProps} />;

    case 'bullseye':
    case 'archery':
      return <RingScoringSheet {...sheetProps} />;

    case 'long_range':
      if (config.variant === 'f_class') {
        return <RingScoringSheet {...sheetProps} />;
      }
      return <HitCountScoringSheet {...sheetProps} />;

    case 'nrl22':
      return <HitCountScoringSheet {...sheetProps} />;

    // comstock, virginia, fixed_time, hit_factor, chrono — all use IPSC sheet
    default:
      return <IPSCScoringSheet {...sheetProps} />;
  }
}