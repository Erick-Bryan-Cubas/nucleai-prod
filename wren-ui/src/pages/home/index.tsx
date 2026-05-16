import { ComponentRef, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { Button, Typography } from 'antd';
import styled from 'styled-components';
import { Logo } from '@/components/Logo';
import { Path } from '@/utils/enum';
import SiderLayout from '@/components/layouts/SiderLayout';
import Prompt from '@/components/pages/home/prompt';
import DemoPrompt from '@/components/pages/home/prompt/DemoPrompt';
import useHomeSidebar from '@/hooks/useHomeSidebar';
import useAskPrompt from '@/hooks/useAskPrompt';
import useRecommendedQuestionsInstruction from '@/hooks/useRecommendedQuestionsInstruction';
import RecommendedQuestionsPrompt from '@/components/pages/home/prompt/RecommendedQuestionsPrompt';
import {
  useSuggestedQuestionsQuery,
  useCreateThreadMutation,
  useThreadLazyQuery,
} from '@/apollo/client/graphql/home.generated';
import { useGetSettingsQuery } from '@/apollo/client/graphql/settings.generated';
import { CreateThreadInput } from '@/apollo/client/graphql/__types__';

const { Text } = Typography;

const HomeWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  height: 100%;

  .home-tagline {
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 0.3px;
    margin-top: 16px;
    background: linear-gradient(90deg, var(--geekblue-3) 0%, var(--gray-2) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .home-subtitle {
    font-size: 13px;
    color: var(--gray-4);
    margin-top: 4px;
    margin-bottom: 8px;
  }
`;


const Wrapper = ({ children }) => {
  return (
    <HomeWrapper>
      <Logo size={150} color="var(--geekblue-4)" />
      <div className="home-tagline">Conheça melhor os seus dados</div>
      {children}
    </HomeWrapper>
  );
};

const SampleQuestionsInstruction = (props) => {
  const { sampleQuestions, onSelect } = props;

  return (
    <Wrapper>
      <DemoPrompt demo={sampleQuestions} onSelect={onSelect} />
    </Wrapper>
  );
};

function RecommendedQuestionsInstruction(props) {
  const { onSelect, loading } = props;

  const {
    buttonProps,
    generating,
    recommendedQuestions,
    showRetry,
    showRecommendedQuestionsPromptMode,
  } = useRecommendedQuestionsInstruction();

  return showRecommendedQuestionsPromptMode ? (
    <div
      className="d-flex align-center flex-column"
      style={{ margin: 'auto', paddingTop: 40, paddingBottom: 100 }}
    >
      <RecommendedQuestionsPrompt
        recommendedQuestions={recommendedQuestions}
        onSelect={onSelect}
        loading={loading}
      />
    </div>
  ) : (
    <Wrapper>
      <Button className="mt-6" {...buttonProps} />
      {generating && (
        <Text className="mt-3 text-sm" style={{ color: 'var(--gray-4)' }}>
          Pensando em boas perguntas para você... (cerca de 1 minuto)
        </Text>
      )}
      {!generating && showRetry && (
        <Text
          className="mt-3 text-sm text-center"
          style={{ color: 'var(--gray-4)' }}
        >
          Não conseguimos gerar perguntas agora.
          <br />
          Tente novamente mais tarde.
        </Text>
      )}
    </Wrapper>
  );
}

export default function Home() {
  const $prompt = useRef<ComponentRef<typeof Prompt>>(null);
  const router = useRouter();
  const homeSidebar = useHomeSidebar();
  const askPrompt = useAskPrompt();

  // Pre-warm downstream services on landing so the first question doesn't
  // hit a cold qdrant/embedding model. Fire-and-forget — we don't block on it.
  useEffect(() => {
    fetch('/api/warmup').catch(() => undefined);
  }, []);

  const { data: suggestedQuestionsData } = useSuggestedQuestionsQuery({
    fetchPolicy: 'cache-and-network',
  });
  const [createThread, { loading: threadCreating }] = useCreateThreadMutation({
    onError: (error) => console.error(error),
    onCompleted: () => homeSidebar.refetch(),
  });
  const [preloadThread] = useThreadLazyQuery({
    fetchPolicy: 'cache-and-network',
  });

  const { data: settingsResult } = useGetSettingsQuery();
  const settings = settingsResult?.settings;
  const isSampleDataset = useMemo(
    () => Boolean(settings?.dataSource?.sampleDataset),
    [settings],
  );

  const sampleQuestions = useMemo(
    () => suggestedQuestionsData?.suggestedQuestions.questions || [],
    [suggestedQuestionsData],
  );

  const onSelectQuestion = async ({ question }) => {
    $prompt.current.submit(question);
  };

  const onCreateResponse = async (payload: CreateThreadInput) => {
    try {
      askPrompt.onStopPolling();
      const response = await createThread({ variables: { data: payload } });
      const threadId = response.data.createThread.id;
      await preloadThread({ variables: { threadId } });
      router.push(Path.Home + `/${threadId}`);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <SiderLayout loading={false} sidebar={homeSidebar}>
      {isSampleDataset && (
        <SampleQuestionsInstruction
          sampleQuestions={sampleQuestions}
          onSelect={onSelectQuestion}
        />
      )}

      {!isSampleDataset && (
        <RecommendedQuestionsInstruction
          onSelect={onCreateResponse}
          loading={threadCreating}
        />
      )}
      <Prompt
        ref={$prompt}
        {...askPrompt}
        onCreateResponse={onCreateResponse}
      />
    </SiderLayout>
  );
}
