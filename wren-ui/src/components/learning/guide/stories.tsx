import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NextRouter } from 'next/router';
import { Select } from 'antd';
import styled from 'styled-components';
import { ModelIcon, TranslateIcon } from '@/utils/icons';
import { RobotSVG } from '@/utils/svgs';
import { renderToString } from 'react-dom/server';
import {
  Dispatcher,
  DriverConfig,
  DriverObj,
  DriverPopoverDOM,
  LEARNING,
} from './utils';
import { Path } from '@/utils/enum';
import {
  ProjectLanguage,
  SampleDatasetName,
} from '@/apollo/client/graphql/__types__';
import { TEMPLATE_OPTIONS as SAMPLE_DATASET_INFO } from '@/components/pages/setup/utils';
import { getLanguageText } from '@/utils/language';
import { t as translate } from '@/i18n/messages';
import * as events from '@/utils/events';
import { nextTick } from '@/utils/time';

const RobotIcon = styled(RobotSVG)`
  width: 24px;
  height: 24px;
`;

const defaultConfigs: DriverConfig = {
  progressText: '{{current}} / {{total}}',
  nextBtnText: 'Next',
  prevBtnText: 'Previous',
  showButtons: ['next'],
  allowClose: false,
};

type StoryPayload = {
  sampleDataset: SampleDatasetName;
  language: ProjectLanguage;
};

export const makeStoriesPlayer =
  (...args: [DriverObj, NextRouter, StoryPayload]) =>
  (id: string, dispatcher: Dispatcher) => {
    const action =
      {
        [LEARNING.DATA_MODELING_GUIDE]: () =>
          playDataModelingGuide(...args, dispatcher),
        [LEARNING.SWITCH_PROJECT_LANGUAGE]: () =>
          playSwitchProjectLanguageGuide(...args, dispatcher),
        [LEARNING.KNOWLEDGE_GUIDE]: () =>
          playKnowledgeGuide(...args, dispatcher),
        [LEARNING.SAVE_TO_KNOWLEDGE]: () =>
          playSaveToKnowledgeGuide(...args, dispatcher),
      }[id] || null;
    return action && action();
  };

const resetPopoverStyle = (popoverDom: DriverPopoverDOM, width: number) => {
  const wrapper = popoverDom.wrapper;
  wrapper.style.maxWidth = 'none';
  wrapper.style.width = `${width}px`;
};

const playDataModelingGuide = (
  $driver: DriverObj,
  router: NextRouter,
  payload: StoryPayload,
  dispatcher: Dispatcher,
) => {
  if ($driver === null) {
    console.error('Driver object is not initialized.');
    return;
  }
  if ($driver.isActive()) $driver.destroy();

  const isSampleDataset = !!payload.sampleDataset;
  const sampleDatasetInfo = SAMPLE_DATASET_INFO[payload.sampleDataset];
  const tr = (key: string, variables?: Record<string, string | number>) =>
    translate(router.locale, key, variables);

  $driver.setConfig({
    ...defaultConfigs,
    showProgress: true,
    nextBtnText: tr('stories.next'),
    prevBtnText: tr('stories.previous'),
  });
  $driver.setSteps([
    {
      popover: {
        title: renderToString(
          <div className="pt-4">
            <div className="-mx-4" style={{ minHeight: 331 }}>
              <img
                className="mb-4"
                src="/images/learning/data-modeling.jpg"
                alt="data-modeling-guide"
              />
            </div>
            {tr('stories.dataModelingGuide.title')}
          </div>,
        ),
        description: renderToString(
          <>
            {tr('stories.dataModelingGuide.description')}{' '}
            <a
              href="https://docs.getwren.ai/oss/guide/modeling/overview"
              target="_blank"
              rel="noopener noreferrer"
            >
              {tr('stories.dataModelingGuide.moreDetails')}
            </a>
            <br />
            <br />
            {isSampleDataset ? (
              <>
                {tr('stories.dataModelingGuide.sampleIntro', {
                  label: sampleDatasetInfo.label,
                })}{' '}
                <a
                  href={sampleDatasetInfo.guide}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tr('stories.dataModelingGuide.sampleLink', {
                    label: sampleDatasetInfo.label,
                  })}
                </a>
              </>
            ) : null}
          </>,
        ),
        showButtons: ['next', 'close'],
        onPopoverRender: (popoverDom: DriverPopoverDOM) => {
          resetPopoverStyle(popoverDom, 720);
        },
        onCloseClick: () => {
          $driver.destroy();
          window.sessionStorage.setItem('skipDataModelingGuide', '1');
        },
      },
    },
    {
      element: '[data-guideid="add-model"]',
      popover: {
        title: renderToString(
          <>
            <div className="mb-1">
              <ModelIcon style={{ fontSize: 24 }} />
            </div>
            {tr('stories.dataModelingGuide.createModel')}
          </>,
        ),
        description: renderToString(
          <>{tr('stories.dataModelingGuide.createModelDescription')}</>,
        ),
      },
    },
    {
      element: '[data-guideid="edit-model-0"]',
      popover: {
        title: renderToString(
          <>
            <div className="-mx-4" style={{ minHeight: 175 }}>
              <img
                className="mb-2"
                src="/images/learning/edit-model.gif"
                alt="edit-model"
              />
            </div>
            {tr('stories.dataModelingGuide.editModel')}
          </>,
        ),
        description: renderToString(
          <>{tr('stories.dataModelingGuide.editModelDescription')}</>,
        ),
      },
    },
    {
      element: '[data-guideid="model-0"]',
      popover: {
        title: renderToString(
          <>
            <div className="-mx-4" style={{ minHeight: 214 }}>
              <img
                className="mb-2"
                src="/images/learning/edit-metadata.gif"
                alt="edit-metadata"
              />
            </div>
            {tr('stories.dataModelingGuide.editMetadata')}
          </>,
        ),
        description: renderToString(
          <>{tr('stories.dataModelingGuide.editMetadataDescription')}</>,
        ),
        onPopoverRender: (popoverDom: DriverPopoverDOM) => {
          resetPopoverStyle(popoverDom, 360);
        },
      },
    },
    {
      element: '[data-guideid="deploy-model"]',
      popover: {
        title: renderToString(
          <>
            <div className="-mx-4" style={{ minHeight: 102 }}>
              <img
                className="mb-2"
                src="/images/learning/deploy-modeling.jpg"
                alt="deploy-modeling"
              />
            </div>
            {tr('stories.dataModelingGuide.deployModeling')}
          </>,
        ),
        description: renderToString(
          <>{tr('stories.dataModelingGuide.deployModelingDescription')}</>,
        ),
      },
    },
    {
      popover: {
        title: renderToString(
          <>
            <div className="-mx-4" style={{ minHeight: 331 }}>
              <img
                className="mb-2"
                src="/images/learning/ask-question.jpg"
                alt="ask-question"
              />
            </div>
            {tr('stories.dataModelingGuide.askQuestions')}
          </>,
        ),
        description: renderToString(
          <>{tr('stories.dataModelingGuide.askQuestionsDescription')}</>,
        ),
        onPopoverRender: (popoverDom: DriverPopoverDOM) => {
          resetPopoverStyle(popoverDom, 720);
        },
        doneBtnText: tr('stories.dataModelingGuide.goToHome'),
        onNextClick: () => {
          router.push(Path.Home);
          $driver.destroy();
          dispatcher?.onDone && dispatcher.onDone();
        },
      },
    },
  ]);
  events.dispatch(events.EVENT_NAME.GO_TO_FIRST_MODEL);
  $driver.drive();
};

// React component for home guide
const LanguageSwitcher = (props: {
  defaultValue: ProjectLanguage;
  locale?: string;
}) => {
  const [value, setValue] = useState(props.defaultValue);
  const tr = (key: string, variables?: Record<string, string | number>) =>
    translate(props.locale, key, variables);
  const languageOptions = Object.keys(ProjectLanguage).map((key) => {
    return { label: getLanguageText(key as ProjectLanguage), value: key };
  });
  const onChange = (value: string) => {
    setValue(value as ProjectLanguage);
  };

  return (
    <>
      <label className="d-block mb-2">{tr('stories.languageSwitcher.label')}</label>
      <Select
        showSearch
        style={{ width: '100%' }}
        options={languageOptions}
        getPopupContainer={(trigger) => trigger.parentElement}
        onChange={onChange}
        value={value}
      />
      <input name="language" type="hidden" value={value} />
    </>
  );
};

const playSwitchProjectLanguageGuide = (
  $driver: DriverObj,
  router: NextRouter,
  payload: StoryPayload,
  dispatcher: Dispatcher,
) => {
  if ($driver === null) {
    console.error('Driver object is not initialized.');
    return;
  }
  if ($driver.isActive()) $driver.destroy();

  const tr = (key: string, variables?: Record<string, string | number>) =>
    translate(router.locale, key, variables);

  $driver.setConfig({
    ...defaultConfigs,
    showProgress: false,
    nextBtnText: tr('stories.next'),
    prevBtnText: tr('stories.previous'),
  });
  $driver.setSteps([
    {
      popover: {
        title: renderToString(
          <>
            <div className="mb-1">
              <TranslateIcon style={{ fontSize: 24 }} />
            </div>
            {tr('stories.switchLanguage.title')}
          </>,
        ),
        description: renderToString(
          <>
            {tr('stories.switchLanguage.descriptionStart')}
            <div className="my-3">
              <div id="projectLanguageContainer" />
            </div>
            {tr('stories.switchLanguage.descriptionEnd')}
          </>,
        ),
        onPopoverRender: (popoverDom: DriverPopoverDOM) => {
          resetPopoverStyle(popoverDom, 400);
          // Render react component to #projectLanguageContainer
          const selectDom = document.getElementById('projectLanguageContainer');
          if (selectDom) {
            createRoot(selectDom).render(
              <LanguageSwitcher
                defaultValue={payload.language}
                locale={router.locale}
              />,
            );
          }
        },
        showButtons: ['next', 'close'],
        nextBtnText: tr('stories.switchLanguage.submit'),
        onCloseClick: () => {
          $driver.destroy();
          window.sessionStorage.setItem('skipSwitchProjectLanguageGuide', '1');
        },
        onNextClick: async () => {
          const selectDom = document.getElementById('projectLanguageContainer');
          if (selectDom) {
            const input = selectDom.querySelector(
              'input[name="language"]',
            ) as HTMLInputElement;
            const nextButton = document.querySelectorAll(
              '.driver-popover-next-btn',
            )[0];

            const loadingSvg = document.createElement('span');
            loadingSvg.setAttribute('aria-hidden', 'loading');
            loadingSvg.setAttribute('role', 'img');
            loadingSvg.className =
              'anticon anticon-loading anticon-spin text-sm gray-6 ml-2';
            loadingSvg.innerHTML = `<svg viewBox="0 0 1024 1024" focusable="false" data-icon="loading" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M988 548c-19.9 0-36-16.1-36-36 0-59.4-11.6-117-34.6-171.3a440.45 440.45 0 00-94.3-139.9 437.71 437.71 0 00-139.9-94.3C629 83.6 571.4 72 512 72c-19.9 0-36-16.1-36-36s16.1-36 36-36c69.1 0 136.2 13.5 199.3 40.3C772.3 66 827 103 874 150c47 47 83.9 101.8 109.7 162.7 26.7 63.1 40.2 130.2 40.2 199.3.1 19.9-16 36-35.9 36z"></path></svg>`;
            nextButton.setAttribute('disabled', 'true');
            nextButton.appendChild(loadingSvg);
            await dispatcher
              ?.onSaveLanguage(input.value as ProjectLanguage)
              .catch((err) => console.error(err))
              .finally(() => {
                nextButton.removeAttribute('disabled');
                nextButton.removeChild(loadingSvg);
              });
          }
          $driver.destroy();
          dispatcher?.onDone();
        },
      },
    },
  ]);
  $driver.drive();
};

const playKnowledgeGuide = (
  $driver: DriverObj,
  router: NextRouter,
  _payload: StoryPayload,
  dispatcher: Dispatcher,
) => {
  if ($driver === null) {
    console.error('Driver object is not initialized.');
    return;
  }

  if ($driver.isActive()) $driver.destroy();

  const tr = (key: string, variables?: Record<string, string | number>) =>
    translate(router.locale, key, variables);

  $driver.setConfig({
    ...defaultConfigs,
    showProgress: true,
    nextBtnText: tr('stories.next'),
    prevBtnText: tr('stories.previous'),
  });

  $driver.setSteps([
    {
      element: '[data-guideid="question-sql-pairs"]',
      popover: {
        title: renderToString(
          <div className="pt-4">
            <div className="-mx-4" style={{ minHeight: 317 }}>
              <img
                className="mb-4"
                src="/images/learning/save-to-knowledge.gif"
                alt="question-sql-pairs-guide"
              />
            </div>
            {tr('stories.knowledgeGuide.questionSqlTitle')}
          </div>,
        ),
        description: renderToString(
          <>
            {tr('stories.knowledgeGuide.questionSqlDescription')}
          </>,
        ),
        onPopoverRender: (popoverDom: DriverPopoverDOM) => {
          resetPopoverStyle(popoverDom, 640);
        },
      },
    },
    {
      element: '[data-guideid="instructions"]',
      popover: {
        title: renderToString(
          <div className="pt-4">
            <div className="-mx-4" style={{ minHeight: 260 }}>
              <img
                className="mb-4"
                src="/images/learning/instructions.png"
                alt="instructions-guide"
              />
            </div>
            {tr('stories.knowledgeGuide.instructionsTitle')}
          </div>,
        ),
        description: renderToString(
          <>
            {tr('stories.knowledgeGuide.instructionsDescription')}
          </>,
        ),
        onPopoverRender: (popoverDom: DriverPopoverDOM) => {
          resetPopoverStyle(popoverDom, 520);
        },
        doneBtnText: tr('stories.gotIt'),
        onNextClick: () => {
          $driver.destroy();
          dispatcher?.onDone && dispatcher.onDone();
        },
      },
    },
  ]);
  $driver.drive();
};

const playSaveToKnowledgeGuide = async (
  $driver: DriverObj,
  router: NextRouter,
  _payload: StoryPayload,
  dispatcher: Dispatcher,
) => {
  if ($driver === null) {
    console.error('Driver object is not initialized.');
    return;
  }
  if ($driver.isActive()) $driver.destroy();

  const tr = (key: string, variables?: Record<string, string | number>) =>
    translate(router.locale, key, variables);

  $driver.setConfig({
    ...defaultConfigs,
    showProgress: false,
    nextBtnText: tr('stories.next'),
    prevBtnText: tr('stories.previous'),
  });

  const selectors = {
    saveToKnowledge:
      '[data-guideid="last-answer-result"] [data-guideid="save-to-knowledge"]',
    previewData:
      '[data-guideid="last-answer-result"] [data-guideid="text-answer-preview-data"]',
  };

  $driver.setSteps([
    {
      element: selectors.saveToKnowledge,
      popover: {
        side: 'top',
        align: 'start',
        title: renderToString(
          <>
            <div className="mb-1">
              <RobotIcon />
            </div>
            {tr('stories.saveToKnowledge.title')}
          </>,
        ),
        description: renderToString(
          <>{tr('stories.saveToKnowledge.description')}</>,
        ),
        onPopoverRender: (popoverDom: DriverPopoverDOM) => {
          resetPopoverStyle(popoverDom, 360);
        },
        doneBtnText: tr('stories.gotIt'),
        onNextClick: () => {
          $driver.destroy();
          dispatcher?.onDone && dispatcher.onDone();
        },
      },
    },
  ]);

  let mutationObserver: MutationObserver | null = null;
  let intersectionObserver: IntersectionObserver | null = null;

  const cleanMutationObserverup = () => {
    // if MutationObserver is listening to the element, disable it
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
  };

  const cleanIntersectionObserverup = () => {
    if (intersectionObserver) {
      intersectionObserver.disconnect();
      intersectionObserver = null;
    }
  };

  const startDriver = () => {
    const target = document.querySelector(
      selectors.previewData,
    ) as HTMLElement | null;

    if (!target) return false;

    cleanMutationObserverup();

    // use IntersectionObserver to ensure the element is in viewport before driving
    intersectionObserver = new IntersectionObserver(
      async (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            cleanIntersectionObserverup();

            await nextTick(700);
            $driver.drive();
            return;
          }
        }
      },
      { threshold: 0.5 }, // 50% of the element is visible
    );

    intersectionObserver.observe(target);
    return true;
  };

  // try to start Driver.js
  if (startDriver()) return;

  // if the target element not appear, use MutationObserver to listen DOM changes
  mutationObserver = new MutationObserver(() => {
    if (startDriver()) {
      cleanMutationObserverup();
    }
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });

  // 60 seconds after, observer will be cleared
  await nextTick(60000);
  cleanMutationObserverup();
  cleanIntersectionObserverup();
};
