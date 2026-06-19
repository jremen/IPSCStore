-- Migration 016: Add IPSC Rifle and IPSC Shotgun divisions
-- Rifle (IPSC Rifle Rules Jan 2025): sa_standard, sa_open, mac, mab
-- Shotgun (IPSC Shotgun rules):    shotgun_open, shotgun_modified, shotgun_standard, shotgun_standard_manual

-- Expand division CHECK constraint on shooters
ALTER TABLE shooters DROP CONSTRAINT shooters_division_check;
ALTER TABLE shooters ADD CONSTRAINT shooters_division_check
  CHECK (division IN (
    'standard', 'open', 'production', 'production_optics', 'optics', 'classic', 'revolver', 'pcc_optics', 'pcc_iron',
    'limited', 'limited_optics', 'carry_optics', 'single_stack',
    'ssp', 'esp', 'cdp', 'ccp', 'bug', 'revolver_idpa',
    'tactical', 'open_3gun', 'heavy',
    'open_prs', 'production_prs',
    'any', 'irons', 'open_22',
    'conventional', 'international',
    'sa_standard', 'sa_open', 'mac', 'mab',
    'shotgun_open', 'shotgun_modified', 'shotgun_standard', 'shotgun_standard_manual'
  ));

-- Expand division CHECK constraint on match_registrations
ALTER TABLE match_registrations DROP CONSTRAINT match_registrations_division_check;
ALTER TABLE match_registrations ADD CONSTRAINT match_registrations_division_check
  CHECK (division IN (
    'standard', 'open', 'production', 'production_optics', 'optics', 'classic', 'revolver', 'pcc_optics', 'pcc_iron',
    'limited', 'limited_optics', 'carry_optics', 'single_stack',
    'ssp', 'esp', 'cdp', 'ccp', 'bug', 'revolver_idpa',
    'tactical', 'open_3gun', 'heavy',
    'open_prs', 'production_prs',
    'any', 'irons', 'open_22',
    'conventional', 'international',
    'sa_standard', 'sa_open', 'mac', 'mab',
    'shotgun_open', 'shotgun_modified', 'shotgun_standard', 'shotgun_standard_manual'
  ));
