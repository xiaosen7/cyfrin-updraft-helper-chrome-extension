'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { cn } from '@src/lib/utils';
import type { ISentence } from '../ai/products/learn-english-video-2';
import { UpdraftHelper } from '../ai/products/learn-english-video-2';
import { useMemoizedFn, useMount, useRequest, useUpdate } from 'ahooks';
import {
  Settings,
  Paintbrush,
  AlignLeft,
  BarChart2,
  Hand,
  Minimize2,
  Loader2,
  AudioLines,
  Bot,
  FileText,
  Play,
  Pause,
} from 'lucide-react';
import { UpdraftInitializer } from '@src/core/initializer';
import { combineVttContent } from '@src/ai/products/_utils/vtt-parser';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import Draggable from 'react-draggable';
import { Resizable } from 're-resizable';
import { useStorage } from '@src/core/storage';
import { Input } from './ui/input';

const initializer = new UpdraftInitializer();

export const UpdraftHelperUI = () => {
  const [selectedSentences, setSelectedSentences] = useState<number[]>([]);
  const storage = useStorage();
  const [activeTab, setActiveTab] = useState<'options' | 'appearance' | 'sentences' | 'states' | 'text'>('sentences');
  const ref = useRef<HTMLDivElement>(null);
  const [helper, setHelper] = useState<UpdraftHelper>();

  const handleSentenceSelect = useMemoizedFn((index: number) => {
    setSelectedSentences(prev => (prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]));
  });

  useEffect(() => {
    return () => helper?.dispose();
  }, [helper]);

  useEffect(() => {
    initializer.init();
    let onResolve: (...args: any) => any;
    initializer.on(initializer.Events.Change, ({ title, sentences, video, description, text }) => {
      setHelper(
        new UpdraftHelper({
          sentences,
          video,
          description,
          title,
          autoPreDubSentenceCount: storage.preDubCount,
          autoPreTranslateSentenceCount: storage.postTranslateCount,
          text,
          openAI: {
            apiKey: storage.openAI.apiKey,
          },
        }),
      );
    });

    return () => {
      initializer.off(initializer.Events.Change, onResolve);
    };
  }, []);

  return (
    <Draggable
      defaultPosition={storage.position}
      handle=".mover"
      onDrag={(e, ui) => {
        storage.position = {
          x: ui.x,
          y: ui.y,
        };
      }}>
      <div ref={ref} className="fixed z-[999]" style={{ opacity: storage.opacity }}>
        <Resizable
          minHeight={400}
          minWidth={600}
          size={storage.size}
          onResize={(e, d, el) => {
            const { width, height } = el.getBoundingClientRect();
            storage.size = {
              width,
              height,
            };
          }}>
          <Card className={cn('shadow-lg h-full flex')}>
            {/* Left Menu */}
            <div className="w-16 border-r flex flex-col items-center py-4 bg-muted overflow-auto">
              <Button variant="ghost" size="icon" className="mb-4 mover">
                <Hand className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setActiveTab('options')} className="mb-4">
                <Settings className={cn('h-6 w-6', activeTab === 'options' && 'text-primary')} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setActiveTab('sentences')} className="mb-4">
                <AlignLeft className={cn('h-6 w-6', activeTab === 'sentences' && 'text-primary')} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setActiveTab('states')} className="mb-4">
                <BarChart2 className={cn('h-6 w-6', activeTab === 'states' && 'text-primary')} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setActiveTab('text')} className="mb-4">
                <FileText className={cn('h-6 w-6', activeTab === 'text' && 'text-primary')} />
              </Button>
            </div>

            {/* Right Content */}
            {!helper && <Loading loading className="mx-auto mt-4" />}
            <div className="flex-grow flex flex-col">
              {activeTab !== 'sentences' && (
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold capitalize">{activeTab}</h2>
                </div>
              )}

              <div className={cn('flex-grow overflow-auto', activeTab !== 'sentences' && 'p-4')}>
                {activeTab === 'options' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium w-36">Auto Pre-translate:</span>
                      <Slider
                        value={[storage.postTranslateCount]}
                        onValueChange={([value]) => (storage.postTranslateCount = value)}
                        max={10}
                        step={1}
                        className="w-48"
                      />
                      <span className="text-lg font-bold text-primary min-w-[2ch] text-center">
                        {storage.postTranslateCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium w-36">Auto Pre-dub:</span>
                      <Slider
                        value={[storage.preDubCount]}
                        onValueChange={([value]) => (storage.preDubCount = value)}
                        max={10}
                        step={1}
                        className="w-48"
                      />
                      <span className="text-lg font-bold text-primary min-w-[2ch] text-center">
                        {storage.preDubCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium w-36">OpenAI API Key:</span>
                      <Input
                        type="text"
                        value={storage.openAI.apiKey}
                        onChange={e =>
                          (storage.openAI = {
                            ...storage.openAI,
                            apiKey: e.target.value,
                          })
                        }
                        className="border p-2 rounded w-48"
                      />
                    </div>

                    <div className="text-sm text-warning mt-4">
                      <p>Warning: If you change your OpenAI API key, please reload this page to apply the changes.</p>
                    </div>
                  </div>
                )}
                {activeTab === 'appearance' && (
                  <div>
                    <p>You can now resize or drag the window.</p>
                    <div className="flex items-center gap-4 mt-4">
                      <span className="text-sm font-medium w-36">Opacity:</span>
                      <Slider
                        value={[storage.opacity]}
                        onValueChange={([value]) => (storage.opacity = value)}
                        max={1}
                        min={0}
                        step={0.01}
                        className="w-48"
                      />
                      <span className="text-lg font-bold text-primary min-w-[2ch] text-center">{storage.opacity}</span>
                    </div>
                  </div>
                )}
                {activeTab === 'sentences' && helper && (
                  <SentenceList
                    helper={helper}
                    selectedSentences={selectedSentences}
                    onSelectedSentencesChange={handleSentenceSelect}
                  />
                )}
                {activeTab === 'states' && helper && <States helper={helper} />}
                {activeTab === 'text' && helper && <TextContent helper={helper} />}
              </div>
            </div>
          </Card>
        </Resizable>
      </div>
    </Draggable>
  );
};

const SentenceList = ({
  helper,
  selectedSentences,
  onSelectedSentencesChange,
}: {
  helper: UpdraftHelper;
  selectedSentences: number[];
  onSelectedSentencesChange: (index: number) => void;
}) => {
  const listRef = useRef<List>(null);

  useEffect(() => {
    setTimeout(() => {
      if (helper.currentSentenceIndex >= 0) {
        listRef.current?.scrollToItem(helper.currentSentenceIndex, 'center');
      }
    }, 1000);

    helper.on(helper.Events.CurrentSentenceChange, index => {
      if (listRef.current) {
        listRef.current.scrollToItem(index, 'center');
      }
    });
  }, [helper]);

  return (
    <AutoSizer>
      {({ height, width }) => (
        <List ref={listRef} height={height} itemCount={helper.sentences.length} itemSize={200} width={width}>
          {({ index, style }: any) => (
            <Sentence
              index={index}
              style={style}
              checked={selectedSentences.includes(index)}
              helper={helper}
              onCheckedChange={() => onSelectedSentencesChange(index)}
              sentence={helper.sentences[index]}
            />
          )}
        </List>
      )}
    </AutoSizer>
  );
};

function Sentence({
  index,
  sentence,
  helper,
  checked,
  onCheckedChange,
  style,
}: {
  sentence: ISentence;
  helper: UpdraftHelper;
  index: number;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  style?: React.CSSProperties;
}) {
  const [isActive, setIsActive] = useState(helper.currentSentenceIndex === index);
  const update = useUpdate();

  useEffect(() => {
    helper.on(helper.Events.CurrentSentenceChange, _index => {
      setIsActive(index === _index);
    });

    helper.on(UpdraftHelper.Events.TranslateSentenceChange, _index => {
      if (index === _index) update();
    });

    helper.on(UpdraftHelper.Events.DubSentencesEnd, indices => {
      if (indices.includes(index)) update();
    });
  }, [helper, index, update]);

  const handleSentenceClick = () => helper.activateSentenceByIndex(index);

  return (
    <div
      onClick={handleSentenceClick}
      className={cn('p-2 rounded-lg transition-colors duration-200 ease-in-out cursor-pointer hover:bg-primary/10')}
      style={style}>
      <div className="flex items-start gap-2">
        <Checkbox checked={checked} onCheckedChange={() => onCheckedChange(!checked)} className="mt-1" />
        <div
          className={cn(
            'mt-1 flex-grow flex gap-1 flex-col text-sm',
            isActive ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground',
          )}>
          <div>{sentence.en}</div>
          <div className="text-xs">
            {sentence.translated || sentence['zh-CN']}
            {sentence.translated && <Bot className="ml-1 w-4 inline" />}
            {sentence.audio?.generated && <AudioLines className="ml-1 w-4 inline" />}
          </div>
        </div>
      </div>
    </div>
  );
}

const States: React.FC<{ helper: UpdraftHelper }> = ({ helper }) => {
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDubbing, setIsDubbing] = useState(false);
  const update = useUpdate();

  useEffect(() => {
    helper.on(UpdraftHelper.Events.TranslateSentencesStart, () => setIsTranslating(true));
    helper.on(UpdraftHelper.Events.TranslateSentencesEnd, () => setIsTranslating(false));
    helper.on(UpdraftHelper.Events.DubSentencesStart, () => setIsDubbing(true));
    helper.on(UpdraftHelper.Events.DubSentencesEnd, () => setIsDubbing(false));
    helper.on(UpdraftHelper.Events.TokenUsageChange, update);
  }, [helper, update]);

  return (
    <div className="space-y-4">
      <div>
        Token usage: <span className="text-lg font-bold text-primary">{helper.tokenUsed}</span>
      </div>
      <div className="flex gap-4">
        <Loading loading={isTranslating}>Translating...</Loading>
        <Loading loading={isDubbing}>Dubbing...</Loading>
      </div>
    </div>
  );
};

const TextContent: React.FC<{ helper: UpdraftHelper }> = ({ helper }) => {
  const [selectedSentence, setSelectedSentence] = useState<number | null>(null);

  useEffect(() => {
    const handleCurrentSentenceChange = (index: number) => {
      setSelectedSentence(index);
    };

    helper.on(helper.Events.CurrentSentenceChange, handleCurrentSentenceChange);

    return () => {
      helper.off(helper.Events.CurrentSentenceChange, handleCurrentSentenceChange);
    };
  }, [helper]);

  const handleSentenceClick = (index: number) => {
    helper.activateSentenceByIndex(index);
  };

  return (
    <div className="flex h-full">
      <div className="w-1/2 pr-2 border-r overflow-auto">
        <h3 className="text-lg font-semibold mb-2 sticky top-0 bg-background p-2">English</h3>
        <div className="space-y-2">
          {helper.sentences.map((sentence, index) => (
            <span onClick={() => handleSentenceClick(index)} key={index} className="inline-block hover:text-">
              {sentence.en}
            </span>
          ))}
        </div>
      </div>
      <div className="w-1/2 pl-2 overflow-auto">
        <h3 className="text-lg font-semibold mb-2 sticky top-0 bg-background p-2">Chinese</h3>
        <div className="space-y-2">
          {helper.sentences.map((sentence, index) => (
            <div
              key={index}
              className={cn(
                'p-2 rounded transition-colors duration-200 ease-in-out cursor-pointer',
                selectedSentence === index ? 'bg-primary text-primary-foreground' : 'hover:bg-primary/10',
              )}
              onClick={() => handleSentenceClick(index)}>
              <span className="inline-block">{sentence.translated || sentence['zh-CN']}</span>
              {sentence.translated && (
                <div className="flex items-center mt-1 text-xs">
                  <Bot className="w-4 h-4 mr-1" />
                  <span>Translated</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
const Loading: React.FC<React.PropsWithChildren<{ loading: boolean; className?: string }>> = ({
  loading,
  children,
  className,
}) => (
  <div className={cn('flex items-center gap-2', !loading && 'hidden', className)}>
    <Loader2 className="h-4 w-4 animate-spin text-primary" />
    <span>{children}</span>
  </div>
);
