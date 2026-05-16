import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ReactMarkdownBlock = styled(ReactMarkdown)`
  color: var(--gray-3);

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    color: var(--gray-2);
    margin-bottom: 8px;
  }
  h1 {
    font-size: 20px;
  }
  h2 {
    font-size: 18px;
  }
  h3 {
    font-size: 16px;
  }
  h4 {
    font-size: 14px;
  }
  hr {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    border-bottom: none;
    border-left: none;
    border-right: none;
    margin: 18px 0;
  }
  pre {
    background-color: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 16px;
    border-radius: 4px;
  }
  table td,
  table th {
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 4px 8px;
    color: var(--gray-4);
  }
  table th {
    background-color: rgba(255, 255, 255, 0.05);
    font-weight: 600;
    color: var(--gray-3);
  }
  table {
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-collapse: collapse;
    margin-bottom: 16px;
  }
  ol,
  ul,
  dl {
    padding-inline-start: 20px;
  }
  h1 code,
  h2 code,
  h3 code,
  h4 code,
  li code,
  p code {
    font-size: 12px;
    background: rgba(255, 255, 255, 0.08);
    color: var(--geekblue-3);
    padding: 2px 4px;
    border-radius: 4px;
  }
`;

export default function MarkdownBlock(props: { content: string }) {
  return (
    <ReactMarkdownBlock remarkPlugins={[remarkGfm]}>
      {props.content}
    </ReactMarkdownBlock>
  );
}
