import { Button, Modal, ModalHeader, ModalBody, ModalFooter, TextInput } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import useExportButtons, { ExportButtonsProps } from "../../hooks/useExportButtons";


export default function ExportButtons({ activeTab }: ExportButtonsProps) {
  
  const { t } = useTranslation();
  const {
    handlePrint,
    handlePDF,
    pdfLoading,
    handleCSV,
    handleHTML,
    saveModal,
    setSaveModal,
    confirmSave,
  } = useExportButtons(activeTab)

  return (
    <>
      <div className="flex gap-2 no-print">
        <Button size="xs" color="light" onClick={handlePrint}>🖨 {t('common.print')}</Button>
        <Button size="xs" color="blue" onClick={handlePDF} disabled={pdfLoading}>{t('results.pdf')}</Button>
        <Button size="xs" color="blue" onClick={handleCSV}>{t('results.csv')}</Button>
        <Button size="xs" color="light" onClick={handleHTML}>{t('results.html')}</Button>
      </div>
      <Modal show={saveModal?.open ?? false} onClose={() => setSaveModal(null)} size="md">
        <ModalHeader>{t('results.saveAs')}</ModalHeader>
        <ModalBody>
          <TextInput
            value={saveModal?.filename ?? ''}
            onChange={(e) => setSaveModal(prev => prev ? { ...prev, filename: e.target.value } : null)}
          />
        </ModalBody>
        <ModalFooter>
          <Button size="sm" color="light" onClick={() => setSaveModal(null)}>{t('common.cancel')}</Button>
          <Button size="sm" onClick={confirmSave}>{t('results.save')}</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
