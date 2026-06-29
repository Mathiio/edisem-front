import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FilterPopup, { FilterGroup } from './FilterPopup';
import { Button, Divider } from '@heroui/react';
import { SearchIcon, ImportIcon, NewItemIcon, AssociateIcon, ExportIcon, EditIcon, AnnotateIcon } from '@/components/ui/icons';
import { IconSvgProps } from '@/types/ui';
import { GeneratedImage } from '@/pages/visualisation/types';
import { ExportPopup } from './ExportPopup';
import ImportPopup from './ImportPopup';
import LinkPopup from './LinkPopup';
import AnnotatePopup from './AnnotatePopup';
import AddPopup from './AddPopup';

interface ItemsProps {
  onSearch: (typesearch: FilterGroup[], isAdvancedSearch: boolean) => void;
  handleExportClick: () => Promise<GeneratedImage>;
  generatedImage: GeneratedImage | null;
  resetActiveIconRef?: (resetFunc: () => void) => void;
  onSelect: (groups: FilterGroup[]) => void;
  exportEnabled: boolean;

  // États contrôlés par le parent
  isEditMode: boolean;
  isLinkMode: boolean;
  isAddMode: boolean;
  isAnnoteMode: boolean;

  firstSelectedNode: any;
  secondSelectedNode: any;
  onConnect: () => void;
  onCancel: () => void;

  // Handlers pour modifier les états dans le parent
  onEditToggle: (isActive: boolean) => void;
  onLinkToggle: (isActive: boolean) => void;
  onAddToggle: (isActive: boolean) => void;
  onAnnoteToggle: (isActive: boolean) => void;

  onViewToggle: (isActive: boolean) => void;
  onCreateItem: (typeNumber: number, config: string) => void;
}

export const Toolbar: React.FC<ItemsProps> = ({
  onSearch,
  resetActiveIconRef,
  generatedImage,
  handleExportClick,
  onSelect,
  exportEnabled,

  // États contrôlés par le parent
  isEditMode,
  isLinkMode,
  isAddMode,
  isAnnoteMode,

  firstSelectedNode,
  secondSelectedNode,
  onConnect,
  onCancel,
  // Handlers pour modifier les états
  onEditToggle,
  onLinkToggle,
  onAddToggle,
  onAnnoteToggle,

  onViewToggle,
  onCreateItem,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeIcon, setActiveIcon] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const iconRefs = useRef<Record<string, HTMLElement | null>>({});

  // Fonction pour réinitialiser l'icône active
  const handleResetActiveIcon = useCallback(() => {
    setActiveIcon(null);
  }, []);

  // Exposer la fonction via la ref
  useEffect(() => {
    if (resetActiveIconRef) {
      resetActiveIconRef(handleResetActiveIcon);
    }
  }, [resetActiveIconRef, handleResetActiveIcon]);

  useEffect(() => {
    if (!activeIcon) return;

    // N'appliquez cette logique que pour les icônes qui ouvrent des popups
    if (['filter', 'import', 'export', 'link', 'annotate', 'add'].includes(activeIcon)) {
      const handleClickOutside = (event: MouseEvent) => {
        // Check if click is inside toolbar or popup
        const isToolbarClick = containerRef.current?.contains(event.target as Node);
        const isPopupClick = popupRef.current?.contains(event.target as Node);

        if (!isToolbarClick && isPopupClick) {
          setActiveIcon(null);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeIcon]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.offsetWidth);
    const ro = new ResizeObserver(() => setContainerWidth(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleAdvancedSearch = async (typesearch: FilterGroup[]) => {
    onSearch(typesearch, true);
  };

  // Fermer popup quand edit, link ou add mode est activé
  useEffect(() => {
    if (isEditMode) {
      setActiveIcon(null);
    }
  }, [isEditMode]);

  useEffect(() => {
    // Show popup when an icon is active that has a popup
    setShowPopup(!!activeIcon && ['filter', 'import', 'export', 'link', 'annotate', 'add'].includes(activeIcon));
  }, [activeIcon]);

  const getActivePopup = () => {
    switch (activeIcon) {
      case 'filter':
        return <FilterPopup onSearch={handleAdvancedSearch} />;
      case 'import':
        return <ImportPopup onSelect={onSelect} />;
      case 'link':
        return <LinkPopup firstSelectedNode={firstSelectedNode} secondSelectedNode={secondSelectedNode} onConnect={onConnect} onCancel={onCancel} />;
      case 'annotate':
        return <AnnotatePopup onViewToggle={onViewToggle} />;
      case 'add':
        return <AddPopup onCreateItem={onCreateItem} />;
      case 'export':
        return <ExportPopup generatedImage={generatedImage} handleExportClick={handleExportClick} exportEnabled={exportEnabled} />;
      default:
        return null;
    }
  };

  const renderButton = (key: string, IconComponent: React.FC<IconSvgProps>) => {
    // Déterminer si ce bouton est actif (soit via activeIcon, soit via son mode spécifique)
    const isActive = activeIcon === key || (key === 'edit' && isEditMode) || (key === 'link' && isLinkMode) || (key === 'add' && isAddMode) || (key === 'annotate' && isAnnoteMode);

    // Déterminer la couleur de fond en fonction du bouton actif
    const getBackgroundColor = () => {
      if (!isActive) return 'bg-transparent';
      if (key === 'edit') return 'bg-datavisOrange';
      if (key === 'link') return 'bg-datavisBlue';
      if (key === 'add') return 'bg-datavisGreen';
      if (key === 'annotate') return 'bg-datavisYellow';
      return 'bg-action'; // Pour les autres boutons (filter, import, export)
    };

    return (
      <Button
        key={key}
        ref={(el: HTMLElement | null) => {
          iconRefs.current[key] = el;
        }}
        className={`cursor-pointer group text-base p-2.5 rounded-lg h-11 w-11 ${
          isActive ? `text-selected ${getBackgroundColor()}` : 'text-c6 bg-transparent hover:bg-c3 hover:text-selected'
        } transition-all ease-in-out duration-200`}
        onPress={() => {
          // Logique spéciale pour les modes toggle
          if (key === 'edit') {
            setActiveIcon(null);
            onEditToggle(!isEditMode);
            if (!isEditMode) {
              onLinkToggle(false);
              onAddToggle(false);
              onAnnoteToggle(false);
            }
            return;
          }

          if (key === 'link' || key === 'add' || key === 'annotate') {
            // Si le mode est déjà actif, on le désactive
            if ((key === 'link' && isLinkMode) || (key === 'add' && isAddMode) || (key === 'annotate' && isAnnoteMode)) {
              setActiveIcon(null);
              if (key === 'link') onLinkToggle(false);
              if (key === 'add') onAddToggle(false);
              if (key === 'annotate') onAnnoteToggle(false);
            } else {
              // Sinon, on active le mode et on set l'activeIcon
              setActiveIcon(key);
              if (key === 'link') onLinkToggle(true);
              if (key === 'add') onAddToggle(true);
              if (key === 'annotate') onAnnoteToggle(true);

              // Désactiver les autres modes
              if (key !== 'link') onLinkToggle(false);
              if (key !== 'add') onAddToggle(false);
              if (key !== 'annotate') onAnnoteToggle(false);
              onEditToggle(false);
            }
            return;
          }

          // Pour les autres boutons (filter, import, export)
          if (isEditMode || isLinkMode || isAddMode || isAnnoteMode) {
            onEditToggle(false);
            onLinkToggle(false);
            onAddToggle(false);
            onAnnoteToggle(false);
          }

          setActiveIcon((prev) => (prev === key ? null : key));
        }}>
        <IconComponent className={`${isActive ? 'text-selected' : 'text-c6 hover:text-c6'} transition-all ease-in-out duration-200`} size={18} />
      </Button>
    );
  };

  return (
    <div className='w-full p-4 gap-2 flex flex-col justify-center items-center'>
      <AnimatePresence mode='popLayout'>
        {showPopup && (
          <motion.div
            ref={popupRef}
            key={activeIcon}
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            className={`flex bg-c2/50 p-4 rounded-xl shadow-lg ${
              activeIcon === 'add'
                ? 'h-fit border-2 border-datavisGreen'
                : activeIcon === 'annotate'
                  ? 'h-fit border-2 border-datavisYellow'
                  : activeIcon === 'link'
                    ? 'h-fit border-2 border-datavisBlue'
                    : 'h-96'
            }`}
            style={{
              width: `${containerWidth}px`,
              backdropFilter: 'blur(50px) saturate(3)',
              WebkitBackdropFilter: 'blur(50px) brightness(1.5) saturate(3)',
            }}>
            {getActivePopup()}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`relative w-auto flex items-center rounded-xl p-2 bg-c2 gap-4 shadow-lg transition-all duration-500 ${
          isEditMode
            ? 'border-2 border-datavisOrange'
            : isLinkMode
              ? 'border-2 border-datavisBlue'
              : isAddMode
                ? 'border-2 border-datavisGreen'
                : isAnnoteMode
                  ? 'border-2 border-datavisYellow'
                  : 'border-2 border-transparent'
        }`}
        ref={containerRef}
        style={{
          backdropFilter: 'blur(50px) brightness(1.5) saturate(3)',
          WebkitBackdropFilter: 'blur(50px) brightness(1.5) saturate(3)',
        }}>
        {renderButton('filter', SearchIcon)}
        <Divider orientation='vertical' className='h-4 w-0.5 bg-c4 mx-4' />
        {renderButton('add', NewItemIcon)}
        {renderButton('link', AssociateIcon)}
        {renderButton('edit', EditIcon)}
        {renderButton('annotate', AnnotateIcon)}
        <Divider orientation='vertical' className='h-4 w-0.5 bg-c4 mx-4' />
        {renderButton('import', ImportIcon)}
        {renderButton('export', ExportIcon)}
      </div>
    </div>
  );
};
