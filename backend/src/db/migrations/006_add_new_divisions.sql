-- Migration 006: Add new divisions (IPSC Optics, USPSA Limited/Carry Optics/Single Stack/Limited Optics)

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
    'conventional', 'international'
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
    'conventional', 'international'
  ));