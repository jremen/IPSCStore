import type { Stage } from '../../types/stage';
import type { ScoreInput } from '../../types/scoring';
import IPSCSummary from './summary/IPSCSummary';
import IDPASummary from './summary/IDPASummary';
import ActionSteelSummary from './summary/ActionSteelSummary';
import MultiGunSummary from './summary/MultiGunSummary';
import RingSummary from './summary/RingSummary';
import HitCountSummary from './summary/HitCountSummary';

export interface ScoreSummarySheetProps {
  stage: Stage;
  score: ScoreInput;
  shooterName: string;
  shooterDetails?: { division: string; category: string; powerFactor: string };
  onBack: () => void;
  onApprove: () => void;
}

export default function ScoreSummarySheet(props: ScoreSummarySheetProps) {
  const { stage } = props;
  switch (stage.scoring_type) {
    case 'idpa': return <IDPASummary {...props} />;
    case 'action_steel': return <ActionSteelSummary {...props} />;
    case 'multi_gun': return <MultiGunSummary {...props} />;
    case 'bullseye':
    case 'archery':
    case 'issf':
      return <RingSummary {...props} />;
    case 'long_range':
      return (stage.config || {}).variant === 'f_class'
        ? <RingSummary {...props} />
        : <HitCountSummary {...props} />;
    case 'nrl22':
      return <HitCountSummary {...props} />;
    default:
      return <IPSCSummary {...props} />;
  }
}
