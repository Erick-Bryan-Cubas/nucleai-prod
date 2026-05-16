import {
  useEffect,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { PROCESS_STATE } from '@/utils/enum';
import PromptInput from '@/components/pages/home/prompt/Input';
import PromptResult from '@/components/pages/home/prompt/Result';
import useAskProcessState, {
  getIsProcessing,
} from '@/hooks/useAskProcessState';
import { AskPromptData } from '@/hooks/useAskPrompt';
import {
  CreateThreadInput,
  CreateThreadResponseInput,
} from '@/apollo/client/graphql/__types__';

interface Props {
  onCreateResponse: (
    payload: CreateThreadInput | CreateThreadResponseInput,
  ) => Promise<void>;
  onStop: () => void;
  onSubmit: (value: string) => Promise<void>;
  onStopPolling: () => void;
  onStopStreaming: () => void;
  onStopRecommend: () => void;
  data: AskPromptData;
  loading: boolean;
  inputProps: {
    placeholder: string;
  };
}

interface Attributes {
  submit: (value: string) => void;
  close: () => void;
}

const PromptInputOverride = createGlobalStyle`
  .adm-prompt-dark {
    .ant-input,
    .ant-input-textarea textarea,
    textarea.ant-input {
      background: transparent !important;
      color: var(--gray-2) !important;
      border: none !important;
      box-shadow: none !important;
    }
    .ant-input:focus,
    .ant-input-focused,
    textarea.ant-input:focus {
      background: transparent !important;
      box-shadow: none !important;
    }
    .ant-input::placeholder,
    textarea.ant-input::placeholder {
      color: var(--gray-6) !important;
    }
    .ant-input[disabled],
    textarea.ant-input[disabled] {
      background: transparent !important;
      color: var(--gray-6) !important;
    }
  }
`;

const PromptStyle = styled.div`
  position: fixed;
  width: 720px;
  left: 50%;
  margin-left: calc(-360px + 133px);
  bottom: 20px;
  z-index: 999;
  background: rgba(22, 27, 34, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(12px);
  box-shadow:
    0 0 0 1px rgba(60, 174, 130, 0.2),
    0 20px 40px rgba(0, 0, 0, 0.4),
    0 4px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  padding: 8px 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus-within {
    border-color: rgba(60, 174, 130, 0.5);
    box-shadow:
      0 0 0 1px rgba(60, 174, 130, 0.4),
      0 20px 40px rgba(0, 0, 0, 0.5);
  }
`;

export default forwardRef<Attributes, Props>(function Prompt(props, ref) {
  const {
    data,
    loading,
    onSubmit,
    onStop,
    onCreateResponse,
    onStopStreaming,
    onStopRecommend,
    inputProps,
  } = props;
  const askProcessState = useAskProcessState();

  const {
    originalQuestion,
    askingTask,
    askingStreamTask,
    recommendedQuestions,
  } = data;

  const result = useMemo(
    () => ({
      type: askingTask?.type, // question's type
      originalQuestion, // original question
      askingStreamTask, // for general answer
      recommendedQuestions, // guiding user to ask
      intentReasoning: askingTask?.intentReasoning || '',
    }),
    [data],
  );
  const error = useMemo(() => askingTask?.error || null, [askingTask?.error]);
  const [showResult, setShowResult] = useState(false);
  const [question, setQuestion] = useState('');
  const currentProcessState = useMemo(
    () => askProcessState.currentState,
    [askProcessState.currentState],
  );
  const isProcessing = useMemo(
    () => getIsProcessing(currentProcessState),
    [currentProcessState],
  );

  useEffect(() => {
    if (askingTask) {
      const processState = askProcessState.matchedState(askingTask);
      askProcessState.transitionTo(processState);
    }
  }, [askingTask]);

  useEffect(() => {
    if (error) {
      !askProcessState.isFailed() &&
        askProcessState.transitionTo(PROCESS_STATE.FAILED);
    }
  }, [error]);

  // create thread response for recommended question
  const selectRecommendedQuestion = async (payload: {
    question: string;
    sql: string;
  }) => {
    onCreateResponse && (await onCreateResponse(payload));
    closeResult();
  };

  // create thread response for text to sql
  const intentSQLAnswer = async () => {
    onCreateResponse &&
      (await onCreateResponse({ question, taskId: askingTask?.queryId }));
    setShowResult(false);
  };

  const closeResult = () => {
    askProcessState.resetState();
    setQuestion('');
    onStopStreaming && onStopStreaming();
    onStopRecommend && onStopRecommend();
  };

  const stopProcess = async () => {
    onStop && (await onStop());
    setShowResult(false);
    askProcessState.resetState();
  };

  const submitAsk = async (value: string) => {
    setQuestion(value);
    if (isProcessing || !value) return;
    // start the state as understanding when user submit question
    askProcessState.transitionTo(PROCESS_STATE.UNDERSTANDING);
    setShowResult(true);
    onSubmit && (await onSubmit(value));
  };

  useImperativeHandle(
    ref,
    () => ({
      submit: submitAsk,
      close: closeResult,
    }),
    [question, isProcessing, setQuestion],
  );

  return (
    <>
      <PromptInputOverride />
      <PromptStyle className="d-flex align-center adm-prompt-dark">
        <PromptInput
          question={question}
          isProcessing={isProcessing}
          onAsk={submitAsk}
          inputProps={inputProps}
        />

        {showResult && (
          <PromptResult
            data={result}
            error={error}
            loading={loading}
            processState={currentProcessState}
            onSelectRecommendedQuestion={selectRecommendedQuestion}
            onIntentSQLAnswer={intentSQLAnswer}
            onClose={closeResult}
            onStop={stopProcess}
          />
        )}
      </PromptStyle>
    </>
  );
});
