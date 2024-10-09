/* eslint-disable jsx-a11y/mouse-events-have-key-events */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { cn } from '@src/lib/utils';
import type { ISentence } from '@/core/updraft-helper';
import { chatModels, UpdraftHelper } from '@/core/updraft-helper';
import { useMemoizedFn, useUpdate } from 'ahooks';
import { Settings, AlignLeft, BarChart2, Hand, Loader2, AudioLines, Bot, FileText, Play } from 'lucide-react';
import type { EUpdraftInitializerEvents, IUpdraftInitializerListener } from '@src/core/initializer';
import { UpdraftInitializer } from '@src/core/initializer';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import Draggable from 'react-draggable';
import { Resizable } from 're-resizable';
import { useStorage } from '@src/core/storage';
import { Input } from './ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select';

const initializer = new UpdraftInitializer();

export const UpdraftHelperUI = () => {
  const [selectedSentences, setSelectedSentences] = useState<number[]>([]);
  const storage = useStorage();

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
    const listener: IUpdraftInitializerListener<EUpdraftInitializerEvents.Change> = ({
      title,
      sentences,
      video,
      description,
      text,
    }) => {
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
            baseURL: storage.openAI.baseURL,
            model: storage.openAI.model,
          },
        }),
      );
    };
    initializer.on(initializer.Events.Change, listener);

    return () => {
      initializer.off(initializer.Events.Change, listener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <div ref={ref} className="fixed z-40" style={{ opacity: storage.opacity }}>
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
            <div className="w-16 min-w-16 border-r flex flex-col items-center py-4 bg-muted overflow-auto">
              <Button variant="ghost" size="icon" className="mb-4 mover">
                <Hand className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => (storage.tab = 'sentences')} className="mb-4">
                <AlignLeft className={cn('h-6 w-6', storage.tab === 'sentences' && 'text-primary')} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => (storage.tab = 'text')} className="mb-4">
                <FileText className={cn('h-6 w-6', storage.tab === 'text' && 'text-primary')} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => (storage.tab = 'options')} className="mb-4">
                <Settings className={cn('h-6 w-6', storage.tab === 'options' && 'text-primary')} />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => (storage.tab = 'states')} className="mb-4">
                <BarChart2 className={cn('h-6 w-6', storage.tab === 'states' && 'text-primary')} />
              </Button>
            </div>

            {/* Right Content */}

            <div className="flex-grow flex flex-col overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold capitalize">{storage.tab}</h2>
              </div>

              <div className={cn('flex-grow overflow-auto', storage.tab !== 'sentences' && 'p-4')}>
                {!helper && <Loading loading className="m-auto mt-4" />}

                {storage.tab === 'options' && (
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

                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium w-36">OpenAI API base URL:</span>
                      <Input
                        type="text"
                        value={storage.openAI.baseURL}
                        onChange={e =>
                          (storage.openAI = {
                            ...storage.openAI,
                            baseURL: e.target.value,
                          })
                        }
                        className="border p-2 rounded w-48"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium w-36">Select a Model:</span>
                      <Select
                        value={storage.openAI.model}
                        onValueChange={model =>
                          (storage.openAI = {
                            ...storage.openAI,
                            model,
                          })
                        }>
                        <SelectTrigger className="border p-2 rounded w-48">
                          <SelectValue placeholder="Select a Model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Models</SelectLabel>
                            {chatModels.map(x => (
                              <SelectItem key={x} value={x}>
                                {x}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      <Input
                        type="text"
                        value={storage.openAI.model}
                        onChange={e =>
                          (storage.openAI = {
                            ...storage.openAI,
                            model: e.target.value,
                          })
                        }
                        className="border p-2 rounded w-48"
                        placeholder="Or Enter a custom model"
                      />
                    </div>

                    <div className="text-sm text-warning mt-4">
                      <p>
                        Warning: If you change your OpenAI API key or base url, please reload this page to apply the
                        changes.
                      </p>
                    </div>
                  </div>
                )}
                {storage.tab === 'appearance' && (
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
                {storage.tab === 'sentences' && helper && (
                  <Sentences
                    helper={helper}
                    selectedSentences={selectedSentences}
                    onSelectedSentencesChange={handleSentenceSelect}
                  />
                )}
                {storage.tab === 'states' && helper && <States helper={helper} />}
                {storage.tab === 'text' && helper && <Text helper={helper} />}
              </div>
            </div>
          </Card>
        </Resizable>
      </div>
    </Draggable>
  );
};

const Sentences = ({
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

const Text: React.FC<{ helper: UpdraftHelper }> = ({ helper }) => {
  const [mouseOverIndex, setMouseOverIndex] = useState<number>(-1);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(helper.currentSentenceIndex);
  const enListRef = useRef<HTMLDivElement>(null);
  const zhListRef = useRef<HTMLDivElement>(null);
  const update = useUpdate();

  useEffect(() => {}, [helper, setCurrentSentenceIndex]);

  useEffect(() => {
    helper.on(helper.Events.CurrentSentenceChange, setCurrentSentenceIndex);
    helper.on(helper.Events.TranslateSentenceChange, update);

    return () => {
      helper.off(helper.Events.CurrentSentenceChange, setCurrentSentenceIndex);
      helper.off(helper.Events.TranslateSentenceChange, update);
    };
  }, [helper, update]);

  useEffect(() => {
    Array.from(enListRef.current?.children ?? [])[currentSentenceIndex]?.scrollIntoView({
      block: 'center',
    });
    Array.from(zhListRef.current?.children ?? [])[currentSentenceIndex]?.scrollIntoView({
      block: 'center',
    });
  }, [currentSentenceIndex]);

  const handleSentenceClick = (index: number) => {
    helper.activateSentenceByIndex(index);
  };

  return (
    <div
      className="flex h-full w-full"
      onMouseLeave={() => {
        setMouseOverIndex(-1);
      }}>
      <div className="w-1/2 max-w-[50%] pr-2 border-r overflow-auto">
        <div className="space-y-2" ref={enListRef}>
          {helper.sentences.map((sentence, index) => (
            <span
              onMouseOver={() => {
                setMouseOverIndex(index);
              }}
              onClick={() => handleSentenceClick(index)}
              key={index}
              className={cn(
                'cursor-pointer ease-in duration-200',
                mouseOverIndex === index && 'text-green-500',
                currentSentenceIndex === index && 'text-green-500',
              )}>
              {sentence.en}
            </span>
          ))}
        </div>
      </div>
      <div className="w-1/2 pl-2 overflow-auto">
        <div className="space-y-2" ref={zhListRef}>
          {helper.sentences.map((sentence, index) => (
            <span
              onMouseOver={() => {
                setMouseOverIndex(index);
              }}
              onClick={() => handleSentenceClick(index)}
              key={index}
              className={cn(
                'cursor-pointer',
                mouseOverIndex === index && 'text-green-500',
                currentSentenceIndex === index && 'text-green-500',
              )}>
              {sentence.translated || '...'}
            </span>
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
