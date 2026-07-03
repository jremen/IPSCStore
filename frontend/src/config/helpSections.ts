export interface HelpSection {
  id: string;
  labelKey: string;
  markdown: string;
  adminOnly: boolean;
  order: number;
}

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'overview',
    labelKey: 'help.sections.overview',
    markdown: 'index.md',
    adminOnly: true,
    order: 1,
  },
  {
    id: 'matches',
    labelKey: 'help.sections.matches',
    markdown: 'matches.md',
    adminOnly: true,
    order: 2,
  },
  {
    id: 'stages',
    labelKey: 'help.sections.stages',
    markdown: 'stages.md',
    adminOnly: true,
    order: 3,
  },
  {
    id: 'scoring-overview',
    labelKey: 'help.sections.scoringOverview',
    markdown: 'scoring.md',
    adminOnly: false,
    order: 4,
  },
  {
    id: 'scoring-desktop',
    labelKey: 'help.sections.scoringDesktop',
    markdown: 'scoring-desktop.md',
    adminOnly: false,
    order: 5,
  },
  {
    id: 'scoring-mobile',
    labelKey: 'help.sections.scoringMobile',
    markdown: 'scoring-mobile.md',
    adminOnly: false,
    order: 6,
  },
  {
    id: 'registration',
    labelKey: 'help.sections.registration',
    markdown: 'registration.md',
    adminOnly: true,
    order: 7,
  },
  {
    id: 'squadding',
    labelKey: 'help.sections.squadding',
    markdown: 'squadding.md',
    adminOnly: true,
    order: 8,
  },
  {
    id: 'dq',
    labelKey: 'help.sections.dq',
    markdown: 'dq.md',
    adminOnly: true,
    order: 9,
  },
  {
    id: 'results',
    labelKey: 'help.sections.results',
    markdown: 'results.md',
    adminOnly: true,
    order: 10,
  },
  {
    id: 'output',
    labelKey: 'help.sections.output',
    markdown: 'output.md',
    adminOnly: true,
    order: 11,
  },
  {
    id: 'settings',
    labelKey: 'help.sections.settings',
    markdown: 'settings.md',
    adminOnly: true,
    order: 12,
  },
  {
    id: 'database',
    labelKey: 'help.sections.database',
    markdown: 'database.md',
    adminOnly: true,
    order: 13,
  },
  {
    id: 'qr-codes',
    labelKey: 'help.sections.qrCodes',
    markdown: 'qr-codes.md',
    adminOnly: true,
    order: 14,
  },
  {
    id: 'audit',
    labelKey: 'help.sections.audit',
    markdown: 'audit.md',
    adminOnly: true,
    order: 15,
  },
];

export function getVisibleHelpSections(isAdmin: boolean): HelpSection[] {
  return HELP_SECTIONS.filter((s) => isAdmin || !s.adminOnly).sort(
    (a, b) => a.order - b.order,
  );
}
