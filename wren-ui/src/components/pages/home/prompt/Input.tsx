import { useEffect, useRef, useState } from 'react';
import { Input, Button } from 'antd';
import styled from 'styled-components';
import { attachLoading } from '@/utils/helper';

const PromptButton = styled(Button)`
  min-width: 80px;
  align-self: center;
  border-radius: 8px !important;
  font-weight: 600 !important;
`;

const StyledTextArea = styled(Input.TextArea)`
  background: transparent !important;
  color: var(--gray-2) !important;
  border: none !important;
  box-shadow: none !important;
  resize: none;

  &::placeholder {
    color: var(--gray-6) !important;
  }

  &:focus {
    background: transparent !important;
    box-shadow: none !important;
  }

  &.ant-input-disabled,
  &[disabled] {
    background: transparent !important;
    color: var(--gray-6) !important;
  }
`;

interface Props {
  question: string;
  isProcessing: boolean;
  onAsk: (value: string) => Promise<void>;
  inputProps: {
    placeholder?: string;
  };
}

export default function PromptInput(props: Props) {
  const { onAsk, isProcessing, question, inputProps } = props;
  const $promptInput = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [innerLoading, setInnerLoading] = useState(false);

  useEffect(() => {
    if (question) setInputValue(question);
  }, [question]);

  useEffect(() => {
    if (!isProcessing) {
      $promptInput.current?.focus();
      setInputValue('');
    }
  }, [isProcessing]);

  const syncInputValue = (event) => {
    setInputValue(event.target.value);
  };

  const handleAsk = () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;
    const startAsking = attachLoading(onAsk, setInnerLoading);
    startAsking(trimmedValue);
  };

  const inputEnter = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.shiftKey) return;
    event.preventDefault();
    handleAsk();
  };

  const isDisabled = innerLoading || isProcessing;

  return (
    <>
      <div className="flex-grow-1">
        <StyledTextArea
          ref={$promptInput}
          data-gramm="false"
          size="large"
          autoSize
          value={inputValue}
          onInput={syncInputValue}
          onPressEnter={inputEnter}
          disabled={isDisabled}
          style={{ width: '100%' }}
          {...inputProps}
        />
      </div>
      <PromptButton
        type="primary"
        size="large"
        className="ml-3"
        onClick={handleAsk}
        disabled={isDisabled}
      >
        Perguntar
      </PromptButton>
    </>
  );
}
