import { useState, useEffect, useMemo } from 'react';
import { Modal, ModalHeader, ModalBody } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { getVisibleHelpSections, type HelpSection } from '../../config/helpSections';
import HelpSidebar from './HelpSidebar';
import HelpContent from './HelpContent';
import { useEscClose } from '../../hooks/useEscClose';

interface HelpModalProps {
  show: boolean;
  onClose: () => void;
}

const FIRST_SECTION_ID = 'overview';

export default function HelpModal({ show, onClose }: HelpModalProps) {
  const { t } = useTranslation();
  const isAdmin = useAuthStore((s) => s.isAdmin);

  const sections = useMemo<HelpSection[]>(
    () => getVisibleHelpSections(isAdmin),
    [isAdmin],
  );

  const [activeId, setActiveId] = useState<string>(FIRST_SECTION_ID);

  // Reset to first section whenever the visible set changes (e.g. role switch)
  useEffect(() => {
    if (!sections.find((s) => s.id === activeId)) {
      setActiveId(sections[0]?.id ?? FIRST_SECTION_ID);
    }
  }, [sections, activeId]);

  const activeSection = sections.find((s) => s.id === activeId) ?? sections[0];

  useEscClose(() => {
    if (show) onClose();
  });

  return (
    <Modal show={show} onClose={onClose} size="7xl" dismissible>
      <ModalHeader>{t('help.title')}</ModalHeader>
      <ModalBody>
        <div className="flex flex-col sm:flex-row gap-0 sm:gap-4 -mx-2 sm:-mx-0">
          <HelpSidebar
            sections={sections}
            activeId={activeSection?.id ?? FIRST_SECTION_ID}
            onSelect={(id) => setActiveId(id)}
          />
          <div className="flex-1 min-w-0 sm:max-h-[70vh] sm:overflow-y-auto">
            {activeSection && <HelpContent key={activeSection.id} section={activeSection} />}
          </div>
        </div>
        {!isAdmin && (
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-2">
            {t('help.adminOnly')}
          </p>
        )}
      </ModalBody>
    </Modal>
  );
}
