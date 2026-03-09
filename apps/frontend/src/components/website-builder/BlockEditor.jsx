import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Eye, EyeOff, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import BlockRenderer from './BlockRenderer';
import BlockToolbar from './BlockToolbar';
import BlockSettings from './BlockSettings';
import { blockTypes, blockCategories } from './blocks';
import { createBlock } from '@/hooks/useWebsiteBuilder';

const BlockEditor = ({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock,
  onMoveBlock,
  onDuplicateBlock,
  crmData = {},
  previewMode = false,
  onTogglePreview,
}) => {
  const [showAddBlockDialog, setShowAddBlockDialog] = useState(false);
  const [addBlockIndex, setAddBlockIndex] = useState(-1);
  const [showSettings, setShowSettings] = useState(false);
  const settingsPanelRef = useRef(null);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  const handleAddBlockClick = (index = -1) => {
    setAddBlockIndex(index);
    setShowAddBlockDialog(true);
  };

  const handleSelectBlockType = (type) => {
    const blockConfig = blockTypes[type];
    const newBlock = createBlock(type, blockConfig.defaults);
    onAddBlock(newBlock, addBlockIndex);
    setShowAddBlockDialog(false);
    onSelectBlock(newBlock.id);
    setShowSettings(true);
  };

  const handleBlockClick = useCallback((blockId) => {
    if (previewMode) return;
    onSelectBlock(blockId);
    setShowSettings(true);
  }, [previewMode, onSelectBlock]);

  const handleMoveUp = () => {
    const index = blocks.findIndex((b) => b.id === selectedBlockId);
    if (index > 0) {
      onMoveBlock(index, index - 1);
    }
  };

  const handleMoveDown = () => {
    const index = blocks.findIndex((b) => b.id === selectedBlockId);
    if (index < blocks.length - 1) {
      onMoveBlock(index, index + 1);
    }
  };

  const handleDuplicate = () => {
    if (selectedBlockId) {
      onDuplicateBlock(selectedBlockId);
    }
  };

  const handleDelete = () => {
    if (selectedBlockId) {
      onRemoveBlock(selectedBlockId);
      setShowSettings(false);
    }
  };

  // Close settings panel on escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (showAddBlockDialog) {
          setShowAddBlockDialog(false);
        } else if (showSettings) {
          setShowSettings(false);
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showAddBlockDialog, showSettings]);

  const selectedBlockIndex = blocks.findIndex((b) => b.id === selectedBlockId);

  return (
    <div className="flex h-full">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAddBlockClick()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adauga bloc
            </button>
          </div>
          <button
            onClick={onTogglePreview}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            {previewMode ? (
              <>
                <EyeOff className="h-4 w-4 mr-2" />
                Editeaza
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Previzualizeaza
              </>
            )}
          </button>
        </div>

        {/* Editor Canvas */}
        <div className="flex-1 overflow-y-auto bg-gray-100">
          <div className={cn(
            'min-h-full',
            !previewMode && 'py-8 px-4'
          )}>
            <div className={cn(
              'bg-white shadow-sm',
              !previewMode && 'rounded-lg overflow-hidden'
            )}>
              {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-500">
                  <p className="mb-4">Niciun bloc adaugat</p>
                  <button
                    onClick={() => handleAddBlockClick()}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adauga primul bloc
                  </button>
                </div>
              ) : (
                <div className="relative">
                  {blocks.map((block, index) => (
                    <div key={block.id} className="relative">
                      {/* Add Block Button (between blocks) */}
                      {!previewMode && index === 0 && (
                        <div className="flex justify-center py-2">
                          <button
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            onClick={() => handleAddBlockClick(0)}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      )}

                      {/* Block */}
                      <div
                        className={cn(
                          'relative group',
                          !previewMode && 'hover:ring-2 hover:ring-blue-300 hover:ring-inset',
                          !previewMode && selectedBlockId === block.id && 'ring-2 ring-blue-500 ring-inset'
                        )}
                      >
                        {/* Block Toolbar */}
                        {!previewMode && selectedBlockId === block.id && (
                          <BlockToolbar
                            onMoveUp={handleMoveUp}
                            onMoveDown={handleMoveDown}
                            onDuplicate={handleDuplicate}
                            onDelete={handleDelete}
                            onSettings={() => setShowSettings(true)}
                            canMoveUp={selectedBlockIndex > 0}
                            canMoveDown={selectedBlockIndex < blocks.length - 1}
                          />
                        )}

                        <BlockRenderer
                          block={block}
                          isEditing={!previewMode}
                          isSelected={selectedBlockId === block.id}
                          onClick={() => handleBlockClick(block.id)}
                          crmData={crmData}
                        />
                      </div>

                      {/* Add Block Button (after each block) */}
                      {!previewMode && (
                        <div className="flex justify-center py-2 opacity-0 hover:opacity-100 transition-opacity">
                          <button
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            onClick={() => handleAddBlockClick(index + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Sidebar (Slide-in Panel) */}
      {showSettings && !previewMode && selectedBlock && (
        <div
          ref={settingsPanelRef}
          className="w-[400px] border-l bg-white flex-shrink-0 h-full overflow-hidden"
        >
          <BlockSettings
            block={selectedBlock}
            onUpdate={(updatedBlock) => onUpdateBlock(updatedBlock.id, updatedBlock)}
            onClose={() => setShowSettings(false)}
          />
        </div>
      )}

      {/* Add Block Dialog */}
      {showAddBlockDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowAddBlockDialog(false)}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Adauga un bloc</h2>
              <button
                onClick={() => setShowAddBlockDialog(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {blockCategories.map((category) => (
                  <div key={category.name}>
                    <h3 className="text-sm font-semibold text-gray-500 mb-3">
                      {category.name}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {category.blocks.map((blockType) => {
                        const config = blockTypes[blockType];
                        const IconComponent = LucideIcons[config.icon] || LucideIcons.Square;
                        return (
                          <button
                            key={blockType}
                            className="h-auto py-4 px-3 flex flex-col items-center justify-center gap-2 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                            onClick={() => handleSelectBlockType(blockType)}
                          >
                            <IconComponent className="h-6 w-6 text-gray-600" />
                            <span className="font-medium">{config.name}</span>
                            <span className="text-xs text-gray-500 text-center">
                              {config.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockEditor;
